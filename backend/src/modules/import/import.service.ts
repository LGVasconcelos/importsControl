import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Product } from '../products/product.entity';

@Injectable()
export class ImportService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async importFromExcel(buffer: Buffer): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const workbook = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new BadRequestException('Arquivo Excel sem planilhas');

    const headers: string[] = [];
    worksheet.getRow(1).eachCell((cell) => {
      headers.push(String(cell.value || '').trim().toLowerCase());
    });

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
      const row = worksheet.getRow(rowIndex);
      const rowData: Record<string, any> = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) rowData[header] = cell.value;
      });

      if (!rowData['sku'] && !rowData['codigo']) {
        skipped++;
        continue;
      }

      try {
        const sku = String(rowData['sku'] || rowData['codigo'] || '').trim();
        const name = String(rowData['nome'] || rowData['descricao'] || rowData['produto'] || sku).trim();

        if (!sku) { skipped++; continue; }

        const existing = await this.productRepo.findOne({ where: { sku } });
        if (existing) { skipped++; continue; }

        const product = this.productRepo.create({
          sku,
          name,
          description: String(rowData['descricao'] || ''),
          supplier: String(rowData['fornecedor'] || rowData['supplier'] || ''),
          origin: String(rowData['origem'] || rowData['origin'] || ''),
          unit: String(rowData['unidade'] || rowData['unit'] || 'UN'),
          costPrice: Number(rowData['preco_custo'] || rowData['custo'] || rowData['cost'] || 0),
          salePrice: Number(rowData['preco_venda'] || rowData['venda'] || rowData['sale'] || 0),
          currentStock: Number(rowData['estoque'] || rowData['quantidade'] || rowData['qty'] || 0),
          minimumStock: Number(rowData['estoque_minimo'] || rowData['min_stock'] || 0),
          category: String(rowData['categoria'] || rowData['category'] || ''),
          ncm: String(rowData['ncm'] || ''),
        });

        await this.productRepo.save(product);
        imported++;
      } catch (e) {
        errors.push(`Linha ${rowIndex}: ${e.message}`);
      }
    }

    return { imported, skipped, errors };
  }
}
