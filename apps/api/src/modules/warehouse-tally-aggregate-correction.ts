import type { WarehouseTallyHistoricalAggregateScanSummary } from '@siyuan/shared';
import { createHash } from 'node:crypto';

export const WAREHOUSE_TALLY_AGGREGATE_CORRECTION_ARCHIVE_REASON = '历史聚合理货纠正';

export interface WarehouseTallyCorrectionRawSample {
  id: string;
  deviceNo?: string | null;
  payload: unknown;
  payloadHash: string;
  result: string;
  errorMessage?: string | null;
  receivedAt: Date;
}

export interface WarehouseTallyCorrectionMeasurement extends WarehouseTallyHistoricalAggregateScanSummary {
  payloadHash: string;
  measuredAt: Date;
  barcode: string;
  errorMessage?: string;
}

export interface WarehouseTallyCorrectionMeasurementSelection {
  scans: WarehouseTallyCorrectionMeasurement[];
  reason?: string;
}

function positiveNumber(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function resolveMeasuredAt(payload: Record<string, unknown>, receivedAt: Date): Date {
  const raw = payload.measuredAt;
  if (typeof raw === 'number' || typeof raw === 'string') {
    const numeric = Number(raw);
    const candidate = Number.isFinite(numeric) && numeric > 0
      ? new Date(numeric)
      : new Date(String(raw));
    if (!Number.isNaN(candidate.getTime())) return candidate;
  }
  return receivedAt;
}

export function selectWarehouseTallyCorrectionMeasurements(
  samples: WarehouseTallyCorrectionRawSample[],
  expectedPackageCount: number
): WarehouseTallyCorrectionMeasurementSelection {
  if (!Number.isSafeInteger(expectedPackageCount) || expectedPackageCount < 2) {
    return { scans: [], reason: '历史聚合结果件数必须大于 1' };
  }
  const uniqueByPayload = new Map<string, WarehouseTallyCorrectionMeasurement>();
  const sorted = [...samples].sort((left, right) =>
    left.receivedAt.getTime() - right.receivedAt.getTime() || left.id.localeCompare(right.id)
  );
  for (const sample of sorted) {
    if (sample.result !== 'SUCCESS' && sample.result !== 'FAILED') continue;
    if (sample.result === 'FAILED' && !sample.errorMessage?.includes('理货标签已完成过机且本次数据不同')) continue;
    if (!sample.payload || typeof sample.payload !== 'object' || Array.isArray(sample.payload)) continue;
    const payload = sample.payload as Record<string, unknown>;
    const weightKg = positiveNumber(payload.weightKg);
    const lengthCm = positiveNumber(payload.lengthCm);
    const widthCm = positiveNumber(payload.widthCm);
    const heightCm = positiveNumber(payload.heightCm);
    if (weightKg === undefined || lengthCm === undefined || widthCm === undefined || heightCm === undefined) continue;
    if (uniqueByPayload.has(sample.payloadHash)) continue;
    const barcode = String(payload.barcode || payload.orderNo || '').trim();
    uniqueByPayload.set(sample.payloadHash, {
      sampleId: sample.id,
      payloadHash: sample.payloadHash,
      barcode,
      receivedAt: sample.receivedAt.toISOString(),
      measuredAt: resolveMeasuredAt(payload, sample.receivedAt),
      deviceNo: sample.deviceNo ?? undefined,
      result: sample.result,
      errorMessage: sample.errorMessage ?? undefined,
      weightKg,
      lengthCm,
      widthCm,
      heightCm
    });
  }
  const scans = [...uniqueByPayload.values()];
  if (scans.length !== expectedPackageCount) {
    return { scans, reason: `需要 ${expectedPackageCount} 条不同的有效扫描数据，当前找到 ${scans.length} 条` };
  }
  return { scans };
}

export function createWarehouseTallyCorrectionPreviewFingerprint(input: {
  taskId: string;
  legacyPackageId: string;
  packageCount: number;
  scans: WarehouseTallyCorrectionMeasurement[];
}): string {
  return createHash('sha256').update(JSON.stringify({
    taskId: input.taskId,
    legacyPackageId: input.legacyPackageId,
    packageCount: input.packageCount,
    scans: input.scans.map((scan) => ({
      sampleId: scan.sampleId,
      payloadHash: scan.payloadHash,
      barcode: scan.barcode,
      errorMessage: scan.errorMessage,
      receivedAt: scan.receivedAt,
      weightKg: scan.weightKg,
      lengthCm: scan.lengthCm,
      widthCm: scan.widthCm,
      heightCm: scan.heightCm
    }))
  })).digest('hex');
}
