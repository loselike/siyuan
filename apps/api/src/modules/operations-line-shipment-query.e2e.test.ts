import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('Operations line shipment query API', () => {
  const app = setupE2eApp();

  it('keeps pool parameters, response shape, and sensitive field trimming unchanged', async () => {
    const adminToken = await app.loginAs('admin');
    const warehouseToken = await app.loginAs('warehouse');

    await request(app.getHttpServer())
      .get('/api/operations/line-shipments')
      .query({
        statusGroup: 'ALL',
        page: 1,
        pageSize: 1,
        sortBy: 'systemOrderNo',
        sortOrder: 'asc'
      })
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          metrics: expect.any(Object),
          statusCounts: expect.any(Object),
          rows: expect.any(Array),
          pagination: {
            page: 1,
            pageSize: 1,
            totalItems: expect.any(Number)
          }
        }));
        expect(response.body.rows.length).toBeLessThanOrEqual(1);
      });

    await request(app.getHttpServer())
      .get('/api/operations/line-shipments')
      .set('Authorization', app.auth(warehouseToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.metrics.estimatedReceivable).toBe(0);
        response.body.rows.forEach((row: {
          receivableAmount?: number;
          shipment: { agentName?: string; agentChannelName?: string; remark?: string };
        }) => {
          expect(row.receivableAmount).toBeUndefined();
          expect(row.shipment.agentName ?? '').toBe('');
          expect(row.shipment.agentChannelName ?? '').toBe('');
          expect(row.shipment.remark).toBeUndefined();
        });
      });
  });

  it('keeps internal log data scope, authentication, and customer denial unchanged', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');
    const customerToken = await app.loginAs('customer');
    const warehouseToken = await app.loginAs('warehouse');
    const marketToken = await app.loginAs('market');

    await request(app.getHttpServer())
      .get('/api/operations/line-shipments/s-seed-6/internal-flow-log')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          shipmentId: 's-seed-6',
          systemOrderNo: 'SYZX0606UK001',
          items: expect.arrayContaining([
            expect.objectContaining({
              stage: '业务录单',
              summary: '运单已创建'
            })
          ])
        }));
      });

    await request(app.getHttpServer())
      .get('/api/operations/line-shipments/s-seed-6/internal-flow-log')
      .set('Authorization', app.auth(operatorToken))
      .expect(404);

    await request(app.getHttpServer())
      .get('/api/operations/line-shipments/s-seed-1/internal-flow-log')
      .set('Authorization', app.auth(marketToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.shipmentId).toBe('s-seed-1');
      });

    await request(app.getHttpServer())
      .get('/api/operations/line-shipments/s-seed-6/internal-flow-log')
      .set('Authorization', app.auth(warehouseToken))
      .expect(403)
      .expect((response) => {
        expect(response.body.message).toBe('没有内部流通日志查看权限');
      });

    await request(app.getHttpServer())
      .put('/api/system/roles/CUSTOMER/permissions')
      .set('Authorization', app.auth(adminToken))
      .send({ permissions: ['operations:line-shipment:internal-log-view'] })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/operations/line-shipments/s-seed-1/internal-flow-log')
      .set('Authorization', app.auth(customerToken))
      .expect(403)
      .expect((response) => {
        expect(response.body.message).toBe('客户不能查看内部流通日志');
      });

    await request(app.getHttpServer())
      .post('/api/shipments/s-seed-1/route')
      .set('Authorization', app.auth(adminToken))
      .send({
        channelId: 'ch-dhl-hk',
        agentId: 'a-yuhuan',
        agentChannelName: '宇环 DHL',
        chargeWeightKg: 18,
        unitPrice: 8,
        currency: 'RMB'
      })
      .expect(201);

    await request(app.getHttpServer())
      .put('/api/system/roles/WAREHOUSE/permissions')
      .set('Authorization', app.auth(adminToken))
      .send({
        permissions: [
          'operations:line-shipment:internal-log-view',
          'master-data:agents:read',
          'master-data:agent-channels:read',
          'system:global-mask:agent-short-name',
          'system:global-mask:agent-company-name',
          'system:global-mask:agent-channel'
        ]
      })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/operations/line-shipments/s-seed-1/internal-flow-log')
      .set('Authorization', app.auth(warehouseToken))
      .expect(200)
      .expect((response) => {
        const routeItem = response.body.items.find((item: { stage: string }) => item.stage === '市场排货');
        expect(routeItem).toEqual(expect.objectContaining({ summary: '已完成市场排货' }));
        expect(JSON.stringify(response.body)).not.toContain('宇环');
      });

    await request(app.getHttpServer())
      .get('/api/operations/line-shipments')
      .expect(401)
      .expect((response) => {
        expect(response.body.message).toBe('缺少登录凭证');
      });
  });
});
