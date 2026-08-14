import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('Tracking import command API', () => {
  const app = setupE2eApp();

  it('keeps authentication, permission order, validation, response, shipment, and audit contracts unchanged', async () => {
    const adminToken = await app.loginAs('admin');
    const customerToken = await app.loginAs('customer');
    const warehouseToken = await app.loginAs('warehouse');
    const path = '/api/shipments/tracking-events/import';

    await request(app.getHttpServer())
      .post(path)
      .send({ updates: [] })
      .expect(401)
      .expect((response) => expect(response.body.message).toBe('缺少登录凭证'));

    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', app.auth(customerToken))
      .send({ updates: [] })
      .expect(403)
      .expect((response) => expect(response.body.message).toBe('客户不能批量导入轨迹'));

    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', app.auth(warehouseToken))
      .send({ updates: [] })
      .expect(403)
      .expect((response) => expect(response.body.message).toBe('没有访问权限'));

    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', app.auth(adminToken))
      .send({ updates: [] })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('没有可导入的轨迹记录'));

    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: 'phase24-tracking.xlsx',
        rawRowCount: 3,
        failedRowCount: 1,
        unmatchedOrderNos: ['PHASE24-MISSING'],
        updates: [
          {
            shipmentId: 's-seed-2',
            customerOrderNo: 'RCV-0606',
            trackingDate: '2026-08-10T10:00:00.000Z',
            latestTracking: ' phase24 批量轨迹-旧 '
          },
          {
            shipmentId: 's-seed-2',
            customerOrderNo: 'SYGJ06061230000',
            trackingDate: '2026/08/11 11:30:00',
            latestTracking: 'phase24 批量轨迹-新'
          }
        ]
      })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          importedCount: 1,
          importedRowCount: 2,
          failedRowCount: 1,
          unmatchedCount: 1,
          affectedShipmentCount: 1
        }));
        expect(response.body.updated).toEqual([
          expect.objectContaining({
            id: 's-seed-2',
            latestTracking: 'phase24 批量轨迹-新',
            latestTrackingUpdatedAt: expect.any(String),
            trackingStaleDays: 0
          })
        ]);
      });

    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: 's-seed-2',
            latestTracking: 'phase24 批量轨迹-新',
            latestTrackingUpdatedAt: expect.any(String),
            trackingStaleDays: 0
          })
        ]));
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=tracking.manual_import')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows[0]).toEqual(expect.objectContaining({
          action: 'tracking.manual_import',
          target: 'shipments/tracking-events/import',
          after: expect.objectContaining({
            fileName: 'phase24-tracking.xlsx',
            rawRowCount: 3,
            successCount: 1,
            successRowCount: 2,
            failedRowCount: 1,
            unmatchedCount: 1,
            affectedShipmentCount: 1
          })
        }));
      });
  });
});
