import { describe, expect, it } from 'vitest';
import type { ExcelModule } from '../shared/excel';
import { parseBulkTrackingWorkbook } from './bulkImport';

function excelFixture(rows: Array<Array<string | number | null>>) {
  return {
    xlsx: {
      read: () => ({ SheetNames: ['轨迹'], Sheets: { 轨迹: {} } }),
      utils: { sheet_to_json: () => rows }
    }
  } as unknown as ExcelModule;
}

describe('bulk tracking import', () => {
  it.each(['出货单号', '运单号'])('accepts %s as the outbound order header', async (orderHeader) => {
    const rows = await parseBulkTrackingWorkbook(new ArrayBuffer(0), excelFixture([
      [orderHeader, '轨迹日期时间', '地点', '轨迹信息'],
      ['SY001', '2026-07-27 10:00', '深圳', '已揽收']
    ]));

    expect(rows).toEqual([{
      customerOrderNo: 'SY001',
      date: '2026-07-27 10:00',
      description: '已揽收',
      location: '深圳',
      rowNumber: 2
    }]);
  });

  it('uses the deployed error text when the outbound order header is missing', async () => {
    await expect(parseBulkTrackingWorkbook(new ArrayBuffer(0), excelFixture([
      ['轨迹日期时间', '轨迹信息']
    ]))).rejects.toThrow('轨迹表必须包含出货单号（兼容运单号）、轨迹日期时间、轨迹信息');
  });
});
