import { Button, Card, Checkbox, Input, Segmented, Space, Tag, Typography } from 'antd';
import type { Dispatch, SetStateAction } from 'react';
import type {
  WarehouseTallyRepeatBatchSummary,
  WarehouseTallyRepeatOperatorSummary,
  WarehouseTallyRepeatStatisticsQuery,
  WarehouseTallyRepeatStatisticsResponse,
  WarehouseTallyTaskSummary
} from '@siyuan/shared';
import { formatBeijingDateTime } from '../shared/format';
import { ManagedTable, tenRowTablePagination } from '../shared/ui';
import type { WarehouseInboundPackage } from './warehousePageModel';
import { buildWarehouseTallyOutputDisplayRows, type WarehouseTallyOutputDisplayRow } from './warehouseTallyOutputRows';
import { buildCompletedTallyArchiveSummaries, resolveCompletedTallyArchiveRecordKind } from './warehouseCompletedTallyHistory';
import { WarehouseCompletedTallyHistorySummary } from './WarehouseCompletedTallyHistorySummary';

const { Text } = Typography;

export type CompletedTallyView = 'tasks' | 'history' | 'repeat-statistics';
export type TallyRepeatStatisticsView = 'operators' | 'batches';

export function WarehouseCompletedTallyPanel({
  view,
  onViewChange,
  completedTasks,
  completedArchiveRows,
  completedTaskByKey,
  canViewDetail,
  canUpdateCount,
  canGenerateLabel,
  canPrintLabel,
  canDownloadLabel,
  onViewTask,
  onUpdateCount,
  onGenerateLabel,
  onPrintLabel,
  onDownloadLabel,
  repeatStatistics,
  repeatFilterDraft,
  repeatOperatorOptions,
  repeatStatisticsLoading,
  repeatStatisticsView,
  setRepeatFilterDraft,
  onQueryRepeatStatistics,
  onResetRepeatStatistics,
  onRepeatStatisticsViewChange,
  onShowOperatorRepeatBatches,
  onOpenRepeatBatchHistory
}: {
  view: CompletedTallyView;
  onViewChange: (view: CompletedTallyView) => void;
  completedTasks: WarehouseTallyTaskSummary[];
  completedArchiveRows: WarehouseInboundPackage[];
  completedTaskByKey: ReadonlyMap<string, WarehouseTallyTaskSummary>;
  canViewDetail: boolean;
  canUpdateCount: boolean;
  canGenerateLabel: boolean;
  canPrintLabel: boolean;
  canDownloadLabel: boolean;
  onViewTask: (task: WarehouseTallyTaskSummary) => void;
  onUpdateCount: (task: WarehouseTallyTaskSummary) => void;
  onGenerateLabel: (task: WarehouseTallyTaskSummary) => void;
  onPrintLabel: (task: WarehouseTallyTaskSummary) => void;
  onDownloadLabel: (task: WarehouseTallyTaskSummary) => void;
  repeatStatistics: WarehouseTallyRepeatStatisticsResponse;
  repeatFilterDraft: WarehouseTallyRepeatStatisticsQuery;
  repeatOperatorOptions: string[];
  repeatStatisticsLoading: boolean;
  repeatStatisticsView: TallyRepeatStatisticsView;
  setRepeatFilterDraft: Dispatch<SetStateAction<WarehouseTallyRepeatStatisticsQuery>>;
  onQueryRepeatStatistics: () => void;
  onResetRepeatStatistics: () => void;
  onRepeatStatisticsViewChange: (view: TallyRepeatStatisticsView) => void;
  onShowOperatorRepeatBatches: (record: WarehouseTallyRepeatOperatorSummary) => void;
  onOpenRepeatBatchHistory: (record: WarehouseTallyRepeatBatchSummary) => void;
}) {
  const completedTallyArchiveSummaries = buildCompletedTallyArchiveSummaries(completedArchiveRows, completedTasks);

  return (
    <Card
      title={(
        <Space size={12}>
          <span>已完成理货</span>
          <Segmented
            size="small"
            aria-label="已完成理货视图"
            value={view}
            onChange={(value) => onViewChange(value as CompletedTallyView)}
            options={[
              { label: '任务', value: 'tasks' },
              { label: '已完成理货历史', value: 'history' },
              { label: '重复理货统计', value: 'repeat-statistics' }
            ]}
          />
          <Text type="secondary">
            {view === 'repeat-statistics'
              ? `共 ${repeatStatistics.summary.repeatedBatchCount} 个重复批次`
              : view === 'tasks'
                ? `共 ${completedTasks.length} 个任务`
                : `共 ${completedArchiveRows.length} 条归档记录`}
          </Text>
        </Space>
      )}
    >
      {view === 'tasks' ? (
        <ManagedTable<WarehouseTallyTaskSummary>
          recordDetail={{ title: '已完成理货任务详情' }}
          rowKey="id"
          dataSource={completedTasks}
          size="small"
          pagination={tenRowTablePagination}
          columnSettingsPlacement="toolbar"
          scroll={{ x: 2000 }}
          expandable={{
            rowExpandable: (task) => Boolean(buildWarehouseTallyOutputDisplayRows(task.outputPackages ?? []).length),
            expandedRowRender: (task) => (
              <ManagedTable<WarehouseTallyOutputDisplayRow>
                recordDetail={false}
                rowKey="displayId"
                aria-label={`理货结果包裹 ${task.taskNo}`}
                dataSource={buildWarehouseTallyOutputDisplayRows(task.outputPackages ?? [])}
                size="small"
                pagination={false}
                columnSettings={false}
                resizableColumns={false}
                minimumScrollX={1320}
                scroll={{ x: 1320 }}
                columns={[
                  { title: '件序', dataIndex: 'pieceSequence', width: 80 },
                  { title: '结果标签', dataIndex: 'labelNo', width: 190, render: (value?: string) => value || '-' },
                  { title: '件数', dataIndex: 'packageCount', width: 70, align: 'right' },
                  {
                    title: '复测状态',
                    dataIndex: 'measurementStatus',
                    width: 110,
                    render: (value?: WarehouseTallyOutputDisplayRow['measurementStatus']) => value === 'PENDING_REMEASURE'
                      ? <Tag color="warning">待重新过机</Tag>
                      : <Tag color="success">已测量</Tag>
                  },
                  { title: '数据形态', dataIndex: 'legacyAggregate', width: 130, render: (legacy: boolean) => legacy ? <Tag>历史聚合展示</Tag> : <Tag color="blue">实体件记录</Tag> },
                  { title: '复测实重', dataIndex: 'weightKg', width: 100, align: 'right', render: (value: number, pkg) => pkg.legacyAggregate ? '聚合数据' : pkg.measurementStatus === 'PENDING_REMEASURE' ? '-' : `${value.toFixed(2)} kg` },
                  { title: '复测尺寸', width: 130, render: (_, pkg) => pkg.legacyAggregate ? '聚合数据' : pkg.measurementStatus === 'PENDING_REMEASURE' ? '-' : `${pkg.lengthCm}×${pkg.widthCm}×${pkg.heightCm}` },
                  { title: '体积 CBM', dataIndex: 'cbm', width: 100, align: 'right', render: (value: number, pkg) => pkg.legacyAggregate ? '聚合数据' : pkg.measurementStatus === 'PENDING_REMEASURE' ? '-' : `${value.toFixed(6)} CBM` },
                  { title: '计费重', dataIndex: 'chargeableWeightKg', width: 100, align: 'right', render: (value: number, pkg) => pkg.legacyAggregate ? '聚合数据' : pkg.measurementStatus === 'PENDING_REMEASURE' ? '-' : `${value.toFixed(2)} kg` },
                  { title: '数据来源', dataIndex: 'scanSource', width: 160, render: (value?: string) => value || '-' },
                  { title: '覆盖人/设备', dataIndex: 'measurementMatchedBy', width: 150, render: (value?: string) => value || '-' },
                  { title: '覆盖时间', dataIndex: 'measurementMatchedAt', width: 170, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' }
                ]}
              />
            )
          }}
          columns={[
            { title: '理货任务号', dataIndex: 'taskNo', width: 210 },
            { title: '来源组合号', dataIndex: 'sourceCombinedOrderNo', width: 210 },
            { title: '理货需求', dataIndex: 'tallyRequirement', width: 220, ellipsis: true },
            { title: '原始件数', dataIndex: 'packageCount', width: 90, align: 'right' },
            { title: '原始重量', dataIndex: 'originalWeightKg', width: 110, align: 'right', render: (value: number) => `${value.toFixed(2)} kg` },
            { title: '原始尺寸', width: 130, render: (_, task) => `${task.originalLengthCm}×${task.originalWidthCm}×${task.originalHeightCm}` },
            { title: '理货后件数', dataIndex: 'completedPackageCount', width: 110, align: 'right' },
            {
              title: '复测进度',
              key: 'measurementProgress',
              width: 120,
              render: (_, task) => {
                const outputs = buildWarehouseTallyOutputDisplayRows(task.outputPackages ?? []);
                const measured = outputs.filter((pkg) => pkg.measurementStatus !== 'PENDING_REMEASURE').length;
                return outputs.length
                  ? <Tag color={measured === outputs.length ? 'success' : 'warning'}>{measured}/{outputs.length}</Tag>
                  : '-';
              }
            },
            { title: '理货后重量', dataIndex: 'completedWeightKg', width: 120, align: 'right', render: (value?: number) => (value === undefined ? '-' : `${value.toFixed(2)} kg`) },
            { title: '理货后尺寸', width: 130, render: (_, task) => task.completedLengthCm ? `${task.completedLengthCm}×${task.completedWidthCm}×${task.completedHeightCm}` : '-' },
            { title: '5000/6000材积', width: 150, render: (_, task) => `${(task.completedVolumetricWeightKg5000 ?? 0).toFixed(2)} / ${(task.completedVolumetricWeightKg ?? 0).toFixed(2)}` },
            { title: '完成人', dataIndex: 'completedBy', width: 100, render: (value?: string) => value || '-' },
            { title: '完成时间', dataIndex: 'completedAt', width: 170, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
            { title: '标签号', dataIndex: 'labelNo', width: 180, render: (value?: string) => value || '-' },
            { title: '覆盖后包裹号', dataIndex: 'appliedPackageNo', width: 180, render: (value?: string) => value || '-' },
            { title: '扫描应用时间', dataIndex: 'labelAppliedAt', width: 170, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
            { title: '二维码内容', dataIndex: 'labelQrContent', width: 260, ellipsis: true, render: (value?: string) => value || '-' },
            {
              title: '标签状态',
              dataIndex: 'labelStatus',
              width: 180,
              render: (_, task) => (
                <Space size={4} wrap>
                  <Tag color={task.labelStatus === 'GENERATED' ? 'green' : 'default'}>{task.labelStatus === 'GENERATED' ? '已生成' : '待生成'}</Tag>
                  {task.labelPrintedAt ? <Tag color="blue">已打印</Tag> : null}
                  {task.labelDownloadedAt ? <Tag color="purple">已下载</Tag> : null}
                  {task.labelAppliedAt ? <Tag color="cyan">已应用</Tag> : null}
                </Space>
              )
            },
            {
              title: '标签操作',
              key: 'labelActions',
              width: 390,
              fixed: 'right',
              render: (_, task) => (
                <Space size={6}>
                  {canViewDetail ? <Button size="small" onClick={() => onViewTask(task)}>查看</Button> : null}
                  {canUpdateCount ? <Button size="small" danger onClick={() => onUpdateCount(task)}>反审核</Button> : null}
                  {canGenerateLabel || canPrintLabel || canDownloadLabel ? (
                    <>
                      {!task.labelNo && canGenerateLabel ? <Button size="small" onClick={() => onGenerateLabel(task)}>生成标签</Button> : null}
                      {task.labelNo && canPrintLabel ? <Button size="small" onClick={() => onPrintLabel(task)}>重新打印</Button> : null}
                      {canDownloadLabel ? <Button size="small" disabled={!task.labelNo} onClick={() => onDownloadLabel(task)}>下载</Button> : null}
                    </>
                  ) : null}
                </Space>
              )
            }
          ]}
        />
      ) : view === 'history' ? (
        <div className="warehouse-tally-history-workbench">
        <WarehouseCompletedTallyHistorySummary summaries={completedTallyArchiveSummaries} />
        <ManagedTable<WarehouseInboundPackage>
          recordDetail={{ title: '已完成理货归档详情' }}
          rowKey="id"
          dataSource={completedArchiveRows}
          size="small"
          pagination={tenRowTablePagination}
          columnSettingsPlacement="toolbar"
          scroll={{ x: 1450 }}
          columns={[
            { title: '原始在仓数据', dataIndex: 'combinedOrderNo', width: 210 },
            { title: '来源组合号', dataIndex: 'sourcePackageNo', width: 180, render: (_, record) => record.sourcePackageNo || record.combinedOrderNo },
            {
              title: '记录类型',
              key: 'archiveRecordKind',
              width: 130,
              render: (_, record) => resolveCompletedTallyArchiveRecordKind(record) === 'HISTORICAL_AGGREGATE_CORRECTION'
                ? <Tag color="gold">历史聚合纠正</Tag>
                : <Tag color="blue">原始来源</Tag>
            },
            { title: '原始件数', dataIndex: 'packageCount', width: 90, align: 'right' },
            { title: '原始重量', dataIndex: 'weightKg', width: 110, align: 'right', render: (value: number) => `${value.toFixed(2)} kg` },
            { title: '原始尺寸', width: 130, render: (_, record) => `${record.lengthCm}×${record.widthCm}×${record.heightCm}` },
            { title: '归档原因', dataIndex: 'archivedReason', width: 180, render: (value?: string) => value || '理货后标签扫描覆盖' },
            { title: '归档时间', dataIndex: 'archivedAt', width: 170, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
            { title: '对应理货任务', dataIndex: 'tallyTaskNo', width: 190, render: (value?: string) => value || '-' },
            {
              title: '理货人',
              key: 'tallyCompletedBy',
              width: 110,
              render: (_, record) => {
                const task = completedTaskByKey.get(record.tallyTaskId ?? '')
                  ?? completedTaskByKey.get(record.tallyTaskNo ?? '');
                return task?.completedBy || '-';
              }
            },
            { title: '覆盖后包裹号', dataIndex: 'archivedByPackageNo', width: 190, render: (value?: string) => value || '-' },
            { title: '状态', dataIndex: 'status', width: 120, render: () => <Tag color="default">理货归档</Tag> }
          ]}
        />
        </div>
      ) : (
        <div className="warehouse-tally-repeat-workbench">
          <div className="warehouse-tally-repeat-filters">
            <label className="warehouse-tally-repeat-filter">
              <span>统计范围</span>
              <select
                aria-label="重复理货统计范围"
                className="native-select"
                value={repeatFilterDraft.datePreset ?? '30D'}
                onChange={(event) => {
                  const datePreset = event.target.value as WarehouseTallyRepeatStatisticsQuery['datePreset'];
                  setRepeatFilterDraft((current) => ({ ...current, datePreset }));
                }}
              >
                <option value="30D">近 30 天</option>
                <option value="90D">近 90 天</option>
                <option value="ALL">全部时间</option>
              </select>
            </label>
            <label className="warehouse-tally-repeat-filter">
              <span>理货人</span>
              <select
                aria-label="重复理货理货人"
                className="native-select"
                value={repeatFilterDraft.operator ?? ''}
                onChange={(event) => setRepeatFilterDraft((current) => ({
                  ...current,
                  operator: event.target.value
                }))}
              >
                <option value="">全部理货人</option>
                {repeatOperatorOptions.map((operator) => (
                  <option key={operator} value={operator}>{operator}</option>
                ))}
              </select>
            </label>
            <label className="warehouse-tally-repeat-filter warehouse-tally-repeat-filter-keyword">
              <span>批次/客户</span>
              <Input
                aria-label="重复理货批次或客户"
                value={repeatFilterDraft.keyword ?? ''}
                placeholder="任务号、组合号、客户编号"
                onChange={(event) => setRepeatFilterDraft((current) => ({
                  ...current,
                  keyword: event.target.value
                }))}
                onPressEnter={onQueryRepeatStatistics}
              />
            </label>
            <Checkbox
              className="warehouse-tally-repeat-only"
              checked={repeatFilterDraft.onlyRepeated === true || repeatFilterDraft.onlyRepeated === 'true'}
              onChange={(event) => setRepeatFilterDraft((current) => ({
                ...current,
                onlyRepeated: event.target.checked
              }))}
            >
              仅看重复批次
            </Checkbox>
            <Space size={8} className="warehouse-tally-repeat-filter-actions">
              <Button type="primary" loading={repeatStatisticsLoading} onClick={onQueryRepeatStatistics}>查询</Button>
              <Button onClick={onResetRepeatStatistics}>重置</Button>
            </Space>
          </div>

          <div className="warehouse-tally-repeat-summary" aria-label="重复理货统计概览">
            {[
              ['完成批次', repeatStatistics.summary.completedBatchCount, '批'],
              ['重复批次', repeatStatistics.summary.repeatedBatchCount, '批'],
              ['额外理货', repeatStatistics.summary.extraTallyCount, '次'],
              ['重复率', repeatStatistics.summary.repeatRate, '%'],
              ['单批最高', repeatStatistics.summary.maxTallyCount, '次']
            ].map(([label, value, suffix]) => (
              <div className="warehouse-tally-repeat-summary-item" key={String(label)}>
                <Text type="secondary">{label}</Text>
                <strong>{value}<small>{suffix}</small></strong>
              </div>
            ))}
          </div>

          <div className="warehouse-tally-repeat-table-head">
            <Segmented
              size="small"
              aria-label="重复理货统计维度"
              value={repeatStatisticsView}
              onChange={(value) => onRepeatStatisticsViewChange(value as TallyRepeatStatisticsView)}
              options={[
                { label: '按理货人', value: 'operators' },
                { label: '重复批次明细', value: 'batches' }
              ]}
            />
            <Text type="secondary">
              {repeatStatistics.updatedAt ? `更新时间 ${formatBeijingDateTime(repeatStatistics.updatedAt)}` : '尚未加载'}
            </Text>
          </div>

          {repeatStatisticsView === 'operators' ? (
            <ManagedTable<WarehouseTallyRepeatOperatorSummary>
              rowKey="operator"
              aria-label="理货人重复理货统计"
              dataSource={repeatStatistics.operators}
              loading={repeatStatisticsLoading}
              size="small"
              pagination={tenRowTablePagination}
              columnSettings={false}
              recordDetail={false}
              minimumScrollX={980}
              scroll={{ x: 980 }}
              columns={[
                { title: '理货人', dataIndex: 'operator', width: 140 },
                { title: '完成理货', dataIndex: 'completedTaskCount', width: 110, align: 'right', render: (value: number) => `${value} 次` },
                { title: '参与批次', dataIndex: 'completedBatchCount', width: 110, align: 'right' },
                { title: '重复批次', dataIndex: 'repeatedBatchCount', width: 110, align: 'right', render: (value: number) => value ? <Tag color="warning">{value}</Tag> : '0' },
                { title: '重复理货', dataIndex: 'extraTallyCount', width: 110, align: 'right', render: (value: number) => `${value} 次` },
                { title: '重复率', dataIndex: 'repeatRate', width: 100, align: 'right', render: (value: number) => `${value.toFixed(1)}%` },
                { title: '单批最高', dataIndex: 'maxTallyCount', width: 110, align: 'right', render: (value: number) => `${value} 次` },
                { title: '最近完成', dataIndex: 'latestCompletedAt', width: 170, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
                { title: '最近重复', dataIndex: 'latestRepeatedAt', width: 170, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
                {
                  title: '操作',
                  key: 'actions',
                  width: 130,
                  fixed: 'right',
                  render: (_, record) => (
                    <Button size="small" disabled={!record.repeatedBatchCount} onClick={() => onShowOperatorRepeatBatches(record)}>
                      查看批次
                    </Button>
                  )
                }
              ]}
            />
          ) : (
            <ManagedTable<WarehouseTallyRepeatBatchSummary>
              rowKey="rootTallyTaskId"
              aria-label="重复理货批次明细"
              dataSource={repeatStatistics.batches}
              loading={repeatStatisticsLoading}
              size="small"
              pagination={tenRowTablePagination}
              columnSettings={false}
              recordDetail={false}
              minimumScrollX={1420}
              scroll={{ x: 1420 }}
              columns={[
                { title: '业务员', dataIndex: 'salesperson', width: 130 },
                { title: '理货人', dataIndex: 'tallyOperators', width: 150, render: (value: string[]) => value.join('、') || '-' },
                { title: '客户编号', dataIndex: 'customerCode', width: 120 },
                { title: '来源组合号', dataIndex: 'sourceCombinedOrderNo', width: 220 },
                { title: '首次任务号', dataIndex: 'rootTaskNo', width: 190 },
                { title: '理货次数', dataIndex: 'tallyCount', width: 100, align: 'right', render: (value: number) => <Tag color={value > 2 ? 'error' : 'warning'}>{value} 次</Tag> },
                { title: '首次完成', dataIndex: 'firstCompletedAt', width: 170, render: (value: string) => formatBeijingDateTime(value) },
                { title: '最近完成', dataIndex: 'lastCompletedAt', width: 170, render: (value: string) => formatBeijingDateTime(value) },
                { title: '最近需求', dataIndex: 'latestTallyRequirement', width: 220, ellipsis: true },
                { title: '最近完成人', dataIndex: 'latestCompletedBy', width: 120, render: (value?: string) => value || '-' },
                {
                  title: '操作',
                  key: 'actions',
                  width: 140,
                  fixed: 'right',
                  render: (_, record) => canViewDetail
                    ? <Button size="small" onClick={() => onOpenRepeatBatchHistory(record)}>查看理货链路</Button>
                    : null
                }
              ]}
            />
          )}
        </div>
      )}
    </Card>
  );
}
