import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ShipmentLabelFileStorage } from './shipment-label-file.storage.js';

let temporaryDirectory: string | undefined;
const previousLabelUploadDirectory = process.env.LABEL_UPLOAD_DIR;

afterEach(async () => {
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
  temporaryDirectory = undefined;
  if (previousLabelUploadDirectory === undefined) delete process.env.LABEL_UPLOAD_DIR;
  else process.env.LABEL_UPLOAD_DIR = previousLabelUploadDirectory;
});

describe('ShipmentLabelFileStorage', () => {
  it('preserves missing, MIME, PDF signature, and image signature rejection messages', async () => {
    const storage = new ShipmentLabelFileStorage();

    await expect(storage.store(undefined)).rejects.toThrow('请上传面单');
    await expect(storage.store({
      originalname: 'label.txt', mimetype: 'text/plain', size: 4, buffer: Buffer.from('text')
    })).rejects.toThrow('仅支持图片或 PDF 面单');
    await expect(storage.store({
      originalname: 'label.pdf', mimetype: 'application/pdf', size: 4, buffer: Buffer.from('text')
    })).rejects.toThrow('PDF 面单内容格式无效');
    await expect(storage.store({
      originalname: 'label.png', mimetype: 'image/png', size: 4, buffer: Buffer.from('text')
    })).rejects.toThrow('图片内容格式无效');
  });

  it('preserves stored bytes, metadata, extension, and public URL shape', async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'siyuan-label-phase21-'));
    process.env.LABEL_UPLOAD_DIR = temporaryDirectory;
    const storage = new ShipmentLabelFileStorage();
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

    const stored = await storage.store({
      originalname: 'phase21-label.png',
      mimetype: 'image/png',
      size: buffer.length,
      buffer
    });

    expect(stored).toEqual({
      fileName: 'phase21-label.png',
      mimeType: 'image/png',
      sizeBytes: buffer.length,
      url: expect.stringMatching(/^\/api\/uploads\/siyuan-label-phase21-[^/]+\/\d{8}-[0-9a-f-]+\.png$/)
    });
    const files = await readdir(temporaryDirectory);
    expect(files).toHaveLength(1);
    expect(await readFile(join(temporaryDirectory, files[0]))).toEqual(buffer);
  });
});
