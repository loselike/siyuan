import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { message } from 'antd';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReceivableFeeSummary, Shipment, ShipmentFinanceDetailSummary } from '@siyuan/shared';
import type { ApiClient, PermissionKey } from '../../../apiClient';
import { OrderFeePanel } from './OrderFeePanel';

const shipment = {
  id: 'shipment-chris',
  systemOrderNo: 'SHA050007',
  customerName: 'SHA050-Chris customer',
  status: 'REVIEW_PENDING'
} as Shipment;

const receivable = {
  id: 'receivable-chris',
  shipmentId: shipment.id,
  type: 'RECEIVABLE',
  name: '运费',
  amount: 3721.48,
  currency: 'USD',
  settlementMethod: 'SH阿里',
  reconciliationStatus: 'PENDING',
  settled: false,
  locked: false,
  voided: false,
  sourceType: 'MANUAL',
  receiptStatus: 'UNPAID',
  receivedAmount: 0,
  createdAt: '2026-08-20T12:00:00.000Z',
  createdBy: 'Chris'
} as ReceivableFeeSummary;

const detail = {
  shipmentId: shipment.id,
  systemOrderNo: shipment.systemOrderNo,
  receivables: [receivable],
  businessCosts: [],
  payables: [],
  receivableTotal: receivable.amount,
  businessCostTotal: 0,
  payableTotal: 0,
  canViewPayables: false
} as ShipmentFinanceDetailSummary;

const permissions = [
  'business:order-fee:view',
  'business:order-fee:update'
] as PermissionKey[];

function renderChrisOrderFeePanel(options?: { reload?: () => Promise<unknown> }) {
  const updateShipmentFinanceItem = vi.fn().mockResolvedValue(receivable);
  const onReload = vi.fn(options?.reload ?? (() => Promise.resolve()));
  const apiClient = { updateShipmentFinanceItem } as unknown as ApiClient;

  render(
    <OrderFeePanel
      apiClient={apiClient}
      role="UG_BUSINESS_MANAGER"
      permissions={permissions}
      agents={[]}
      shipment={shipment}
      detail={detail}
      onReload={onReload}
      renderShipmentOrderNoLink={(orderNo) => orderNo}
    />
  );

  return { onReload, updateShipmentFinanceItem };
}

describe('OrderFeePanel receivable editing', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('lets Chris change a receivable amount and sends the update request', async () => {
    const user = userEvent.setup();
    const { onReload, updateShipmentFinanceItem } = renderChrisOrderFeePanel();

    await user.click(screen.getByRole('button', { name: '修改' }));
    const editor = screen.getByTestId('order-fee-side-editor');
    const amountInput = within(editor).getByLabelText('总金额');
    await user.clear(amountInput);
    await user.type(amountInput, '4000');
    await user.click(within(editor).getByRole('button', { name: '保存费用' }));

    await waitFor(() => expect(updateShipmentFinanceItem).toHaveBeenCalledWith(
      shipment.id,
      receivable.id,
      expect.objectContaining({ amount: 4000, currency: 'USD', settlementMethod: 'SH阿里' })
    ));
    expect(onReload).toHaveBeenCalledWith(shipment.id);
    expect(screen.queryByTestId('order-fee-side-editor')).not.toBeInTheDocument();
  });

  it('shows a visible validation message instead of silently ignoring an invalid amount', async () => {
    const user = userEvent.setup();
    const errorMessage = vi.spyOn(message, 'error').mockImplementation(() => ({ then: () => undefined }) as never);
    const { updateShipmentFinanceItem } = renderChrisOrderFeePanel();

    await user.click(screen.getByRole('button', { name: '修改' }));
    const editor = screen.getByTestId('order-fee-side-editor');
    await user.clear(within(editor).getByLabelText('总金额'));
    await user.click(within(editor).getByRole('button', { name: '保存费用' }));

    await waitFor(() => expect(errorMessage).toHaveBeenCalledWith('请输入金额'));
    expect(updateShipmentFinanceItem).not.toHaveBeenCalled();
  });
});
