import { AlertTriangle, Boxes, Send } from 'lucide-react';
import { Button, Card, Flex, Space, Statistic, Typography } from 'antd';
import './WarehouseDashboardPanel.css';

const { Text } = Typography;

export type WarehouseDashboardSection = 'consolidation' | 'queue' | 'today';

type WarehouseDashboardTotals = {
  waitingDispatchTickets: number;
  pendingTallyTickets: number;
  exceptionTickets: number;
};

type WarehouseDashboardQueue = {
  key: WarehouseDashboardSection;
  label: string;
  value: number;
  helper: string;
  actionLabel: string;
  icon: typeof Boxes;
  tone: 'normal' | 'warning';
};

export function WarehouseDashboardPanel({
  totals,
  visibleSections,
  onOpenSection
}: {
  totals: WarehouseDashboardTotals;
  visibleSections: ReadonlySet<string>;
  onOpenSection: (section: WarehouseDashboardSection) => void;
}) {
  const queues: WarehouseDashboardQueue[] = [
    {
      key: 'queue',
      label: '待出库',
      value: totals.waitingDispatchTickets,
      helper: '渠道确认后等待仓库处理',
      actionLabel: '查看待出库',
      icon: Send,
      tone: 'normal'
    },
    {
      key: 'consolidation',
      label: '待理货',
      value: totals.pendingTallyTickets,
      helper: '分批到仓待合并',
      actionLabel: '查看待理货',
      icon: Boxes,
      tone: 'normal'
    },
    {
      key: 'today',
      label: '收货异常',
      value: totals.exceptionTickets,
      helper: '件重尺或资料待复核',
      actionLabel: '查看今日收货',
      icon: AlertTriangle,
      tone: totals.exceptionTickets > 0 ? 'warning' : 'normal'
    }
  ];

  return (
    <section className="warehouse-dashboard-panel" aria-label="仓库待办总览">
      <Flex justify="space-between" align="center" gap={12} wrap className="warehouse-dashboard-heading">
        <div>
          <Text strong>当前作业队列</Text>
          <Text type="secondary" className="warehouse-dashboard-subtitle">数量沿用各作业区当前汇总</Text>
        </div>
        <Text type="secondary">选择队列后进入原作业页面</Text>
      </Flex>

      <div className="warehouse-dashboard-queue-grid">
        {queues.map((queue) => {
          const Icon = queue.icon;
          const canOpen = visibleSections.has(queue.key);
          return (
            <Card
              key={queue.key}
              className={`warehouse-dashboard-queue-card warehouse-dashboard-queue-card-${queue.tone}`}
              size="small"
            >
              <Flex justify="space-between" align="start" gap={16}>
                <Space align="start" size={12}>
                  <span className="warehouse-dashboard-queue-icon" aria-hidden="true"><Icon size={18} /></span>
                  <div>
                    <Statistic title={queue.label} value={queue.value} suffix="票" />
                    <Text type="secondary">{queue.helper}</Text>
                  </div>
                </Space>
                {canOpen ? (
                  <Button size="small" onClick={() => onOpenSection(queue.key)}>{queue.actionLabel}</Button>
                ) : null}
              </Flex>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
