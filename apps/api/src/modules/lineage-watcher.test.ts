import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildLineagePriceBookMetrics, LineageWatcher } from './lineage-watcher.js';

describe('LineageWatcher', () => {
  let tempDir: string;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'sunny-lineage-'));
    process.env.SUNNY_LINEAGE_DB_PATH = join(tempDir, 'lineage.sqlite');
    process.env.NODE_ENV = originalNodeEnv;
    delete process.env.SUNNY_LINEAGE_DISABLED;
    delete process.env.SUNNY_LINEAGE_ENABLED;
  });

  afterEach(() => {
    delete process.env.SUNNY_LINEAGE_DB_PATH;
    delete process.env.SUNNY_LINEAGE_DISABLED;
    delete process.env.SUNNY_LINEAGE_ENABLED;
    process.env.NODE_ENV = originalNodeEnv;
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('records raw, process, clean, result, aggregate and trace links', async () => {
    const watcher = new LineageWatcher();
    const batchId = await watcher.startBatch('pricing', 'price_book_file', 'sample.xlsx', { fileName: 'sample.xlsx' });
    const rawId = await watcher.recordRaw(batchId, { agentName: '测试代理', costPerKg: 10 }, 0);
    const runId = await watcher.startRun('pricing', 'price_book_import', [{ nodeType: 'raw_record', id: rawId }], 'test-v1');
    const cleanId = await watcher.recordClean(runId, rawId, { agentName: '测试代理', costPerKg: 10 }, 'VALID');
    await watcher.recordStep(runId, 'normalize', [{ nodeType: 'raw_record', id: rawId }], [{ nodeType: 'clean_record', id: cleanId }], { ok: true });
    await watcher.recordResult(runId, 'price_book', 'pb-test', { rowCount: 1 }, [{ nodeType: 'clean_record', id: cleanId }]);
    await watcher.recordAggregate('price_book', 'pb-test', { rowCount: 1 }, 'pricing');

    const trace = await watcher.traceResult('price_book', 'pb-test');
    expect(trace.root?.businessId).toBe('pb-test');
    expect(JSON.stringify(trace.root)).toContain(rawId);
    expect(JSON.stringify(trace.root)).toContain(cleanId);
  });

  it('builds deterministic pre-aggregate metrics for price book rows', () => {
    const metrics = buildLineagePriceBookMetrics([
      { agentName: 'A', channelName: '海运', destinationCountry: '美国', costPerKg: 10, minWeightKg: 0, maxWeightKg: 20 },
      { agentName: 'A', channelName: '空运', destinationCountry: '加拿大', costPerKg: 20, minWeightKg: 20, maxWeightKg: 50 }
    ]);

    expect(metrics.rowCount).toBe(2);
    expect(metrics.agentDistribution).toEqual({ A: 2 });
    expect(metrics.countryDistribution).toEqual({ 美国: 1, 加拿大: 1 });
    expect(metrics.costTotal).toBe(30);
    expect(metrics.hashSum).toHaveLength(64);
  });

  it('records catalog events with sensitive fields hashed', async () => {
    const watcher = new LineageWatcher();
    await watcher.recordEvent('system.accounts.change', {
      businessId: 'u-secret',
      actorUsername: 'admin',
      payload: { username: 'worker', password: 'secret-pass', profile: { token: 'abc' } },
      metrics: { changedFields: 2 }
    });

    const trace = await watcher.traceResult('staff_account', 'u-secret');
    const serialized = JSON.stringify(trace.root);
    expect(serialized).toContain('worker');
    expect(serialized).not.toContain('secret-pass');
    expect(serialized).not.toContain('"abc"');
  });

  it('traces shipment lifecycle result records together', async () => {
    const watcher = new LineageWatcher();
    await watcher.recordEvent('orders.entry.draft', {
      businessId: 'shipment-1',
      payload: { systemOrderNo: 'SY001', draft: true },
      sourceRefs: [{ nodeType: 'warehouse_package', id: 'pkg-1' }]
    });
    await watcher.recordEvent('orders.entry.submit', {
      businessId: 'shipment-1',
      payload: { systemOrderNo: 'SY001' },
      sourceRefs: [{ nodeType: 'shipment_draft', id: 'shipment-1' }]
    });
    await watcher.recordEvent('orders.review.approve', {
      businessId: 'shipment-1',
      payload: { reviewStatus: 'BUSINESS_APPROVED' },
      sourceRefs: [{ nodeType: 'shipment', id: 'shipment-1' }]
    });
    await watcher.recordEvent('orders.management.update', {
      businessId: 'shipment-1',
      payload: { transferNoTo: 'TRK001' },
      sourceRefs: [{ nodeType: 'shipment', id: 'shipment-1' }]
    });
    await watcher.recordEvent('warehouse.queue.label', {
      businessId: 'shipment-1',
      payload: { labelNo: 'LBL001' },
      sourceRefs: [{ nodeType: 'shipment', id: 'shipment-1' }]
    });
    await watcher.recordEvent('warehouse.queue.dispatch', {
      businessId: 'shipment-1',
      payload: { handoverNo: 'HO001' },
      sourceRefs: [{ nodeType: 'shipment', id: 'shipment-1' }]
    });

    const trace = await watcher.traceShipment('shipment-1');
    expect(trace.roots).toHaveLength(6);
    expect(JSON.stringify(trace.roots)).toContain('SY001');
    expect(JSON.stringify(trace.roots)).toContain('BUSINESS_APPROVED');
    expect(JSON.stringify(trace.roots)).toContain('TRK001');
    expect(JSON.stringify(trace.roots)).toContain('LBL001');
    expect(JSON.stringify(trace.roots)).toContain('HO001');
  });

  it('traces downstream pricing batch changes from an agent markup rule source ref', async () => {
    const watcher = new LineageWatcher();
    await watcher.recordEvent('pricing.markup.batch_change', {
      businessId: 'batch-markup-1',
      actorUsername: 'admin',
      payload: { action: 'batch_status', enabled: true, ids: ['markup-1'] },
      sourceRefs: [{ nodeType: 'agent_markup_rule', id: 'markup-1' }],
      metrics: { successCount: 1 }
    });

    const trace = await watcher.traceSourceRef('agent_markup_rule', 'markup-1');
    const serialized = JSON.stringify(trace.roots);
    expect(trace.roots).toHaveLength(1);
    expect(serialized).toContain('agent_markup_batch');
    expect(serialized).toContain('batch-markup-1');
    expect(serialized).toContain('pricing.markup.batch_change');
  });

  it('records sampled price book raw and clean rows before the result', async () => {
    const watcher = new LineageWatcher();
    await watcher.recordPriceBookImport({
      principalUsername: 'admin',
      fileName: 'sample.xlsx',
      priceBookId: 'pb-sampled',
      rows: [
        { agentName: 'A', channelName: '海运', destinationCountry: '美国', costPerKg: 10 },
        { agentName: 'B', channelName: '空运', destinationCountry: '加拿大', costPerKg: 20 }
      ],
      result: { rowCount: 2 },
      metrics: { rowCount: 2 }
    });

    const trace = await watcher.traceResult('price_book', 'pb-sampled');
    const serialized = JSON.stringify(trace.root);
    expect(serialized).toContain('raw_record');
    expect(serialized).toContain('clean_record');
    expect(serialized).toContain('sample.xlsx');
  });

  it('keeps production sidecar disabled unless explicitly enabled with a database path', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SUNNY_LINEAGE_DB_PATH;
    delete process.env.SUNNY_LINEAGE_ENABLED;
    const disabledWatcher = new LineageWatcher();
    await disabledWatcher.recordEvent('orders.entry.submit', {
      businessId: 'shipment-prod-disabled',
      payload: { systemOrderNo: 'SY-PROD-DISABLED' }
    });
    await expect(disabledWatcher.traceResult('shipment', 'shipment-prod-disabled')).resolves.toEqual({
      resultType: 'shipment',
      businessId: 'shipment-prod-disabled',
      root: null
    });

    process.env.SUNNY_LINEAGE_DB_PATH = join(tempDir, 'enabled.sqlite');
    process.env.SUNNY_LINEAGE_ENABLED = 'true';
    const enabledWatcher = new LineageWatcher();
    await enabledWatcher.recordEvent('orders.entry.submit', {
      businessId: 'shipment-prod-enabled',
      payload: { systemOrderNo: 'SY-PROD-ENABLED' }
    });
    const trace = await enabledWatcher.traceResult('shipment', 'shipment-prod-enabled');
    expect(JSON.stringify(trace.root)).toContain('SY-PROD-ENABLED');
  });
});
