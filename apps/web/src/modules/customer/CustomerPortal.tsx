import type { ReactNode } from 'react';
import { useState } from 'react';
import { Alert, Button, Card, Col, ConfigProvider, Flex, Input, Layout, Modal, Row, Space, Typography } from 'antd';
import type { ThemeConfig } from 'antd/es/config-provider/context';
import {
  shipmentStatusLabels,
  type AccountLedgerSummary,
  type BusinessType,
  type CustomerAccountSummary,
  type CustomerStatementSummary,
  type ReceivableFeeSummary,
  type Shipment,
  type ShipmentStatus
} from '@siyuan/shared';
import type { ApiClient, PermissionKey, Principal } from '../../apiClient';
import { NotificationCenter } from '../notifications/NotificationCenter';
import { formatCurrency } from '../shared/format';
import { resolveShipmentOutboundOrderNo } from '../shared/shipmentOrderNo';
import { AppActionGroup, AppPageHeader, ManagedTable, renderNoticeBar, tenRowTablePagination } from '../shared/ui';

const { Header, Content } = Layout;
const { Text } = Typography;

function renderCustomerShipmentDetailField(
  label: string,
  value: ReactNode,
  options: { copyText?: string; muted?: boolean; wide?: boolean } = {}
) {
  return (
    <div className={`shipment-detail-field${options.wide ? ' shipment-detail-field-wide' : ''}`}>
      <span className="shipment-detail-field-label">{label}</span>
      <span className={`shipment-detail-field-value${options.muted ? ' shipment-detail-muted-value' : ''}`}>
        {options.copyText ? <Text copyable={{ text: options.copyText }}>{value}</Text> : value}
      </span>
    </div>
  );
}

