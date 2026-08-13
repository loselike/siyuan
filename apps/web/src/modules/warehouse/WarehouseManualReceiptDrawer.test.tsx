import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WarehouseManualReceiptDrawer } from './WarehouseManualReceiptDrawer';
import type { WarehousePackageDraft } from './warehousePageModel';

const draft: WarehousePackageDraft = {
  customerCode: '9409',
  combinedOrderNo: '9409-SF001',
  totalPackageCount: 5,
  packageIndex: 1,
  domesticTrackingNo: 'SF001',
  scanTime: '2026-08-14T10:30',
  weightKg: 0,
  lengthCm: 0,
  widthCm: 0,
  heightCm: 0,
  packageCount: 1,
  divisor: 6000,
  remark: '原备注',
  manualException: '外箱潮湿',
  cartonSpecs: [
    { packageCount: 2, weightKg: 5, lengthCm: 40, widthCm: 30, heightCm: 20 },
    { packageCount: 3, weightKg: 7, lengthCm: 50, widthCm: 40, heightCm: 30 }
  ]
};

function renderDrawer(overrides: Partial<ComponentProps<typeof WarehouseManualReceiptDrawer>> = {}) {
  const props: ComponentProps<typeof WarehouseManualReceiptDrawer> = {
    open: true,
    draft,
    customerOptions: [{ value: '9409', label: '9409 - Daloday' }],
    customersLoading: false,
    selectedCustomerName: 'Daloday',
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    onDraftChange: vi.fn(),
    onCustomerCodeChange: vi.fn(),
    onTrackingNoChange: vi.fn(),
    onCartonSpecChange: vi.fn(),
    onAddCartonSpec: vi.fn(),
    onRemoveCartonSpec: vi.fn(),
    ...overrides
  };
  render(<WarehouseManualReceiptDrawer {...props} />);
  return props;
}

describe('WarehouseManualReceiptDrawer', () => {
  afterEach(() => cleanup());

  it('preserves customer, carton metrics and delegated editing actions', async () => {
    const user = userEvent.setup();
    const props = renderDrawer();

    expect(screen.getByText('箱规 2 条')).toBeInTheDocument();
    expect(screen.getByText('总件数 5 件')).toBeInTheDocument();
    expect(screen.getByText('总体积 0.228 CBM')).toBeInTheDocument();
    expect(screen.getByText('总实重 31.00 KG')).toBeInTheDocument();
    expect(screen.getByLabelText('手动添加客户名称')).toHaveValue('Daloday');

    await user.type(screen.getByLabelText('手动添加快递单号'), '2');
    expect(props.onTrackingNoChange).toHaveBeenCalledWith('SF0012');
    fireEvent.change(screen.getByLabelText('第 2 条箱规件数'), { target: { value: '4' } });
    expect(props.onCartonSpecChange).toHaveBeenCalledWith(1, { packageCount: 4 });
    await user.click(screen.getByRole('button', { name: '在第 1 条后新增箱规' }));
    expect(props.onAddCartonSpec).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: '删除第 2 条箱规' }));
    expect(props.onRemoveCartonSpec).toHaveBeenCalledWith(1);
    await user.click(screen.getByRole('button', { name: '确认添加收货' }));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('keeps one carton row undeletable and delegates close', async () => {
    const user = userEvent.setup();
    const props = renderDrawer({ draft: { ...draft, cartonSpecs: [draft.cartonSpecs[0]] } });

    expect(screen.getByRole('button', { name: '删除第 1 条箱规' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
