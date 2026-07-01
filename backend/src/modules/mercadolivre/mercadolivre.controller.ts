import { Controller, Get, Post, Delete, Query, Param, ParseIntPipe, UseGuards, Res, Body, HttpCode } from '@nestjs/common';
import type { Response } from 'express';
import { MercadoLivreService } from './mercadolivre.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('mercadolivre')
export class MercadoLivreController {
  constructor(private readonly mlService: MercadoLivreService) {}

  @Get('auth')
  auth(@Res() res: Response) {
    return res.redirect(this.mlService.getAuthUrl());
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
  webhook(@Body() body: any) {
    this.mlService.handleWebhook(body).catch(() => {});
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
  @Post('sync-stock')
  syncAll() {
    return this.mlService.syncAllStock();
  }

  @UseGuards(JwtAuthGuard)
  @Post('sync-stock/:productId')
  syncOne(@Param('productId', ParseIntPipe) productId: number) {
    return this.mlService.syncProductStock(productId);
  }
}
