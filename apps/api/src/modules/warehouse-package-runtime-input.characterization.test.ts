import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('warehouse package runtime input behavior', () => {
  const app = setupE2eApp();

  it('preserves authentication and permission checks before parsing all five bodies', async () => {
    const customerToken = await app.loginAs('customer');
    const routes: Array<[method: 'patch' | 'put' | 'post', path: string]> = [
      ['patch', '/api/warehouse/packages/runtime-input-nonexistent'],
      ['put', '/api/warehouse/packages/runtime-input-nonexistent/remark'],
      ['patch', '/api/warehouse/packages/runtime-input-nonexistent/exception'],
      ['post', '/api/warehouse/today-receipts/batch-delete'],
      ['post', '/api/warehouse/in-stock/batch-delete']
    ];

    for (const [method, path] of routes) {
      await request(app.getHttpServer())[method](path)
        .send('malformed-body')
        .expect(401);
      await request(app.getHttpServer())[method](path)
        .set('Authorization', app.auth(customerToken))
        .send('malformed-body')
        .expect(403);
    }
  });

  it('records the current malformed-body responses without mutating the package', async () => {
    const adminToken = await app.loginAs('admin');
    const trackingNo = `RUNTIME-INPUT-${Date.now()}`;
    const created = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerCode: '9409',
        customerOrderNo: '9409',
        domesticTrackingNo: trackingNo,
        expectedTotalPackageCount: 1,
        packageIndex: 1,
        packageCount: 1,
        weightKg: 5,
        lengthCm: 40,
        widthCm: 30,
        heightCm: 20,
        remark: '输入保护基线备注',
        manualException: '输入保护基线异常'
      })
      .expect(201);
    const packageId = created.body.id as string;

    await request(app.getHttpServer())
      .patch(`/api/warehouse/packages/${packageId}`)
      .set('Authorization', app.auth(adminToken))
      .send({ customerCode: 123 })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('客户编号格式不正确'));

    await request(app.getHttpServer())
      .patch(`/api/warehouse/packages/${packageId}`)
      .set('Authorization', app.auth(adminToken))
      .send({ packageCount: true })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('件数格式不正确'));

    await request(app.getHttpServer())
      .patch(`/api/warehouse/packages/${packageId}`)
      .set('Authorization', app.auth(adminToken))
      .send({ weightKg: {} })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('重量格式不正确'));

    await request(app.getHttpServer())
      .patch(`/api/warehouse/packages/${packageId}`)
      .set('Authorization', app.auth(adminToken))
      .send({ lengthCm: [50] })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('长宽高格式不正确'));

    await request(app.getHttpServer())
      .put(`/api/warehouse/packages/${packageId}/remark`)
      .set('Authorization', app.auth(adminToken))
      .send({ remark: 123 })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('备注格式不正确'));

    await request(app.getHttpServer())
      .patch(`/api/warehouse/packages/${packageId}/exception`)
      .set('Authorization', app.auth(adminToken))
      .send({ manualException: 123 })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('异常说明格式不正确'));

    await request(app.getHttpServer())
      .post('/api/warehouse/in-stock/batch-delete')
      .set('Authorization', app.auth(adminToken))
      .send({ ids: packageId, reason: '非法 ids 结构' })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('包裹编号格式不正确'));

    await request(app.getHttpServer())
      .post('/api/warehouse/today-receipts/batch-delete')
      .set('Authorization', app.auth(adminToken))
      .send({ ids: packageId, reason: '非法 ids 结构' })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('包裹编号格式不正确'));

    await request(app.getHttpServer())
      .post('/api/warehouse/in-stock/batch-delete')
      .set('Authorization', app.auth(adminToken))
      .send({ ids: [], reason: '空选择' })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('请至少选择一个包裹'));

    await request(app.getHttpServer())
      .post('/api/warehouse/in-stock/batch-delete')
      .set('Authorization', app.auth(adminToken))
      .send({ ids: [packageId], reason: '' })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('请填写删除原因'));

    await request(app.getHttpServer())
      .post('/api/warehouse/in-stock/batch-delete')
      .set('Authorization', app.auth(adminToken))
      .send({ ids: [packageId], reason: '超'.repeat(201) })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('删除原因不能超过 200 个字符'));

    await request(app.getHttpServer())
      .get('/api/warehouse/packages')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: packageId,
            customerCode: '9409',
            remark: '输入保护基线备注',
            manualException: '输入保护基线异常'
          })
        ]));
      });
  });

  it('preserves both delete endpoints success responses and persistence effects', async () => {
    const adminToken = await app.loginAs('admin');
    const authorization = app.auth(adminToken);
    const suffix = `${Date.now()}`;
    const createPackage = async (trackingNo: string) => request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', authorization)
      .send({
        customerCode: '9409',
        customerOrderNo: '9409',
        domesticTrackingNo: trackingNo,
        expectedTotalPackageCount: 1,
        packageIndex: 1,
        packageCount: 1,
        weightKg: 5,
        lengthCm: 40,
        widthCm: 30,
        heightCm: 20
      })
      .expect(201);

    const todayPackage = await createPackage(`RUNTIME-DELETE-TODAY-${suffix}`);
    const inStockPackage = await createPackage(`RUNTIME-DELETE-STOCK-${suffix}`);

    await request(app.getHttpServer())
      .post('/api/warehouse/today-receipts/batch-delete')
      .set('Authorization', authorization)
      .send({ ids: [todayPackage.body.id], reason: '运行时输入迁移前基线' })
      .expect(201)
      .expect({ deletedIds: [todayPackage.body.id], deletedCount: 1 });

    await request(app.getHttpServer())
      .post('/api/warehouse/in-stock/batch-delete')
      .set('Authorization', authorization)
      .send({ ids: [inStockPackage.body.id], reason: '运行时输入迁移前基线' })
      .expect(201)
      .expect({ deletedIds: [inStockPackage.body.id], deletedCount: 1 });

    await request(app.getHttpServer())
      .get('/api/warehouse/packages')
      .set('Authorization', authorization)
      .expect(200)
      .expect((response) => {
        expect(response.body).not.toEqual(expect.arrayContaining([
          expect.objectContaining({ id: todayPackage.body.id }),
          expect.objectContaining({ id: inStockPackage.body.id })
        ]));
      });
  });

  it('preserves legacy numeric-string coercion and ignores unknown update fields', async () => {
    const adminToken = await app.loginAs('admin');
    const authorization = app.auth(adminToken);
    const trackingNo = `RUNTIME-COERCE-${Date.now()}`;
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
        weightKg: 5,
        lengthCm: 40,
        widthCm: 30,
        heightCm: 20
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/warehouse/packages/${created.body.id}`)
      .set('Authorization', authorization)
      .send({
        customerCode: null,
        customerOrderNo: null,
        domesticTrackingNo: null,
        expectedTotalPackageCount: '4.9',
        packageIndex: '2.9',
        packageCount: '2.9',
        weightKg: '6.5',
        lengthCm: '50',
        widthCm: '40',
        heightCm: '30',
        ignoredLegacyField: 'must not leak'
      })
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          id: created.body.id,
          customerCode: '9409',
          customerOrderNo: '9409',
          domesticTrackingNo: trackingNo,
          expectedTotalPackageCount: 4,
          packageIndex: 2,
          packageCount: 2,
          weightKg: 6.5,
          lengthCm: 50,
          widthCm: 40,
          heightCm: 30
        }));
        expect(response.body).not.toHaveProperty('ignoredLegacyField');
      });
  });
});
