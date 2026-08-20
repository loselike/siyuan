import { App as AntdApp } from 'antd';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PaidPaymentListResponse, PaidPaymentSummary } from '@siyuan/shared';
import type { ApiClient, PermissionKey } from '../../../apiClient';
import { PaidPaymentPage } from './PaidPaymentPage';

const paidPayment: PaidPaymentSummary = {
  id: 'payment-1',
  applicationNo: 'FKSQ202608060001',
  date: '2026-08-06T08:00:00.000Z',
  agentName: '深圳市中飞国际货运代理有限公司',
  salesperson: 'Rachel',
  customerCode: '9229',
  systemOrderNo: 'SYGJ08039229017 等2票',
  feeName: '报关费 等2项',
  currency: 'RMB',
  totalAmount: 1725.11,
  status: 'PAID',
  paidAt: '2026-08-06T09:00:00.000Z',
  paidBy: 'finance',
  payerBankName: '深圳农商银行',
  payerBankAccountNo: '4000022709201486612',
  billVouchers: [],
  waterReceipts: [],
  items: []
};

const response: PaidPaymentListResponse = {
  rows: [paidPayment],
  totals: {
    count: 1,
    waitingPaymentCount: 0,
    paidCount: 1,
    amountByCurrency: [{ currency: 'RMB', amount: 1725.11 }]
  },
  pagination: { page: 1, pageSize: 10, totalItems: 1 }
};

describe('PaidPaymentPage matrix layout', () => {
  afterEach(cleanup);

  it('gives the four matrix business columns the same width', async () => {
    window.localStorage.removeItem('sunny.finance.paidPayment.view-v1');
    window.localStorage.removeItem('sunny.finance.paidPayment.matrix-columns-v1:widths');
    const paidPayments = vi.fn().mockResolvedValue(response);
    const apiClient = {
      paidPayments,
      downloadProtectedAsset: vi.fn().mockResolvedValue(new globalThis.Blob(['receipt'], { type: 'image/png' }))
    } as unknown as ApiClient;

    const { container } = render(
      <AntdApp>
        <PaidPaymentPage
          apiClient={apiClient}
          permissions={[
            'finance:paid-payment:read',
            'finance:paid-payment:reverse',
            'finance:paid-payment:update',
            'finance:paid-payment:voucher-view'
          ] as PermissionKey[]}
          renderShipmentOrderNoLink={(value) => value ?? '-'}
          viewMode="paid"
        />
      </AntdApp>
    );

    await waitFor(() => expect(paidPayments).toHaveBeenCalled());
    ['付款与代理', '运单与费用', '凭证与银行', '操作']
      .forEach((name) => expect(screen.getByRole('columnheader', { name })).toBeInTheDocument());
    const columnWidths = Array.from(container.querySelectorAll<HTMLTableColElement>('.finance-paid-payment-matrix-table colgroup col'))
      .map((column) => column.style.width)
      .filter(Boolean)
      .slice(-4);
    expect(columnWidths).toEqual([
      '280px',
      '280px',
      '280px',
      '280px'
    ]);
    expect(container.querySelector('.finance-paid-payment-matrix-table')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '反核销' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /补\s*充/ })).toBeInTheDocument();
  });

  it('shows the delete action for an uploaded water receipt only with its permission', async () => {
    window.localStorage.removeItem('sunny.finance.paidPayment.view-v1');
    const paidPayments = vi.fn().mockResolvedValue({
      ...response,
      rows: [{
        ...paidPayment,
        status: 'WAITING_PAYMENT',
        waterReceipts: [{
          id: 'payment-receipt-1',
          paymentApplicationId: paidPayment.id,
          voucherType: 'PAYMENT_RECEIPT',
          fileName: '上传错误的水单.png',
          url: '/api/uploads/vouchers/wrong.png',
          uploadedBy: 'finance',
          createdAt: '2026-08-20T01:00:00.000Z'
        }]
      }]
    } satisfies PaidPaymentListResponse);
    const apiClient = {
      paidPayments,
      downloadProtectedAsset: vi.fn().mockResolvedValue(new globalThis.Blob(['receipt'], { type: 'image/png' }))
    } as unknown as ApiClient;

    render(
      <AntdApp>
        <PaidPaymentPage
          apiClient={apiClient}
          permissions={[
            'finance:paid-payment:read',
            'finance:paid-payment:voucher-view',
            'finance:paid-payment:voucher-delete'
          ] as PermissionKey[]}
          renderShipmentOrderNoLink={(value) => value ?? '-'}
          viewMode="paid"
        />
      </AntdApp>
    );

    await waitFor(() => expect(paidPayments).toHaveBeenCalled());
    expect(screen.getByText('上传错误的水单.png')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /删\s*除/ })).toBeInTheDocument();
  });
});
