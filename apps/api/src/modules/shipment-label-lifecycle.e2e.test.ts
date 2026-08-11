import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('Shipment label lifecycle API', () => {
  const app = setupE2eApp();

  it('keeps generation, reuse, listing, voiding, upload, download, audit, and access contracts unchanged', async () => {
    const adminToken = await app.loginAs('admin');
    const warehouseToken = await app.loginAs('warehouse');
    const customerToken = await app.loginAs('customer');

    await request(app.getHttpServer())
      .post('/api/shipments/s-seed-1/labels')
      .expect(401)
      .expect((response) => expect(response.body.message).toBe('缺少登录凭证'));

    await request(app.getHttpServer())
      .get('/api/shipments/s-seed-1/labels')
      .set('Authorization', app.auth(customerToken))
      .expect(403)
      .expect((response) => expect(response.body.message).toBe('客户不能查看内部面单'));

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

    const created = await request(app.getHttpServer())
      .post('/api/shipments/s-seed-1/labels')
      .set('Authorization', app.auth(warehouseToken))
      .expect(201);
    expect(created.body).toEqual(expect.objectContaining({
      label: expect.objectContaining({
        shipmentId: 's-seed-1',
        status: 'CREATED',
        labelNo: expect.stringMatching(/^LBL/),
        transferNo: expect.any(String),
        labelUrl: expect.stringMatching(/^\/mock-labels\//)
      }),
      shipment: expect.objectContaining({
        id: 's-seed-1',
        transferNo: created.body.label.transferNo
      })
    }));

    await request(app.getHttpServer())
      .post('/api/shipments/s-seed-1/labels')
      .set('Authorization', app.auth(warehouseToken))
      .expect(201)
      .expect((response) => expect(response.body.label.id).toBe(created.body.label.id));

    await request(app.getHttpServer())
      .get('/api/shipments/s-seed-1/labels')
      .set('Authorization', app.auth(warehouseToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual([expect.objectContaining({ id: created.body.label.id })]);
      });

    await request(app.getHttpServer())
      .get(`/api/shipments/s-seed-1/labels/${created.body.label.id}/file`)
      .set('Authorization', app.auth(warehouseToken))
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('该面单没有可下载的上传文件'));

    await request(app.getHttpServer())
      .post(`/api/shipments/s-seed-1/labels/${created.body.label.id}/void`)
      .set('Authorization', app.auth(adminToken))
      .expect(201)
      .expect((response) => expect(response.body.status).toBe('VOIDED'));

    await request(app.getHttpServer())
      .post(`/api/shipments/s-seed-1/labels/${created.body.label.id}/void`)
      .set('Authorization', app.auth(adminToken))
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('面单已作废'));

    const recreated = await request(app.getHttpServer())
      .post('/api/shipments/s-seed-1/labels')
      .set('Authorization', app.auth(warehouseToken))
      .expect(201);
    expect(recreated.body.label.id).not.toBe(created.body.label.id);

    await request(app.getHttpServer())
      .post('/api/warehouse/handover/print')
      .set('Authorization', app.auth(adminToken))
      .send({ shipmentIds: ['s-seed-1'] })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/shipments/s-seed-1/dispatch')
      .set('Authorization', app.auth(warehouseToken))
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/shipments/s-seed-1/labels/upload')
      .set('Authorization', app.auth(adminToken))
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('请上传面单'));

    await request(app.getHttpServer())
      .post('/api/shipments/s-seed-1/labels/upload')
      .set('Authorization', app.auth(adminToken))
      .attach('file', Buffer.from('not-an-image'), { filename: 'label.txt', contentType: 'text/plain' })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('仅支持图片或 PDF 面单'));

    const labelPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const uploaded = await request(app.getHttpServer())
      .post('/api/shipments/s-seed-1/labels/upload')
      .set('Authorization', app.auth(adminToken))
      .field('transferNo', '1Z-PHASE21')
      .attach('file', labelPng, { filename: 'phase21-label.png', contentType: 'image/png' })
      .expect(201);
    expect(uploaded.body).toEqual(expect.objectContaining({
      label: expect.objectContaining({
        shipmentId: 's-seed-1',
        transferNo: '1Z-PHASE21',
        status: 'CREATED',
        labelUrl: expect.stringContaining('/api/uploads/labels/')
      }),
      shipment: expect.objectContaining({
        id: 's-seed-1',
        transferNo: '1Z-PHASE21',
        latestTracking: '已上传面单'
      })
    }));

    await request(app.getHttpServer())
      .get(`/api/shipments/s-seed-1/labels/${uploaded.body.label.id}/file`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect('Content-Type', /image\/png/)
      .expect('Cache-Control', 'private, no-store')
      .expect((response) => expect(response.body).toEqual(labelPng));

    await request(app.getHttpServer())
      .post(`/api/shipments/s-seed-1/labels/${uploaded.body.label.id}/void`)
      .set('Authorization', app.auth(adminToken))
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('已发货运单不能作废面单'));

    await request(app.getHttpServer())
      .get('/api/system/audit-logs')
      .query({ action: 'shipment.label.upload' })
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows.filter((row: { target: string }) => row.target === 's-seed-1')).toEqual([
          expect.objectContaining({
            actorUsername: 'admin',
            after: expect.objectContaining({
              fileName: 'phase21-label.png',
              transferNo: '1Z-PHASE21',
              uploadedBy: 'admin',
              sizeBytes: labelPng.length
            })
          })
        ]);
      });
  });
});
