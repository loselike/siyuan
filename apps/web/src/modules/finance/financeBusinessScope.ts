import type { Shipment } from '@siyuan/shared';

export function filterServerScopedBusinessShipments(shipments: readonly Shipment[]) {
  return shipments.filter((shipment) => !shipment.deletedAt);
}

export function resolveBusinessDraftRows(apiRows: readonly Shipment[], fallbackRows: readonly Shipment[]) {
  const rows = apiRows.length
    ? apiRows
    : fallbackRows.filter((shipment) => ['DRAFT', 'REVIEW_REJECTED'].includes(shipment.status));
  return rows.filter((shipment) => !shipment.deletedAt && ['DRAFT', 'REVIEW_REJECTED'].includes(shipment.status));
}

export function resolveBusinessPendingReviewRows(apiRows: readonly Shipment[], fallbackRows: readonly Shipment[]) {
  const rows = apiRows.length
    ? apiRows
    : fallbackRows.filter((shipment) => shipment.status === 'REVIEW_PENDING');
  return rows.filter((shipment) => !shipment.deletedAt && shipment.status === 'REVIEW_PENDING');
}
