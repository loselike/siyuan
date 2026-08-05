import { BadRequestException } from '@nestjs/common';
import * as xlsx from '@e965/xlsx';
import type {
  WarehouseMachineImportIssue,
  WarehouseMachineImportResponse,
  WarehouseMachineImportSampleRow
} from '@siyuan/shared';

const MAX_IMPORT_ROWS = 20_000;
const MAX_ISSUES_IN_RESPONSE = 200;
const MAX_SAMPLES_IN_RESPONSE = 20;
const MAX_WEIGHT_KG = 100_000;
const MAX_DIMENSION_CM = 10_000;
const MAX_PACKAGE_COUNT = 5_000;
const MAX_XLSX_UNCOMPRESSED_BYTES = 120 * 1024 * 1024;
const MAX_XLSX_COMPRESSION_RATIO = 200;
const MAX_SHEET_COLUMNS = 100;

export interface WarehouseMachineImportCandidate extends WarehouseMachineImportSampleRow {
  packageCount: number;
  key: string;
  fileKey: string;
  signature: string;
}

export interface ParsedWarehouseMachineImport {
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateFileRows: number;
  issues: WarehouseMachineImportIssue[];
  candidates: WarehouseMachineImportCandidate[];
  dateFrom?: string;
  dateTo?: string;
}

export function warehouseMachineImportQueryRange(parsed: ParsedWarehouseMachineImport): { from: Date; toExclusive: Date } | undefined {
  if (!parsed.dateFrom || !parsed.dateTo) return undefined;
  return {
    from: new Date(Math.floor(new Date(parsed.dateFrom).getTime() / 1000) * 1000),
    toExclusive: new Date((Math.floor(new Date(parsed.dateTo).getTime() / 1000) + 1) * 1000)
  };
}

function normalizedText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[\u0000-\u001f\u007f\u200b-\u200d\ufeff]/g, '').trim();
}

