import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { LINEAGE_EVENT_DEFINITIONS } from './lineage-event-catalog.js';
import { LINEAGE_EVENT_WIRING_ROWS, getLineageEventWiringReport } from './lineage-event-coverage.js';

describe('lineage event wiring coverage', () => {
  it('tracks every catalog definition exactly once', () => {
    const definitionKeys = LINEAGE_EVENT_DEFINITIONS.map((definition) => definition.key).sort();
    const wiringKeys = LINEAGE_EVENT_WIRING_ROWS.map((row) => row.key).sort();

    expect(wiringKeys).toEqual(definitionKeys);
    expect(new Set(wiringKeys).size).toBe(wiringKeys.length);
  });

  it('marks current MVP hooks as wired or partial and leaves the rest pending', () => {
    const byKey = Object.fromEntries(LINEAGE_EVENT_WIRING_ROWS.map((row) => [row.key, row]));

    expect(byKey['pricing.price_books.import']).toMatchObject({ status: 'wired', traceVerified: true });
    expect(byKey['pricing.lookup.quote']).toMatchObject({ status: 'wired' });
    expect(byKey['pricing.lookup.legacy_quote']).toMatchObject({ status: 'wired' });
    expect(byKey['pricing.lookup.routes_view']).toMatchObject({ status: 'wired' });
    expect(byKey['pricing.markup.rule_change']).toMatchObject({ status: 'wired' });
    expect(byKey['pricing.markup.batch_change']).toMatchObject({ status: 'wired' });
    expect(byKey['pricing.price_books.raw_file']).toMatchObject({ status: 'wired', traceVerified: true });
    expect(byKey['pricing.price_books.remark_update']).toMatchObject({ status: 'wired' });
    expect(byKey['pricing.price_books.delete']).toMatchObject({ status: 'wired' });
    expect(byKey['pricing.south_africa.rule_change']).toMatchObject({ status: 'wired' });
    expect(byKey['orders.entry.submit']).toMatchObject({ status: 'wired' });
    expect(byKey['orders.entry.draft']).toMatchObject({ status: 'wired' });
    expect(byKey['orders.entry.draft_delete']).toMatchObject({ status: 'wired' });
    expect(byKey['orders.review.approve']).toMatchObject({ status: 'wired' });
    expect(byKey['orders.review.reject']).toMatchObject({ status: 'wired' });
    expect(byKey['orders.management.update']).toMatchObject({ status: 'wired' });
    expect(byKey['orders.management.delete_restore']).toMatchObject({ status: 'wired' });
    expect(byKey['orders.ai.suggestion']).toMatchObject({ status: 'pending' });
    expect(byKey['warehouse.today.receive']).toMatchObject({ status: 'wired' });
    expect(byKey['warehouse.packages.update']).toMatchObject({ status: 'wired' });
    expect(byKey['warehouse.packages.split']).toMatchObject({ status: 'wired' });
    expect(byKey['warehouse.tally.create']).toMatchObject({ status: 'wired' });
    expect(byKey['warehouse.tally.complete']).toMatchObject({ status: 'wired' });
    expect(byKey['warehouse.queue.dispatch']).toMatchObject({ status: 'wired' });
    expect(byKey['warehouse.queue.label']).toMatchObject({ status: 'wired' });
    expect(byKey['warehouse.pending_routing.snapshot']).toMatchObject({ status: 'pending' });
    expect(byKey['market.pending_routing.route']).toMatchObject({ status: 'wired' });
    expect(byKey['market.pending_routing.delete']).toMatchObject({ status: 'wired' });
    expect(byKey['market.routed.reroute']).toMatchObject({ status: 'wired' });
    expect(byKey['market.pending_routing.approve']).toMatchObject({ status: 'pending' });
    expect(byKey['finance.receivables.audit']).toMatchObject({ status: 'wired' });
    expect(byKey['finance.business_costs.audit']).toMatchObject({ status: 'wired' });
    expect(byKey['finance.payables.audit']).toMatchObject({ status: 'wired' });
    expect(byKey['finance.payment_applications.create']).toMatchObject({ status: 'wired' });
    expect(byKey['finance.paid_verification.confirm']).toMatchObject({ status: 'wired' });
    expect(byKey['finance.water_receipt_arrivals.arrive']).toMatchObject({ status: 'wired' });
    expect(byKey['finance.water_receipts.create']).toMatchObject({ status: 'wired' });
    expect(byKey['finance.water_receipts.match']).toMatchObject({ status: 'wired' });
    expect(byKey['customer_service.data_confirm.approve']).toMatchObject({ status: 'wired' });
    expect(byKey['customer_service.transfer.update']).toMatchObject({ status: 'wired' });
    expect(byKey['customer_service.departure.confirm']).toMatchObject({ status: 'wired' });
    expect(byKey['customer_service.departed.update']).toMatchObject({ status: 'wired' });
    expect(byKey['customer_service.arrived_port.confirm']).toMatchObject({ status: 'wired' });
    expect(byKey['customer_service.delivering.confirm']).toMatchObject({ status: 'wired' });
    expect(byKey['customer_service.signed.confirm']).toMatchObject({ status: 'wired' });
    expect(byKey['customer_service.problems.change']).toMatchObject({ status: 'wired' });
    expect(byKey['tracking.tasks.run']).toMatchObject({ status: 'wired' });
    expect(byKey['tracking.latest.add_event']).toMatchObject({ status: 'wired' });
    expect(byKey['tracking.manual_import.raw_file']).toMatchObject({ status: 'wired' });
    expect(byKey['tracking.manual_import.complete']).toMatchObject({ status: 'wired' });
  });

  it('keeps pricing first batch fully wired', () => {
    const pricingRows = LINEAGE_EVENT_WIRING_ROWS.filter((row) => row.module === '报价查价');

    expect(pricingRows).toHaveLength(10);
    expect(pricingRows.every((row) => row.status === 'wired')).toBe(true);
  });

  it('keeps business management first batch wired except AI suggestion', () => {
    const rows = LINEAGE_EVENT_WIRING_ROWS.filter((row) => row.module === '业务管理');

    expect(rows).toHaveLength(8);
    expect(rows.filter((row) => row.key !== 'orders.ai.suggestion').every((row) => row.status === 'wired')).toBe(true);
    expect(rows.find((row) => row.key === 'orders.ai.suggestion')).toMatchObject({ status: 'pending' });
  });

  it('keeps warehouse management first batch wired except aggregate snapshots', () => {
    const rows = LINEAGE_EVENT_WIRING_ROWS.filter((row) => row.module === '仓库管理');
    const aggregateKeys = new Set(['warehouse.pending_routing.snapshot', 'warehouse.outbounded.snapshot', 'warehouse.dashboard.snapshot']);

    expect(rows).toHaveLength(10);
    expect(rows.filter((row) => !aggregateKeys.has(row.key)).every((row) => row.status === 'wired')).toBe(true);
    expect(rows.filter((row) => aggregateKeys.has(row.key)).every((row) => row.status === 'pending')).toBe(true);
  });

  it('keeps market management first batch wired except approvals and aggregate snapshots', () => {
    const rows = LINEAGE_EVENT_WIRING_ROWS.filter((row) => row.module === '市场管理');
    const wiredKeys = new Set(['market.pending_routing.route', 'market.pending_routing.delete', 'market.routed.reroute']);

    expect(rows).toHaveLength(6);
    expect(rows.filter((row) => wiredKeys.has(row.key)).every((row) => row.status === 'wired')).toBe(true);
    expect(rows.filter((row) => !wiredKeys.has(row.key)).every((row) => row.status === 'pending')).toBe(true);
  });

  it('keeps finance management first batch wired except dashboard and agent bill AI', () => {
    const rows = LINEAGE_EVENT_WIRING_ROWS.filter((row) => row.module === '财务管理');
    const pendingKeys = new Set(['finance.dashboard.snapshot', 'finance.agent_bill_ai.process']);

    expect(rows).toHaveLength(10);
    expect(rows.filter((row) => !pendingKeys.has(row.key)).every((row) => row.status === 'wired')).toBe(true);
    expect(rows.filter((row) => pendingKeys.has(row.key)).every((row) => row.status === 'pending')).toBe(true);
  });

  it('keeps customer service first batch wired except snapshots and after sale', () => {
    const rows = LINEAGE_EVENT_WIRING_ROWS.filter((row) => row.module === '客服管理');
    const pendingKeys = new Set(['customer_service.dashboard.snapshot', 'customer_service.pending_routing.snapshot', 'customer_service.after_sale.change']);

    expect(rows).toHaveLength(11);
    expect(rows.filter((row) => !pendingKeys.has(row.key)).every((row) => row.status === 'wired')).toBe(true);
    expect(rows.filter((row) => pendingKeys.has(row.key)).every((row) => row.status === 'pending')).toBe(true);
  });

  it('keeps tracking management first batch fully wired', () => {
    const rows = LINEAGE_EVENT_WIRING_ROWS.filter((row) => row.module === '物流轨迹管理');

    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.status === 'wired')).toBe(true);
  });

  it('summarizes wiring by module for phased rollout', () => {
    const report = getLineageEventWiringReport();

    expect(report.totals.total).toBe(LINEAGE_EVENT_DEFINITIONS.length);
    expect(report.totals.wired).toBeGreaterThanOrEqual(24);
    expect(report.totals.partial).toBe(0);
    expect(report.modules).toEqual(expect.arrayContaining([
      expect.objectContaining({ module: '报价查价' }),
      expect.objectContaining({ module: '业务管理' }),
      expect.objectContaining({ module: '仓库管理' }),
      expect.objectContaining({ module: '市场管理' }),
      expect.objectContaining({ module: '财务管理' }),
      expect.objectContaining({ module: '客服管理' }),
      expect.objectContaining({ module: '物流轨迹管理' })
    ]));
  });

  it('requires runtime lineage hooks to reference catalog keys', () => {
    const catalogKeys = new Set(LINEAGE_EVENT_DEFINITIONS.map((definition) => definition.key));
    const sourceFiles = [
      './in-memory.repository.ts',
      './prisma.repository.ts',
      './lineage-watcher.ts'
    ];
    const source = sourceFiles
      .map((file) => readFileSync(new URL(file, import.meta.url), 'utf8'))
      .join('\n');

    const recordEventKeys = Array.from(source.matchAll(/recordEvent\(\s*['"]([^'"]+)['"]/g)).map((match) => match[1]);
    expect(recordEventKeys.length).toBeGreaterThan(0);
    expect(recordEventKeys.filter((key) => !catalogKeys.has(key))).toEqual([]);

    const mainFlowCalls = Array.from(source.matchAll(/lineage\?\.recordMainFlowResult\([\s\S]*?\);/g)).map((match) => match[0]);
    expect(mainFlowCalls.length).toBeGreaterThan(0);
    const missingCatalogKeyCalls = mainFlowCalls.filter((call) => {
      const literalKeys = Array.from(call.matchAll(/['"]([a-z_]+\.[a-z0-9_]+\.[a-z0-9_]+)['"]/g)).map((match) => match[1]);
      return !literalKeys.some((key) => catalogKeys.has(key));
    });
    expect(missingCatalogKeyCalls).toEqual([]);

    expect(source).toContain("definitionKey: 'pricing.price_books.raw_file'");
    expect(source).toContain("definitionKey: 'pricing.price_books.import'");
  });
});
