import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Activity, Bot, ClipboardCheck, FileInput, Sparkles } from 'lucide-react';
import { Alert, Button, Card, Col, Flex, Row, Space, Statistic, Tag, Typography } from 'antd';
import type { ProblemTicketSummary } from '@siyuan/shared';
import { ModuleSubWorkspace, type ModuleSubNavItem } from '../shared/ModuleSubWorkspace';
import { AppActionGroup, AppPageHeader, ManagedTable, MetricCard, renderNoticeBar, tenRowTablePagination } from '../shared/ui';
import { formatBeijingDateTime } from '../shared/format';

const { Text } = Typography;

export interface LowFrequencyModuleConfig {
  title: string;
  description: string;
  capabilities: string[];
  aiEnhancements: string[];
  siliconFlowScenarios: string[];
}



function LowFrequencyModulePage({
  config,
  tickets,
  notice,
  onAiAssist,
  aiLoading
}: {
  config?: LowFrequencyModuleConfig;
  tickets: ProblemTicketSummary[];
  notice?: string | null;
  onAiAssist: (input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }) => Promise<void>;
  aiLoading: boolean;
}) {
  const moduleSubItems = useMemo<ModuleSubNavItem[]>(() => {
    if (!config) return [];
    return [
      { key: 'records', label: '业务数据', description: '业务对象列表' },
      { key: 'queue', label: '模块待办', description: '待处理事项' },
      { key: 'ai', label: 'AI 赋能', description: '建议与风险' },
      { key: 'actions', label: '快捷动作', description: '常用操作' }
    ];
  }, [config]);
  const [activeSection, setActiveSection] = useState(() => moduleSubItems[0]?.key ?? 'records');

  useEffect(() => {
    if (moduleSubItems.length && !moduleSubItems.some((item) => item.key === activeSection)) {
      setActiveSection(moduleSubItems[0].key);
    }
  }, [activeSection, moduleSubItems]);

  if (!config) return null;

  const openTickets = tickets.filter((ticket) => ticket.status !== 'CLOSED');
  const closedTickets = tickets.filter((ticket) => ticket.status === 'CLOSED');
  const customerVisibleTickets = tickets.filter((ticket) => ticket.customerVisible);
  const stats = [
    { label: '待处理', value: openTickets.length, helper: '当前未关闭问题件' },
    { label: '已关闭', value: closedTickets.length, helper: '已完成处理的问题件' },
    { label: '客户可见', value: customerVisibleTickets.length, helper: '客户可跟进的问题件' }
  ];
  const records = tickets.map((ticket) => ({
    primary: ticket.systemOrderNo,
    secondary: `${ticket.customerName} / ${ticket.reason}`,
    metric: formatBeijingDateTime(ticket.createdAt),
    status: ticket.status === 'CLOSED' ? '已关闭' : '待处理'
  }));
  const queue = openTickets.map((ticket) => ({
    item: `${ticket.systemOrderNo} ${ticket.reason}`,
    owner: ticket.customerVisible ? '客服跟进' : '内部处理',
    status: '待处理'
  }));

  return (
    <>
      <AppPageHeader
        title={config.title}
        description={<><span>{config.description}</span><div><Tag color="blue">硅基流动</Tag></div></>}
        actions={(
          <AppActionGroup>
            <Button icon={<FileInput size={16} />}>导入</Button>
            <Button icon={<ClipboardCheck size={16} />}>导出</Button>
            <Button
              type="primary"
              icon={<Sparkles size={16} />}
              loading={aiLoading}
              onClick={() =>
                onAiAssist({
                  module: config.title,
                  task: 'AI 辅助处理',
                  prompt: `请围绕${config.title}的核心能力，输出当前优先处理事项、风险说明和可发给客户或内部同事的沟通建议。`,
                  context: {
                    stats,
                    records,
                    queue,
                    scenarios: config.siliconFlowScenarios
                  }
                })
              }
            >
              AI 辅助处理
            </Button>
          </AppActionGroup>
        )}
      />

      {renderNoticeBar(notice)}

      <Row gutter={[16, 16]}>
        {stats.map((stat) => (
          <Col xs={24} md={8} key={stat.label}>
            <MetricCard icon={<Activity />} title={stat.label} value={stat.value} extra={stat.helper} />
          </Col>
        ))}
      </Row>

      <ModuleSubWorkspace items={moduleSubItems} activeKey={activeSection} onChange={setActiveSection}>
        <Row gutter={[16, 16]} className="main-grid">
          <Col xs={24}>
            {activeSection === 'records' ? (
              <Card className="module-grid" title="业务数据">
                <ManagedTable
                  recordDetail={{ title: '问题件业务详情' }}
                  rowKey="primary"
                  size="small"
                  pagination={tenRowTablePagination}
                  dataSource={records}
                  columns={[
                    {
                      title: '业务对象',
                      dataIndex: 'primary',
                      render: (value: string, record) => (
                        <Space direction="vertical" size={0}>
                          <Text strong>{value}</Text>
                          <Text type="secondary">{record.secondary}</Text>
                        </Space>
                      )
                    },
                    { title: '关键指标', dataIndex: 'metric', width: 180 },
                    {
                      title: '状态',
                      dataIndex: 'status',
                      width: 130,
                      render: (value: string) => <Tag color={value.includes('风险') || value.includes('超时') ? 'red' : 'blue'}>{value}</Tag>
                    },
                    {
                      title: '操作',
                      width: 180,
                      render: () => (
                        <Space>
                          <Button size="small" disabled>查看</Button>
                          <Button size="small" disabled>处理</Button>
                        </Space>
                      )
                    }
                  ]}
                />
              </Card>
            ) : null}

            {activeSection === 'queue' ? (
              <Card className="module-grid" title="模块待办">
                <ManagedTable
                  recordDetail={{ title: '问题件待办详情' }}
                  rowKey="item"
                  size="small"
                  pagination={tenRowTablePagination}
                  dataSource={queue}
                  columns={[
                    { title: '事项', dataIndex: 'item' },
                    { title: '负责人', dataIndex: 'owner', width: 120 },
                    { title: '状态', dataIndex: 'status', width: 140, render: (value: string) => <Tag color="blue">{value}</Tag> },
                    {
                      title: '操作',
                      width: 180,
                      render: () => (
                        <Space>
                          <Button size="small" disabled>查看</Button>
                          <Button size="small" disabled>处理</Button>
                        </Space>
                      )
                    }
                  ]}
                />
              </Card>
            ) : null}
          </Col>

          <Col xs={24}>
            {activeSection === 'ai' ? (
              <Card title={<Flex align="center" gap={8}><Bot size={18} /><span>AI 赋能</span></Flex>}>
                <Space direction="vertical" size={12} className="quality-panel">
                  <Tag color="blue">硅基流动</Tag>
                  {config.aiEnhancements.map((item) => <Alert key={item} type="info" showIcon message={item} />)}
                  {config.siliconFlowScenarios.map((item) => <Alert key={item} type="success" showIcon message={`硅基流动场景：${item}`} />)}
                  <Alert type="warning" showIcon message="密钥不在前端保存" />
                </Space>
              </Card>
            ) : null}

            {activeSection === 'actions' ? (
              <Card className="automation-card" title="快捷动作">
                <Space wrap>
                  <Button disabled>批量修改</Button>
                  <Button disabled>生成说明</Button>
                  <Button disabled>同步客户</Button>
                  <Button disabled>写入审计</Button>
                </Space>
              </Card>
            ) : null}
          </Col>
        </Row>
      </ModuleSubWorkspace>
    </>
  );
}

export function ProblemTicketsPage(props: { config?: LowFrequencyModuleConfig; tickets: ProblemTicketSummary[]; notice?: string | null; onAiAssist: (input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }) => Promise<void>; aiLoading: boolean }) {
  return <LowFrequencyModulePage {...props} />;
}