export function CustomerPortal({
  apiClient,
  theme,
  user,
  permissions,
  shipments,
  problemTickets,
  receivables,
  statements,
  accounts,
  ledger,
  onLogout,
  onCreate
}: {
  apiClient: ApiClient;
  theme: ThemeConfig;
  user: Principal;
  permissions: PermissionKey[];
  shipments: Shipment[];
  problemTickets: Array<{ id: string; reason: string; status: string; customerVisible: boolean }>;
  receivables: ReceivableFeeSummary[];
  statements: CustomerStatementSummary[];
  accounts: CustomerAccountSummary[];
  ledger: AccountLedgerSummary[];
  onLogout: () => void;
  onCreate: (input: {
    customerOrderNo: string;
    businessType: BusinessType;
    packageType: 'DOC' | 'WPX' | 'PAK';
    destinationCountry: string;
    packageCount: number;
    receivableWeightKg: number;
    agentWeightKg: number;
    channelId?: string;
  }) => Promise<void>;
}) {
  const [customerOrderNo, setCustomerOrderNo] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [weight, setWeight] = useState('1');
  const [notice, setNotice] = useState('');
  const [customerDetailShipment, setCustomerDetailShipment] = useState<Shipment | null>(null);

  async function submitDeclaration() {
    await onCreate({
      customerOrderNo,
      businessType: 'EXPRESS',
      packageType: 'WPX',
      destinationCountry,
      packageCount: 1,
      receivableWeightKg: Number(weight),
      agentWeightKg: Number(weight),
      channelId: 'ch-dhl-hk'
    });
    setNotice('预报已提交');
    setCustomerOrderNo('');
    setDestinationCountry('');
    setWeight('1');
  }

  return (
    <ConfigProvider theme={theme}>
      <Layout className="app-shell">
        <Header className="topbar">
          <Flex justify="space-between" align="center" style={{ width: '100%' }}>
            <Space>
              <div className="brand-mark brand-logo-mark">
                <img src="/green-cargo-logo.png" alt="Green Cargo 思远物流标识" width={66} height={36} />
              </div>
              <div>
                <Text className="brand-title">思远物流</Text>
                <Text className="brand-subtitle">客户工作台 · {user.username}</Text>
              </div>
            </Space>
            <Space>
              <NotificationCenter apiClient={apiClient} permissions={permissions} compact />
              <Button onClick={onLogout}>退出</Button>
            </Space>
          </Flex>
        </Header>
        <Content className="content" role="main">
          <AppPageHeader
            title="客户门户"
            description="预报运单、查询轨迹、处理问题件、查看费用和对账单。"
            actions={(
              <AppActionGroup>
                <Button>价格查询</Button>
                <Button>费用明细</Button>
                <Button type="primary">账户余额</Button>
              </AppActionGroup>
            )}
          />

          {renderNoticeBar(notice)}

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              <Card title="新建预报">
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <label>
                    <Text strong>出货单号</Text>
                    <Input aria-label="出货单号" value={customerOrderNo} onChange={(event) => setCustomerOrderNo(event.target.value)} />
                  </label>
                  <label>
                    <Text strong>目的地国家</Text>
                    <Input aria-label="目的地国家" value={destinationCountry} onChange={(event) => setDestinationCountry(event.target.value)} />
                  </label>
                  <label>
                    <Text strong>重量</Text>
                    <Input aria-label="重量" value={weight} onChange={(event) => setWeight(event.target.value)} />
                  </label>
                  <Button type="primary" block onClick={submitDeclaration}>
                    提交预报
                  </Button>
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={16}>
              <Card title="我的运单">
                <ManagedTable
                  recordDetail={{ title: '客户运单详情' }}
                  size="small"
                  rowKey="id"
                  dataSource={shipments}
                  pagination={tenRowTablePagination}
                  sticky={false}
                  minimumScrollX={0}
                  resizableColumns={false}
                  columnSettings={false}
                  columns={[
                    { title: '出货单号', dataIndex: 'customerOrderNo' },
                    {
                      title: '出货单号',
                      dataIndex: 'systemOrderNo',
                      render: (_: string, record) => {
                        const outboundOrderNo = resolveShipmentOutboundOrderNo(record);
                        return (
                          <Space direction="vertical" size={0}>
                            <Space size={4}>
                              <Button className="order-number-link" type="link" size="small" onClick={() => setCustomerDetailShipment(record)}>
                                {outboundOrderNo}
                              </Button>
                              <Text copyable={{ text: record.transferNo ? `${outboundOrderNo}\n${record.transferNo}` : outboundOrderNo }} />
                            </Space>
                            <Text type="secondary">点击查看详情</Text>
                          </Space>
                        );
                      }
                    },
                    { title: '转单号', dataIndex: 'transferNo', render: (value?: string) => value ?? '待生成' },
                    { title: '目的地', dataIndex: 'destinationCountry' },
                    { title: '状态', dataIndex: 'status', render: (status: ShipmentStatus) => shipmentStatusLabels[status] },
                    { title: '最新物流轨迹', dataIndex: 'latestTracking' }
                  ]}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="问题件">
                <Space direction="vertical" className="ai-list">
                  {problemTickets.map((ticket) => (
                    <Alert key={ticket.id} type={ticket.status === 'CLOSED' ? 'success' : 'warning'} message={ticket.reason} showIcon />
                  ))}
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="客户常用功能">
                <Space wrap>
                  <Button>偏远/邮编查询</Button>
                  <Button>黑名单查询</Button>
                  <Button>对账单</Button>
                  <Button>个人中心</Button>
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="费用明细">
                <Space direction="vertical" className="ai-list">
                  {receivables.map((fee) => (
                    <Flex key={fee.id} justify="space-between">
                      <Text>{fee.name}</Text>
                      <Text strong>{formatCurrency(fee.amount)}</Text>
                    </Flex>
                  ))}
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="对账单草稿">
                <Space direction="vertical" className="ai-list">
                  {statements.map((statement) => (
                    <Flex key={statement.id ?? `${statement.customerId}-${statement.periodStart}`} justify="space-between">
                      <Text>{statement.periodStart} - {statement.periodEnd}</Text>
                      <Text strong>{formatCurrency(statement.total)}</Text>
                    </Flex>
                  ))}
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="账户余额">
                <Space direction="vertical" className="ai-list">
                  {accounts.map((account) => (
                    <Flex key={account.customerId} justify="space-between">
                      <Text>{account.customerName}</Text>
                      <Text strong>{formatCurrency(account.balance)}</Text>
                    </Flex>
                  ))}
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="账户流水">
                <Space direction="vertical" className="ai-list">
                  {ledger.map((entry) => (
                    <Flex key={entry.id} justify="space-between">
                      <Text>{entry.note ?? '账户变动'}</Text>
                      <Text strong>{formatCurrency(entry.amount)}</Text>
                    </Flex>
                  ))}
                </Space>
              </Card>
            </Col>
          </Row>
          <Modal
            title={customerDetailShipment ? `运单详情 · ${customerDetailShipment.systemOrderNo}` : '运单详情'}
            open={Boolean(customerDetailShipment)}
            destroyOnHidden
            footer={<Button onClick={() => setCustomerDetailShipment(null)}>关闭</Button>}
            onCancel={() => setCustomerDetailShipment(null)}
          >
            {customerDetailShipment ? (
              <div className="shipment-detail-grid">
                {renderCustomerShipmentDetailField('出货单号', resolveShipmentOutboundOrderNo(customerDetailShipment), { copyText: resolveShipmentOutboundOrderNo(customerDetailShipment) })}
                {renderCustomerShipmentDetailField(
                  '转单号',
                  customerDetailShipment.transferNo ?? '待获取快递号',
                  customerDetailShipment.transferNo ? { copyText: customerDetailShipment.transferNo } : { muted: true }
                )}
                {renderCustomerShipmentDetailField('目的地', customerDetailShipment.destinationCountry)}
                {renderCustomerShipmentDetailField('状态', shipmentStatusLabels[customerDetailShipment.status])}
                {renderCustomerShipmentDetailField('最新物流轨迹', customerDetailShipment.latestTracking, { wide: true })}
              </div>
            ) : null}
          </Modal>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
