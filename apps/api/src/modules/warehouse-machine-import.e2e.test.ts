import * as xlsx from '@e965/xlsx';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

function machineWorkbook(trackingNo: string): Buffer {
  const workbook = xlsx.utils.book_new();
  const sheet = xlsx.utils.aoa_to_sheet([
    ['条码', '实重', '长度', '宽度', '高度', '件数'],
    [`9409-${trackingNo}`, 10, 40, 30, 20, 2]
  ]);
  xlsx.utils.book_append_sheet(workbook, sheet, '机器过机数据');
  return Buffer.from(xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

describe('warehouse machine import API contract', () => {
  const app = setupE2eApp();

  it('preserves authentication, permission and file validation behavior', async () => {
    const customerToken = await app.loginAs('customer');
    const adminToken = await app.loginAs('admin');

    await request(app.getHttpServer())
      .post('/api/warehouse/packages/machine-import')
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/warehouse/packages/machine-import')
      .set('Authorization', app.auth(customerToken))
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/warehouse/packages/machine-import')
      .set('Authorization', app.auth(adminToken))
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('请上传机器过机 Excel 文件'));

    await request(app.getHttpServer())
      .post('/api/warehouse/packages/machine-import')
      .set('Authorization', app.auth(adminToken))
      .attach('file', Buffer.from('not-an-excel-file'), {
        filename: 'machine-phase18.txt',
        contentType: 'text/plain'
      })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('仅支持 .xls/.xlsx Excel 文件'));
  });

  it('preserves preview, commit, duplicate-batch, package and audit effects', async () => {
    const adminToken = await app.loginAs('admin');
    const authorization = app.auth(adminToken);
    const trackingNo = `KY-PH18-${Date.now()}`;
    const buffer = machineWorkbook(trackingNo);
    const attachment = {
      filename: 'machine-phase18.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    await request(app.getHttpServer())
      .post('/api/warehouse/packages/machine-import')
      .set('Authorization', authorization)
      .field('commit', 'false')
      .attach('file', buffer, attachment)
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          fileName: 'machine-phase18.xlsx',
          committed: false,
          totalRows: 1,
          validRows: 1,
          importableRows: 1,
          importedRows: 0,
          invalidRows: 0,
          duplicateFileRows: 0,
          duplicateSystemRows: 0,
          issueCount: 0
        }));
        expect(response.body.samples).toEqual([
          expect.objectContaining({
            barcode: `9409-${trackingNo}`,
            customerCode: '9409',
            domesticTrackingNo: trackingNo,
            packageCount: 2,
            weightKg: 10,
            lengthCm: 40,
            widthCm: 30,
            heightCm: 20,
            cbm: 0.024,
            volumetricWeightKg: 4
          })
        ]);
      });

    await request(app.getHttpServer())
      .post('/api/warehouse/packages/machine-import')
      .set('Authorization', authorization)
      .field('commit', 'TRUE')
      .attach('file', buffer, attachment)
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          committed: true,
          totalRows: 1,
          importedRows: 1,
          duplicateSystemRows: 0
        }));
      });

    await request(app.getHttpServer())
      .post('/api/warehouse/packages/machine-import')
      .set('Authorization', authorization)
      .field('commit', 'true')
      .attach('file', buffer, attachment)
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          committed: true,
          importedRows: 0,
          importableRows: 0,
          duplicateSystemRows: 1,
          issueCount: 1
        }));
        expect(response.body.issues).toEqual([
          expect.objectContaining({
            type: 'DUPLICATE_BATCH',
            barcode: `9409-${trackingNo}`,
            reason: '同一文件已完成导入，整批已跳过'
          })
        ]);
      });

    await request(app.getHttpServer())
      .get('/api/warehouse/packages')
      .set('Authorization', authorization)
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([
          expect.objectContaining({
            combinedOrderNo: `9409-${trackingNo}`,
            packageCount: 2,
            weightKg: 10,
            scanSource: expect.stringMatching(/^机器表格导入#/),
            createdBy: 'admin'
          })
        ]));
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs')
      .query({ action: 'warehouse.package.machine_import' })
      .set('Authorization', authorization)
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'warehouse.package.machine_import',
            actorUsername: 'admin',
            target: expect.stringMatching(/^warehouse-machine-import:/),
            after: expect.objectContaining({ importedRows: 1 })
          })
        ]));
      });
  });
});
