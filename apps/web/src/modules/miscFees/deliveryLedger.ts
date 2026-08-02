import type { MiscFeeSummary } from '@siyuan/shared';

export const deliveryLedgerLabels = {
  agent: '代理',
  feeName: '费用名称',
  customerCode: '客户编号',
  waybillNo: '运单号',
  cargoData: '货物数据',
  dispatchAgent: '配货代理',
  businessCost: '业务成本',
  payableCost: '应付成本',
  amount: '金额',
  currency: '币种',
  createdAt: '登记时间',
  createdBy: '登记人（称呼）',
  remark: '备注',
  status: '状态',
  action: '操作'
} as const;

export function formatDeliveryCargoData(cargo?: MiscFeeSummary['cargoData']) {
  if (!cargo) return '-';
  const values = [
    typeof cargo.packageCount === 'number' ? `${cargo.packageCount} 件` : undefined,
    typeof cargo.actualWeightKg === 'number' ? `${cargo.actualWeightKg} kg` : undefined,
    typeof cargo.volumeCbm === 'number' ? `${cargo.volumeCbm} CBM` : undefined
  ].filter((value): value is string => Boolean(value));
  return values.join(' / ') || '-';
}

export function deliveryPrimaryStatus(row: Pick<MiscFeeSummary, 'hangStatus' | 'matchStatus'>) {
  if (row.hangStatus === 'APPROVED') return '已挂账' as const;
  return row.matchStatus === 'MATCHED' ? '已匹配' as const : '未匹配' as const;
}
