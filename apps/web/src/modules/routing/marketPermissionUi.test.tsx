import { useState } from 'react';
import { App as AntdApp, Form } from 'antd';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MasterDataSnapshot, Shipment } from '@siyuan/shared';
import type { PermissionKey } from '../../apiClient';
import { RoutingPage, type RoutingAssignmentFormValues } from './RoutingPage';

const pendingShipment = {
  id: 'shipment-market-cost-only',
  createdAt: '2026-08-14T02:00:00.000Z',
  customerName: '9409-权限测试客户',
  customerCode: '9409',
  customerOrderNo: 'CUSTOMER-ORDER-1',
  systemOrderNo: 'MARKET-COST-ONLY-1',
  salesperson: 'Rachel',
  site: '深圳思远',
  businessType: 'DEDICATED_LINE',
  packageType: 'WPX',
  destinationCountry: '英国',
  carrier: '',
  packageCount: 1,
  weightKg: 12,
  receivableWeightKg: 12,
  agentWeightKg: 0,
  latestTracking: '等待市场补充业务成本',
  trackingStaleDays: 0,
  isRemoteArea: false,
  status: 'WAITING_SORT',
  channelName: '英国海运DDP',
  agentName: '',
  hasProblemTicket: false
} satisfies Shipment;

function MarketPermissionFixture({
  permissions = [
    'market:pending-routing:view',
    'market:pending-routing:business-cost:view',
    'market:pending-routing:business-cost:create'
  ],
  assignmentFinanceDetail,
  onLoadRoutingReportExportRows = async () => [],
  shipments = [pendingShipment],
  onReturnReview = vi.fn(),
  onRerouteShipment = async () => undefined
}: {
  permissions?: PermissionKey[];
  assignmentFinanceDetail?: Parameters<typeof RoutingPage>[0]['assignmentFinanceDetail'];
  onLoadRoutingReportExportRows?: () => Promise<Shipment[]>;
  shipments?: Shipment[];
  onReturnReview?: (shipment: Shipment) => Promise<void> | void;
  onRerouteShipment?: (shipment: Shipment, reason: string) => Promise<void>;
}) {
  const [assignmentShipment, setAssignmentShipment] = useState<Shipment | null>(null);
  const [assignmentForm] = Form.useForm<RoutingAssignmentFormValues>();
  return (
    <AntdApp>
      <RoutingPage
        config={{ title: '市场管理', description: '市场权限测试', capabilities: [], aiEnhancements: [], siliconFlowScenarios: [] }}
        shipments={shipments}
        assignmentShipment={assignmentShipment}
        assignmentFinanceDetail={assignmentFinanceDetail}
        assignmentForm={assignmentForm}
        masterData={{ agents: [], agentChannels: [], channels: [], carriers: [] } as unknown as MasterDataSnapshot}
        permissions={permissions}
        onOpenAssignment={(shipment) => setAssignmentShipment(shipment)}
        onApproveRouting={async () => undefined}
        onCancelAssignment={() => setAssignmentShipment(null)}
        onConfirmAssignment={async () => true}
        onRerouteShipment={onRerouteShipment}
        onEditShipment={vi.fn()}
        onViewRoutingLog={vi.fn()}
        onViewPendingRoutingLog={vi.fn()}
        onReturnReview={onReturnReview}
        onSavePendingRoutingCost={async () => undefined}
        onDeletePendingRoutingCost={async () => undefined}
        onLoadRoutingReportExportRows={onLoadRoutingReportExportRows}
        onAiAssist={async () => undefined}
        aiLoading={false}
      />
    </AntdApp>
  );
}

