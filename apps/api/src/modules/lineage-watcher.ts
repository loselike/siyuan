import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { getLineageEventDefinition, type JsonValue, type LineageEventContext, type LineageEventDefinitionKey, type LineageRef } from './lineage-event-catalog.js';

type DatabaseLike = {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: unknown[]): unknown;
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Array<Record<string, unknown>>;
  };
};

export type LineageValidationStatus = 'VALID' | 'INVALID' | 'WARNING';

export interface LineageTraceNode {
  id: string;
  nodeType: string;
  domain?: string;
  sourceType?: string;
  sourceId?: string;
  businessId?: string;
  resultType?: string;
  contentHash?: string;
  payload?: JsonValue;
  metadata?: JsonValue;
  children: Array<LineageTraceNode & { relationType?: string }>;
}

@Injectable()
export class LineageWatcher {
  private dbPromise?: Promise<DatabaseLike | undefined>;
  private disabled = isLineageDisabledByEnv();

  async startBatch(domain: string, sourceType: string, sourceId: string, metadata: JsonValue = {}) {
    const id = `batch-${randomUUID()}`;
    const payloadHash = hashJson({ domain, sourceType, sourceId, metadata });
    await this.write((db) => {
      db.prepare(`
        INSERT INTO raw_batches (id, domain, source_type, source_id, correlation_id, content_hash, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, domain, sourceType, sourceId, id, payloadHash, stringifyJson(metadata), nowIso());
    });
    return id;
  }

  async recordRaw(batchId: string, rawPayload: JsonValue, rawIndex: number, metadata: JsonValue = {}) {
    const id = `raw-${randomUUID()}`;
    await this.write((db) => {
      db.prepare(`
        INSERT INTO raw_records (id, batch_id, domain, source_type, source_id, correlation_id, content_hash, raw_index, payload_json, metadata_json, created_at)
        SELECT ?, ?, domain, source_type, source_id, correlation_id, ?, ?, ?, ?, ?
        FROM raw_batches WHERE id = ?
      `).run(id, batchId, hashJson(rawPayload), rawIndex, stringifyJson(rawPayload), stringifyJson(metadata), nowIso(), batchId);
      this.insertEdge(db, { nodeType: 'raw_batch', id: batchId }, { nodeType: 'raw_record', id }, 'contains');
    });
    return id;
  }

  async startRun(domain: string, runType: string, inputRefs: LineageRef[] = [], logicVersion = 'v1', metadata: JsonValue = {}) {
    const id = `run-${randomUUID()}`;
    await this.write((db) => {
      db.prepare(`
        INSERT INTO process_runs (id, domain, run_type, correlation_id, logic_version, input_refs_json, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, domain, runType, id, logicVersion, stringifyJson(inputRefs), stringifyJson(metadata), nowIso());
      inputRefs.forEach((ref) => this.insertEdge(db, ref, { nodeType: 'process_run', id }, 'feeds'));
    });
    return id;
  }

  async recordStep(runId: string, stepName: string, inputRefs: LineageRef[] = [], outputRefs: LineageRef[] = [], summary: JsonValue = {}) {
    const id = `step-${randomUUID()}`;
    await this.write((db) => {
      db.prepare(`
        INSERT INTO process_steps (id, run_id, step_name, input_refs_json, output_refs_json, summary_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, runId, stepName, stringifyJson(inputRefs), stringifyJson(outputRefs), stringifyJson(summary), nowIso());
      this.insertEdge(db, { nodeType: 'process_run', id: runId }, { nodeType: 'process_step', id }, 'has_step');
      inputRefs.forEach((ref) => this.insertEdge(db, ref, { nodeType: 'process_step', id }, 'step_input'));
      outputRefs.forEach((ref) => this.insertEdge(db, { nodeType: 'process_step', id }, ref, 'step_output'));
    });
    return id;
  }

  async recordClean(runId: string, rawRecordId: string | undefined, cleanPayload: JsonValue, validationStatus: LineageValidationStatus = 'VALID', errors: JsonValue = []) {
    const id = `clean-${randomUUID()}`;
    await this.write((db) => {
      if (rawRecordId) {
        db.prepare(`
          INSERT INTO clean_records (id, run_id, raw_record_id, domain, source_type, source_id, correlation_id, content_hash, validation_status, payload_json, errors_json, created_at)
          SELECT ?, ?, ?, domain, source_type, source_id, correlation_id, ?, ?, ?, ?, ?
          FROM raw_records WHERE id = ?
        `).run(id, runId, rawRecordId, hashJson(cleanPayload), validationStatus, stringifyJson(cleanPayload), stringifyJson(errors), nowIso(), rawRecordId);
      } else {
        db.prepare(`
          INSERT INTO clean_records (id, run_id, raw_record_id, domain, source_type, source_id, correlation_id, content_hash, validation_status, payload_json, errors_json, created_at)
          SELECT ?, ?, NULL, domain, 'process_run', id, correlation_id, ?, ?, ?, ?, ?
          FROM process_runs WHERE id = ?
        `).run(id, runId, hashJson(cleanPayload), validationStatus, stringifyJson(cleanPayload), stringifyJson(errors), nowIso(), runId);
      }
      this.insertEdge(db, { nodeType: 'process_run', id: runId }, { nodeType: 'clean_record', id }, 'produces');
      if (rawRecordId) this.insertEdge(db, { nodeType: 'raw_record', id: rawRecordId }, { nodeType: 'clean_record', id }, 'cleans_to');
    });
    return id;
  }

  async recordResult(runId: string, resultType: string, businessId: string, payload: JsonValue = {}, sourceRefs: LineageRef[] = []) {
    const id = `result-${randomUUID()}`;
    await this.write((db) => {
      db.prepare(`
        INSERT INTO result_records (id, run_id, result_type, business_id, domain, correlation_id, content_hash, payload_json, created_at)
        SELECT ?, ?, ?, ?, domain, correlation_id, ?, ?, ?
        FROM process_runs WHERE id = ?
      `).run(id, runId, resultType, businessId, hashJson(payload), stringifyJson(payload), nowIso(), runId);
      this.insertEdge(db, { nodeType: 'process_run', id: runId }, { nodeType: 'result_record', id }, 'produces');
      sourceRefs.forEach((ref) => this.insertEdge(db, ref, { nodeType: 'result_record', id }, 'source_of'));
    });
    return id;
  }

  async recordAggregate(scopeType: string, scopeId: string, metrics: JsonValue, domain = 'system') {
    const id = `agg-${randomUUID()}`;
    await this.write((db) => {
      db.prepare(`
        INSERT INTO aggregate_snapshots (id, domain, scope_type, scope_id, metrics_json, content_hash, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, domain, scopeType, scopeId, stringifyJson(metrics), hashJson(metrics), nowIso());
    });
    return id;
  }

  async recordWatcherLog(domain: string, action: string, targetId: string, summary: JsonValue = {}, result: 'SUCCESS' | 'FAILED' = 'SUCCESS') {
    const id = `watch-${randomUUID()}`;
    await this.write((db) => {
      db.prepare(`
        INSERT INTO watcher_logs (id, domain, action, target_id, result, summary_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, domain, action, targetId, result, stringifyJson(summary), nowIso());
    });
    return id;
  }

  async traceResult(resultType: string, businessId: string) {
    const db = await this.getDb();
    if (!db) return { resultType, businessId, root: null };
    const row = db.prepare(`
      SELECT * FROM result_records
      WHERE result_type = ? AND business_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(resultType, businessId);
    if (!row) return { resultType, businessId, root: null };
    return { resultType, businessId, root: this.buildTraceNode(db, 'result_record', String(row.id), new Set()) };
  }

  async traceShipment(shipmentId: string) {
    const db = await this.getDb();
    if (!db) return { resultType: 'shipment', businessId: shipmentId, roots: [] };
    const resultRows = db.prepare(`
      SELECT * FROM result_records
      WHERE (
        business_id = ?
        AND result_type IN (
          'shipment',
          'shipment_draft',
          'shipment_draft_delete',
          'shipment_review',
          'shipment_update',
          'shipment_lifecycle',
          'shipment_route',
          'shipment_route_approval',
          'shipment_pending_routing_delete',
          'shipment_reroute',
          'shipment_dispatch',
          'warehouse_label',
          'shipment_transfer_update',
          'shipment_departure_confirm',
          'shipment_departed_update',
          'shipment_arrived_port_confirm',
          'shipment_delivering_confirm',
          'shipment_signed_confirm',
          'tracking_event',
          'tracking_manual_import',
          'receivable_finance_item',
          'business_cost_finance_item',
          'payable_finance_item',
          'payment_application',
          'paid_payment',
          'water_receipt_match'
        )
      )
        OR id IN (
          SELECT child_id
          FROM lineage_edges
          WHERE parent_node_type = 'shipment'
            AND parent_id = ?
            AND child_node_type = 'result_record'
        )
      ORDER BY created_at DESC
    `).all(shipmentId, shipmentId);
    const processRows = db.prepare(`
      SELECT *
      FROM process_runs
      WHERE id IN (
        SELECT child_id
        FROM lineage_edges
        WHERE parent_node_type = 'shipment'
          AND parent_id = ?
          AND child_node_type = 'process_run'
      )
        AND NOT EXISTS (
          SELECT 1
          FROM lineage_edges produced
          WHERE produced.parent_node_type = 'process_run'
            AND produced.parent_id = process_runs.id
            AND produced.child_node_type = 'result_record'
        )
      ORDER BY created_at DESC
    `).all(shipmentId);
    return {
      resultType: 'shipment',
      businessId: shipmentId,
      roots: [
        ...resultRows.map((row) => this.buildTraceNode(db, 'result_record', String(row.id), new Set())),
        ...processRows.map((row) => this.buildTraceNode(db, 'process_run', String(row.id), new Set()))
      ]
    };
  }

  async traceSourceRef(nodeType: string, id: string) {
    const db = await this.getDb();
    if (!db) return { nodeType, id, roots: [] };
    const edges = db.prepare(`
      SELECT child_node_type, child_id
      FROM lineage_edges
      WHERE parent_node_type = ? AND parent_id = ?
        AND (
          child_node_type = 'result_record'
          OR (
            child_node_type = 'process_run'
            AND NOT EXISTS (
              SELECT 1
              FROM lineage_edges produced
              WHERE produced.parent_node_type = 'process_run'
                AND produced.parent_id = lineage_edges.child_id
                AND produced.child_node_type = 'result_record'
            )
          )
        )
      ORDER BY created_at DESC
    `).all(nodeType, id);
    return {
      nodeType,
      id,
      roots: edges.map((edge) => this.buildTraceNode(db, String(edge.child_node_type), String(edge.child_id), new Set()))
    };
  }

  async recordEvent(definitionKey: LineageEventDefinitionKey | string, context: LineageEventContext = {}) {
    const definition = getLineageEventDefinition(definitionKey);
    if (!definition) {
      await this.recordWatcherLog('system', 'lineage_event_definition_missing', definitionKey, { definitionKey }, 'FAILED');
      return undefined;
    }
    try {
      const businessId = context.businessId ?? definition.businessIdResolver?.(context) ?? `${definition.key}:${Date.now()}`;
      const sourceRefs = context.sourceRefs ?? definition.sourceRefsResolver?.(context) ?? [];
      const metrics = sanitizeLineageValue(context.metrics ?? definition.metricsBuilder?.(context), definition.sensitiveFields);
      const payload = sanitizeLineageValue(context.payload ?? context.rawPayload ?? {}, definition.sensitiveFields);
      const metadata = sanitizeLineageValue({
        ...(isPlainObject(context.metadata) ? context.metadata : {}),
        definitionKey: definition.key,
        module: definition.module,
        section: definition.section,
        action: definition.action,
        actorUsername: context.actorUsername
      }, definition.sensitiveFields);

      if (definition.eventKind === 'raw') {
        const batchId = await this.startBatch(definition.domain, definition.resultType, businessId, metadata);
        const rawId = await this.recordRaw(batchId, payload, 0, metadata);
        await this.recordWatcherLog(definition.domain, definition.action, businessId, { definitionKey: definition.key, rawId }, 'SUCCESS');
        return rawId;
      }

      if (definition.eventKind === 'aggregate') {
        const aggregateId = await this.recordAggregate(definition.resultType, businessId, metrics ?? payload, definition.domain);
        await this.recordWatcherLog(definition.domain, definition.action, businessId, { definitionKey: definition.key, aggregateId }, 'SUCCESS');
        return aggregateId;
      }

      const runId = await this.startRun(definition.domain, definition.action, sourceRefs, definition.key, metadata);
      await this.recordStep(runId, definition.action, sourceRefs, [], { definitionKey: definition.key, eventKind: definition.eventKind, payload, metrics });
      if (definition.eventKind === 'result') {
        const resultId = await this.recordResult(runId, definition.resultType, businessId, payload, sourceRefs);
        if (metrics !== undefined) await this.recordAggregate(definition.resultType, businessId, metrics, definition.domain);
        await this.recordWatcherLog(definition.domain, definition.action, businessId, { definitionKey: definition.key, resultId, sourceRefs }, 'SUCCESS');
        return resultId;
      }
      await this.recordWatcherLog(definition.domain, definition.action, businessId, { definitionKey: definition.key, sourceRefs, metrics }, 'SUCCESS');
      return runId;
    } catch {
      // Watcher failure must never block logistics business operations.
      return undefined;
    }
  }

  async recordMainFlowResult(domain: string, runType: string, resultType: string, businessId: string, payload: JsonValue = {}, sourceRefs: LineageRef[] = [], metrics?: JsonValue, definitionKey?: string) {
    try {
      const runId = await this.startRun(domain, runType, sourceRefs, 'sunny-main-flow-v1', { resultType, businessId, definitionKey });
      await this.recordStep(runId, runType, sourceRefs, [], { resultType, businessId, definitionKey });
      await this.recordResult(runId, resultType, businessId, payload, sourceRefs);
      if (metrics !== undefined) await this.recordAggregate(resultType, businessId, metrics, domain);
      await this.recordWatcherLog(domain, runType, businessId, { resultType, sourceRefs, definitionKey }, 'SUCCESS');
    } catch {
      // Watcher failure must never block logistics business operations.
    }
  }

  async recordPriceBookImport(input: {
    principalUsername?: string;
    fileName: string;
    priceBookId: string;
    rows: Array<Record<string, unknown>>;
    result: JsonValue;
    metrics: JsonValue;
  }) {
    try {
      const batchId = await this.startBatch('pricing', 'price_book_file', input.fileName, {
        priceBookId: input.priceBookId,
        importedBy: input.principalUsername,
        definitionKey: 'pricing.price_books.raw_file'
      });
      const runId = await this.startRun('pricing', 'price_book_import', [{ nodeType: 'raw_batch', id: batchId }], 'price-book-import-v1', {
        fileName: input.fileName,
        priceBookId: input.priceBookId,
        definitionKey: 'pricing.price_books.import'
      });
      const rawRefs: LineageRef[] = [];
      const cleanRefs: LineageRef[] = [];
      await this.write((db) => {
        input.rows.slice(0, 500).forEach((row, index) => {
          const rawId = `raw-${randomUUID()}`;
          const cleanId = `clean-${randomUUID()}`;
          rawRefs.push({ nodeType: 'raw_record', id: rawId });
          cleanRefs.push({ nodeType: 'clean_record', id: cleanId });
          this.insertRawAndClean(db, batchId, runId, rawId, cleanId, row, index);
        });
      });
      await this.recordStep(runId, 'parse_and_normalize_price_rows', [{ nodeType: 'raw_batch', id: batchId }], cleanRefs, {
        recordedRows: Math.min(input.rows.length, 500),
        totalRows: input.rows.length
      });
      await this.recordResult(runId, 'price_book', input.priceBookId, input.result, [{ nodeType: 'raw_batch', id: batchId }, ...cleanRefs]);
      await this.recordAggregate('price_book', input.priceBookId, input.metrics, 'pricing');
      await this.recordWatcherLog('pricing', 'price_book_import', input.priceBookId, { ...asRecord(input.metrics), definitionKey: 'pricing.price_books.import' }, 'SUCCESS');
    } catch {
      // Keep sidecar writes non-blocking.
    }
  }

  private async write(callback: (db: DatabaseLike) => void) {
    const db = await this.getDb();
    if (!db) return;
    callback(db);
  }

  private async getDb() {
    if (this.disabled) return undefined;
    this.dbPromise ??= this.openDb().catch(() => {
      this.disabled = true;
      return undefined;
    });
    return this.dbPromise;
  }

  private async openDb(): Promise<DatabaseLike> {
    const dbPath = resolveLineageDbPath();
    if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });
    const moduleName = 'node:sqlite';
    const sqlite = await import(moduleName) as unknown as { DatabaseSync: new (path: string) => DatabaseLike };
    const db = new sqlite.DatabaseSync(dbPath);
    db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;');
    db.exec(LINEAGE_SCHEMA_SQL);
    return db;
  }

  private insertRawAndClean(db: DatabaseLike, batchId: string, runId: string, rawId: string, cleanId: string, row: Record<string, unknown>, index: number) {
    db.prepare(`
      INSERT OR IGNORE INTO raw_records (id, batch_id, domain, source_type, source_id, correlation_id, content_hash, raw_index, payload_json, metadata_json, created_at)
      SELECT ?, ?, domain, source_type, source_id, correlation_id, ?, ?, ?, ?, ?
      FROM raw_batches WHERE id = ?
    `).run(rawId, batchId, hashJson(row), index, stringifyJson(row), stringifyJson({ sampled: true }), nowIso(), batchId);
    db.prepare(`
      INSERT OR IGNORE INTO clean_records (id, run_id, raw_record_id, domain, source_type, source_id, correlation_id, content_hash, validation_status, payload_json, errors_json, created_at)
      SELECT ?, ?, ?, domain, source_type, source_id, correlation_id, ?, 'VALID', ?, '[]', ?
      FROM raw_records WHERE id = ?
    `).run(cleanId, runId, rawId, hashJson(row), stringifyJson(row), nowIso(), rawId);
    this.insertEdge(db, { nodeType: 'raw_batch', id: batchId }, { nodeType: 'raw_record', id: rawId }, 'contains');
    this.insertEdge(db, { nodeType: 'raw_record', id: rawId }, { nodeType: 'clean_record', id: cleanId }, 'cleans_to');
    this.insertEdge(db, { nodeType: 'process_run', id: runId }, { nodeType: 'clean_record', id: cleanId }, 'produces');
  }

  private insertEdge(db: DatabaseLike, parent: LineageRef, child: LineageRef, relationType: string) {
    db.prepare(`
      INSERT OR IGNORE INTO lineage_edges (id, parent_node_type, parent_id, child_node_type, child_id, relation_type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(`${parent.nodeType}:${parent.id}->${relationType}->${child.nodeType}:${child.id}`, parent.nodeType, parent.id, child.nodeType, child.id, relationType, nowIso());
  }

  private buildTraceNode(db: DatabaseLike, nodeType: string, id: string, seen: Set<string>): LineageTraceNode {
    const key = `${nodeType}:${id}`;
    if (seen.has(key)) return { id, nodeType, children: [] };
    seen.add(key);
    const base = this.readNode(db, nodeType, id);
    const edges = db.prepare(`
      SELECT parent_node_type, parent_id, relation_type
      FROM lineage_edges
      WHERE child_node_type = ? AND child_id = ?
      ORDER BY created_at DESC
    `).all(nodeType, id);
    return {
      ...base,
      children: edges.map((edge) => ({
        ...this.buildTraceNode(db, String(edge.parent_node_type), String(edge.parent_id), seen),
        relationType: String(edge.relation_type)
      }))
    };
  }

  private readNode(db: DatabaseLike, nodeType: string, id: string): LineageTraceNode {
    const tableByType: Record<string, string> = {
      raw_batch: 'raw_batches',
      raw_record: 'raw_records',
      process_run: 'process_runs',
      process_step: 'process_steps',
      clean_record: 'clean_records',
      result_record: 'result_records',
      aggregate_snapshot: 'aggregate_snapshots'
    };
    const table = tableByType[nodeType];
    if (!table) return { id, nodeType, children: [] };
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    if (!row) return { id, nodeType, children: [] };
    const metadata = parseJson(row.metadata_json ?? row.summary_json ?? row.metrics_json);
    const processSteps = nodeType === 'process_run'
      ? db.prepare(`
        SELECT id, step_name, input_refs_json, output_refs_json, summary_json, created_at
        FROM process_steps
        WHERE run_id = ?
        ORDER BY created_at ASC
      `).all(id).map((step) => ({
        id: asOptionalString(step.id),
        stepName: asOptionalString(step.step_name),
        inputRefs: parseJson(step.input_refs_json),
        outputRefs: parseJson(step.output_refs_json),
        summary: parseJson(step.summary_json),
        createdAt: asOptionalString(step.created_at)
      }))
      : undefined;
    return {
      id,
      nodeType,
      domain: asOptionalString(row.domain),
      sourceType: asOptionalString(row.source_type),
      sourceId: asOptionalString(row.source_id),
      businessId: asOptionalString(row.business_id),
      resultType: asOptionalString(row.result_type),
      contentHash: asOptionalString(row.content_hash),
      payload: parseJson(row.payload_json),
      metadata: processSteps ? { ...(isPlainObject(metadata) ? metadata : {}), steps: processSteps } : metadata,
      children: []
    };
  }
}

function resolveLineageDbPath() {
  if (process.env.SUNNY_LINEAGE_DB_PATH?.trim()) return process.env.SUNNY_LINEAGE_DB_PATH.trim();
  const uploadRoot = process.env.UPLOAD_DIR
    ? process.env.UPLOAD_DIR
    : process.env.NODE_ENV === 'production'
      ? '/app/uploads'
      : join(process.cwd(), 'uploads');
  return join(uploadRoot, 'lineage', 'sunny-lineage.sqlite');
}

function isLineageDisabledByEnv() {
  if (process.env.SUNNY_LINEAGE_DISABLED === 'true') return true;
  if (process.env.NODE_ENV === 'production') {
    return process.env.SUNNY_LINEAGE_ENABLED !== 'true' || !process.env.SUNNY_LINEAGE_DB_PATH?.trim();
  }
  return false;
}

function stringifyJson(value: JsonValue) {
  return JSON.stringify(value ?? null);
}

function parseJson(value: unknown) {
  if (typeof value !== 'string') return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function sanitizeLineageValue(value: JsonValue, sensitiveFields: string[]): JsonValue {
  if (Array.isArray(value)) return value.map((entry) => sanitizeLineageValue(entry, sensitiveFields));
  if (!isPlainObject(value)) return value;
  const sensitiveSet = new Set(sensitiveFields.map((field) => field.toLowerCase()));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      if (sensitiveSet.has(key.toLowerCase())) {
        return [key, hashJson({ redacted: entry })];
      }
      return [key, sanitizeLineageValue(entry, sensitiveFields)];
    })
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: JsonValue): Record<string, unknown> {
  return isPlainObject(value) ? value : { value };
}

function hashJson(value: JsonValue) {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function stableStringify(value: JsonValue): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function nowIso() {
  return new Date().toISOString();
}

function asOptionalString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

export function buildLineagePriceBookMetrics(rows: Array<{ agentName?: string; channelName?: string; destinationCountry?: string; costPerKg?: number; minWeightKg?: number; maxWeightKg?: number }>) {
  const distribution = (key: 'agentName' | 'channelName' | 'destinationCountry') => {
    const result: Record<string, number> = {};
    rows.forEach((row) => {
      const value = String(row[key] ?? '').trim() || '-';
      result[value] = (result[value] ?? 0) + 1;
    });
    return result;
  };
  return {
    rowCount: rows.length,
    hashSum: hashJson(rows),
    agentDistribution: distribution('agentName'),
    channelDistribution: distribution('channelName'),
    countryDistribution: distribution('destinationCountry'),
    costTotal: rows.reduce((sum, row) => sum + Number(row.costPerKg ?? 0), 0),
    minWeightTotal: rows.reduce((sum, row) => sum + Number(row.minWeightKg ?? 0), 0),
    maxWeightTotal: rows.reduce((sum, row) => sum + Number(row.maxWeightKg ?? 0), 0)
  };
}

const LINEAGE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS raw_batches (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS raw_records (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  raw_index INTEGER,
  payload_json TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS process_runs (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  run_type TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  logic_version TEXT NOT NULL,
  input_refs_json TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS process_steps (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  step_name TEXT NOT NULL,
  input_refs_json TEXT,
  output_refs_json TEXT,
  summary_json TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS clean_records (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  raw_record_id TEXT,
  domain TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  validation_status TEXT NOT NULL,
  payload_json TEXT,
  errors_json TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS result_records (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  result_type TEXT NOT NULL,
  business_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lineage_edges (
  id TEXT PRIMARY KEY,
  parent_node_type TEXT NOT NULL,
  parent_id TEXT NOT NULL,
  child_node_type TEXT NOT NULL,
  child_id TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS aggregate_snapshots (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  metrics_json TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS watcher_logs (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT NOT NULL,
  result TEXT NOT NULL,
  summary_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_raw_records_batch ON raw_records(batch_id, raw_index);
CREATE INDEX IF NOT EXISTS idx_process_runs_domain ON process_runs(domain, run_type, created_at);
CREATE INDEX IF NOT EXISTS idx_result_records_lookup ON result_records(result_type, business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_lineage_edges_child ON lineage_edges(child_node_type, child_id);
CREATE INDEX IF NOT EXISTS idx_lineage_edges_parent ON lineage_edges(parent_node_type, parent_id);
CREATE INDEX IF NOT EXISTS idx_aggregate_scope ON aggregate_snapshots(scope_type, scope_id, created_at);
`;
