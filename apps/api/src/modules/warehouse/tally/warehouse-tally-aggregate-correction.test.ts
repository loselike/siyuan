import { describe, expect, it } from 'vitest';
import {
  createWarehouseTallyCorrectionPreviewFingerprint,
  selectWarehouseTallyCorrectionMeasurements,
  type WarehouseTallyCorrectionRawSample
} from '../../warehouse-tally-aggregate-correction.js';

function sample(
  id: string,
  overrides: Partial<WarehouseTallyCorrectionRawSample> = {}
): WarehouseTallyCorrectionRawSample {
  return {
    id,
    deviceNo: 'mojia-1',
    payload: {
      barcode: 'TL-HISTORY-001',
      measuredAt: '2026-08-01T01:02:03.000Z',
      weightKg: 5,
      lengthCm: 30,
      widthCm: 20,
      heightCm: 10
    },
    payloadHash: `hash-${id}`,
    result: 'SUCCESS',
    receivedAt: new Date(`2026-08-01T01:0${id.slice(-1)}:00.000Z`),
    ...overrides
  };
}

describe('warehouse tally historical aggregate correction policy', () => {
  it('keeps the existing scan selection, ordering and conflict-sample rules', () => {
    const first = sample('sample-1');
    const conflict = sample('sample-2', {
      result: 'FAILED',
      errorMessage: '理货标签已完成过机且本次数据不同，请转人工确认',
      payload: {
        orderNo: 'TL-HISTORY-001',
        measuredAt: 1785546300000,
        weightKg: '6.5',
        lengthCm: 40,
        widthCm: 25,
        heightCm: 15
      }
    });
    const ignoredFailure = sample('sample-3', {
      result: 'FAILED',
      errorMessage: '普通设备失败'
    });
    const ignoredInvalid = sample('sample-4', {
      payload: { barcode: 'TL-HISTORY-001', weightKg: 0, lengthCm: 1, widthCm: 1, heightCm: 1 }
    });
    const duplicate = sample('sample-5', {
      payloadHash: first.payloadHash,
      receivedAt: new Date('2026-08-01T02:00:00.000Z')
    });

    const selection = selectWarehouseTallyCorrectionMeasurements(
      [duplicate, conflict, ignoredFailure, first, ignoredInvalid],
      2
    );

    expect(selection.reason).toBeUndefined();
    expect(selection.scans).toEqual([
      expect.objectContaining({
        sampleId: 'sample-1',
        result: 'SUCCESS',
        barcode: 'TL-HISTORY-001',
        measuredAt: new Date('2026-08-01T01:02:03.000Z'),
        weightKg: 5
      }),
      expect.objectContaining({
        sampleId: 'sample-2',
        result: 'FAILED',
        barcode: 'TL-HISTORY-001',
        measuredAt: new Date(1785546300000),
        weightKg: 6.5
      })
    ]);
  });

  it('keeps the existing count rejection and deterministic preview fingerprint', () => {
    expect(selectWarehouseTallyCorrectionMeasurements([], 1)).toEqual({
      scans: [],
      reason: '历史聚合结果件数必须大于 1'
    });
    expect(selectWarehouseTallyCorrectionMeasurements([sample('sample-1')], 2)).toEqual(expect.objectContaining({
      reason: '需要 2 条不同的有效扫描数据，当前找到 1 条'
    }));

    const scans = selectWarehouseTallyCorrectionMeasurements([
      sample('sample-2'),
      sample('sample-1')
    ], 2).scans;
    const input = {
      taskId: 'task-history-1',
      legacyPackageId: 'aggregate-1',
      packageCount: 2,
      scans
    };
    const fingerprint = createWarehouseTallyCorrectionPreviewFingerprint(input);

    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(createWarehouseTallyCorrectionPreviewFingerprint(input)).toBe(fingerprint);
    expect(createWarehouseTallyCorrectionPreviewFingerprint({
      ...input,
      scans: [...scans].reverse()
    })).not.toBe(fingerprint);
  });
});
