import { Controller, Get, Post, Delete, Query, Param, ParseIntPipe, UseGuards, Res, Body, Headers, HttpCode, HttpException, HttpStatus, Logger, ForbiddenException } from '@nestjs/common';
import type { Response } from 'express';
import { MercadoLivreService } from './mercadolivre.service';
import { StockService } from '../stock/stock.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('mercadolivre')
export class MercadoLivreController {
  private readonly logger = new Logger(MercadoLivreController.name);

  constructor(
    private readonly mlService: MercadoLivreService,
    private readonly stockService: StockService,
  ) {}

  @Get('auth')
  async auth(@Res() res: Response) {
    const url = await this.mlService.getAuthUrl();
    return res.redirect(url);
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Res() res: Response) {
    try {
      if (!code) return res.redirect('https://imports-control.vercel.app/mercadolivre?error=no_code');
      await this.mlService.handleCallback(code);
      return res.redirect('https://imports-control.vercel.app/mercadolivre?connected=true');
    } catch (e: any) {
      const msg = encodeURIComponent(e?.message || 'auth_failed');
      return res.redirect(`https://imports-control.vercel.app/mercadolivre?error=${msg}`);
    }
  }

  @Post('webhook')
  @HttpCode(200)
  async webhook(@Body() body: any) {
    await this.mlService.handleWebhook(body).catch(e => {
      this.logger.error(`Erro no webhook ML: ${e?.message}`, e?.stack);
    });
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  getStatus() {
    return this.mlService.getStatus();
  }

  @UseGuards(JwtAuthGuard)
  @Delete('disconnect')
  disconnect() {
    return this.mlService.disconnect();
  }

  @UseGuards(JwtAuthGuard)
  @Post('auto-link')
  async autoLink() {
    try {
      return await this.mlService.autoLinkBySku();
    } catch (e: any) {
      throw new HttpException(
        { message: e?.message || 'Erro interno no auto-link', stack: e?.stack?.split('\n').slice(0, 3).join(' | ') },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('sync-stock')
  syncAll() {
    return this.mlService.syncAllStock();
  }

  @UseGuards(JwtAuthGuard)
  @Post('sync-stock/:productId')
  syncOne(@Param('productId', ParseIntPipe) productId: number) {
    return this.mlService.syncProductStock(productId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('items/:itemId/variations')
  getVariations(@Param('itemId') itemId: string) {
    return this.mlService.getItemVariations(itemId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sync-stock/:productId/auto')
  syncOneWithAutoPause(@Param('productId', ParseIntPipe) productId: number) {
    return this.mlService.syncProductStockWithAutoPause(productId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('listing-status/:productId')
  getListingStatus(@Param('productId', ParseIntPipe) productId: number) {
    return this.mlService.getListingStatus(productId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('divergences')
  getDivergences() {
    return this.mlService.checkStockDivergences();
  }

  @UseGuards(JwtAuthGuard)
  @Post('revert-ml-movements')
  async revertMlMovements() {
    try {
      return await this.stockService.revertMlMovements();
    } catch (e: any) {
      throw new HttpException(
        { message: e?.message || 'Erro ao reverter movimentos' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('process-pending-sales')
  async processPendingSales(@Query('from') from?: string) {
    try {
      return await this.mlService.processPendingSales(from);
    } catch (e: any) {
      throw new HttpException(
        { message: e?.message || 'Erro ao processar vendas pendentes' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Endpoint de manutenção automática, chamado pelo Vercel Cron (não usa JwtAuthGuard —
   * autenticado via header x-cron-secret). Renova o token proativamente (via processPendingSales,
   * que já chama getValidToken internamente) e reprocessa vendas pagas como rede de segurança
   * caso algum webhook tenha falhado ou não chegado.
   */
  @Post('cron/tick')
  @HttpCode(200)
  async cronTick(@Headers('x-cron-secret') secret: string) {
    const expected = process.env.CRON_SECRET;
    if (!expected || secret !== expected) {
      throw new ForbiddenException();
    }
    try {
      const status = await this.mlService.getStatus();
      if (!status.connected) return { ok: true, skipped: 'not_connected' };
      const result = await this.mlService.processPendingSales();
      return { ok: true, ...result };
    } catch (e: any) {
      this.logger.error(`Erro no cron tick ML: ${e?.message}`, e?.stack);
      return { ok: false, message: e?.message || 'Erro desconhecido' };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('sales-summary')
  async getSalesSummary(@Query('from') from?: string, @Query('to') to?: string) {
    try {
      return await this.mlService.getSalesSummary(from, to);
    } catch (e: any) {
      throw new HttpException(
        { message: e?.message || 'Erro ao buscar vendas no Mercado Livre' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
