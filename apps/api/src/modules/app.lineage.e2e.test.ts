import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { warehousePackageInput } from './test-support/e2e-fixtures.js';
import { setupE2eApp } from './test-support/e2e-harness.js';

const tempDir = mkdtempSync(join(tmpdir(), 'sunny-lineage-e2e-'));
process.env.SUNNY_LINEAGE_DB_PATH = join(tempDir, 'lineage.sqlite');
delete process.env.SUNNY_LINEAGE_DISABLED;

describe('Siyuan API lineage', () => {
  const app = setupE2eApp();

  afterAll(() => {
    delete process.env.SUNNY_LINEAGE_DB_PATH;
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('traces imported price book rows through the sidecar without exposing it to non-admin users', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');

    const imported = await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: 'lineage-trace-price-book.xlsx',
        targetModule: 'europeExpress',
        agentShortName: '亿阳国际',
        rows: [
          {
            agentName: '亿阳国际',
            carrierName: 'DHL',
            sourceSheetName: 'Sheet1',
            channelName: '链路渠道',
            destinationCountry: '美国',
            minWeightKg: 0,
            maxWeightKg: 10,
            costPerKg: 12,
            currency: 'RMB'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/system/lineage/price_book/${imported.body.book.id}`)
      .set('Authorization', app.auth(operatorToken))
      .expect(403);

    await request(app.getHttpServer())
      .get(`/api/system/lineage/price_book/${imported.body.book.id}`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        const serialized = JSON.stringify(response.body.root);
        expect(response.body.businessId).toBe(imported.body.book.id);
        expect(response.body.root?.businessId).toBe(imported.body.book.id);
        expect(serialized).toContain('price_book_file');
        expect(serialized).toContain('raw_record');
        expect(serialized).toContain('clean_record');
        expect(serialized).toContain('lineage-trace-price-book.xlsx');
      });
  });

  it('exposes lineage event wiring coverage only to system admins', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');

    await request(app.getHttpServer())
      .get('/api/system/lineage-event-coverage')
      .set('Authorization', app.auth(operatorToken))
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/system/lineage-event-coverage')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.totals.total).toBeGreaterThan(0);
        expect(response.body.totals.pending).toBeGreaterThan(0);
        expect(response.body.modules).toEqual(expect.arrayContaining([
          expect.objectContaining({ module: '报价查价', total: 10, wired: 10, partial: 0, pending: 0 }),
          expect.objectContaining({ module: '业务管理', total: 8, wired: 7, partial: 0, pending: 1 }),
          expect.objectContaining({ module: '仓库管理', total: 10, wired: 7, partial: 0, pending: 3 }),
          expect.objectContaining({ module: '市场管理', total: 6, wired: 3, partial: 0, pending: 3 }),
          expect.objectContaining({ module: '财务管理', total: 10, wired: 8, partial: 0, pending: 2 }),
          expect.objectContaining({ module: '客服管理', total: 11, wired: 8, partial: 0, pending: 3 }),
          expect.objectContaining({ module: '物流轨迹管理', total: 4, wired: 4, partial: 0, pending: 0 })
        ]));
      });
  });

  it('traces pricing markup batch events from a rule source reference', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');

    const rule = await request(app.getHttpServer())
      .post('/api/pricing/markup-rules')
      .set('Authorization', app.auth(adminToken))
      .send({ agentName: '链路加价代理', markupPerKg: 0.8, enabled: true })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/markup-rules/batch-status')
      .set('Authorization', app.auth(adminToken))
      .send({ ids: [rule.body.id], enabled: false })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/system/lineage-source/agent_markup_rule/${rule.body.id}`)
      .set('Authorization', app.auth(operatorToken))
      .expect(403);

    const sourceTrace = await waitForLineageSource(app, adminToken, 'agent_markup_rule', rule.body.id, 'pricing.markup.batch_change');
    const serialized = JSON.stringify(sourceTrace.body.roots);
    expect(serialized).toContain('agent_markup_batch');
    expect(serialized).toContain('batch_status');
    expect(serialized).toContain('pricing.markup.batch_change');
  });

  it('traces order entry draft, submit, review and draft delete events from shipment ids', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');
    const suffix = Date.now();

    const draftPackage = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(adminToken))
      .send(warehousePackageInput({ customerCode: '9409', customerOrderNo: `LIN-DRAFT-${suffix}`, domesticTrackingNo: `LIN-DRAFT-${suffix}` }))
      .expect(201);

    const baseShipment = {
      customerCode: '9409',
      customerOrderNo: `LIN-ENTRY-${suffix}`,
      systemOrderNo: `SYLIN${suffix}`,
      businessType: 'EXPRESS',
      packageType: 'WPX',
      destinationCountry: '美国',
      channelId: 'ch-dhl-hk',
      declarationRequired: false,
      cargoType: '普货',
      productName: '链路测试货物',
      settlementMethod: 'RMB月结'
    };

    const draftEntry = await request(app.getHttpServer())
      .post('/api/shipments/order-entry')
      .set('Authorization', app.auth(operatorToken))
      .send({
        shipment: baseShipment,
        warehousePackageIds: [draftPackage.body.id],
        receivables: [{ type: 'RECEIVABLE', name: '客户运费', amount: 100, currency: 'RMB' }],
        businessCosts: [{ type: 'BUSINESS_COST', name: '业务成本', amount: 80, currency: 'RMB' }],
        submitForReview: false
      })
      .expect(201);

    await waitForShipmentLineage(app, adminToken, draftEntry.body.shipment.id, 'orders.entry.draft');

    await request(app.getHttpServer())
      .get(`/api/operations/line-shipments/${draftEntry.body.shipment.id}/internal-flow-log`)
      .set('Authorization', app.auth(operatorToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toEqual(expect.arrayContaining([
          expect.objectContaining({ stage: '仓库入库', summary: '仓库已完成入库/收货操作' }),
          expect.objectContaining({ stage: '业务录单', summary: '运单已创建' })
        ]));
      });

    await request(app.getHttpServer())
      .put(`/api/shipments/${draftEntry.body.shipment.id}/order-entry-draft`)
      .set('Authorization', app.auth(operatorToken))
      .send({
        shipment: baseShipment,
        warehousePackageIds: [draftPackage.body.id],
        receivables: [{ type: 'RECEIVABLE', name: '客户运费', amount: 100, currency: 'RMB' }],
        businessCosts: [{ type: 'BUSINESS_COST', name: '业务成本', amount: 80, currency: 'RMB' }],
        submitForReview: true
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/shipments/${draftEntry.body.shipment.id}/review/approve`)
      .set('Authorization', app.auth(operatorToken))
      .expect(201);

    const submitTrace = await waitForShipmentLineage(app, adminToken, draftEntry.body.shipment.id, 'orders.review.approve');
    const submitSerialized = JSON.stringify(submitTrace.body.roots);
    expect(submitSerialized).toContain('orders.entry.submit');
    expect(submitSerialized).toContain('shipment_review');

    const deletePackage = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(adminToken))
      .send(warehousePackageInput({ customerCode: '9409', customerOrderNo: `LIN-DEL-${suffix}`, domesticTrackingNo: `LIN-DEL-${suffix}` }))
      .expect(201);

    const deleteDraft = await request(app.getHttpServer())
      .post('/api/shipments/order-entry')
      .set('Authorization', app.auth(adminToken))
      .send({
        shipment: { ...baseShipment, customerOrderNo: `LIN-DEL-${suffix}`, systemOrderNo: `SYLINDEL${suffix}` },
        warehousePackageIds: [deletePackage.body.id],
        receivables: [{ type: 'RECEIVABLE', name: '客户运费', amount: 100, currency: 'RMB' }],
        businessCosts: [{ type: 'BUSINESS_COST', name: '业务成本', amount: 80, currency: 'RMB' }],
        submitForReview: false
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/shipments/${deleteDraft.body.shipment.id}/order-entry-draft`)
      .set('Authorization', app.auth(adminToken))
      .send({ reason: '链路测试删除草稿' })
      .expect(200);

    const deleteTrace = await waitForShipmentLineage(app, adminToken, deleteDraft.body.shipment.id, 'orders.entry.draft_delete');
    expect(JSON.stringify(deleteTrace.body.roots)).toContain('shipment_draft_delete');
  });

  it('traces warehouse package, split, tally and label events from result ids', async () => {
    const adminToken = await app.loginAs('admin');
    const warehouseToken = await app.loginAs('warehouse');
    const suffix = Date.now();

    const packageRow = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(warehouseToken))
      .send(warehousePackageInput({ customerCode: '9409', customerOrderNo: `LIN-WH-${suffix}`, domesticTrackingNo: `LIN-WH-${suffix}` }))
      .expect(201);

    await waitForLineageResult(app, adminToken, 'warehouse_package', packageRow.body.id, 'warehouse.today.receive');

    await request(app.getHttpServer())
      .patch(`/api/warehouse/packages/${packageRow.body.id}`)
      .set('Authorization', app.auth(warehouseToken))
      .send({
        customerCode: '9409',
        customerOrderNo: `LIN-WH-${suffix}`,
        domesticTrackingNo: `LIN-WH-${suffix}`,
        packageCount: 1,
        weightKg: 3,
        lengthCm: 40,
        widthCm: 30,
        heightCm: 20,
        remark: '链路更新包裹'
      })
      .expect(200);

    await waitForLineageResult(app, adminToken, 'warehouse_package_update', packageRow.body.id, 'warehouse.packages.update');

    const splitSource = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(warehouseToken))
      .send(warehousePackageInput({ customerCode: '9409', customerOrderNo: `LIN-SPLIT-${suffix}`, domesticTrackingNo: `LIN-SPLIT-${suffix}`, packageCount: 2 }))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/warehouse/packages/${splitSource.body.id}/split`)
      .set('Authorization', app.auth(warehouseToken))
      .send({ splitCount: 2, remark: '链路拆分' })
      .expect(201);

    await waitForLineageResult(app, adminToken, 'warehouse_package_split', splitSource.body.id, 'warehouse.packages.split');

    const tallyPackage = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(warehouseToken))
      .send(warehousePackageInput({ customerCode: '9409', customerOrderNo: `LIN-TALLY-${suffix}`, domesticTrackingNo: `LIN-TALLY-${suffix}` }))
      .expect(201);

    const tallyTask = await request(app.getHttpServer())
      .post('/api/warehouse/tally-tasks')
      .set('Authorization', app.auth(warehouseToken))
      .send({ packageIds: [tallyPackage.body.id], tallyRequirement: '链路理货', remark: '链路创建理货' })
      .expect(201);

    await waitForLineageResult(app, adminToken, 'warehouse_tally_task', tallyTask.body.id, 'warehouse.tally.create');

    await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${tallyTask.body.id}/complete`)
      .set('Authorization', app.auth(warehouseToken))
      .send({ packageCount: 1, weightKg: 3, lengthCm: 40, widthCm: 30, heightCm: 20 })
      .expect(201);

    await waitForLineageResult(app, adminToken, 'warehouse_tally_complete', tallyTask.body.id, 'warehouse.tally.complete');

    const generatedLabel = await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${tallyTask.body.id}/label`)
      .set('Authorization', app.auth(warehouseToken))
      .expect(201);

    const labelTrace = await waitForLineageResult(app, adminToken, 'warehouse_label', generatedLabel.body.labelNo, 'warehouse.queue.label');
    expect(JSON.stringify(labelTrace.body.root)).toContain('tally_label_generate');
  });

  it('traces market routing, pending routing delete and reroute events from shipment ids', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');
    const suffix = Date.now();

    const createWaitingSortShipment = async (tag: string) => {
      const packageRow = await request(app.getHttpServer())
        .post('/api/warehouse/packages')
        .set('Authorization', app.auth(adminToken))
        .send(warehousePackageInput({ customerCode: '9409', customerOrderNo: `LIN-MKT-${tag}-${suffix}`, domesticTrackingNo: `LIN-MKT-${tag}-${suffix}` }))
        .expect(201);

      const entry = await request(app.getHttpServer())
        .post('/api/shipments/order-entry')
        .set('Authorization', app.auth(operatorToken))
        .send({
          shipment: {
            customerCode: '9409',
            customerOrderNo: `LIN-MKT-${tag}-${suffix}`,
            systemOrderNo: `SYLINMKT${tag}${suffix}`,
            businessType: 'DEDICATED_LINE',
            packageType: 'WPX',
            destinationCountry: '美国',
            channelId: 'ch-dhl-hk',
            declarationRequired: false,
            cargoType: '普货',
            productName: '市场链路测试货物',
            settlementMethod: 'RMB月结'
          },
          warehousePackageIds: [packageRow.body.id],
          receivables: [{ type: 'RECEIVABLE', name: '客户运费', amount: 100, currency: 'RMB' }],
          businessCosts: [{ type: 'BUSINESS_COST', name: '业务成本', amount: 70, currency: 'RMB' }],
          submitForReview: true
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/shipments/${entry.body.shipment.id}/review/approve`)
        .set('Authorization', app.auth(operatorToken))
        .expect(201);

      return entry.body.shipment;
    };

    const routeShipment = await createWaitingSortShipment('ROUTE');
    await request(app.getHttpServer())
      .post(`/api/shipments/${routeShipment.id}/route`)
      .set('Authorization', app.auth(adminToken))
      .send({ channelId: 'ch-dhl-hk', agentId: 'a-yuhuan', agentChannelName: '宇环 DHL', chargeWeightKg: 12.5, unitPrice: 8, currency: 'RMB' })
      .expect(201);

    const routeTrace = await waitForShipmentLineage(app, adminToken, routeShipment.id, 'market.pending_routing.route');
    expect(JSON.stringify(routeTrace.body.roots)).toContain('shipment_route');

    const deleteShipment = await createWaitingSortShipment('DEL');
    await request(app.getHttpServer())
      .delete(`/api/shipments/${deleteShipment.id}/pending-routing`)
      .set('Authorization', app.auth(adminToken))
      .send({ reason: '链路测试删除待排货' })
      .expect(200);

    const deleteTrace = await waitForShipmentLineage(app, adminToken, deleteShipment.id, 'market.pending_routing.delete');
    expect(JSON.stringify(deleteTrace.body.roots)).toContain('shipment_pending_routing_delete');

    const rerouteShipment = await createWaitingSortShipment('REROUTE');
    await request(app.getHttpServer())
      .post(`/api/shipments/${rerouteShipment.id}/route`)
      .set('Authorization', app.auth(adminToken))
      .send({ channelId: 'ch-dhl-hk', agentId: 'a-yuhuan', agentChannelName: '宇环 DHL', chargeWeightKg: 13, unitPrice: 8, currency: 'RMB' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/warehouse/handover/print')
      .set('Authorization', app.auth(adminToken))
      .send({ shipmentIds: [rerouteShipment.id] })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/shipments/${rerouteShipment.id}/dispatch`)
      .set('Authorization', app.auth(adminToken))
      .send({ handoverNo: `HD-LIN-MKT-${suffix}` })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/shipments/${rerouteShipment.id}/reroute`)
      .set('Authorization', app.auth(adminToken))
      .send({ reason: '链路测试退回重排' })
      .expect(201);

    const rerouteTrace = await waitForShipmentLineage(app, adminToken, rerouteShipment.id, 'market.routed.reroute');
    expect(JSON.stringify(rerouteTrace.body.roots)).toContain('shipment_reroute');
  });

  it('traces customer service confirmation, transfer, lifecycle and problem events from a shipment', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');
    const suffix = Date.now();

    const packageRow = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(adminToken))
      .send(warehousePackageInput({ customerCode: '9409', customerOrderNo: `LIN-CS-${suffix}`, domesticTrackingNo: `LIN-CS-${suffix}` }))
      .expect(201);

    const entry = await request(app.getHttpServer())
      .post('/api/shipments/order-entry')
      .set('Authorization', app.auth(operatorToken))
      .send({
        shipment: {
          customerCode: '9409',
          customerOrderNo: `LIN-CS-${suffix}`,
          systemOrderNo: `SYLINCS${suffix}`,
          businessType: 'DEDICATED_LINE',
          packageType: 'WPX',
          destinationCountry: '加拿大',
          channelId: 'ch-dhl-hk',
          declarationRequired: false,
          cargoType: '普货',
          productName: '客服链路测试货物',
          settlementMethod: 'RMB月结'
        },
        warehousePackageIds: [packageRow.body.id],
        receivables: [{ type: 'RECEIVABLE', name: '客户运费', amount: 100, currency: 'RMB' }],
        businessCosts: [{ type: 'BUSINESS_COST', name: '业务成本', amount: 70, currency: 'RMB' }],
        submitForReview: true
      })
      .expect(201);
    const shipmentId = entry.body.shipment.id;

    await request(app.getHttpServer())
      .post(`/api/shipments/${shipmentId}/review/approve`)
      .set('Authorization', app.auth(operatorToken))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/shipments/${shipmentId}/route`)
      .set('Authorization', app.auth(adminToken))
      .send({ channelId: 'ch-dhl-hk', agentId: 'a-yuhuan', agentChannelName: '宇环 DHL', chargeWeightKg: 10, unitPrice: 8, currency: 'RMB' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/warehouse/handover/print')
      .set('Authorization', app.auth(adminToken))
      .send({ shipmentIds: [shipmentId] })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/shipments/${shipmentId}/dispatch`)
      .set('Authorization', app.auth(adminToken))
      .send({ handoverNo: `HD-LIN-CS-${suffix}` })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/shipments/${shipmentId}/business-data/approve`)
      .set('Authorization', app.auth(adminToken))
      .send({ remark: '链路数据确认' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/shipments/${shipmentId}/agent-data/approve`)
      .set('Authorization', app.auth(adminToken))
      .send({ remark: '链路代理数据确认' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/shipments/${shipmentId}/operational`)
      .set('Authorization', app.auth(adminToken))
      .send({ transferNo: `1ZLINCS${suffix}`, latestTracking: '链路转单号已维护' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/shipments/${shipmentId}/operational`)
      .set('Authorization', app.auth(adminToken))
      .send({ status: 'WAITING_DEPARTURE', latestTracking: '链路待离港' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/shipments/${shipmentId}/operational`)
      .set('Authorization', app.auth(adminToken))
      .send({
        status: 'DEPARTED',
        latestTracking: '链路已离港',
        etdAt: '2026-07-01T10:00:00.000Z',
        etaAt: '2026-07-10T10:00:00.000Z',
        statusRemark: '链路离港批注'
      })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/shipments/${shipmentId}/operational`)
      .set('Authorization', app.auth(adminToken))
      .send({
        latestTracking: '链路离港后维护',
        etdAt: '2026-07-02T10:00:00.000Z',
        etaAt: '2026-07-11T10:00:00.000Z'
      })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/shipments/${shipmentId}/operational`)
      .set('Authorization', app.auth(adminToken))
      .send({ status: 'ARRIVED_PORT', latestTracking: '链路已到港', statusRemark: '链路到港批注' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/shipments/${shipmentId}/operational`)
      .set('Authorization', app.auth(adminToken))
      .send({ status: 'DELIVERING', latestTracking: '链路已派送', statusRemark: '链路派送批注' })
      .expect(200);

    const problem = await request(app.getHttpServer())
      .post(`/api/shipments/${shipmentId}/problem-tickets`)
      .set('Authorization', app.auth(adminToken))
      .send({ reason: '链路问题件', customerVisible: true })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/problem-tickets/${problem.body.id}/replies`)
      .set('Authorization', app.auth(adminToken))
      .send({ message: '链路问题件回复' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/problem-tickets/${problem.body.id}/close`)
      .set('Authorization', app.auth(adminToken))
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/shipments/${shipmentId}/operational`)
      .set('Authorization', app.auth(adminToken))
      .send({ status: 'SIGNED', latestTracking: '链路已签收', statusRemark: '链路签收批注' })
      .expect(200);

    const trace = await waitForShipmentLineage(app, adminToken, shipmentId, 'customer_service.signed.confirm');
    const serialized = JSON.stringify(trace.body.roots);
    expect(serialized).toContain('customer_service.data_confirm.approve');
    expect(serialized).toContain('customer_service.transfer.update');
    expect(serialized).toContain('customer_service.departure.confirm');
    expect(serialized).toContain('customer_service.departed.update');
    expect(serialized).toContain('customer_service.arrived_port.confirm');
    expect(serialized).toContain('customer_service.delivering.confirm');
    expect(serialized).toContain('customer_service.signed.confirm');
    expect(serialized).toContain('customer_service.problems.change');
    expect(serialized).toContain('customer_service_data_confirm');
    expect(serialized).toContain('shipment_transfer_update');
    expect(serialized).toContain('shipment_departure_confirm');
    expect(serialized).toContain('shipment_departed_update');
    expect(serialized).toContain('shipment_arrived_port_confirm');
    expect(serialized).toContain('shipment_delivering_confirm');
    expect(serialized).toContain('shipment_signed_confirm');
    expect(serialized).toContain('problem_ticket');

    await request(app.getHttpServer())
      .get(`/api/operations/line-shipments/${shipmentId}/internal-flow-log`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        const stages = response.body.items.map((item: { stage: string }) => item.stage);
        expect(stages).toEqual(expect.arrayContaining([
          '仓库入库',
          '业务录单',
          '审核',
          '市场排货',
          '代理交接单',
          '仓库出库',
          '客服数据确认',
          '转单号',
          '待离港',
          '已离港',
          '已到港',
          '已派送',
          '问题件',
          '已签收归档'
        ]));
      });
  });

  it('traces manual tracking imports, latest tracking events and carrier task runs from shipments', async () => {
    const adminToken = await app.loginAs('admin');
    const suffix = Date.now();

    const shipment = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerId: 'c-9409',
        customerOrderNo: `LIN-TRACK-${suffix}`,
        systemOrderNo: `SYLINTRACK${suffix}`,
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 8,
        agentWeightKg: 8,
        channelId: 'ch-dhl-hk',
        initialStatus: 'DRAFT'
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/shipments/${shipment.body.id}/tracking-events`)
      .set('Authorization', app.auth(adminToken))
      .send({ status: '链路手工轨迹', happenedAt: '2026-07-02T10:00:00.000Z' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/shipments/tracking-events/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: `lineage-tracking-${suffix}.xlsx`,
        rawRowCount: 3,
        failedRowCount: 1,
        unmatchedOrderNos: [`MISS-${suffix}`],
        updates: [
          {
            shipmentId: shipment.body.id,
            customerOrderNo: shipment.body.customerOrderNo,
            trackingDate: '2026-07-03T10:00:00.000Z',
            latestTracking: '链路导入轨迹-旧'
          },
          {
            shipmentId: shipment.body.id,
            customerOrderNo: shipment.body.systemOrderNo,
            trackingDate: '2026-07-04T10:00:00.000Z',
            latestTracking: '链路导入轨迹-新'
          }
        ]
      })
      .expect(201);

    const importTrace = await waitForShipmentLineage(app, adminToken, shipment.body.id, 'tracking.manual_import.complete');
    const importSerialized = JSON.stringify(importTrace.body.roots);
    expect(importSerialized).toContain('tracking.latest.add_event');
    expect(importSerialized).toContain('tracking.manual_import.raw_file');
    expect(importSerialized).toContain('tracking_import_file');
    expect(importSerialized).toContain('tracking_manual_import');
    expect(importSerialized).toContain('tracking_event');

    await request(app.getHttpServer())
      .post('/api/carrier-tasks/ct-seed-dhl/run')
      .set('Authorization', app.auth(adminToken))
      .send({})
      .expect(201);

    const carrierTrace = await waitForShipmentLineage(app, adminToken, 's-seed-2', 'tracking.tasks.run');
    const carrierSerialized = JSON.stringify(carrierTrace.body.roots);
    expect(carrierSerialized).toContain('process_run');
    expect(carrierSerialized).toContain('tracking.latest.add_event');
    expect(carrierSerialized).toContain('carrier_tracking_task');

    await request(app.getHttpServer())
      .post('/api/carrier-tasks/ct-seed-ups/retry')
      .set('Authorization', app.auth(adminToken))
      .send({})
      .expect(201);

    const retryTrace = await waitForShipmentLineage(app, adminToken, 's-seed-4', 'tracking.tasks.run');
    expect(JSON.stringify(retryTrace.body.roots)).toContain('carrier_tracking_task');
  });

  it('traces finance audit, water receipt matching and payment verification back to shipments', async () => {
    const adminToken = await app.loginAs('admin');
    const suffix = Date.now();
    const systemOrderNo = `SYLINFIN${suffix}`;

    const shipment = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerId: 'c-9409',
        customerOrderNo: `LIN-FIN-${suffix}`,
        systemOrderNo,
        businessType: 'DEDICATED_LINE',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 12,
        agentWeightKg: 12,
        channelId: 'ch-dhl-hk',
        initialStatus: 'DRAFT'
      })
      .expect(201);

    const receivable = await request(app.getHttpServer())
      .post('/api/finance/receivable-audits')
      .set('Authorization', app.auth(adminToken))
      .send({ systemOrderNo, name: '链路应收', amount: 120, currency: 'RMB' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/finance/receivable-audits/${receivable.body.id}/audit`)
      .set('Authorization', app.auth(adminToken))
      .expect(201);

    await waitForLineageResult(app, adminToken, 'receivable_finance_item', receivable.body.id, 'finance.receivables.audit');

    const waterReceipt = await request(app.getHttpServer())
      .post('/api/finance/water-receipts')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerCode: '9409',
        receiptMethod: '招商银行',
        receiptDate: '2026-06-25T11:00:00.000+08:00',
        amount: 120,
        currency: 'RMB',
        paymentNo: `LIN-WR-${suffix}`
      })
      .expect(201);

    await waitForLineageResult(app, adminToken, 'water_receipt', waterReceipt.body.id, 'finance.water_receipts.create');

    await request(app.getHttpServer())
      .post(`/api/finance/water-receipts/${waterReceipt.body.id}/mark-arrived`)
      .set('Authorization', app.auth(adminToken))
      .send({})
      .expect(201);

    await waitForLineageResult(app, adminToken, 'water_receipt_arrival', waterReceipt.body.id, 'finance.water_receipt_arrivals.arrive');

    await request(app.getHttpServer())
      .post(`/api/finance/water-receipts/${waterReceipt.body.id}/match-orders`)
      .set('Authorization', app.auth(adminToken))
      .send({ matches: [{ receivableFinanceItemId: receivable.body.id, amount: 120 }] })
      .expect(201);

    await waitForShipmentLineage(app, adminToken, shipment.body.id, 'finance.water_receipts.match');

    const businessCost = await request(app.getHttpServer())
      .post('/api/finance/business-cost-audits')
      .set('Authorization', app.auth(adminToken))
      .send({ systemOrderNo, name: '链路业务成本', amount: 80, currency: 'RMB', chargeWeightKg: 20, unitPrice: 4 })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/finance/business-cost-audits/${businessCost.body.id}/audit`)
      .set('Authorization', app.auth(adminToken))
      .expect(201);

    await waitForLineageResult(app, adminToken, 'business_cost_finance_item', businessCost.body.id, 'finance.business_costs.audit');

    const payable = await request(app.getHttpServer())
      .post('/api/finance/payable-audits')
      .set('Authorization', app.auth(adminToken))
      .send({ systemOrderNo, name: '链路应付', amount: 60, currency: 'RMB', chargeWeightKg: 20, unitPrice: 3 })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/finance/payable-audits/${payable.body.id}/audit`)
      .set('Authorization', app.auth(adminToken))
      .expect(201);

    await waitForLineageResult(app, adminToken, 'payable_finance_item', payable.body.id, 'finance.payables.audit');

    const pendingPayments = await request(app.getHttpServer())
      .get(`/api/finance/pending-payments?systemOrderNo=${systemOrderNo}`)
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    const pending = pendingPayments.body.rows.find((row: { payableFinanceItemId: string }) => row.payableFinanceItemId === payable.body.id);
    expect(pending).toBeDefined();

    const bank = await request(app.getHttpServer())
      .post('/api/finance/payee-bank-accounts')
      .set('Authorization', app.auth(adminToken))
      .send({ agentName: pending.agentName || '链路代理', accountName: '链路收款户', bankName: '招商银行', bankAccountNo: `LIN-BANK-${suffix}`, currency: 'RMB' })
      .expect(201);

    const applications = await request(app.getHttpServer())
      .post('/api/finance/payment-applications')
      .set('Authorization', app.auth(adminToken))
      .send({
        pendingPaymentIds: [pending.id],
        bankAccountId: bank.body.id,
        remark: '链路付款申请',
        voucher: { fileName: 'lineage-bill.png', mimeType: 'image/png', url: '/uploads/lineage-bill.png' }
      })
      .expect(201);
    const application = applications.body[0];

    await waitForLineageResult(app, adminToken, 'payment_application', application.id, 'finance.payment_applications.create');

    await request(app.getHttpServer())
      .post(`/api/finance/payment-applications/${application.id}/confirm-paid`)
      .set('Authorization', app.auth(adminToken))
      .send({
        payerBankName: '思远付款银行',
        payerBankAccountNo: `PAYER-${suffix}`,
        paidAt: '2026-06-26',
        waterReceipt: { fileName: 'lineage-paid.png', mimeType: 'image/png', url: '/uploads/lineage-paid.png' }
      })
      .expect(201);

    await waitForLineageResult(app, adminToken, 'paid_payment', application.id, 'finance.paid_verification.confirm');
    const shipmentTrace = await waitForShipmentLineage(app, adminToken, shipment.body.id, 'finance.paid_verification.confirm');
    const serialized = JSON.stringify(shipmentTrace.body.roots);
    expect(serialized).toContain('water_receipt_match');
    expect(serialized).toContain('payment_application');
    expect(serialized).toContain('paid_payment');
  });
});

async function waitForLineageSource(app: ReturnType<typeof setupE2eApp>, token: string, nodeType: string, id: string, expected: string) {
  let lastResponse: request.Response | undefined;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    lastResponse = await request(app.getHttpServer())
      .get(`/api/system/lineage-source/${nodeType}/${id}`)
      .set('Authorization', app.auth(token))
      .expect(200);
    if (JSON.stringify(lastResponse.body).includes(expected)) return lastResponse;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return lastResponse!;
}

async function waitForShipmentLineage(app: ReturnType<typeof setupE2eApp>, token: string, shipmentId: string, expected: string) {
  let lastResponse: request.Response | undefined;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    lastResponse = await request(app.getHttpServer())
      .get(`/api/system/lineage/shipment/${shipmentId}`)
      .set('Authorization', app.auth(token))
      .expect(200);
    if (JSON.stringify(lastResponse.body).includes(expected)) return lastResponse;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return lastResponse!;
}

async function waitForLineageResult(app: ReturnType<typeof setupE2eApp>, token: string, resultType: string, businessId: string, expected: string) {
  let lastResponse: request.Response | undefined;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    lastResponse = await request(app.getHttpServer())
      .get(`/api/system/lineage/${resultType}/${businessId}`)
      .set('Authorization', app.auth(token))
      .expect(200);
    if (JSON.stringify(lastResponse.body).includes(expected)) return lastResponse;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return lastResponse!;
}
