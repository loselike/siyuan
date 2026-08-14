import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from '../../test-support/e2e-harness.js';

describe('Tracking manual event command API', () => {
  const app = setupE2eApp();

  it('preserves authentication, route-specific permissions, repository errors and response fields', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');
    const warehouseToken = await app.loginAs('warehouse');

    const shipmentInput = {
      status: '人工轨迹契约-运单',
      happenedAt: '2026-08-12T01:02:03.000Z',
      location: 'Shanghai',
      carrier: 'DHL',
      transferNo: 'TRACK-MANUAL-SHIPMENT',
      rawContent: '人工轨迹原文',
      visibleToCustomer: false,
      source: 'MANUAL_ENTRY' as const
    };
    const operationInput = {
      status: '人工轨迹契约-运营',
      happenedAt: '2026-08-12T02:03:04.000Z'
    };

    await request(app.getHttpServer())
      .post('/api/shipments/s-seed-3/tracking-events')
      .send(shipmentInput)
      .expect(401)
      .expect({ message: '缺少登录凭证', error: 'Unauthorized', statusCode: 401 });

    await request(app.getHttpServer())
      .post('/api/operations/line-shipments/s-seed-3/tracking-events')
      .send(operationInput)
      .expect(401)
      .expect({ message: '缺少登录凭证', error: 'Unauthorized', statusCode: 401 });

    await request(app.getHttpServer())
      .post('/api/shipments/s-seed-3/tracking-events')
      .set('Authorization', app.auth(operatorToken))
      .send(shipmentInput)
      .expect(403)
      .expect({ message: '没有访问权限', error: 'Forbidden', statusCode: 403 });

    await request(app.getHttpServer())
      .post('/api/operations/line-shipments/s-seed-3/tracking-events')
      .set('Authorization', app.auth(warehouseToken))
      .send(operationInput)
      .expect(403)
      .expect({ message: '没有访问权限', error: 'Forbidden', statusCode: 403 });

    await request(app.getHttpServer())
      .post('/api/shipments/missing-tracking-shipment/tracking-events')
      .set('Authorization', app.auth(adminToken))
      .send(shipmentInput)
      .expect(404)
      .expect({ message: '运单不存在', error: 'Not Found', statusCode: 404 });

    await request(app.getHttpServer())
      .post('/api/operations/line-shipments/missing-tracking-shipment/tracking-events')
      .set('Authorization', app.auth(operatorToken))
      .send(operationInput)
      .expect(404)
      .expect({ message: '运单不存在', error: 'Not Found', statusCode: 404 });

    await request(app.getHttpServer())
      .post('/api/shipments/s-seed-3/tracking-events')
      .set('Authorization', app.auth(adminToken))
      .send(shipmentInput)
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          id: 's-seed-3',
          latestTracking: shipmentInput.status,
          latestTrackingUpdatedAt: shipmentInput.happenedAt,
          trackingStaleDays: 0
        }));
      });

    await request(app.getHttpServer())
      .post('/api/operations/line-shipments/s-seed-3/tracking-events')
      .set('Authorization', app.auth(operatorToken))
      .send(operationInput)
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          id: 's-seed-3',
          latestTracking: operationInput.status,
          latestTrackingUpdatedAt: operationInput.happenedAt,
          trackingStaleDays: 0
        }));
      });
  });
});
