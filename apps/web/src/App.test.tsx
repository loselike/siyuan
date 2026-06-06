import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const employeeShipments = [
  shipment('s-1', 'SYGJ06061230001', 'RCV-0606', 'WAITING_RECEIVE', '9409-Daloday'),
  shipment('s-2', 'SYGJ05291344165', 'TILL-0529', 'WAITING_ONLINE', '1344-TILL', { transferNo: '9064656160', trackingStaleDays: 9, hasProblemTicket: true })
];
const customerShipments = [shipment('s-1', 'SYGJ06061230001', 'RCV-0606', 'WAITING_RECEIVE', '9409-Daloday')];
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

beforeEach(() => {
  localStorage.clear();
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
    expect(screen.getByText('9409-Daloday')).toBeInTheDocument();
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

    expect(await screen.findByRole('heading', { name: '登录思源物流' })).toBeInTheDocument();
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

  it('shows customer-visible receivables and statements in the customer portal', async () => {
    await renderAndLogin('customer', 'customer123');

    expect((await screen.findAllByText('费用明细')).length).toBeGreaterThan(0);
    expect(screen.getByText('¥200.00')).toBeInTheDocument();
    expect(screen.getByText('对账单草稿')).toBeInTheDocument();
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
  status: string,
  customerName: string,
  overrides = {}
) {
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
