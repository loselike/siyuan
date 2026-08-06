import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WarehouseCompleteTallyModal } from './WarehouseCompleteTallyModal';

const draft = {
  packageCount: 2,
  weightKg: 0,
  lengthCm: 0,
  widthCm: 0,
  heightCm: 0,
  remark: '保留唛头'
};

const sourceItems = [
  { id: 'package-1', label: '9476-A / 1 件 / 12.00 kg' },
  { id: 'package-2', label: '9476-B / 1 件 / 10.00 kg' }
];

describe('WarehouseCompleteTallyModal', () => {
  it('preserves merge selection, draft editing and completion callbacks', async () => {
    const user = userEvent.setup();
    const onSourceIdsChange = vi.fn();
    const onDraftChange = vi.fn();
    const onConfirm = vi.fn();

    render(
      <WarehouseCompleteTallyModal
        open
        taskNo="TL-9476"
        sourceItems={sourceItems}
        error="固定失败提示"
        submitting={false}
        mode="MERGE"
        selectedSourceIds={[]}
        splitPieces=""
        draft={draft}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        onModeChange={vi.fn()}
        onSourceIdsChange={onSourceIdsChange}
        onSplitPiecesChange={vi.fn()}
        onDraftChange={onDraftChange}
      />
    );

    expect(screen.getByText(/任务 TL-9476：理货后每个实体件单独生成一条在仓记录/)).toBeInTheDocument();
    expect(screen.getByText('固定失败提示')).toBeInTheDocument();
    expect(screen.getByText(sourceItems[0].label)).toBeInTheDocument();
    expect(screen.getByText(sourceItems[1].label)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '全选原始包裹' }));
    expect(onSourceIdsChange).toHaveBeenCalledWith(['package-1', 'package-2']);

    await user.clear(screen.getByRole('spinbutton'));
    await user.type(screen.getByRole('spinbutton'), '3');
    expect(onDraftChange).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '确认完成' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('keeps split input and cancel delegated to the page state owner', async () => {
    const user = userEvent.setup();
    const onSourceIdsChange = vi.fn();
    const onSplitPiecesChange = vi.fn();
    const onCancel = vi.fn();

    render(
      <WarehouseCompleteTallyModal
        open
        taskNo="TL-9476"
        sourceItems={sourceItems}
        error={null}
        submitting={false}
        mode="SPLIT"
        selectedSourceIds={['package-1']}
        splitPieces="1,1"
        draft={draft}
        onCancel={onCancel}
        onConfirm={vi.fn()}
        onModeChange={vi.fn()}
        onSourceIdsChange={onSourceIdsChange}
        onSplitPiecesChange={onSplitPiecesChange}
        onDraftChange={vi.fn()}
      />
    );

    const dialog = screen.getAllByRole('dialog').at(-1)!;
    await user.click(within(dialog).getByRole('checkbox', { name: sourceItems[1].label }));
    expect(onSourceIdsChange).toHaveBeenCalledWith(['package-2']);

    await user.type(screen.getByLabelText('任务内拆分件数组合'), ',2');
    expect(onSplitPiecesChange).toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: /取\s*消/ }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('keeps dismissal locked while completion is submitting', () => {
    render(
      <WarehouseCompleteTallyModal
        open
        taskNo="TL-9476"
        sourceItems={sourceItems}
        error={null}
        submitting
        mode="KEEP"
        selectedSourceIds={[]}
        splitPieces=""
        draft={draft}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        onModeChange={vi.fn()}
        onSourceIdsChange={vi.fn()}
        onSplitPiecesChange={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );

    const dialog = screen.getAllByRole('dialog').at(-1)!;
    expect(within(dialog).getByRole('button', { name: /取\s*消/ })).toBeDisabled();
    expect(within(dialog).queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });
});
