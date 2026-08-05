import { Alert, Button, Card, Descriptions, Flex, Space, Tag, Timeline, Typography } from 'antd';
import type { WarehousePackageSummary, WarehouseTallyTaskSummary } from '@siyuan/shared';
import { formatBeijingDateTime } from '../shared/format';
import { ManagedTable } from '../shared/ui';
import { buildWarehouseTallyOutputDisplayRows, type WarehouseTallyOutputDisplayRow } from './warehouseTallyOutputRows';

const { Text } = Typography;

function TallyOutputRows({
  task,
  canCorrectHistoricalAggregate
}: {
  task: WarehouseTallyTaskSummary;
  canCorrectHistoricalAggregate: boolean;
}) {
  const rows = buildWarehouseTallyOutputDisplayRows(task.outputPackages ?? []);
  if (!rows.length) return null;
  const hasHistoricalAggregate = rows.some((row) => row.legacyAggregate);
  return (
    <Space direction="vertical" size={6} style={{ width: '100%', marginTop: 10 }}>
      <Text strong>理货结果包裹</Text>
      {hasHistoricalAggregate ? (
        <Alert
          type="warning"
          showIcon
          message="该任务仍是历史聚合记录，尚无逐件明细"
          description={canCorrectHistoricalAggregate
            ? '请先核对设备扫描预览，再使用“纠正聚合”恢复独立标签和逐件重尺。'
            : '当前账号可查看汇总，但没有纠正权限；逐件重尺需由具备纠正权限的仓库人员恢复。'}
        />
      ) : null}
      <ManagedTable<WarehouseTallyOutputDisplayRow>
        aria-label={`理货历史结果包裹 ${task.taskNo}`}
        rowKey="displayId"
        dataSource={rows}
        size="small"
        pagination={false}
        columnSettings={false}
        recordDetail={false}
        resizableColumns={false}
        minimumScrollX={1560}
        scroll={{ x: 1560 }}
        columns={[
          { title: '件序', dataIndex: 'pieceSequence', width: 80 },
          { title: '结果标签', dataIndex: 'labelNo', width: 190, render: (value: string | undefined, row) => value || row.combinedOrderNo || '-' },
          { title: '件数', dataIndex: 'packageCount', width: 70, align: 'right' },
          {
            title: '复测状态',
            dataIndex: 'measurementStatus',
            width: 110,
            render: (value?: WarehouseTallyOutputDisplayRow['measurementStatus']) => value === 'PENDING_REMEASURE'
              ? <Tag color="warning">待重新过机</Tag>
              : <Tag color="success">已测量</Tag>
          },
          { title: '复测实重', dataIndex: 'weightKg', width: 100, align: 'right', render: (value: number, row) => row.legacyAggregate ? '待恢复' : row.measurementStatus === 'PENDING_REMEASURE' ? '-' : `${value.toFixed(2)} kg` },
          { title: '复测尺寸', width: 130, render: (_value, row) => row.legacyAggregate ? '待恢复' : row.measurementStatus === 'PENDING_REMEASURE' ? '-' : `${row.lengthCm}×${row.widthCm}×${row.heightCm}` },
          { title: '体积', dataIndex: 'cbm', width: 100, align: 'right', render: (value: number, row) => row.legacyAggregate ? '待恢复' : row.measurementStatus === 'PENDING_REMEASURE' ? '-' : value.toFixed(6) },
          { title: '6000 材积重', dataIndex: 'volumetricWeightKg', width: 110, align: 'right', render: (value: number, row) => row.legacyAggregate ? '待恢复' : row.measurementStatus === 'PENDING_REMEASURE' ? '-' : `${value.toFixed(2)} kg` },
          { title: '计费重', dataIndex: 'chargeableWeightKg', width: 100, align: 'right', render: (value: number, row) => row.legacyAggregate ? '待恢复' : row.measurementStatus === 'PENDING_REMEASURE' ? '-' : `${value.toFixed(2)} kg` },
          {
            title: '数据形态',
            dataIndex: 'legacyAggregate',
            width: 130,
            render: (legacyAggregate: boolean) => legacyAggregate
              ? <Tag color="warning">历史聚合，待恢复</Tag>
              : <Tag color="blue">实体件记录</Tag>
          },
          { title: '数据来源', dataIndex: 'scanSource', width: 160, render: (value?: string) => value || '-' },
          { title: '过机设备/人员', dataIndex: 'measurementMatchedBy', width: 150, render: (value?: string) => value || '-' },
          { title: '过机时间', dataIndex: 'measurementMatchedAt', width: 170, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' }
        ]}
      />
    </Space>
  );
}

interface WarehouseTallyHistoryChainProps {
  tasks: WarehouseTallyTaskSummary[];
  sourcePackages?: WarehousePackageSummary[];
  sourcePackagesLoading?: boolean;
  sourcePackagesError?: string;
  canCorrectHistoricalAggregate?: boolean;
  correctionLoading?: boolean;
  onCorrectHistoricalAggregate?: (task: WarehouseTallyTaskSummary) => void;
}

export function WarehouseTallyHistoryChain({
  tasks,
  sourcePackages,
  sourcePackagesLoading = false,
  sourcePackagesError,
  canCorrectHistoricalAggregate = false,
  correctionLoading = false,
  onCorrectHistoricalAggregate
}: WarehouseTallyHistoryChainProps) {
  if (!tasks.length) {
    return <Alert type="warning" showIcon message="未找到完整理货历史，请按任务号核对历史数据" />;
  }

  const currentTask = tasks[tasks.length - 1]!;
  const showSourcePackages = tasks.length === 1 && currentTask.status === 'PENDING';
  const sourcePackageCount = (sourcePackages ?? []).reduce((sum, row) => sum + row.packageCount, 0);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {showSourcePackages ? (
        <Card
          size="small"
          title={(
            <Flex align="center" gap={8} wrap>
              <Text strong>原始包裹明细</Text>
              <Tag color="blue">{sourcePackagesLoading ? '加载中' : `${sourcePackages?.length ?? 0} 箱 / ${sourcePackageCount} 件`}</Tag>
            </Flex>
          )}
        >
          {sourcePackagesError ? (
            <Alert type="error" showIcon message="原始包裹加载失败" description={sourcePackagesError} style={{ marginBottom: 12 }} />
          ) : null}
          <ManagedTable<WarehousePackageSummary>
            rowKey="id"
            aria-label={`理货任务 ${currentTask.taskNo} 原始包裹明细`}
            dataSource={sourcePackages ?? []}
            loading={sourcePackagesLoading}
            pagination={false}
            size="small"
            columnSettings={false}
            recordDetail={{ title: '原始包裹数据详情' }}
            minimumScrollX={1320}
            scroll={{ x: 1320 }}
            locale={{ emptyText: sourcePackagesLoading ? '正在加载原始包裹' : '未找到原始包裹数据' }}
            columns={[
              { title: '客户编号-快递单号', dataIndex: 'combinedOrderNo', width: 240 },
              {
                title: '件序号',
                width: 90,
                render: (_, row, index) => `${row.packageIndex ?? index + 1}/${row.expectedTotalPackageCount ?? sourcePackages?.length ?? 1}`
              },
              { title: '件数', dataIndex: 'packageCount', width: 70, align: 'right' },
              { title: '单件实重', dataIndex: 'weightKg', width: 105, align: 'right', render: (value: number) => `${value.toFixed(2)} kg` },
              { title: '尺寸 cm', width: 125, render: (_, row) => `${row.lengthCm}×${row.widthCm}×${row.heightCm}` },
              { title: '单件方数', dataIndex: 'cbm', width: 110, align: 'right', render: (value: number) => value.toFixed(6) },
              { title: '单件5000材积', dataIndex: 'volumetricWeightKg5000', width: 125, align: 'right', render: (value?: number) => (value ?? 0).toFixed(2) },
              { title: '单件6000材积', dataIndex: 'volumetricWeightKg', width: 125, align: 'right', render: (value: number) => value.toFixed(2) },
              {
                title: '入仓时间',
                width: 170,
                render: (_, row) => formatBeijingDateTime(row.inboundAt ?? row.scanTime ?? row.createdAt)
              },
              {
                title: '异常',
                width: 150,
                render: (_, row) => row.manualException || row.exceptions.join('；') || '-'
              }
            ]}
          />
        </Card>
      ) : null}

      <Timeline
        items={tasks.map((task, index) => ({
          color: index === tasks.length - 1 ? 'blue' : 'gray',
          children: (
            <Card
              size="small"
              title={`第 ${index + 1} 次理货`}
              extra={(
                <Space size={6}>
                  {index === tasks.length - 1 ? <Tag color="processing">当前</Tag> : <Tag>历史</Tag>}
                  {canCorrectHistoricalAggregate && task.outputPackages?.some((pkg) => pkg.packageCount > 1 && pkg.status === 'RECEIVED') ? (
                    <Button size="small" danger loading={correctionLoading} onClick={() => onCorrectHistoricalAggregate?.(task)}>
                      纠正聚合
                    </Button>
                  ) : null}
                </Space>
              )}
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
              <TallyOutputRows task={task} canCorrectHistoricalAggregate={canCorrectHistoricalAggregate} />
            </Card>
          )
        }))}
      />
    </Space>
  );
}
