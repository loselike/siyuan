import type { WarehouseMeasurementStatus } from '@siyuan/shared';

export interface WarehouseMeasurementStatusPresentationInput {
  measurementStatus?: WarehouseMeasurementStatus;
  tallyTaskId?: string;
  tallyTaskNo?: string;
}

export interface WarehouseMeasurementStatusPresentation {
  label: '原始测量' | '待重新过机' | '已重新过机';
  color: 'success' | 'warning' | 'processing';
}

export function resolveWarehouseMeasurementStatusPresentation(
  input: WarehouseMeasurementStatusPresentationInput
): WarehouseMeasurementStatusPresentation {
  if (input.measurementStatus === 'PENDING_REMEASURE') {
    return { label: '待重新过机', color: 'warning' };
  }
  if (input.tallyTaskId || input.tallyTaskNo) {
    return { label: '已重新过机', color: 'processing' };
  }
  return { label: '原始测量', color: 'success' };
}
