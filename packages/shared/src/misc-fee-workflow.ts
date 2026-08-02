export interface KuayueFeeWorkflowSnapshot {
  sourceType: string;
  confirmationStatus?: string;
  auditStatus?: string;
  hangStatus?: string;
  paymentStatus?: string;
  archivedAt?: string | Date | null;
  voidedAt?: string | Date | null;
}

export function canSubmitKuayueHangRequest(snapshot: KuayueFeeWorkflowSnapshot) {
  return snapshot.sourceType === 'KUAYUE'
    && !snapshot.archivedAt
    && !snapshot.voidedAt
    && !['PENDING', 'APPROVED'].includes(snapshot.hangStatus ?? 'NONE');
}

export function canDirectPayAndArchiveKuayue(snapshot: KuayueFeeWorkflowSnapshot) {
  return snapshot.sourceType === 'KUAYUE'
    && snapshot.confirmationStatus === 'CONFIRMED'
    && snapshot.auditStatus === 'APPROVED'
    && (snapshot.hangStatus ?? 'NONE') === 'NONE'
    && (snapshot.paymentStatus ?? 'NONE') === 'NONE'
    && !snapshot.archivedAt
    && !snapshot.voidedAt;
}

export const pickupFeeSourceTypes = ['WAREHOUSE_PICKUP', 'MARKET_PICKUP'] as const;
export type PickupFeeSourceType = (typeof pickupFeeSourceTypes)[number];

export interface PickupFeeWorkflowSnapshot {
  sourceType: string;
  shipmentId?: string | null;
  businessAmount?: number | null;
  businessCurrency?: string | null;
  payableAmount?: number | null;
  payableCurrency?: string | null;
  confirmationStatus?: string;
  auditStatus?: string;
  hangStatus?: string;
  paymentStatus?: string;
  archivedAt?: string | Date | null;
  voidedAt?: string | Date | null;
}

export function isPickupFeeSourceType(sourceType: string): sourceType is PickupFeeSourceType {
  return pickupFeeSourceTypes.includes(sourceType as PickupFeeSourceType);
}

export function pickupFeeSourceForRole(role: string): PickupFeeSourceType | undefined {
  if (role === 'WAREHOUSE' || role.startsWith('UG_WAREHOUSE')) return 'WAREHOUSE_PICKUP';
  if (role === 'UG_MARKET') return 'MARKET_PICKUP';
  return undefined;
}

export function canAuditPickupFee(snapshot: PickupFeeWorkflowSnapshot) {
  return isPickupFeeSourceType(snapshot.sourceType)
    && Boolean(snapshot.shipmentId)
    && snapshot.businessAmount !== null
    && snapshot.businessAmount !== undefined
    && snapshot.confirmationStatus === 'CONFIRMED'
    && snapshot.auditStatus === 'PENDING'
    && (snapshot.hangStatus ?? 'NONE') !== 'PENDING'
    && !snapshot.archivedAt
    && !snapshot.voidedAt;
}

export function canEditPickupFeeRegistration(snapshot: PickupFeeWorkflowSnapshot) {
  return isPickupFeeSourceType(snapshot.sourceType)
    && snapshot.confirmationStatus === 'PENDING'
    && snapshot.auditStatus === 'PENDING'
    && !['PENDING', 'APPROVED'].includes(snapshot.hangStatus ?? 'NONE')
    && !snapshot.archivedAt
    && !snapshot.voidedAt;
}

export function canAssignPickupBusinessCost(snapshot: PickupFeeWorkflowSnapshot) {
  return isPickupFeeSourceType(snapshot.sourceType)
    && snapshot.confirmationStatus === 'PENDING'
    && !snapshot.archivedAt
    && !snapshot.voidedAt;
}

export function shouldMaterializePickupFinanceItems(snapshot: PickupFeeWorkflowSnapshot) {
  return isPickupFeeSourceType(snapshot.sourceType)
    && Boolean(snapshot.shipmentId)
    && snapshot.confirmationStatus === 'CONFIRMED'
    && snapshot.auditStatus === 'APPROVED';
}
