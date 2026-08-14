import { render, screen } from '@testing-library/react';
import type {
  WarehouseTallyRepeatStatisticsResponse,
  WarehouseTallyTaskSummary
} from '@siyuan/shared';
import { describe, expect, it, vi } from 'vitest';
import { WarehouseCompletedTallyPanel } from './WarehouseCompletedTallyPanel';

const completedTask = {
  id: 'task-completed-1',
  taskNo: 'TL-COMPLETED-1',
  status: 'COMPLETED',
  packageIds: ['package-1'],
  sourcePackageId: 'package-1',
  sourceCombinedOrderNo: 'ORDER-1-SF001',
  customerCode: 'C001',
  packageCount: 1,
  originalWeightKg: 10,
  originalLengthCm: 50,
  originalWidthCm: 40,
  originalHeightCm: 30,
  originalVolumetricWeightKg: 10,
  originalVolumetricWeightKg5000: 12,
  tallyRequirement: '复核尺寸',
  createdAt: '2026-08-14T00:00:00.000Z',
  completedAt: '2026-08-14T01:00:00.000Z',
  completedPackageCount: 1,
  completedWeightKg: 10,
  completedLengthCm: 50,
  completedWidthCm: 40,
  completedHeightCm: 30,
  completedVolumetricWeightKg: 10,
  completedVolumetricWeightKg5000: 12,
  labelStatus: 'NOT_GENERATED',
  outputPackages: []
} as WarehouseTallyTaskSummary;

describe('WarehouseCompletedTallyPanel current baseline', () => {
  it('keeps completed tally detail available without a cancel action', () => {
    render(<WarehouseCompletedTallyPanel
      view="tasks"
      onViewChange={vi.fn()}
      completedTasks={[completedTask]}
      completedArchiveRows={[]}
      completedTaskByKey={new Map()}
      canViewDetail
      canGenerateLabel={false}
      canPrintLabel={false}
      canDownloadLabel={false}
      onViewTask={vi.fn()}
      onGenerateLabel={vi.fn()}
      onPrintLabel={vi.fn()}
      onDownloadLabel={vi.fn()}
      repeatStatistics={{ summary: { repeatedBatchCount: 0 } } as WarehouseTallyRepeatStatisticsResponse}
      repeatFilterDraft={{}}
      repeatOperatorOptions={[]}
      repeatStatisticsLoading={false}
      repeatStatisticsView="operators"
      setRepeatFilterDraft={vi.fn()}
      onQueryRepeatStatistics={vi.fn()}
      onResetRepeatStatistics={vi.fn()}
      onRepeatStatisticsViewChange={vi.fn()}
      onShowOperatorRepeatBatches={vi.fn()}
      onOpenRepeatBatchHistory={vi.fn()}
    />);

    expect(screen.getByText('TL-COMPLETED-1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /查\s*看/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /取\s*消\s*理\s*货/ })).not.toBeInTheDocument();
  });
});
