const routingFeeStatusLabels: Record<string, string> = {
  PENDING: '待对账',
  CONFIRMED: '已审核',
  LOCKED: '已锁定',
  VOIDED: '已作废'
};

export function formatRoutingFeeStatus(status?: string) {
  return routingFeeStatusLabels[status ?? 'PENDING'] ?? '状态异常';
}
