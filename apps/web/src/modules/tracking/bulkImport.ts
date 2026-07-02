import type { BulkTrackingImportRow } from '@siyuan/shared';

type XlsxModule = typeof import('xlsx');

export function loadXlsx(): Promise<XlsxModule> {
  return import('xlsx');
}

export function parseBulkTrackingWorkbook(arrayBuffer: ArrayBuffer, xlsx: XlsxModule): BulkTrackingImportRow[] {
  const workbook = xlsx.read(arrayBuffer, { type: 'array', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('轨迹表为空');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json<Array<string | number | null>>(sheet, { header: 1, defval: '' });
  const [headers, ...dataRows] = rows;
  if (!headers?.length) {
    throw new Error('轨迹表缺少表头');
  }

  const orderIndex = findHeaderIndex(headers, ['客户单号或者转单号', '客户单号或转单号', '内部单号或者快递号', '内部单号或快递号', '客户单号', '内部单号', '转单号', '快递号', '单号', '订单号']);
  const dateIndex = findHeaderIndex(headers, ['日期', '时间', '轨迹时间', '扫描时间']);
  const descriptionIndex = findHeaderIndex(headers, ['描述', '轨迹描述', '内容', '轨迹内容']);
  const locationIndex = findHeaderIndex(headers, ['位置', '地点', 'location', '国家']);

  if (orderIndex < 0 || dateIndex < 0 || descriptionIndex < 0) {
    throw new Error('轨迹表必须包含客户单号或者转单号、日期、描述');
  }

  return dataRows
    .map((row) => ({
      customerOrderNo: cellToText(row[orderIndex]),
      date: typeof row[dateIndex] === 'number' ? row[dateIndex] : cellToText(row[dateIndex]),
      description: cellToText(row[descriptionIndex]),
      location: locationIndex >= 0 ? cellToText(row[locationIndex]) : undefined
    }))
    .filter((row) => row.customerOrderNo && row.description);
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
