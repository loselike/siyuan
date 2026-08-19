import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('warehouse package lifecycle API contract', () => {
  const app = setupE2eApp();

  it('preserves authentication and package lifecycle permission metadata', async () => {
    const customerToken = await app.loginAs('customer');
    const routes: Array<[method: 'post' | 'patch' | 'put', path: string, body: object]> = [
      ['post', '/api/warehouse/packages', {}],
      ['post', '/api/warehouse/packages/manual-receipt', {}],
      ['post', '/api/warehouse/packages/codex-phase17-nonexistent/same-spec-replenish', {}],
      ['post', '/api/warehouse/packages/codex-phase17-nonexistent/split', {}],
      ['patch', '/api/warehouse/packages/codex-phase17-nonexistent', {}],
      ['put', '/api/warehouse/packages/codex-phase17-nonexistent/remark', {}],
      ['patch', '/api/warehouse/packages/codex-phase17-nonexistent/exception', {}]
    ];

    for (const [method, path, body] of routes) {
      await request(app.getHttpServer())[method](path).send(body).expect(401);
      await request(app.getHttpServer())[method](path)
        .set('Authorization', app.auth(customerToken))
        .send(body)
        .expect(403);
    }
  });

  it('validates same-spec replenishment before repository lookup without weakening guards', async () => {
    const adminToken = await app.loginAs('admin');
    const customerToken = await app.loginAs('customer');
    const path = '/api/warehouse/packages/codex-phase3-nonexistent/same-spec-replenish';

    await request(app.getHttpServer())
      .post(path)
      .send({ supplementCount: true, requestId: 'phase3-request' })
      .expect(401);
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', app.auth(customerToken))
      .send({ supplementCount: true, requestId: 'phase3-request' })
      .expect(403);
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', app.auth(adminToken))
      .send({ supplementCount: true, requestId: 'phase3-request' })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('补录箱数必须为 1 至 500 的正整数');
      });
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', app.auth(adminToken))
      .send({ supplementCount: 2 })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('页面已更新，请刷新后重新发起补录');
      });
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', app.auth(adminToken))
      .send({ supplementCount: '2', requestId: '  phase3-request  ' })
      .expect(404)
      .expect((response) => {
        expect(response.body.message).toBe('仓库包裹不存在');
      });
  });

  it('preserves create, replenish idempotency, update, remark, exception, split and manual-receipt effects', async () => {
    const adminToken = await app.loginAs('admin');
    const authorization = app.auth(adminToken);
    const suffix = `${Date.now()}`;
    const trackingNo = `KY-PH17-${suffix}`;
    const requestId = `phase17-${suffix}`;

    const created = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', authorization)
      .send({
        customerCode: '9409',
        customerOrderNo: '9409',
        domesticTrackingNo: trackingNo,
        expectedTotalPackageCount: 1,
        packageIndex: 1,
        packageCount: 1,
        weightKg: 10,
        lengthCm: 40,
        widthCm: 30,
        heightCm: 20,
        scanTime: '2026-08-12T08:00:00.000+08:00',
        scanSource: '扫码',
        remark: 'phase17 原始过机记录'
      })
      .expect(201);
    expect(created.body).toEqual(expect.objectContaining({
      customerCode: '9409',
      combinedOrderNo: `9409-${trackingNo}`,
      packageIndex: 1,
      packageCount: 1,
      scanSource: '扫码',
      measurementStatus: 'MEASURED',
      status: 'RECEIVED',
      createdBy: 'admin'
    }));

    const replenished = await request(app.getHttpServer())
      .post(`/api/warehouse/packages/${created.body.id}/same-spec-replenish`)
      .set('Authorization', authorization)
      .send({ supplementCount: 2, requestId })
      .expect(201);
    expect(replenished.body).toEqual(expect.objectContaining({
      sourcePackageId: created.body.id,
      totalPackageCount: 3
    }));
    expect(replenished.body.idempotent).toBeUndefined();
    expect(replenished.body.packages).toEqual([
      expect.objectContaining({ sourcePackageId: created.body.id, packageIndex: 2, packageCount: 1, scanSource: '同箱规补录' }),
      expect.objectContaining({ sourcePackageId: created.body.id, packageIndex: 3, packageCount: 1, scanSource: '同箱规补录' })
    ]);

    await request(app.getHttpServer())
      .post(`/api/warehouse/packages/${created.body.id}/same-spec-replenish`)
      .set('Authorization', authorization)
      .send({ supplementCount: 2, requestId })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('该票已有录单、理货或补录记录，不能再次同箱规补录');
      });

    await request(app.getHttpServer())
      .patch(`/api/warehouse/packages/${created.body.id}`)
      .set('Authorization', authorization)
      .send({ packageCount: 2, weightKg: 12, lengthCm: 42, remark: 'phase17 修改后' })
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          id: created.body.id,
          packageCount: 2,
          weightKg: 12,
          lengthCm: 42,
          remark: 'phase17 修改后'
        }));
      });

    await request(app.getHttpServer())
      .put(`/api/warehouse/packages/${created.body.id}/remark`)
      .set('Authorization', authorization)
      .send({ remark: 'phase17 单独备注' })
      .expect(200)
      .expect((response) => expect(response.body.remark).toBe('phase17 单独备注'));

    await request(app.getHttpServer())
      .patch(`/api/warehouse/packages/${created.body.id}/exception`)
      .set('Authorization', authorization)
      .send({ manualException: 'phase17 外箱破损' })
      .expect(200)
      .expect((response) => expect(response.body.manualException).toBe('phase17 外箱破损'));

    const split = await request(app.getHttpServer())
      .post(`/api/warehouse/packages/${created.body.id}/split`)
      .set('Authorization', authorization)
      .send({ pieces: [1, 1], remark: 'phase17 拆为两票' })
      .expect(201);
    expect(split.body.sourcePackage).toEqual(expect.objectContaining({
      id: created.body.id,
      status: 'CONSOLIDATED'
    }));
    expect(split.body.packages).toHaveLength(2);
    expect(split.body.packages).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourcePackageId: created.body.id, packageCount: 1, remark: 'phase17 拆为两票' })
    ]));

    const manualTrackingNo = `KY-PH17-MANUAL-${suffix}`;
    await request(app.getHttpServer())
      .post('/api/warehouse/packages/manual-receipt')
      .set('Authorization', authorization)
      .send({
        customerCode: '9409',
        customerOrderNo: '9409',
        domesticTrackingNo: manualTrackingNo,
        combinedOrderNo: `9409-${manualTrackingNo}`,
        cartonSpecs: [
          { weightKg: 8, lengthCm: 35, widthCm: 25, heightCm: 20, packageCount: 2 },
          { weightKg: 5, lengthCm: 30, widthCm: 20, heightCm: 15, packageCount: 1 }
        ],
        remark: 'phase17 多箱规手工收货'
      })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          totalCartonSpecs: 2,
          totalPackages: 3
        }));
        expect(response.body.packages).toHaveLength(2);
      });

    for (const action of [
      'warehouse.package.create',
      'warehouse.package.same_spec_replenish',
      'warehouse.package.update',
      'warehouse.package.remark.update',
      'warehouse.package.exception.update',
      'warehouse.package.split',
      'warehouse.package.manual_batch_create'
    ]) {
      await request(app.getHttpServer())
        .get('/api/system/audit-logs')
        .query({ action })
        .set('Authorization', authorization)
        .expect(200)
        .expect((response) => {
          expect(response.body.rows).toEqual(expect.arrayContaining([
            expect.objectContaining({ action, actorUsername: 'admin' })
          ]));
        });
    }
  });
});
