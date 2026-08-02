import type { WarehousePackageStatus } from '@siyuan/shared';

/**
 * 在仓数据只允许修改尚未录单的包裹。
 * 普通在仓包裹统一为 RECEIVED；一旦已录单绑定运单，或离开在仓状态，即不可再修改。
 */
export function canUpdateUnenteredWarehousePackage(status: WarehousePackageStatus, shipmentId?: string | null) {
  return status === 'RECEIVED' && !shipmentId;
}
