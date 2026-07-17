import type readXlsxFile from 'read-excel-file/browser';
import type { CellValue as ReadCellValue } from 'read-excel-file/browser';
import writeXlsxFile from 'write-excel-file/browser';
import type * as XLSX from '@e965/xlsx';

export type ExcelModule = {
  readXlsxFile: typeof readXlsxFile;
  xlsx: typeof XLSX;
};
export type ExcelCellValue = string | number | null;
export type SimpleWorksheet = {
  name: string;
  rows: ExcelCellValue[][];
};
export type SimpleWorkbook = {
  worksheets: SimpleWorksheet[];
};

export async function loadExcel(): Promise<ExcelModule> {
  const [readModule, xlsx] = await Promise.all([
    import('read-excel-file/browser'),
    import('@e965/xlsx')
  ]);
  return { readXlsxFile: readModule.default, xlsx };
}

export async function readWorkbook(arrayBuffer: ArrayBuffer, excel: ExcelModule): Promise<SimpleWorkbook> {
  const workbook = excel.xlsx.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });
  return {
    worksheets: workbook.SheetNames.map((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      restoreNumericCachedFormulaErrors(worksheet);
      return {
        name: sheetName,
        rows: (excel.xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: null }) as unknown[][])
          .map((row) => row.map((value) => cellToPrimitive(value as ReadCellValue | boolean | null)))
      };
    })
  };
}

function restoreNumericCachedFormulaErrors(worksheet: XLSX.WorkSheet) {
  for (const address of Object.keys(worksheet)) {
    if (address.startsWith('!')) continue;
    const cell = worksheet[address];
    if (cell?.t === 'e' && typeof cell.v === 'number' && Number.isFinite(cell.v)) {
      cell.t = 'n';
      delete cell.f;
      delete cell.w;
    }
  }
}

export function createWorkbook(): SimpleWorkbook {
  return { worksheets: [] };
}

export function worksheetToRows(sheet: SimpleWorksheet): ExcelCellValue[][] {
  return sheet.rows;
}

export function addRowsWorksheet(workbook: SimpleWorkbook, name: string, rows: Array<Array<string | number | null | undefined>>) {
  const sheet = {
    name,
    rows: rows.map((row) => row.map((cell) => cell ?? null))
  };
  workbook.worksheets.push(sheet);
  return sheet;
}

export async function writeWorkbookBlob(workbook: SimpleWorkbook): Promise<Blob> {
  if (workbook.worksheets.length === 1) {
    return writeXlsxFile(workbook.worksheets[0].rows).toBlob();
  }
  return writeXlsxFile(
    workbook.worksheets.map((sheet) => ({ sheet: sheet.name, data: sheet.rows }))
  ).toBlob();
}

export async function writeWorkbookBuffer(workbook: SimpleWorkbook): Promise<ArrayBuffer> {
  const blob = await writeWorkbookBlob(workbook);
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

export async function downloadWorkbook(workbook: SimpleWorkbook, filename: string) {
  const blob = await writeWorkbookBlob(workbook);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function cellToPrimitive(value: ReadCellValue | boolean | null): ExcelCellValue {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}
