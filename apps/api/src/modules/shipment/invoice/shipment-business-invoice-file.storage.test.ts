import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ShipmentBusinessInvoiceFileStorage } from './shipment-business-invoice-file.storage.js';

let temporaryDirectory: string | undefined;
const previousUploadDirectory = process.env.UPLOAD_DIR;

afterEach(async () => {
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
  temporaryDirectory = undefined;
  if (previousUploadDirectory === undefined) delete process.env.UPLOAD_DIR;
  else process.env.UPLOAD_DIR = previousUploadDirectory;
});

describe('ShipmentBusinessInvoiceFileStorage', () => {
  it('preserves missing, extension, MIME, and Excel signature rejection messages', async () => {
    const storage = new ShipmentBusinessInvoiceFileStorage();

    await expect(storage.store(undefined)).rejects.toThrow('请上传业务发票');
    await expect(storage.store({
      originalname: 'invoice.pdf', mimetype: 'application/pdf', size: 4, buffer: Buffer.from('text')
    })).rejects.toThrow('仅支持 .xls/.xlsx Excel 文件');
    await expect(storage.store({
      originalname: 'invoice.xlsx', mimetype: 'application/pdf', size: 4, buffer: Buffer.from('PK\x03\x04')
    })).rejects.toThrow('仅支持 Excel 文件');
    await expect(storage.store({
      originalname: 'invoice.xlsx', mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 4,
      buffer: Buffer.from([0xd0, 0xcf, 0x11, 0xe0])
    })).rejects.toThrow('文件扩展名为 .xlsx，但内容实际是 .xls，请改为 .xls 后上传');
    await expect(storage.store({
      originalname: 'invoice.xlsx', mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 4,
      buffer: Buffer.from('text')
    })).rejects.toThrow('XLSX 内容格式无效');
    await expect(storage.store({
      originalname: 'invoice.xls', mimetype: 'application/vnd.ms-excel', size: 4, buffer: Buffer.from('PK\x03\x04')
    })).rejects.toThrow('文件扩展名为 .xls，但内容实际是 .xlsx，请改为 .xlsx 后上传');
    await expect(storage.store({
      originalname: 'invoice.xls', mimetype: 'application/vnd.ms-excel', size: 4, buffer: Buffer.from('text')
    })).rejects.toThrow('XLS 内容格式无效');
  });

  it('preserves original metadata, stored bytes, date naming, extension, and URL shape', async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'siyuan-invoice-phase22-'));
    process.env.UPLOAD_DIR = temporaryDirectory;
    const storage = new ShipmentBusinessInvoiceFileStorage();
    const buffer = Buffer.from('PK\x03\x04phase22');

    const stored = await storage.store({
      originalname: '业务发票.xlsx',
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: buffer.length,
      buffer
    });

    expect(stored).toEqual({
      fileName: '业务发票.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sizeBytes: buffer.length,
      url: expect.stringMatching(/^\/api\/uploads\/business-invoices\/\d{8}-[0-9a-f-]+\.xlsx$/)
    });
    const files = await readdir(join(temporaryDirectory, 'business-invoices'));
    expect(files).toHaveLength(1);
    expect(await readFile(join(temporaryDirectory, 'business-invoices', files[0]))).toEqual(buffer);
  });
});
