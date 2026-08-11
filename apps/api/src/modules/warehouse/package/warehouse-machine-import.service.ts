import { createHash } from 'node:crypto';
import { extname } from 'node:path';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { Principal } from '../../rbac.js';
import { parseWarehouseMachineWorkbook } from '../../warehouse-machine-import.js';
import {
  WAREHOUSE_MACHINE_IMPORT_REPOSITORY,
  type WarehouseMachineImportRepository
} from './warehouse-machine-import.repository.js';

export interface WarehouseMachineImportFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const EXCEL_MIME_EXTENSIONS: Record<string, string> = {
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/octet-stream': ''
};

@Injectable()
export class WarehouseMachineImportService {
  constructor(
    @Inject(WAREHOUSE_MACHINE_IMPORT_REPOSITORY)
    private readonly repository: WarehouseMachineImportRepository
  ) {}

  execute(
    principal: Principal,
    file: WarehouseMachineImportFile | undefined,
    commit?: string
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('请上传机器过机 Excel 文件');
    const normalizedFile = { ...file, originalname: normalizeUploadedFileName(file.originalname) };
    assertExcelFile(normalizedFile);
    const parsed = parseWarehouseMachineWorkbook(normalizedFile.buffer, normalizedFile.originalname);
    if (String(commit).toLowerCase() === 'true') {
      return this.repository.importWarehouseMachineImport(principal, parsed, {
        fileHash: createHash('sha256').update(normalizedFile.buffer).digest('hex')
      });
    }
    return this.repository.previewWarehouseMachineImport(principal, parsed);
  }
}

function assertExcelFile(file: Pick<WarehouseMachineImportFile, 'mimetype' | 'originalname' | 'buffer'>) {
  const extension = extname(file.originalname).toLowerCase();
  if (!['.xls', '.xlsx'].includes(extension) || extension === '.xlsm') {
    throw new BadRequestException('仅支持 .xls/.xlsx Excel 文件');
  }
  if (!(file.mimetype in EXCEL_MIME_EXTENSIONS) && file.mimetype !== '') {
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

function normalizeUploadedFileName(fileName: string) {
  const raw = String(fileName ?? '').trim();
  if (!raw) return '未命名文件';
  const candidates = [raw];
  for (let index = 0; index < 2; index += 1) {
    const decoded = Buffer.from(candidates[index], 'latin1').toString('utf8');
    if (!decoded || decoded === candidates[index] || decoded.includes('�')) break;
    candidates.push(decoded);
  }
  const normalized = candidates.find((candidate) => /[\u4e00-\u9fff]/.test(candidate) && !candidate.includes('�')) ?? raw;
  return normalized.replace(/[\\/:\0]/g, '_').trim() || '未命名文件';
}
