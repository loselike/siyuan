import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('Siyuan API finance', () => {
  const app = setupE2eApp();
  const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64');

  it('returns a permission-cropped finance dashboard', async () => {
    const adminToken = await app.loginAs('admin');
    const warehouseToken = await app.loginAs('warehouse');

    await request(app.getHttpServer())
      .get('/api/finance/dashboard')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(Array.isArray(response.body.kpis)).toBe(true);
        expect(Array.isArray(response.body.todos)).toBe(true);
        expect(Array.isArray(response.body.exceptions)).toBe(true);
        expect(Array.isArray(response.body.quickActions)).toBe(true);
        expect(response.body.quickActions).toEqual(expect.arrayContaining([
          expect.objectContaining({ title: '应收审核', sectionKey: 'receivables' })
        ]));
        expect(JSON.stringify(response.body)).not.toMatch(/bankAccountNo|payerBank|payeeBank|profit|付款方账号/);
      });

    await request(app.getHttpServer())
      .get('/api/finance/dashboard')
      .set('Authorization', app.auth(warehouseToken))
      .expect(403);
  });

  it('keeps warehouse packages unbound for finance-entry drafts and binds them only on submit', async () => {
    const adminToken = await app.loginAs('admin');
    const token = adminToken;

    const draftPackage = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(token))
      .send({
        customerCode: 'DRFT1399',
        customerOrderNo: 'DRFT1399',
        domesticTrackingNo: 'KYDRAFT0000001',
        expectedTotalPackageCount: 2,
        packageIndex: 1,
        packageCount: 1,
        weightKg: 10,
        lengthCm: 100,
        widthCm: 50,
        heightCm: 50,
        scanTime: '2026-06-12T10:00:00.000+08:00',
        remark: '草稿快照测试'
      })
      .expect((response) => expect(response.status, response.body.message).toBe(201));

    const draftShipment = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(token))
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'DRAFT-PKG-SNAPSHOT',
        systemOrderNo: 'SYDRAFT-PKG-SNAPSHOT',
        businessType: 'DEDICATED_LINE',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 10,
        agentWeightKg: 10,
        channelId: 'ch-dhl-hk',
        initialStatus: 'DRAFT',
        draftWarehousePackageIds: [draftPackage.body.id],
        bindWarehousePackages: false
      })
      .expect(201);

    expect(draftShipment.body.draftWarehousePackageIds).toEqual([draftPackage.body.id]);

    await request(app.getHttpServer())
      .get('/api/shipments/order-entry/packages')
      .query({ customerCode: 'DRFT1399' })
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: draftPackage.body.id })]));
      });

    await request(app.getHttpServer())
      .get('/api/warehouse/packages')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        const packageAfterDraft = response.body.find((pkg: { id: string }) => pkg.id === draftPackage.body.id);
        expect(packageAfterDraft).toBeDefined();
        expect(packageAfterDraft.systemOrderNo ?? null).toBeNull();
      });

    const submitPackage = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(token))
      .send({
        customerCode: 'SUB1399',
        customerOrderNo: 'SUB1399',
        domesticTrackingNo: 'KYSUBMIT000001',
        expectedTotalPackageCount: 1,
        packageIndex: 1,
        packageCount: 1,
        weightKg: 12,
        lengthCm: 120,
        widthCm: 45,
        heightCm: 48,
        scanTime: '2026-06-12T10:10:00.000+08:00',
        remark: '提交绑定测试'
      })
      .expect(201);

    const submittedShipment = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(token))
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'SUBMIT-PKG-BIND',
        systemOrderNo: 'SYSUBMIT-PKG-BIND',
        businessType: 'DEDICATED_LINE',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 12,
        agentWeightKg: 12,
        channelId: 'ch-dhl-hk',
        initialStatus: 'DRAFT',
        warehousePackageIds: [submitPackage.body.id],
        bindWarehousePackages: true
      })
      .expect(201);

    expect(submittedShipment.body.draftWarehousePackageIds).toEqual([]);

    await request(app.getHttpServer())
      .get('/api/warehouse/packages')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: submitPackage.body.id,
            systemOrderNo: 'SYSUBMIT-PKG-BIND'
          })
        ]));
      });
  });

  it('auto-matches a later arrived water receipt to one unmatched order receivable', async () => {
    const adminToken = await app.loginAs('admin');
    const suffix = Date.now();
    const customer = await request(app.getHttpServer())
      .post('/api/master-data/customers')
      .set('Authorization', app.auth(adminToken))
      .send({ code: `AUTO${suffix}`, name: '水单自动匹配客户' })
      .expect(201);
    const order = await request(app.getHttpServer())
      .post('/api/shipments/order-entry')
      .set('Authorization', app.auth(adminToken))
      .send({
        shipment: {
          customerCode: customer.body.code,
          customerOrderNo: `AUTO-ORDER-${suffix}`,
          systemOrderNo: `SYAUTO${suffix}`,
          businessType: 'EXPRESS',
          packageType: 'WPX',
          destinationCountry: '美国',
          channelId: 'ch-dhl-hk',
          declarationRequired: false,
          cargoType: '普货',
          productName: '后置水单匹配货物',
          settlementMethod: 'RMB月结',
          packageCount: 1,
          actualWeightKg: 5,
          volumeCbm: 0.01,
          chargeableWeightKg: 5,
          cargoDataSource: 'MANUAL_ADJUSTED',
          chargeWeightOverridden: true
        },
        warehousePackageIds: [],
        receivables: [{ type: 'RECEIVABLE', name: '运费', amount: 321, currency: 'RMB', settlementMethod: 'RMB月结' }],
        businessCosts: [{ type: 'BUSINESS_COST', name: '业务员成本', amount: 100, currency: 'RMB' }],
        submitForReview: true
      })
      .expect(201);
    expect(order.body.receivables[0]).toEqual(expect.objectContaining({ receiptStatus: 'UNPAID' }));
    const receipt = await request(app.getHttpServer())
      .post('/api/finance/water-receipts')
      .set('Authorization', app.auth(adminToken))
      .send({ customerCode: customer.body.code, receiptMethod: '思远阿里', receiptDate: '2026-07-12', currency: 'RMB', amount: 321, paymentNo: `AUTO-RECEIPT-${suffix}` })
      .expect(201);
    const arrived = await request(app.getHttpServer())
      .post(`/api/finance/water-receipts/${receipt.body.id}/mark-arrived`)
      .set('Authorization', app.auth(adminToken))
      .send({})
      .expect(201);
    expect(arrived.body).toEqual(expect.objectContaining({ balance: 0, status: 'ARCHIVED' }));
    expect(arrived.body.matches).toEqual(expect.arrayContaining([
      expect.objectContaining({ receivableFinanceItemId: order.body.receivables[0].id, amount: 321, source: 'AUTO' })
    ]));
    await request(app.getHttpServer())
      .get(`/api/shipments/${order.body.shipment.id}/order-entry`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.receivables).toEqual(expect.arrayContaining([
          expect.objectContaining({ id: order.body.receivables[0].id, paymentNo: receipt.body.receiptNo, receiptMatchSource: 'AUTO', receiptStatus: 'RECEIVED' })
        ]));
      });
  });

  it('submits an order entry for review when company-channel pricing is missing', async () => {
    const adminToken = await app.loginAs('admin');
    const suffix = Date.now();
    const response = await request(app.getHttpServer())
      .post('/api/shipments/order-entry')
      .set('Authorization', app.auth(adminToken))
      .send({
        shipment: {
          customerCode: '9409', customerOrderNo: `DRAFT-RATE-${suffix}`, systemOrderNo: `SYDRAFTRATE${suffix}`,
          businessType: 'EXPRESS', packageType: 'WPX', destinationCountry: '美国', channelId: 'ch-usps',
          declarationRequired: false, cargoType: '普货', productName: '费率待完善货物', settlementMethod: 'RMB月结',
          packageCount: 1, actualWeightKg: 2, volumeCbm: 0.01, chargeableWeightKg: 2, cargoDataSource: 'MANUAL_ADJUSTED', chargeWeightOverridden: true
        },
        warehousePackageIds: [],
        receivables: [{ type: 'RECEIVABLE', name: '运费', amount: 50, currency: 'RMB' }],
        businessCosts: [{ type: 'BUSINESS_COST', name: '业务员成本', amount: 20, currency: 'RMB' }],
        submitForReview: true
      })
      .expect(201);
    expect(response.body.shipment).toEqual(expect.objectContaining({ status: 'REVIEW_PENDING' }));
    expect(response.body.shipment).not.toHaveProperty('reviewRejectedReason');
    await request(app.getHttpServer())
      .get('/api/shipments/review-pending')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((pending) => expect(pending.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: response.body.shipment.id })])));
  });

  it('creates order-entry drafts without binding packages and submits complete entries to review', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');
    const token = adminToken;

    const draftPackage = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(token))
      .send({
        customerCode: '9409',
        customerOrderNo: 'ORDER-ENTRY-DRAFT',
        domesticTrackingNo: 'KYENTDRAFT001',
        expectedTotalPackageCount: 1,
        packageIndex: 1,
        packageCount: 1,
        weightKg: 8,
        lengthCm: 60,
        widthCm: 50,
        heightCm: 40,
        scanTime: '2026-06-25T10:00:00.000+08:00'
      })
      .expect(201);

    const draft = await request(app.getHttpServer())
      .post('/api/shipments/order-entry')
      .set('Authorization', app.auth(token))
      .send({
        shipment: {
          customerCode: '9409',
          customerOrderNo: 'ORDER-ENTRY-DRAFT',
          businessType: 'DEDICATED_LINE',
          packageType: 'WPX',
          destinationCountry: '美国',
          declarationRequired: false,
          cargoType: '普货',
          productName: '服饰',
          settlementMethod: '思远阿里',
          remark: '草稿备注'
        },
        warehousePackageIds: [draftPackage.body.id],
        receivables: [{ type: 'RECEIVABLE', name: '运费', amount: 100, currency: 'RMB', settlementMethod: '思远阿里' }],
        businessCosts: [{ type: 'BUSINESS_COST', name: '业务员成本', amount: 80, currency: 'RMB', chargeWeightKg: 20, unitPrice: 4 }],
        submitForReview: false
      })
      .expect(201);

    expect(draft.body.shipment.status).toBe('DRAFT');
    expect(draft.body.shipment.draftWarehousePackageIds).toEqual([draftPackage.body.id]);
    expect(draft.body.shipment.remark).toBe('草稿备注');
    expect(draft.body.receivables).toHaveLength(1);

    await request(app.getHttpServer())
      .get('/api/warehouse/packages')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        const packageAfterDraft = response.body.find((pkg: { id: string }) => pkg.id === draftPackage.body.id);
        expect(packageAfterDraft.systemOrderNo ?? null).toBeNull();
      });

    const submitPackage = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(token))
      .send({
        customerCode: '9409',
        customerOrderNo: 'ORDER-ENTRY-SUBMIT',
        domesticTrackingNo: 'KYENTSUB001',
        expectedTotalPackageCount: 1,
        packageIndex: 1,
        packageCount: 1,
        weightKg: 9,
        lengthCm: 60,
        widthCm: 50,
        heightCm: 60,
        scanTime: '2026-06-25T10:10:00.000+08:00'
      })
      .expect(201);

    const createdReceipt = await request(app.getHttpServer())
      .post('/api/finance/water-receipts')
      .set('Authorization', app.auth(token))
      .send({
        customerCode: '9409',
        receiptMethod: '招商银行',
        receiptDate: '2026-06-25T10:05:00.000+08:00',
        amount: 500,
        currency: 'USD',
        paymentNo: 'ORDER-ENTRY-RECEIPT'
      })
      .expect(201);

    const arrivedReceipt = await request(app.getHttpServer())
      .post(`/api/finance/water-receipts/${createdReceipt.body.id}/mark-arrived`)
      .set('Authorization', app.auth(token))
      .send({})
      .expect(201);
    const receipt = arrivedReceipt.body;
    expect(receipt.currency).toBe('USD');

    await request(app.getHttpServer())
      .post('/api/finance/voucher-images')
      .set('Authorization', app.auth(token))
      .field('context', 'WATER_RECEIPT')
      .field('waterReceiptId', receipt.id)
      .attach('file', tinyPng, { filename: 'water-receipt.png', contentType: 'image/png' })
      .expect(201)
      .expect((response) => {
        expect(response.body.url).toContain('/api/uploads/vouchers/');
        expect(response.body.mimeType).toBe('image/png');
      });

    const mismatchPackage = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(token))
      .send({
        customerCode: '9409',
        customerOrderNo: 'ORDER-ENTRY-MISMATCH',
        domesticTrackingNo: 'KYENTBAD001',
        expectedTotalPackageCount: 1,
        packageIndex: 1,
        packageCount: 1,
        weightKg: 7,
        lengthCm: 50,
        widthCm: 40,
        heightCm: 30,
        scanTime: '2026-06-25T10:12:00.000+08:00'
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/shipments/order-entry')
      .set('Authorization', app.auth(token))
      .send({
        shipment: {
          customerCode: '9409',
          customerOrderNo: 'ORDER-ENTRY-MISMATCH',
          systemOrderNo: 'SYORDERENTRYBAD01',
          businessType: 'DEDICATED_LINE',
          packageType: 'WPX',
          destinationCountry: '美国',
          declarationRequired: false,
          cargoType: '普货',
          productName: '配件',
          settlementMethod: '思远阿里'
        },
        warehousePackageIds: [mismatchPackage.body.id],
        receivables: [{ type: 'RECEIVABLE', name: '运费', amount: 120, currency: 'RMB', settlementMethod: '思远阿里', receiptId: receipt.id, receiptMatchAmount: 100 }],
        businessCosts: [{ type: 'BUSINESS_COST', name: '业务员成本', amount: 90, currency: 'RMB', chargeWeightKg: 30, unitPrice: 3 }],
        submitForReview: true
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/shipments/order-entry')
      .set('Authorization', app.auth(token))
      .send({
        shipment: {
          customerCode: '9409',
          customerOrderNo: 'ORDER-ENTRY-BAD-TRK',
          systemOrderNo: 'SYORDERENTRYBADTRK',
          transferNo: 'TRK-ORDER-ENTRY',
          businessType: 'DEDICATED_LINE',
          packageType: 'WPX',
          destinationCountry: '美国',
          declarationRequired: false,
          cargoType: '普货',
          productName: '配件',
          settlementMethod: '思远阿里'
        },
        warehousePackageIds: [submitPackage.body.id],
        receivables: [{ type: 'RECEIVABLE', name: '运费', amount: 120, currency: 'USD', settlementMethod: '思远阿里' }],
        businessCosts: [{ type: 'BUSINESS_COST', name: '业务员成本', amount: 90, currency: 'RMB', agentName: '宇环', chargeWeightKg: 30, unitPrice: 3 }],
        submitForReview: true
      })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('录单阶段不能填写转单号');
      });

    const submitted = await request(app.getHttpServer())
      .post('/api/shipments/order-entry')
      .set('Authorization', app.auth(token))
      .send({
        shipment: {
          customerCode: '9409',
          customerOrderNo: 'ORDER-ENTRY-SUBMIT',
          systemOrderNo: 'SYORDERENTRY0001',
          subOrderNo: 'SUB-ORDER-ENTRY',
          businessType: 'DEDICATED_LINE',
          packageType: 'WPX',
          destinationCountry: '美国',
          receivingChannel: 'DHL HK',
          declarationRequired: true,
          sensitive: false,
          cargoType: '普货',
          productName: '配件',
          settlementMethod: '思远阿里',
          tradeTerms: 'DDP',
          fbaInboundNo: 'FBA-ORDER-ENTRY',
          remark: '提交备注'
        },
        warehousePackageIds: [submitPackage.body.id],
        receivables: [{ type: 'RECEIVABLE', name: '运费', amount: 120, currency: 'USD', settlementMethod: '思远阿里', receiptId: receipt.id, receiptMatchAmount: 100 }],
        businessCosts: [{ type: 'BUSINESS_COST', name: '业务员成本', amount: 90, currency: 'RMB', agentName: '宇环', chargeWeightKg: 30, unitPrice: 3 }],
        payables: [{ type: 'PAYABLE', name: '代理成本', amount: 70, currency: 'RMB', agentName: '宇环', chargeWeightKg: 30, unitPrice: 2.33 }],
        submitForReview: true
      })
      .expect(201);

    expect(submitted.body.shipment.status).toBe('REVIEW_PENDING');
    expect(submitted.body.shipment.systemOrderNo).toBe('SYORDERENTRY0001');
    expect(submitted.body.shipment.entryAt).toBeDefined();
    expect(submitted.body.shipment.subOrderNo).toBe('SUB-ORDER-ENTRY');
    expect(submitted.body.shipment.remark).toBe('提交备注');
    expect(submitted.body.shipment.packageCount).toBe(1);
    expect(submitted.body.shipment.receivableWeightKg).toBe(30);
    expect(submitted.body.shipment.volumeCbm).toBe(0.18);
    expect(submitted.body.packages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: submitPackage.body.id,
        combinedOrderNo: 'ORDER-ENTRY-SUBMIT-KYENTSUB001',
        packageCount: 1,
        weightKg: 9,
        lengthCm: 60,
        widthCm: 50,
        heightCm: 60,
        cbm: 0.18,
        chargeableWeightKg: 30
      })
    ]));
    expect(submitted.body.receivables).toHaveLength(1);
    expect(submitted.body.receivables[0]).toEqual(expect.objectContaining({ paymentNo: receipt.receiptNo, receivedAmount: 100, receiptStatus: 'PARTIAL' }));
    expect(submitted.body.businessCosts).toHaveLength(1);
    expect(submitted.body.businessCosts[0].agentName).toBe('宇环');
    expect(submitted.body.payables).toHaveLength(1);

    await request(app.getHttpServer())
      .get(`/api/shipments/${submitted.body.shipment.id}/order-entry`)
      .set('Authorization', app.auth(operatorToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.receivables).toHaveLength(1);
        expect(response.body.businessCosts).toHaveLength(1);
        expect(response.body.payables).toEqual(expect.arrayContaining([expect.objectContaining({ name: '代理成本', amount: 69.9 })]));
        expect(response.body.payables[0].agentName).toBeUndefined();
        expect(response.body.canViewPayables).toBe(true);
      });

    await request(app.getHttpServer())
      .get('/api/warehouse/packages')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([
          expect.objectContaining({ id: submitPackage.body.id, systemOrderNo: 'SYORDERENTRY0001' })
        ]));
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=shipment.order_entry.submit')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'shipment.order_entry.submit',
            after: expect.objectContaining({
              warehousePackageIds: [submitPackage.body.id],
              combinedOrderNos: ['ORDER-ENTRY-SUBMIT-KYENTSUB001'],
              customerCode: '9409',
              packageCount: 1,
              weightKg: 9,
              volumeCbm: 0.18,
              chargeWeightKg: 30,
              destinationCountry: '美国',
              salesperson: 'admin',
              businessChannel: 'DHL HK',
              cargoSummary: expect.objectContaining({ cargoType: '普货', productName: '配件', remark: '提交备注' }),
              entryBy: 'admin',
              financeItemCount: 3
            })
          })
        ]));
      });
  });

  it('rejects incomplete order-entry submissions and operator payable leakage', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');

    const duplicatePackage = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerCode: '9409',
        customerOrderNo: 'ORDER-ENTRY-DUP',
        domesticTrackingNo: 'KYENTDUP001',
        expectedTotalPackageCount: 1,
        packageIndex: 1,
        packageCount: 1,
        weightKg: 6,
        lengthCm: 50,
        widthCm: 40,
        heightCm: 30,
        scanTime: '2026-06-25T10:15:00.000+08:00'
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/shipments/order-entry')
      .set('Authorization', app.auth(adminToken))
      .send({
        shipment: {
          customerCode: '9409',
          customerOrderNo: 'ORDER-ENTRY-DUP',
          systemOrderNo: 'SYGJ06061230001',
          businessType: 'DEDICATED_LINE',
          packageType: 'WPX',
          destinationCountry: '美国',
          declarationRequired: false,
          cargoType: '普货',
          productName: '配件',
          settlementMethod: '思远阿里'
        },
        warehousePackageIds: [duplicatePackage.body.id],
        receivables: [{ type: 'RECEIVABLE', name: '运费', amount: 100, currency: 'RMB' }],
        businessCosts: [{ type: 'BUSINESS_COST', name: '业务员成本', amount: 80, currency: 'RMB' }],
        submitForReview: true
      })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('出货单号 SYGJ06061230001 已存在');
      });

    await request(app.getHttpServer())
      .post('/api/shipments/order-entry')
      .set('Authorization', app.auth(adminToken))
      .send({
        shipment: {
          customerCode: '9409',
          customerOrderNo: 'ORDER-ENTRY-INVALID',
          businessType: 'DEDICATED_LINE',
          packageType: 'WPX',
          destinationCountry: '美国',
          declarationRequired: false,
          productName: '配件',
          settlementMethod: '思远阿里'
        },
        warehousePackageIds: [],
        receivables: [],
        businessCosts: [],
        submitForReview: true
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.shipment).toEqual(expect.objectContaining({ status: 'DRAFT' }));
        expect(response.body.shipment.reviewRejectedReason).toBeTruthy();
      });

    const operatorPackage = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerCode: '9409',
        customerOrderNo: 'ORDER-ENTRY-OPERATOR',
        domesticTrackingNo: 'KYENTOP001',
        expectedTotalPackageCount: 1,
        packageIndex: 1,
        packageCount: 1,
        weightKg: 6,
        lengthCm: 50,
        widthCm: 40,
        heightCm: 30,
        scanTime: '2026-06-25T10:20:00.000+08:00'
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/shipments/order-entry')
      .set('Authorization', app.auth(operatorToken))
      .send({
        shipment: {
          customerCode: '9409',
          customerOrderNo: 'ORDER-ENTRY-OPERATOR',
          businessType: 'DEDICATED_LINE',
          packageType: 'WPX',
          destinationCountry: '美国',
          declarationRequired: false,
          cargoType: '普货',
          productName: '配件',
          settlementMethod: '思远阿里'
        },
        warehousePackageIds: [operatorPackage.body.id],
        receivables: [{ type: 'RECEIVABLE', name: '运费', amount: 100, currency: 'RMB' }],
        businessCosts: [{ type: 'BUSINESS_COST', name: '业务员成本', amount: 80, currency: 'RMB' }],
        payables: [{ type: 'PAYABLE', name: '代理成本', amount: 70, currency: 'RMB', agentName: '宇环' }],
        submitForReview: true
      })
      .expect(403);
  });

  it('allows finance users to read receivables', async () => {
    const loginToken = await app.loginAs('finance');

    await request(app.getHttpServer())
      .get('/api/finance/receivables')
      .set('Authorization', app.auth(loginToken))
      .expect(200)
      .expect((response) => {
        expect(response.body[0].amount).toBeGreaterThan(0);
      });
  });

  it('keeps finance catalog endpoints stable after moving them out of DataController', async () => {
    const token = await app.loginAs('admin');
    const financeToken = await app.loginAs('finance');
    const operatorToken = await app.loginAs('operator');
    const name = `架构拆分测试费用-${Date.now()}`;

    await request(app.getHttpServer())
      .get('/api/finance/catalog?category=FEE_NAME&enabledOnly=true')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toEqual(expect.arrayContaining([expect.objectContaining({ category: 'FEE_NAME', name: '运费' })]));
      });

    await request(app.getHttpServer())
      .get('/api/finance/catalog?category=FEE_NAME&enabledOnly=true')
      .set('Authorization', app.auth(financeToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toEqual(expect.arrayContaining([expect.objectContaining({ category: 'FEE_NAME', name: '运费' })]));
      });

    await request(app.getHttpServer())
      .get('/api/finance/catalog?category=FEE_NAME&enabledOnly=true')
      .set('Authorization', app.auth(operatorToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toEqual(expect.arrayContaining([expect.objectContaining({ category: 'FEE_NAME', name: '运费' })]));
      });

    await request(app.getHttpServer())
      .post('/api/finance/catalog')
      .set('Authorization', app.auth(operatorToken))
      .send({ category: 'FEE_NAME', name: `业务不可写-${Date.now()}`, currency: 'RMB' })
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/finance/catalog')
      .set('Authorization', app.auth(token))
      .send({ category: 'FEE_NAME', name, currency: 'RMB', remark: '模块化拆分回归' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({ category: 'FEE_NAME', name, currency: 'RMB', enabled: true }));
      });

    const productName = `录单品名-${Date.now()}`;
    const product = await request(app.getHttpServer())
      .post('/api/finance/catalog')
      .set('Authorization', app.auth(token))
      .send({ category: 'PRODUCT_NAME', name: productName, enabled: true })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({ category: 'PRODUCT_NAME', name: productName, enabled: true }));
      });

    await request(app.getHttpServer())
      .delete(`/api/finance/catalog/${encodeURIComponent(product.body.id)}`)
      .set('Authorization', app.auth(operatorToken))
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/api/finance/catalog/${encodeURIComponent(product.body.id)}`)
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({ id: product.body.id, deleted: true });
      });

    await request(app.getHttpServer())
      .get(`/api/finance/catalog?category=PRODUCT_NAME&keyword=${encodeURIComponent(productName)}`)
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toEqual([]);
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=finance.catalog.delete')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'finance.catalog.delete',
            target: `financeCatalogItem:${product.body.id}`,
            before: expect.objectContaining({ category: 'PRODUCT_NAME', name: productName })
          })
        ]));
      });

    await request(app.getHttpServer())
      .get(`/api/finance/catalog?category=FEE_NAME&keyword=${encodeURIComponent(name)}`)
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toEqual(expect.arrayContaining([expect.objectContaining({ name })]));
      });
  });

  it('syncs agent bank accounts to payee bank accounts for payment applications 收款银行', async () => {
    const adminToken = await app.loginAs('admin');
    const warehouseToken = await app.loginAs('warehouse');
    const agentName = `三账代理-${Date.now()}`;

    const savedBank = await request(app.getHttpServer())
      .post('/api/finance/agent-bank-accounts')
      .set('Authorization', app.auth(adminToken))
      .send({
        agentName,
        accountName: '三账代理 RMB 户',
        bankName: '招商银行深圳分行',
        bankAccountNo: 'RMB-AGENT-001',
        currency: 'RMB',
        remark: '代理资料账户一'
      })
      .expect(201);
    expect(savedBank.body.enabled).toBe(true);
    expect(savedBank.body.bankAccountNo).toBe('RMB-AGENT-001');

    const payeeBanks = await request(app.getHttpServer())
      .get(`/api/finance/payee-bank-accounts?agentName=${encodeURIComponent(agentName)}&currency=RMB`)
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    expect(payeeBanks.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ agentName, accountName: '三账代理 RMB 户', bankAccountNo: 'RMB-AGENT-001', currency: 'RMB', enabled: true })
    ]));

    await request(app.getHttpServer())
      .post('/api/finance/agent-bank-accounts')
      .set('Authorization', app.auth(warehouseToken))
      .send({
        agentName,
        accountName: '越权户',
        bankName: '越权银行',
        bankAccountNo: 'DENIED-001',
        currency: 'RMB'
      })
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/finance/agent-bank-accounts')
      .set('Authorization', app.auth(adminToken))
      .send({
        ...savedBank.body,
        enabled: false
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.enabled).toBe(false);
      });

    const activePayeeBanks = await request(app.getHttpServer())
      .get(`/api/finance/payee-bank-accounts?agentName=${encodeURIComponent(agentName)}&currency=RMB`)
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    expect(activePayeeBanks.body).toEqual([]);

    const allAgentBanks = await request(app.getHttpServer())
      .get(`/api/finance/agent-bank-accounts?agentName=${encodeURIComponent(agentName)}&includeDisabled=true`)
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    expect(allAgentBanks.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: savedBank.body.id, enabled: false, bankAccountNo: 'RMB-AGENT-001' })
    ]));
  });

  it('audits and reverse-audits receivable rows from the finance review center', async () => {
    const financeToken = await app.loginAs('finance');

    const audits = await request(app.getHttpServer())
      .get('/api/finance/receivable-audits')
      .set('Authorization', app.auth(financeToken))
      .expect(200);

    expect(audits.body.pagination.totalItems).toBeGreaterThan(0);
    expect(audits.body.totals.rmbTotal).toBeGreaterThan(0);
    expect(audits.body.rows[0]).toEqual(expect.objectContaining({
      salesperson: expect.any(String),
      customerCode: expect.any(String),
      systemOrderNo: expect.any(String),
      currency: expect.any(String),
      reconciliationStatus: 'PENDING',
      sourceType: expect.any(String),
      rmbAmount: expect.any(Number),
      orderRmbTotal: expect.any(Number)
    }));

    const target = audits.body.rows.find((row: { receiptStatus?: string; receivedAmount?: number }) => !row.receiptStatus || row.receiptStatus === 'UNPAID' || !row.receivedAmount);
    expect(target).toBeTruthy();
    if (!target) throw new Error('未找到可反审核的未收款应收行');
    await request(app.getHttpServer())
      .post(`/api/finance/receivable-audits/${target.id}/audit`)
      .set('Authorization', app.auth(financeToken))
      .expect(201)
      .expect((response) => {
        expect(response.body.reconciliationStatus).toBe('CONFIRMED');
        expect(response.body.reviewedBy).toBe('finance');
        expect(response.body.reviewedAt).toBeTruthy();
      });

    await request(app.getHttpServer())
      .post(`/api/finance/receivable-audits/${target.id}/reverse-audit`)
      .set('Authorization', app.auth(financeToken))
      .expect(201)
      .expect((response) => {
        expect(response.body.reconciliationStatus).toBe('PENDING');
        expect(response.body.reviewedBy).toBeUndefined();
      });
  });

  it('matches system generated receivables with arrived water receipts and blocks reverse before unmatch', async () => {
    const adminToken = await app.loginAs('admin');

    const audits = await request(app.getHttpServer())
      .get('/api/finance/receivable-audits?systemOrderNo=SYGJ06059409051')
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    const systemReceivable = audits.body.rows.find((row: { sourceType?: string; receiptStatus?: string }) => row.sourceType === 'SYSTEM' && row.receiptStatus !== 'RECEIVED');
    expect(systemReceivable).toBeTruthy();
    if (!systemReceivable) throw new Error('未找到系统自动应收');

    await request(app.getHttpServer())
      .post(`/api/finance/receivable-audits/${systemReceivable.id}/audit`)
      .set('Authorization', app.auth(adminToken))
      .expect(201);

    const submittedMatch = await request(app.getHttpServer())
      .post('/api/finance/water-receipts/wr-al-seed-9409/match-orders')
      .set('Authorization', app.auth(adminToken))
      .send({ matches: [{ receivableFinanceItemId: systemReceivable.id, amount: 100 }] })
      .expect(201);
    const pendingAllocation = submittedMatch.body.allocations.find((allocation: { receivableId?: string }) => allocation.receivableId === systemReceivable.id);
    expect(pendingAllocation).toEqual(expect.objectContaining({
      receivableId: systemReceivable.id,
      receivableSourceType: 'SYSTEM',
      amount: 100,
      status: 'PENDING'
    }));
    expect(submittedMatch.body.matches).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ receivableFeeId: systemReceivable.id, amount: 100 })
    ]));

    await request(app.getHttpServer())
      .post(`/api/finance/receivable-match-requests/${pendingAllocation.requestId}/approve`)
      .set('Authorization', app.auth(adminToken))
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          id: systemReceivable.id,
          receivedAmount: 100,
          receiptStatus: 'PARTIAL'
        }));
      });

    await request(app.getHttpServer())
      .get('/api/finance/receivable-audits?systemOrderNo=SYGJ06059409051')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: systemReceivable.id,
            sourceType: 'SYSTEM',
            paymentNo: 'SD20260601001',
            matchedReceiptNo: 'SD20260601001',
            receivedAmount: 100,
            receiptStatus: 'PARTIAL'
          })
        ]));
      });

    await request(app.getHttpServer())
      .post(`/api/finance/receivable-audits/${systemReceivable.id}/reverse-audit`)
      .set('Authorization', app.auth(adminToken))
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('撤销匹配');
      });

    await request(app.getHttpServer())
      .post(`/api/finance/receivable-match-requests/${pendingAllocation.requestId}/reverse-audit`)
      .set('Authorization', app.auth(adminToken))
      .send({ reason: '系统应收匹配回归' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          id: systemReceivable.id,
          receiptStatus: 'UNPAID',
          receivedAmount: 0
        }));
      });

    await request(app.getHttpServer())
      .delete(`/api/finance/receivable-match-requests/${pendingAllocation.requestId}`)
      .set('Authorization', app.auth(adminToken))
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/finance/receivable-audits/${systemReceivable.id}/reverse-audit`)
      .set('Authorization', app.auth(adminToken))
      .expect(201)
      .expect((response) => {
        expect(response.body.reconciliationStatus).toBe('PENDING');
        expect(response.body.receiptStatus).toBe('UNPAID');
      });
  });

  it('prevents editing or deleting audited receivable finance items until reverse-audited', async () => {
    const adminToken = await app.loginAs('admin');

    const shipment = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'RECEIVABLE-AUDIT-001',
        systemOrderNo: 'SYRECAUDIT001',
        businessType: 'DEDICATED_LINE',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 10,
        agentWeightKg: 10,
        channelId: 'ch-dhl-hk',
        initialStatus: 'DRAFT',
        latestTracking: '应收审核测试单'
      })
      .expect(201);

    const receivable = await request(app.getHttpServer())
      .post(`/api/shipments/${shipment.body.id}/finance-items`)
      .set('Authorization', app.auth(adminToken))
      .send({ type: 'RECEIVABLE', name: '测试应收', amount: 500, currency: 'USD' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/finance/receivable-audits/${receivable.body.id}/audit`)
      .set('Authorization', app.auth(adminToken))
      .expect(201);

    await request(app.getHttpServer())
      .put(`/api/shipments/${shipment.body.id}/finance-items/${receivable.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .send({ amount: 520 })
      .expect(400);

    await request(app.getHttpServer())
      .delete(`/api/shipments/${shipment.body.id}/finance-items/${receivable.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/finance/receivable-audits/${receivable.body.id}/reverse-audit`)
      .set('Authorization', app.auth(adminToken))
      .expect(201);

    await request(app.getHttpServer())
      .put(`/api/shipments/${shipment.body.id}/finance-items/${receivable.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .send({ amount: 520 })
      .expect(200);
  });

  it('manages business cost audits and calculates business profit from receivables', async () => {
    const adminToken = await app.loginAs('admin');
    const pkg = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerCode: '9409',
        customerOrderNo: 'BUSINESS-COST-AUDIT-001',
        domesticTrackingNo: 'KYBIZCOST001',
        expectedTotalPackageCount: 1,
        packageIndex: 1,
        packageCount: 1,
        weightKg: 20,
        lengthCm: 60,
        widthCm: 40,
        heightCm: 30,
        scanTime: '2026-06-25T09:00:00.000+08:00'
      })
      .expect(201);

    const entry = await request(app.getHttpServer())
      .post('/api/shipments/order-entry')
      .set('Authorization', app.auth(adminToken))
      .send({
        shipment: {
          customerCode: '9409',
          customerOrderNo: 'BUSINESS-COST-AUDIT-001',
          systemOrderNo: 'SYBIZCOST001',
          businessType: 'DEDICATED_LINE',
          packageType: 'WPX',
          destinationCountry: '美国',
          declarationRequired: false,
          cargoType: '普货',
          productName: '业务成本审核测试单',
          settlementMethod: 'RMB月结',
          channelId: 'ch-dhl-hk'
        },
        warehousePackageIds: [pkg.body.id],
        receivables: [{ type: 'RECEIVABLE', name: '运费', amount: 1000, currency: 'RMB' }],
        businessCosts: [{ type: 'BUSINESS_COST', name: '业务员成本', amount: 200, currency: 'RMB' }],
        submitForReview: true
      })
      .expect(201);

    let businessReviewedAt = '';
    await request(app.getHttpServer())
      .post(`/api/shipments/${entry.body.shipment.id}/review/approve`)
      .set('Authorization', app.auth(adminToken))
      .send({ businessReview: true })
      .expect(201)
      .expect((response) => {
        businessReviewedAt = response.body.shipment.businessReviewedAt;
        expect(response.body.shipment).toEqual(expect.objectContaining({
          status: 'WAITING_SORT',
          businessReviewedBy: 'admin',
          businessReviewedAt: expect.any(String)
        }));
      });

    await request(app.getHttpServer())
      .get('/api/finance/receivable-audits?systemOrderNo=SYBIZCOST001')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            systemOrderNo: 'SYBIZCOST001',
            createdAt: businessReviewedAt
          })
        ]));
      });

    const created = await request(app.getHttpServer())
      .post('/api/finance/business-cost-audits')
      .set('Authorization', app.auth(adminToken))
      .send({
        systemOrderNo: 'SYBIZCOST001',
        name: '业务员成本运费',
        currency: 'RMB',
        chargeWeightKg: 20,
        unitPrice: 30,
        amount: 600,
        remark: '按业务员成本录入'
      })
      .expect(201);

    expect(created.body).toEqual(expect.objectContaining({
      systemOrderNo: 'SYBIZCOST001',
      customerOrderNo: 'BUSINESS-COST-AUDIT-001',
      customerCode: '9409',
      name: '业务员成本运费',
      chargeWeightKg: 20,
      unitPrice: 30,
      amount: 600,
      receivableTotal: 1000,
      businessCostTotal: 800,
      businessProfit: 200,
      reconciliationStatus: 'PENDING'
    }));

    await request(app.getHttpServer())
      .get('/api/finance/business-cost-audits')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: created.body.id,
            systemOrderNo: 'SYBIZCOST001',
            receivableTotal: 1000,
            businessCostTotal: 800,
            businessProfit: 200
          })
        ]));
        expect(response.body.totals).toEqual(expect.objectContaining({
          rmbTotal: expect.any(Number),
          pendingCount: expect.any(Number),
          confirmedCount: expect.any(Number)
        }));
      });

    await request(app.getHttpServer())
      .post(`/api/finance/business-cost-audits/${created.body.id}/audit`)
      .set('Authorization', app.auth(adminToken))
      .expect(201)
      .expect((response) => {
        expect(response.body.reconciliationStatus).toBe('CONFIRMED');
        expect(response.body.reviewedBy).toBe('admin');
        expect(response.body.locked).toBe(true);
      });
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=finance.business_cost.audit')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'finance.business_cost.audit',
            target: created.body.id,
            after: expect.objectContaining({
              id: created.body.id,
              systemOrderNo: 'SYBIZCOST001',
              customerCode: '9409',
              salesperson: 'operator',
              name: '业务员成本运费',
              chargeWeightKg: 20,
              unitPrice: 30,
              amount: 600,
              currency: 'RMB',
              statusFrom: 'PENDING',
              statusTo: 'CONFIRMED',
              reviewStatus: 'CONFIRMED',
              reviewedBy: 'admin',
              reviewedAt: expect.any(String),
              locked: true
            })
          })
        ]));
      });

    await request(app.getHttpServer())
      .put(`/api/finance/business-cost-audits/${created.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .send({ amount: 650 })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/finance/business-cost-audits/${created.body.id}/reverse-audit`)
      .set('Authorization', app.auth(adminToken))
      .expect(201)
      .expect((response) => {
        expect(response.body.reconciliationStatus).toBe('PENDING');
        expect(response.body.locked).toBe(false);
      });
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=finance.business_cost.reverse_audit')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'finance.business_cost.reverse_audit',
            target: created.body.id,
            after: expect.objectContaining({
              id: created.body.id,
              systemOrderNo: 'SYBIZCOST001',
              customerCode: '9409',
              salesperson: 'operator',
              name: '业务员成本运费',
              chargeWeightKg: 20,
              unitPrice: 30,
              amount: 600,
              currency: 'RMB',
              statusFrom: 'CONFIRMED',
              statusTo: 'PENDING',
              reviewStatus: 'PENDING',
              reversedBy: 'admin',
              reversedAt: expect.any(String),
              locked: false
            })
          })
        ]));
      });

    await request(app.getHttpServer())
      .put(`/api/finance/business-cost-audits/${created.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .send({ amount: 650 })
        .expect(200)
      .expect((response) => {
        expect(response.body.amount).toBe(600);
        expect(response.body.businessCostTotal).toBe(800);
        expect(response.body.businessProfit).toBe(200);
      });

	    await request(app.getHttpServer())
	      .get(`/api/shipments/${entry.body.shipment.id}/finance-detail`)
	      .set('Authorization', app.auth(adminToken))
	      .expect(200)
      .expect((response) => {
        expect(response.body.businessCosts).toEqual(expect.arrayContaining([
          expect.objectContaining({ id: created.body.id, amount: 600 })
        ]));
      });

    const batch = await request(app.getHttpServer())
      .post('/api/finance/business-cost-audits/batch-audit')
      .set('Authorization', app.auth(adminToken))
      .send({ ids: [created.body.id, 'missing-business-cost'] })
      .expect(201);
    expect(batch.body.successCount).toBe(1);
    expect(batch.body.failureCount).toBe(1);

    await request(app.getHttpServer())
      .post('/api/finance/business-cost-audits/batch-reverse-audit')
      .set('Authorization', app.auth(adminToken))
      .send({ ids: [created.body.id] })
      .expect(201)
      .expect((response) => {
        expect(response.body.successCount).toBe(1);
      });
  });

  it('manages payable audits and creates payment applications with bank and bill metadata', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');
    const expectAudit = async (action: string, target: string) => {
      await request(app.getHttpServer())
        .get(`/api/system/audit-logs?action=${action}`)
        .set('Authorization', app.auth(adminToken))
        .expect(200)
        .expect((response) => {
          expect(response.body.rows).toEqual(expect.arrayContaining([
            expect.objectContaining({ action, target })
          ]));
        });
    };

    const shipment = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'PAYABLE-AUDIT-001',
        systemOrderNo: 'SYPAYABLEAUDIT001',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        channelId: 'ch-dhl-hk',
        agentId: 'a-yuhuan',
        packageCount: 1,
        receivableWeightKg: 20,
        agentWeightKg: 20
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/finance/payable-audits/match-shipment')
      .set('Authorization', app.auth(adminToken))
      .send({ systemOrderNo: 'SYPAYABLEAUDIT001' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          shipmentId: shipment.body.id,
          systemOrderNo: 'SYPAYABLEAUDIT001',
          customerCode: '9409'
        }));
      });

    await request(app.getHttpServer())
      .get('/api/finance/payable-audits')
      .set('Authorization', app.auth(operatorToken))
      .expect(403);

    const created = await request(app.getHttpServer())
      .post('/api/finance/payable-audits')
      .set('Authorization', app.auth(adminToken))
      .send({ shipmentId: shipment.body.id, name: '代理运费', chargeWeightKg: 20, unitPrice: 6, currency: 'RMB', paymentNo: 'PAYABLE-001' })
      .expect(201);
    expect(created.body.amount).toBe(120);
    expect(created.body.agentName).toBeDefined();

    await request(app.getHttpServer())
      .put(`/api/finance/payable-audits/${created.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .send({ amount: 999 })
      .expect(200)
      .expect((response) => {
        expect(response.body.amount).toBe(120);
      });

    const usdCreated = await request(app.getHttpServer())
      .post('/api/finance/payable-audits')
      .set('Authorization', app.auth(adminToken))
      .send({ shipmentId: shipment.body.id, name: 'USD 代理费', chargeWeightKg: 10, unitPrice: 5, currency: 'USD' })
      .expect(201);
    expect(usdCreated.body.amount).toBe(50);

    await request(app.getHttpServer())
      .put(`/api/finance/payable-audits/${usdCreated.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .send({ amount: 888 })
      .expect(200)
      .expect((response) => {
        expect(response.body.amount).toBe(50);
      });

    const otherShipment = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'PAYABLE-AUDIT-USD-OTHER',
        systemOrderNo: 'SYPAYABLEAUDIT-USD-OTHER',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        channelId: 'ch-dhl-hk',
        agentId: 'a-yuhuan',
        packageCount: 1,
        receivableWeightKg: 10,
        agentWeightKg: 10
      })
      .expect(201);
    const unrelatedUsd = await request(app.getHttpServer())
      .post('/api/finance/payable-audits')
      .set('Authorization', app.auth(adminToken))
      .send({ shipmentId: otherShipment.body.id, name: '无关 USD 代理费', chargeWeightKg: 1, unitPrice: 1, currency: 'USD' })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/api/finance/payable-audits?systemOrderNo=SYPAYABLEAUDIT001')
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    expect(list.body.rows).toEqual(expect.arrayContaining([expect.objectContaining({ id: created.body.id })]));
    expect(list.body.rows).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: unrelatedUsd.body.id })]));
    expect(list.body.totals.amountByCurrency).toEqual(expect.arrayContaining([
      expect.objectContaining({ currency: 'RMB', amount: 120 }),
      expect.objectContaining({ currency: 'USD', amount: 50 })
    ]));

    await request(app.getHttpServer())
      .post('/api/finance/payable-audits/export')
      .set('Authorization', app.auth(adminToken))
      .send({ query: { systemOrderNo: 'SYPAYABLEAUDIT001', page: 1, pageSize: 1 } })
      .expect(201)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ id: created.body.id }),
          expect.objectContaining({ id: usdCreated.body.id })
        ]));
      });

    await request(app.getHttpServer())
      .post(`/api/finance/payable-audits/${created.body.id}/audit`)
      .set('Authorization', app.auth(adminToken))
      .expect(201)
      .expect((response) => {
        expect(response.body.reconciliationStatus).toBe('CONFIRMED');
        expect(response.body.locked).toBe(true);
      });
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=finance.payable.audit')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'finance.payable.audit',
            target: created.body.id,
            after: expect.objectContaining({
              id: created.body.id,
              systemOrderNo: 'SYPAYABLEAUDIT001',
              customerCode: '9409',
              realAgentName: expect.any(String),
              agentName: expect.any(String),
              agentChannel: expect.any(String),
              chargeWeightKg: 20,
              unitPrice: 6,
              amount: 120,
              currency: 'RMB',
              routingSource: 'ROUTING',
              supplierBillNo: 'PAYABLE-001',
              paymentNo: 'PAYABLE-001',
              pendingPaymentStatus: 'PENDING',
              statusFrom: 'PENDING',
              statusTo: 'CONFIRMED',
              reviewStatus: 'CONFIRMED',
              reviewedBy: 'admin',
              reviewedAt: expect.any(String),
              locked: true
            })
          })
        ]));
      });
    await request(app.getHttpServer())
      .post(`/api/finance/payable-audits/${usdCreated.body.id}/audit`)
      .set('Authorization', app.auth(adminToken))
      .expect(201);

    const applications = await request(app.getHttpServer())
      .get('/api/finance/pending-payments?systemOrderNo=SYPAYABLEAUDIT001&currency=ALL')
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    expect(applications.body.rows).toHaveLength(2);
    expect(applications.body.rows).toEqual(expect.arrayContaining([expect.objectContaining({ amount: 120, currency: 'RMB', status: 'PENDING' })]));

    const rmbQueue = applications.body.rows.find((row: { amount: number; currency: string }) => row.amount === 120 && row.currency === 'RMB');
    const usdQueue = applications.body.rows.find((row: { amount: number; currency: string }) => row.amount === 50 && row.currency === 'USD');
    expect(rmbQueue).toBeTruthy();
    expect(usdQueue).toBeTruthy();
    const applicationId = rmbQueue.id;
    const usdApplicationId = usdQueue.id;

    const pending = await request(app.getHttpServer())
      .get('/api/finance/pending-payments?systemOrderNo=SYPAYABLEAUDIT001&currency=ALL')
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    expect(pending.body.rows).toHaveLength(2);
    expect(pending.body.totals.amountByCurrency).toEqual(expect.arrayContaining([
      expect.objectContaining({ currency: 'RMB', amount: 120 }),
      expect.objectContaining({ currency: 'USD', amount: 50 })
    ]));

    const pendingVoucher = await request(app.getHttpServer())
      .post('/api/finance/payment-vouchers')
      .set('Authorization', app.auth(adminToken))
      .send({
        pendingPaymentId: applicationId,
        billNo: 'AB-9409-001',
        transferNo: '1Z9409F2001',
        agentName: '宇环',
        billDate: '2026-06-29T00:00:00.000Z',
        currency: 'RMB',
        billAmount: 120,
        fileName: 'pending-voucher.png',
        mimeType: 'image/png',
        url: '/uploads/pending-voucher.png'
      })
      .expect(201);
    expect(pendingVoucher.body).toEqual(expect.objectContaining({
      pendingPaymentId: applicationId,
      voucherType: 'BILL',
      payableFinanceItemId: created.body.id,
      systemOrderNo: 'SYPAYABLEAUDIT001',
      transferNo: expect.any(String),
      agentChannel: expect.any(String),
      chargeWeightKg: 20,
      unitPrice: 6,
      payableAmount: 120,
      billNo: 'AB-9409-001',
      agentName: '宇环',
      billDate: '2026-06-29T00:00:00.000Z',
      currency: 'RMB',
      billAmount: 120,
      status: 'IMPORTED',
      fileName: 'pending-voucher.png',
      uploadedBy: 'admin',
      createdAt: expect.any(String)
    }));
    await expectAudit('finance.payment_voucher.add', pendingVoucher.body.id);
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=finance.payment_voucher.add')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'finance.payment_voucher.add',
            target: pendingVoucher.body.id,
            actorUsername: 'admin',
            after: expect.objectContaining({
              pendingPaymentId: applicationId,
              voucherType: 'BILL',
              payableFinanceItemId: created.body.id,
              systemOrderNo: 'SYPAYABLEAUDIT001',
              transferNo: '1Z9409F2001',
              agentChannel: expect.any(String),
              chargeWeightKg: 20,
              unitPrice: 6,
              payableAmount: 120,
              billNo: 'AB-9409-001',
              agentName: '宇环',
              currency: 'RMB',
              billAmount: 120,
              status: 'IMPORTED',
              fileName: 'pending-voucher.png',
              uploadedBy: 'admin'
            })
          })
        ]));
      });
    const usdPendingVoucher = await request(app.getHttpServer())
      .post('/api/finance/payment-vouchers')
      .set('Authorization', app.auth(adminToken))
      .send({
        pendingPaymentId: usdApplicationId,
        billNo: 'AB-9409-USD',
        transferNo: '1Z9409F2001',
        agentName: '宇环',
        billDate: '2026-06-29T00:00:00.000Z',
        currency: 'USD',
        billAmount: 50,
        fileName: 'usd-pending-bill.png',
        mimeType: 'image/png',
        url: '/uploads/usd-pending-bill.png'
      })
      .expect(201);
    expect(usdPendingVoucher.body).toEqual(expect.objectContaining({
      payableFinanceItemId: usdCreated.body.id,
      systemOrderNo: 'SYPAYABLEAUDIT001',
      transferNo: '1Z9409F2001',
      chargeWeightKg: 10,
      unitPrice: 5,
      payableAmount: 50
    }));
    await expectAudit('finance.payment_voucher.add', usdPendingVoucher.body.id);

    const extraBusinessCost = await request(app.getHttpServer())
      .post('/api/finance/business-cost-audits')
      .set('Authorization', app.auth(adminToken))
      .send({
        systemOrderNo: 'SYPAYABLEAUDIT001',
        name: '杂费-操作费',
        amount: 35,
        currency: 'RMB',
        agentName: '宇环',
        remark: '代理账单杂费归属'
      })
      .expect(201);
    await expectAudit('finance.business_cost.create', extraBusinessCost.body.id);
    const extraFeeVoucher = await request(app.getHttpServer())
      .post('/api/finance/payment-vouchers')
      .set('Authorization', app.auth(adminToken))
      .send({
        pendingPaymentId: applicationId,
        billNo: 'AB-9409-EXTRA',
        transferNo: '1Z9409F2001',
        agentName: '宇环',
        billDate: '2026-06-29T00:00:00.000Z',
        currency: 'RMB',
        billAmount: 35,
        extraFeeType: '操作费',
        extraFeeAmount: 35,
        extraFeeCurrency: 'RMB',
        extraFeeAgentName: '宇环',
        extraFeeCustomerCode: '9409',
        extraFeeSystemOrderNo: 'SYPAYABLEAUDIT001',
        extraFeeOccurredAt: '2026-06-29T00:00:00.000Z',
        extraFeeFinanceItemId: extraBusinessCost.body.id,
        extraFeeRemark: '代理账单杂费归属',
        fileName: 'extra-fee-voucher.png',
        mimeType: 'image/png',
        url: '/uploads/extra-fee-voucher.png'
      })
      .expect(201);
    expect(extraFeeVoucher.body).toEqual(expect.objectContaining({
      billNo: 'AB-9409-EXTRA',
      extraFeeType: '操作费',
      extraFeeAmount: 35,
      extraFeeCurrency: 'RMB',
      extraFeeAgentName: '宇环',
      extraFeeCustomerCode: '9409',
      extraFeeSystemOrderNo: 'SYPAYABLEAUDIT001',
      extraFeeOccurredAt: '2026-06-29T00:00:00.000Z',
      extraFeeFinanceItemId: extraBusinessCost.body.id,
      extraFeeRemark: '代理账单杂费归属',
      fileName: 'extra-fee-voucher.png'
    }));
    await expectAudit('finance.payment_voucher.extra_fee.add', extraFeeVoucher.body.id);
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=finance.payment_voucher.extra_fee.add')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'finance.payment_voucher.extra_fee.add',
            target: extraFeeVoucher.body.id,
            after: expect.objectContaining({
              extraFeeType: '操作费',
              extraFeeAmount: 35,
              extraFeeCurrency: 'RMB',
              extraFeeAgentName: '宇环',
              extraFeeCustomerCode: '9409',
              extraFeeSystemOrderNo: 'SYPAYABLEAUDIT001',
              extraFeeFinanceItemId: extraBusinessCost.body.id,
              extraFeeRemark: '代理账单杂费归属',
              fileName: 'extra-fee-voucher.png'
            })
          })
        ]));
      });

    const kuayueVoucher = await request(app.getHttpServer())
      .post('/api/finance/payment-vouchers')
      .set('Authorization', app.auth(adminToken))
      .send({
        pendingPaymentId: applicationId,
        billNo: 'KY-9409-001',
        transferNo: '1Z9409F2001',
        agentName: '跨越速运',
        billDate: '2026-06-29T00:00:00.000Z',
        currency: 'RMB',
        billAmount: 88,
        kuayueBillNo: 'KY-9409-001',
        kuayueCustomerCode: '9409',
        kuayueSystemOrderNo: 'SYPAYABLEAUDIT001',
        kuayueAmount: 88,
        kuayueCurrency: 'RMB',
        kuayueBillDate: '2026-06-29T00:00:00.000Z',
        kuayueStatus: 'LINKED',
        fileName: 'kuayue-bill.png',
        mimeType: 'image/png',
        url: '/uploads/kuayue-bill.png'
      })
      .expect(201);
    expect(kuayueVoucher.body).toEqual(expect.objectContaining({
      billNo: 'KY-9409-001',
      agentName: '跨越速运',
      payableFinanceItemId: created.body.id,
      systemOrderNo: 'SYPAYABLEAUDIT001',
      transferNo: '1Z9409F2001',
      kuayueBillNo: 'KY-9409-001',
      kuayueCustomerCode: '9409',
      kuayueSystemOrderNo: 'SYPAYABLEAUDIT001',
      kuayueAmount: 88,
      kuayueCurrency: 'RMB',
      kuayueBillDate: '2026-06-29T00:00:00.000Z',
      kuayueStatus: 'LINKED',
      fileName: 'kuayue-bill.png'
    }));
    await expectAudit('finance.payment_voucher.kuayue.add', kuayueVoucher.body.id);
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=finance.payment_voucher.kuayue.add')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'finance.payment_voucher.kuayue.add',
            target: kuayueVoucher.body.id,
            actorUsername: 'admin',
            after: expect.objectContaining({
              kuayueBillNo: 'KY-9409-001',
              kuayueCustomerCode: '9409',
              kuayueSystemOrderNo: 'SYPAYABLEAUDIT001',
              kuayueAmount: 88,
              kuayueCurrency: 'RMB',
              kuayueStatus: 'LINKED',
              fileName: 'kuayue-bill.png',
              uploadedBy: 'admin'
            })
          })
        ]));
      });
    await request(app.getHttpServer())
      .get('/api/finance/payment-vouchers?billNo=KY-9409-001')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([
          expect.objectContaining({
            kuayueBillNo: 'KY-9409-001',
            kuayueCustomerCode: '9409',
            kuayueSystemOrderNo: 'SYPAYABLEAUDIT001',
            kuayueAmount: 88,
            kuayueCurrency: 'RMB',
            kuayueStatus: 'LINKED'
          })
        ]));
      });

    await request(app.getHttpServer())
      .post('/api/finance/payment-vouchers')
      .set('Authorization', app.auth(operatorToken))
      .send({
        pendingPaymentId: applicationId,
        billNo: 'AB-9409-OPERATOR',
        agentName: '宇环',
        billDate: '2026-06-29T00:00:00.000Z',
        currency: 'RMB',
        billAmount: 120,
        fileName: 'operator-agent-bill.png'
      })
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/finance/payment-vouchers?billNo=AB-9409-001')
      .set('Authorization', app.auth(operatorToken))
      .expect(403);

    const differenceMarked = await request(app.getHttpServer())
      .patch(`/api/finance/payment-vouchers/${pendingVoucher.body.id}/difference`)
      .set('Authorization', app.auth(adminToken))
      .send({
        differenceType: '重量差异',
        differenceAmount: 12.5,
        differenceReason: '代理账单计费重高于 Sunny 应付',
        differenceStatus: 'PENDING'
      })
      .expect(200);
    expect(differenceMarked.body).toEqual(expect.objectContaining({
      status: 'DIFFERENCE_PENDING',
      differenceType: '重量差异',
      differenceAmount: 12.5,
      differenceReason: '代理账单计费重高于 Sunny 应付',
      differenceStatus: 'PENDING'
    }));
    await expectAudit('finance.payment_voucher.difference.mark', pendingVoucher.body.id);
    await request(app.getHttpServer())
      .patch(`/api/finance/payment-vouchers/${pendingVoucher.body.id}/difference`)
      .set('Authorization', app.auth(operatorToken))
      .send({ differenceStatus: 'HANDLED' })
      .expect(403);
    const differenceHandled = await request(app.getHttpServer())
      .patch(`/api/finance/payment-vouchers/${pendingVoucher.body.id}/difference`)
      .set('Authorization', app.auth(adminToken))
      .send({
        differenceType: '重量差异',
        differenceAmount: 12.5,
        differenceReason: '已按 Sunny 应付金额付款，差异留痕',
        differenceStatus: 'HANDLED'
      })
      .expect(200);
    expect(differenceHandled.body).toEqual(expect.objectContaining({
      status: 'DIFFERENCE_HANDLED',
      differenceType: '重量差异',
      differenceAmount: 12.5,
      differenceReason: '已按 Sunny 应付金额付款，差异留痕',
      differenceStatus: 'HANDLED',
      differenceHandledBy: 'admin',
      differenceHandledAt: expect.any(String)
    }));
    await expectAudit('finance.payment_voucher.difference.handle', pendingVoucher.body.id);
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=finance.payment_voucher.difference.handle')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'finance.payment_voucher.difference.handle',
            target: pendingVoucher.body.id,
            before: expect.objectContaining({
              differenceStatus: 'PENDING'
            }),
            after: expect.objectContaining({
              differenceType: '重量差异',
              differenceAmount: 12.5,
              differenceReason: '已按 Sunny 应付金额付款，差异留痕',
              differenceStatus: 'HANDLED',
              differenceHandledBy: 'admin',
              status: 'DIFFERENCE_HANDLED'
            })
          })
        ]));
      });

    const archivedVoucher = await request(app.getHttpServer())
      .patch(`/api/finance/payment-vouchers/${pendingVoucher.body.id}/archive`)
      .set('Authorization', app.auth(adminToken))
      .send({ archived: true, reason: 'F6 账单核对完成归档' })
      .expect(200);
    expect(archivedVoucher.body).toEqual(expect.objectContaining({
      billNo: 'AB-9409-001',
      status: 'ARCHIVED'
    }));
    await expectAudit('finance.payment_voucher.archive', pendingVoucher.body.id);
    await request(app.getHttpServer())
      .patch(`/api/finance/payment-vouchers/${pendingVoucher.body.id}/archive`)
      .set('Authorization', app.auth(operatorToken))
      .send({ archived: false })
      .expect(403);
    const unarchivedVoucher = await request(app.getHttpServer())
      .patch(`/api/finance/payment-vouchers/${pendingVoucher.body.id}/archive`)
      .set('Authorization', app.auth(adminToken))
      .send({ archived: false, reason: 'F6 账单恢复核对' })
      .expect(200);
    expect(unarchivedVoucher.body).toEqual(expect.objectContaining({
      billNo: 'AB-9409-001',
      status: 'MATCHED'
    }));
    await expectAudit('finance.payment_voucher.unarchive', pendingVoucher.body.id);
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=finance.payment_voucher.archive')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'finance.payment_voucher.archive',
            target: pendingVoucher.body.id,
            before: expect.objectContaining({ status: 'DIFFERENCE_HANDLED' }),
            after: expect.objectContaining({
              status: 'ARCHIVED',
              archiveReason: 'F6 账单核对完成归档'
            })
          })
        ]));
      });
    await request(app.getHttpServer())
      .get('/api/finance/payment-vouchers?billNo=AB-9409-001&status=ARCHIVED')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toHaveLength(0);
      });

    await request(app.getHttpServer())
      .post('/api/finance/voucher-images')
      .set('Authorization', app.auth(adminToken))
      .field('context', 'PENDING_PAYMENT_BILL')
      .field('pendingPaymentId', applicationId)
      .attach('file', tinyPng, { filename: 'supplier-bill.png', contentType: 'image/png' })
      .expect(201)
      .expect((response) => {
        expect(response.body.pendingPaymentId).toBe(applicationId);
        expect(response.body.url).toContain('/api/uploads/vouchers/');
      });

	    await request(app.getHttpServer())
	      .post('/api/finance/voucher-images')
	      .set('Authorization', app.auth(adminToken))
	      .field('context', 'PENDING_PAYMENT_BILL')
	      .field('pendingPaymentId', applicationId)
	      .attach('file', Buffer.from('not an image'), { filename: 'bill.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
	      .expect(400);

	    await request(app.getHttpServer())
	      .post('/api/finance/voucher-images')
	      .set('Authorization', app.auth(adminToken))
	      .field('context', 'PENDING_PAYMENT_BILL')
	      .attach('file', tinyPng, { filename: 'missing-id.png', contentType: 'image/png' })
	      .expect(400);

	    await request(app.getHttpServer())
	      .post('/api/finance/voucher-images')
	      .set('Authorization', app.auth(operatorToken))
	      .field('context', 'PENDING_PAYMENT_BILL')
	      .field('pendingPaymentId', applicationId)
	      .attach('file', tinyPng, { filename: 'operator-bill.png', contentType: 'image/png' })
	      .expect(403);

	    const tooLargeUpload = await request(app.getHttpServer())
	      .post('/api/finance/voucher-images')
	      .set('Authorization', app.auth(adminToken))
	      .field('context', 'PENDING_PAYMENT_BILL')
	      .field('pendingPaymentId', applicationId)
	      .attach('file', Buffer.concat([tinyPng, Buffer.alloc(10 * 1024 * 1024)]), { filename: 'too-large.png', contentType: 'image/png' });
	    expect([400, 413]).toContain(tooLargeUpload.status);

    const savedRmbBank = await request(app.getHttpServer())
      .post('/api/finance/payee-bank-accounts')
      .set('Authorization', app.auth(adminToken))
      .send({ agentName: '宇环', accountName: '宇环 RMB 户', bankName: '招商银行', bankAccountNo: 'RMB-001', currency: 'RMB' })
      .expect(201);
    expect(savedRmbBank.body.currency).toBe('RMB');
    await expectAudit('finance.payment.bank.save', savedRmbBank.body.id);

    const savedUsdBank = await request(app.getHttpServer())
      .post('/api/finance/payee-bank-accounts')
      .set('Authorization', app.auth(adminToken))
      .send({ agentName: '宇环', accountName: '宇环 USD 户', bankName: 'HSBC', bankAccountNo: 'USD-001', currency: 'USD' })
      .expect(201);
    expect(savedUsdBank.body.currency).toBe('USD');
    await expectAudit('finance.payment.bank.save', savedUsdBank.body.id);
    await request(app.getHttpServer())
      .post('/api/finance/payment-applications')
      .set('Authorization', app.auth(adminToken))
      .send({
        pendingPaymentIds: [applicationId],
        voucher: { fileName: 'missing-bank-bill.png', mimeType: 'image/png', url: '/uploads/missing-bank-bill.png' }
      })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('收款银行');
      });
    await request(app.getHttpServer())
      .post('/api/finance/payment-applications')
      .set('Authorization', app.auth(adminToken))
      .send({ pendingPaymentIds: [applicationId], bankAccountId: savedUsdBank.body.id })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('币种');
      });
    const rmbPaymentApps = await request(app.getHttpServer())
      .post('/api/finance/payment-applications')
      .set('Authorization', app.auth(adminToken))
      .send({
        pendingPaymentIds: [applicationId],
        bankAccountId: savedRmbBank.body.id,
        remark: '本次付款申请',
        voucher: { fileName: 'merged-bill.png', mimeType: 'image/png', url: '/uploads/merged-bill.png' }
      });
    expect(rmbPaymentApps.status, JSON.stringify(rmbPaymentApps.body)).toBe(201);
    const usdPaymentApps = await request(app.getHttpServer())
      .post('/api/finance/payment-applications')
      .set('Authorization', app.auth(adminToken))
      .send({
        pendingPaymentIds: [usdApplicationId],
        bankAccountId: savedUsdBank.body.id,
        remark: '本次付款申请',
        voucher: { fileName: 'merged-bill.png', mimeType: 'image/png', url: '/uploads/merged-bill.png' }
      });
    expect(usdPaymentApps.status, JSON.stringify(usdPaymentApps.body)).toBe(201);
    expect(rmbPaymentApps.body).toHaveLength(1);
    expect(usdPaymentApps.body).toHaveLength(1);
    expect(rmbPaymentApps.body[0]).toEqual(expect.objectContaining({ agentName: '宇环', currency: 'RMB', totalAmount: 120, status: 'WAITING_PAYMENT' }));
    expect(usdPaymentApps.body[0]).toEqual(expect.objectContaining({ currency: 'USD', totalAmount: 50, status: 'WAITING_PAYMENT' }));
    await expectAudit('finance.payment.bank.select', savedRmbBank.body.id);
    await expectAudit('finance.payment.bank.select', savedUsdBank.body.id);

	    const rmbPaymentApp = rmbPaymentApps.body[0];
	    const usdPaymentApp = usdPaymentApps.body[0];
	    expect(rmbPaymentApp.vouchers).toEqual(expect.arrayContaining([
	      expect.objectContaining({ pendingPaymentId: applicationId, fileName: 'pending-voucher.png' }),
	      expect.objectContaining({ pendingPaymentId: applicationId, fileName: 'supplier-bill.png' }),
	      expect.objectContaining({ paymentApplicationId: rmbPaymentApp.id, fileName: 'merged-bill.png' })
	    ]));
	    expect(usdPaymentApp.vouchers).toEqual(expect.arrayContaining([
	      expect.objectContaining({ pendingPaymentId: usdApplicationId, fileName: 'usd-pending-bill.png' }),
	      expect.objectContaining({ paymentApplicationId: usdPaymentApp.id, fileName: 'merged-bill.png' })
	    ]));
	    await request(app.getHttpServer())
	      .get('/api/finance/payment-vouchers?billNo=AB-9409-001')
	      .set('Authorization', app.auth(adminToken))
	      .expect(200)
	      .expect((response) => {
	        expect(response.body).toEqual(expect.arrayContaining([
	          expect.objectContaining({
	            billNo: 'AB-9409-001',
	            systemOrderNo: 'SYPAYABLEAUDIT001',
	            transferNo: '1Z9409F2001',
	            payableFinanceItemId: created.body.id,
	            paymentApplicationId: rmbPaymentApp.id,
	            paymentApplicationNo: rmbPaymentApp.applicationNo,
	            chargeWeightKg: 20,
	            unitPrice: 6,
	            payableAmount: 120
	          })
	        ]));
	      });
	    await expectAudit('finance.payment_application.create', rmbPaymentApp.id);
	    await expectAudit('finance.payment_application.create', usdPaymentApp.id);
	    await request(app.getHttpServer())
	      .get('/api/system/audit-logs?action=finance.payment_application.create')
	      .set('Authorization', app.auth(adminToken))
	      .expect(200)
	      .expect((response) => {
	        expect(response.body.rows).toEqual(expect.arrayContaining([
	          expect.objectContaining({
	            action: 'finance.payment_application.create',
	            target: rmbPaymentApp.id,
	            after: expect.objectContaining({
	              paymentApplicationId: rmbPaymentApp.id,
	              paymentApplicationNo: rmbPaymentApp.applicationNo,
	              agentName: rmbPaymentApp.agentName,
	              currency: 'RMB',
	              totalAmount: 120,
	              pendingPaymentIds: expect.arrayContaining([applicationId]),
	              payableFinanceItemIds: expect.arrayContaining([created.body.id]),
	              systemOrderNos: expect.arrayContaining(['SYPAYABLEAUDIT001']),
	              customerCodes: expect.arrayContaining(['9409']),
	              itemCount: 1,
	              appliedBy: 'admin',
	              appliedAt: expect.any(String),
	              statusTo: 'WAITING_PAYMENT',
	              status: 'WAITING_PAYMENT',
	              voucherFileNames: expect.arrayContaining(['pending-voucher.png', 'supplier-bill.png', 'merged-bill.png'])
	            })
	          }),
	          expect.objectContaining({
	            action: 'finance.payment_application.create',
	            target: usdPaymentApp.id,
	            after: expect.objectContaining({
	              paymentApplicationNo: usdPaymentApp.applicationNo,
	              currency: 'USD',
	              totalAmount: 50,
	              pendingPaymentIds: expect.arrayContaining([usdApplicationId]),
	              voucherFileNames: expect.arrayContaining(['usd-pending-bill.png', 'merged-bill.png'])
	            })
	          })
	        ]));
	      });
	    const updatedUsdPaymentApp = await request(app.getHttpServer())
	      .put(`/api/finance/payment-applications/${usdPaymentApp.id}`)
	      .set('Authorization', app.auth(adminToken))
	      .send({
	        manualBankAccount: {
	          agentName: '宇环',
	          accountName: '宇环 USD 一次性户',
	          bankName: 'HSBC',
	          bankAccountNo: 'USD-ONCE-001',
	          currency: 'USD'
	        },
	        saveManualBankAccount: false
	      })
	      .expect(200)
	      .expect((response) => {
	        expect(response.body.bankAccount?.bankAccountNo).toBe('USD-ONCE-001');
	      });
	    await expectAudit('finance.payment.bank.use_once', updatedUsdPaymentApp.body.bankAccount.id);
	    await expectAudit('finance.payment_application.update', usdPaymentApp.id);
	    await request(app.getHttpServer())
	      .get('/api/system/audit-logs?action=finance.payment_application.update')
	      .set('Authorization', app.auth(adminToken))
	      .expect(200)
	      .expect((response) => {
	        expect(response.body.rows).toEqual(expect.arrayContaining([
	          expect.objectContaining({
	            action: 'finance.payment_application.update',
	            target: usdPaymentApp.id,
	            after: expect.objectContaining({
	              paymentApplicationId: usdPaymentApp.id,
	              paymentApplicationNo: usdPaymentApp.applicationNo,
		              bankAccountNo: '********-001',
	              bankName: 'HSBC',
	              currency: 'USD',
	              totalAmount: 50,
	              pendingPaymentIds: expect.arrayContaining([usdApplicationId]),
	              status: 'WAITING_PAYMENT'
	            })
	          })
	        ]));
	      });
	    await request(app.getHttpServer())
	      .post(`/api/finance/payment-applications/${usdPaymentApp.id}/confirm-paid`)
	      .set('Authorization', app.auth(adminToken))
	      .send({ payerBankName: '思远付款银行', paidAt: '2026-06-25' })
	      .expect(400)
	      .expect((response) => {
	        expect(response.body.message).toBe('付款方账号不能为空');
	      });
	    await request(app.getHttpServer())
	      .post(`/api/finance/payment-applications/${usdPaymentApp.id}/confirm-paid`)
	      .set('Authorization', app.auth(adminToken))
	      .send({
	        payerBankName: '思远付款银行',
		        payerBankAccountNo: '888800001111',
	        paidAt: '2026-06-25',
	        waterReceipt: { fileName: 'paid-receipt.png', mimeType: 'image/png', url: '/uploads/paid-receipt.png' }
	      })
	      .expect(201)
	      .expect((response) => {
	        expect(response.body.status).toBe('PAID');
	        expect(response.body.waterReceipts).toEqual(expect.arrayContaining([
	          expect.objectContaining({ paymentApplicationId: usdPaymentApp.id, fileName: 'paid-receipt.png' })
	        ]));
	        expect(response.body.billVouchers).toEqual(expect.arrayContaining([
	          expect.objectContaining({ pendingPaymentId: usdApplicationId, fileName: 'usd-pending-bill.png' }),
	          expect.objectContaining({ paymentApplicationId: usdPaymentApp.id, fileName: 'merged-bill.png' })
	        ]));
	      });
	    await expectAudit('finance.paid_payment.confirm', usdPaymentApp.id);
	    await request(app.getHttpServer())
	      .get('/api/finance/payment-vouchers?billNo=AB-9409-USD')
	      .set('Authorization', app.auth(adminToken))
	      .expect(200)
	      .expect((response) => {
	        expect(response.body).toEqual(expect.arrayContaining([
	          expect.objectContaining({
	            billNo: 'AB-9409-USD',
	            systemOrderNo: 'SYPAYABLEAUDIT001',
	            transferNo: '1Z9409F2001',
	            payableFinanceItemId: usdCreated.body.id,
	            paymentApplicationId: usdPaymentApp.id,
	            paymentApplicationNo: usdPaymentApp.applicationNo,
	            paidPaymentId: usdPaymentApp.id,
	            paidAt: '2026-06-25',
	            chargeWeightKg: 10,
	            unitPrice: 5,
	            payableAmount: 50
	          })
	        ]));
	      });
	    await request(app.getHttpServer())
	      .get('/api/system/audit-logs?action=finance.paid_payment.confirm')
	      .set('Authorization', app.auth(adminToken))
	      .expect(200)
	      .expect((response) => {
	        expect(response.body.rows).toEqual(expect.arrayContaining([
	          expect.objectContaining({
	            action: 'finance.paid_payment.confirm',
	            target: usdPaymentApp.id,
	            after: expect.objectContaining({
	              paymentApplicationId: usdPaymentApp.id,
	              paymentApplicationNo: usdPaymentApp.applicationNo,
	              paymentObject: expect.any(String),
	              currency: 'USD',
	              paymentAmount: 50,
	              totalAmount: 50,
	              payerBankName: '思远付款银行',
		              payerBankAccountNo: '********1111',
	              paidAt: '2026-06-25',
	              paidBy: 'admin',
	              statusFrom: 'WAITING_PAYMENT',
	              statusTo: 'PAID',
	              status: 'PAID',
	              writeOffStatus: 'WRITTEN_OFF',
	              archiveStatus: 'ARCHIVED',
	              archivedAt: '2026-06-25',
	              payableFinanceItemIds: expect.arrayContaining([usdCreated.body.id]),
	              pendingPaymentIds: expect.arrayContaining([usdApplicationId]),
	              systemOrderNos: expect.arrayContaining(['SYPAYABLEAUDIT001']),
	              customerCodes: expect.arrayContaining(['9409']),
	              waterReceiptFileNames: expect.arrayContaining(['paid-receipt.png']),
	              billVoucherFileNames: expect.arrayContaining(['usd-pending-bill.png', 'merged-bill.png']),
	              voucherFileNames: expect.arrayContaining(['usd-pending-bill.png', 'merged-bill.png', 'paid-receipt.png'])
	            })
	          })
	        ]));
	      });
	    const paidReceipt = await request(app.getHttpServer())
	      .get(`/api/finance/paid-payments?status=PAID&systemOrderNo=SYPAYABLEAUDIT001`)
	      .set('Authorization', app.auth(adminToken))
	      .expect(200)
	      .then((response) => response.body.rows.find((item: { id: string }) => item.id === usdPaymentApp.id).waterReceipts[0]);
	    await expectAudit('finance.paid_payment.water_receipt.add', paidReceipt.id);
	    await request(app.getHttpServer())
	      .get('/api/system/audit-logs?action=finance.paid_payment.water_receipt.add')
	      .set('Authorization', app.auth(adminToken))
	      .expect(200)
	      .expect((response) => {
	        expect(response.body.rows).toEqual(expect.arrayContaining([
	          expect.objectContaining({
	            action: 'finance.paid_payment.water_receipt.add',
	            target: paidReceipt.id,
	            after: expect.objectContaining({
	              voucherId: paidReceipt.id,
	              paymentApplicationId: usdPaymentApp.id,
	              paymentApplicationNo: usdPaymentApp.applicationNo,
	              voucherType: 'PAYMENT_RECEIPT',
	              fileName: 'paid-receipt.png',
	              url: '/uploads/paid-receipt.png',
	              uploadedBy: 'admin',
	              paymentAmount: 50,
	              currency: 'USD',
	              status: 'PAID',
	              archivedAt: '2026-06-25'
	            })
	          })
	        ]));
	      });

	    await request(app.getHttpServer())
	      .put(`/api/finance/paid-payments/${usdPaymentApp.id}`)
	      .set('Authorization', app.auth(adminToken))
	      .send({
	        paidRemark: '补充付款水单',
	        waterReceipt: { fileName: 'paid-receipt-extra.png', mimeType: 'image/png', url: '/uploads/paid-receipt-extra.png' }
	      })
	      .expect(200)
	      .expect((response) => {
	        expect(response.body.waterReceipts).toEqual(expect.arrayContaining([
	          expect.objectContaining({ paymentApplicationId: usdPaymentApp.id, fileName: 'paid-receipt-extra.png' })
	        ]));
	      });
	    const extraPaidReceipt = await request(app.getHttpServer())
	      .get(`/api/finance/paid-payments?status=PAID&systemOrderNo=SYPAYABLEAUDIT001`)
	      .set('Authorization', app.auth(adminToken))
	      .expect(200)
	      .then((response) => response.body.rows
	        .find((item: { id: string }) => item.id === usdPaymentApp.id)
	        .waterReceipts.find((item: { fileName: string }) => item.fileName === 'paid-receipt-extra.png'));
	    await expectAudit('finance.paid_payment.water_receipt.add', extraPaidReceipt.id);
	    await request(app.getHttpServer())
	      .get('/api/system/audit-logs?action=finance.paid_payment.water_receipt.add')
	      .set('Authorization', app.auth(adminToken))
	      .expect(200)
	      .expect((response) => {
	        expect(response.body.rows).toEqual(expect.arrayContaining([
	          expect.objectContaining({
	            action: 'finance.paid_payment.water_receipt.add',
	            target: extraPaidReceipt.id,
	            after: expect.objectContaining({
	              voucherId: extraPaidReceipt.id,
	              paymentApplicationId: usdPaymentApp.id,
	              paymentApplicationNo: usdPaymentApp.applicationNo,
	              voucherType: 'PAYMENT_RECEIPT',
	              fileName: 'paid-receipt-extra.png',
	              url: '/uploads/paid-receipt-extra.png',
	              uploadedBy: 'admin',
	              status: 'PAID',
	              archivedAt: '2026-06-25'
	            })
	          })
	        ]));
	      });

	    await request(app.getHttpServer())
	      .get(`/api/finance/paid-payments?status=PAID&systemOrderNo=SYPAYABLEAUDIT001`)
	      .set('Authorization', app.auth(adminToken))
	      .expect(200)
	      .expect((response) => {
	        const row = response.body.rows.find((item: { id: string }) => item.id === usdPaymentApp.id);
	        expect(row.payeeBankAccount?.bankAccountNo).toBe('USD-ONCE-001');
	        expect(row.payerBankAccountNo).toBe('888800001111');
	      });

	    await request(app.getHttpServer())
	      .put('/api/system/roles/UG_CUSTOMER_SERVICE/permissions')
	      .set('Authorization', app.auth(adminToken))
	      .send({ permissions: ['workspace:access', 'finance:payable:paid-read'] })
	      .expect(200);
	    const serviceToken = await app.loginAs('service');
	    await request(app.getHttpServer())
	      .get(`/api/finance/paid-payments?status=PAID&systemOrderNo=SYPAYABLEAUDIT001`)
	      .set('Authorization', app.auth(serviceToken))
	      .expect(200)
	      .expect((response) => {
	        const row = response.body.rows.find((item: { id: string }) => item.id === usdPaymentApp.id);
	        expect(row.payeeBankAccount?.bankAccountNo).toBe('********-001');
	        expect(row.payerBankAccountNo).toBe('********1111');
	      });
	    await request(app.getHttpServer())
	      .get('/api/finance/pending-payments?systemOrderNo=SYPAYABLEAUDIT001&currency=ALL')
	      .set('Authorization', app.auth(operatorToken))
	      .expect(403);
	    await request(app.getHttpServer())
	      .get(`/api/finance/paid-payments?status=PAID&systemOrderNo=SYPAYABLEAUDIT001`)
	      .set('Authorization', app.auth(operatorToken))
	      .expect(403);
	    await request(app.getHttpServer())
	      .post(`/api/finance/payment-applications/${usdPaymentApp.id}/confirm-paid`)
	      .set('Authorization', app.auth(serviceToken))
	      .send({ payerBankName: '越权银行', payerBankAccountNo: '0000', paidAt: '2026-06-25' })
	      .expect(403);
	    await request(app.getHttpServer())
	      .post('/api/finance/paid-payments/export')
	      .set('Authorization', app.auth(serviceToken))
	      .send({ ids: [usdPaymentApp.id] })
	      .expect(403);
	    await request(app.getHttpServer())
	      .post('/api/finance/voucher-images')
	      .set('Authorization', app.auth(serviceToken))
	      .field('context', 'PAID_PAYMENT_RECEIPT')
	      .field('paymentApplicationId', usdPaymentApp.id)
	      .attach('file', tinyPng, { filename: 'denied-paid-receipt.png', contentType: 'image/png' })
	      .expect(403);
	    await request(app.getHttpServer())
	      .get('/api/system/audit-logs?action=security.permission.denied')
	      .set('Authorization', app.auth(adminToken))
	      .expect(200)
	      .expect((response) => {
	        expect(response.body.rows).toEqual(expect.arrayContaining([
	          expect.objectContaining({
	            action: 'security.permission.denied',
	            actorUsername: 'operator',
	            target: expect.stringContaining('/api/finance/pending-payments'),
	            result: 'FAILED',
	            after: expect.objectContaining({ permissions: ['finance:payable:payment'] })
	          }),
	          expect.objectContaining({
	            action: 'security.permission.denied',
	            actorUsername: 'operator',
	            target: expect.stringContaining('/api/finance/paid-payments'),
	            result: 'FAILED',
	            after: expect.objectContaining({ permissions: ['finance:payable:paid-read'] })
	          }),
	          expect.objectContaining({
	            action: 'security.permission.denied',
	            actorUsername: 'service',
	            target: expect.stringContaining('/api/finance/payment-applications/'),
	            result: 'FAILED',
	            after: expect.objectContaining({ permissions: ['finance:payable:paid-confirm'] })
	          })
	        ]));
	      });

	    await request(app.getHttpServer())
	      .post(`/api/finance/payable-audits/${usdCreated.body.id}/reverse-audit`)
	      .set('Authorization', app.auth(adminToken))
	      .expect(400)
	      .expect((response) => {
	        expect(response.body.message).toContain('先在已付款模块反核销');
	      });

	    await request(app.getHttpServer())
	      .post(`/api/finance/paid-payments/${usdPaymentApp.id}/reverse`)
	      .set('Authorization', app.auth(adminToken))
	      .send({ reason: '测试反核销' })
	      .expect(201)
	      .expect((response) => {
	        expect(response.body.status).toBe('WAITING_PAYMENT');
	        expect(response.body.paidAt).toBeUndefined();
	        expect(response.body.paidBy).toBeUndefined();
	        expect(response.body.payerBankName).toBeUndefined();
	        expect(response.body.payerBankAccountNo).toBeUndefined();
	      });
	    await expectAudit('finance.paid_payment.reverse', usdPaymentApp.id);
	    await request(app.getHttpServer())
	      .get('/api/system/audit-logs?action=finance.paid_payment.reverse')
	      .set('Authorization', app.auth(adminToken))
	      .expect(200)
	      .expect((response) => {
	        expect(response.body.rows).toEqual(expect.arrayContaining([
	          expect.objectContaining({
	            action: 'finance.paid_payment.reverse',
	            target: usdPaymentApp.id,
	            after: expect.objectContaining({
	              paymentApplicationId: usdPaymentApp.id,
	              paymentApplicationNo: usdPaymentApp.applicationNo,
	              currency: 'USD',
	              paymentAmount: 50,
	              statusFrom: 'PAID',
	              statusTo: 'WAITING_PAYMENT',
	              status: 'WAITING_PAYMENT',
	              writeOffStatus: 'PENDING',
	              archiveStatus: 'OPEN',
	              reversedBy: 'admin',
	              reversedAt: expect.any(String),
	              payableFinanceItemIds: expect.arrayContaining([usdCreated.body.id]),
	              pendingPaymentIds: expect.arrayContaining([usdApplicationId]),
	              waterReceiptFileNames: expect.arrayContaining(['paid-receipt.png', 'paid-receipt-extra.png'])
	            })
	          })
	        ]));
	      });

	    await request(app.getHttpServer())
	      .get(`/api/finance/paid-payments?status=ALL&systemOrderNo=SYPAYABLEAUDIT001`)
	      .set('Authorization', app.auth(adminToken))
	      .expect(200)
	      .expect((response) => {
	        const row = response.body.rows.find((item: { id: string }) => item.id === usdPaymentApp.id);
	        expect(row.status).toBe('WAITING_PAYMENT');
	        expect(row.payerBankName).toBeUndefined();
	        expect(row.payerBankAccountNo).toBeUndefined();
	      });

	    await request(app.getHttpServer())
	      .get('/api/finance/payable-audits?systemOrderNo=SYPAYABLEAUDIT001')
	      .set('Authorization', app.auth(adminToken))
	      .expect(200)
	      .expect((response) => {
	        const usdPayable = response.body.rows.find((row: { id: string }) => row.id === usdCreated.body.id);
	        expect(usdPayable.paymentNo).toBeUndefined();
	      });

	    await request(app.getHttpServer())
	      .post(`/api/finance/payment-applications/${rmbPaymentApp.id}/cancel`)
      .set('Authorization', app.auth(adminToken))
      .send({ reason: '测试撤回' })
      .expect(201)
	      .expect((response) => {
	        expect(response.body.status).toBe('CANCELED');
	      });
	    await expectAudit('finance.payment_application.cancel', rmbPaymentApp.id);
	    await request(app.getHttpServer())
	      .get('/api/system/audit-logs?action=finance.payment_application.cancel')
	      .set('Authorization', app.auth(adminToken))
	      .expect(200)
	      .expect((response) => {
	        expect(response.body.rows).toEqual(expect.arrayContaining([
	          expect.objectContaining({
	            action: 'finance.payment_application.cancel',
	            target: rmbPaymentApp.id,
	            after: expect.objectContaining({
	              paymentApplicationId: rmbPaymentApp.id,
	              paymentApplicationNo: rmbPaymentApp.applicationNo,
	              currency: 'RMB',
	              totalAmount: 120,
	              pendingPaymentIds: expect.arrayContaining([applicationId]),
	              statusFrom: 'WAITING_PAYMENT',
	              statusTo: 'CANCELED',
	              status: 'CANCELED',
	              canceledBy: 'admin',
	              canceledAt: expect.any(String)
	            })
	          })
	        ]));
	      });
	    await request(app.getHttpServer())
	      .post(`/api/finance/payment-applications/${rmbPaymentApp.id}/confirm-paid`)
	      .set('Authorization', app.auth(adminToken))
	      .send({ payerBankName: '思远付款银行', payerBankAccountNo: '888800001111', paidAt: '2026-06-25' })
	      .expect(400)
	      .expect((response) => {
	        expect(response.body.message).toContain('只有待支付申请可以确认付款');
	      });

	    await request(app.getHttpServer())
	      .get('/api/finance/pending-payments?systemOrderNo=SYPAYABLEAUDIT001&currency=RMB')
	      .set('Authorization', app.auth(adminToken))
	      .expect(200)
	      .expect((response) => {
	        expect(response.body.rows).toEqual(expect.arrayContaining([
	          expect.objectContaining({
	            id: applicationId,
	            status: 'READY',
	            vouchers: expect.arrayContaining([
	              expect.objectContaining({ pendingPaymentId: applicationId, fileName: 'pending-voucher.png' }),
	              expect.objectContaining({ pendingPaymentId: applicationId, fileName: 'supplier-bill.png' })
	            ])
	          })
	        ]));
	      });

	    await request(app.getHttpServer())
	      .post(`/api/finance/payable-audits/${created.body.id}/reverse-audit`)
      .set('Authorization', app.auth(adminToken))
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('已生成付款凭证');
      });

	    await request(app.getHttpServer())
	      .post('/api/finance/payment-applications')
	      .set('Authorization', app.auth(adminToken))
	      .send({
	        pendingPaymentIds: [applicationId],
	        manualBankAccount: {
	          agentName: '宇环',
	          accountName: '宇环一次性户名',
	          bankName: '临时银行',
	          bankAccountNo: 'TEMP-ONCE-001',
	          currency: 'RMB'
	        },
	        saveManualBankAccount: false,
	        remark: '一次性银行不复用'
	      })
	      .expect(201);

	    await request(app.getHttpServer())
	      .get('/api/finance/payee-bank-accounts?agentName=宇环&currency=RMB')
	      .set('Authorization', app.auth(adminToken))
	      .expect(200)
	      .expect((response) => {
	        expect(response.body).toEqual(expect.arrayContaining([
	          expect.objectContaining({ id: savedRmbBank.body.id })
	        ]));
	        expect(response.body).not.toEqual(expect.arrayContaining([
	          expect.objectContaining({ bankAccountNo: 'TEMP-ONCE-001' })
	        ]));
	      });
	  });

  it('returns shipment finance detail only to finance-capable roles', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');

    const shipment = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'FIN-DETAIL-001',
        systemOrderNo: 'SYFINDETAIL001',
        businessType: 'DEDICATED_LINE',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 20,
        agentWeightKg: 20,
        channelId: 'ch-dhl-hk',
        initialStatus: 'DRAFT',
        latestTracking: '新建出货订单，待审核'
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/shipments/${shipment.body.id}/fees/generate`)
      .set('Authorization', app.auth(adminToken))
      .send({ baseRatePerKg: 20, payableRatePerKg: 14, fuelRate: 0.15, surcharges: [{ name: '操作费', amount: 30 }] })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/shipments/${shipment.body.id}/finance-items`)
      .set('Authorization', app.auth(adminToken))
      .send({ type: 'BUSINESS_COST', name: '基础运费', amount: 280, currency: 'RMB' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/shipments/${shipment.body.id}/finance-detail`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.receivableTotal).toBeGreaterThan(0);
        expect(response.body.payableTotal).toBeGreaterThan(0);
        expect(response.body.grossProfit).toBe(response.body.receivableTotal - response.body.payableTotal);
        expect(response.body.receivables[0]).toEqual(expect.objectContaining({ name: '基础运费' }));
        expect(response.body.payables[0]).toEqual(expect.objectContaining({ name: '基础运费' }));
        expect(response.body.businessCosts[0]).toEqual(expect.objectContaining({ name: '基础运费' }));
      });

    await request(app.getHttpServer())
      .get(`/api/shipments/${shipment.body.id}/finance-detail`)
      .set('Authorization', app.auth(operatorToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.receivableTotal).toBeGreaterThan(0);
        expect(response.body.businessCostTotal).toBeGreaterThan(0);
        expect(response.body.payables).toBeUndefined();
        expect(response.body.payableTotal).toBeUndefined();
        expect(response.body.canViewPayables).toBeUndefined();
        expect(response.body.grossProfit).toBeUndefined();
        expect(response.body.agentName).toBeUndefined();
        expect(response.body.businessCosts[0]).toEqual(expect.objectContaining({ name: '基础运费' }));
      });
  });

  it('persists single-shipment finance items with role-based redaction and lock controls', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');

    const shipment = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'FIN-ITEM-001',
        systemOrderNo: 'SYFINITEM001',
        businessType: 'DEDICATED_LINE',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 42,
        agentWeightKg: 42,
        channelId: 'ch-dhl-hk',
        productName: '财务费用测试品名',
        initialStatus: 'DRAFT',
        latestTracking: '财务费用测试单'
      })
      .expect(201);

    const receivable = await request(app.getHttpServer())
      .post(`/api/shipments/${shipment.body.id}/finance-items`)
      .set('Authorization', app.auth(adminToken))
      .send({
        type: 'RECEIVABLE',
        name: '空运费',
        amount: 319.7,
        currency: 'USD',
        settlementMethod: '资料库自动匹配',
        remark: '业务实收'
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/shipments/${shipment.body.id}/finance-items`)
      .set('Authorization', app.auth(adminToken))
      .send({
        type: 'PAYABLE',
        agentName: '宇环',
        name: '代理运费',
        amount: 214.26,
        currency: 'RMB',
        settlementMethod: '月结',
        chargeWeightKg: 42,
        unitPrice: 5,
        amountOverridden: true,
        remark: '代理账单'
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/shipments/${shipment.body.id}/finance-items`)
      .set('Authorization', app.auth(adminToken))
      .send({
        type: 'BUSINESS_COST',
        name: '业务员成本',
        amount: 260,
        currency: 'RMB',
        chargeWeightKg: 42,
        unitPrice: 6.19,
        remark: '含运营成本口径'
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/shipments/${shipment.body.id}/finance-detail`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.receivables).toEqual(expect.arrayContaining([expect.objectContaining({ name: '空运费', currency: 'USD', sourceType: 'MANUAL' })]));
        expect(response.body.payables).toEqual(expect.arrayContaining([expect.objectContaining({ name: '代理运费', agentName: '深圳宇环', sourceType: 'MANUAL', chargeWeightKg: 42, unitPrice: 5, amount: 214.26, amountOverridden: true })]));
        expect(response.body.businessCosts).toEqual(expect.arrayContaining([expect.objectContaining({ name: '业务员成本', unitPrice: 6.19, sourceType: 'MANUAL' })]));
        expect(response.body.grossProfit).toBeCloseTo(response.body.receivableTotal - response.body.payableTotal, 2);
        expect(response.body.profitSections).toEqual(expect.arrayContaining([
          expect.objectContaining({ key: 'RECEIVABLE_PAYABLE', title: '应收与应付利润' }),
          expect.objectContaining({ key: 'RECEIVABLE_BUSINESS', title: '应收与业务利润' }),
          expect.objectContaining({ key: 'BUSINESS_PAYABLE', title: '业务与应付利润' })
        ]));
      });

    await request(app.getHttpServer())
      .get(`/api/shipments/${shipment.body.id}/finance-detail`)
      .set('Authorization', app.auth(operatorToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.receivables).toEqual(expect.arrayContaining([expect.objectContaining({ name: '空运费' })]));
        expect(response.body.businessCosts).toEqual(expect.arrayContaining([expect.objectContaining({ name: '业务员成本' })]));
        expect(response.body.payables).toBeUndefined();
        expect(response.body.payableTotal).toBeUndefined();
        expect(response.body.canViewPayables).toBeUndefined();
        expect(JSON.stringify(response.body)).not.toContain('宇环');
        expect(response.body.grossProfit).toBeUndefined();
        expect(response.body).not.toHaveProperty('profitSections');
        expect(JSON.stringify(response.body)).not.toContain('RECEIVABLE_BUSINESS');
        expect(JSON.stringify(response.body)).not.toContain('应收与业务利润');
      });

    await request(app.getHttpServer())
      .put('/api/system/roles/UG_CUSTOMER_SERVICE/permissions')
      .set('Authorization', app.auth(adminToken))
      .send({ permissions: ['workspace:access', 'orders:read', 'finance:order-fee:payable:view'] })
      .expect(200);
    const servicePayableToken = await app.loginAs('service');
    await request(app.getHttpServer())
      .get(`/api/shipments/${shipment.body.id}/finance-detail`)
      .set('Authorization', app.auth(servicePayableToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.canViewPayables).toBe(true);
        expect(response.body.payables).toEqual(expect.arrayContaining([
          expect.objectContaining({ name: '代理运费' })
        ]));
        expect(response.body.payables[0]).not.toHaveProperty('agentName');
        expect(response.body).not.toHaveProperty('profitSections');
        expect(response.body.grossProfit).toBeUndefined();
      });

    await request(app.getHttpServer())
      .put('/api/system/roles/UG_CUSTOMER_SERVICE/permissions')
      .set('Authorization', app.auth(adminToken))
      .send({
        permissions: [
          'workspace:access',
          'orders:read',
          'finance:order-fee:profit:receivable-payable',
          'finance:order-fee:profit:receivable-business',
          'finance:order-fee:profit:business-payable'
        ]
      })
      .expect(200);
    const serviceProfitToken = await app.loginAs('service');
    await request(app.getHttpServer())
      .get(`/api/shipments/${shipment.body.id}/finance-detail`)
      .set('Authorization', app.auth(serviceProfitToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).not.toHaveProperty('canViewPayables');
        expect(response.body).not.toHaveProperty('payables');
        expect(response.body).not.toHaveProperty('payableTotal');
        expect(response.body).not.toHaveProperty('businessCosts');
        expect(response.body.profitSections.map((item: { key: string }) => item.key).sort()).toEqual([
          'RECEIVABLE_PAYABLE'
        ]);
      });

    await request(app.getHttpServer())
      .post(`/api/shipments/${shipment.body.id}/finance-items`)
      .set('Authorization', app.auth(operatorToken))
      .send({ type: 'RECEIVABLE', name: '越权费用', amount: 1 })
      .expect(403);

    const businessCost = await request(app.getHttpServer())
      .post(`/api/shipments/${shipment.body.id}/finance-items`)
      .set('Authorization', app.auth(adminToken))
      .send({ type: 'BUSINESS_COST', name: '业务补录成本', amount: 126, chargeWeightKg: 42, unitPrice: 3 })
      .expect(201);

    await request(app.getHttpServer())
      .put(`/api/shipments/${shipment.body.id}/finance-items/${businessCost.body.id}`)
      .set('Authorization', app.auth(operatorToken))
      .send({ amount: 130 })
      .expect(403);

    await request(app.getHttpServer())
      .put(`/api/shipments/${shipment.body.id}/finance-items/${businessCost.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .send({ amount: 132, remark: '排货后管理员调整' })
      .expect(200)
      .expect((response) => {
        expect(response.body.amount).toBe(132);
      });

    await request(app.getHttpServer())
      .post(`/api/shipments/${shipment.body.id}/finance-items`)
      .set('Authorization', app.auth(operatorToken))
      .send({ type: 'PAYABLE', name: '越权应付', amount: 1 })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/shipments/${shipment.body.id}/finance-items/${receivable.body.id}/lock`)
      .set('Authorization', app.auth(adminToken))
      .send()
      .expect(201)
      .expect((response) => {
        expect(response.body.locked).toBe(true);
      });

    await request(app.getHttpServer())
      .put(`/api/shipments/${shipment.body.id}/finance-items/${receivable.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .send({ amount: 329.7 })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/shipments/${shipment.body.id}/finance-items/${receivable.body.id}/unlock`)
      .set('Authorization', app.auth(adminToken))
      .send()
      .expect(201);

    await request(app.getHttpServer())
      .put(`/api/shipments/${shipment.body.id}/finance-items/${receivable.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .send({ amount: 329.7, remark: '调整后金额' })
      .expect(200)
      .expect((response) => {
        expect(response.body.amount).toBe(329.7);
      });

    await request(app.getHttpServer())
      .delete(`/api/shipments/${shipment.body.id}/finance-items/${receivable.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/system/audit-logs?action=shipment.finance_item.delete&target=${receivable.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'shipment.finance_item.delete',
            target: receivable.body.id,
            after: expect.objectContaining({ hardDelete: true })
          })
        ]));
      });

    await request(app.getHttpServer())
      .get(`/api/shipments/${shipment.body.id}/finance-detail`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.receivables).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: receivable.body.id })]));
        expect(response.body.businessCosts).toEqual(expect.arrayContaining([expect.objectContaining({ id: businessCost.body.id, name: '业务补录成本' })]));
      });
  });

  it('physically deletes unreferenced payable fees and blocks payment-referenced fees', async () => {
    const adminToken = await app.loginAs('admin');
    const shipment = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'HARD-DELETE-PAYABLE-001',
        systemOrderNo: 'SYHARDDELETEPAYABLE001',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        channelId: 'ch-dhl-hk',
        agentId: 'a-yuhuan',
        packageCount: 1,
        receivableWeightKg: 10,
        agentWeightKg: 10
      })
      .expect(201);

    const deletable = await request(app.getHttpServer())
      .post('/api/finance/payable-audits')
      .set('Authorization', app.auth(adminToken))
      .send({ shipmentId: shipment.body.id, name: '可删除应付', amount: 88, currency: 'RMB', agentName: '宇环' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/finance/payable-audits/${deletable.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/system/audit-logs?action=finance.payable.delete&target=${deletable.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ after: expect.objectContaining({ hardDelete: true }) })
        ]));
      });

    const referenced = await request(app.getHttpServer())
      .post('/api/finance/payable-audits')
      .set('Authorization', app.auth(adminToken))
      .send({ shipmentId: shipment.body.id, name: '付款引用应付', amount: 99, currency: 'RMB', agentName: '宇环' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/finance/payable-audits/${referenced.body.id}/audit`)
      .set('Authorization', app.auth(adminToken))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/finance/payable-audits/${referenced.body.id}/reverse-audit`)
      .set('Authorization', app.auth(adminToken))
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/shipments/${shipment.body.id}/finance-items/${referenced.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('付款申请');
      });
  });

  it('water receipt generates strict Beijing daily receipt numbers and ignores custom receiptNo', async () => {
    const adminToken = await app.loginAs('admin');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-06-21T16:05:00.000Z'));
    try {
      const createdReceipts: Array<{ id: string; receiptNo: string }> = [];
      for (let index = 0; index < 5; index += 1) {
        const response = await request(app.getHttpServer())
          .post('/api/finance/water-receipts')
          .set('Authorization', app.auth(adminToken))
          .send({
            receiptNo: `MANUAL-${index + 1}`,
            customerCode: '9409',
            receiptMethod: '招商银行',
            receiptDate: '2026-06-01T11:05:00.000+08:00',
            amount: 100 + index,
            currency: 'RMB',
            paymentNo: `WATER-NO-STRICT-${index + 1}`
          })
          .expect(201);
        expect(response.body.receiptNo).toBe(`SD20260622${String(index + 1).padStart(3, '0')}`);
        expect(response.body.receiptNo).toHaveLength(13);
        createdReceipts.push(response.body);
      }

      await request(app.getHttpServer())
        .post(`/api/finance/water-receipts/${createdReceipts[0].id}/void`)
        .set('Authorization', app.auth(adminToken))
        .send({ reason: '编号不复用测试' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/finance/water-receipts')
        .set('Authorization', app.auth(adminToken))
        .send({
          receiptNo: 'SHOULD-NOT-BE-USED',
          customerCode: '9409',
          receiptMethod: '招商银行',
          receiptDate: '2026-06-01T11:10:00.000+08:00',
          amount: 200,
          currency: 'RMB',
          paymentNo: 'WATER-NO-STRICT-6'
        })
        .expect(201)
        .expect((response) => {
          expect(response.body.receiptNo).toBe('SD20260622006');
          expect(response.body.receiptNo).toHaveLength(13);
        });

      await request(app.getHttpServer())
        .get('/api/system/audit-logs?action=finance.water_receipt.create')
        .set('Authorization', app.auth(adminToken))
        .expect(200)
        .expect((response) => {
          expect(response.body.rows).toEqual(expect.arrayContaining([
            expect.objectContaining({
              target: createdReceipts[0].id,
              after: expect.objectContaining({ receiptNo: 'SD20260622001' })
            })
          ]));
        });
    } finally {
      vi.useRealTimers();
    }
  });

  it('water receipt keeps paymentNo as a manually edited field', async () => {
    const adminToken = await app.loginAs('admin');
    const created = await request(app.getHttpServer())
      .post('/api/finance/water-receipts')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerCode: '9409',
        receiptMethod: '招商银行',
        receiptDate: '2026-06-22T11:05:00.000+08:00',
        amount: 940.9,
        currency: 'RMB',
        paymentNo: '  MANUAL-PAY-001  '
      })
      .expect(201);
    expect(created.body.paymentNo).toBe('MANUAL-PAY-001');
    expect(created.body.paymentNo).not.toMatch(/^SD\d{11}$/);

    await request(app.getHttpServer())
      .post('/api/finance/water-receipts')
      .set('Authorization', app.auth(adminToken))
      .send({ customerCode: '9409', receiptMethod: '招商银行', receiptDate: '2026-06-22T11:06:00.000+08:00', amount: 1, currency: 'RMB' })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('付款编号不能为空'));

    await request(app.getHttpServer())
      .post('/api/finance/water-receipts')
      .set('Authorization', app.auth(adminToken))
      .send({ customerCode: '9409', receiptMethod: '招商银行', receiptDate: '2026-06-22T11:07:00.000+08:00', amount: 1, currency: 'RMB', paymentNo: 'MANUAL-\u200bPAY-001' })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('付款编号已存在，不能重复录入'));

    await request(app.getHttpServer())
      .put(`/api/finance/water-receipts/${created.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .send({ paymentNo: 'MANUAL-PAY-001' })
      .expect(200);

    const another = await request(app.getHttpServer())
      .post('/api/finance/water-receipts')
      .set('Authorization', app.auth(adminToken))
      .send({ customerCode: '9409', receiptMethod: '招商银行', receiptDate: '2026-06-22T11:08:00.000+08:00', amount: 1, currency: 'RMB', paymentNo: 'MANUAL-PAY-SECOND' })
      .expect(201);
    expect(another.body.paymentNo).toBe('MANUAL-PAY-SECOND');

    await request(app.getHttpServer())
      .put(`/api/finance/water-receipts/${created.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .send({ paymentNo: 'MANUAL-PAY-SECOND' })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('付款编号已存在，不能重复录入'));

    const updated = await request(app.getHttpServer())
      .put(`/api/finance/water-receipts/${created.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .send({ paymentNo: '  MANUAL-PAY-EDITED  ', remark: '付款编号手动修改' })
      .expect(200);
    expect(updated.body.paymentNo).toBe('MANUAL-PAY-EDITED');

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=finance.water_receipt.update')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            target: created.body.id,
            before: expect.objectContaining({ paymentNo: 'MANUAL-PAY-001' }),
            after: expect.objectContaining({ paymentNo: 'MANUAL-PAY-EDITED' })
          })
        ]));
      });
  });

  it('water receipt voucher upload returns accessible preview url and redacts unauthorized list response', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');
    const created = await request(app.getHttpServer())
      .post('/api/finance/water-receipts')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerCode: '9409',
        receiptMethod: '招商银行',
        receiptDate: '2026-07-09T10:00:00.000Z',
        amount: 321,
        currency: 'RMB',
        paymentNo: 'WATER-VOUCHER-PREVIEW'
      })
      .expect(201);

    const uploaded = await request(app.getHttpServer())
      .post('/api/finance/voucher-images')
      .set('Authorization', app.auth(adminToken))
      .field('context', 'WATER_RECEIPT')
      .field('waterReceiptId', created.body.id)
      .attach('file', tinyPng, { filename: 'receipt-initial.png', contentType: 'image/png' })
      .expect(201);
    expect(uploaded.body).toEqual(expect.objectContaining({
      waterReceiptId: created.body.id,
      fileName: 'receipt-initial.png',
      mimeType: 'image/png',
      sizeBytes: tinyPng.length
    }));
    expect(uploaded.body.url).toMatch(/^\/api\/uploads\/vouchers\/\d{8}-[0-9a-f-]+\.png$/);
    expect(uploaded.body.url).not.toContain('/api/uploads/uploads/');
    await request(app.getHttpServer())
      .get(uploaded.body.url)
      .expect(200)
      .expect('Content-Type', /image\/png/);

    await request(app.getHttpServer())
      .get('/api/finance/water-receipts?paymentNo=WATER-VOUCHER-PREVIEW&status=ALL')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: created.body.id,
            voucher: expect.objectContaining({
              fileName: 'receipt-initial.png',
              url: uploaded.body.url
            })
          })
        ]));
      });

    await request(app.getHttpServer())
      .get('/api/finance/water-receipts?paymentNo=WATER-VOUCHER-PREVIEW&status=ALL')
      .set('Authorization', app.auth(operatorToken))
      .expect(200)
      .expect((response) => {
        const row = response.body.rows.find((item: { id: string }) => item.id === created.body.id);
        expect(row).toEqual(expect.objectContaining({
          voucher: expect.objectContaining({ fileName: 'receipt-initial.png', url: uploaded.body.url })
        }));
      });

    const replaced = await request(app.getHttpServer())
      .post('/api/finance/voucher-images')
      .set('Authorization', app.auth(adminToken))
      .field('context', 'WATER_RECEIPT')
      .field('waterReceiptId', created.body.id)
      .attach('file', tinyPng, { filename: 'receipt-replaced.png', contentType: 'image/png' })
      .expect(201);
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=finance.water_receipt.voucher')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'finance.water_receipt.voucher',
            target: created.body.id,
            before: expect.objectContaining({
              receiptNo: created.body.receiptNo,
              fileName: 'receipt-initial.png'
            }),
            after: expect.objectContaining({
              receiptNo: created.body.receiptNo,
              fileName: 'receipt-replaced.png',
              sizeBytes: tinyPng.length,
              mimeType: 'image/png',
              previousFileName: 'receipt-initial.png'
            })
          })
        ]));
      });
    await request(app.getHttpServer())
      .get(replaced.body.url)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/finance/water-receipts/${created.body.id}/voucher`)
      .set('Authorization', app.auth(operatorToken))
      .expect(200)
      .expect({ deleted: true });
    await request(app.getHttpServer())
      .get('/api/finance/water-receipts?paymentNo=WATER-VOUCHER-PREVIEW&status=ALL')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        const row = response.body.rows.find((item: { id: string }) => item.id === created.body.id);
        expect(row.voucher).toBeUndefined();
      });
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=finance.water_receipt.voucher.delete')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => expect(response.body.rows).toEqual(expect.arrayContaining([
        expect.objectContaining({ action: 'finance.water_receipt.voucher.delete', target: created.body.id })
      ])));
  });

  it('auto-fills receivable settlement method and persists editable payment numbers', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');
    const warehouseToken = await app.loginAs('warehouse');

    const shipment = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'RECV-AUTO-001',
        systemOrderNo: 'SYRECV_AUTO_001',
        businessType: 'DEDICATED_LINE',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 12,
        agentWeightKg: 12,
        channelId: 'ch-dhl-hk',
        initialStatus: 'DRAFT',
        latestTracking: '应收自动填充测试单'
      })
      .expect(201);

    const created = await request(app.getHttpServer())
      .post('/api/finance/receivable-audits')
      .set('Authorization', app.auth(adminToken))
      .send({
        systemOrderNo: 'SYRECV_AUTO_001',
        name: '测试运费',
        amount: 540,
        currency: 'RMB',
        paymentNo: 'PAY-RECV-001',
        remark: '付款编号可编辑'
      })
      .expect(201);

    expect(created.body).toEqual(expect.objectContaining({
      settlementMethod: '自动匹配',
      paymentNo: 'PAY-RECV-001'
    }));

    await request(app.getHttpServer())
      .get('/api/finance/receivable-audits')
	      .set('Authorization', app.auth(adminToken))
	      .expect(200)
	      .expect((response) => {
	        expect(response.body.rows).toEqual(expect.arrayContaining([
	          expect.objectContaining({
	            id: created.body.id,
	            systemOrderNo: 'SYRECV_AUTO_001',
            settlementMethod: '自动匹配',
            paymentNo: 'PAY-RECV-001'
          })
        ]));
      });

    await request(app.getHttpServer())
      .get(`/api/shipments/${shipment.body.id}/finance-detail`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.receivables).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: created.body.id,
            settlementMethod: '自动匹配',
            paymentNo: 'PAY-RECV-001'
	          })
	        ]));
	      });

    const beforeReceiptAccounts = await request(app.getHttpServer())
      .get('/api/finance/customer-accounts')
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    const beforeReceiptBalance = beforeReceiptAccounts.body.find((account: { customerId: string; currency: string; balance: number }) => account.customerId === 'c-9409' && account.currency === 'RMB')?.balance ?? 0;
    const beforeAutoMatchAudit = await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=finance.water_receipt.auto_match')
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    const previousAutoMatchIds = new Set(beforeAutoMatchAudit.body.rows.map((row: { id: string }) => row.id));

	    const createdReceipt = await request(app.getHttpServer())
	      .post('/api/finance/water-receipts')
	      .set('Authorization', app.auth(adminToken))
	      .send({
	        customerCode: '9409',
	        receiptMethod: '招商银行',
	        receiptDate: '2026-06-25T11:05:00.000+08:00',
	        amount: 300,
	        currency: 'RMB',
	        paymentNo: 'RECV-AUTO-RECEIPT'
	      })
	      .expect(201);
	    const receipt = await request(app.getHttpServer())
	      .post(`/api/finance/water-receipts/${createdReceipt.body.id}/mark-arrived`)
	      .set('Authorization', app.auth(adminToken))
	      .send({})
	      .expect(201);
    const afterReceiptAccounts = await request(app.getHttpServer())
      .get('/api/finance/customer-accounts')
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    const afterAutoMatchAudit = await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=finance.water_receipt.auto_match')
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    const autoMatchedAmount = afterAutoMatchAudit.body.rows
      .filter((row: { id: string }) => !previousAutoMatchIds.has(row.id))
      .reduce((sum: number, row: { after?: { amount?: number } }) => sum + Number(row.after?.amount ?? 0), 0);
    expect(afterReceiptAccounts.body.find((account: { customerId: string; currency: string; balance: number }) => account.customerId === 'c-9409' && account.currency === 'RMB')?.balance).toBe(beforeReceiptBalance + 300 - autoMatchedAmount);
	    await request(app.getHttpServer())
	      .post('/api/finance/voucher-images')
	      .set('Authorization', app.auth(adminToken))
	      .field('context', 'WATER_RECEIPT')
	      .field('waterReceiptId', receipt.body.id)
	      .attach('file', tinyPng, { filename: 'recv-auto-water.png', contentType: 'image/png' })
	      .expect(201);
	    for (const action of ['finance.water_receipt.create', 'finance.water_receipt.arrive', 'finance.water_receipt.voucher']) {
	      await request(app.getHttpServer())
	        .get(`/api/system/audit-logs?action=${action}`)
	        .set('Authorization', app.auth(adminToken))
	        .expect(200)
	        .expect((response) => {
	          expect(response.body.rows).toEqual(expect.arrayContaining([
	            expect.objectContaining({ action, target: receipt.body.id })
	          ]));
	        });
	    }
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=finance.water_receipt.arrive')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'finance.water_receipt.arrive',
            target: receipt.body.id,
            after: expect.objectContaining({
              receiptNo: receipt.body.receiptNo,
              paymentNo: 'RECV-AUTO-RECEIPT',
              customerCode: '9409',
              amount: 300,
              currency: 'RMB',
              statusBefore: 'PENDING',
              statusAfter: 'ARRIVED',
              operatedBy: 'admin',
              operatedAt: expect.any(String),
              arrivedAmount: 300,
              accountBalanceBefore: beforeReceiptBalance,
              accountBalanceAfter: beforeReceiptBalance + 300,
              customerAccountBalance: beforeReceiptBalance + 300
            })
          })
        ]));
      });

    const matchedFinanceDetail = await request(app.getHttpServer())
      .get(`/api/shipments/${shipment.body.id}/finance-detail`)
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    const matchedReceivable = matchedFinanceDetail.body.receivables.find((item: { id: string }) => item.id === created.body.id);
    const waterReceiptMatched = matchedReceivable.receiptStatus === 'RECEIVED';

	    await request(app.getHttpServer())
	      .post('/api/finance/receivable-audits/batch-audit')
	      .set('Authorization', app.auth(adminToken))
	      .send({ ids: [created.body.id, 'missing-receivable'] })
	      .expect(201)
	      .expect((response) => {
	        expect(response.body.successCount).toBe(1);
	        expect(response.body.failureCount).toBe(1);
	        expect(response.body.rows[0].reconciliationStatus).toBe('CONFIRMED');
	      });
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=finance.receivable.audit')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'finance.receivable.audit',
            target: created.body.id,
            after: expect.objectContaining({
              id: created.body.id,
              systemOrderNo: 'SYRECV_AUTO_001',
              customerCode: '9409',
              name: '测试运费',
              amount: 540,
              currency: 'RMB',
              paymentNo: matchedReceivable.paymentNo,
              matchedReceiptNo: matchedReceivable.paymentNo,
              receivedAmount: matchedReceivable.receivedAmount,
              receiptStatus: matchedReceivable.receiptStatus,
              waterReceiptMatched,
              statusFrom: 'PENDING',
              statusTo: 'CONFIRMED',
              reviewStatus: 'CONFIRMED',
              reviewedBy: 'admin',
              reviewedAt: expect.any(String),
              locked: false
            })
          })
        ]));
      });

	    const pendingReceipt = await request(app.getHttpServer())
	      .post('/api/finance/water-receipts')
	      .set('Authorization', app.auth(adminToken))
	      .send({
	        customerCode: '9409',
	        receiptMethod: '招商银行',
	        receiptDate: '2026-06-25T11:06:00.000+08:00',
	        amount: 50,
	        currency: 'RMB',
	        paymentNo: 'PENDING-MATCH-GUARD-001'
	      })
	      .expect(201);
	    await request(app.getHttpServer())
	      .post(`/api/finance/water-receipts/${pendingReceipt.body.id}/match-orders`)
	      .set('Authorization', app.auth(adminToken))
	      .send({ matches: [{ receivableFinanceItemId: created.body.id, amount: 10 }] })
	      .expect(400)
	      .expect((response) => {
	        expect(response.body.message).toContain('水单未到账，不能匹配订单');
	      });

    const archiveReceivable = await request(app.getHttpServer())
      .post('/api/finance/receivable-audits')
      .set('Authorization', app.auth(adminToken))
      .send({
        systemOrderNo: 'SYRECV_AUTO_001',
        name: '归档闭环应收',
        amount: 45,
        currency: 'RMB'
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/finance/receivable-audits/${archiveReceivable.body.id}/audit`)
      .set('Authorization', app.auth(adminToken))
      .expect(201);
    const archiveReceipt = await request(app.getHttpServer())
      .post('/api/finance/water-receipts')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerCode: '9409',
        receiptMethod: '招商银行',
        receiptDate: '2026-06-25T11:07:00.000+08:00',
        amount: 45,
        currency: 'RMB',
        paymentNo: 'ARCHIVE-CLOSE-LOOP-001'
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/finance/water-receipts/${archiveReceipt.body.id}/mark-arrived`)
      .set('Authorization', app.auth(adminToken))
      .send({})
      .expect(201);
    const archiveMatchRequest = await request(app.getHttpServer())
      .post(`/api/finance/water-receipts/${archiveReceipt.body.id}/match-orders`)
      .set('Authorization', app.auth(adminToken))
      .send({ matches: [{ receivableFinanceItemId: archiveReceivable.body.id, amount: 45 }] })
      .expect(201);
    const archivePendingAllocation = archiveMatchRequest.body.allocations.find((allocation: { receivableId?: string }) => allocation.receivableId === archiveReceivable.body.id);
    expect(archiveMatchRequest.body).toEqual(expect.objectContaining({ balance: 45, status: 'ARRIVED' }));
    expect(archivePendingAllocation).toEqual(expect.objectContaining({ amount: 45, status: 'PENDING' }));

    await request(app.getHttpServer())
      .post(`/api/finance/receivable-match-requests/${archivePendingAllocation.requestId}/approve`)
      .set('Authorization', app.auth(adminToken))
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          id: archiveReceivable.body.id,
          receiptStatus: 'RECEIVED',
          receivedAmount: 45
        }));
      });
    await request(app.getHttpServer())
      .get(`/api/finance/water-receipts?receiptNo=${archiveReceipt.body.receiptNo}&status=ALL`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows.some((row: { id: string }) => row.id === archiveReceipt.body.id)).toBe(false);
      });
    await request(app.getHttpServer())
      .get(`/api/finance/water-receipts?receiptNo=${archiveReceipt.body.receiptNo}&status=ARCHIVED`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ id: archiveReceipt.body.id, status: 'ARCHIVED' })
        ]));
      });
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=finance.water_receipt.match_request.fee_approve')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ action: 'finance.water_receipt.match_request.fee_approve', target: archivePendingAllocation.requestId })
        ]));
      });
	    await request(app.getHttpServer())
	      .post('/api/finance/receivable-audits/batch-reverse-audit')
	      .set('Authorization', app.auth(adminToken))
	      .send({ ids: [created.body.id] })
	      .expect(201)
	      .expect((response) => {
	        expect(response.body.successCount).toBe(1);
	        expect(response.body.failureCount).toBe(0);
	        expect(response.body.rows[0]).toEqual(expect.objectContaining({
	          id: created.body.id,
	          reconciliationStatus: 'PENDING'
	        }));
	      });

	    await request(app.getHttpServer())
	      .get('/api/finance/water-receipts?customerCode=9409&status=ALL')
	      .set('Authorization', app.auth(operatorToken))
	      .expect(200)
	      .expect((response) => {
	        expect(response.body.rows.some((row: { createdBy?: string }) => row.createdBy !== 'operator')).toBe(false);
	      });
	    await request(app.getHttpServer())
		      .get('/api/finance/water-receipts?customerCode=9409&status=ALL')
		      .set('Authorization', app.auth(warehouseToken))
		      .expect(403);
		    const operatorReceipt = await request(app.getHttpServer())
		      .post('/api/finance/water-receipts')
		      .set('Authorization', app.auth(operatorToken))
		      .send({
		        customerCode: '9409',
		        receiptMethod: '招商银行',
		        receiptDate: '2026-06-25T11:10:00.000+08:00',
		        amount: 1,
		        currency: 'RMB',
		        paymentNo: 'FORBIDDEN-WATER-RECEIPT-001'
		      })
		      .expect(201);
	    await request(app.getHttpServer())
	      .get('/api/finance/water-receipts?customerCode=9409&status=ALL')
	      .set('Authorization', app.auth(operatorToken))
	      .expect(200)
	      .expect((response) => {
	        expect(response.body.rows).toEqual(expect.arrayContaining([
	          expect.objectContaining({ id: operatorReceipt.body.id, customerCode: '9409', createdBy: 'operator' })
	        ]));
	      });
	    await request(app.getHttpServer())
	      .post(`/api/finance/water-receipts/${archiveReceipt.body.id}/match-orders`)
	      .set('Authorization', app.auth(operatorToken))
	      .send({ matches: [{ receivableFinanceItemId: created.body.id, amount: 1 }] })
	      .expect(403);
	    await request(app.getHttpServer())
	      .post(`/api/finance/water-receipts/${archiveReceipt.body.id}/mark-arrived`)
	      .set('Authorization', app.auth(operatorToken))
	      .send({})
	      .expect(403);
	    await request(app.getHttpServer())
	      .post('/api/finance/water-receipts/export')
	      .set('Authorization', app.auth(operatorToken))
	      .send({ ids: [archiveReceipt.body.id] })
		      .expect(403);
		    await request(app.getHttpServer())
		      .get('/api/system/audit-logs?action=security.permission.denied')
		      .set('Authorization', app.auth(adminToken))
		      .expect(200)
		      .expect((response) => {
		        expect(response.body.rows).toEqual(expect.arrayContaining([
		          expect.objectContaining({
		            action: 'security.permission.denied',
		            actorUsername: 'warehouse',
		            target: expect.stringContaining('/api/finance/water-receipts'),
		            result: 'FAILED',
		            after: expect.objectContaining({ permissions: expect.arrayContaining(['finance:water-receipt:read']) })
		          }),
	        ]));
	      });
    const usdReceivable = await request(app.getHttpServer())
      .post('/api/finance/receivable-audits')
      .set('Authorization', app.auth(adminToken))
      .send({
        systemOrderNo: 'SYRECV_AUTO_001',
        name: 'USD 测试应收',
        amount: 200,
        currency: 'USD',
        remark: 'USD 水单撤销测试'
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/finance/receivable-audits/${usdReceivable.body.id}/audit`)
      .set('Authorization', app.auth(adminToken))
      .expect(201);
	    await request(app.getHttpServer())
	      .post(`/api/finance/water-receipts/${receipt.body.id}/match-orders`)
      .set('Authorization', app.auth(adminToken))
      .send({ matches: [{ receivableFinanceItemId: usdReceivable.body.id, amount: 10 }] })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('水单币种与应收币种不一致');
      });
    const beforeUsdAccounts = await request(app.getHttpServer())
      .get('/api/finance/customer-accounts')
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    const beforeUsdBalance = beforeUsdAccounts.body.find((account: { customerId: string; currency: string; balance: number }) => account.customerId === 'c-9409' && account.currency === 'USD')?.balance ?? 0;
    const usdWaterReceipt = await request(app.getHttpServer())
      .post('/api/finance/water-receipts')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerCode: '9409',
        receiptMethod: '招商银行',
        receiptDate: '2026-06-25T12:05:00.000+08:00',
        amount: 300,
        currency: 'USD',
        paymentNo: 'RECV-AUTO-USD-RECEIPT'
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/finance/water-receipts/${usdWaterReceipt.body.id}/mark-arrived`)
      .set('Authorization', app.auth(adminToken))
      .send({})
      .expect(201);
    const overflowReceivable = await request(app.getHttpServer())
      .post('/api/finance/receivable-audits')
      .set('Authorization', app.auth(adminToken))
      .send({
        systemOrderNo: 'SYRECV_AUTO_001',
        name: 'USD 余额上限测试应收',
        amount: 500,
        currency: 'USD'
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/finance/receivable-audits/${overflowReceivable.body.id}/audit`)
      .set('Authorization', app.auth(adminToken))
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/finance/water-receipts/${usdWaterReceipt.body.id}/match-orders`)
      .set('Authorization', app.auth(adminToken))
      .send({ matches: [{ receivableFinanceItemId: overflowReceivable.body.id, amount: 400 }] })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('匹配金额不能超过水单余额');
      });
    const usdReceiptRows = await request(app.getHttpServer())
      .get(`/api/finance/water-receipts?receiptNo=${usdWaterReceipt.body.receiptNo}&status=ALL`)
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    expect(usdReceiptRows.body.rows[0]).toEqual(expect.objectContaining({
      status: 'ARRIVED',
      balance: 300,
      matches: []
    }));
    const afterUsdMatchAccounts = await request(app.getHttpServer())
      .get('/api/finance/customer-accounts')
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    expect(afterUsdMatchAccounts.body.find((account: { customerId: string; currency: string; balance: number }) => account.customerId === 'c-9409' && account.currency === 'USD')?.balance).toBe(beforeUsdBalance + usdReceiptRows.body.rows[0].balance);
	  });

  it('quotes generates adjusts and drafts customer statements with visibility rules', async () => {
    const adminToken = await app.loginAs('admin');

    await request(app.getHttpServer())
      .post('/api/pricing/quote')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerId: 'c-9409',
        channelId: 'ch-dhl-hk',
        destinationCountry: '美国',
        chargeableWeightKg: 10,
        baseRatePerKg: 20,
        fuelRate: 0.15,
        surcharges: [{ name: '偏远费', amount: 50 }]
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.total).toBe(280);
      });

    const shipment = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'FIN-001',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 10,
        agentWeightKg: 9,
        channelId: 'ch-dhl-hk'
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/shipments/${shipment.body.id}/fees/generate`)
      .set('Authorization', app.auth(adminToken))
      .send({
        baseRatePerKg: 20,
        payableRatePerKg: 14,
        fuelRate: 0.15,
        surcharges: [{ name: '偏远费', amount: 50 }]
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.receivables.map((fee: { name: string }) => fee.name)).toEqual(['基础运费', '燃油费', '附加费']);
        expect(response.body.receivableTotal).toBe(280);
        expect(response.body.payableTotal).toBe(144.9);
      });

    await request(app.getHttpServer())
      .post(`/api/shipments/${shipment.body.id}/receivable-adjustments`)
      .set('Authorization', app.auth(adminToken))
      .send({ name: '人工优惠', amount: -15 })
      .expect(201)
      .expect((response) => {
        expect(response.body.name).toBe('人工优惠');
        expect(response.body.amount).toBe(-15);
      });

    const customerToken = await app.loginAs('customer');

    await request(app.getHttpServer())
      .get('/api/finance/receivables')
      .set('Authorization', app.auth(customerToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.every((fee: { customerName: string }) => fee.customerName.startsWith('9409-'))).toBe(true);
        expect(response.body.some((fee: { name: string; amount: number }) => fee.name === '人工优惠' && fee.amount === -15)).toBe(true);
      });

    await request(app.getHttpServer())
      .post('/api/finance/customer-statements')
      .set('Authorization', app.auth(adminToken))
      .send({ customerId: 'c-9409', periodStart: '2026-06-01', periodEnd: '2026-06-30' })
      .expect(201)
      .expect((response) => {
        expect(response.body.customerName).toBe('9409-Daloday');
        expect(response.body.total).toBeGreaterThanOrEqual(265);
        expect(response.body.status).toBe('DRAFT');
      });

    await request(app.getHttpServer())
      .get('/api/finance/customer-statements')
      .set('Authorization', app.auth(customerToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.every((statement: { customerId: string }) => statement.customerId === 'c-9409')).toBe(true);
      });
  });

  it('records customer payments, settles selected receivables, and exposes account ledger read-only to customers', async () => {
    const adminToken = await app.loginAs('admin');

	    const beforeAccounts = await request(app.getHttpServer())
	      .get('/api/finance/customer-accounts')
	      .set('Authorization', app.auth(adminToken))
	      .expect(200);
	    const before9409 = beforeAccounts.body.find((account: { customerId: string }) => account.customerId === 'c-9409');
	    expect(before9409.balance).toBeGreaterThanOrEqual(0);

    const receivables = await request(app.getHttpServer())
      .get('/api/finance/receivables')
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    const selectedFees = receivables.body
      .filter((fee: { customerName: string; settled: boolean }) => fee.customerName.startsWith('9409-') && !fee.settled)
      .slice(0, 2);
    const amount = selectedFees.reduce((sum: number, fee: { amount: number }) => sum + fee.amount, 0);

    await request(app.getHttpServer())
      .post('/api/finance/payments')
      .set('Authorization', app.auth(adminToken))
      .send({ customerId: 'c-9409', amount, feeIds: selectedFees.map((fee: { id: string }) => fee.id), note: '测试收款' })
      .expect(201)
      .expect((response) => {
	        expect(response.body.payment.settledAmount).toBe(amount);
	        expect(response.body.payment.remainingAmount).toBe(0);
	        expect(response.body.account.balance).toBe(before9409.balance);
        expect(response.body.settledFees.every((fee: { settled: boolean }) => fee.settled)).toBe(true);
      });

    await request(app.getHttpServer())
      .get('/api/finance/receivables')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        const settledIds = new Set(selectedFees.map((fee: { id: string }) => fee.id));
        expect(response.body.filter((fee: { id: string; settled: boolean }) => settledIds.has(fee.id)).every((fee: { settled: boolean }) => fee.settled)).toBe(true);
      });

    await request(app.getHttpServer())
      .get('/api/finance/account-ledger')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ customerId: 'c-9409', amount, note: '测试收款' }),
            expect.objectContaining({ customerId: 'c-9409', amount: -amount, note: '核销应收费用' })
          ])
        );
      });

    const customerToken = await app.loginAs('customer');

    await request(app.getHttpServer())
      .get('/api/finance/customer-accounts')
	      .set('Authorization', app.auth(customerToken))
	      .expect(200)
	      .expect((response) => {
	        expect(response.body).toEqual(expect.arrayContaining([
	          expect.objectContaining({ customerId: 'c-9409', currency: 'RMB', balance: before9409.balance })
	        ]));
	      });

    await request(app.getHttpServer())
      .get('/api/finance/account-ledger')
      .set('Authorization', app.auth(customerToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.every((entry: { customerId: string }) => entry.customerId === 'c-9409')).toBe(true);
      });

    await request(app.getHttpServer())
      .post('/api/finance/payments')
      .set('Authorization', app.auth(customerToken))
      .send({ customerId: 'c-9409', amount: 1 })
      .expect(403);
  });
});
