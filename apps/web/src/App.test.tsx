import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountLedgerSummary, CarrierTaskSummary, CustomerAccountSummary, Shipment, ShipmentStatus } from '@siyuan/shared';
import { App } from './App';

const employeeShipments = [
  shipment('s-1', 'SYGJ06061230001', 'RCV-0606', 'WAITING_RECEIVE', '9409-Daloday'),
  shipment('s-3', 'SYGJ06061230003', 'LBL-0606-US', 'WAITING_DISPATCH', '9409-Daloday', { carrier: 'UPS', channelName: 'UPS 加美线', agentName: '加美代理' }),
  shipment('s-2', 'SYGJ05291344165', 'TILL-0529', 'WAITING_ONLINE', '1344-TILL', { transferNo: '9064656160', trackingStaleDays: 9, hasProblemTicket: true })
];
const customerShipments: Shipment[] = [shipment('s-1', 'SYGJ06061230001', 'RCV-0606', 'WAITING_RECEIVE', '9409-Daloday', { transferNo: 'DHL26060600001', latestTracking: '已生成面单' })];
const shipmentLabels = [
  {
    id: 'lbl-s-3',
    shipmentId: 's-3',
    carrier: 'UPS',
    channelName: 'UPS 加美线',
    labelNo: 'LBL26060600001',
    transferNo: '1Z26060600001',
    labelUrl: '/mock-labels/LBL26060600001.pdf',
    status: 'CREATED',
    createdAt: '2026-06-06T10:00:00.000Z'
  }
];
const problemTickets = [
  {
    id: 'pt-1',
    shipmentId: 's-2',
    systemOrderNo: 'SYGJ05291344165',
    customerName: '1344-TILL',
    reason: '轨迹超过3天未更新',
    status: 'OPEN',
    customerVisible: true,
    createdAt: '2026-06-06T10:00:00Z',
    replies: []
  }
];
const receivableFees = [
  { id: 'rf-1', shipmentId: 's-1', systemOrderNo: 'SYGJ06061230001', customerName: '9409-Daloday', name: '基础运费', amount: 200, settled: false },
  { id: 'rf-2', shipmentId: 's-1', systemOrderNo: 'SYGJ06061230001', customerName: '9409-Daloday', name: '燃油费', amount: 30, settled: false }
];
const customerStatements = [
  {
    id: 'cs-1',
    customerId: 'c-9409',
    customerName: '9409-Daloday',
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    total: 230,
    feeCount: 2,
    status: 'DRAFT',
    createdAt: '2026-06-06T10:00:00.000Z'
  }
];
const customerAccounts: CustomerAccountSummary[] = [
  { customerId: 'c-9409', customerName: '9409-Daloday', balance: 10000, currency: 'CNY' }
];
const accountLedger: AccountLedgerSummary[] = [
  { id: 'al-seed-1', customerId: 'c-9409', customerName: '9409-Daloday', amount: 10000, balance: 10000, note: '期初余额', createdAt: '2026-06-01T10:00:00.000Z' }
];
const carrierTasks: CarrierTaskSummary[] = [
  {
    id: 'ct-1',
    shipmentId: 's-2',
    systemOrderNo: 'SYGJ05291344165',
    customerName: '1344-TILL',
    type: 'TRACKING_SYNC',
    carrier: 'DHL',
    transferNo: '9064656160',
    status: 'PENDING',
    attempts: 0,
    createdAt: '2026-06-06T10:00:00.000Z',
    updatedAt: '2026-06-06T10:00:00.000Z'
  },
  {
    id: 'ct-2',
    shipmentId: 's-3',
    systemOrderNo: 'SYGJ06061230003',
    customerName: '9409-Daloday',
    type: 'TRACKING_SYNC',
    carrier: 'UPS',
    transferNo: '1Z26060600001',
    status: 'FAILED',
    attempts: 1,
    lastError: '模拟承运商接口失败',
    createdAt: '2026-06-06T10:00:00.000Z',
    updatedAt: '2026-06-06T10:01:00.000Z'
  }
];
const systemRoleMatrix = {
  availablePermissions: [
    { code: 'shipments:read', label: '运单读取', group: '运单' },
    { code: 'shipments:write', label: '运单写入', group: '运单' },
    { code: 'finance:read', label: '财务读取', group: '财务' },
    { code: 'finance:settle', label: '财务核销', group: '财务' },
    { code: 'master-data:read', label: '基础资料读取', group: '资料' },
    { code: 'system:manage', label: '系统管理', group: '系统' }
  ],
  roles: [
    {
      key: 'ADMIN',
      label: '系统管理员',
      account: 'admin',
      scope: '全局数据',
      permissions: ['shipments:read', 'shipments:write', 'finance:read', 'finance:settle', 'master-data:read', 'system:manage'],
      restriction: '全部权限'
    },
    {
      key: 'CUSTOMER_SERVICE',
      label: '客服',
      account: 'service',
      scope: '客户与问题件',
      permissions: ['shipments:read', 'shipments:write', 'master-data:read'],
      restriction: '不能核销、不能改系统权限'
    },
    {
      key: 'FINANCE',
      label: '财务',
      account: 'finance',
      scope: '财务数据',
      permissions: ['shipments:read', 'finance:read', 'finance:settle', 'master-data:read'],
      restriction: '不能改系统权限'
    }
  ]
};

