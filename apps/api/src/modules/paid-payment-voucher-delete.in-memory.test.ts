import { describe, expect, it } from 'vitest';
import { InMemoryRepository } from './in-memory.repository.js';
import type { Principal } from './rbac.js';

const admin: Principal = { id: 'u-admin', username: 'admin', role: 'ADMIN' };

type MutableRepositoryState = {
  paymentApplications: any[];
  paymentVouchers: any[];
  auditLogs: any[];
};

function stateOf(repository: InMemoryRepository): MutableRepositoryState {
  return repository as unknown as MutableRepositoryState;
}

function seedPaymentReceipt(repository: InMemoryRepository, options: { id?: string; voucherType?: 'BILL' | 'PAYMENT_RECEIPT' } = {}) {
  const state = stateOf(repository);
  state.paymentApplications.push({
    id: 'payment-application-delete-1',
    applicationNo: 'FKSQ202608200001',
    agentName: '测试代理',
    currency: 'RMB',
    totalAmount: 640,
    status: 'WAITING_PAYMENT',
    appliedAt: '2026-08-20T01:00:00.000Z'
  });
  const voucher = {
    id: options.id ?? 'payment-receipt-delete-1',
    paymentApplicationId: 'payment-application-delete-1',
    voucherType: options.voucherType ?? 'PAYMENT_RECEIPT',
    fileName: '上传错误的水单.png',
    mimeType: 'image/png',
    sizeBytes: 1024,
    url: '/api/uploads/vouchers/20260820-11111111-1111-4111-8111-111111111111.png',
    uploadedBy: 'finance',
    createdAt: '2026-08-20T01:10:00.000Z'
  };
  state.paymentVouchers.push(voucher);
  return { state, voucher };
}

describe('paid payment water-receipt deletion', () => {
  it('deletes the selected wrong receipt and keeps an audit snapshot', async () => {
    const repository = new InMemoryRepository();
    const { state, voucher } = seedPaymentReceipt(repository);

    await expect(repository.deletePaymentWaterReceipt(admin, voucher.id)).resolves.toEqual({ deleted: true });

    expect(state.paymentVouchers).not.toContainEqual(expect.objectContaining({ id: voucher.id }));
    expect(state.auditLogs).toContainEqual(expect.objectContaining({
      action: 'finance.paid_payment.water_receipt.delete',
      actionLabel: '删除付款水单',
      target: voucher.id,
      actorId: admin.id,
      before: expect.objectContaining({
        voucherId: voucher.id,
        paymentApplicationId: 'payment-application-delete-1',
        fileName: '上传错误的水单.png'
      })
    }));
  });

  it('rejects a role without the delete action and keeps the receipt', async () => {
    const repository = new InMemoryRepository();
    const { state, voucher } = seedPaymentReceipt(repository);
    const role = await repository.createRoleGroup(admin, { label: '已付款凭证只读' });
    await repository.updateRolePermissions(admin, role.key, [
      'finance:paid-payment:read',
      'finance:paid-payment:voucher-view'
    ]);
    const viewer: Principal = { id: 'u-paid-voucher-viewer', username: 'paid-voucher-viewer', role: role.key };

    await expect(repository.deletePaymentWaterReceipt(viewer, voucher.id)).rejects.toThrow('没有市场应付审核权限');
    expect(state.paymentVouchers).toContainEqual(expect.objectContaining({ id: voucher.id }));
  });

  it('rejects non-payment vouchers and total-rule masked access', async () => {
    const repository = new InMemoryRepository();
    const { state, voucher } = seedPaymentReceipt(repository, { id: 'supplier-bill-1', voucherType: 'BILL' });

    await expect(repository.deletePaymentWaterReceipt(admin, voucher.id)).rejects.toThrow('付款水单不存在');
    expect(state.paymentVouchers).toContainEqual(expect.objectContaining({ id: voucher.id }));

    voucher.voucherType = 'PAYMENT_RECEIPT';
    const masked: Principal = {
      ...admin,
      globalFieldMasks: {
        'agent-short-name': false,
        'agent-company-name': false,
        'agent-channel': false,
        'agent-data': false,
        'payable-cost': true,
        'payable-status': false
      }
    };
    await expect(repository.deletePaymentWaterReceipt(masked, voucher.id)).rejects.toThrow('总规则已屏蔽付款凭证');
    expect(state.paymentVouchers).toContainEqual(expect.objectContaining({ id: voucher.id }));
  });
});
