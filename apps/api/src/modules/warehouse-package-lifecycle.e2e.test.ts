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

  it('validates nested manual-receipt input without weakening authentication or permission guards', async () => {
    const adminToken = await app.loginAs('admin');
    const customerToken = await app.loginAs('customer');
    const invalidBody = {
      customerCode: '9409',
      domesticTrackingNo: 'KY-PH4-INVALID',
      cartonSpecs: [{ weightKg: true, lengthCm: 40, widthCm: 30, heightCm: 20, packageCount: 1 }]
    };

    await request(app.getHttpServer())
      .post('/api/warehouse/packages/manual-receipt')
      .send(invalidBody)
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/warehouse/packages/manual-receipt')
      .set('Authorization', app.auth(customerToken))
      .send(invalidBody)
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/warehouse/packages/manual-receipt')
      .set('Authorization', app.auth(adminToken))
      .send(invalidBody)
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('第 1 条箱规重量必须大于 0');
      });
    await request(app.getHttpServer())
      .post('/api/warehouse/packages/manual-receipt')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerCode: 'TOO-LONG-9',
        domesticTrackingNo: 'KY-PH4-NO-WRITE',
        cartonSpecs: [{ weightKg: '8', lengthCm: '40', widthCm: '30', heightCm: '20', packageCount: '1' }]
      })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('客户编号最长 8 位');
      });
  });

  it('preserves direct package creation numeric-string, default and clamping behavior', async () => {
    const adminToken = await app.loginAs('admin');
    const trackingNo = `KY-PH5-CHAR-${Date.now()}`;
    const defaultTrackingNo = `${trackingNo}-DEFAULT`;

    await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerCode: '9409',
        customerOrderNo: '9409',
        domesticTrackingNo: trackingNo,
        expectedTotalPackageCount: '3.8',
        packageIndex: '9',
        weightKg: '8.125',
        lengthCm: '40.25',
        widthCm: '30',
        heightCm: '20'
      })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          expectedTotalPackageCount: 3,
          packageIndex: 3,
          packageCount: 1,
          weightKg: 8.13,
          lengthCm: 40.25,
          widthCm: 30,
          heightCm: 20
        }));
      });

    await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerCode: '9409',
        customerOrderNo: '9409',
        domesticTrackingNo: defaultTrackingNo
      })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          expectedTotalPackageCount: 1,
          packageIndex: 1,
          packageCount: 1,
          weightKg: 0,
          lengthCm: 0,
          widthCm: 0,
          heightCm: 0
        }));
      });
  });

  it('validates direct package creation input without weakening authentication or permission guards', async () => {
    const adminToken = await app.loginAs('admin');
    const customerToken = await app.loginAs('customer');
    const invalidBody = {
      customerCode: '9409',
      domesticTrackingNo: 'KY-PH5-INVALID',
      weightKg: true
    };

    await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .send(invalidBody)
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(customerToken))
      .send(invalidBody)
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(adminToken))
      .send(invalidBody)
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('重量格式不正确');
      });
    await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerCode: 'TOO-LONG-9',
        domesticTrackingNo: 'KY-PH5-NO-WRITE',
        expectedTotalPackageCount: '2',
        packageIndex: '1',
        packageCount: '1',
        weightKg: '8',
        lengthCm: '40',
        widthCm: '30',
        heightCm: '20'
      })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('客户编号最长 8 位');
      });
  });

  it('preserves package update numeric-string, flooring, clamping and explicit default behavior', async () => {
    const adminToken = await app.loginAs('admin');
    const authorization = app.auth(adminToken);
    const trackingNo = `KY-PH7-CHAR-${Date.now()}`;
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
        weightKg: 8,
        lengthCm: 40,
        widthCm: 30,
        heightCm: 20,
        scanTime: '2026-08-19T08:00:00.000+08:00'
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/warehouse/packages/${created.body.id}`)
      .set('Authorization', authorization)
      .send({
        expectedTotalPackageCount: '3.8',
        packageIndex: '9',
        packageCount: '2.8',
        weightKg: '12.345',
        lengthCm: '42.345',
        widthCm: '31',
        heightCm: '21',
        remark: '  phase7 numeric strings  ',
        ignored: 'not-forwarded'
      })
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          id: created.body.id,
          customerCode: '9409',
          domesticTrackingNo: trackingNo,
          expectedTotalPackageCount: 3,
          packageIndex: 3,
          packageCount: 2,
          weightKg: 12.35,
          lengthCm: 42.35,
          widthCm: 31,
          heightCm: 21,
          remark: 'phase7 numeric strings'
        }));
      });

    await request(app.getHttpServer())
      .patch(`/api/warehouse/packages/${created.body.id}`)
      .set('Authorization', authorization)
      .send({
        expectedTotalPackageCount: null,
        packageIndex: '',
        packageCount: null,
        weightKg: null,
        lengthCm: '',
        widthCm: null,
        heightCm: '',
        scanTime: null
      })
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          id: created.body.id,
          customerCode: '9409',
          domesticTrackingNo: trackingNo,
          expectedTotalPackageCount: 1,
          packageIndex: 1,
          packageCount: 1,
          weightKg: 0,
          lengthCm: 0,
          widthCm: 0,
          heightCm: 0,
          scanTime: '2026-08-19T08:00:00.000+08:00',
          remark: 'phase7 numeric strings'
        }));
      });
  });

  it('validates package update input before repository lookup without weakening authentication or permission guards', async () => {
    const adminToken = await app.loginAs('admin');
    const customerToken = await app.loginAs('customer');
    const path = '/api/warehouse/packages/codex-phase7-nonexistent';
    const invalidBody = { weightKg: true };

    await request(app.getHttpServer())
      .patch(path)
      .send(invalidBody)
      .expect(401);
    await request(app.getHttpServer())
      .patch(path)
      .set('Authorization', app.auth(customerToken))
      .send(invalidBody)
      .expect(403);
    await request(app.getHttpServer())
      .patch(path)
      .set('Authorization', app.auth(adminToken))
      .send(invalidBody)
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('重量格式不正确');
      });
    await request(app.getHttpServer())
      .patch(path)
      .set('Authorization', app.auth(adminToken))
      .send([])
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('包裹修改参数格式不正确');
      });
    await request(app.getHttpServer())
      .patch(path)
      .set('Authorization', app.auth(adminToken))
      .send({ remark: {} })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('备注格式不正确');
      });
    await request(app.getHttpServer())
      .patch(path)
      .set('Authorization', app.auth(adminToken))
      .send({ packageCount: '2.8', weightKg: '12.345', remark: '  phase7 valid  ' })
      .expect(404)
      .expect((response) => {
        expect(response.body.message).toBe('仓库包裹不存在');
      });
  });

  it('preserves split numeric strings, pieces precedence and split-count defaults', async () => {
    const adminToken = await app.loginAs('admin');
    const authorization = app.auth(adminToken);
    const suffix = `${Date.now()}`;

    const createSource = async (trackingNo: string, weightKg: number) => request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', authorization)
      .send({
        customerCode: '9409',
        customerOrderNo: '9409',
        domesticTrackingNo: trackingNo,
        packageCount: 1,
        weightKg,
        lengthCm: 40,
        widthCm: 30,
        heightCm: 20
      })
      .expect(201);

    const piecesSource = await createSource(`KY-PH6-PIECES-${suffix}`, 30);
    const piecesSplit = await request(app.getHttpServer())
      .post(`/api/warehouse/packages/${piecesSource.body.id}/split`)
      .set('Authorization', authorization)
      .send({
        pieces: ['10', '20'],
        splitCount: 'not-used',
        remark: '  phase6 pieces precedence  '
      })
      .expect(201);
    expect(piecesSplit.body.sourcePackage).toEqual(expect.objectContaining({
      id: piecesSource.body.id,
      status: 'CONSOLIDATED'
    }));
    expect(piecesSplit.body.packages).toEqual([
      expect.objectContaining({
        sourcePackageId: piecesSource.body.id,
        expectedTotalPackageCount: 2,
        packageIndex: 1,
        packageCount: 10,
        weightKg: 10,
        remark: 'phase6 pieces precedence'
      }),
      expect.objectContaining({
        sourcePackageId: piecesSource.body.id,
        expectedTotalPackageCount: 2,
        packageIndex: 2,
        packageCount: 20,
        weightKg: 20,
        remark: 'phase6 pieces precedence'
      })
    ]);

    const countSource = await createSource(`KY-PH6-COUNT-${suffix}`, 8);
    const countSplit = await request(app.getHttpServer())
      .post(`/api/warehouse/packages/${countSource.body.id}/split`)
      .set('Authorization', authorization)
      .send({ splitCount: '2.8' })
      .expect(201);
    expect(countSplit.body.sourcePackage).toEqual(expect.objectContaining({
      id: countSource.body.id,
      status: 'CONSOLIDATED'
    }));
    expect(countSplit.body.packages).toEqual([
      expect.objectContaining({ expectedTotalPackageCount: 2, packageIndex: 1, packageCount: 1, weightKg: 4 }),
      expect.objectContaining({ expectedTotalPackageCount: 2, packageIndex: 2, packageCount: 1, weightKg: 4 })
    ]);
  });

  it('validates split input before repository lookup without weakening authentication or permission guards', async () => {
    const adminToken = await app.loginAs('admin');
    const customerToken = await app.loginAs('customer');
    const path = '/api/warehouse/packages/codex-phase6-nonexistent/split';
    const invalidPieces = { pieces: [true, 1] };

    await request(app.getHttpServer())
      .post(path)
      .send(invalidPieces)
      .expect(401);
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', app.auth(customerToken))
      .send(invalidPieces)
      .expect(403);
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', app.auth(adminToken))
      .send(invalidPieces)
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('每票件数必须是大于 0 的整数');
      });
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', app.auth(adminToken))
      .send({ pieces: [1] })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('拆分票数至少为 2');
      });
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', app.auth(adminToken))
      .send({ splitCount: {} })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('拆分票数至少为 2');
      });
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', app.auth(adminToken))
      .send([])
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('拆分票数至少为 2');
      });
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', app.auth(adminToken))
      .send({ pieces: [1, 1], splitCount: 'ignored', remark: 123 })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('备注格式不正确');
      });
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', app.auth(adminToken))
      .send({ pieces: ['1', '2'], splitCount: 'ignored', remark: '  phase6 valid  ' })
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