function parsePositiveNumber(value: unknown, label: string, maximum: number): number {
  const parsed = typeof value === 'number' ? value : Number(normalizedText(value));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label}必须是大于 0 的数字`);
  }
  if (parsed > maximum) {
    throw new Error(`${label}超过允许范围`);
  }
  const rounded = Math.round(parsed * 1000) / 1000;
  if (rounded <= 0) throw new Error(`${label}精度不能小于 0.001`);
  return rounded;
}

function parsePackageCount(value: unknown): number {
  const text = normalizedText(value);
  if (!text) return 1;
  const parsed = typeof value === 'number' ? value : Number(text);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error('件数必须是大于 0 的整数');
  }
  if (parsed > MAX_PACKAGE_COUNT) {
    throw new Error(`单行件数不能超过 ${MAX_PACKAGE_COUNT}`);
  }
  return parsed;
}

function assertSafeXlsxArchive(buffer: Buffer, fileName: string) {
  if (!/\.xlsx$/i.test(fileName)) return;
  if (buffer.length < 22) throw new BadRequestException('XLSX 压缩包结构无效');
  let eocdOffset = -1;
  const minimumOffset = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw new BadRequestException('XLSX 压缩包结构无效');
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);
  if (entryCount > 10_000) throw new BadRequestException('XLSX 内部文件数量过多');
  let totalCompressed = 0;
  let totalUncompressed = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new BadRequestException('XLSX 压缩包目录无效');
    }
    const compressed = buffer.readUInt32LE(offset + 20);
    const uncompressed = buffer.readUInt32LE(offset + 24);
    if (compressed === 0xffffffff || uncompressed === 0xffffffff) {
      throw new BadRequestException('不支持 ZIP64 格式的 XLSX 文件');
    }
    totalCompressed += compressed;
    totalUncompressed += uncompressed;
    if (totalUncompressed > MAX_XLSX_UNCOMPRESSED_BYTES) {
      throw new BadRequestException('XLSX 解压后内容过大');
    }
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    offset += 46 + fileNameLength + extraLength + commentLength;
  }
  if (totalCompressed > 0 && totalUncompressed / totalCompressed > MAX_XLSX_COMPRESSION_RATIO) {
    throw new BadRequestException('XLSX 压缩比例异常');
  }
  if (totalCompressed === 0 && totalUncompressed > 0) throw new BadRequestException('XLSX 压缩目录无效');
}

function excelSerialToDate(value: number): Date | undefined {
  const decoded = xlsx.SSF.parse_date_code(value);
  if (!decoded) return undefined;
  const date = new Date(
    `${String(decoded.y).padStart(4, '0')}-${String(decoded.m).padStart(2, '0')}-${String(decoded.d).padStart(2, '0')}`
    + `T${String(decoded.H).padStart(2, '0')}:${String(decoded.M).padStart(2, '0')}:${String(Math.floor(decoded.S)).padStart(2, '0')}+08:00`
  );
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseMachineTime(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(
      `${String(value.getUTCFullYear()).padStart(4, '0')}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`
      + `T${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}:${String(value.getUTCSeconds()).padStart(2, '0')}+08:00`
    );
  }
  if (typeof value === 'number') {
    const parsed = excelSerialToDate(value);
    if (parsed) return parsed;
  }
  const text = normalizedText(value);
  const match = /^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})[\/\sT](\d{1,2}):(\d{1,2})(?:[':\u2019](\d{1,2}))?["\u2033]?$/.exec(text);
  if (match) {
    const [, year, month, day, hour, minute, second = '0'] = match;
    const numericParts = [year, month, day, hour, minute, second].map(Number);
    const [numericYear, numericMonth, numericDay, numericHour, numericMinute, numericSecond] = numericParts;
    const validationDate = new Date(Date.UTC(numericYear, numericMonth - 1, numericDay, numericHour, numericMinute, numericSecond));
    if (
      validationDate.getUTCFullYear() !== numericYear
      || validationDate.getUTCMonth() !== numericMonth - 1
      || validationDate.getUTCDate() !== numericDay
      || validationDate.getUTCHours() !== numericHour
      || validationDate.getUTCMinutes() !== numericMinute
      || validationDate.getUTCSeconds() !== numericSecond
    ) {
      throw new Error('过机时间不是有效的日期时间');
    }
    const date = new Date(
      `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      + `T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}+08:00`
    );
    if (!Number.isNaN(date.getTime())) return date;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(text)) {
    const fallback = new Date(text);
    if (!Number.isNaN(fallback.getTime())) return fallback;
  }
  throw new Error('过机时间格式不正确');
}

function splitBarcode(barcode: string): { customerCode: string; domesticTrackingNo: string } {
  const separatorIndex = barcode.search(/[-\u2010-\u2015\uff0d]/);
  if (separatorIndex <= 0 || separatorIndex >= barcode.length - 1) {
    throw new Error('条码必须是“客户编号-快递单号”格式');
  }
  const customerCode = barcode.slice(0, separatorIndex).trim();
  const domesticTrackingNo = barcode.slice(separatorIndex + 1).trim();
  if (!customerCode || !domesticTrackingNo) {
    throw new Error('条码必须包含客户编号和快递单号');
  }
  if (customerCode.length > 8) throw new Error('客户编号最长 8 位');
  if (domesticTrackingNo.length > 64) throw new Error('快递单号最长 64 位');
  return { customerCode, domesticTrackingNo };
}

function isHeaderRow(row: unknown[]): boolean {
  const first = normalizedText(row[0]).toLowerCase();
  return /条码|运单|单号|barcode/.test(first)
    && row.slice(1, 5).every((cell) => {
      const text = normalizedText(cell);
      return text !== '' && !Number.isFinite(Number(text));
    });
}

function isSinglePieceHeaderRow(row: unknown[]): boolean {
  const sixthColumn = normalizedText(row[5]);
  return isHeaderRow(row) && (!sixthColumn || /件数|quantity|pieces?/i.test(sixthColumn));
}

