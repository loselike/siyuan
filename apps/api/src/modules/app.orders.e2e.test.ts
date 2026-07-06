import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { shipmentInput, warehousePackageInput } from './test-support/e2e-fixtures.js';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('Siyuan API orders', () => {
  const app = setupE2eApp();

  type TestAuditLogRow = {
    action: string;
    target: string;
    actorUsername: string;
    result: string;
    before?: unknown;
    after?: unknown;
    createdAt: string;
  };

  function expectAuditTrailRow(
    row: TestAuditLogRow | undefined,
    expected: { action: string; target: string; actorUsername?: string; result?: string; requiresBefore?: boolean; requiresAfter?: boolean }
  ) {
    expect(row).toEqual(expect.objectContaining({
      action: expected.action,
      target: expected.target,
      result: expected.result ?? 'SUCCESS',
      createdAt: expect.any(String)
    }));
    expect(Number.isNaN(Date.parse(row?.createdAt ?? ''))).toBe(false);
    if (expected.actorUsername) {
      expect(row?.actorUsername).toBe(expected.actorUsername);
    } else {
      expect(row?.actorUsername).toEqual(expect.any(String));
    }
    if (expected.requiresBefore) {
      expect(row?.before).toBeDefined();
    }
    if (expected.requiresAfter) {
      expect(row?.after).toBeDefined();
    }
  }

  it('authenticates staff and returns shipment data', async () => {
    const loginToken = await app.loginAs('admin');

    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(loginToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.length).toBeGreaterThan(1);
      });
  });

  it('returns a clear username or password error for failed login', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'operator', password: 'wrong-password' })
      .expect(401)
      .expect((response) => {
        expect(response.body.message).toBe('用户名或密码错误');
      });
    const adminToken = await app.loginAs('admin');
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=auth.login.failed')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows[0]).toEqual(expect.objectContaining({
          action: 'auth.login.failed',
          actorUsername: 'operator',
          result: 'FAILED'
        }));
      });
  });

  it('accepts 8 character staff passwords and rejects shorter passwords', async () => {
    const adminToken = await app.loginAs('admin');
    await request(app.getHttpServer())
      .post('/api/system/staff-accounts')
      .set('Authorization', app.auth(adminToken))
      .send({ username: 'pw8ok', password: 'Aa123@45', role: 'UG_BUSINESS' })
      .expect(201);
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=system.request.write')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows.some((row: TestAuditLogRow) => row.target === 'POST /api/system/staff-accounts')).toBe(true);
      });
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'pw8ok', password: 'Aa123@45' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/system/staff-accounts')
      .set('Authorization', app.auth(adminToken))
      .send({ username: 'pw7bad', password: 'Aa12@45', role: 'UG_BUSINESS' })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('密码长度需大于或等于 8 位');
      });
  });

  it('lets authenticated first-login users change password without workspace permission', async () => {
    const adminToken = await app.loginAs('admin');
    const role = await request(app.getHttpServer())
      .post('/api/system/roles')
      .set('Authorization', app.auth(adminToken))
      .send({ label: '无工作台改密组', templateRole: 'OPERATOR' })
      .expect(201);
    await request(app.getHttpServer())
      .put(`/api/system/roles/${role.body.key}/permissions`)
      .set('Authorization', app.auth(adminToken))
      .send({ permissions: ['pricing:lookup'] })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/system/staff-accounts')
      .set('Authorization', app.auth(adminToken))
      .send({ username: 'noperms-change', password: 'Oldpass@123', role: role.body.key })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'noperms-change', password: 'Oldpass@123' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/change-password')
      .set('Authorization', app.auth(login.body.accessToken))
      .send({ currentPassword: 'Oldpass@123', newPassword: 'Newpass@123' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual({ ok: true });
      });
  });

  it('scopes operator shipment data to owned customers while warehouse can see all sales ownership', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');
    const financeToken = await app.loginAs('finance');
    const serviceToken = await app.loginAs('service');
    const warehouseToken = await app.loginAs('warehouse');

    await request(app.getHttpServer())
      .put('/api/system/staff-accounts/u-op/site')
      .set('Authorization', app.auth(adminToken))
      .send({ site: '深圳思远' })
      .expect(200);

    const operatorShipments = await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(operatorToken))
      .expect(200);
    const warehouseShipments = await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(warehouseToken))
      .expect(200);

    expect(operatorShipments.body.length).toBeGreaterThan(0);
    expect(operatorShipments.body.every((shipment: { salesperson?: string }) => shipment.salesperson === 'operator')).toBe(true);
    expect(operatorShipments.body.every((shipment: { site?: string }) => shipment.site === '深圳思远')).toBe(true);
    expect(warehouseShipments.body.length).toBeGreaterThan(operatorShipments.body.length);
    expect(warehouseShipments.body).toEqual(expect.arrayContaining([expect.objectContaining({ salesperson: 'jylannie' })]));
  });

  it('prevents operators from updating shipments outside their customer scope by id', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');

    const outsideScopeShipment = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(adminToken))
      .send(shipmentInput({
        customerId: 'c-1344',
        customerOrderNo: 'OPERATOR-IDOR-001'
      }))
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/shipments/${outsideScopeShipment.body.id}/operational`)
      .set('Authorization', app.auth(operatorToken))
      .send({ latestTracking: '业务员越权修改' })
      .expect(404);
  });

  it('lets business role groups create order entries only for owned customers', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');
    const financeToken = await app.loginAs('finance');
    const serviceToken = await app.loginAs('service');
    const suffix = Date.now();

    const ownedPackage = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(adminToken))
      .send(warehousePackageInput({ customerCode: '9409', customerOrderNo: `UG-OWN-${suffix}`, domesticTrackingNo: `KYUGOWN${suffix}` }))
      .expect(201);
    const otherPackage = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(adminToken))
      .send(warehousePackageInput({ customerCode: '1344', customerOrderNo: `UG-OTHER-${suffix}`, domesticTrackingNo: `KYUGOTH${suffix}` }))
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/shipments/order-entry/packages')
      .set('Authorization', app.auth(operatorToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: ownedPackage.body.id })]));
        expect(response.body).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: otherPackage.body.id })]));
      });

    const baseShipment = {
      customerOrderNo: `UG-ENTRY-${suffix}`,
      systemOrderNo: `SYUG${suffix}`,
      businessType: 'EXPRESS',
      packageType: 'WPX',
      destinationCountry: '美国',
      channelId: 'ch-dhl-hk',
      declarationRequired: false,
      cargoType: '普货',
      productName: '业务部测试货物',
      settlementMethod: 'RMB月结'
    };

    await request(app.getHttpServer())
      .post('/api/shipments/order-entry')
      .set('Authorization', app.auth(operatorToken))
      .send({
        shipment: { ...baseShipment, customerCode: '1344' },
        warehousePackageIds: [otherPackage.body.id],
        receivables: [{ type: 'RECEIVABLE', name: '客户运费', amount: 100, currency: 'RMB' }],
        businessCosts: [{ type: 'BUSINESS_COST', name: '业务成本', amount: 80, currency: 'RMB' }],
        submitForReview: true
      })
      .expect(403);

    const createdEntry = await request(app.getHttpServer())
      .post('/api/shipments/order-entry')
      .set('Authorization', app.auth(operatorToken))
      .send({
        shipment: { ...baseShipment, customerCode: '9409' },
        warehousePackageIds: [ownedPackage.body.id],
        receivables: [{ type: 'RECEIVABLE', name: '客户运费', amount: 100, currency: 'RMB' }],
        businessCosts: [{ type: 'BUSINESS_COST', name: '业务成本', amount: 80, currency: 'RMB' }],
        payables: [{ type: 'PAYABLE', name: '出货成本', chargeWeightKg: 10, unitPrice: 9, currency: 'RMB' }],
        submitForReview: true
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.shipment).toEqual(expect.objectContaining({ salesperson: 'operator', entryBy: 'operator' }));
        expect(response.body.receivables).toEqual(expect.arrayContaining([expect.objectContaining({ salesperson: 'operator' })]));
        expect(response.body.businessCosts).toEqual(expect.arrayContaining([expect.objectContaining({ salesperson: 'operator' })]));
        expect(response.body.payables).toEqual(expect.arrayContaining([expect.objectContaining({ name: '出货成本', amount: 90, reconciliationStatus: 'PENDING' })]));
      });
    const businessPayable = createdEntry.body.payables.find((row: { name: string }) => row.name === '出货成本');

    await request(app.getHttpServer())
      .post(`/api/shipments/${createdEntry.body.shipment.id}/review/approve`)
      .set('Authorization', app.auth(adminToken))
      .expect(403)
      .expect((response) => {
        expect(response.body.message).toContain('当前角色不能终审运单');
      });

    await request(app.getHttpServer())
      .get('/api/shipments/review-pending')
      .set('Authorization', app.auth(operatorToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: createdEntry.body.shipment.id, salesperson: 'operator' })]));
      });

    await request(app.getHttpServer())
      .post(`/api/shipments/${createdEntry.body.shipment.id}/review/approve`)
      .set('Authorization', app.auth(operatorToken))
      .expect(201)
      .expect((response) => {
        expect(response.body.shipment).toEqual(expect.objectContaining({
          status: 'WAITING_SORT',
          businessReviewedBy: 'operator',
          businessReviewedAt: expect.any(String)
        }));
      });

    await request(app.getHttpServer())
      .get('/api/shipments/review-pending')
      .set('Authorization', app.auth(operatorToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: createdEntry.body.shipment.id })]));
      });

    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(financeToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([
          expect.objectContaining({ id: createdEntry.body.shipment.id, status: 'WAITING_SORT' })
        ]));
      });

    await request(app.getHttpServer())
      .get(`/api/finance/business-cost-audits?systemOrderNo=${createdEntry.body.shipment.systemOrderNo}`)
      .set('Authorization', app.auth(financeToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ shipmentId: createdEntry.body.shipment.id, systemOrderNo: createdEntry.body.shipment.systemOrderNo })
        ]));
      });

    await request(app.getHttpServer())
      .post(`/api/shipments/${createdEntry.body.shipment.id}/review/approve`)
      .set('Authorization', app.auth(financeToken))
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('只有待审核运单可以审核通过');
      });

    await request(app.getHttpServer())
      .get(`/api/finance/payable-audits?systemOrderNo=${createdEntry.body.shipment.systemOrderNo}`)
      .set('Authorization', app.auth(financeToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: businessPayable.id })]));
      });

    await request(app.getHttpServer())
      .post(`/api/finance/payable-audits/${businessPayable.id}/audit`)
      .set('Authorization', app.auth(financeToken))
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('客服确认数据后才能审核该应付费用');
      });
    await request(app.getHttpServer())
      .post(`/api/finance/payable-audits/${businessPayable.id}/audit`)
      .set('Authorization', app.auth(operatorToken))
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/shipments/${createdEntry.body.shipment.id}/business-data/approve`)
      .set('Authorization', app.auth(serviceToken))
      .send({})
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('排货后才能审核业务数据');
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=shipment.order_entry.submit')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        const rows = response.body.rows as TestAuditLogRow[];
        const row = rows.find((item) => item.action === 'shipment.order_entry.submit' && item.target === createdEntry.body.shipment.id);
        expectAuditTrailRow(row, {
          action: 'shipment.order_entry.submit',
          target: createdEntry.body.shipment.id,
          actorUsername: 'operator',
          requiresAfter: true
        });
        expect(row?.after).toEqual(expect.objectContaining({ salesperson: 'operator', entryBy: 'operator' }));
      });
  });

  it('lets admins run business review from the business workbench without taking finance final review', async () => {
    const adminToken = await app.loginAs('admin');
    const suffix = Date.now();
    const pkg = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(adminToken))
      .send(warehousePackageInput({ customerCode: '9409', customerOrderNo: `ADMIN-BIZ-${suffix}`, domesticTrackingNo: `KYADMINBIZ${suffix}` }))
      .expect(201);

    const created = await request(app.getHttpServer())
      .post('/api/shipments/order-entry')
      .set('Authorization', app.auth(adminToken))
      .send({
        shipment: {
          customerCode: '9409',
          customerOrderNo: `ADMIN-BIZ-${suffix}`,
          systemOrderNo: `SYADMINBIZ${suffix}`,
          businessType: 'EXPRESS',
          packageType: 'WPX',
          destinationCountry: '美国',
          channelId: 'ch-dhl-hk',
          declarationRequired: false,
          cargoType: '普货',
          productName: '管理员业务审核测试货物',
          settlementMethod: 'RMB月结'
        },
        warehousePackageIds: [pkg.body.id],
        receivables: [{ type: 'RECEIVABLE', name: '客户运费', amount: 100, currency: 'RMB' }],
        businessCosts: [{ type: 'BUSINESS_COST', name: '业务成本', amount: 80, currency: 'RMB' }],
        submitForReview: true
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.shipment.id}/review/approve`)
      .set('Authorization', app.auth(adminToken))
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.shipment.id}/review/approve`)
      .set('Authorization', app.auth(adminToken))
      .send({ businessReview: true })
      .expect(201)
      .expect((response) => {
        expect(response.body.shipment).toEqual(expect.objectContaining({
          status: 'WAITING_SORT',
          businessReviewedBy: 'admin',
          businessReviewedAt: expect.any(String)
        }));
      });
  });

  it('soft deletes shipments so they no longer return from the workspace list', async () => {
    const loginToken = await app.loginAs('admin');
    const token = loginToken;

    const created = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(token))
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'DELETE-PERSIST-001',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 2,
        agentWeightKg: 2,
        channelId: 'ch-dhl-hk'
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/shipments/${created.body.id}`)
      .set('Authorization', app.auth(token))
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body).not.toEqual(
          expect.arrayContaining([expect.objectContaining({ id: created.body.id })])
        );
      });
  });

  it('enforces review-pending detail validation and reject reason requirements', async () => {
    const loginToken = await app.loginAs('admin');
    const financeToken = await app.loginAs('finance');
    const token = loginToken;

    const created = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(token))
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'REVIEW-PENDING-001',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 2,
        agentWeightKg: 2,
        channelId: 'ch-dhl-hk',
        initialStatus: 'REVIEW_PENDING'
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/shipments/review-pending')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: created.body.id })]));
      });

    await request(app.getHttpServer())
      .get(`/api/shipments/${created.body.id}/review-detail`)
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.shipment.status).toBe('REVIEW_PENDING');
        expect(response.body.approvalWarnings).toEqual(expect.arrayContaining(['产品名称缺失', '应收费用缺失', '业务成本缺失']));
      });

    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/review/approve`)
      .set('Authorization', app.auth(token))
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/review/reject`)
      .set('Authorization', app.auth(financeToken))
      .send({ reason: '' })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/review/reject`)
      .set('Authorization', app.auth(financeToken))
      .send({ reason: '费用资料不完整' })
      .expect(201)
      .expect((response) => {
        expect(response.body.shipment.status).toBe('REVIEW_REJECTED');
        expect(response.body.shipment.reviewedBy).toBe('finance');
        expect(response.body.shipment.reviewedAt).toBeTruthy();
        expect(response.body.shipment.reviewRejectedReason).toBe('费用资料不完整');
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=shipment.review.reject')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'shipment.review.reject',
            target: created.body.id,
            after: expect.objectContaining({
              reviewStatus: 'REJECTED',
              statusFrom: 'REVIEW_PENDING',
              statusTo: 'REVIEW_REJECTED',
              reviewer: 'finance',
              reviewedBy: 'finance',
              reviewedAt: expect.any(String),
              rejectReason: '费用资料不完整',
              receivableTotal: 0,
              businessCostTotal: 0,
              payableTotal: 0,
              approvalWarnings: expect.arrayContaining(['产品名称缺失', '应收费用缺失', '业务成本缺失'])
            })
          })
        ]));
      });
  });

  it('keeps review-deleted shipments recoverable while restricting permanent deletion to admins', async () => {
    const adminToken = await app.loginAs('admin');
    const financeToken = await app.loginAs('finance');
    const operatorToken = await app.loginAs('operator');

    const created = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'REVIEW-DELETE-001',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 2,
        agentWeightKg: 2,
        channelId: 'ch-dhl-hk',
        initialStatus: 'REVIEW_PENDING'
      })
      .expect(201);
    const createdId = created.body.id as string;
    expect(createdId).toBeTruthy();

    await request(app.getHttpServer())
      .get('/api/shipments/review-pending')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: createdId })]));
      });

    await request(app.getHttpServer())
      .get(`/api/shipments/${createdId}/review-detail`)
      .set('Authorization', app.auth(adminToken))
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/shipments/${createdId}/review`)
      .set('Authorization', app.auth(adminToken))
      .send({ reason: '测试删除恢复' })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=shipment.review.delete')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'shipment.review.delete',
            target: createdId,
            after: expect.objectContaining({
              reviewStatus: 'DELETED',
              statusFrom: 'REVIEW_PENDING',
              statusTo: 'REVIEW_PENDING',
              reviewer: 'admin',
              deleteReason: '测试删除恢复'
            })
          })
        ]));
      });

    await request(app.getHttpServer())
      .get('/api/shipments/review-deleted')
      .set('Authorization', app.auth(operatorToken))
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/shipments/review-deleted')
      .set('Authorization', app.auth(financeToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: createdId, deleteType: 'MANUAL' })]));
      });

    await request(app.getHttpServer())
      .post(`/api/shipments/${createdId}/restore`)
      .set('Authorization', app.auth(financeToken))
      .send({ mode: 'MANUAL_TIME', manualCreatedAt: '2026-06-20T09:30:00.000Z', reason: '恢复验证' })
      .expect(201)
      .expect((response) => {
        expect(response.body.shipment.deletedAt).toBeUndefined();
        expect(response.body.shipment.restoreMode).toBe('MANUAL_TIME');
        expect(response.body.shipment.createdAt).toBe('2026-06-20T09:30:00.000Z');
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=shipment.restore')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'shipment.restore',
            target: createdId,
            after: expect.objectContaining({
              reviewStatus: 'RESTORED',
              statusFrom: 'REVIEW_PENDING',
              statusTo: 'REVIEW_PENDING',
              reviewer: 'finance',
              restoreReason: '恢复验证'
            })
          })
        ]));
      });

    await request(app.getHttpServer())
      .delete(`/api/shipments/${createdId}/review`)
      .set('Authorization', app.auth(adminToken))
      .send({ reason: '测试彻底删除' })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/shipments/${createdId}/review/permanent`)
      .set('Authorization', app.auth(financeToken))
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/api/shipments/${createdId}/review/permanent`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({ id: createdId, deleted: true });
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=shipment.review.purge')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'shipment.review.purge',
            target: createdId
          })
        ]));
      });
  });

  it('lets admins edit role permissions and applies the saved matrix to RBAC checks', async () => {
    const adminToken = await app.loginAs('admin');

    await request(app.getHttpServer())
      .get('/api/system/roles')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.roles).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              key: 'ADMIN',
              account: 'admin',
              permissions: expect.arrayContaining(['system:manage', 'finance:settle', 'pricing:manage'])
            }),
            expect.objectContaining({ key: 'CUSTOMER_SERVICE', account: 'service' }),
            expect.objectContaining({ key: 'OPERATOR', label: '业务员', account: 'operator' }),
            expect.objectContaining({ key: 'WAREHOUSE', label: '仓库', account: 'warehouse' }),
            expect.objectContaining({ key: 'UG_WAREHOUSE_RECEIVE', label: '仓库收货', site: '深圳思远', systemBuiltin: false }),
            expect.objectContaining({ key: 'UG_BUSINESS_SUPERVISOR', label: '业务主管', systemBuiltin: false })
          ])
        );
        expect(JSON.stringify(response.body)).not.toContain('admin123');
        expect(JSON.stringify(response.body)).not.toContain('service123');
      });

    const financeToken = await app.loginAs('finance');

    await request(app.getHttpServer())
      .put('/api/system/roles/OPERATOR/permissions')
      .set('Authorization', app.auth(financeToken))
      .send({ permissions: ['orders:read'] })
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/system/roles')
      .set('Authorization', app.auth(financeToken))
      .send({ label: '非授权用户组', templateRole: 'OPERATOR' })
      .expect(403);

    let createdRole = '';
    await request(app.getHttpServer())
      .post('/api/system/roles')
      .set('Authorization', app.auth(adminToken))
      .send({ label: 'A5测试用户组', description: '测试说明', site: '深圳思远', sortOrder: 30, templateRole: 'WAREHOUSE' })
      .expect(201)
      .expect((response) => {
        createdRole = response.body.key;
        expect(response.body).toEqual(expect.objectContaining({ label: 'A5测试用户组', site: '深圳思远', enabled: true, systemBuiltin: false }));
        expect(response.body.permissions).toEqual(expect.arrayContaining(['warehouse:read', 'warehouse:write']));
      });

    await request(app.getHttpServer())
      .put(`/api/system/roles/${createdRole}`)
      .set('Authorization', app.auth(adminToken))
      .send({ label: 'A5测试用户组改', description: '测试说明改', site: '深圳思远', sortOrder: 31, enabled: true })
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({ key: createdRole, label: 'A5测试用户组改', description: '测试说明改', sortOrder: 31 }));
      });

    await request(app.getHttpServer())
      .put(`/api/system/roles/${createdRole}/permissions`)
      .set('Authorization', app.auth(adminToken))
      .send({ permissions: ['workspace:access', 'warehouse:read'] })
      .expect(200)
      .expect((response) => {
        expect(response.body.permissions).toEqual(['workspace:access', 'warehouse:read']);
      });

    await request(app.getHttpServer())
      .put(`/api/system/roles/${createdRole}/enabled`)
      .set('Authorization', app.auth(adminToken))
      .send({ enabled: false })
      .expect(200)
      .expect((response) => {
        expect(response.body.enabled).toBe(false);
      });

    await request(app.getHttpServer())
      .put('/api/system/roles/UG_CUSTOMER_SERVICE/permissions')
      .set('Authorization', app.auth(adminToken))
      .send({ permissions: ['orders:read', 'pricing:lookup', 'master-data:read'] })
      .expect(200)
      .expect((response) => {
        expect(response.body.permissions).toEqual(['orders:read', 'pricing:lookup', 'master-data:read']);
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=system.role')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ action: 'system.role.create', target: `role:${createdRole}` }),
            expect.objectContaining({ action: 'system.role.update', target: `role:${createdRole}` }),
            expect.objectContaining({ action: 'system.role.enabled', target: `role:${createdRole}` }),
            expect.objectContaining({ action: 'system.role_permissions.update', target: `role:${createdRole}` })
          ])
        );
      });

    const serviceToken = await app.loginAs('service');

    await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(serviceToken))
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'CS-NO-WRITE',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 2,
        agentWeightKg: 2,
        channelId: 'ch-dhl-hk'
      })
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=system.role_permissions.update')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'system.role_permissions.update',
            target: 'role:UG_CUSTOMER_SERVICE',
            after: ['orders:read', 'pricing:lookup', 'master-data:read']
          })
        ]));
      });

    await request(app.getHttpServer())
      .put('/api/system/roles/UG_CUSTOMER_SERVICE/permissions')
      .set('Authorization', app.auth(adminToken))
      .send({ permissions: ['workspace:access', 'orders:read', 'orders:write', 'tracking:read', 'tracking:write', 'problems:read', 'problems:write', 'pricing:lookup', 'master-data:read'] })
      .expect(200);
  });

  it('lets a customer create a declared shipment that staff can see in the receiving queue', async () => {
    const customerToken = await app.loginAs('customer');

    const created = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(customerToken))
      .send({
        customerOrderNo: 'CUST-NEW-001',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 2.4,
        agentWeightKg: 2.4,
        channelId: 'ch-dhl-hk'
      })
      .expect(201);

    expect(created.body.status).toBe('DRAFT');
    expect(created.body.customerName).toContain('9409');

    const adminToken = await app.loginAs('admin');

    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.some((shipment: { customerOrderNo: string }) => shipment.customerOrderNo === 'CUST-NEW-001')).toBe(
          true
        );
      });
  });

  it('lets staff create a draft outbound shipment that persists after reload', async () => {
    const adminToken = await app.loginAs('admin');
    const token = adminToken;

    await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(token))
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'OUT-PERSIST-001',
        systemOrderNo: 'SYOUTPERSIST001',
        transferNo: 'DHL-PERSIST-001',
        businessType: 'DEDICATED_LINE',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 18,
        agentWeightKg: 18,
        channelId: 'ch-dhl-hk',
        initialStatus: 'DRAFT',
        latestTracking: '新建出货订单，待审核'
      })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('新建运单不能填写转单号');
      });

    const created = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(token))
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'OUT-PERSIST-001',
        systemOrderNo: 'SYOUTPERSIST001',
        businessType: 'DEDICATED_LINE',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 18,
        agentWeightKg: 18,
        channelId: 'ch-dhl-hk',
        initialStatus: 'DRAFT',
        latestTracking: '新建出货订单，待审核'
      })
      .expect(201);

    expect(created.body.status).toBe('DRAFT');
    expect(created.body.systemOrderNo).toBe('SYOUTPERSIST001');
    expect(created.body.transferNo).toBeUndefined();
    expect(created.body.latestTracking).toBe('新建出货订单，待审核');

    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(
          response.body.some(
            (shipment: { customerOrderNo: string; status: string; systemOrderNo: string }) =>
              shipment.customerOrderNo === 'OUT-PERSIST-001' &&
              shipment.status === 'DRAFT' &&
              shipment.systemOrderNo === 'SYOUTPERSIST001'
          )
        ).toBe(true);
      });
  });

  it('imports valid shipment rows and returns row-level errors', async () => {
    const loginToken = await app.loginAs('admin');

    await request(app.getHttpServer())
      .post('/api/shipments/import')
      .set('Authorization', app.auth(loginToken))
      .send({
        customerId: 'c-9409',
        rows: [
          { customerOrderNo: 'IMP-001', destinationCountry: '美国', weightKg: 2.4, channelName: 'DHL HK' },
          { customerOrderNo: 'IMP-001', destinationCountry: '德国', weightKg: 1.2, channelName: 'DHL HK' },
          { customerOrderNo: 'IMP-003', destinationCountry: '', weightKg: -1, channelName: '' }
        ]
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.created).toHaveLength(1);
        expect(response.body.errors).toEqual([
          { rowNumber: 2, field: 'customerOrderNo', message: '客户单号重复' },
          { rowNumber: 3, field: 'destinationCountry', message: '目的地国家不能为空' },
          { rowNumber: 3, field: 'weightKg', message: '重量必须大于 0' },
          { rowNumber: 3, field: 'channelName', message: '渠道不能为空' }
        ]);
      });
  });

  it('keeps warehouse receive out of the review-approved waiting-sort pool', async () => {
    const adminToken = await app.loginAs('admin');
    const warehouseToken = await app.loginAs('warehouse');

    await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(adminToken))
      .send(shipmentInput({
        customerOrderNo: 'CREATE-DIRECT-SORT-001',
        initialStatus: 'WAITING_SORT'
      }))
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(adminToken))
      .send(shipmentInput({
        customerOrderNo: 'CREATE-DIRECT-OUT-001',
        initialStatus: 'OUTBOUNDED'
      }))
      .expect(400);

    const declared = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(adminToken))
      .send(shipmentInput({
        customerId: 'c-9409',
        customerOrderNo: 'RECEIVE-NO-REVIEW-001',
        initialStatus: 'DECLARED'
      }))
      .expect(201);
    expect(declared.body.status).toBe('DECLARED');

    const received = await request(app.getHttpServer())
      .post(`/api/shipments/${declared.body.id}/receive`)
      .set('Authorization', app.auth(warehouseToken))
      .expect(201);
    expect(received.body.status).toBe('WAITING_RECEIVE');
    expect(received.body.reviewedBy).toBeUndefined();
    expect(received.body.reviewedAt).toBeUndefined();

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=shipment.receive')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              action: 'shipment.receive',
              target: declared.body.id
            })
          ])
        );
      });

    await request(app.getHttpServer())
      .post(`/api/shipments/${declared.body.id}/receive`)
      .set('Authorization', app.auth(warehouseToken))
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/shipments/${declared.body.id}/route`)
      .set('Authorization', app.auth(adminToken))
      .send({ channelId: 'ch-dhl-hk', agentId: 'a-yuhuan' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/shipments/s-seed-1/route')
      .set('Authorization', app.auth(adminToken))
      .send({ channelId: 'ch-dhl-hk', agentId: 'a-yuhuan' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/shipments/s-seed-3/route')
      .set('Authorization', app.auth(adminToken))
      .send({ channelId: 'ch-dhl-hk', agentId: 'a-yuhuan', agentChannelName: '宇环 DHL', chargeWeightKg: 12.5, unitPrice: 8, currency: 'RMB' })
      .expect(201)
      .expect((response) => {
        expect(response.body.status).toBe('WAITING_DISPATCH');
        expect(response.body.reviewedAt).toBeUndefined();
        expect(response.body.reviewedBy).toBeUndefined();
      });

    await request(app.getHttpServer())
      .post('/api/shipments/s-seed-4/dispatch')
      .set('Authorization', app.auth(adminToken))
      .send({})
      .expect(400);

    await request(app.getHttpServer())
      .patch('/api/shipments/s-seed-6/operational')
      .set('Authorization', app.auth(adminToken))
      .send({ status: 'ARRIVED_PORT', latestTracking: '历史到港但缺转单号' })
      .expect(200);

    await request(app.getHttpServer())
      .patch('/api/shipments/s-seed-6/operational')
      .set('Authorization', app.auth(adminToken))
      .send({ status: 'SIGNED', latestTracking: '缺转单号签收' })
      .expect(400);
  });

  it('moves shipments through audit, routing, warehouse outbound, business data, departure, arrival, delivery, and signature', async () => {
    const loginToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');
    const warehouseToken = await app.loginAs('warehouse');
    const serviceToken = await app.loginAs('service');
    const marketToken = await app.loginAs('R-market');
    const token = loginToken;

    await request(app.getHttpServer())
      .put('/api/system/roles/CUSTOMER_SERVICE/permissions')
      .set('Authorization', app.auth(token))
      .send({ permissions: ['workspace:access', 'orders:read', 'orders:write', 'tracking:read', 'tracking:write', 'problems:read', 'problems:write', 'pricing:lookup', 'master-data:read', 'customer_service:signature:confirm'] })
      .expect(200);
    await request(app.getHttpServer())
      .put('/api/system/roles/UG_CUSTOMER_SERVICE/permissions')
      .set('Authorization', app.auth(token))
      .send({ permissions: ['workspace:access', 'orders:read', 'orders:write', 'tracking:read', 'tracking:write', 'problems:read', 'problems:write', 'pricing:lookup', 'master-data:read', 'customer_service:signature:confirm'] })
      .expect(200);
    await request(app.getHttpServer())
      .put('/api/system/roles/FINANCE/permissions')
      .set('Authorization', app.auth(token))
      .send({ permissions: ['workspace:access', 'orders:read', 'finance:settle', 'finance:read', 'finance:order-fee:payable:view', 'finance:payable:paid-read', 'finance:payable:paid-bank-view', 'finance:payable:view-sensitive', 'tracking:read'] })
      .expect(200);
    await request(app.getHttpServer())
      .put('/api/system/roles/UG_FINANCE/permissions')
      .set('Authorization', app.auth(token))
      .send({ permissions: ['workspace:access', 'orders:read', 'finance:settle', 'finance:read', 'finance:order-fee:payable:view', 'finance:payable:paid-read', 'finance:payable:paid-bank-view', 'finance:payable:view-sensitive', 'tracking:read'] })
      .expect(200);
    const financeToken = await app.loginAs('finance');

    const warehousePackage = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(token))
      .send(warehousePackageInput({
        customerOrderNo: 'FLOW001',
        domesticTrackingNo: 'KYFLOW001'
      }))
      .expect(201);
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=warehouse.package.create')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        const rows = response.body.rows as TestAuditLogRow[];
        expectAuditTrailRow(rows.find((row) => row.action === 'warehouse.package.create' && row.target === warehousePackage.body.id), {
          action: 'warehouse.package.create',
          target: warehousePackage.body.id,
          actorUsername: 'admin',
          requiresAfter: true
        });
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ action: 'warehouse.package.create', target: warehousePackage.body.id })
        ]));
      });

    const orderEntry = await request(app.getHttpServer())
      .post('/api/shipments/order-entry')
      .set('Authorization', app.auth(token))
      .send({
        shipment: {
          customerCode: '9409',
          customerOrderNo: 'FLOW-001',
          systemOrderNo: 'SYFLOW001',
          businessType: 'EXPRESS',
          packageType: 'WPX',
          destinationCountry: '加拿大',
          channelId: 'ch-dhl-hk',
          declarationRequired: false,
          cargoType: '普货',
          productName: 'FLOW 产品',
          settlementMethod: '思远阿里'
        },
        warehousePackageIds: [warehousePackage.body.id],
        receivables: [{ type: 'RECEIVABLE', name: '客户运费', amount: 120, currency: 'RMB', settlementMethod: '思远阿里' }],
        businessCosts: [{ type: 'BUSINESS_COST', name: '业务成本', amount: 80, currency: 'RMB', agentName: '业务供应商' }],
        submitForReview: true
      })
      .expect(201);
    const created = { body: orderEntry.body.shipment };
    const receivable = { body: orderEntry.body.receivables[0] };
    expect(created.body.status).toBe('REVIEW_PENDING');

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=shipment.order_entry.submit')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        const rows = response.body.rows as TestAuditLogRow[];
        expectAuditTrailRow(rows.find((row) => row.action === 'shipment.order_entry.submit' && row.target === created.body.id), {
          action: 'shipment.order_entry.submit',
          target: created.body.id,
          actorUsername: 'admin',
          requiresAfter: true
        });
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ action: 'shipment.order_entry.submit', target: created.body.id })
        ]));
      });

    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/payment`)
      .set('Authorization', app.auth(token))
      .send({ paymentAmountUsd: 18, paymentAmountCny: 130.5, paymentMethod: '对公' })
      .expect(201);
    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(warehouseToken))
      .expect(200)
      .expect((response) => {
        const row = response.body.find((shipment: { id: string }) => shipment.id === created.body.id);
        const bodyText = JSON.stringify(row);
        expect(row).toBeTruthy();
        expect(row).not.toHaveProperty('paymentAmountUsd');
        expect(row).not.toHaveProperty('paymentAmountCny');
        expect(row).not.toHaveProperty('paymentMethod');
        expect(row).not.toHaveProperty('receivableTotal');
        expect(row).not.toHaveProperty('payableTotal');
        expect(row).not.toHaveProperty('grossProfit');
        expect(bodyText).not.toContain('FLOW-PAYER-001');
        expect(bodyText).not.toContain('代理运费');
      });

    await request(app.getHttpServer())
      .get('/api/warehouse/packages')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: warehousePackage.body.id, status: 'RECEIVED' })
          ])
        );
      });

    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/dispatch`)
      .set('Authorization', app.auth(token))
      .send({ transferNo: 'BAD-JUMP' })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/api/shipments/${created.body.id}/operational`)
      .set('Authorization', app.auth(token))
      .send({ status: 'WAITING_SORT', latestTracking: '审核通过，等待渠道排货' })
      .expect(400);

    const reviewed = await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/review/approve`)
      .set('Authorization', app.auth(token))
      .send({ businessReview: true })
      .expect(201);
    expect(reviewed.body.shipment.status).toBe('WAITING_SORT');
    expect(reviewed.body.shipment.businessReviewedBy).toBe('admin');
    expect(reviewed.body.shipment.businessReviewedAt).toBeTruthy();

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=shipment.review.business_approve')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'shipment.review.business_approve',
            target: created.body.id,
            after: expect.objectContaining({
              reviewStatus: 'BUSINESS_APPROVED',
              statusFrom: 'REVIEW_PENDING',
              statusTo: 'WAITING_SORT',
              businessReviewer: 'admin',
              businessReviewedBy: 'admin',
              businessReviewedAt: expect.any(String),
              receivableTotal: 120,
              businessCostTotal: 80,
              approvalWarnings: []
            })
          })
        ]));
      });

    const routed = await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/route`)
      .set('Authorization', app.auth(operatorToken))
      .send({ channelId: 'ch-ups-ca', agentId: 'a-canada', agentChannelName: '加美 UPS 自动沉淀', chargeWeightKg: 12.5, unitPrice: 8, otherFee: 5, otherFeeRemark: '偏远费', currency: 'RMB' })
      .expect(201);
    expect(routed.body.status).toBe('WAITING_DISPATCH');
    expect(routed.body.routeOtherFee).toBe(5);
    expect(routed.body.routeCostTotal).toBe(105);

    const routeFinanceDetail = await request(app.getHttpServer())
      .get(`/api/shipments/${created.body.id}/finance-detail`)
      .set('Authorization', app.auth(token))
      .expect(200);
    const routePayable = routeFinanceDetail.body.payables.find((row: { name: string }) => row.name === '代理成本');
    expect(routePayable).toEqual(expect.objectContaining({ amount: 105 }));
    await request(app.getHttpServer())
      .get(`/api/finance/payable-audits?systemOrderNo=${created.body.systemOrderNo}`)
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ id: routePayable.id, name: '代理成本', amount: 105 })
        ]));
      });
    await request(app.getHttpServer())
      .post(`/api/finance/payable-audits/${routePayable.id}/audit`)
      .set('Authorization', app.auth(token))
      .expect(201)
      .expect((response) => {
        expect(response.body.reconciliationStatus).toBe('CONFIRMED');
      });

    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(warehouseToken))
      .expect(200)
      .expect((response) => {
        const row = response.body.find((shipment: { id: string }) => shipment.id === created.body.id);
        expect(row).toBeTruthy();
        expect(row).not.toHaveProperty('routeChargeWeightKg');
        expect(row).not.toHaveProperty('routeUnitPrice');
        expect(row).not.toHaveProperty('routeOtherFee');
        expect(row).not.toHaveProperty('routeCostTotal');
        expect(row).not.toHaveProperty('routeCurrency');
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=shipment.route')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              action: 'shipment.route',
              target: created.body.id,
              after: expect.objectContaining({
                routeStatus: 'WAITING_DISPATCH',
                statusFrom: 'WAITING_SORT',
                statusTo: 'WAITING_DISPATCH',
                companyChannelId: 'ch-ups-ca',
                companyChannelName: 'UPS 加美线',
                agentId: 'a-canada',
                realAgentName: '深圳加美代理',
                agentChannelName: '加美 UPS 自动沉淀',
                chargeWeightKg: 12.5,
                unitPrice: 8,
                otherFee: 5,
                otherFeeRemark: '偏远费',
                currency: 'RMB',
                payableTotal: 105,
                routedBy: 'operator',
                routedAt: expect.any(String)
              })
            })
          ])
        );
      });

    const dispatched = await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/dispatch`)
      .set('Authorization', app.auth(warehouseToken))
      .send({})
      .expect(201);
    expect(dispatched.body.status).toBe('OUTBOUNDED');
    expect(dispatched.body.outboundAt).toBeTruthy();
    expect(dispatched.body.latestTracking).toBe('仓库已出库，等待客服补齐转单号');

    await request(app.getHttpServer())
      .get(`/api/finance/payable-audits?systemOrderNo=${created.body.systemOrderNo}`)
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ id: routePayable.id, name: '代理成本', amount: 105 })
        ]));
      });

    await request(app.getHttpServer())
      .get('/api/warehouse/packages')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: warehousePackage.body.id, status: 'SHIPPED' })
          ])
        );
      });
    await request(app.getHttpServer())
      .get('/api/warehouse/in-stock')
      .query({ combinedOrderNo: warehousePackage.body.combinedOrderNo })
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows.some((row: { id: string }) => row.id === warehousePackage.body.id)).toBe(false);
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=shipment.dispatch')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              action: 'shipment.dispatch',
              target: created.body.id,
              after: expect.objectContaining({
                statusFrom: 'WAITING_DISPATCH',
                statusTo: 'OUTBOUNDED',
                handoverNo: `HD-${created.body.systemOrderNo}`,
                channelName: 'UPS 加美线',
                agentName: '深圳加美代理',
                packageCount: 1,
                chargeableWeightKg: 2,
                waitingDispatchAt: expect.any(String),
                outboundBy: 'warehouse',
                outboundAt: expect.any(String),
                customerServiceReceiveStatus: 'PENDING_CONFIRMATION',
                warehousePackageIds: expect.arrayContaining([warehousePackage.body.id]),
                warehousePackageStatusTo: 'SHIPPED'
              })
            })
          ])
        );
      });

    await request(app.getHttpServer())
      .patch(`/api/shipments/${created.body.id}/operational`)
      .set('Authorization', app.auth(serviceToken))
      .send({ transferNo: '1Z999', latestTracking: '客服尝试跳过双审核填转单号' })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('业务数据确认后才能填写转单号');
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=workflow.guard_denied')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'workflow.guard_denied',
            target: created.body.id,
            actorUsername: 'service',
            after: expect.objectContaining({
              guard: 'transferNo.requires_data_approval',
              missing: ['business_data']
            })
          })
        ]));
      });

    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/business-data/approve`)
      .set('Authorization', app.auth(operatorToken))
      .send({ remark: '业务员不能代替客服审核' })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/business-data/approve`)
      .set('Authorization', app.auth(serviceToken))
      .send({ remark: '业务数据已核对' })
      .expect(201)
      .expect((response) => {
        expect(response.body.status).toBe('OUTBOUNDED');
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=customer_service.business_data.approved')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'customer_service.business_data.approved',
            target: created.body.id,
            after: expect.objectContaining({
              statusFrom: 'OUTBOUNDED',
              statusTo: 'OUTBOUNDED',
              businessDataReviewStatus: 'APPROVED',
              reviewer: 'service',
              reviewedBy: 'service',
              reviewedAt: expect.any(String),
              differenceFeedback: '业务数据已核对',
              customerCode: '9409',
              systemOrderNo: created.body.systemOrderNo,
              destinationCountry: '加拿大',
              packageCount: 1,
              chargeableWeightKg: 2,
              declarationRequired: false,
              sensitive: false,
              customerServiceReceiveStatus: 'BUSINESS_DATA_APPROVED'
            })
          })
        ]));
      });

    const waitingDeparture = await request(app.getHttpServer())
      .patch(`/api/shipments/${created.body.id}/operational`)
      .set('Authorization', app.auth(serviceToken))
      .send({
        status: 'WAITING_DEPARTURE',
        latestTracking: '数据确认完成，待离港'
      })
      .expect(200);
    expect(waitingDeparture.body.status).toBe('WAITING_DEPARTURE');
    expect(waitingDeparture.body.transferNo).toBeUndefined();

    await request(app.getHttpServer())
      .get(`/api/finance/payable-audits?systemOrderNo=${created.body.systemOrderNo}`)
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ id: routePayable.id, name: '代理成本', amount: 105 })
        ]));
      });
    const routePendingPayments = await request(app.getHttpServer())
      .get(`/api/finance/pending-payments?systemOrderNo=${created.body.systemOrderNo}&currency=ALL`)
      .set('Authorization', app.auth(token))
      .expect(200);
    const routePendingPayment = routePendingPayments.body.rows.find((row: { payableFinanceItemId: string }) => row.payableFinanceItemId === routePayable.id);
    expect(routePendingPayment).toEqual(expect.objectContaining({ amount: 105, currency: 'RMB' }));
    await request(app.getHttpServer())
      .post('/api/finance/payment-applications')
      .set('Authorization', app.auth(token))
      .send({ pendingPaymentIds: [routePendingPayment.id], remark: '市场代理成本付款申请' })
      .expect(201)
      .expect((response) => {
        expect(response.body[0]).toEqual(expect.objectContaining({ totalAmount: 105, currency: 'RMB' }));
      });

    await request(app.getHttpServer())
      .patch(`/api/shipments/${created.body.id}/operational`)
      .set('Authorization', app.auth(operatorToken))
      .send({ transferNo: '1Z999', latestTracking: '业务员尝试填写转单号' })
      .expect(403);

    const withTransferNo = await request(app.getHttpServer())
      .patch(`/api/shipments/${created.body.id}/operational`)
      .set('Authorization', app.auth(serviceToken))
      .send({
        transferNo: '1Z999',
        latestTracking: '已出库，已补齐转单号',
        trackingWebsite: 'https://www.ups.com/track?tracknum=1Z999',
        trackingWebsiteVisibleToSales: false
      })
      .expect(200);
    expect(withTransferNo.body.status).toBe('WAITING_DEPARTURE');
    expect(withTransferNo.body.transferNo).toBe('1Z999');

    const labelPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const uploadedLabel = await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/labels/upload`)
      .set('Authorization', app.auth(serviceToken))
      .field('transferNo', '1Z999')
      .attach('file', labelPng, { filename: 'label.png', contentType: 'image/png' })
      .expect(201);
    expect(uploadedLabel.body.label).toEqual(expect.objectContaining({
      shipmentId: created.body.id,
      transferNo: '1Z999',
      status: 'CREATED',
      labelUrl: expect.stringContaining('/api/uploads/labels/')
    }));
    expect(uploadedLabel.body.shipment).toEqual(expect.objectContaining({
      id: created.body.id,
      transferNo: '1Z999',
      latestTracking: '已上传面单'
    }));

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=shipment.operational.update')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              action: 'shipment.operational.update',
              target: created.body.id,
              after: expect.objectContaining({
                transferNoTo: '1Z999',
                transferNoFilledBy: 'service',
                transferNoFilledAt: expect.any(String),
                trackingWebsite: 'https://www.ups.com/track?tracknum=1Z999',
                trackingWebsiteVisibleToSales: false
              })
            })
          ])
        );
      });

    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(operatorToken))
      .expect(200)
      .expect((response) => {
        const row = response.body.find((shipment: { id: string }) => shipment.id === created.body.id);
        expect(row).toBeTruthy();
        expect(row).not.toHaveProperty('trackingWebsite');
        expect(row).not.toHaveProperty('trackingWebsiteVisibleToSales');
        expect(row).not.toHaveProperty('labelUrl');
      });

    await request(app.getHttpServer())
      .patch(`/api/shipments/${created.body.id}/operational`)
      .set('Authorization', app.auth(token))
      .send({ status: 'DEPARTED', latestTracking: '已离港' })
      .expect(400);

    const departed = await request(app.getHttpServer())
      .patch(`/api/shipments/${created.body.id}/operational`)
      .set('Authorization', app.auth(token))
      .send({
        status: 'DEPARTED',
        latestTracking: '已离港',
        etdAt: '2026-06-06T10:00:00.000Z',
        etaAt: '2026-06-16T10:00:00.000Z'
      })
      .expect(200);
    expect(departed.body.status).toBe('DEPARTED');

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=customer_service.eta.update')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              action: 'customer_service.eta.update',
              target: created.body.id,
              after: expect.objectContaining({
                etaAt: '2026-06-16T10:00:00.000Z',
                etdAt: '2026-06-06T10:00:00.000Z'
              })
            })
          ])
        );
      });

    const departedEdited = await request(app.getHttpServer())
      .patch(`/api/shipments/${created.body.id}/operational`)
      .set('Authorization', app.auth(token))
      .send({
        latestTracking: '已离港',
        etdAt: '2026-06-07T10:00:00.000Z',
        etaAt: '2026-06-17T10:00:00.000Z',
        trackingWebsite: 'https://track.example/1Z999',
        trackingWebsiteVisibleToSales: false
      })
      .expect(200);
    expect(departedEdited.body.status).toBe('DEPARTED');

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=shipment.operational.update')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'shipment.operational.update',
            target: created.body.id,
            after: expect.objectContaining({
              trackingWebsite: 'https://track.example/1Z999',
              trackingWebsiteVisibleToSales: false
            })
          })
        ]));
      });

    const arrived = await request(app.getHttpServer())
      .patch(`/api/shipments/${created.body.id}/operational`)
      .set('Authorization', app.auth(token))
      .send({ status: 'ARRIVED_PORT', latestTracking: '已到港' })
      .expect(200);
    expect(arrived.body.status).toBe('ARRIVED_PORT');

    const delivering = await request(app.getHttpServer())
      .patch(`/api/shipments/${created.body.id}/operational`)
      .set('Authorization', app.auth(token))
      .send({ status: 'DELIVERING', latestTracking: '已派送' })
      .expect(200);
    expect(delivering.body.status).toBe('DELIVERING');

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=customer_service.status.update')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              action: 'customer_service.status.update',
              target: created.body.id,
              before: expect.objectContaining({ status: 'ARRIVED_PORT' }),
              after: expect.objectContaining({
                status: 'DELIVERING',
                statusFrom: 'ARRIVED_PORT',
                statusTo: 'DELIVERING',
                statusAt: expect.any(String),
                dwellHours: expect.any(Number),
                changedBy: 'admin'
              })
            })
          ])
        );
      });

    const flowProblem = await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/problem-tickets`)
      .set('Authorization', app.auth(token))
      .send({ reason: 'C批全链路问题件挂载', customerVisible: true })
      .expect(201);
    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        const row = response.body.find((shipment: { id: string }) => shipment.id === created.body.id);
        expect(row).toEqual(expect.objectContaining({ status: 'DELIVERING', hasProblemTicket: true }));
      });
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=customer_service.issue.attach')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'customer_service.issue.attach',
            target: flowProblem.body.id,
            after: expect.objectContaining({
              shipmentId: created.body.id,
              originalStatusPool: 'DELIVERING',
              issueType: 'C批全链路问题件挂载',
              handledBy: 'admin'
            })
          })
        ]));
      });

    await request(app.getHttpServer())
      .put('/api/system/roles/CUSTOMER_SERVICE/permissions')
      .set('Authorization', app.auth(token))
      .send({ permissions: ['workspace:access', 'orders:read', 'orders:write', 'tracking:read', 'tracking:write', 'problems:read', 'problems:write', 'pricing:lookup', 'master-data:read'] })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/shipments/${created.body.id}/operational`)
      .set('Authorization', app.auth(serviceToken))
      .send({ status: 'SIGNED', latestTracking: '客服尝试代签收' })
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=security.permission.denied')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            actorUsername: 'service',
            target: expect.stringContaining(`/api/shipments/${created.body.id}/operational`),
            after: expect.objectContaining({ permissions: ['customer_service:signature:confirm'] })
          })
        ]));
      });

    const signed = await request(app.getHttpServer())
      .patch(`/api/shipments/${created.body.id}/operational`)
      .set('Authorization', app.auth(token))
      .send({ status: 'SIGNED', latestTracking: '已签收' })
      .expect(200);
    expect(signed.body.status).toBe('SIGNED');
    expect(signed.body.transferNo).toBe('1Z999');
    expect(signed.body.outboundAt).toBeTruthy();

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=shipment.sign')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              action: 'shipment.sign',
              target: created.body.id
            })
          ])
        );
      });
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=customer_service.signature.confirm')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              action: 'customer_service.signature.confirm',
              target: created.body.id,
              actorUsername: 'admin',
              after: expect.objectContaining({
                statusFrom: 'DELIVERING',
                statusTo: 'SIGNED',
                signedBy: 'admin',
                signatureConfirmedBy: 'admin',
                signedAt: expect.any(String),
                signatureConfirmedAt: expect.any(String),
                transferNo: '1Z999'
              })
            })
          ])
        );
      });
    await request(app.getHttpServer())
      .get(`/api/system/audit-logs?target=${created.body.id}`)
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        const rows = response.body.rows as TestAuditLogRow[];
        const actions = rows.map((row) => row.action);
        expect(actions).toEqual(expect.arrayContaining([
          'shipment.order_entry.submit',
          'shipment.review.business_approve',
          'shipment.route',
          'shipment.dispatch',
          'workflow.guard_denied',
          'customer_service.business_data.approved',
          'shipment.operational.update',
          'customer_service.status.update',
          'customer_service.signature.confirm'
        ]));
        for (const expected of [
          { action: 'shipment.order_entry.submit', actorUsername: 'admin' },
          { action: 'shipment.review.business_approve', actorUsername: 'admin', requiresBefore: true },
          { action: 'shipment.route', actorUsername: 'operator', requiresBefore: true },
          { action: 'shipment.dispatch', actorUsername: 'warehouse', requiresBefore: true },
          { action: 'workflow.guard_denied', actorUsername: 'service', result: 'FAILED' },
          { action: 'customer_service.business_data.approved', actorUsername: 'service', requiresBefore: true },
          { action: 'shipment.operational.update', actorUsername: 'service', requiresBefore: true },
          { action: 'customer_service.status.update', actorUsername: 'admin', requiresBefore: true },
          { action: 'customer_service.signature.confirm', actorUsername: 'admin', requiresBefore: true }
        ]) {
          expectAuditTrailRow(rows.find((row) => row.action === expected.action && row.actorUsername === expected.actorUsername), {
            ...expected,
            target: created.body.id,
            requiresAfter: true
          });
        }
      });

    await request(app.getHttpServer())
      .post(`/api/finance/receivable-audits/${receivable.body.id}/audit`)
      .set('Authorization', app.auth(token))
      .expect(201);
    const waterReceipt = await request(app.getHttpServer())
      .post('/api/finance/water-receipts')
      .set('Authorization', app.auth(token))
      .send({
        customerCode: '9409',
        receiptMethod: '同链路水单',
        receiptDate: '2026-06-06T12:00:00.000+08:00',
        amount: 120,
        currency: 'RMB',
        paymentNo: 'FLOW-WATER-001'
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/finance/water-receipts/${waterReceipt.body.id}/mark-arrived`)
      .set('Authorization', app.auth(token))
      .send({})
      .expect(201);
    const matchedReceipt = await request(app.getHttpServer())
      .post(`/api/finance/water-receipts/${waterReceipt.body.id}/match-orders`)
      .set('Authorization', app.auth(token))
      .send({ matches: [{ receivableFinanceItemId: receivable.body.id, amount: 120 }] })
      .expect(201)
      .expect((response) => {
        expect(response.body.balance).toBe(0);
        expect(response.body.matches).toEqual(expect.arrayContaining([
          expect.objectContaining({ shipmentId: created.body.id, receivableFinanceItemId: receivable.body.id, amount: 120 })
        ]));
      });

    const payable = await request(app.getHttpServer())
      .post('/api/finance/payable-audits')
      .set('Authorization', app.auth(token))
      .send({ shipmentId: created.body.id, name: '代理运费', chargeWeightKg: 3, unitPrice: 20, currency: 'RMB', paymentNo: 'FLOW-PAYABLE-001' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/finance/payable-audits/${payable.body.id}/audit`)
      .set('Authorization', app.auth(token))
      .expect(201);
    const pendingPayments = await request(app.getHttpServer())
      .get(`/api/finance/pending-payments?systemOrderNo=${created.body.systemOrderNo}&currency=ALL`)
      .set('Authorization', app.auth(token))
      .expect(200);
    const pendingPayment = pendingPayments.body.rows.find((row: { amount: number; currency: string }) => row.amount === 60 && row.currency === 'RMB');
    expect(pendingPayment).toBeTruthy();
    const paymentApplications = await request(app.getHttpServer())
      .post('/api/finance/payment-applications')
      .set('Authorization', app.auth(token))
      .send({ pendingPaymentIds: [pendingPayment.id], remark: '同链路付款申请' })
      .expect(201);
    expect(paymentApplications.body).toHaveLength(1);
    const paidApplication = await request(app.getHttpServer())
      .post(`/api/finance/payment-applications/${paymentApplications.body[0].id}/confirm-paid`)
      .set('Authorization', app.auth(token))
      .send({ payerBankName: '思远付款银行', payerBankAccountNo: 'FLOW-PAYER-001', paidAt: '2026-06-07' })
      .expect(201)
      .expect((response) => {
        expect(response.body.status).toBe('PAID');
      });
    await request(app.getHttpServer())
      .get(`/api/finance/paid-payments?status=PAID&systemOrderNo=${created.body.systemOrderNo}`)
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ id: paymentApplications.body[0].id, status: 'PAID', payerBankAccountNo: 'FLOW-PAYER-001' })
        ]));
      });
    await request(app.getHttpServer())
      .get(`/api/shipments/${created.body.id}/finance-detail`)
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.payables).toEqual(expect.arrayContaining([expect.objectContaining({ name: '代理运费' })]));
        expect(response.body.payables).toEqual(expect.arrayContaining([expect.objectContaining({ name: '代理成本', amount: 105 })]));
        expect(response.body.payableTotal).toBe(165);
      });
    await request(app.getHttpServer())
      .get(`/api/shipments/${created.body.id}/finance-detail`)
      .set('Authorization', app.auth(financeToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.payables).toEqual(expect.arrayContaining([expect.objectContaining({ name: '代理运费' })]));
        expect(response.body.payables).toEqual(expect.arrayContaining([expect.objectContaining({ name: '代理成本', amount: 105 })]));
        expect(response.body.payableTotal).toBe(165);
      });
    await request(app.getHttpServer())
      .get(`/api/finance/paid-payments?status=PAID&systemOrderNo=${created.body.systemOrderNo}`)
      .set('Authorization', app.auth(financeToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ id: paymentApplications.body[0].id, payerBankAccountNo: 'FLOW-PAYER-001' })
        ]));
      });
    await request(app.getHttpServer())
      .get(`/api/shipments/${created.body.id}/finance-detail`)
      .set('Authorization', app.auth(serviceToken))
      .expect(200)
      .expect((response) => {
        const bodyText = JSON.stringify(response.body);
        expect(response.body).not.toHaveProperty('payables');
        expect(response.body).not.toHaveProperty('payableTotal');
        expect(response.body).not.toHaveProperty('canViewPayables');
        expect(response.body).not.toHaveProperty('profitSections');
        expect(response.body.grossProfit).toBeUndefined();
        expect(response.body.agentName).toBeUndefined();
        expect(bodyText).not.toContain('代理运费');
        expect(bodyText).not.toContain('FLOW-PAYER-001');
        expect(bodyText).not.toContain('payerBankAccountNo');
        expect(bodyText).not.toContain('payeeBankAccount');
        expect(bodyText).not.toContain('bankAccountNo');
      });
    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(operatorToken))
      .expect(200)
      .expect((response) => {
        const row = response.body.find((shipment: { id: string }) => shipment.id === created.body.id);
        const bodyText = JSON.stringify(row);
        expect(row).toEqual(expect.objectContaining({ id: created.body.id, agentName: '', channelName: '' }));
        expect(row).not.toHaveProperty('paymentAmountUsd');
        expect(row).not.toHaveProperty('paymentAmountCny');
        expect(row).not.toHaveProperty('paymentMethod');
        expect(row).not.toHaveProperty('trackingWebsite');
        expect(row).not.toHaveProperty('trackingWebsiteVisibleToSales');
        expect(row).not.toHaveProperty('labelUrl');
        expect(bodyText).not.toContain('FLOW-PAYER-001');
        expect(bodyText).not.toContain('代理运费');
      });
    await request(app.getHttpServer())
      .get(`/api/shipments/${created.body.id}/finance-detail`)
      .set('Authorization', app.auth(operatorToken))
      .expect(200)
      .expect((response) => {
        const bodyText = JSON.stringify(response.body);
        expect(response.body.receivables).toEqual(expect.arrayContaining([expect.objectContaining({ name: '客户运费' })]));
        expect(response.body.businessCosts).toEqual(expect.arrayContaining([expect.objectContaining({ name: '业务成本' })]));
        expect(response.body).not.toHaveProperty('payables');
        expect(response.body).not.toHaveProperty('payableTotal');
        expect(response.body).not.toHaveProperty('canViewPayables');
        expect(response.body).not.toHaveProperty('profitSections');
        expect(response.body.grossProfit).toBeUndefined();
        expect(response.body.agentName).toBeUndefined();
        expect(bodyText).not.toContain('代理运费');
        expect(bodyText).not.toContain('FLOW-PAYER-001');
        expect(bodyText).not.toContain('payerBankAccountNo');
        expect(bodyText).not.toContain('payeeBankAccount');
        expect(bodyText).not.toContain('bankAccountNo');
      });
    await request(app.getHttpServer())
      .get(`/api/shipments/${created.body.id}/finance-detail`)
      .set('Authorization', app.auth(warehouseToken))
      .expect(403);
    await request(app.getHttpServer())
      .get(`/api/finance/pending-payments?systemOrderNo=${created.body.systemOrderNo}&currency=ALL`)
      .set('Authorization', app.auth(operatorToken))
      .expect(403);
    await request(app.getHttpServer())
      .get(`/api/finance/paid-payments?status=PAID&systemOrderNo=${created.body.systemOrderNo}`)
      .set('Authorization', app.auth(operatorToken))
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/finance/payment-applications/${paymentApplications.body[0].id}/confirm-paid`)
      .set('Authorization', app.auth(marketToken))
      .send({ payerBankName: '市场越权付款', payerBankAccountNo: 'MARKET-PAY', paidAt: '2026-06-07' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/dispatch`)
      .set('Authorization', app.auth(financeToken))
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/api/shipments/${created.body.id}/operational`)
      .set('Authorization', app.auth(financeToken))
      .send({ status: 'SIGNED', latestTracking: '财务尝试代签收' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/master-data/channels')
      .set('Authorization', app.auth(financeToken))
      .send({ name: '财务越权改渠道' })
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=security.permission.denied')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        const rows = response.body.rows as TestAuditLogRow[];
        const deniedTargets = [
          { actorUsername: 'operator', targetText: '/api/finance/pending-payments' },
          { actorUsername: 'operator', targetText: '/api/finance/paid-payments' },
          { actorUsername: 'warehouse', targetText: `/api/shipments/${created.body.id}/finance-detail` },
          { actorUsername: 'R-market', targetText: '/api/finance/payment-applications/' },
          { actorUsername: 'finance', targetText: `/api/shipments/${created.body.id}/dispatch` },
          { actorUsername: 'finance', targetText: `/api/shipments/${created.body.id}/operational` },
          { actorUsername: 'finance', targetText: '/api/master-data/channels' }
        ];
        for (const expected of deniedTargets) {
          const row = rows.find((item) => item.action === 'security.permission.denied' && item.actorUsername === expected.actorUsername && item.target.includes(expected.targetText));
          expectAuditTrailRow(row, {
            action: 'security.permission.denied',
            target: row?.target ?? '',
            actorUsername: expected.actorUsername,
            result: 'FAILED',
            requiresAfter: true
          });
        }
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            actorUsername: 'operator',
            target: expect.stringContaining('/api/finance/pending-payments'),
            result: 'FAILED'
          }),
          expect.objectContaining({
            actorUsername: 'operator',
            target: expect.stringContaining('/api/finance/paid-payments'),
            result: 'FAILED'
          }),
          expect.objectContaining({
            actorUsername: 'warehouse',
            target: expect.stringContaining(`/api/shipments/${created.body.id}/finance-detail`),
            result: 'FAILED',
            after: expect.objectContaining({ permissions: ['finance:order-fee:payable:view'] })
          }),
          expect.objectContaining({
            actorUsername: 'R-market',
            target: expect.stringContaining('/api/finance/payment-applications/'),
            result: 'FAILED',
            after: expect.objectContaining({ permissions: ['finance:payable:paid-confirm'] })
          }),
          expect.objectContaining({
            actorUsername: 'finance',
            target: expect.stringContaining(`/api/shipments/${created.body.id}/dispatch`),
            result: 'FAILED',
            after: expect.objectContaining({ permissions: ['warehouse:write'] })
          }),
          expect.objectContaining({
            actorUsername: 'finance',
            target: expect.stringContaining(`/api/shipments/${created.body.id}/operational`),
            result: 'FAILED',
            after: expect.objectContaining({ permissions: ['orders:write'] })
          }),
          expect.objectContaining({
            actorUsername: 'finance',
            target: expect.stringContaining('/api/master-data/channels'),
            result: 'FAILED',
            after: expect.objectContaining({ permissions: ['master-data:channels:write'] })
          })
        ]));
      });

    for (const [action, target] of [
      ['finance.receivable.audit', receivable.body.id],
      ['finance.water_receipt.arrive', waterReceipt.body.id],
      ['finance.water_receipt.match', waterReceipt.body.id],
      ['finance.payable.audit', payable.body.id],
      ['finance.payment_application.create', paymentApplications.body[0].id],
      ['finance.paid_payment.confirm', paymentApplications.body[0].id]
    ]) {
      await request(app.getHttpServer())
        .get(`/api/system/audit-logs?action=${action}`)
        .set('Authorization', app.auth(token))
        .expect(200)
        .expect((response) => {
          const rows = response.body.rows as TestAuditLogRow[];
          expectAuditTrailRow(rows.find((row) => row.action === action && row.target === target), {
            action,
            target,
            actorUsername: 'admin',
            requiresAfter: true
          });
          expect(response.body.rows).toEqual(expect.arrayContaining([
            expect.objectContaining({ action, target })
          ]));
        });
    }
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=finance.receivable.audit')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'finance.receivable.audit',
            target: receivable.body.id,
            after: expect.objectContaining({
              systemOrderNo: created.body.systemOrderNo,
              customerCode: '9409',
              amount: 120,
              currency: 'RMB',
              statusFrom: 'PENDING',
              statusTo: 'CONFIRMED',
              reviewedBy: 'admin'
            })
          })
        ]));
      });
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=finance.water_receipt.arrive')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'finance.water_receipt.arrive',
            target: waterReceipt.body.id,
            after: expect.objectContaining({
              arrivedAmount: 120,
              customerAccountBalance: expect.any(Number)
            })
          })
        ]));
      });
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=finance.water_receipt.match')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'finance.water_receipt.match',
            target: waterReceipt.body.id,
            after: expect.objectContaining({
              matchedBy: 'admin',
              matchedAmountDelta: 120,
              receiptBalanceAfter: 0,
              customerAccountBalance: expect.any(Number)
            })
          })
        ]));
      });
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=finance.payable.audit')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'finance.payable.audit',
            target: payable.body.id,
            after: expect.objectContaining({
              systemOrderNo: created.body.systemOrderNo,
              customerCode: '9409',
              amount: 60,
              currency: 'RMB',
              pendingPaymentStatus: 'PENDING',
              statusFrom: 'PENDING',
              statusTo: 'CONFIRMED',
              reviewedBy: 'admin'
            })
          })
        ]));
      });
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=finance.payment_application.create')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'finance.payment_application.create',
            target: paymentApplications.body[0].id,
            after: expect.objectContaining({
              paymentApplicationId: paymentApplications.body[0].id,
              paymentApplicationNo: paymentApplications.body[0].applicationNo,
              currency: 'RMB',
              totalAmount: 60,
              pendingPaymentIds: expect.arrayContaining([pendingPayment.id]),
              payableFinanceItemIds: expect.arrayContaining([payable.body.id]),
              systemOrderNos: expect.arrayContaining([created.body.systemOrderNo]),
              customerCodes: expect.arrayContaining(['9409']),
              statusTo: 'WAITING_PAYMENT'
            })
          })
        ]));
      });
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=finance.paid_payment.confirm')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'finance.paid_payment.confirm',
            target: paymentApplications.body[0].id,
            after: expect.objectContaining({
              paymentApplicationId: paymentApplications.body[0].id,
              paymentApplicationNo: paymentApplications.body[0].applicationNo,
              currency: 'RMB',
              paymentAmount: 60,
              payerBankAccountNo: 'FLOW-PAYER-001',
              paidBy: 'admin',
              statusFrom: 'WAITING_PAYMENT',
              statusTo: 'PAID',
              writeOffStatus: 'WRITTEN_OFF',
              archiveStatus: 'ARCHIVED',
              payableFinanceItemIds: expect.arrayContaining([payable.body.id]),
              pendingPaymentIds: expect.arrayContaining([pendingPayment.id]),
              systemOrderNos: expect.arrayContaining([created.body.systemOrderNo]),
              customerCodes: expect.arrayContaining(['9409'])
            })
          })
        ]));
      });
    await request(app.getHttpServer())
      .get('/api/warehouse/packages')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: warehousePackage.body.id,
            customerCode: '9409',
            combinedOrderNo: warehousePackage.body.combinedOrderNo,
            systemOrderNo: created.body.systemOrderNo,
            status: 'SHIPPED'
          })
        ]));
      });
    await request(app.getHttpServer())
      .get(`/api/finance/water-receipts?customerCode=9409&paymentNo=FLOW-WATER-001&includeArchived=true`)
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: waterReceipt.body.id,
            customerCode: '9409',
            paymentNo: 'FLOW-WATER-001',
            matches: expect.arrayContaining([
              expect.objectContaining({
                waterReceiptId: waterReceipt.body.id,
                shipmentId: created.body.id,
                systemOrderNo: created.body.systemOrderNo,
                customerCode: '9409',
                receivableFinanceItemId: receivable.body.id
              })
            ])
          })
        ]));
      });
    await request(app.getHttpServer())
      .get(`/api/finance/pending-payments?customerCode=9409&systemOrderNo=${created.body.systemOrderNo}&currency=ALL`)
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: pendingPayment.id,
            paymentApplicationId: paymentApplications.body[0].id,
            paymentApplicationNo: paymentApplications.body[0].applicationNo,
            shipmentId: created.body.id,
            systemOrderNo: created.body.systemOrderNo,
            customerCode: '9409',
            payableFinanceItemId: payable.body.id
          })
        ]));
      });
    await request(app.getHttpServer())
      .get(`/api/finance/paid-payments?status=PAID&customerCode=9409&systemOrderNo=${created.body.systemOrderNo}`)
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: paymentApplications.body[0].id,
            applicationNo: paymentApplications.body[0].applicationNo,
            customerCode: '9409',
            systemOrderNo: created.body.systemOrderNo,
            items: expect.arrayContaining([
              expect.objectContaining({
                pendingPaymentId: pendingPayment.id,
                payableFinanceItemId: payable.body.id,
                shipmentId: created.body.id,
                systemOrderNo: created.body.systemOrderNo,
                customerCode: '9409'
              })
            ])
          })
        ]));
      });
    await request(app.getHttpServer())
      .get(`/api/system/audit-logs?target=${paymentApplications.body[0].id}`)
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        const rows = response.body.rows as TestAuditLogRow[];
        for (const action of ['finance.payment_application.create', 'finance.paid_payment.confirm']) {
          expectAuditTrailRow(rows.find((row) => row.action === action), {
            action,
            target: paymentApplications.body[0].id,
            actorUsername: 'admin',
            requiresAfter: true
          });
        }
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'finance.payment_application.create',
            target: paymentApplications.body[0].id,
            after: expect.objectContaining({
              systemOrderNos: expect.arrayContaining([created.body.systemOrderNo]),
              customerCodes: expect.arrayContaining(['9409'])
            })
          }),
          expect.objectContaining({
            action: 'finance.paid_payment.confirm',
            target: paymentApplications.body[0].id,
            after: expect.objectContaining({
              systemOrderNos: expect.arrayContaining([created.body.systemOrderNo]),
              customerCodes: expect.arrayContaining(['9409'])
            })
          })
        ]));
      });
    expect({
      shipmentId: created.body.id,
      customerCode: '9409',
      combinedOrderNo: warehousePackage.body.combinedOrderNo,
      waterReceiptId: waterReceipt.body.id,
      paymentApplicationId: paymentApplications.body[0].id,
      warehousePackageId: warehousePackage.body.id,
      warehousePackageShipped: true,
      signedStatus: signed.body.status,
      transferNo: signed.body.transferNo,
      outboundAt: Boolean(signed.body.outboundAt),
      receivableMatched: matchedReceipt.body.balance === 0,
      paidApplicationStatus: paidApplication.body.status,
      payerBankAccountNo: paidApplication.body.payerBankAccountNo
    }).toEqual({
      shipmentId: created.body.id,
      customerCode: '9409',
      combinedOrderNo: warehousePackage.body.combinedOrderNo,
      waterReceiptId: waterReceipt.body.id,
      paymentApplicationId: paymentApplications.body[0].id,
      warehousePackageId: warehousePackage.body.id,
      warehousePackageShipped: true,
      signedStatus: 'SIGNED',
      transferNo: '1Z999',
      outboundAt: true,
      receivableMatched: true,
      paidApplicationStatus: 'PAID',
      payerBankAccountNo: 'FLOW-PAYER-001'
    });

    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/tracking-events`)
      .set('Authorization', app.auth(token))
      .send({ status: '已上网', happenedAt: '2026-06-06T10:00:00.000Z' })
      .expect(201)
      .expect((response) => {
        expect(response.body.latestTracking).toBe('已上网');
      });

    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/tracking-events`)
      .set('Authorization', app.auth(operatorToken))
      .send({ status: '业务员越权轨迹', happenedAt: '2026-06-06T10:00:00.000Z' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/shipments/tracking-events/import')
      .set('Authorization', app.auth(warehouseToken))
      .send({ rows: [{ systemOrderNo: created.body.systemOrderNo, status: '仓库越权导入轨迹' }] })
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=security.permission.denied')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        const rows = response.body.rows as TestAuditLogRow[];
        for (const actorUsername of ['operator', 'warehouse']) {
          const row = rows.find((item) => item.action === 'security.permission.denied' && item.actorUsername === actorUsername && item.target.includes(actorUsername === 'operator' ? `/api/shipments/${created.body.id}/tracking-events` : '/api/shipments/tracking-events/import'));
          expectAuditTrailRow(row, {
            action: 'security.permission.denied',
            target: row?.target ?? '',
            actorUsername,
            result: 'FAILED',
            requiresAfter: true
          });
        }
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'security.permission.denied',
            actorUsername: 'operator',
            target: expect.stringContaining(`/api/shipments/${created.body.id}/tracking-events`),
            result: 'FAILED',
            after: expect.objectContaining({ permissions: ['tracking:write'] })
          }),
          expect.objectContaining({
            action: 'security.permission.denied',
            actorUsername: 'warehouse',
            target: expect.stringContaining('/api/shipments/tracking-events/import'),
            result: 'FAILED',
            after: expect.objectContaining({ permissions: ['tracking:write'] })
          })
        ]));
      });
  });

  it('persists manual shipment edits, shipment payments, and bulk tracking imports through API endpoints', async () => {
    const loginToken = await app.loginAs('admin');
    const token = loginToken;

    const created = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(token))
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'BACKEND-ACTION-001',
        systemOrderNo: 'SYBACKENDACTION001',
        businessType: 'DEDICATED_LINE',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 18,
        agentWeightKg: 18,
        channelId: 'ch-dhl-hk',
        productName: '后台动作产品',
        initialStatus: 'DRAFT',
        latestTracking: '新建出货订单，待审核'
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/shipments/${created.body.id}/operational`)
      .set('Authorization', app.auth(token))
      .send({
        latestTracking: '人工复核通过',
        channelId: 'ch-fedex-au',
        productName: '人工修改产品',
        destinationCountry: '加拿大',
        packageCount: 2,
        receivableWeightKg: 22,
        declarationRequired: true
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.latestTracking).toBe('人工复核通过');
        expect(response.body.channelName).toBe('FEDEX AU 促销');
        expect(response.body.productName).toBe('人工修改产品');
        expect(response.body.destinationCountry).toBe('加拿大');
        expect(response.body.packageCount).toBe(2);
        expect(response.body.receivableWeightKg).toBe(22);
        expect(response.body.declarationRequired).toBe(true);
        expect(response.body.transferNo).toBeUndefined();
        expect(response.body.status).toBe('DRAFT');
      });

    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/payment`)
      .set('Authorization', app.auth(token))
      .send({
        paymentAmountUsd: 128,
        paymentAmountCny: 927.36,
        paymentMethod: '对公'
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.paymentAmountUsd).toBe(128);
        expect(response.body.paymentAmountCny).toBe(927.36);
        expect(response.body.paymentMethod).toBe('对公');
      });

    await request(app.getHttpServer())
      .post('/api/shipments/tracking-events/import')
      .set('Authorization', app.auth(token))
      .send({
        updates: [
          {
            shipmentId: created.body.id,
            customerOrderNo: 'BACKEND-ACTION-001',
            trackingDate: '2026-06-08T10:00:00.000Z',
            latestTracking: '批量轨迹已签收'
          }
        ]
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.updated).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: created.body.id,
              latestTracking: '批量轨迹已签收',
              trackingStaleDays: 0
            })
          ])
        );
      });

    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: created.body.id,
              latestTracking: '批量轨迹已签收',
              paymentAmountUsd: 128,
              paymentAmountCny: 927.36,
              paymentMethod: '对公'
            })
          ])
        );
      });
  });

  it('creates replies and closes problem tickets with customer visibility filtering', async () => {
    const adminToken = await app.loginAs('admin');
    const warehouseToken = await app.loginAs('warehouse');
    const token = adminToken;

    const beforeShipments = await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(token))
      .expect(200);
    const beforeShipment = beforeShipments.body.find((item: { id: string }) => item.id === 's-seed-2');
    expect(beforeShipment).toBeTruthy();

    const created = await request(app.getHttpServer())
      .post('/api/shipments/s-seed-2/problem-tickets')
      .set('Authorization', app.auth(token))
      .send({ reason: '轨迹超过3天未更新', customerVisible: true })
      .expect(201);
    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        const afterShipment = response.body.find((item: { id: string }) => item.id === 's-seed-2');
        expect(afterShipment.status).toBe(beforeShipment.status);
        expect(afterShipment.hasProblemTicket).toBe(true);
      });

    await request(app.getHttpServer())
      .post(`/api/problem-tickets/${created.body.id}/replies`)
      .set('Authorization', app.auth(token))
      .send({ message: '已联系代理核实' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/problem-tickets/${created.body.id}/close`)
      .set('Authorization', app.auth(token))
      .expect(201)
      .expect((response) => {
        expect(response.body.status).toBe('CLOSED');
      });
    for (const action of ['problem.ticket.create', 'problem.ticket.reply', 'problem.ticket.close']) {
      await request(app.getHttpServer())
        .get(`/api/system/audit-logs?action=${action}`)
        .set('Authorization', app.auth(token))
        .expect(200)
        .expect((response) => {
          expect(response.body.rows).toEqual(expect.arrayContaining([
            expect.objectContaining({ action, target: created.body.id })
          ]));
        });
    }
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=customer_service.issue.attach')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'customer_service.issue.attach',
            target: created.body.id,
            after: expect.objectContaining({
              shipmentId: 's-seed-2',
              originalStatus: beforeShipment.status,
              originalStatusPool: beforeShipment.status,
              issueId: created.body.id,
              issueType: '轨迹超过3天未更新',
              handledBy: 'admin',
              attachedAt: expect.any(String)
            })
          })
        ]));
      });
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=customer_service.issue.update')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'customer_service.issue.update',
            target: created.body.id,
            after: expect.objectContaining({
              issueId: created.body.id,
              shipmentId: 's-seed-2',
              originalStatusPool: beforeShipment.status,
              handledBy: 'admin',
              message: '已联系代理核实'
            })
          })
        ]));
      });
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=customer_service.issue.close')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'customer_service.issue.close',
            target: created.body.id,
            after: expect.objectContaining({
              issueId: created.body.id,
              shipmentId: 's-seed-2',
              originalStatusPool: beforeShipment.status,
              handledBy: 'admin',
              status: 'CLOSED',
              closedAt: expect.any(String)
            })
          })
        ]));
      });
    await request(app.getHttpServer())
      .post('/api/shipments/s-seed-2/problem-tickets')
      .set('Authorization', app.auth(warehouseToken))
      .send({ reason: '仓库越权问题件', customerVisible: false })
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=security.permission.denied')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'security.permission.denied',
            actorUsername: 'warehouse',
            target: expect.stringContaining('/api/shipments/s-seed-2/problem-tickets'),
            result: 'FAILED',
            after: expect.objectContaining({ permissions: ['problems:write'] })
          })
        ]));
      });

    const customerToken = await app.loginAs('customer');

    await request(app.getHttpServer())
      .get('/api/problem-tickets')
      .set('Authorization', app.auth(customerToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.every((ticket: { customerVisible: boolean }) => ticket.customerVisible)).toBe(true);
      });
  });

  it('prevents customers from reading employee master data', async () => {
    const loginToken = await app.loginAs('customer');

    await request(app.getHttpServer())
      .get('/api/master-data')
      .set('Authorization', app.auth(loginToken))
      .expect(403);
  });

  it('creates company channels when no carrier row is preselected', async () => {
    const adminToken = await app.loginAs('admin');

    await request(app.getHttpServer())
      .post('/api/master-data/channels')
      .set('Authorization', app.auth(adminToken))
      .send({ name: 'No Carrier Preselect Channel', carrierId: '', carrierName: 'No Carrier Preselect', category: 'DHL' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          name: 'No Carrier Preselect Channel',
          carrierName: 'No Carrier Preselect'
        }));
      });
  });

  it('lets admins maintain master data and use new agents and channels in fulfillment', async () => {
    const adminToken = await app.loginAs('admin');
    const financeToken = await app.loginAs('finance');

    await request(app.getHttpServer())
      .get('/api/master-data')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.customers).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'c-9409', code: '9409', name: 'Daloday', salesperson: 'operator', defaultSettlementMethod: 'RMB月结', enabled: true })]));
        expect(response.body.agents).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'a-9409-ups', code: 'AG-9409-UPS', name: 'AG-9409-UPS' })]));
        expect(response.body.agentChannels).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'ach-9409-ups-exp', agentId: 'a-9409-ups', channelName: 'AGCH-UPS-EXP' })]));
        expect(response.body.channels).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'ch-9409-ups-exp', name: 'COCH-US-UPS-EXP', category: 'UPS' })]));
        expect(response.body.channels[0]).toHaveProperty('carrierName');
        expect(response.body.channels[0]).toHaveProperty('volumeDivisor');
        expect(response.body.channelCategories).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'UPS', enabled: true })]));
        expect(response.body.agentChannels).toEqual(expect.arrayContaining([expect.objectContaining({ agentId: 'a-yuhuan', channelName: '宇环 DHL' })]));
        expect(response.body.surcharges).toEqual(expect.arrayContaining([expect.objectContaining({ name: '偏远附加费' })]));
        expect(response.body.exchangeRates).toEqual(expect.arrayContaining([expect.objectContaining({ baseCurrency: 'USD', quoteCurrency: 'RMB' })]));
      });

    await request(app.getHttpServer())
      .get('/api/system/sites')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'site-sz-siyuan', name: '深圳站', enabled: true })]));
      });

    await request(app.getHttpServer())
      .get('/api/system/staff-accounts')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([
          expect.objectContaining({ username: 'R-sales', role: 'UG_BUSINESS', roleLabel: '业务部', site: '深圳站' }),
          expect.objectContaining({ username: 'R-warehouse', role: 'UG_WAREHOUSE_RECEIVE', roleLabel: '仓库收货', site: '深圳站' }),
          expect.objectContaining({ username: 'R-market', role: 'UG_BUSINESS', roleLabel: '业务部' }),
          expect.objectContaining({ username: 'R-service', role: 'UG_CUSTOMER_SERVICE', roleLabel: '客服' }),
          expect.objectContaining({ username: 'R-finance', role: 'UG_FINANCE', roleLabel: '财务' }),
          expect.objectContaining({ username: 'R-admin', role: 'ADMIN' })
        ]));
      });

    const site = await request(app.getHttpServer())
      .post('/api/system/sites')
      .set('Authorization', app.auth(adminToken))
      .send({ name: 'A5验收站', sortOrder: 99 })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({ name: 'A5验收站', sortOrder: 99, enabled: true }));
      });
    await request(app.getHttpServer())
      .put(`/api/system/sites/${site.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .send({ name: 'A5验收站改', sortOrder: 100 })
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({ name: 'A5验收站改', sortOrder: 100, enabled: true }));
      });
    await request(app.getHttpServer())
      .put(`/api/system/sites/${site.body.id}/enabled`)
      .set('Authorization', app.auth(adminToken))
      .send({ enabled: false })
      .expect(200)
      .expect((response) => {
        expect(response.body.enabled).toBe(false);
      });

    const staffAccount = await request(app.getHttpServer())
      .post('/api/system/staff-accounts')
      .set('Authorization', app.auth(adminToken))
      .send({ username: 'a5staff', name: 'A5 员工', nickname: 'A5 业务员', password: 'A5staff@123', role: 'UG_WAREHOUSE_RECEIVE', site: '深圳站' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({ username: 'a5staff', name: 'A5 员工', nickname: 'A5 业务员', role: 'UG_WAREHOUSE_RECEIVE', roleLabel: '仓库收货', site: '深圳站', enabled: true }));
      });
    await request(app.getHttpServer())
      .post('/api/system/staff-accounts')
      .set('Authorization', app.auth(adminToken))
      .send({ username: 'a5legacy', password: 'A5legacy@123', role: 'WAREHOUSE' })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('员工角色不正确');
      });
    await request(app.getHttpServer())
      .get('/api/system/staff-accounts?keyword=A5&status=ENABLED')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: staffAccount.body.id, username: 'a5staff' })]));
      });
    await request(app.getHttpServer())
      .put(`/api/system/staff-accounts/${staffAccount.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .send({ username: 'a5staff2', name: 'A5 员工改', nickname: 'A5 业务员改', role: 'UG_BUSINESS', site: 'A5验收站改', enabled: true })
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({ username: 'a5staff2', name: 'A5 员工改', nickname: 'A5 业务员改', role: 'UG_BUSINESS', roleLabel: '业务部', site: 'A5验收站改', enabled: true }));
      });
    await request(app.getHttpServer())
      .put(`/api/system/staff-accounts/${staffAccount.body.id}/site`)
      .set('Authorization', app.auth(adminToken))
      .send({ site: 'A5验收站改' })
      .expect(200)
      .expect((response) => {
        expect(response.body.site).toBe('A5验收站改');
      });
    await request(app.getHttpServer())
      .post('/api/system/staff-accounts/reset-passwords')
      .set('Authorization', app.auth(adminToken))
      .send({ userIds: [staffAccount.body.id] })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual([expect.objectContaining({ id: staffAccount.body.id, username: 'a5staff2', temporaryPassword: 'a5staff2@123' })]);
      });
    await request(app.getHttpServer())
      .put(`/api/system/staff-accounts/${staffAccount.body.id}/enabled`)
      .set('Authorization', app.auth(adminToken))
      .send({ enabled: false })
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({ id: staffAccount.body.id, enabled: false }));
      });
    await request(app.getHttpServer())
      .get('/api/system/staff-accounts?keyword=A5&status=DISABLED')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: staffAccount.body.id, enabled: false })]));
      });
    await request(app.getHttpServer())
      .put(`/api/system/staff-accounts/${staffAccount.body.id}/enabled`)
      .set('Authorization', app.auth(adminToken))
      .send({ enabled: true })
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({ id: staffAccount.body.id, enabled: true }));
      });
    await request(app.getHttpServer())
      .delete(`/api/system/staff-accounts/${staffAccount.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.enabled).toBe(false);
      });

    const rSalesLogin = await request(app.getHttpServer()).post('/api/auth/login').send({ username: 'R-sales', password: 'R-sales@123' }).expect(201);
    await request(app.getHttpServer())
      .put(`/api/system/staff-accounts/${staffAccount.body.id}/enabled`)
      .set('Authorization', app.auth(rSalesLogin.body.accessToken))
      .send({ enabled: false })
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/system/staff-accounts?keyword=R-sales')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([expect.objectContaining({ username: 'R-sales', lastLoginAt: expect.any(String) })]));
      });
    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(rSalesLogin.body.accessToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body.every((shipment: { customerName?: string }) => shipment.customerName?.startsWith('9409-'))).toBe(true);
      });
    await request(app.getHttpServer())
      .get('/api/master-data/customers')
      .set('Authorization', app.auth(rSalesLogin.body.accessToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([expect.objectContaining({ code: '9409', salesperson: 'operator' })]));
        expect(response.body).not.toEqual(expect.arrayContaining([expect.objectContaining({ code: '1344' })]));
        expect(response.body.every((customer: { salesperson?: string }) => ['operator', 'R-sales'].includes(customer.salesperson ?? ''))).toBe(true);
      });

    await request(app.getHttpServer())
      .get('/api/master-data')
      .set('Authorization', app.auth(rSalesLogin.body.accessToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.customers).toEqual(expect.arrayContaining([expect.objectContaining({ code: '9409', salesperson: 'operator' })]));
        expect(response.body.customers).not.toEqual(expect.arrayContaining([expect.objectContaining({ code: '1344' })]));
        expect(response.body.channels.length).toBeGreaterThan(0);
        expect(response.body.agents).toEqual([]);
        expect(response.body.agentChannels).toEqual([]);
      });

    const rWarehouseLogin = await request(app.getHttpServer()).post('/api/auth/login').send({ username: 'R-warehouse', password: 'R-warehouse@123' }).expect(201);
    await request(app.getHttpServer())
      .get('/api/master-data')
      .set('Authorization', app.auth(rWarehouseLogin.body.accessToken))
      .expect(403);

    await request(app.getHttpServer())
      .put('/api/system/roles/UG_FINANCE/permissions')
      .set('Authorization', app.auth(adminToken))
      .send({ permissions: ['workspace:access', 'orders:read', 'finance:settle', 'finance:read', 'master-data:read'] })
      .expect(200);
    const rFinanceLogin = await request(app.getHttpServer()).post('/api/auth/login').send({ username: 'R-finance', password: 'R-finance@123' }).expect(201);
    await request(app.getHttpServer())
      .get('/api/master-data')
      .set('Authorization', app.auth(rFinanceLogin.body.accessToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.customers).toEqual(expect.arrayContaining([expect.objectContaining({ code: '9409', defaultSettlementMethod: 'RMB月结' })]));
      });

    const customer = await request(app.getHttpServer())
      .post('/api/master-data/customers')
      .set('Authorization', app.auth(adminToken))
      .send({ code: '7777', name: 'M7-Test', customerSource: '展会' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({ code: '7777', customerSource: '展会', salesperson: 'admin' }));
      });

    const customerContact = await request(app.getHttpServer())
      .post(`/api/master-data/customers/${customer.body.id}/contacts`)
      .set('Authorization', app.auth(adminToken))
      .send({
        name: 'M7 Contact 1',
        company: 'M7 收货公司',
        phone: '13900000007',
        email: 'm7@example.com',
        address: 'M7 Street 1',
        country: 'US',
        state: 'CA',
        postalCode: '90001'
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.customerId).toBe(customer.body.id);
        expect(response.body).toEqual(expect.objectContaining({
          name: 'M7 Contact 1',
          company: 'M7 收货公司',
          phone: '13900000007',
          email: 'm7@example.com',
          address: 'M7 Street 1',
          country: 'US',
          state: 'CA',
          postalCode: '90001'
        }));
      });
    for (const receiverNo of [2, 3, 4]) {
      await request(app.getHttpServer())
        .post(`/api/master-data/customers/${customer.body.id}/contacts`)
        .set('Authorization', app.auth(adminToken))
        .send({
          name: `M7 Contact ${receiverNo}`,
          phone: `1390000000${receiverNo}`,
          address: `M7 Street ${receiverNo}`,
          country: 'US'
        })
        .expect(201);
    }
    await request(app.getHttpServer())
      .post(`/api/master-data/customers/${customer.body.id}/contacts`)
      .set('Authorization', app.auth(adminToken))
      .send({ name: 'M7 Contact 5' })
      .expect(400);

    const updatedCustomerContact = await request(app.getHttpServer())
      .put(`/api/master-data/customers/${customer.body.id}/contacts/${customerContact.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .send({
        name: 'M7 Contact 1 Updated',
        company: 'M7 收货公司改',
        phone: '13900000999',
        email: 'm7-updated@example.com',
        address: 'M7 Street Updated',
        country: 'US',
        state: 'NY',
        postalCode: '10001',
        enabled: true
      })
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          id: customerContact.body.id,
          name: 'M7 Contact 1 Updated',
          company: 'M7 收货公司改',
          phone: '13900000999',
          email: 'm7-updated@example.com',
          address: 'M7 Street Updated',
          country: 'US',
          state: 'NY',
          postalCode: '10001',
          enabled: true
        }));
      });

    await request(app.getHttpServer())
      .put(`/api/master-data/customers/${customer.body.id}/contacts/${customerContact.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .send({
        name: 'M7 Contact 1 Updated',
        company: 'M7 收货公司改',
        phone: '13900000999',
        email: 'm7-updated@example.com',
        address: 'M7 Street Updated',
        country: 'US',
        state: 'NY',
        postalCode: '10001',
        enabled: false
      })
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({ id: customerContact.body.id, enabled: false }));
      });

    const deletableCustomer = await request(app.getHttpServer())
      .post('/api/master-data/customers')
      .set('Authorization', app.auth(adminToken))
      .send({ code: '7788', name: 'Delete-Test', defaultSettlementMethod: 'RMB月结' })
      .expect(201);
    await request(app.getHttpServer())
      .delete(`/api/master-data/customers/${deletableCustomer.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({ id: deletableCustomer.body.id, code: '7788' }));
      });
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?target=c-7788&pageSize=5')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([expect.objectContaining({ action: 'master_data.customer.delete', target: 'c-7788' })]));
      });

    const customerUser = await request(app.getHttpServer())
      .post(`/api/master-data/customers/${customer.body.id}/users`)
      .set('Authorization', app.auth(adminToken))
      .send({ username: 'm7customer', password: 'm7pass123' })
      .expect(201)
      .expect((response) => {
        expect(response.body.customerId).toBe(customer.body.id);
        expect(response.body.username).toBe('m7customer');
      });

    await request(app.getHttpServer())
      .put(`/api/master-data/customers/${customer.body.id}/enabled`)
      .set('Authorization', app.auth(adminToken))
      .send({ enabled: false })
      .expect(200)
      .expect((response) => {
        expect(response.body.enabled).toBe(false);
      });
    await request(app.getHttpServer())
      .delete(`/api/master-data/customers/${customer.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'm7customer', password: 'm7pass123' })
      .expect(201)
      .expect((response) => {
        expect(response.body.user.customerId).toBe(customer.body.id);
      });

    const carrier = await request(app.getHttpServer())
      .post('/api/master-data/carriers')
      .set('Authorization', app.auth(adminToken))
      .send({ name: 'M7 Carrier' })
      .expect(201);
    const agent = await request(app.getHttpServer())
      .post('/api/master-data/agents')
      .set('Authorization', app.auth(adminToken))
      .send({
        code: 'M7A',
        shortName: 'M7代理',
        name: 'M7 Agent Ltd.',
        warehouseAddress1: '深圳一号仓',
        warehouseAddress2: '深圳二号仓',
        warehouseAddress3: '深圳三号仓',
        warehouseContact: 'M7仓库',
        invoiceTemplateName: 'M7发票模板.xlsx',
        invoiceTemplateUrl: '/templates/m7-invoice.xlsx'
      })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          code: 'M7A',
          shortName: 'M7代理',
          name: 'M7 Agent Ltd.',
          warehouseAddress1: '深圳一号仓',
          warehouseAddress2: '深圳二号仓',
          warehouseAddress3: '深圳三号仓',
          warehouseContact: 'M7仓库',
          invoiceTemplateName: 'M7发票模板.xlsx',
          invoiceTemplateUrl: '/templates/m7-invoice.xlsx'
        }));
      });
    const agentChannel = await request(app.getHttpServer())
      .post('/api/master-data/agent-channels')
      .set('Authorization', app.auth(adminToken))
      .send({ agentId: agent.body.id, channelName: 'M7 代理渠道' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          agentId: agent.body.id,
          agentName: 'M7代理',
          channelName: 'M7 代理渠道',
          enabled: true
        }));
      });
    await request(app.getHttpServer())
      .put(`/api/master-data/agent-channels/${agentChannel.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .send({ agentId: agent.body.id, channelName: 'M7 代理渠道-改' })
      .expect(200)
      .expect((response) => {
        expect(response.body.channelName).toBe('M7 代理渠道-改');
      });
    await request(app.getHttpServer())
      .put(`/api/master-data/agent-channels/${agentChannel.body.id}/enabled`)
      .set('Authorization', app.auth(adminToken))
      .send({ enabled: false })
      .expect(200)
      .expect((response) => {
        expect(response.body.enabled).toBe(false);
      });
    const channelCategory = await request(app.getHttpServer())
      .post('/api/master-data/channel-categories')
      .set('Authorization', app.auth(adminToken))
      .send({ name: '美西卡车' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({ name: '美西卡车', enabled: true }));
      });
    await request(app.getHttpServer())
      .post('/api/master-data/channel-categories')
      .set('Authorization', app.auth(adminToken))
      .send({ name: '美西卡车' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/master-data/channel-categories')
      .set('Authorization', app.auth(adminToken))
      .send({ name: ' ' })
      .expect(400);
    await request(app.getHttpServer())
      .put(`/api/master-data/channel-categories/${channelCategory.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .send({ name: '美西卡车改' })
      .expect(200)
      .expect((response) => {
        expect(response.body.name).toBe('美西卡车改');
      });
    await request(app.getHttpServer())
      .put(`/api/master-data/channel-categories/${channelCategory.body.id}/enabled`)
      .set('Authorization', app.auth(adminToken))
      .send({ enabled: false })
      .expect(200)
      .expect((response) => {
        expect(response.body.enabled).toBe(false);
      });
    const channel = await request(app.getHttpServer())
      .post('/api/master-data/channels')
      .set('Authorization', app.auth(adminToken))
      .send({
        name: 'M7 Channel',
        carrierId: carrier.body.id,
        businessType: 'EXPRESS',
        category: 'UPS',
        volumeDivisor: 6000,
        multiPieceWeightRule: 'COMPARE_ROUND_THEN_SUM',
        singleWeightRoundingRule: 'HALF_BELOW_HALF_UP',
        settlementWeightRule: 'MAX_ACTUAL_VOLUME',
        settlementWeightRoundingRule: 'LARGE_1_SMALL_0_5',
        largeCargoThresholdKg: 21,
        remoteAreaRule: 'UPS偏远'
      })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          name: 'M7 Channel',
          businessType: 'EXPRESS',
          category: 'UPS',
          volumeDivisor: 6000,
          multiPieceWeightRule: 'COMPARE_ROUND_THEN_SUM',
          singleWeightRoundingRule: 'HALF_BELOW_HALF_UP',
          settlementWeightRule: 'MAX_ACTUAL_VOLUME',
          settlementWeightRoundingRule: 'LARGE_1_SMALL_0_5',
          largeCargoThresholdKg: 21,
          remoteAreaRule: 'UPS偏远'
        }));
      });
    await request(app.getHttpServer())
      .post('/api/master-data/channels')
      .set('Authorization', app.auth(adminToken))
      .send({
        name: 'M7 Auto Carrier Channel',
        carrierId: '',
        carrierName: 'M7 Auto Carrier',
        category: 'DHL'
      })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          name: 'M7 Auto Carrier Channel',
          carrierName: 'M7 Auto Carrier'
        }));
      });

    await request(app.getHttpServer())
      .put(`/api/master-data/channels/${channel.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .send({
        name: 'M7 Channel 改',
        carrierId: carrier.body.id,
        businessType: 'DEDICATED_LINE',
        category: '卡车',
        volumeDivisor: 5000,
        multiPieceWeightRule: 'SUM_THEN_COMPARE',
        singleWeightRoundingRule: 'CEIL',
        settlementWeightRule: 'ACTUAL_ONLY',
        settlementWeightRoundingRule: 'NONE',
        largeCargoThresholdKg: 50,
        remoteAreaRule: '无偏远'
      })
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          name: 'M7 Channel 改',
          businessType: 'DEDICATED_LINE',
          category: '卡车',
          volumeDivisor: 5000,
          singleWeightRoundingRule: 'CEIL',
          settlementWeightRule: 'ACTUAL_ONLY',
          remoteAreaRule: '无偏远'
        }));
      });

    const shipment = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'M7-ROUTE-001',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 2,
        agentWeightKg: 2,
        productName: 'M7 路由产品',
        channelId: 'ch-dhl-hk'
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/shipments/${shipment.body.id}/finance-items`)
      .set('Authorization', app.auth(adminToken))
      .send({ type: 'RECEIVABLE', name: '客户运费', amount: 100, currency: 'RMB' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/shipments/${shipment.body.id}/finance-items`)
      .set('Authorization', app.auth(adminToken))
      .send({ type: 'BUSINESS_COST', name: '业务成本', amount: 60, currency: 'RMB', agentName: 'M7 Agent Ltd.' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/shipments/${shipment.body.id}/finance-items`)
      .set('Authorization', app.auth(adminToken))
      .send({ type: 'PAYABLE', name: '代理运费', amount: 55, currency: 'RMB', agentName: 'M7 Agent Ltd.' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/shipments/${shipment.body.id}/review/approve`)
      .set('Authorization', app.auth(adminToken))
      .send({ businessReview: true })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/shipments/${shipment.body.id}/route`)
      .set('Authorization', app.auth(adminToken))
      .send({ channelId: channel.body.id, agentId: agent.body.id, agentChannelName: 'M7 代理渠道-改', chargeWeightKg: 11, unitPrice: 5, currency: 'RMB' })
      .expect(201)
      .expect((response) => {
        expect(response.body.channelName).toBe('M7 Channel 改');
        expect(response.body.agentName).toBe('M7 Agent Ltd.');
      });
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=shipment.route')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'shipment.route',
            target: shipment.body.id,
            after: expect.objectContaining({
              companyChannelName: 'M7 Channel 改',
              realAgentName: 'M7 Agent Ltd.',
              agentChannelName: 'M7 代理渠道-改',
              payableTotal: 55,
              routedBy: 'admin',
              routedAt: expect.any(String)
            })
          })
        ]));
      });

    const surcharge = await request(app.getHttpServer())
      .post('/api/master-data/surcharges')
      .set('Authorization', app.auth(adminToken))
      .send({ name: 'M7 附加费', amount: 88 })
      .expect(201);
    const fuelRate = await request(app.getHttpServer())
      .post('/api/master-data/fuel-rates')
      .set('Authorization', app.auth(adminToken))
      .send({ channelId: channel.body.id, rate: 0.18, activeAt: '2026-06-06T00:00:00.000Z' })
      .expect(201);
    const exchangeRate = await request(app.getHttpServer())
      .post('/api/master-data/exchange-rates')
      .set('Authorization', app.auth(adminToken))
      .send({ baseCurrency: 'EUR', quoteCurrency: 'RMB', rate: 7.8, activeAt: '2026-06-06T00:00:00.000Z', endAt: '2026-06-30T23:59:59.000Z' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({ baseCurrency: 'EUR', quoteCurrency: 'RMB', rate: 7.8, endAt: '2026-06-30T23:59:59.000Z' }));
      });
    await request(app.getHttpServer())
      .put(`/api/master-data/exchange-rates/${exchangeRate.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .send({ baseCurrency: 'EUR', quoteCurrency: 'RMB', rate: 7.9, activeAt: '2026-06-07T00:00:00.000Z', endAt: '2026-07-31T23:59:59.000Z' })
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({ id: exchangeRate.body.id, baseCurrency: 'EUR', quoteCurrency: 'RMB', rate: 7.9, endAt: '2026-07-31T23:59:59.000Z', enabled: true }));
      });
    await request(app.getHttpServer())
      .delete(`/api/master-data/exchange-rates/${exchangeRate.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.enabled).toBe(false);
      });
    await request(app.getHttpServer())
      .put(`/api/master-data/surcharges/${surcharge.body.id}/enabled`)
      .set('Authorization', app.auth(adminToken))
      .send({ enabled: false })
      .expect(200)
      .expect((response) => {
        expect(response.body.enabled).toBe(false);
      });

    await request(app.getHttpServer())
      .put(`/api/master-data/channels/${channel.body.id}/enabled`)
      .set('Authorization', app.auth(adminToken))
      .send({ enabled: false })
      .expect(200)
      .expect((response) => {
        expect(response.body.enabled).toBe(false);
      });
    await request(app.getHttpServer())
      .put(`/api/master-data/agents/${agent.body.id}/enabled`)
      .set('Authorization', app.auth(adminToken))
      .send({ enabled: false })
      .expect(200)
      .expect((response) => {
        expect(response.body.enabled).toBe(false);
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=master_data.&pageSize=200')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        const rows = response.body.rows as Array<{
          id: string;
          actorId: string;
          actorUsername: string;
          action: string;
          actionLabel: string;
          module: string;
          moduleLabel: string;
          target: string;
          result: string;
          resultLabel: string;
          before?: { enabled?: boolean; rate?: number };
          after?: { enabled?: boolean; rate?: number };
          createdAt: string;
        }>;
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ action: 'master_data.customer.create', target: customer.body.id }),
          expect.objectContaining({ action: 'master_data.customer.update', target: customer.body.id }),
          expect.objectContaining({ action: 'master_data.customer_contact.create', target: customerContact.body.id }),
          expect.objectContaining({ action: 'master_data.customer_contact.update', target: updatedCustomerContact.body.id }),
          expect.objectContaining({ action: 'master_data.customer_user.create', target: customerUser.body.id }),
          expect.objectContaining({ action: 'master_data.agent.create', target: agent.body.id }),
          expect.objectContaining({ action: 'master_data.agent.update', target: agent.body.id }),
          expect.objectContaining({ action: 'master_data.agent_channel.create', target: agentChannel.body.id }),
          expect.objectContaining({ action: 'master_data.agent_channel.update', target: agentChannel.body.id }),
          expect.objectContaining({ action: 'master_data.channel.create', target: channel.body.id }),
          expect.objectContaining({ action: 'master_data.channel.update', target: channel.body.id }),
          expect.objectContaining({ action: 'master_data.channel_category.create', target: channelCategory.body.id }),
          expect.objectContaining({ action: 'master_data.channel_category.update', target: channelCategory.body.id }),
          expect.objectContaining({ action: 'master_data.surcharge.create', target: surcharge.body.id }),
          expect.objectContaining({ action: 'master_data.surcharge.update', target: surcharge.body.id }),
          expect.objectContaining({ action: 'master_data.fuel_rate.create', target: fuelRate.body.id }),
          expect.objectContaining({ action: 'master_data.exchange_rate.create', target: exchangeRate.body.id }),
          expect.objectContaining({ action: 'master_data.exchange_rate.update', target: exchangeRate.body.id })
        ]));
        expect(rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ action: 'master_data.agent_channel.update', target: agentChannel.body.id, before: expect.objectContaining({ enabled: true }), after: expect.objectContaining({ enabled: false }) }),
          expect.objectContaining({ action: 'master_data.channel.update', target: channel.body.id, before: expect.objectContaining({ enabled: true }), after: expect.objectContaining({ enabled: false }) }),
          expect.objectContaining({ action: 'master_data.channel_category.update', target: channelCategory.body.id, before: expect.objectContaining({ enabled: true }), after: expect.objectContaining({ enabled: false }) }),
          expect.objectContaining({ action: 'master_data.surcharge.update', target: surcharge.body.id, before: expect.objectContaining({ enabled: true }), after: expect.objectContaining({ enabled: false }) }),
          expect.objectContaining({ action: 'master_data.exchange_rate.update', target: exchangeRate.body.id, before: expect.objectContaining({ rate: 7.8 }), after: expect.objectContaining({ rate: 7.9 }) }),
          expect.objectContaining({ action: 'master_data.exchange_rate.update', target: exchangeRate.body.id, before: expect.objectContaining({ enabled: true }), after: expect.objectContaining({ enabled: false }) })
        ]));
        const channelUpdateLog = rows.find((row) => row.action === 'master_data.channel.update' && row.target === channel.body.id);
        expect(channelUpdateLog).toEqual(expect.objectContaining({
          id: expect.any(String),
          actorId: expect.any(String),
          actorUsername: 'admin',
          actionLabel: expect.any(String),
          module: 'master_data',
          moduleLabel: expect.any(String),
          result: 'SUCCESS',
          resultLabel: '成功',
          createdAt: expect.any(String)
        }));
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=master_data.channel.update&module=master_data&result=SUCCESS&operator=admin')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.pagination).toEqual(expect.objectContaining({ page: 1, pageSize: 500, totalItems: expect.any(Number) }));
        expect(response.body.dashboard).toEqual(expect.objectContaining({
          generatedAt: expect.any(String),
          metrics: expect.objectContaining({
            total: expect.objectContaining({ value: expect.any(Number), yesterdayValue: expect.any(Number), changePercent: expect.any(Number), trend: expect.any(Array) }),
            failed: expect.objectContaining({ value: expect.any(Number), yesterdayValue: expect.any(Number), changePercent: expect.any(Number), trend: expect.any(Array) }),
            important: expect.objectContaining({ value: expect.any(Number), yesterdayValue: expect.any(Number), changePercent: expect.any(Number), trend: expect.any(Array) }),
            permissionFinance: expect.objectContaining({ value: expect.any(Number), yesterdayValue: expect.any(Number), changePercent: expect.any(Number), trend: expect.any(Array) })
          }),
          recentFailedImportant: expect.any(Array)
        }));
        expect(response.body.dashboard.metrics.total.trend).toHaveLength(14);
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ action: 'master_data.channel.update', target: channel.body.id, actorUsername: 'admin', result: 'SUCCESS' })
        ]));
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=system.')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        const rows = response.body.rows as Array<{ action: string; target: string; after?: unknown }>;
        expect(rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ action: 'system.site.create', target: `site:${site.body.id}` }),
          expect.objectContaining({ action: 'system.site.update', target: `site:${site.body.id}` }),
          expect.objectContaining({ action: 'system.site.enabled', target: `site:${site.body.id}`, after: expect.objectContaining({ enabled: false }) }),
          expect.objectContaining({ action: 'system.staff.create', target: `user:${staffAccount.body.id}` }),
          expect.objectContaining({ action: 'system.staff.site.update', target: `user:${staffAccount.body.id}`, after: { site: 'A5验收站改' } }),
          expect.objectContaining({ action: 'system.staff.password_reset', target: `users:${staffAccount.body.id}` })
        ]));
      });

    const serviceToken = await app.loginAs('service');
    await request(app.getHttpServer())
      .get('/api/master-data')
      .set('Authorization', app.auth(serviceToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.channels).toEqual([]);
        expect(response.body.channelCategories).toEqual([]);
      });
    await request(app.getHttpServer())
      .get('/api/master-data/channels')
      .set('Authorization', app.auth(serviceToken))
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/system/audit-logs')
      .set('Authorization', app.auth(serviceToken))
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/master-data/channels')
      .set('Authorization', app.auth(serviceToken))
      .send({ name: 'Should Fail', carrierId: carrier.body.id })
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/master-data/channel-categories')
      .set('Authorization', app.auth(serviceToken))
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/master-data/channel-categories')
      .set('Authorization', app.auth(serviceToken))
      .send({ name: 'Should Fail' })
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/master-data/agents')
      .set('Authorization', app.auth(serviceToken))
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/master-data/agent-channels')
      .set('Authorization', app.auth(serviceToken))
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/master-data/agents')
      .set('Authorization', app.auth(serviceToken))
      .send({ name: 'Should Fail' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/master-data/agent-channels')
      .set('Authorization', app.auth(serviceToken))
      .send({ agentId: agent.body.id, channelName: 'Should Fail' })
      .expect(403);
    await request(app.getHttpServer())
      .delete('/api/master-data/customers/c-1344')
      .set('Authorization', app.auth(serviceToken))
      .expect(403);
  });

  it('lets business users maintain only their own customer master data', async () => {
    const rSalesLogin = await request(app.getHttpServer()).post('/api/auth/login').send({ username: 'R-sales', password: 'R-sales@123' }).expect(201);
    const rSalesToken = rSalesLogin.body.accessToken as string;

    await request(app.getHttpServer())
      .get('/api/master-data/customers')
      .set('Authorization', app.auth(rSalesToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([expect.objectContaining({ code: '9409', salesperson: 'operator' })]));
        expect(response.body).not.toEqual(expect.arrayContaining([expect.objectContaining({ code: '1344' })]));
        expect(response.body.every((customer: { salesperson?: string }) => ['operator', 'R-sales'].includes(customer.salesperson ?? ''))).toBe(true);
      });

    await request(app.getHttpServer())
      .get('/api/master-data')
      .set('Authorization', app.auth(rSalesToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.customers).toEqual(expect.arrayContaining([expect.objectContaining({ code: '9409', salesperson: 'operator' })]));
        expect(response.body.customers).not.toEqual(expect.arrayContaining([expect.objectContaining({ code: '1344' })]));
        expect(response.body.channels.length).toBeGreaterThan(0);
        expect(response.body.agents).toEqual([]);
        expect(response.body.agentChannels).toEqual([]);
      });

    const ownCustomer = await request(app.getHttpServer())
      .post('/api/master-data/customers')
      .set('Authorization', app.auth(rSalesToken))
      .send({ code: 'A5-RS-001', name: 'R-sales 自建客户', customerType: '直客', salesperson: 'other-sales', defaultSettlementMethod: 'RMB月结' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({ code: 'A5-RS-001', salesperson: 'R-sales' }));
      });
    await request(app.getHttpServer())
      .put(`/api/master-data/customers/${ownCustomer.body.id}`)
      .set('Authorization', app.auth(rSalesToken))
      .send({ code: 'A5-RS-001', name: 'R-sales 自建客户改', customerType: '直客', salesperson: 'other-sales', defaultSettlementMethod: 'RMB月结' })
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({ name: 'R-sales 自建客户改', salesperson: 'R-sales' }));
      });
    const ownContact = await request(app.getHttpServer())
      .post(`/api/master-data/customers/${ownCustomer.body.id}/contacts`)
      .set('Authorization', app.auth(rSalesToken))
      .send({ name: 'R-sales 收货人', phone: '13800000002', address: 'R-sales address' })
      .expect(201);
    await request(app.getHttpServer())
      .put(`/api/master-data/customers/${ownCustomer.body.id}/contacts/${ownContact.body.id}`)
      .set('Authorization', app.auth(rSalesToken))
      .send({ name: 'R-sales 收货人改', phone: '13800000003', address: 'R-sales address update' })
      .expect(200);
    await request(app.getHttpServer())
      .put(`/api/master-data/customers/${ownCustomer.body.id}/enabled`)
      .set('Authorization', app.auth(rSalesToken))
      .send({ enabled: false })
      .expect(200);

    await request(app.getHttpServer())
      .put('/api/master-data/customers/c-1344')
      .set('Authorization', app.auth(rSalesToken))
      .send({ code: '1344', name: 'TILL', customerType: '直客', salesperson: 'jylannie' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/master-data/customers/c-1344/contacts')
      .set('Authorization', app.auth(rSalesToken))
      .send({ name: '越权收货人' })
      .expect(403);
    await request(app.getHttpServer())
      .put('/api/master-data/customers/c-1344/enabled')
      .set('Authorization', app.auth(rSalesToken))
      .send({ enabled: false })
      .expect(403);
    await request(app.getHttpServer())
      .delete('/api/master-data/customers/c-1344')
      .set('Authorization', app.auth(rSalesToken))
      .expect(403);
  });

  it('returns a safe SiliconFlow-compatible AI assist response for logged-in staff', async () => {
    const loginToken = await app.loginAs('admin');

    await request(app.getHttpServer())
      .post('/api/ai/assist')
      .set('Authorization', app.auth(loginToken))
      .send({ module: '轨迹监控', task: '生成客户说明', prompt: '9064656160 已 9 天未更新' })
      .expect(201)
      .expect((response) => {
        expect(response.body.provider).toBe('siliconflow');
        expect(response.body.mode).toBe('mock');
        expect(response.body.content).toContain('轨迹监控');
        expect(response.body.content).toContain('9064656160');
      });

    await request(app.getHttpServer())
      .post('/api/ai/assist')
      .set('Authorization', app.auth(loginToken))
      .send({ scenario: '权限体检', prompt: '检查角色权限边界' })
      .expect(201)
      .expect((response) => {
        expect(response.body.content).not.toContain('undefined');
        expect(response.body.content).toContain('权限体检');
      });
  });
});
