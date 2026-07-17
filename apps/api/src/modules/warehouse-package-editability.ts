import type { WarehousePackageStatus } from '@siyuan/shared';

/**
 * 在仓数据只允许修改尚未录单的包裹。
 * PENDING/RECEIVED 均会显示在普通在仓列表；一旦已录单绑定运单，或离开在仓状态，即不可再修改。
 */
export function canUpdateUnenteredWarehousePackage(status: WarehousePackageStatus, shipmentId?: string | null) {
  return (status === 'PENDING' || status === 'RECEIVED') && !shipmentId;
}
