import { Alert, Card, Descriptions, Tag, Timeline, Typography } from 'antd';
import type { WarehouseTallyTaskSummary } from '@siyuan/shared';
import { formatBeijingDateTime } from '../shared/format';

const { Text } = Typography;

export function WarehouseTallyHistoryChain({ tasks }: { tasks: WarehouseTallyTaskSummary[] }) {
  if (!tasks.length) {
    return <Alert type="warning" showIcon message="未找到完整理货历史，请按任务号核对历史数据" />;
  }

  return (
    <Timeline
      items={tasks.map((task, index) => ({
        color: index === tasks.length - 1 ? 'blue' : 'gray',
        children: (
          <Card
            size="small"
            title={`第 ${index + 1} 次理货`}
            extra={index === tasks.length - 1 ? <Tag color="processing">当前</Tag> : <Tag>历史</Tag>}
          >
            <Descriptions size="small" column={2} colon={false}>
              <Descriptions.Item label="任务号" span={2}><Text strong>{task.taskNo}</Text></Descriptions.Item>
              <Descriptions.Item label="来源包裹" span={2}>{task.sourceCombinedOrderNo}</Descriptions.Item>
              <Descriptions.Item label="理货需求" span={2}>{task.tallyRequirement || '-'}</Descriptions.Item>
              <Descriptions.Item label="理货前件数">{task.packageCount} 件</Descriptions.Item>
              <Descriptions.Item label="理货后件数">{task.completedPackageCount ?? '-'} 件</Descriptions.Item>
              <Descriptions.Item label="理货前重量">{task.originalWeightKg.toFixed(2)} kg</Descriptions.Item>
              <Descriptions.Item label="理货后重量">{task.completedWeightKg === undefined ? '-' : `${task.completedWeightKg.toFixed(2)} kg`}</Descriptions.Item>
              <Descriptions.Item label="理货前尺寸">{task.originalLengthCm}×{task.originalWidthCm}×{task.originalHeightCm}</Descriptions.Item>
              <Descriptions.Item label="理货后尺寸">{task.completedLengthCm === undefined ? '-' : `${task.completedLengthCm}×${task.completedWidthCm}×${task.completedHeightCm}`}</Descriptions.Item>
              <Descriptions.Item label="完成时间">{task.completedAt ? formatBeijingDateTime(task.completedAt) : '-'}</Descriptions.Item>
              <Descriptions.Item label="完成人">{task.completedBy || '-'}</Descriptions.Item>
              <Descriptions.Item label="标签号">{task.labelNo || '-'}</Descriptions.Item>
              <Descriptions.Item label="覆盖后包裹">{task.appliedPackageNo || '-'}</Descriptions.Item>
              {task.remark ? <Descriptions.Item label="备注" span={2}>{task.remark}</Descriptions.Item> : null}
            </Descriptions>
          </Card>
        )
      }))}
    />
  );
}