beforeEach(() => {
  localStorage.clear();
  receivableFees.forEach((fee) => {
    fee.settled = false;
  });
  customerAccounts[0] = { customerId: 'c-9409', customerName: '9409-Daloday', balance: 10000, currency: 'CNY' };
  accountLedger.splice(0, accountLedger.length, {
    id: 'al-seed-1',
    customerId: 'c-9409',
    customerName: '9409-Daloday',
    amount: 10000,
    balance: 10000,
    note: '期初余额',
    createdAt: '2026-06-01T10:00:00.000Z'
  });
  vi.stubGlobal('fetch', vi.fn(mockFetch));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('M1+M2 API-backed workspace', () => {
  it('logs in staff and loads API shipments into the existing workspace', async () => {
    await renderAndLogin('admin', 'admin123');

    expect(await screen.findByRole('heading', { name: 'AI 物流运营工作台' })).toBeInTheDocument();
    expect(screen.getByText('SYGJ06061230001')).toBeInTheDocument();
    expect(screen.getAllByText('9409-Daloday').length).toBeGreaterThan(0);
  });

  it('calls the receive API and refreshes shipment state', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '运单履约' }));
    await user.click(screen.getByRole('button', { name: /待收货/ }));
    await user.click(screen.getByRole('button', { name: '确认收货' }));

    expect(await screen.findByText('已确认收货，进入待排货')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /待排货/ }));
    expect(await screen.findByText('SYGJ06061230001')).toBeInTheDocument();
  });

  it('shows customer portal for customer users only', async () => {
    await renderAndLogin('customer', 'customer123');

    expect(await screen.findByRole('heading', { name: '客户门户' })).toBeInTheDocument();
    expect(screen.getByText('新建预报')).toBeInTheDocument();
    expect(screen.getByText('我的运单')).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '系统设置' })).not.toBeInTheDocument();
  });

  it('lets customer create a declared shipment and shows it in my shipments', async () => {
    const user = userEvent.setup();
    await renderAndLogin('customer', 'customer123');

    await user.type(screen.getByLabelText('客户单号'), 'CUST-NEW-001');
    await user.type(screen.getByLabelText('目的地国家'), '美国');
    await user.clear(screen.getByLabelText('重量'));
    await user.type(screen.getByLabelText('重量'), '2.4');
    await user.click(screen.getByRole('button', { name: '提交预报' }));

    expect(await screen.findByText('CUST-NEW-001')).toBeInTheDocument();
    expect(screen.getByText('已预报')).toBeInTheDocument();
  });

  it('clears login state and returns to login on API 401', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementationOnce(async () => jsonResponse({ accessToken: 'bad-token', user: { id: 'u-admin', username: 'admin', role: 'ADMIN' } }));
    fetchMock.mockImplementationOnce(async () => new Response('Unauthorized', { status: 401 }));

    render(<App />);
    await userEvent.type(screen.getByLabelText('账号'), 'admin');
    await userEvent.type(screen.getByLabelText('密码'), 'admin123');
    await userEvent.click(screen.getByRole('button', { name: '登录' }));

    expect(await screen.findByRole('heading', { name: '登录思远物流' })).toBeInTheDocument();
  });

  it('shows realistic data child functions and SiliconFlow AI capability for every staff module', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    const moduleExpectations = [
      { menu: '收货打单', heading: '收货打单中心', child: '扫描收货', record: 'RCV-0606-001', ai: '硅基流动' },
      { menu: '渠道排货', heading: '渠道排货中心', child: '规则排货', record: 'UPS 加美线', ai: '硅基流动' },
      { menu: '轨迹监控', heading: '轨迹监控中心', child: '客户可见轨迹', record: '9064656160', ai: '硅基流动' },
      { menu: '问题件中心', heading: '问题件中心', child: '关闭问题', record: '轨迹超过3天未更新', ai: '硅基流动' },
      { menu: '报价查价', heading: '报价查价中心', child: '燃油附加费', record: '美国 2.4kg', ai: '硅基流动' },
      { menu: '财务结算', heading: '财务结算中心', child: '客户对账', record: 'INV-202606-9409', ai: '硅基流动' },
      { menu: '统计报表', heading: '统计报表中心', child: '利润分析', record: '日报-2026-06-06', ai: '硅基流动' },
      { menu: '基础资料', heading: '基础资料中心', child: '客户端账号创建', record: '9409-Daloday', ai: '硅基流动' },
      { menu: '系统设置', heading: '系统设置中心', child: '角色权限分配', record: '管理员', ai: '硅基流动' }
    ];

    for (const item of moduleExpectations) {
      await user.click(screen.getByRole('menuitem', { name: item.menu }));
      expect(await screen.findByRole('heading', { name: item.heading })).toBeInTheDocument();
      expect(screen.getAllByText(item.child).length).toBeGreaterThan(0);
      expect(screen.getAllByText(item.record, { exact: false }).length).toBeGreaterThan(0);
    }
  });

  it('quotes pricing through the API on the pricing page', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    await user.click(await screen.findByRole('button', { name: '试算报价' }));

    expect(await screen.findByText('报价合计 ¥280')).toBeInTheDocument();
  });

  it('shows receivables and creates customer statement drafts on the finance page', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '财务结算' }));
    expect(await screen.findByText('基础运费')).toBeInTheDocument();
    expect(screen.getByText('¥200.00')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '生成 9409 对账单' }));

    expect(await screen.findByText('对账单草稿 ¥230')).toBeInTheDocument();
  });

  it('lets finance staff register a payment and settle selected receivables', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '财务结算' }));
    expect(await screen.findByText('账户余额')).toBeInTheDocument();
    expect((await screen.findAllByText('¥10000.00')).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: '登记 9409 收款并核销' }));

    expect(await screen.findByText('收款已核销 ¥230')).toBeInTheDocument();
    expect(screen.getAllByText('已结算').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('核销应收费用')).toBeInTheDocument();
  });

  it('shows customer-visible receivables and statements in the customer portal', async () => {
    await renderAndLogin('customer', 'customer123');

    expect((await screen.findAllByText('费用明细')).length).toBeGreaterThan(0);
    expect(screen.getByText('¥200.00')).toBeInTheDocument();
    expect(screen.getByText('对账单草稿')).toBeInTheDocument();
    expect(screen.getAllByText('账户余额').length).toBeGreaterThan(0);
    expect(screen.getByText('期初余额')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '登记 9409 收款并核销' })).not.toBeInTheDocument();
  });

  it('lets staff create a mock label from the receive label page and dispatch with its transfer number', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '收货打单' }));
    expect(await screen.findByRole('heading', { name: '收货打单中心' })).toBeInTheDocument();
    expect(screen.getByText('SYGJ06061230003')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '申请面单' }));
    expect(await screen.findByText('已生成模拟面单 1Z26060600001')).toBeInTheDocument();
    expect(screen.getByText('1Z26060600001')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '确认发货' }));
    expect(await screen.findByText('已确认发货，进入待上网')).toBeInTheDocument();
    expect(screen.queryByText('SYGJ06061230003')).not.toBeInTheDocument();
  });

  it('shows transfer numbers in the customer portal without internal label controls', async () => {
    await renderAndLogin('customer', 'customer123');

    expect(await screen.findByText('DHL26060600001')).toBeInTheDocument();
    expect(screen.getByText('已生成面单')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '作废面单' })).not.toBeInTheDocument();
  });

  it('shows carrier tasks on tracking page and syncs tracking manually', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '轨迹监控' }));
    expect(await screen.findByRole('heading', { name: '轨迹监控中心' })).toBeInTheDocument();
    expect(screen.getAllByText('承运商任务').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SYGJ05291344165').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: '同步轨迹' }));
    expect(await screen.findByText('轨迹同步成功：DHL 已揽收 9064656160')).toBeInTheDocument();
    expect(screen.getByText('DHL 已揽收 9064656160')).toBeInTheDocument();
  });

  it('retries failed carrier tasks and keeps task controls staff-only', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '轨迹监控' }));
    expect(await screen.findByText('模拟承运商接口失败')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /重\s*试/ }));
    expect(await screen.findByText('轨迹同步成功：UPS 运输中 1Z26060600001')).toBeInTheDocument();

    cleanup();
    localStorage.clear();
    await renderAndLogin('customer', 'customer123');
    expect(screen.queryByRole('button', { name: '同步轨迹' })).not.toBeInTheDocument();
    expect(screen.queryByText('承运商任务')).not.toBeInTheDocument();
  });

  it('loads and saves the real role permission matrix on system settings', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '系统设置' }));

    expect((await screen.findAllByText('admin')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('service').length).toBeGreaterThan(0);
    expect(screen.queryByText('admin123')).not.toBeInTheDocument();
    expect(screen.queryByText('service123')).not.toBeInTheDocument();
    expect(screen.getAllByText('财务核销').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: '保存客服权限' }));

    expect(await screen.findByText('客服权限已保存，RBAC 即时生效')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/system/roles/CUSTOMER_SERVICE/permissions'),
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('calls AI assist from module buttons and renders the returned content', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '渠道排货' }));
    await user.click(await screen.findByRole('button', { name: 'AI 辅助处理' }));

    expect(await screen.findByText(/硅基流动实时输出|本地兜底输出/)).toBeInTheDocument();
    expect(screen.getByText('AI 已输出渠道排货中心建议')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/ai/assist'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});

async function renderAndLogin(username: string, password: string) {
  render(<App />);
  await userEvent.type(screen.getByLabelText('账号'), username);
  await userEvent.type(screen.getByLabelText('密码'), password);
  await userEvent.click(screen.getByRole('button', { name: '登录' }));
  await waitFor(() => expect(fetch).toHaveBeenCalled());
}

async function mockFetch(input: RequestInfo | URL, init?: RequestInit) {
  const url = String(input);
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;

  if (url.endsWith('/api/auth/login')) {
    const role = body.username === 'customer' ? 'CUSTOMER' : 'ADMIN';
    return jsonResponse({ accessToken: `${role}-token`, user: { id: `u-${body.username}`, username: body.username, role, customerId: role === 'CUSTOMER' ? 'c-9409' : undefined } });
  }

  if (url.endsWith('/api/ai/assist')) {
    return jsonResponse({
      provider: 'siliconflow',
      mode: 'live',
      model: 'Qwen/Qwen2.5-7B-Instruct',
      content: `AI 已输出${body.module ?? body.scenario ?? '模块'}建议`
    });
  }

  if (url.endsWith('/api/shipments') && init?.method === 'POST') {
    const created = shipment('s-new', 'SYGJ26060600021', body.customerOrderNo, 'DECLARED', '9409-Daloday', {
      destinationCountry: body.destinationCountry,
      receivableWeightKg: body.receivableWeightKg,
      agentWeightKg: body.agentWeightKg ?? body.receivableWeightKg
    });
    customerShipments.unshift(created);
    return jsonResponse(created);
  }

  if (url.endsWith('/api/shipments/s-1/receive')) {
    employeeShipments[0] = { ...employeeShipments[0], status: 'WAITING_SORT', latestTracking: '已收货' };
    return jsonResponse(employeeShipments[0]);
  }

  if (url.endsWith('/api/shipments/s-3/labels') && init?.method === 'POST') {
    employeeShipments[1] = { ...employeeShipments[1], transferNo: '1Z26060600001', latestTracking: '已生成面单' };
    return jsonResponse({ label: shipmentLabels[0], shipment: employeeShipments[1] });
  }

  if (url.endsWith('/api/shipments/s-3/labels')) {
    return jsonResponse(shipmentLabels);
  }

  if (url.endsWith('/api/shipments/s-3/dispatch')) {
    employeeShipments[1] = { ...employeeShipments[1], status: 'WAITING_ONLINE', latestTracking: '已发货' };
    return jsonResponse(employeeShipments[1]);
  }

  if (url.endsWith('/api/carrier-tasks/ct-1/run')) {
    carrierTasks[0] = { ...carrierTasks[0], status: 'SUCCESS', attempts: 1, completedAt: '2026-06-06T10:02:00.000Z' };
    employeeShipments[2] = { ...employeeShipments[2], latestTracking: 'DHL 已揽收 9064656160', trackingStaleDays: 0 };
    return jsonResponse({ task: carrierTasks[0], shipment: employeeShipments[2] });
  }

  if (url.endsWith('/api/carrier-tasks/ct-2/retry')) {
    carrierTasks[1] = { ...carrierTasks[1], status: 'SUCCESS', attempts: 2, lastError: undefined, completedAt: '2026-06-06T10:03:00.000Z' };
    employeeShipments[1] = { ...employeeShipments[1], latestTracking: 'UPS 运输中 1Z26060600001', trackingStaleDays: 0 };
    return jsonResponse({ task: carrierTasks[1], shipment: employeeShipments[1] });
  }

  if (url.endsWith('/api/carrier-tasks')) {
    const token = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? '');
    if (token.includes('CUSTOMER')) {
      return Promise.resolve(new Response('Forbidden', { status: 403 }));
    }
    return jsonResponse(carrierTasks);
  }

  if (url.endsWith('/api/system/roles/CUSTOMER_SERVICE/permissions')) {
    systemRoleMatrix.roles[1] = { ...systemRoleMatrix.roles[1], permissions: body.permissions };
    return jsonResponse(systemRoleMatrix.roles[1]);
  }

  if (url.endsWith('/api/system/roles')) {
    return jsonResponse(systemRoleMatrix);
  }

  if (url.endsWith('/api/shipments')) {
    const token = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? '');
    return jsonResponse(token.includes('CUSTOMER') ? customerShipments : employeeShipments);
  }

  if (url.endsWith('/api/problem-tickets')) {
    return jsonResponse(problemTickets);
  }

  if (url.endsWith('/api/pricing/quote')) {
    return jsonResponse({ freight: 200, fuel: 30, surchargeTotal: 50, total: 280 });
  }

  if (url.endsWith('/api/finance/receivables')) {
    return jsonResponse(receivableFees);
  }

  if (url.endsWith('/api/finance/customer-accounts')) {
    return jsonResponse(customerAccounts);
  }

  if (url.endsWith('/api/finance/account-ledger')) {
    return jsonResponse(accountLedger);
  }

  if (url.endsWith('/api/finance/payments')) {
    const amount = receivableFees.reduce((sum, fee) => sum + (fee.settled ? 0 : fee.amount), 0);
    receivableFees.forEach((fee) => {
      fee.settled = true;
    });
    accountLedger.push(
      { id: 'al-pay-1', customerId: 'c-9409', customerName: '9409-Daloday', amount, balance: 10230, note: '收款登记', createdAt: '2026-06-06T10:00:00.000Z' },
      { id: 'al-settle-1', customerId: 'c-9409', customerName: '9409-Daloday', amount: -amount, balance: 10000, note: '核销应收费用', createdAt: '2026-06-06T10:00:00.000Z' }
    );
    return jsonResponse({
      payment: { id: 'pay-1', customerId: 'c-9409', customerName: '9409-Daloday', amount, settledAmount: amount, remainingAmount: 0, createdAt: '2026-06-06T10:00:00.000Z' },
      account: customerAccounts[0],
      settledFees: receivableFees
    });
  }

  if (url.endsWith('/api/finance/customer-statements') && init?.method === 'POST') {
    return jsonResponse(customerStatements[0]);
  }

  if (url.endsWith('/api/finance/customer-statements')) {
    return jsonResponse(customerStatements);
  }

  return jsonResponse({});
}

function jsonResponse(data: unknown) {
  return Promise.resolve(new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } }));
}

function shipment(
  id: string,
  systemOrderNo: string,
  customerOrderNo: string,
  status: ShipmentStatus,
  customerName: string,
  overrides: Partial<Shipment> = {}
): Shipment {
  return {
    id,
    createdAt: '2026-06-06T09:40:00.000Z',
    customerName,
    customerOrderNo,
    systemOrderNo,
    businessType: 'EXPRESS',
    packageType: 'WPX',
    destinationCountry: '美国',
    carrier: 'DHL',
    packageCount: 1,
    receivableWeightKg: 18,
    agentWeightKg: 18,
    latestTracking: '客户已预报',
    trackingStaleDays: 0,
    isRemoteArea: false,
    status,
    channelName: 'DHL HK',
    agentName: '宇环',
    hasProblemTicket: false,
    ...overrides
  };
}
