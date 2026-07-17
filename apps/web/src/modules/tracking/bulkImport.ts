import type { BulkTrackingImportRow } from '@siyuan/shared';
import { loadExcel, readWorkbook, worksheetToRows, type ExcelModule } from '../shared/excel';

export { loadExcel };

export async function parseBulkTrackingWorkbook(arrayBuffer: ArrayBuffer, excel: ExcelModule): Promise<BulkTrackingImportRow[]> {
  const workbook = await readWorkbook(arrayBuffer, excel);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error('轨迹表为空');
  }

  const rows = worksheetToRows(sheet);
  const [headers, ...dataRows] = rows;
  if (!headers?.length) {
    throw new Error('轨迹表缺少表头');
  }

  const orderIndex = findHeaderIndex(headers, ['运单号', '系统单号', '客户单号或者转单号', '客户单号或转单号', '内部单号或者快递号', '内部单号或快递号', '客户单号', '内部单号', '转单号', '子单号', '快递号', '单号', '订单号']);
  const dateIndex = findHeaderIndex(headers, ['轨迹日期时间', '轨迹时间', '日期时间', '日期', '时间', '扫描时间']);
  const descriptionIndex = findHeaderIndex(headers, ['轨迹信息', '轨迹内容', '描述', '轨迹描述', '内容']);
  const locationIndex = findHeaderIndex(headers, ['位置', '地点', 'location', '国家']);

  if (orderIndex < 0 || dateIndex < 0 || descriptionIndex < 0) {
    throw new Error('轨迹表必须包含运单号、轨迹日期时间、轨迹信息');
  }

  return dataRows
    .map((row, index) => ({
      customerOrderNo: cellToText(row[orderIndex]),
      date: typeof row[dateIndex] === 'number' ? row[dateIndex] : cellToText(row[dateIndex]),
      description: cellToText(row[descriptionIndex]),
      location: locationIndex >= 0 ? cellToText(row[locationIndex]) : undefined,
      rowNumber: index + 2
    }));
}

export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
        return;
      }
      reject(new Error('无法读取轨迹表文件'));
    };
    reader.onerror = () => reject(new Error('无法读取轨迹表文件'));
    reader.readAsArrayBuffer(file);
  });
}

function findHeaderIndex(headers: Array<string | number | null>, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeader);
  return headers.findIndex((header) => normalizedAliases.includes(normalizeHeader(header)));
}

function normalizeHeader(value: string | number | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function cellToText(value: string | number | null | undefined) {
  return String(value ?? '').trim();
}

export function formatTrackingImportDate(value: string | number) {
  if (typeof value !== 'number') {
    return value;
  }

  const parsed = parseExcelSerialDate(value);
  if (!parsed) {
    return String(value);
  }
  return parsed;
}

function parseExcelSerialDate(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  const excelEpoch = Date.UTC(1899, 11, 30);
  const date = new Date(excelEpoch + value * 24 * 60 * 60 * 1000);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
}
