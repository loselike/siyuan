import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { resolveUploadRoot } from '../../../configure-app.js';

export interface ShipmentLabelUploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const imageMimeExtensions: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

const labelFileMimeExtensions: Record<string, string> = {
  ...imageMimeExtensions,
  'application/pdf': '.pdf'
};

@Injectable()
export class ShipmentLabelFileStorage {
  async store(file: ShipmentLabelUploadFile | undefined) {
    if (!file) throw new BadRequestException('请上传面单');
    this.assertShipmentLabelFile(file);
    const uploadRoot = resolveUploadRoot();
    const uploadDir = process.env.LABEL_UPLOAD_DIR ?? join(uploadRoot, 'labels');
    await mkdir(uploadDir, { recursive: true });
    const extension = labelFileMimeExtensions[file.mimetype];
    const fileName = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID()}${extension}`;
    await writeFile(join(uploadDir, fileName), file.buffer);
    return {
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      url: `/api/uploads/${basename(uploadDir)}/${fileName}`
    };
  }

  private assertShipmentLabelFile(file: ShipmentLabelUploadFile) {
    if (!labelFileMimeExtensions[file.mimetype]) {
      throw new BadRequestException('仅支持图片或 PDF 面单');
    }
    if (file.mimetype === 'application/pdf') {
      if (extname(file.originalname).toLowerCase() !== '.pdf' || file.buffer.subarray(0, 4).toString('ascii') !== '%PDF') {
        throw new BadRequestException('PDF 面单内容格式无效');
      }
      return;
    }
    this.assertImage(file);
  }

  private assertImage(file: ShipmentLabelUploadFile) {
    if (!imageMimeExtensions[file.mimetype]) {
      throw new BadRequestException('仅支持 PNG、JPG、WEBP、GIF 图片');
    }
    const originalExt = extname(file.originalname).toLowerCase();
    if (originalExt === '.svg' || originalExt === '.pdf' || originalExt === '.xlsx' || originalExt === '.xls') {
      throw new BadRequestException('仅支持图片，不支持表格、PDF 或 SVG');
    }
    const buffer = file.buffer;
    const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isGif = buffer.subarray(0, 3).toString('ascii') === 'GIF';
    const isWebp = buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    if (!isPng && !isJpeg && !isGif && !isWebp) {
      throw new BadRequestException('图片内容格式无效');
    }
  }
}
