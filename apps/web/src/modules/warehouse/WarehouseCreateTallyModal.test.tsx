import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WarehouseCreateTallyModal } from './WarehouseCreateTallyModal';

describe('WarehouseCreateTallyModal', () => {
  it('preserves the selected count, requirement input and confirm action', async () => {
    const user = userEvent.setup();
    const onRequirementChange = vi.fn();
    const onConfirm = vi.fn();

    render(
      <WarehouseCreateTallyModal
        open
        selectedCount={2}
        requirement="保留原箱唛头"
        onRequirementChange={onRequirementChange}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText('已选择 2 个在仓包裹，提交后进入未完成理货。')).toBeInTheDocument();
    expect(screen.getByLabelText('理货需求')).toHaveValue('保留原箱唛头');
    await user.type(screen.getByLabelText('理货需求'), '，拆分 50/25');
    expect(onRequirementChange).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '确认发起' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('keeps cancellation delegated to the page state owner', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <WarehouseCreateTallyModal
        open
        selectedCount={1}
        requirement=""
        onRequirementChange={vi.fn()}
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />
    );

    await user.click(screen.getAllByRole('button', { name: /取\s*消/ }).at(-1)!);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
