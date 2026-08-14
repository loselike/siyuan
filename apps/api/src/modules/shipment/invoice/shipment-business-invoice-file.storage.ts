import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { resolveUploadRoot } from '../../../configure-app.js';

export interface ShipmentBusinessInvoiceUploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const excelMimeExtensions: Record<string, string> = {
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/octet-stream': ''
};

@Injectable()
export class ShipmentBusinessInvoiceFileStorage {
  async store(file: ShipmentBusinessInvoiceUploadFile | undefined) {
    if (!file) throw new BadRequestException('请上传业务发票');
    this.assertExcelFile(file);
    const uploadRoot = resolveUploadRoot();
    const uploadDir = join(uploadRoot, 'business-invoices');
    await mkdir(uploadDir, { recursive: true });
    const extension = extname(file.originalname).toLowerCase();
    const fileName = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID()}${extension}`;
    await writeFile(join(uploadDir, fileName), file.buffer);
    return {
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      url: `/api/uploads/${basename(uploadDir)}/${fileName}`
    };
  }

  private assertExcelFile(file: ShipmentBusinessInvoiceUploadFile) {
    const extension = extname(file.originalname).toLowerCase();
    if (!['.xls', '.xlsx'].includes(extension) || extension === '.xlsm') {
      throw new BadRequestException('仅支持 .xls/.xlsx Excel 文件');
    }
    if (!(file.mimetype in excelMimeExtensions) && file.mimetype !== '') {
      throw new BadRequestException('仅支持 Excel 文件');
    }
    const isXlsxContent = file.buffer.subarray(0, 2).toString('ascii') === 'PK';
    const oleHeader = file.buffer.subarray(0, 4);
    const isXlsContent = oleHeader[0] === 0xd0 && oleHeader[1] === 0xcf && oleHeader[2] === 0x11 && oleHeader[3] === 0xe0;
    if (extension === '.xlsx' && isXlsContent) {
      throw new BadRequestException('文件扩展名为 .xlsx，但内容实际是 .xls，请改为 .xls 后上传');
    }
    if (extension === '.xlsx' && !isXlsxContent) {
      throw new BadRequestException('XLSX 内容格式无效');
    }
    if (extension === '.xls' && isXlsxContent) {
      throw new BadRequestException('文件扩展名为 .xls，但内容实际是 .xlsx，请改为 .xlsx 后上传');
    }
    if (extension === '.xls' && !isXlsContent) {
      throw new BadRequestException('XLS 内容格式无效');
    }
  }
}