function rowHasContent(row: unknown[]): boolean {
  return row.some((value) => normalizedText(value) !== '');
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function warehouseMachineImportKey(combinedOrderNo: string, scanTime: string | Date): string {
  const time = scanTime instanceof Date ? scanTime : new Date(scanTime);
  return `${combinedOrderNo}|${time.getTime()}`;
}

export function parseWarehouseMachineWorkbook(buffer: Buffer, fileName: string): ParsedWarehouseMachineImport {
  assertSafeXlsxArchive(buffer, fileName);
  let workbook: xlsx.WorkBook;
  try {
    // 数值日期必须保留 Excel serial，再按机器所在的北京时间解析；不能依赖 API 容器的 TZ。
    workbook = xlsx.read(buffer, { type: 'buffer', cellDates: false });
  } catch {
    throw new BadRequestException('Excel 文件无法解析，请确认文件未损坏且格式为 XLS/XLSX');
  }
  if (!workbook.SheetNames.length) throw new BadRequestException('Excel 文件没有可读取的工作表');

  const issues: WarehouseMachineImportIssue[] = [];
  const validCandidateRows: WarehouseMachineImportCandidate[] = [];
  let totalRows = 0;
  let invalidRows = 0;
  let duplicateFileRows = 0;
  let earliest: Date | undefined;
  let latest: Date | undefined;
  const importStartedAt = new Date();

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;
    if (worksheet['!ref']) {
      const range = xlsx.utils.decode_range(worksheet['!ref']);
      if (range.e.r - range.s.r + 1 > MAX_IMPORT_ROWS || range.e.c - range.s.c + 1 > MAX_SHEET_COLUMNS) {
        throw new BadRequestException(`工作表 ${sheetName} 的有效区域过大`);
      }
    }
    const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: null }) as unknown[][];
    let sheetFormat: 'SINGLE_PIECE' | 'LEGACY' | undefined;
    rows.forEach((row, rowIndex) => {
      if (!rowHasContent(row)) return;
      if (isHeaderRow(row)) {
        sheetFormat = isSinglePieceHeaderRow(row) ? 'SINGLE_PIECE' : 'LEGACY';
        return;
      }
      totalRows += 1;
      if (totalRows > MAX_IMPORT_ROWS) {
        throw new BadRequestException(`单次最多导入 ${MAX_IMPORT_ROWS} 行数据`);
      }
      const rowNumber = rowIndex + 1;
      const barcode = normalizedText(row[0]);
      try {
        if (!barcode) throw new Error('条码不能为空');
        const { customerCode, domesticTrackingNo } = splitBarcode(barcode);
        const weightKg = parsePositiveNumber(row[1], '实重', MAX_WEIGHT_KG);
        const lengthCm = parsePositiveNumber(row[2], '长度', MAX_DIMENSION_CM);
        const widthCm = parsePositiveNumber(row[3], '宽度', MAX_DIMENSION_CM);
        const heightCm = parsePositiveNumber(row[4], '高度', MAX_DIMENSION_CM);
        const rowFormat = sheetFormat ?? (normalizedText(row[7]) ? 'LEGACY' : 'SINGLE_PIECE');
        const packageCount = rowFormat === 'SINGLE_PIECE' ? parsePackageCount(row[5]) : 1;
        const scanDate = rowFormat === 'SINGLE_PIECE'
          ? importStartedAt
          : parseMachineTime(row[7]);
        const combinedOrderNo = `${customerCode}-${domesticTrackingNo}`;
        const scanTime = scanDate.toISOString();
        const cbm = round((lengthCm * widthCm * heightCm) / 1_000_000, 6);
        const volumetricWeightKg = round((lengthCm * widthCm * heightCm) / 6_000, 3);
        const remark = rowFormat === 'LEGACY'
          ? row.slice(8).map(normalizedText).filter(Boolean).join('；').slice(0, 500) || undefined
          : undefined;
        const key = warehouseMachineImportKey(combinedOrderNo, scanDate);
        const fileKey = rowFormat === 'SINGLE_PIECE' ? `${key}|${sheetName}|${rowNumber}` : key;
        const signature = JSON.stringify({ weightKg, lengthCm, widthCm, heightCm, packageCount, remark: remark ?? '' });
        const candidate: WarehouseMachineImportCandidate = {
          sheetName,
          rowNumber,
          barcode: combinedOrderNo,
          customerCode,
          domesticTrackingNo,
          weightKg,
          lengthCm,
          widthCm,
          heightCm,
          packageCount,
          cbm,
          volumetricWeightKg,
          scanTime,
          remark,
          key,
          fileKey,
          signature
        };
        validCandidateRows.push(candidate);
        if (!earliest || scanDate < earliest) earliest = scanDate;
        if (!latest || scanDate > latest) latest = scanDate;
      } catch (error) {
        invalidRows += 1;
        issues.push({
          type: 'INVALID',
          sheetName,
          rowNumber,
          barcode: barcode || undefined,
          reason: error instanceof Error ? error.message : '数据格式不正确'
        });
      }
    });
  }

  if (!totalRows) throw new BadRequestException('Excel 文件中没有可导入的数据');
  const candidates: WarehouseMachineImportCandidate[] = [];
  const rowsByKey = new Map<string, WarehouseMachineImportCandidate[]>();
  validCandidateRows.forEach((row) => rowsByKey.set(row.fileKey, [...(rowsByKey.get(row.fileKey) ?? []), row]));
  rowsByKey.forEach((rows) => {
    const first = rows[0]!;
    const signatures = new Set(rows.map((row) => row.signature));
    if (signatures.size > 1) {
      duplicateFileRows += rows.length;
      rows.forEach((row) => issues.push({
        type: 'CONFLICT_FILE',
        sheetName: row.sheetName,
        rowNumber: row.rowNumber,
        barcode: row.barcode,
        reason: `同一条码和过机时间存在 ${signatures.size} 组不同测量数据，整组已跳过`
      }));
      return;
    }
    candidates.push(first);
    duplicateFileRows += rows.length - 1;
    rows.slice(1).forEach((row) => issues.push({
      type: 'DUPLICATE_FILE',
      sheetName: row.sheetName,
      rowNumber: row.rowNumber,
      barcode: row.barcode,
      reason: `与 ${first.sheetName} 第 ${first.rowNumber} 行重复，已跳过`
    }));
  });
  return {
    fileName,
    totalRows,
    validRows: validCandidateRows.length,
    invalidRows,
    duplicateFileRows,
    issues,
    candidates,
    dateFrom: earliest?.toISOString(),
    dateTo: latest?.toISOString()
  };
}