describe('market positive permission UI', () => {
  afterEach(() => cleanup());

  it('keeps business-cost create independent and hides unrelated actions', async () => {
    const user = userEvent.setup();
    render(<MarketPermissionFixture />);
    const row = await screen.findByRole('row', { name: /MARKET-COST-ONLY-1/ });
    expect(within(row).getByRole('button', { name: '业务成本' })).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /排\s*货/ })).not.toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /修\s*改/ })).not.toBeInTheDocument();
    await user.click(within(row).getByRole('button', { name: '业务成本' }));
    const dialog = await screen.findByRole('dialog', { name: '市场排货' });
    expect(within(dialog).getByRole('tab', { name: '业务成本' })).toHaveAttribute('aria-selected', 'true');
    expect(within(dialog).getByRole('button', { name: '新增费用' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /排\s*货/ })).not.toBeInTheDocument();
  });

  it('makes routing-report export independently observable', async () => {
    const user = userEvent.setup();
    const onLoadRoutingReportExportRows = vi.fn(async () => { throw new Error('测试中止下载'); });
    render(<MarketPermissionFixture permissions={['market:routing-report:view', 'market:routing-report:export']} onLoadRoutingReportExportRows={onLoadRoutingReportExportRows} />);
    expect(screen.getByRole('region', { name: '排货数据' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '导出' }));
    expect(onLoadRoutingReportExportRows).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('测试中止下载')).toBeInTheDocument();
  });

  it('keeps audited business costs read-only while allowing new rows', async () => {
    const user = userEvent.setup();
    render(<MarketPermissionFixture permissions={[
      'market:pending-routing:view', 'market:pending-routing:business-cost:view',
      'market:pending-routing:business-cost:create', 'market:pending-routing:business-cost:edit',
      'market:pending-routing:business-cost:delete'
    ]} assignmentFinanceDetail={{ shipmentId: pendingShipment.id, systemOrderNo: pendingShipment.systemOrderNo, receivables: [], payables: [], businessCosts: [{
      id: 'approved-cost-1', shipmentId: pendingShipment.id,
      name: '已审核业务成本', amount: 88, currency: 'RMB', settled: false, marketEditable: false
    }], receivableTotal: 0, businessCostTotal: 88, payableTotal: 0 }} />);
    const row = await screen.findByRole('row', { name: /MARKET-COST-ONLY-1/ });
    await user.click(within(row).getByRole('button', { name: '业务成本' }));
    const dialog = await screen.findByRole('dialog', { name: '市场排货' });
    expect(within(dialog).getByRole('button', { name: '新增费用' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('tab', { name: '应付成本' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('columnheader', { name: '对账状态' })).not.toBeInTheDocument();
    const approvedRow = within(dialog).getByRole('row', { name: /已审核业务成本/ });
    expect(within(approvedRow).queryByRole('button', { name: '修改' })).not.toBeInTheDocument();
    expect(within(approvedRow).queryByRole('button', { name: '删除' })).not.toBeInTheDocument();
  });

  it('keeps reroute independently reachable without report permission', async () => {
    const user = userEvent.setup();
    const onRerouteShipment = vi.fn(async () => undefined);
    const returnableShipment = { ...pendingShipment, id: 'shipment-market-reroute-only', systemOrderNo: 'MARKET-REROUTE-ONLY-1', status: 'OUTBOUNDED' as const, routedAt: '2026-08-14T03:00:00.000Z' };
    render(<MarketPermissionFixture permissions={['market:routed:view', 'market:routed:reroute']} shipments={[returnableShipment]} onRerouteShipment={onRerouteShipment} />);
    const row = await screen.findByRole('row', { name: /MARKET-REROUTE-ONLY-1/ });
    await user.click(within(row).getByRole('button', { name: '退回重排' }));
    const dialog = await screen.findByRole('dialog', { name: '代理退回重排' });
    await user.type(within(dialog).getByRole('textbox'), '渠道需要重新确认');
    await user.click(within(dialog).getByRole('button', { name: '确认退回' }));
    expect(onRerouteShipment).toHaveBeenCalledWith(returnableShipment, '渠道需要重新确认');
  });
});
