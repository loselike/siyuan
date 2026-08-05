import type { ChangeEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Activity, FileInput, Sparkles, Truck, Upload } from 'lucide-react';
import { Alert, Button, Card, Col, Row, Space, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { shipmentStatusLabels, type BulkTrackingImportResult, type BulkTrackingImportRow, type CarrierTaskSummary, type Shipment } from '@siyuan/shared';
import { ModuleSubWorkspace, type ModuleSubNavItem } from '../shared/ModuleSubWorkspace';
import { AppActionGroup, AppPage, AppPageHeader, ManagedDualViewTable, ManagedMatrixCell, ManagedMatrixDateTime, ManagedTable, MetricCard, renderNoticeBar, tenRowTablePagination, type ManagedTableColumns } from '../shared/ui';
import { formatBeijingDateTime } from '../shared/format';
import { resolveShipmentOutboundOrderNo } from '../shared/shipmentOrderNo';
import { formatTrackingImportDate } from './bulkImport';

const { Text } = Typography;

const trackingPageConfig = {
  title: '轨迹监控中心',
  description: '集中处理外部承运商轨迹录入、同步、未上网和长时间未更新；内部订单节点请在运单内部轨迹查看。'
};

function formatLatestTrackingTime(shipment: Shipment) {
  return shipment.latestTrackingUpdatedAt ? formatBeijingDateTime(shipment.latestTrackingUpdatedAt) : formatBeijingDateTime(shipment.createdAt);
}

function extractTrackingLocation(value?: string) {
  const matched = String(value ?? '').match(/（([^（）]+)）$/);
  return matched?.[1];
}

export function TrackingPage({
  shipments,
  tasks,
  notice,
  permissions,
  bulkTrackingFileName,
  bulkTrackingRows,
  bulkTrackingResult,
  bulkTrackingError,
  bulkTrackingImporting = false,
  onBulkTrackingFileChange,
  onConfirmBulkTrackingImport,
  onRunTask,
  onRetryTask,
  onViewShipment
}: {
  shipments: Shipment[];
  tasks: CarrierTaskSummary[];
  notice: string | null;
  permissions: string[];
  bulkTrackingFileName: string | null;
  bulkTrackingRows: BulkTrackingImportRow[];
  bulkTrackingResult: BulkTrackingImportResult | null;
  bulkTrackingError: string | null;
  bulkTrackingImporting?: boolean;
  onBulkTrackingFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onConfirmBulkTrackingImport: () => Promise<void>;
  onRunTask: (task: CarrierTaskSummary) => Promise<void>;
  onRetryTask: (task: CarrierTaskSummary) => Promise<void>;
  onViewShipment: (shipment: Shipment) => void;
}) {
  const config = trackingPageConfig;
  const can = (permission: string) => permissions.includes(permission);
  const canTaskView = can('tracking:carrier-task:view');
  const canExternalView = can('tracking:external:view');
  const canUpload = can('tracking:external:import-upload');
  const canPreview = can('tracking:external:import-preview');
  const canConfirmBulkImport = can('tracking:external:import-confirm') && can('tracking:external:overwrite');
  const staleCount = shipments.filter((shipment) => shipment.trackingStaleDays >= 5).length;
  const [activeTrackingSection, setActiveTrackingSection] = useState('latest');
  const trackingSubItems: ModuleSubNavItem[] = [
    ...(canTaskView ? [{ key: 'tasks', label: '承运商任务', description: '轨迹同步任务' }] : []),
    ...(canExternalView ? [{ key: 'latest', label: '外部物流轨迹', description: '承运商运输节点概览' }] : [])
  ];
  useEffect(() => {
    if (!trackingSubItems.some((item) => item.key === activeTrackingSection)) {
      setActiveTrackingSection('tasks');
    }
  }, [activeTrackingSection, trackingSubItems]);
  const renderTrackingShipmentNo = (systemOrderNo: string, shipmentId?: string) => {
    const shipment = shipments.find((item) => item.id === shipmentId || item.systemOrderNo === systemOrderNo);
    return (
      <Space direction="vertical" size={0}>
        <Space size={4}>
          {shipment ? (
            <Button className="order-number-link" type="link" size="small" onClick={() => onViewShipment(shipment)}>
              {systemOrderNo}
            </Button>
          ) : (
            <Text>{systemOrderNo}</Text>
          )}
          <Text copyable={{ text: systemOrderNo }} />
        </Space>
        <Text type="secondary">{shipment ? '点击查看详情' : '未匹配订单'}</Text>
      </Space>
    );
  };
  const taskColumns: ColumnsType<CarrierTaskSummary> = [
    { key: 'systemOrderNo', title: '出货单号', dataIndex: 'systemOrderNo', width: 190, render: (_: string, task) => renderTrackingShipmentNo(resolveShipmentOutboundOrderNo(task), task.shipmentId) },
    { key: 'customerName', title: '客户', dataIndex: 'customerName', width: 170 },
    { key: 'carrier', title: '承运商', dataIndex: 'carrier', width: 90 },
    { key: 'transferNo', title: '转单号', dataIndex: 'transferNo', width: 180 },
    {
      key: 'status',
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: CarrierTaskSummary['status']) => (
        <Tag color={status === 'SUCCESS' ? 'green' : status === 'FAILED' ? 'red' : 'gold'}>
          {status === 'SUCCESS' ? '成功' : status === 'FAILED' ? '失败' : '待执行'}
        </Tag>
      )
    },
    { key: 'attempts', title: '尝试次数', dataIndex: 'attempts', width: 90 },
    ...(can('tracking:carrier-task:error-view') ? [{ key: 'lastError', title: '错误信息', dataIndex: 'lastError', width: 260, render: (value?: string) => value ?? '-' }] : []),
    {
      key: 'action',
      title: '操作',
      width: 160,
      render: (_, task) => (
        <Space>
          {task.status === 'PENDING' && can('tracking:carrier-task:run') ? (
            <Button size="small" onClick={() => void onRunTask(task)}>
              同步轨迹
            </Button>
          ) : null}
          {task.status === 'FAILED' && can('tracking:carrier-task:retry') ? (
            <Button size="small" onClick={() => void onRetryTask(task)}>
              重试
            </Button>
          ) : null}
        </Space>
      )
    }
  ];
  const allLatestColumns: ColumnsType<Shipment> = [
    {
      key: 'latestTrackingUpdatedAt',
      title: '更新时间',
      width: 170,
      render: (_, shipment) => formatLatestTrackingTime(shipment)
    },
    { key: 'systemOrderNo', title: '出货单号', dataIndex: 'systemOrderNo', width: 190, render: (_: string, shipment) => renderTrackingShipmentNo(resolveShipmentOutboundOrderNo(shipment), shipment.id) },
    { key: 'customerName', title: '客户', dataIndex: 'customerName', width: 180 },
    { key: 'transferNo', title: '转单号', dataIndex: 'transferNo', width: 170, render: (value?: string) => value || '-' },
    { key: 'latestTracking', title: '最新物流轨迹', dataIndex: 'latestTracking', width: 320, render: (value?: string) => value || '-' },
    { key: 'location', title: '地点', width: 110, render: (_, shipment) => extractTrackingLocation(shipment.latestTracking) || '-' },
    { key: 'status', title: '状态', dataIndex: 'status', width: 120, render: (status: Shipment['status']) => <Tag>{shipmentStatusLabels[status] ?? status}</Tag> },
    {
      key: 'trackingStaleDays',
      title: '未更新天数',
      dataIndex: 'trackingStaleDays',
      width: 120,
      render: (value: number) => <Tag color={value >= 5 ? 'orange' : 'green'}>{value ? `${value} 天` : '今日更新'}</Tag>
    },
    {
      key: 'action',
      title: '操作',
      width: 110,
      fixed: 'right',
      render: (_: unknown, shipment: Shipment) => <Button size="small" onClick={() => onViewShipment(shipment)}>查看详情</Button>
    }
  ];
  const latestColumns = allLatestColumns.filter((column) => column.key !== 'latestTracking' || can('tracking:external:latest-view'))
    .filter((column) => column.key !== 'trackingStaleDays' || can('tracking:external:stale-days-view'))
    .filter((column) => column.key !== 'action' || can('tracking:external:detail'));
  const taskActionColumn = taskColumns.find((column) => column.key === 'action');
  const taskMatrixColumns: ManagedTableColumns<CarrierTaskSummary> = [
    {
      key: 'matrixShipment',
      title: '运单信息',
      width: 250,
      className: 'managed-matrix-group-primary',
      render: (_: unknown, task: CarrierTaskSummary) => (
        <ManagedMatrixCell
          labelWidth={54}
          fields={[
            { key: 'systemOrderNo', label: '出货单号', value: renderTrackingShipmentNo(resolveShipmentOutboundOrderNo(task), task.shipmentId) },
            { key: 'customerName', label: '客户', value: task.customerName || '-', title: task.customerName, wrap: true }
          ]}
        />
      )
    },
    {
      key: 'matrixCarrier',
      title: '转运信息',
      width: 200,
      render: (_: unknown, task: CarrierTaskSummary) => (
        <ManagedMatrixCell
          labelWidth={48}
          fields={[
            { key: 'carrier', label: '承运商', value: task.carrier || '-' },
            { key: 'transferNo', label: '转单号', value: task.transferNo || '-', title: task.transferNo }
          ]}
        />
      )
    },
    {
      key: 'matrixExecution',
      title: '执行状态',
      width: 150,
      render: (_: unknown, task: CarrierTaskSummary) => (
        <ManagedMatrixCell
          labelWidth={54}
          fields={[
            {
              key: 'status',
              label: '状态',
              value: (
                <Tag color={task.status === 'SUCCESS' ? 'green' : task.status === 'FAILED' ? 'red' : 'gold'}>
                  {task.status === 'SUCCESS' ? '成功' : task.status === 'FAILED' ? '失败' : '待执行'}
                </Tag>
              )
            },
            { key: 'attempts', label: '尝试次数', value: task.attempts }
          ]}
        />
      )
    },
    ...(can('tracking:carrier-task:error-view') ? [{
      key: 'matrixException',
      title: '异常信息',
      width: 230,
      render: (_: unknown, task: CarrierTaskSummary) => (
        <ManagedMatrixCell
          labelWidth={54}
          fields={[
            { key: 'lastError', label: '错误信息', value: task.lastError || '暂无异常', title: task.lastError, wrap: true }
          ]}
        />
      )
    }] : []),
    ...(taskActionColumn ? [{ ...taskActionColumn, title: '操作', width: 140, fixed: 'right' as const }] : [])
  ];
  const latestActionColumn = latestColumns.find((column) => column.key === 'action');
  const latestMatrixColumns: ManagedTableColumns<Shipment> = [
    {
      key: 'matrixUpdated',
      title: '更新信息',
      width: 155,
      className: 'managed-matrix-group-primary',
      render: (_: unknown, shipment: Shipment) => (
        <ManagedMatrixCell
          labelWidth={54}
          fields={[
            { key: 'latestTrackingUpdatedAt', label: '更新时间', value: <ManagedMatrixDateTime value={formatLatestTrackingTime(shipment)} /> },
            can('tracking:external:stale-days-view') ? {
              key: 'trackingStaleDays',
              label: '未更新',
              value: <Tag color={shipment.trackingStaleDays >= 5 ? 'orange' : 'green'}>{shipment.trackingStaleDays ? `${shipment.trackingStaleDays} 天` : '今日更新'}</Tag>
            } : null
          ]}
        />
      )
    },
    {
      key: 'matrixShipment',
      title: '运单信息',
      width: 240,
      render: (_: unknown, shipment: Shipment) => (
        <ManagedMatrixCell
          labelWidth={54}
          fields={[
            { key: 'systemOrderNo', label: '出货单号', value: renderTrackingShipmentNo(resolveShipmentOutboundOrderNo(shipment), shipment.id) },
            { key: 'customerName', label: '客户', value: shipment.customerName || '-', title: shipment.customerName, wrap: true },
            { key: 'transferNo', label: '转单号', value: shipment.transferNo || '-', title: shipment.transferNo }
          ]}
        />
      )
    },
    {
      key: 'matrixTracking',
      title: '轨迹信息',
      width: 300,
      render: (_: unknown, shipment: Shipment) => (
        <ManagedMatrixCell
          labelWidth={66}
          fields={[
            can('tracking:external:latest-view') ? { key: 'latestTracking', label: '最新轨迹', value: shipment.latestTracking || '-', title: shipment.latestTracking, wrap: true } : null,
            { key: 'location', label: '地点', value: extractTrackingLocation(shipment.latestTracking) || '-' }
          ]}
        />
      )
    },
    {
      key: 'matrixStatus',
      title: '履约状态',
      width: 140,
      render: (_: unknown, shipment: Shipment) => (
        <ManagedMatrixCell
          labelWidth={48}
          fields={[
            { key: 'status', label: '状态', value: <Tag>{shipmentStatusLabels[shipment.status] ?? shipment.status}</Tag> }
          ]}
        />
      )
    },
    ...(latestActionColumn ? [{ ...latestActionColumn, title: '操作', width: 110, fixed: 'right' as const }] : [])
  ];
  const previewColumns: ColumnsType<NonNullable<BulkTrackingImportResult['shipmentPreviews']>[number]> = [
    { key: 'systemOrderNo', title: '出货单号', dataIndex: 'systemOrderNo', width: 170 },
    { key: 'matchedOrderNo', title: '匹配单号', dataIndex: 'matchedOrderNo', width: 160 },
    { key: 'trackingCount', title: '导入行数', dataIndex: 'trackingCount', width: 100 },
    { key: 'latestTrackingDate', title: '覆盖更新时间', dataIndex: 'latestTrackingDate', width: 170, render: (value: string | number) => formatTrackingImportDate(value) },
    { key: 'latestTracking', title: '覆盖后最新物流轨迹', dataIndex: 'latestTracking', width: 260 }
  ];
  const rowColumns: ColumnsType<BulkTrackingUpdatePreview> = [
    { key: 'rowNumber', title: '行号', dataIndex: 'rowNumber', width: 70 },
    { key: 'customerOrderNo', title: '出货单号', dataIndex: 'customerOrderNo', width: 160 },
    { key: 'trackingDate', title: '轨迹日期时间', dataIndex: 'trackingDate', width: 170, render: (value: string | number) => formatTrackingImportDate(value) },
    { key: 'location', title: '地点', dataIndex: 'location', width: 120, render: (value?: string) => value || '-' },
    { key: 'latestTracking', title: '轨迹信息', dataIndex: 'latestTracking', width: 260 }
  ];
  const errorColumns: ColumnsType<NonNullable<BulkTrackingImportResult['errorRows']>[number]> = [
    { key: 'rowNumber', title: '行号', dataIndex: 'rowNumber', width: 70 },
    { key: 'customerOrderNo', title: '出货单号', dataIndex: 'customerOrderNo', width: 160, render: (value?: string) => value || '-' },
    { key: 'reason', title: '错误原因', dataIndex: 'reason', width: 260 }
  ];
  const hasBulkImportPreview = Boolean(bulkTrackingResult?.shipmentPreviews?.length);

  return (
    <AppPage>
      <AppPageHeader
        title={config.title}
        description={config.description}
        actions={
          <AppActionGroup>
            {canTaskView ? <Button type="primary" icon={<Activity size={16} />}>承运商任务</Button> : null}
          </AppActionGroup>
        }
      />

      {renderNoticeBar(notice)}

      <Row gutter={[16, 16]}>
        {canTaskView ? <Col xs={24} md={8}>
          <MetricCard icon={<Activity />} title="承运商任务" value={tasks.length} extra="手动同步轨迹" />
        </Col> : null}
        <Col xs={24} md={8}>
          <MetricCard icon={<Truck />} title="未更新" value={staleCount} extra="超过 5 天无新轨迹" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard icon={<Sparkles />} title="硅基流动" value="AI" extra="轨迹超时解释" />
        </Col>
      </Row>

      <ModuleSubWorkspace items={trackingSubItems} activeKey={activeTrackingSection} onChange={setActiveTrackingSection}>
      {activeTrackingSection === 'tasks' ? (
      <Card title="承运商任务">
        <ManagedDualViewTable
          viewStorageKey="sunny.tracking.tasks.view-v1"
          viewAriaLabel="承运商任务表格视图"
          defaultView="matrix"
          shellClassName="tracking-tasks-dual-table"
          views={{
            matrix: {
              label: '矩阵视图',
              columns: taskMatrixColumns,
              tableProps: {
                className: 'tracking-tasks-matrix-table',
                minimumScrollX: 0,
                tableLayout: 'fixed',
                recordDetail: { title: '轨迹任务详情', columns: taskColumns },
                columnSettings: can('tracking:carrier-task:column-setting') ? {
                  storageKey: 'sunny.tracking.tasks.matrix-columns-v1',
                  title: '轨迹任务矩阵列设置',
                  lockedKeys: ['action']
                } : false
              }
            },
            ledger: {
              label: '精密台账模式',
              columns: taskColumns,
              tableProps: {
                className: 'tracking-tasks-ledger-table',
                minimumScrollX: 1180,
                recordDetail: { title: '轨迹任务详情' },
                columnSettings: can('tracking:carrier-task:column-setting') ? {
                  storageKey: 'siyuan-tracking-task-hidden-columns',
                  title: '轨迹任务列设置',
                  labels: {
                    systemOrderNo: '出货单号',
                    customerName: '客户',
                    carrier: '承运商',
                    transferNo: '转单号',
                    status: '状态',
                    attempts: '尝试次数',
                    lastError: '错误信息',
                    action: '操作'
                  }
                } : false
              }
            }
          }}
          rowKey="id"
          size="small"
          pagination={tenRowTablePagination}
          dataSource={tasks}
        />
      </Card>
      ) : null}

      {activeTrackingSection === 'latest' ? (
      <Card
        className="module-card tracking-latest-card"
        title="外部物流轨迹"
        extra={canUpload ? (
          <Space>
            <label className="ant-btn ant-btn-default ant-btn-sm" htmlFor="bulk-tracking-upload" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <Upload size={14} />
              <span>导入轨迹</span>
            </label>
            <input
              id="bulk-tracking-upload"
              aria-label="上传轨迹表"
              style={{ display: 'none' }}
              type="file"
              accept=".xls,.xlsx"
              onChange={onBulkTrackingFileChange}
            />
          </Space>
        ) : null}
      >
        <Space direction="vertical" size={12} className="full-width">
          <ManagedDualViewTable
            viewStorageKey="sunny.tracking.latest.view-v1"
            viewAriaLabel="外部物流轨迹表格视图"
            defaultView="matrix"
            shellClassName="tracking-latest-dual-table"
            views={{
              matrix: {
                label: '矩阵视图',
                columns: latestMatrixColumns,
                tableProps: {
                  className: 'tracking-latest-matrix-table',
                  minimumScrollX: 0,
                  tableLayout: 'fixed',
                  recordDetail: { title: '最新轨迹详情', columns: latestColumns },
                  columnSettings: can('tracking:external:column-setting') ? {
                    storageKey: 'sunny.tracking.latest.matrix-columns-v1',
                    title: '外部物流轨迹矩阵列设置',
                    lockedKeys: ['action']
                  } : false
                }
              },
              ledger: {
                label: '精密台账模式',
                columns: latestColumns,
                tableProps: {
                  className: 'tracking-latest-ledger-table',
                  minimumScrollX: 1380,
                  recordDetail: { title: '最新轨迹详情' },
                  columnSettings: can('tracking:external:column-setting') ? {
                    storageKey: 'siyuan-tracking-latest-hidden-columns',
                    title: '外部物流轨迹列设置',
                    labels: {
                      latestTrackingUpdatedAt: '更新时间',
                      systemOrderNo: '出货单号',
                      customerName: '客户',
                      transferNo: '转单号',
                      latestTracking: '最新物流轨迹',
                      location: '地点',
                      status: '状态',
                      trackingStaleDays: '未更新天数',
                      action: '操作'
                    },
                    lockedKeys: ['action']
                  } : false
                }
              }
            }}
            rowKey="id"
            size="small"
            dataSource={shipments}
            pagination={tenRowTablePagination}
          />
          {canPreview && (bulkTrackingFileName || bulkTrackingError || bulkTrackingResult) ? (
            <Card size="small" className="tracking-import-preview-card" title="导入轨迹预览">
              <Space direction="vertical" size={12} className="full-width">
                {bulkTrackingFileName ? <Text type="secondary">{bulkTrackingFileName}</Text> : null}
                {bulkTrackingError ? <Alert type="error" showIcon message={bulkTrackingError} /> : null}
                {bulkTrackingResult ? (
                  <>
                    <Space wrap>
                      <Tag color="default">原始行数 {bulkTrackingResult.rawRowCount ?? bulkTrackingRows.length}</Tag>
                      <Tag color="blue">可覆盖运单数 {bulkTrackingResult.matchedShipmentCount ?? bulkTrackingResult.shipmentPreviews?.length ?? 0}</Tag>
                      {can('tracking:external:unmatched-view') ? <Tag color={bulkTrackingResult.unmatchedOrderNos.length ? 'orange' : 'green'}>未匹配 {bulkTrackingResult.unmatchedOrderNos.length}</Tag> : null}
                      {can('tracking:external:import-error-view') ? <Tag color={bulkTrackingResult.errorRows?.length ? 'red' : 'green'}>错误行 {bulkTrackingResult.errorRows?.length ?? 0}</Tag> : null}
                      <Tag color={bulkTrackingResult.conflictOrderNos?.length ? 'red' : 'green'}>冲突单号 {bulkTrackingResult.conflictOrderNos?.length ?? 0}</Tag>
                    </Space>
                    {can('tracking:external:unmatched-view') && bulkTrackingResult.unmatchedOrderNos.length ? <Text type="secondary">未匹配出货单号：{bulkTrackingResult.unmatchedOrderNos.join('、')}</Text> : null}
                    {bulkTrackingResult.conflictOrderNos?.length ? <Text type="danger">冲突单号：{bulkTrackingResult.conflictOrderNos.join('、')}</Text> : null}
                    <ManagedTable
                      rowKey="shipmentId"
                      size="small"
                      columns={previewColumns}
                      dataSource={bulkTrackingResult.shipmentPreviews ?? []}
                      pagination={tenRowTablePagination}
                      minimumScrollX={870}
                      columnSettings={false}
                      recordDetail={false}
                    />
                    <ManagedTable
                      rowKey={(row) => `${row.shipmentId}-${row.rowNumber ?? row.trackingDate}-${row.latestTracking}`}
                      size="small"
                      columns={rowColumns}
                      dataSource={bulkTrackingResult.updates as BulkTrackingUpdatePreview[]}
                      pagination={tenRowTablePagination}
                      minimumScrollX={780}
                      columnSettings={false}
                      recordDetail={false}
                    />
                    {can('tracking:external:import-error-view') && bulkTrackingResult.errorRows?.length ? (
                      <ManagedTable
                        rowKey={(row) => `${row.rowNumber}-${row.reason}`}
                        size="small"
                        columns={errorColumns}
                        dataSource={bulkTrackingResult.errorRows}
                        pagination={tenRowTablePagination}
                        minimumScrollX={500}
                        columnSettings={false}
                        recordDetail={false}
                      />
                    ) : null}
                    <Button
                      type="primary"
                      icon={<FileInput size={16} />}
                      loading={bulkTrackingImporting}
                      disabled={!canConfirmBulkImport || !hasBulkImportPreview}
                      onClick={() => void onConfirmBulkTrackingImport()}
                    >
                      确认导入
                    </Button>
                  </>
                ) : null}
              </Space>
            </Card>
          ) : null}
        </Space>
      </Card>
      ) : null}
      </ModuleSubWorkspace>
    </AppPage>
  );
}

type BulkTrackingUpdatePreview = BulkTrackingImportResult['updates'][number];
