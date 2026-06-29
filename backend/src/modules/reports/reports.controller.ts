import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  getDashboard() {
    return this.reportsService.getDashboard();
  }

  @Get('stock')
  getStockReport() {
    return this.reportsService.getStockReport();
  }

  @Get('movements')
  getMovementsReport(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getMovementsReport(from, to);
  }

  @Get('costs')
  getCostReport() {
    return this.reportsService.getCostReport();
  }

  @Get('orders')
  getOrdersReport() {
    return this.reportsService.getOrdersReport();
  }
}
