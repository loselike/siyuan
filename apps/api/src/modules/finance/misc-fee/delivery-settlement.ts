type ReceivableSettlementRow = {
  amount: unknown;
  receivedAmount?: unknown;
  receiptStatus?: string | null;
};

type LegacyReceivableSettlementRow = ReceivableSettlementRow & {
  settled?: boolean;
};

export function isShipmentReceivableFullySettled(shipment: {
  receivableFees?: LegacyReceivableSettlementRow[];
  financeItems?: ReceivableSettlementRow[];
}) {
  const rows = [
    ...(shipment.receivableFees ?? []).map((item) => ({
      amount: Number(item.amount),
      receivedAmount: Number(item.receivedAmount ?? 0),
      received: Boolean(item.settled) || item.receiptStatus === 'RECEIVED'
    })),
    ...(shipment.financeItems ?? []).map((item) => ({
      amount: Number(item.amount),
      receivedAmount: Number(item.receivedAmount ?? 0),
      received: item.receiptStatus === 'RECEIVED'
    }))
  ];
  return rows.length > 0 && rows.every((item) => item.received || item.receivedAmount >= item.amount);
}
