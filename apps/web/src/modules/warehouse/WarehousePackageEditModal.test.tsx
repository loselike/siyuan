import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WarehousePackageEditModal } from './WarehousePackageEditModal';
import type { WarehouseInboundPackage, WarehousePackageEditDraft } from './warehousePageModel';

const record = {
  id: 'warehouse-package-1',
  customerOrderNo: '9409',
  customerCode: '9409',
  domesticTrackingNo: 'SF001',
  combinedOrderNo: '9409-SF001'
} as WarehouseInboundPackage;

const draft: WarehousePackageEditDraft = {
  customerCode: '9409',
  domesticTrackingNo: 'SF001',
  combinedOrderNo: '9409-SF001',
  expectedTotalPackageCount: 1,
  packageIndex: 1,
  scanTime: '2026-08-14T10:30',
  weightKg: 6.5,
  lengthCm: 50,
  widthCm: 40,
  heightCm: 30,
  packageCount: 2,
  remark: '原备注',
  manualException: '原异常'
};

function renderModal(overrides: Partial<React.ComponentProps<typeof WarehousePackageEditModal>> = {}) {
  const props: React.ComponentProps<typeof WarehousePackageEditModal> = {
    record,
    draft,
    saving: false,
    canEdit: true,
    canShowSameSpecReplenish: true,
    canReplenishSameSpec: true,
    sameSpecSupplementCount: 3,
    sameSpecRequestAttempted: false,
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
    onDraftChange: vi.fn(),
    onCustomerCodeChange: vi.fn(),
    onTrackingNoChange: vi.fn(),
    onCombinedOrderNoChange: vi.fn(),
    onSameSpecSupplementCountChange: vi.fn(),
    ...overrides
  };
  render(<WarehousePackageEditModal {...props} />);
  return props;
}

describe('WarehousePackageEditModal', () => {
  afterEach(() => cleanup());

  it('preserves fields, live measurements and delegated edit actions', async () => {
    const user = userEvent.setup();
    const props = renderModal();
    const dialog = screen.getByRole('dialog', { name: '修改入仓包裹' });

    expect(within(dialog).getByText('体积 0.120 CBM')).toBeInTheDocument();
    expect(within(dialog).getByText('5000材积 24.00 KG')).toBeInTheDocument();
    expect(within(dialog).getByText('6000材积 20.00 KG')).toBeInTheDocument();
    expect(within(dialog).getByText('将新增 3 条、每条 1 件；原记录不变')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('修改客户编号'), '1');
    expect(props.onCustomerCodeChange).toHaveBeenCalledWith('94091');
    fireEvent.change(within(dialog).getByLabelText('修改件数'), { target: { value: '4' } });
    expect(props.onDraftChange).toHaveBeenCalledWith({ packageCount: 4 });
    fireEvent.change(within(dialog).getByLabelText('同箱规补录箱数'), { target: { value: '5' } });
    expect(props.onSameSpecSupplementCountChange).toHaveBeenCalledWith(5);

    await user.click(within(dialog).getByRole('button', { name: /保\s*存/ }));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('keeps pending same-spec retry inputs and dismissal locked', async () => {
    const user = userEvent.setup();
    const props = renderModal({ saving: true, sameSpecRequestAttempted: true });
    const dialog = screen.getByRole('dialog', { name: '修改入仓包裹' });

    expect(within(dialog).getByText('上次补录结果待确认')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('修改客户编号')).toBeDisabled();
    expect(within(dialog).getByLabelText('同箱规补录箱数')).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: /取\s*消/ })).toBeDisabled();
    expect(within(dialog).queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(props.onCancel).not.toHaveBeenCalled();
  });
});
