import type { ReactNode } from 'react';
import { useState } from 'react';
import { Activity, Sparkles, Truck } from 'lucide-react';
import { Alert, Button, Card, Col, Row, Space, Statistic, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { shipmentStatusLabels, type CarrierTaskSummary, type Shipment } from '@siyuan/shared';
import { ModuleSubWorkspace, type ModuleSubNavItem } from '../shared/ModuleSubWorkspace';
import { AppActionGroup, AppPage, AppPageHeader, ManagedTable, MetricCard, renderNoticeBar, tenRowTablePagination } from '../shared/ui';

const { Text } = Typography;

const trackingPageConfig = {
  title: '轨迹监控中心',
  description: '集中处理轨迹录入、轨迹同步、未上网、长时间未更新和客户可见轨迹。'
};



export function TrackingPage({
  shipments,
  tasks,
  notice,
  onRunTask,
  onRetryTask,
  onViewShipment
}: {
  shipments: Shipment[];
  tasks: CarrierTaskSummary[];
  notice: string | null;
  onRunTask: (task: CarrierTaskSummary) => Promise<void>;
  onRetryTask: (task: CarrierTaskSummary) => Promise<void>;
  onViewShipment: (shipment: Shipment) => void;
}) {
  const config = trackingPageConfig;
  const staleCount = shipments.filter((shipment) => shipment.trackingStaleDays >= 5).length;
  const [activeTrackingSection, setActiveTrackingSection] = useState('tasks');
  const trackingSubItems: ModuleSubNavItem[] = [
    { key: 'tasks', label: '承运商任务', description: '轨迹同步任务' },
    { key: 'latest', label: '最新轨迹', description: '运单轨迹概览' }
  ];
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
    { key: 'systemOrderNo', title: '系统单号', dataIndex: 'systemOrderNo', width: 190, render: (value: string, task) => renderTrackingShipmentNo(value, task.shipmentId) },
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
    { key: 'lastError', title: '错误信息', dataIndex: 'lastError', width: 260, render: (value?: string) => value ?? '-' },
    {
      key: 'action',
      title: '操作',
      width: 160,
      render: (_, task) => (
        <Space>
          {task.status === 'PENDING' ? (
            <Button size="small" onClick={() => void onRunTask(task)}>
              同步轨迹
            </Button>
          ) : null}
          {task.status === 'FAILED' ? (
            <Button size="small" onClick={() => void onRetryTask(task)}>
              重试
            </Button>
          ) : null}
        </Space>
      )
    }
  ];

  return (
    <AppPage>
      <AppPageHeader
        title={config.title}
        description={config.description}
        actions={
          <AppActionGroup>
            <Button type="primary" icon={<Activity size={16} />}>承运商任务</Button>
          </AppActionGroup>
        }
      />

      {renderNoticeBar(notice)}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <MetricCard icon={<Activity />} title="承运商任务" value={tasks.length} extra="手动同步轨迹" />
        </Col>
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
        <ManagedTable
          rowKey="id"
          size="small"
          pagination={tenRowTablePagination}
          columns={taskColumns}
          dataSource={tasks}
          minimumScrollX={1180}
          columnSettings={{
            storageKey: 'siyuan-tracking-task-hidden-columns',
            title: '轨迹任务列设置',
            labels: {
              systemOrderNo: '系统单号',
              customerName: '客户',
              carrier: '承运商',
              transferNo: '转单号',
              status: '状态',
              attempts: '尝试次数',
              lastError: '错误信息',
              action: '操作'
            }
          }}
        />
      </Card>
      ) : null}

      {activeTrackingSection === 'latest' ? (
      <Card className="module-card" title="最新轨迹">
        <Space direction="vertical" className="ai-list">
          {shipments.map((shipment) => (
            <Alert
              key={shipment.id}
              type={shipment.trackingStaleDays >= 5 ? 'warning' : 'info'}
              showIcon
              message={shipment.latestTracking}
              description={renderTrackingShipmentNo(shipment.systemOrderNo, shipment.id)}
            />
          ))}
        </Space>
      </Card>
      ) : null}
      </ModuleSubWorkspace>
    </AppPage>
  );
}