export function buildWarehouseMachineImportResponse(
  parsed: ParsedWarehouseMachineImport,
  existingKeys: Set<string>,
  options: { committed?: boolean; importedRows?: number; duplicateBatch?: boolean } = {}
): WarehouseMachineImportResponse {
  const systemDuplicateIssues = parsed.candidates
    .filter((candidate) => existingKeys.has(candidate.key))
    .map<WarehouseMachineImportIssue>((candidate) => ({
      type: 'DUPLICATE_SYSTEM',
      sheetName: candidate.sheetName,
      rowNumber: candidate.rowNumber,
      barcode: candidate.barcode,
      reason: '系统已存在相同条码和过机时间，已跳过'
    }));
  const duplicateBatchIssues = options.duplicateBatch
    ? parsed.candidates.map<WarehouseMachineImportIssue>((candidate) => ({
      type: 'DUPLICATE_BATCH',
      sheetName: candidate.sheetName,
      rowNumber: candidate.rowNumber,
      barcode: candidate.barcode,
      reason: '同一文件已完成导入，整批已跳过'
    }))
    : [];
  const importable = options.duplicateBatch
    ? []
    : parsed.candidates.filter((candidate) => !existingKeys.has(candidate.key));
  const allIssues = [...parsed.issues, ...systemDuplicateIssues, ...duplicateBatchIssues];
  return {
    fileName: parsed.fileName,
    committed: options.committed === true,
    totalRows: parsed.totalRows,
    validRows: parsed.validRows,
    importableRows: importable.length,
    importedRows: options.importedRows ?? 0,
    invalidRows: parsed.invalidRows,
    duplicateFileRows: parsed.duplicateFileRows,
    duplicateSystemRows: systemDuplicateIssues.length + duplicateBatchIssues.length,
    issueCount: allIssues.length,
    issues: allIssues.slice(0, MAX_ISSUES_IN_RESPONSE),
    samples: importable.slice(0, MAX_SAMPLES_IN_RESPONSE).map(({ key: _key, fileKey: _fileKey, signature: _signature, ...row }) => row),
    dateFrom: parsed.dateFrom,
    dateTo: parsed.dateTo
  };
}
