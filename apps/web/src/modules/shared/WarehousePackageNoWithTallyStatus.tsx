import { Button, Tag, Tooltip, Typography } from 'antd';
import { resolveWarehouseTallyLifecycleStatus, type WarehousePackageSummary, type WarehouseTallyLifecycleStatus } from '@siyuan/shared';

const { Text } = Typography;

type WarehousePackageTallyRecord = Pick<
  WarehousePackageSummary,
  'tallyTaskId' | 'tallyTaskNo' | 'tallyCompleted' | 'tallyStatus'
>;

const tallyStatusColor: Record<Exclude<WarehouseTallyLifecycleStatus, '待理货'>, string> = {
  理货中: 'orange',
  已理货: 'processing',
  二次理货: 'purple'
};

export interface WarehousePackageNoWithTallyStatusProps {
  packageNo: string;
  record: WarehousePackageTallyRecord;
  onOpenTallyHistory?: () => void;
  className?: string;
  strong?: boolean;
}

/** 包裹号与理货生命周期标签的统一展示，供所有出现快递单号的模块复用。 */
export function WarehousePackageNoWithTallyStatus({
  packageNo,
  record,
  onOpenTallyHistory,
  className,
  strong = true
}: WarehousePackageNoWithTallyStatusProps) {
  const resolvedStatus = resolveWarehouseTallyLifecycleStatus(record);
  const status = record.tallyTaskId || record.tallyTaskNo ? resolvedStatus : record.tallyStatus ?? resolvedStatus;
  const showStatus = status !== '待理货';
  const canOpenHistory = Boolean(onOpenTallyHistory && record.tallyCompleted === true);
  const taskHint = record.tallyTaskNo || record.tallyTaskId;
  const tooltip = showStatus
    ? `${status}${taskHint ? ` · 理货任务 ${taskHint}` : ''}${canOpenHistory ? ' · 点击单号查看记录' : ''}`
    : packageNo;

  return (
    <Tooltip title={tooltip}>
      <span className={`warehouse-package-no-with-tally${className ? ` ${className}` : ''}`}>
        {canOpenHistory ? (
          <Button
            type="link"
            size="small"
            className="warehouse-package-no-link"
            aria-label={`查看理货记录 ${packageNo}`}
            onClick={(event) => {
              event.stopPropagation();
              onOpenTallyHistory?.();
            }}
          >
            {packageNo}
          </Button>
        ) : (
          <Text strong={strong} className="warehouse-package-no-text">{packageNo}</Text>
        )}
        {showStatus ? (
          <Tag color={tallyStatusColor[status]} className="warehouse-package-tally-status">
            {status}
          </Tag>
        ) : null}
      </span>
    </Tooltip>
  );
}
