import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import type {
  AccountLedgerSummary,
  AgentMarkupSummary,
  CarrierTaskSummary,
  CustomerAccountSummary,
  MasterDataSnapshot,
  PriceBookRowSummary,
  PriceBookSummary,
  PricingRuleSummary,
  Shipment,
  ShipmentStatus,
  WarehousePackageSummary
} from '@siyuan/shared';
import { App } from './App';

const employeeShipments = [
  shipment('s-1', 'SYGJ06061230001', 'RCV-0606', 'WAITING_RECEIVE', '9409-Daloday'),
  shipment('s-3', 'SYGJ06061230003', 'LBL-0606-US', 'WAITING_DISPATCH', '9409-Daloday', { carrier: 'UPS', channelName: 'UPS 加美线', agentName: '加美代理' }),
  shipment('s-2', 'SYGJ05291344165', 'TILL-0529', 'WAITING_ONLINE', '1344-TILL', {
    transferNo: '9064656160',
    trackingStaleDays: 9,
    hasProblemTicket: true,
    dispatchedAt: '2026-06-02T10:00:00.000Z'
  })
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
const pricingRules: PricingRuleSummary[] = [
  {
    id: 'pr-dhl-us-0-5',
    channelId: 'ch-dhl-hk',
    channelName: 'DHL HK',
    destinationCountry: '美国',
    minWeightKg: 0,
    maxWeightKg: 5,
    ratePerKg: 10,
    currency: 'USD',
    enabled: true
  }
];
const importedPriceBooks: PriceBookSummary[] = [];
const importedPriceRows: PriceBookRowSummary[] = [];
const backendSeedPriceRows: PriceBookRowSummary[] = [
  { id: 'price-a-la-0-1000', priceBookId: 'seed', agentName: 'a代理', carrierName: 'DHL', sourceSheetName: 'YY美西快线海卡渠道汇总', channelName: '海运洛杉矶专线', businessRouteName: 'HK-DHL', realChannelName: 'DHK03', destinationCountry: '美国', minWeightKg: 0, maxWeightKg: 1000, costPerKg: 18, currency: 'CNY', transitDays: 25, transitLabel: '22-28 天' },
  { id: 'price-a-houston-0-1000', priceBookId: 'seed', agentName: 'a代理', carrierName: 'DHL', sourceSheetName: 'YY美中快线海卡渠道汇总', channelName: '海运休斯顿专线', businessRouteName: 'HK-DHL', realChannelName: 'DHK01', destinationCountry: '美国', minWeightKg: 0, maxWeightKg: 1000, costPerKg: 19, currency: 'CNY', transitDays: 22, transitLabel: '20-25 天' },
  { id: 'price-a-air-la-0-1000', priceBookId: 'seed', agentName: 'a代理', carrierName: 'DHL', sourceSheetName: 'YY美西快线海卡渠道汇总', channelName: '空运洛杉矶专线', realChannelName: 'DHL-A', destinationCountry: '美国', minWeightKg: 0, maxWeightKg: 1000, costPerKg: 32, currency: 'CNY', transitDays: 7, transitLabel: '5-9 天' }
];
const agentMarkupRules: AgentMarkupSummary[] = [
  { id: 'markup-a', agentName: 'a代理', markupPerKg: 0.5, enabled: true },
  { id: 'markup-b', agentName: 'b代理', markupPerKg: 1, enabled: true },
  { id: 'markup-yiyang', agentName: '亿阳国际', markupPerKg: 0.5, enabled: true }
];
const warehousePackages: WarehousePackageSummary[] = [
  { id: 'wh-1399-1', customerCode: '1399', customerOrderNo: '1399', domesticTrackingNo: 'KY4001036478949', combinedOrderNo: '1399-KY4001036478949', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 10, packageCount: 1, weightKg: 14.2, lengthCm: 128, widthCm: 46, heightCm: 51, cbm: 0.300288, volumetricWeightKg: 50.05, chargeableWeightKg: 50.05, divisor: 6000, roundingRule: 'NONE', scanTime: '2026-06-08T10:07:28.000+08:00', status: 'RECEIVED', exceptions: ['部分到仓'], createdAt: '2026-06-08T10:07:28.000+08:00' },
  { id: 'wh-1399-2', customerCode: '1399', customerOrderNo: '1399', domesticTrackingNo: 'KY4001036478950', combinedOrderNo: '1399-KY4001036478950', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 10, packageCount: 1, weightKg: 13.8, lengthCm: 120, widthCm: 45, heightCm: 50, cbm: 0.27, volumetricWeightKg: 45, chargeableWeightKg: 45, divisor: 6000, roundingRule: 'NONE', scanTime: '2026-06-08T10:09:11.000+08:00', status: 'RECEIVED', exceptions: ['部分到仓'], createdAt: '2026-06-08T10:09:11.000+08:00' },
  { id: 'wh-1399-3', customerCode: '1399', customerOrderNo: '1399', domesticTrackingNo: 'KY4001036478951', combinedOrderNo: '1399-KY4001036478951', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 10, packageCount: 1, weightKg: 15.1, lengthCm: 126, widthCm: 47, heightCm: 52, cbm: 0.307944, volumetricWeightKg: 51.32, chargeableWeightKg: 51.32, divisor: 6000, roundingRule: 'NONE', scanTime: '2026-06-08T10:12:43.000+08:00', status: 'RECEIVED', exceptions: ['部分到仓'], createdAt: '2026-06-08T10:12:43.000+08:00' },
  { id: 'wh-p710-1', customerCode: 'P710', customerOrderNo: 'P710', domesticTrackingNo: '999056444656', combinedOrderNo: 'P710-999056444656', receivingChannel: '仓库接口返回', destinationCountry: '美国', expectedTotalPackageCount: 5, packageCount: 1, weightKg: 8.6, lengthCm: 90, widthCm: 40, heightCm: 42, cbm: 0.1512, volumetricWeightKg: 25.2, chargeableWeightKg: 25.2, divisor: 6000, roundingRule: 'NONE', scanTime: '2026-06-09T09:15:03.000+08:00', status: 'RECEIVED', exceptions: ['部分到仓'], createdAt: '2026-06-09T09:15:03.000+08:00' }
];
const masterData: MasterDataSnapshot = {
  customers: [{ id: 'c-9409', code: '9409', name: 'Daloday', shortName: 'Daloday', fullName: 'Daloday Inc.', customerType: '直客', salesperson: '何俊妮', enabled: true }],
  contacts: [{ id: 'cc-9409-main', customerId: 'c-9409', customerName: '9409-Daloday', name: 'Lina', phone: '13800000001', email: 'lina@example.com', enabled: true }],
  customerUsers: [{ id: 'u-customer', customerId: 'c-9409', customerName: '9409-Daloday', username: 'customer', enabled: true }],
  agents: [{ id: 'a-yuhuan', code: 'YH', shortName: '宇环', name: '深圳宇环', enabled: true }],
  carriers: [{ id: 'cr-dhl', name: 'DHL', enabled: true }],
  channels: [{ id: 'ch-dhl-hk', name: 'DHL HK', carrierId: 'cr-dhl', carrierName: 'DHL', enabled: true }],
  surcharges: [{ id: 'sc-remote', name: '偏远附加费', amount: 50, enabled: true }],
  fuelRates: [{ id: 'fr-dhl', channelId: 'ch-dhl-hk', channelName: 'DHL HK', rate: 0.15, activeAt: '2026-06-06T00:00:00.000Z' }],
  exchangeRates: [{ id: 'er-usd-cny', baseCurrency: 'USD', quoteCurrency: 'CNY', rate: 7.245, activeAt: '2026-06-06T00:00:00.000Z', enabled: true }],
  roles: ['ADMIN', 'WAREHOUSE', 'CUSTOMER']
};
const systemRoleMatrix = {
  availablePermissions: [
    { code: 'workspace:access', label: '运营工作台', group: '工作台' },
    { code: 'orders:read', label: '运单查看', group: '运单履约' },
    { code: 'orders:write', label: '运单操作', group: '运单履约' },
    { code: 'routing:read', label: '渠道排货查看', group: '渠道排货' },
    { code: 'routing:write', label: '渠道排货操作', group: '渠道排货' },
    { code: 'warehouse:read', label: '仓库查看', group: '仓库管理' },
    { code: 'warehouse:write', label: '仓库操作', group: '仓库管理' },
    { code: 'tracking:read', label: '轨迹查看', group: '轨迹监控' },
    { code: 'tracking:write', label: '轨迹操作', group: '轨迹监控' },
    { code: 'problems:read', label: '问题件查看', group: '问题件' },
    { code: 'problems:write', label: '问题件处理', group: '问题件' },
    { code: 'pricing:lookup', label: '报价查询', group: '报价查价' },
    { code: 'pricing:manage', label: '报价管理', group: '报价查价' },
    { code: 'finance:read', label: '财务查看', group: '财务结算' },
    { code: 'finance:settle', label: '财务核销', group: '财务结算' },
    { code: 'reports:read', label: '统计报表', group: '统计报表' },
    { code: 'master-data:read', label: '基础资料查看', group: '基础资料' },
    { code: 'master-data:write', label: '基础资料维护', group: '基础资料' },
    { code: 'system:manage', label: '系统设置', group: '系统设置' }
  ],
  roles: [
    {
      key: 'ADMIN',
      label: '系统管理员',
      account: 'admin',
      scope: '全局数据',
      permissions: ['workspace:access', 'orders:read', 'orders:write', 'routing:read', 'routing:write', 'warehouse:read', 'warehouse:write', 'tracking:read', 'tracking:write', 'problems:read', 'problems:write', 'pricing:lookup', 'pricing:manage', 'finance:read', 'finance:settle', 'reports:read', 'master-data:read', 'master-data:write', 'system:manage'],
      restriction: '全部权限'
    },
    {
      key: 'CUSTOMER_SERVICE',
      label: '客服',
      account: 'service',
      scope: '客户与问题件',
      permissions: ['workspace:access', 'orders:read', 'orders:write', 'tracking:read', 'tracking:write', 'problems:read', 'problems:write', 'pricing:lookup', 'master-data:read'],
      restriction: '不能核销、不能改系统权限'
    },
    {
      key: 'OPERATOR',
      label: '业务员',
      account: 'operator',
      scope: '客户出货与渠道排货',
      permissions: ['workspace:access', 'orders:read', 'orders:write', 'routing:read', 'routing:write', 'tracking:read', 'pricing:lookup', 'master-data:read'],
      restriction: '不能改财务、不能改权限'
    },
    {
      key: 'WAREHOUSE',
      label: '仓库',
      account: 'warehouse',
      scope: '入库、合票、打单、出货',
      permissions: ['workspace:access', 'orders:read', 'warehouse:read', 'warehouse:write', 'tracking:read'],
      restriction: '不能访问报价管理、财务和系统设置'
    },
    {
      key: 'FINANCE',
      label: '财务',
      account: 'finance',
      scope: '财务数据',
      permissions: ['workspace:access', 'orders:read', 'pricing:lookup', 'finance:read', 'finance:settle', 'reports:read', 'master-data:read'],
      restriction: '不能改系统权限'
    },
    {
      key: 'CUSTOMER',
      label: '客户',
      account: 'customer',
      scope: '本人客户数据',
      permissions: ['workspace:access', 'orders:read', 'orders:write', 'finance:read', 'problems:read', 'problems:write', 'pricing:lookup'],
      restriction: '客户门户、本人运单、本人费用、本人问题件'
    }
  ]
};

beforeEach(() => {
  localStorage.clear();
  employeeShipments.splice(
    0,
    employeeShipments.length,
    shipment('s-1', 'SYGJ06061230001', 'RCV-0606', 'WAITING_RECEIVE', '9409-Daloday'),
    shipment('s-3', 'SYGJ06061230003', 'LBL-0606-US', 'WAITING_DISPATCH', '9409-Daloday', { carrier: 'UPS', channelName: 'UPS 加美线', agentName: '加美代理' }),
    shipment('s-2', 'SYGJ05291344165', 'TILL-0529', 'WAITING_ONLINE', '1344-TILL', {
      transferNo: '9064656160',
      trackingStaleDays: 9,
      hasProblemTicket: true,
      dispatchedAt: '2026-06-02T10:00:00.000Z'
    })
  );
  customerShipments.splice(0, customerShipments.length, shipment('s-1', 'SYGJ06061230001', 'RCV-0606', 'WAITING_RECEIVE', '9409-Daloday', { transferNo: 'DHL26060600001', latestTracking: '已生成面单' }));
  shipmentLabels.splice(0, shipmentLabels.length, {
    id: 'lbl-s-3',
    shipmentId: 's-3',
    carrier: 'UPS',
    channelName: 'UPS 加美线',
    labelNo: 'LBL26060600001',
    transferNo: '1Z26060600001',
    labelUrl: '/mock-labels/LBL26060600001.pdf',
    status: 'CREATED',
    createdAt: '2026-06-06T10:00:00.000Z'
  });
  problemTickets.splice(0, problemTickets.length, {
    id: 'pt-1',
    shipmentId: 's-2',
    systemOrderNo: 'SYGJ05291344165',
    customerName: '1344-TILL',
    reason: '轨迹超过3天未更新',
    status: 'OPEN',
    customerVisible: true,
    createdAt: '2026-06-06T10:00:00Z',
    replies: []
  });
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
  masterData.customers.splice(0, masterData.customers.length, {
    id: 'c-9409',
    code: '9409',
    name: 'Daloday',
    shortName: 'Daloday',
    fullName: 'Daloday Inc.',
    customerType: '直客',
    salesperson: '何俊妮',
    enabled: true
  });
  masterData.contacts.splice(0, masterData.contacts.length, { id: 'cc-9409-main', customerId: 'c-9409', customerName: '9409-Daloday', name: 'Lina', phone: '13800000001', email: 'lina@example.com', enabled: true });
  masterData.customerUsers.splice(0, masterData.customerUsers.length, { id: 'u-customer', customerId: 'c-9409', customerName: '9409-Daloday', username: 'customer', enabled: true });
  masterData.agents.splice(0, masterData.agents.length, { id: 'a-yuhuan', code: 'YH', shortName: '宇环', name: '深圳宇环', enabled: true });
  masterData.carriers.splice(0, masterData.carriers.length, { id: 'cr-dhl', name: 'DHL', enabled: true });
  masterData.channels.splice(0, masterData.channels.length, { id: 'ch-dhl-hk', name: 'DHL HK', carrierId: 'cr-dhl', carrierName: 'DHL', enabled: true });
  masterData.surcharges.splice(0, masterData.surcharges.length, { id: 'sc-remote', name: '偏远附加费', amount: 50, enabled: true });
  masterData.fuelRates.splice(0, masterData.fuelRates.length, { id: 'fr-dhl', channelId: 'ch-dhl-hk', channelName: 'DHL HK', rate: 0.15, activeAt: '2026-06-06T00:00:00.000Z' });
  masterData.exchangeRates.splice(0, masterData.exchangeRates.length, { id: 'er-usd-cny', baseCurrency: 'USD', quoteCurrency: 'CNY', rate: 7.245, activeAt: '2026-06-06T00:00:00.000Z', enabled: true });
  pricingRules.splice(0, pricingRules.length, {
    id: 'pr-dhl-us-0-5',
    channelId: 'ch-dhl-hk',
    channelName: 'DHL HK',
    destinationCountry: '美国',
    minWeightKg: 0,
    maxWeightKg: 5,
    ratePerKg: 10,
    currency: 'USD',
    enabled: true
  });
  agentMarkupRules.splice(
    0,
    agentMarkupRules.length,
    { id: 'markup-a', agentName: 'a代理', markupPerKg: 0.5, enabled: true },
    { id: 'markup-b', agentName: 'b代理', markupPerKg: 1, enabled: true },
    { id: 'markup-yiyang', agentName: '亿阳国际', markupPerKg: 0.5, enabled: true }
  );
  warehousePackages.forEach((pkg) => {
    pkg.status = 'RECEIVED';
  });
  importedPriceBooks.splice(0, importedPriceBooks.length);
  importedPriceRows.splice(0, importedPriceRows.length);
  vi.stubGlobal('fetch', vi.fn(mockFetch));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('M1+M2 API-backed workspace', () => {
  it('logs in staff and loads API shipments into the existing workspace', async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('');
    await renderAndLogin('admin', 'admin123');

    expect(await screen.findByRole('heading', { name: 'AI 物流运营工作台' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '专线 3' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /快递/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /小包/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /已预报/ })).not.toBeInTheDocument();
    const staffMenuItems = screen.getAllByRole('menuitem').map((item) => item.textContent ?? '');
    expect(staffMenuItems.indexOf('渠道排货')).toBeLessThan(staffMenuItems.indexOf('仓库管理'));
    expect(screen.getByRole('button', { name: /专线运单池/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /AI 优先队列/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /产品地图/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /导入质检/ })).toBeInTheDocument();
    expect(screen.queryByText('全模块产品地图')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /产品地图/ }));
    expect(await screen.findByText('全模块产品地图')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /导入质检/ }));
    expect(await screen.findByText('智能导入质检')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /专线运单池/ }));
    expect(screen.getByText('SYGJ06061230001')).toBeInTheDocument();
    expect(screen.getAllByText('9409-Daloday').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2026-06-06 17:40:00').length).toBeGreaterThan(0);
    expect(screen.queryByText('2026-06-06T09:40:00.000Z')).not.toBeInTheDocument();
    const transferRow = screen.getByRole('row', { name: /SYGJ05291344165.*9064656160/ });
    await user.click(within(transferRow).getByRole('button', { name: 'Copy' }));
    expect(promptSpy).toHaveBeenCalledWith(expect.any(String), 'SYGJ05291344165\n9064656160');
  });

  it('calls the receive API and refreshes shipment state', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '运单履约' }));
    expect(screen.getByRole('button', { name: '新建出货订单' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '履约阶段看板' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /AI 履约助手/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /AI 履约助手/ }));
    expect(await screen.findByRole('region', { name: 'AI 履约助手' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /履约阶段看板/ }));
    expect(screen.queryByRole('button', { name: '新建预报' })).not.toBeInTheDocument();
    expect(screen.getAllByText('收款金额').length).toBeGreaterThan(0);
    expect(screen.getAllByText('收款方式').length).toBeGreaterThan(0);
    expect(screen.getAllByText('未知').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('$128.00')).not.toBeInTheDocument();
    expect(screen.queryByText('¥927.36')).not.toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /收\s*款/ })[0]);
    const paymentDialog = await screen.findByRole('dialog', { name: '登记收款金额' });
    expect(paymentDialog).toBeInTheDocument();
    await user.clear(within(paymentDialog).getByLabelText('收款金额 USD'));
    await user.type(within(paymentDialog).getByLabelText('收款金额 USD'), '258.5');
    await user.selectOptions(within(paymentDialog).getByLabelText('收款方式'), '阿里店铺');
    await user.click(within(paymentDialog).getByRole('button', { name: '确认收款' }));
    await screen.findByText('确认登记收款？');
    const confirmPaymentButtons = screen.getAllByRole('button', { name: '确认收款' });
    await user.click(confirmPaymentButtons[confirmPaymentButtons.length - 1]);
    expect(await screen.findByText('已登记收款 SYGJ06061230001：$258.50 / CNY 未知 / 阿里店铺')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '登记收款金额' })).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText('确认登记收款？')).not.toBeInTheDocument());
    expect(screen.getByText('$258.50')).toBeInTheDocument();
    expect(screen.getByText('CNY 未知')).toBeInTheDocument();
    expect(screen.getByText('阿里店铺')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '新建出货订单' }));
    expect(await screen.findByRole('dialog', { name: '新建出货订单' })).toBeInTheDocument();
    expect(screen.queryByLabelText('渠道')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('代理')).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText('客户单号'));
    await user.type(screen.getByLabelText('客户单号'), 'TEST-ORDER-001');
    await user.clear(screen.getByLabelText('系统单号'));
    await user.type(screen.getByLabelText('系统单号'), 'SYTEST0606001');
    await user.clear(screen.getByLabelText('目的地'));
    await user.type(screen.getByLabelText('目的地'), '德国');
    expect(screen.queryByLabelText('承运商')).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByLabelText('收货渠道').closest('.ant-select-selector')!);
    await user.click(await screen.findByTitle('海运DDP'));
    await user.type(screen.getByLabelText('备注'), '客户要求优先入库，周五前排货');
    await user.click(screen.getByRole('button', { name: '创建订单' }));
    expect(await screen.findByText('SYTEST0606001')).toBeInTheDocument();
    expect(screen.getAllByText('待获取转单号（快递号）').length).toBeGreaterThan(0);
    expect(screen.getAllByText('9409-Daloday').length).toBeGreaterThan(0);
    expect(screen.getByText('德国')).toBeInTheDocument();
    expect(screen.getAllByText('备注').length).toBeGreaterThan(0);
    expect(screen.getByText('客户要求优先入库，周五前排货')).toBeInTheDocument();
    expect(screen.getAllByText('海运DDP').length).toBeGreaterThan(0);
    expect(screen.getAllByText('待审核').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '审核通过' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '审核不通过' })).toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    expect(await screen.findByRole('heading', { name: '仓库管理中心' })).toBeInTheDocument();
    expect(screen.queryByText('SYTEST0606001')).not.toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: '运单履约' }));
    expect(await screen.findByText('SYTEST0606001')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '新建出货订单' }));
    expect(await screen.findByRole('dialog', { name: '新建出货订单' })).toBeInTheDocument();
    await user.clear(screen.getByLabelText('客户单号'));
    await user.type(screen.getByLabelText('客户单号'), 'CUSTOM-CHANNEL-001');
    await user.clear(screen.getByLabelText('系统单号'));
    await user.type(screen.getByLabelText('系统单号'), 'SYCUSTOM0606001');
    await user.click(screen.getByRole('button', { name: '创建订单' }));
    expect(await screen.findByText('SYCUSTOM0606001')).toBeInTheDocument();
    expect(screen.getAllByText('快递').length).toBeGreaterThan(0);
    const createdOrderRow = screen.getByRole('row', { name: /SYTEST0606001/ });
    expect(within(createdOrderRow).getByRole('button', { name: '审核通过' })).toBeInTheDocument();
    expect(within(createdOrderRow).getByRole('button', { name: '审核不通过' })).toBeInTheDocument();
    await user.click(within(createdOrderRow).getByRole('button', { name: '审核通过' }));
    expect(await screen.findByText('确认审核通过？')).toBeInTheDocument();
    expect(screen.queryByText('已审核通过，进入已入库队列')).not.toBeInTheDocument();
    await user.click(within(screen.getByRole('tooltip')).getByRole('button', { name: /^取\s*消$/ }));
    expect(screen.getAllByText('待审核').length).toBeGreaterThan(0);
    await user.click(within(createdOrderRow).getByRole('button', { name: '审核通过' }));
    await user.click(within(await screen.findByRole('tooltip')).getByRole('button', { name: '审核通过' }));
    expect(await screen.findByText('已审核通过，进入已入库队列')).toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    expect((await screen.findAllByText('SYTEST0606001')).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('menuitem', { name: '运单履约' }));

    expect(screen.queryByText('待预报')).not.toBeInTheDocument();
    expect(screen.queryByText('货物到仓信息')).not.toBeInTheDocument();
    expect(screen.queryByText('渠道/代理分配')).not.toBeInTheDocument();
    expect(screen.queryByText('出库确认')).not.toBeInTheDocument();
    expect(screen.queryByText('轨迹跟进')).not.toBeInTheDocument();
    expect(screen.getByText('新建出货订单待确认')).toBeInTheDocument();
    expect(screen.getByText('已登记收款金额或方式')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '已预报 1' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /已入库/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /待排货/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /待发货/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /待上网/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /待签收/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /退货\/滞留/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /审核通过 \d+/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /审核不通过 \d+/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /审核通过 \d+/ }));
    expect(screen.getAllByText('时效').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /全部/ }));
    expect(screen.getByText('在途 4 天')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /审核通过 \d+/ }));
    expect(screen.getAllByText('已通过').length).toBeGreaterThan(0);
  });

  it('only shows fulfillment action buttons when the shipment status can execute them', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '运单履约' }));

    expect(await screen.findByRole('heading', { name: '运单履约中心' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '确认收货' })).not.toBeInTheDocument();
    const approvedRow = screen.getByRole('row', { name: /SYGJ06061230001/ });
    expect(within(approvedRow).getByText('已通过')).toBeInTheDocument();
    expect(within(approvedRow).getByRole('button', { name: '收 款' })).toBeInTheDocument();
    expect(within(approvedRow).getByRole('button', { name: '操作日志' })).toBeInTheDocument();
    expect(within(approvedRow).getByRole('button', { name: /删\s*除/ })).toBeInTheDocument();
    expect(within(approvedRow).queryByRole('button', { name: '修 改' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /SYGJ06061230003/ })).queryByRole('button', { name: '确认收货' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /SYGJ05291344165/ })).queryByRole('button', { name: '确认收货' })).not.toBeInTheDocument();
    expect(screen.getAllByText('已通过').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: '分配渠道' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '标记退货' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '创建问题件' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '填写转单号' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '确认发货' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '添加轨迹' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '批量添加轨迹' })).not.toBeInTheDocument();
  });

  it('lets staff reject a pending fulfillment review with confirmation', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '运单履约' }));
    await user.click(screen.getByRole('button', { name: '新建出货订单' }));
    expect(await screen.findByRole('dialog', { name: '新建出货订单' })).toBeInTheDocument();
    await user.clear(screen.getByLabelText('客户单号'));
    await user.type(screen.getByLabelText('客户单号'), 'REJECT-ORDER-001');
    await user.clear(screen.getByLabelText('系统单号'));
    await user.type(screen.getByLabelText('系统单号'), 'SYREJECT0606001');
    await user.click(screen.getByRole('button', { name: '创建订单' }));

    const reviewRow = await screen.findByRole('row', { name: /SYREJECT0606001/ });
    await user.click(within(reviewRow).getByRole('button', { name: '审核不通过' }));
    expect(await screen.findByText('确认审核不通过？')).toBeInTheDocument();
    expect(screen.queryByText('已审核不通过，等待业务员修改资料')).not.toBeInTheDocument();
    await user.click(within(await screen.findByRole('tooltip')).getByRole('button', { name: '审核不通过' }));

    expect(await screen.findByText('已审核不通过，等待业务员修改资料')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /审核不通过 \d+/ }));
    const rejectedRow = await screen.findByRole('row', { name: /SYREJECT0606001/ });
    expect(within(rejectedRow).getByText('未通过')).toBeInTheDocument();
    expect(within(rejectedRow).queryByRole('button', { name: '审核通过' })).not.toBeInTheDocument();
  });

  it('lets staff persistently delete an outdated fulfillment shipment from the backend board', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '运单履约' }));
    const targetRow = screen.getByRole('row', { name: /SYGJ06061230003/ });

    await user.click(within(targetRow).getByRole('button', { name: /删\s*除/ }));
    expect(await screen.findByText('确认删除该运单？')).toBeInTheDocument();
    expect(screen.getByText('SYGJ06061230003')).toBeInTheDocument();
    const confirmDeleteButtons = screen.getAllByRole('button', { name: /^删\s*除$/ });
    await user.click(confirmDeleteButtons[confirmDeleteButtons.length - 1]);

    expect(await screen.findByText('已人工删除运单 SYGJ06061230003')).toBeInTheDocument();
    expect(screen.queryByText('SYGJ06061230003')).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/shipments/s-3'),
      expect.objectContaining({ method: 'DELETE' })
    );
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
      { menu: '仓库管理', heading: '仓库管理中心', record: '入库收货' },
      { menu: '渠道排货', heading: '渠道排货中心', record: 'UPS 加美线' },
      { menu: '轨迹监控', heading: '轨迹监控中心', record: '9064656160' },
      { menu: '问题件中心', heading: '问题件中心', record: '轨迹超过3天未更新' },
      { menu: '报价查价', heading: '报价查价中心', record: '查价' },
      { menu: '财务结算', heading: '财务结算中心', record: '基础运费' },
      { menu: '统计报表', heading: '统计报表中心', record: '日报-2026-06-06' },
      { menu: '基础资料', heading: '基础资料中心', record: '9409' },
      { menu: '系统设置', heading: '系统设置中心', record: '管理员' }
    ];

    for (const item of moduleExpectations) {
      await user.click(screen.getByRole('menuitem', { name: item.menu }));
      expect(await screen.findByRole('heading', { name: item.heading })).toBeInTheDocument();
      expect(screen.getAllByText(item.record, { exact: false }).length).toBeGreaterThan(0);
    }

    await user.click(screen.getByRole('menuitem', { name: '渠道排货' }));
    expect(screen.queryByText('核心能力')).not.toBeInTheDocument();
    expect(screen.queryByText('功能点')).not.toBeInTheDocument();
    expect(screen.queryByText('查询、筛选、批量处理、状态记录')).not.toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: '轨迹监控' }));
    expect(screen.queryByText('客户可见轨迹')).not.toBeInTheDocument();
  });

  it('imports agent price sheets and quotes with markup rules on the pricing page', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));

    expect((await screen.findAllByText('查价')).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /代理加价规则/ }));
    expect(screen.getAllByText('a代理').length).toBeGreaterThan(0);
    expect(screen.getByText('业务员加价')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^查价/ }));

    expect(screen.getByLabelText('亚马逊代码')).toHaveValue('AMZ-US-001');
    expect(screen.getByLabelText('品名')).toHaveValue('桌子，椅子');
    expect(screen.getByLabelText('邮编')).toHaveValue('60750');
    expect(screen.getByLabelText('地址')).toHaveValue('France 549 rue du maubon Choisy au bac');
    expect(screen.getByLabelText('数据/包装（可选）')).toBeInTheDocument();
    expect(screen.queryByLabelText('渠道')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('代理')).not.toBeInTheDocument();
    expect(screen.getByText('自动计费重')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('方数 CBM'));
    await user.type(screen.getByLabelText('方数 CBM'), '5');
    expect(await screen.findByText('835 KG')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '查价查询' }));
    expect(await screen.findByText('报价 ¥15447.50')).toBeInTheDocument();
    expect(screen.getByText('亚马逊代码：AMZ-US-001')).toBeInTheDocument();
    expect(screen.getByText('品名：桌子，椅子')).toBeInTheDocument();
    expect(screen.getByText('邮编：60750')).toBeInTheDocument();
    expect(screen.getByText('推荐渠道：海运洛杉矶专线')).toBeInTheDocument();
    expect(screen.getByText('重量段：0-1000kg')).toBeInTheDocument();
    expect(screen.getByText('得出总价：¥15447.50')).toBeInTheDocument();
    expect(screen.getByText('单价：¥18.5/kg')).toBeInTheDocument();
    expect(screen.getByText('最便宜 Top3')).toBeInTheDocument();
    expect(screen.getByText('最快 Top3')).toBeInTheDocument();
    expect(screen.queryByText('有备注')).not.toBeInTheDocument();

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ['代理', '渠道', '目的地', '最小重量', '最大重量', '成本单价', '币种', '备注'],
      ['c代理', 'FedEx 促销', '美国', 0, 1000, 16, 'CNY', '导入原始备注：超长件需要单询']
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, '价格表');
    const summarySheet = XLSX.utils.aoa_to_sheet([
      ['对应渠道', '仓库编码', '12KG+', '51KG+', '100kg+', '按方包税（1CBM+）', '参考时效'],
      ['海运休斯顿专线', 'HOU8', 12, 11, 10, 1900, '25天']
    ]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, '卡派价格汇总表');
    const fileData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
    const file = new File([fileData], 'agent-price.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    expect(screen.queryByLabelText('导入价格表')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /价格表管理/ }));
    await user.upload(screen.getByLabelText('增加价格表'), file);
    expect(await screen.findByText('已导入价格表 agent-price.xlsx，新增 1 条代理成本价')).toBeInTheDocument();
    expect(screen.getByText('未填写')).toBeInTheDocument();
    expect(screen.queryByText('导入原始备注：超长件需要单询')).not.toBeInTheDocument();
    await user.click(screen.getByText('agent-price.xlsx'));
    await user.click(screen.getByRole('button', { name: '修改备注' }));
    const priceBookRemarkDialog = await screen.findByRole('dialog', { name: '修改价格表备注' });
    await user.clear(within(priceBookRemarkDialog).getByLabelText('备注'));
    await user.type(within(priceBookRemarkDialog).getByLabelText('备注'), '亿阳国际渠道报价备注：实重 30-45KG 加 1元/KG，超长件单询');
    await user.click(within(priceBookRemarkDialog).getByRole('button', { name: /保\s*存/ }));
    expect(await screen.findByText('agent-price.xlsx 备注已更新')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /代理加价规则/ }));
    const markupRuleCard = screen
      .getAllByText('代理加价规则')
      .find((element) => element.classList.contains('ant-card-head-title'))
      ?.closest('.ant-card');
    expect(markupRuleCard).not.toBeNull();
    await user.click(within(markupRuleCard as HTMLElement).getByRole('button', { name: /^增\s*加$/ }));
    const createMarkupDialog = await screen.findByRole('dialog', { name: '新增代理加价' });
    await user.type(within(createMarkupDialog).getByLabelText('代理'), 'c代理');
    await user.clear(within(createMarkupDialog).getByLabelText('业务员加价 / kg'));
    await user.type(within(createMarkupDialog).getByLabelText('业务员加价 / kg'), '2');
    await user.click(screen.getByRole('button', { name: /保\s*存/ }));
    expect(await screen.findByText('c代理 加价规则已新增：+¥2.00/kg')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^查价/ }));
    await user.click(screen.getByRole('button', { name: '查价查询' }));
    expect(await screen.findByText('报价 ¥15030.00')).toBeInTheDocument();
    expect(screen.getAllByText('有备注').length).toBeGreaterThan(0);
    await user.click(screen.getAllByText('有备注')[0]);
    const detailDialog = await screen.findByRole('dialog', { name: '报价详情' });
    expect(within(detailDialog).getByText('完整备注')).toBeInTheDocument();
    expect(within(detailDialog).getByText(/亿阳国际渠道报价备注/)).toBeInTheDocument();
    expect(within(detailDialog).getByText('代理成本单价')).toBeInTheDocument();
    expect(within(detailDialog).getByText('毛利')).toBeInTheDocument();
    await user.click(within(detailDialog).getByRole('button', { name: /关\s*闭/ }));

    await user.click(screen.getByRole('button', { name: /代理加价规则/ }));
    const currentMarkupRuleCard = screen
      .getAllByText('代理加价规则')
      .find((element) => element.classList.contains('ant-card-head-title'))
      ?.closest('.ant-card');
    expect(currentMarkupRuleCard).not.toBeNull();
    const cRuleRow = within(currentMarkupRuleCard as HTMLElement).getByRole('row', { name: /c代理.*¥2\.00\/kg/ });
    await user.click(within(cRuleRow).getByRole('radio'));
    await user.click(within(currentMarkupRuleCard as HTMLElement).getByRole('button', { name: /^修\s*改$/ }));
    const editMarkupDialog = await screen.findByRole('dialog', { name: '修改代理加价' });
    await user.clear(within(editMarkupDialog).getByLabelText('业务员加价 / kg'));
    await user.type(within(editMarkupDialog).getByLabelText('业务员加价 / kg'), '1');
    await user.click(screen.getByRole('button', { name: /保\s*存/ }));
    expect(await screen.findByText('c代理 加价规则已更新：+¥1.00/kg')).toBeInTheDocument();

    const updatedCRuleRow = within(currentMarkupRuleCard as HTMLElement).getByRole('row', { name: /c代理.*¥1\.00\/kg/ });
    await user.click(within(updatedCRuleRow).getByRole('radio'));
    await user.click(screen.getByRole('button', { name: /^删\s*除$/ }));
    expect(await screen.findByText('确认停用该加价规则？')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认停用' }));
    expect(await screen.findByText('c代理 加价规则已停用')).toBeInTheDocument();
  });

  it('persists imported price books through the backend and deletes their imported rows', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    expect((await screen.findAllByText('查价')).length).toBeGreaterThan(0);

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ['代理', '渠道', '目的地', '最小重量', '最大重量', '成本单价', '币种', '参考时效'],
      ['persist代理', '持久测试渠道', '美国', 0, 10, 17, 'CNY', '3天']
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, '价格表');
    const fileData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
    const file = new File([fileData], 'persist-price.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    await user.click(screen.getByRole('button', { name: /价格表管理/ }));
    await user.upload(screen.getByLabelText('增加价格表'), file);
    expect(await screen.findByText('已导入价格表 persist-price.xlsx，新增 1 条代理成本价')).toBeInTheDocument();
    expect(screen.getByText('persist-price.xlsx')).toBeInTheDocument();
    expect(screen.queryByText('代理成本价台账')).not.toBeInTheDocument();

    cleanup();
    localStorage.removeItem('siyuan-session');
    await renderAndLogin('admin', 'admin123');
    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    await user.click(await screen.findByRole('button', { name: /价格表管理/ }));
    expect(await screen.findByText('persist-price.xlsx')).toBeInTheDocument();
    expect(screen.queryByText('代理成本价台账')).not.toBeInTheDocument();

    await user.click(screen.getByText('persist-price.xlsx'));
    await user.click(screen.getByRole('button', { name: '删除价格表' }));
    expect(await screen.findByText('确认删除该价格表？')).toBeInTheDocument();
    const confirmDeletePriceBookButtons = screen.getAllByRole('button', { name: '删除价格表' });
    await user.click(confirmDeletePriceBookButtons[confirmDeletePriceBookButtons.length - 1]);

    expect(await screen.findByText('已删除价格表 persist-price.xlsx')).toBeInTheDocument();
    expect(screen.queryByText('persist-price.xlsx')).not.toBeInTheDocument();
    expect(screen.queryByText('persist代理')).not.toBeInTheDocument();
  });

  it('shows matched pricing channel by role without asking users to choose it', async () => {
    const user = userEvent.setup();
    await renderAndLogin('operator', 'operator123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    expect(await screen.findByRole('heading', { name: '报价查价中心' })).toBeInTheDocument();
    expect(screen.queryByLabelText('渠道')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '查价查询' }));
    expect(await screen.findByText('推荐渠道：海运洛杉矶专线')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/pricing/lookup'), expect.anything());
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/pricing/books'), expect.anything());
    expect(screen.getByText('美国 / 海运洛杉矶专线')).toBeInTheDocument();
    expect(screen.queryByText('报价结果明细')).not.toBeInTheDocument();
    expect(screen.getAllByText(/渠道报价表：/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('渠道报价表：DHK03').length).toBeGreaterThan(0);
    expect(screen.queryByText(/代理加价/)).not.toBeInTheDocument();
    expect(screen.queryByText('代理加价规则')).not.toBeInTheDocument();
    expect(screen.queryByText('业务员加价')).not.toBeInTheDocument();
    expect(screen.queryByText(/毛利/)).not.toBeInTheDocument();
    expect(screen.queryByText(/代理成本/)).not.toBeInTheDocument();
    expect(screen.queryByText(/成本合计/)).not.toBeInTheDocument();
    expect(screen.getAllByText('单价 ¥18.5/kg').length).toBeGreaterThan(0);

    cleanup();
    localStorage.clear();
    await renderAndLogin('admin', 'admin123');
    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    expect(await screen.findByRole('heading', { name: '报价查价中心' })).toBeInTheDocument();
    expect(screen.queryByLabelText('渠道')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '查价查询' }));
    expect(await screen.findByText('推荐渠道：海运洛杉矶专线')).toBeInTheDocument();
    expect(screen.queryByText('报价结果明细')).not.toBeInTheDocument();
    expect(screen.getAllByText('渠道报价表：DHK03').length).toBeGreaterThan(0);
    expect(screen.getByText('代理加价：+¥0.50/kg')).toBeInTheDocument();
    expect(screen.getByText('代理加价规则')).toBeInTheDocument();
    expect(screen.getAllByText(/毛利/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('代理成本单价 ¥18/kg').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/单价 ¥18\.5\/kg，毛利/).length).toBeGreaterThan(0);
  });

  it('keeps pricing results focused by hiding agent error and unmapped route alert blocks', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    expect(await screen.findByRole('heading', { name: '报价查价中心' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '查价查询' }));

    expect(await screen.findByText('最便宜 Top3')).toBeInTheDocument();
    expect(screen.queryByText('报价结果明细')).not.toBeInTheDocument();
    expect(screen.queryByText('代理异常')).not.toBeInTheDocument();
    expect(screen.queryByText('BSD (0) Token不正确')).not.toBeInTheDocument();
    expect(screen.getAllByText('渠道报价表：DHK03').length).toBeGreaterThan(0);
    expect(screen.getAllByText('渠道报价表：DHK01').length).toBeGreaterThan(0);
    expect(screen.queryByText('该报价渠道尚未绑定内部承运路线，请维护渠道映射后再用于正式下单。')).not.toBeInTheDocument();
    expect(screen.getAllByText('a代理').length).toBeGreaterThan(0);
    expect(screen.getAllByText('¥15447.50').length).toBeGreaterThan(0);
  });

  it('keeps agent markup rules and price book management admin-only on pricing page', async () => {
    const nonAdminAccounts = [
      { username: 'service', password: 'service123' },
      { username: 'operator', password: 'operator123' },
      { username: 'finance', password: 'finance123' }
    ];

    for (const account of nonAdminAccounts) {
      const user = userEvent.setup();
      await renderAndLogin(account.username, account.password);
      await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
      expect(await screen.findByRole('heading', { name: '报价查价中心' })).toBeInTheDocument();
      expect(screen.queryByText('代理加价规则')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^增\s*加$/ })).not.toBeInTheDocument();
      expect(screen.queryByText('价格表管理')).not.toBeInTheDocument();
      expect(screen.queryByText('代理成本价台账')).not.toBeInTheDocument();
      cleanup();
      localStorage.clear();
    }

    const admin = userEvent.setup();
    await renderAndLogin('admin', 'admin123');
    await admin.click(screen.getByRole('menuitem', { name: '报价查价' }));
    expect(await screen.findByRole('heading', { name: '报价查价中心' })).toBeInTheDocument();
    expect(screen.getAllByText('代理加价规则').length).toBeGreaterThan(0);
    await admin.click(screen.getByRole('button', { name: /代理加价规则/ }));
    expect(screen.getByRole('button', { name: /^增\s*加$/ })).toBeInTheDocument();
    await admin.click(screen.getByRole('button', { name: /价格表管理/ }));
    expect(screen.getAllByText('价格表管理').length).toBeGreaterThan(0);
    expect(screen.queryByText('代理成本价台账')).not.toBeInTheDocument();
  });

  it('lets admins revise a saved line-specific markup from channel details', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    await user.click(await screen.findByRole('button', { name: /代理加价规则/ }));
    const markupRuleCard = screen
      .getAllByText('代理加价规则')
      .find((element) => element.classList.contains('ant-card-head-title'))
      ?.closest('.ant-card');
    expect(markupRuleCard).not.toBeNull();
    const aRuleRow = within(markupRuleCard as HTMLElement).getByRole('row', { name: /a代理.*全部渠道.*¥0\.50\/kg/ });
    await user.click(within(aRuleRow).getByRole('radio'));
    await user.click(within(markupRuleCard as HTMLElement).getByRole('button', { name: /^增\s*加$/ }));
    const createDialog = await screen.findByRole('dialog', { name: '新增代理加价' });
    await user.type(within(createDialog).getByLabelText('代理'), 'a代理');
    await user.type(within(createDialog).getByLabelText('渠道（可选）'), '海运洛杉矶专线');
    await user.type(within(createDialog).getByLabelText('线路自定义（可选）'), 'DHK03');
    await user.type(within(createDialog).getByLabelText('国家（可选）'), '美国');
    await user.clear(within(createDialog).getByLabelText('业务员加价 / kg'));
    await user.type(within(createDialog).getByLabelText('业务员加价 / kg'), '2.5');
    await user.click(within(createDialog).getByRole('button', { name: /保\s*存/ }));
    expect(await screen.findByText('a代理 加价规则已新增：+¥2.50/kg')).toBeInTheDocument();

    const lineRuleRow = within(markupRuleCard as HTMLElement).getByRole('row', { name: /a代理.*海运洛杉矶专线.*DHK03.*¥2\.50\/kg/ });
    await user.click(within(lineRuleRow).getByRole('radio'));
    await user.click(within(markupRuleCard as HTMLElement).getByRole('button', { name: '查看线路' }));

    const detailDialog = await screen.findByRole('dialog', { name: 'a代理 渠道线路详情' });
    const updatedDhlRow = within(detailDialog).getByRole('row', { name: /DHK03.*¥2\.50\/kg/ });
    await user.click(within(updatedDhlRow).getByRole('button', { name: '修改加价' }));
    const editDialog = await screen.findByRole('dialog', { name: '修改代理加价' });
    await user.clear(within(editDialog).getByLabelText('业务员加价 / kg'));
    await user.type(within(editDialog).getByLabelText('业务员加价 / kg'), '3');
    await user.click(within(editDialog).getByRole('button', { name: /保\s*存/ }));
    expect(await screen.findByText('a代理 加价规则已更新：+¥3.00/kg')).toBeInTheDocument();
    expect(within(markupRuleCard as HTMLElement).getByRole('row', { name: /a代理.*海运洛杉矶专线.*DHK03.*¥3\.00\/kg/ })).toBeInTheDocument();
  });

  it('batch applies markup to filtered sheet lines in channel details', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    await user.click(await screen.findByRole('button', { name: /代理加价规则/ }));
    const markupRuleCard = screen
      .getAllByText('代理加价规则')
      .find((element) => element.classList.contains('ant-card-head-title'))
      ?.closest('.ant-card');
    expect(markupRuleCard).not.toBeNull();
    const aRuleRow = within(markupRuleCard as HTMLElement).getByRole('row', { name: /a代理.*全部渠道.*¥0\.50\/kg/ });
    await user.click(within(aRuleRow).getByRole('radio'));
    await user.click(within(markupRuleCard as HTMLElement).getByRole('button', { name: '查看线路' }));

    const detailDialog = await screen.findByRole('dialog', { name: 'a代理 渠道线路详情' });
    expect(within(detailDialog).getAllByText('基准 +¥0.50/kg').length).toBeGreaterThan(0);
    await user.selectOptions(within(detailDialog).getByLabelText('按小表筛选线路'), 'DHL HK');
    expect(within(detailDialog).getAllByRole('row', { name: /DHL HK/ }).length).toBeGreaterThan(0);
    expect(within(detailDialog).queryByText('DHK03')).not.toBeInTheDocument();
    await user.selectOptions(within(detailDialog).getByLabelText('按小表筛选线路'), 'YY美西快线海卡渠道汇总');
    await user.clear(within(detailDialog).getByLabelText('批量业务员加价 / kg'));
    await user.type(within(detailDialog).getByLabelText('批量业务员加价 / kg'), '1.8');
    await user.click(within(detailDialog).getByRole('button', { name: '批量统一加价' }));

    expect(await screen.findByText('已为 2 条 YY美西快线海卡渠道汇总 线路统一设置 +¥1.80/kg')).toBeInTheDocument();
    expect(within(detailDialog).getByRole('row', { name: /DHK03.*¥1\.80\/kg.*修改加价/ })).toBeInTheDocument();
    expect(within(detailDialog).getByRole('row', { name: /DHL-A.*¥1\.80\/kg.*修改加价/ })).toBeInTheDocument();
    expect(within(detailDialog).queryByText('DHK01')).not.toBeInTheDocument();
  });

  it('imports original sheet transit labels and hides unified channel wording in line details', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    const workbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.aoa_to_sheet([
      ['FBA 仓库代码（右侧红框输入仓库代码查找价格）', '', '', '', '', '', '', 'ONT8'],
      ['收货仓点', '义乌仓', '', '', '深圳（福永/龙岗）仓/广州仓', '', '', '参考时效（不做赔付使用，仅供参考）'],
      ['对应渠道', '12KG+', '51KG+', '100KG+', '12KG+', '51KG+', '100KG+', '参考时效（不做赔付使用，仅供参考）'],
      ['YY美西特惠海卡', 5, 5, '/', 5.5, 4.5, '/', '24-26天左右']
    ]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, '海卡快速查询');
    const fileData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
    const file = new File([fileData], 'origin-transit-price.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    await user.click(screen.getByRole('button', { name: /价格表管理/ }));
    await user.upload(screen.getByLabelText('增加价格表'), file);
    expect(await screen.findByText('已导入价格表 origin-transit-price.xlsx，新增 4 条代理成本价')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /代理加价规则/ }));
    const markupRuleCard = screen
      .getAllByText('代理加价规则')
      .find((element) => element.classList.contains('ant-card-head-title'))
      ?.closest('.ant-card');
    expect(markupRuleCard).not.toBeNull();
    const yiYangRuleRow = within(markupRuleCard as HTMLElement).getByRole('row', { name: /亿阳国际.*¥0\.50\/kg/ });
    await user.click(within(yiYangRuleRow).getByRole('radio'));
    await user.click(within(markupRuleCard as HTMLElement).getByRole('button', { name: '查看线路' }));

    const detailDialog = await screen.findByRole('dialog', { name: '亿阳国际 渠道线路详情' });
    expect(within(detailDialog).queryByText('统一渠道')).not.toBeInTheDocument();
    expect(within(detailDialog).getAllByText('24-26天左右').length).toBeGreaterThan(0);
  });

  it('shows receivables and creates customer statement drafts on the finance page', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '财务结算' }));
    expect(await screen.findByText('基础运费')).toBeInTheDocument();
    expect(screen.getByText('¥200.00')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '生成 9409 对账单' }));

    await user.click(screen.getByRole('button', { name: /客户对账单/ }));
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
    await user.click(screen.getByRole('button', { name: /账户流水/ }));
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

  it('prints warehouse outbound labels after consolidation and dispatches them from the label queue', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    expect(await screen.findByRole('heading', { name: '仓库管理中心' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /合票出货/ }));
    await user.type(screen.getByLabelText('合票包裹搜索'), '1399');

    for (const checkbox of screen.getAllByRole('checkbox', { name: /1399-KY40010364789/ })) {
      await user.click(checkbox);
    }
    await user.click(screen.getByRole('button', { name: '合并包裹出货' }));
    expect(await screen.findByText('已合并 3 个入库包裹并生成出货单 1399-OUT001')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /面单队列/ }));
    expect(screen.getByText('1399-OUT001')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '申请面单' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '确认收货' })).not.toBeInTheDocument();
    const consolidationQueueRow = screen.getByRole('row', { name: /1399-OUT001/ });

    await user.click(within(consolidationQueueRow).getByRole('button', { name: '打单' }));
    expect(await screen.findByText('已生成 1399-OUT001 面单 3 张')).toBeInTheDocument();
    expect(screen.getAllByText('内部交货面单').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^A\d{6}$/).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/条形码 A\d{6}/).length).toBeGreaterThan(0);
    expect(screen.getByText('1/3')).toBeInTheDocument();
    expect(screen.getByText('3/3')).toBeInTheDocument();
    expect(screen.getAllByText('美国').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1399-OUT001').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /收货交接单/ }));
    expect(screen.getByRole('button', { name: '下载 Word' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '导出 PDF' })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /1399-OUT001/ })).toBeInTheDocument();
    expect(screen.getByText('合票待出货')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /面单队列/ }));
    const refreshedConsolidationQueueRow = screen.getByRole('row', { name: /1399-OUT001/ });

    await user.click(within(refreshedConsolidationQueueRow).getByRole('button', { name: '出货' }));
    expect(await screen.findByText('确认出货？')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认出货' }));
    expect(await screen.findByText('已出货 1399-OUT001')).toBeInTheDocument();
  });

  it('supports warehouse receiving measurement validation and manual package consolidation', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));

    expect(await screen.findByRole('heading', { name: '仓库管理中心' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /入库收货/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^包裹明细/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /合票出货/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /面单队列/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /收货交接单/ })).toBeInTheDocument();
    expect(screen.queryByText('文档覆盖样例')).not.toBeInTheDocument();
    expect(screen.queryByText('路由归属确认')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('国内快递号/箱号'), 'SF000001');
    await user.type(screen.getByLabelText('入仓号'), 'WH-A-001');
    await user.clear(screen.getByLabelText('重量 kg'));
    await user.type(screen.getByLabelText('重量 kg'), '10');
    await user.clear(screen.getByLabelText('长 cm'));
    await user.type(screen.getByLabelText('长 cm'), '100');
    await user.clear(screen.getByLabelText('宽 cm'));
    await user.type(screen.getByLabelText('宽 cm'), '50');
    await user.clear(screen.getByLabelText('高 cm'));
    await user.type(screen.getByLabelText('高 cm'), '40');
    await user.click(screen.getByRole('button', { name: '新增包裹明细' }));

    expect((await screen.findAllByText('RCV-0606-SF000001')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('40.00').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /合票出货/ }));
    expect(await screen.findByText('可合并包裹')).toBeInTheDocument();
    expect(screen.getByLabelText('合票包裹搜索')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1399-KY4001036478949').length).toBeGreaterThan(0);
    await user.type(screen.getByLabelText('合票包裹搜索'), '1399');

    const warehouse1399Checks = screen.getAllByRole('checkbox', {
      name: /1399-KY40010364789/
    }).slice(0, 2);
    for (const checkbox of warehouse1399Checks) {
      await user.click(checkbox);
    }
    expect(screen.getByRole('button', { name: '合并包裹' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '合并包裹出货' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '合并包裹' }));

    expect(await screen.findByText('已合并 2 个入库包裹，暂不出货')).toBeInTheDocument();
    expect(screen.getByText('合票记录')).toBeInTheDocument();
    expect(screen.getByText(/2 个包裹/)).toBeInTheDocument();
    expect(screen.getByText('仅合并')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '查看明细' }));

    expect(await screen.findByText('合票包裹明细')).toBeInTheDocument();
    expect(screen.getByText('1399-MERGE001')).toBeInTheDocument();
    expect(screen.getAllByText('1399-KY4001036478949').length).toBeGreaterThan(0);
    expect(screen.getAllByText('API仓库-1399').length).toBeGreaterThan(0);
  });

  it('shows API warehouse package rows from real scan test data with partial inbound progress', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    expect(await screen.findByRole('heading', { name: '仓库管理中心' })).toBeInTheDocument();

    expect(screen.getByText('API 包裹数据明细')).toBeInTheDocument();
    expect(screen.getAllByText('仓库接口返回').length).toBeGreaterThan(0);
    expect(screen.queryByText('导入仓库 XLS')).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '目的国家' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '入仓号' })).not.toBeInTheDocument();
    expect(screen.getAllByText('1399-KY4001036478949').length).toBeGreaterThan(0);
    expect(screen.getAllByText('已到 3/10').length).toBeGreaterThan(0);
    expect(screen.getAllByText('部分到仓 3/10').length).toBeGreaterThan(0);
    expect(screen.getByText('2026-06-08 10:07:28')).toBeInTheDocument();
    expect(screen.getByText('0.300288')).toBeInTheDocument();
    expect(screen.getAllByText('50.05').length).toBeGreaterThan(0);
    expect(screen.getAllByText('P710-999056444656').length).toBeGreaterThan(0);
  });

  it('filters warehouse package details by customer order and shows only remaining packages', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    expect(await screen.findByRole('heading', { name: '仓库管理中心' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^包裹明细/ }));
    await user.type(screen.getByLabelText('客户单号精确查询'), '1399');

    expect(await screen.findByText('客户单号 1399：应到 10 件，已处理 3 件，剩余 7 件')).toBeInTheDocument();
    expect(screen.getByText('剩余第 4 件')).toBeInTheDocument();
    expect(screen.getByText('剩余第 10 件')).toBeInTheDocument();
    expect(screen.queryByText('KY4001036478949')).not.toBeInTheDocument();
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
    expect(screen.getAllByText('SYGJ06061230003').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: '同步轨迹' }));
    expect(await screen.findByText('轨迹同步成功：DHL 已揽收 9064656160')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /最新轨迹/ }));
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
    expect(screen.getAllByText('warehouse').length).toBeGreaterThan(0);
    expect(screen.queryByText('admin123')).not.toBeInTheDocument();
    expect(screen.queryByText('service123')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /角色权限分配/ }));
    expect(screen.getByText('业务员')).toBeInTheDocument();
    expect(screen.getByText('仓库')).toBeInTheDocument();
    expect(screen.queryByText('客户')).not.toBeInTheDocument();
    expect(screen.getAllByText('报价查询').length).toBeGreaterThan(0);
    expect(screen.getAllByText('报价管理').length).toBeGreaterThan(0);
    expect(screen.getAllByText('财务核销').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: '保存客服权限' }));

    expect(await screen.findByText('客服权限已保存，RBAC 即时生效')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/system/roles/CUSTOMER_SERVICE/permissions'),
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('isolates staff menus by role and keeps operator out of system management', async () => {
    await renderAndLogin('operator', 'operator123');

    expect(screen.getByRole('menuitem', { name: '运营工作台' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '运单履约' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '渠道排货' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '轨迹监控' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '报价查价' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '基础资料' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '仓库管理' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '问题件中心' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '财务结算' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '系统设置' })).not.toBeInTheDocument();
    expect(screen.queryByText('员工账号管理')).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/system/roles'), expect.anything());

    cleanup();
    localStorage.clear();
    await renderAndLogin('finance', 'finance123');

    expect(screen.getByRole('menuitem', { name: '财务结算' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '系统设置' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '仓库管理' })).not.toBeInTheDocument();

    cleanup();
    localStorage.clear();
    await renderAndLogin('warehouse', 'warehouse123');

    expect(screen.getByRole('menuitem', { name: '仓库管理' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '轨迹监控' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '报价查价' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '财务结算' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '系统设置' })).not.toBeInTheDocument();
  });

  it('masks detailed route and agent information for operator users only', async () => {
    const user = userEvent.setup();
    await renderAndLogin('operator', 'operator123');

    await user.click(screen.getByRole('menuitem', { name: '运单履约' }));

    await waitFor(() => expect(screen.getAllByText('DHL').length).toBeGreaterThan(0));
    expect(screen.queryByText('DHL HK')).not.toBeInTheDocument();
    expect(screen.queryByText('宇环')).not.toBeInTheDocument();

    cleanup();
    localStorage.clear();
    await renderAndLogin('admin', 'admin123');
    await user.click(screen.getByRole('menuitem', { name: '运单履约' }));

    expect(await screen.findAllByText('DHL HK')).not.toHaveLength(0);
    expect(screen.getAllByText('宇环')).not.toHaveLength(0);
  });

  it('shows the fulfillment stage board from the routing workspace too', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '渠道排货' }));

    expect(await screen.findByRole('heading', { name: '渠道排货中心' })).toBeInTheDocument();
    expect(screen.getAllByText('履约阶段看板').length).toBeGreaterThan(0);
    expect(screen.getAllByText('客户名称').length).toBeGreaterThan(0);
    expect(screen.getAllByText('系统单号 / 转单号').length).toBeGreaterThan(0);
    expect(screen.getAllByText('收款金额').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SYGJ06061230001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('未知').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('$128.00')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /全部/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /待排货/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /待审核/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /已入库/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /待发货/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /待上网/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /待签收/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /退货\/滞留/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '批量添加轨迹' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '批量排货' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '批量获取转单号' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '批量标记异常' })).not.toBeInTheDocument();
    expect(document.querySelector('.batch-bar')).not.toBeInTheDocument();
  });

  it('keeps routing workspace row actions independent from fulfillment actions', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '渠道排货' }));
    expect(await screen.findByRole('heading', { name: '渠道排货中心' })).toBeInTheDocument();

    const routingRow = screen.getByRole('row', { name: /SYGJ05291344165/ });
    await user.click(within(routingRow).getByRole('button', { name: '添加轨迹' }));

    expect(await screen.findByText('渠道排货已添加轨迹')).toBeInTheDocument();
    expect(screen.queryByText(/^已添加轨迹$/)).not.toBeInTheDocument();
    expect(screen.getAllByText('排货操作').length).toBeGreaterThan(0);
    expect(screen.queryByText('履约操作')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '收款' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '创建问题件' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '标记退货' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '填写转单号' })).not.toBeInTheDocument();
  });

  it('lets staff delete routing workspace rows only after confirmation', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '渠道排货' }));
    const routingRow = await screen.findByRole('row', { name: /SYGJ06061230001/ });

    await user.click(within(routingRow).getByRole('button', { name: /删\s*除/ }));
    expect(await screen.findByText('确认删除该运单？')).toBeInTheDocument();
    expect(screen.getByText('SYGJ06061230001')).toBeInTheDocument();
    const confirmDeleteButtons = screen.getAllByRole('button', { name: /^删\s*除$/ });
    await user.click(confirmDeleteButtons[confirmDeleteButtons.length - 1]);

    expect(await screen.findByText('已人工删除运单 SYGJ06061230001')).toBeInTheDocument();
    expect(screen.queryByText('SYGJ06061230001')).not.toBeInTheDocument();
  });

  it('only shows routing assignment when the shipment is waiting for route allocation', async () => {
    const user = userEvent.setup();
    employeeShipments.unshift(shipment('s-routing-ready', 'SYGJ06061239999', 'SORT-0606', 'WAITING_SORT', '9409-Daloday', { latestTracking: '收货扫描' }));
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '渠道排货' }));
    expect(await screen.findByRole('heading', { name: '渠道排货中心' })).toBeInTheDocument();

    expect(within(screen.getByRole('row', { name: /SYGJ06061230001/ })).queryByRole('button', { name: '分配渠道' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /SYGJ06061230003/ })).queryByRole('button', { name: '分配渠道' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /SYGJ05291344165/ })).queryByRole('button', { name: '分配渠道' })).not.toBeInTheDocument();

    const sortableRow = await screen.findByRole('row', { name: /SYGJ06061239999/ });
    expect(within(sortableRow).getByRole('button', { name: '分配渠道' })).toBeInTheDocument();
  });

  it('hides routing mutation buttons for shipments that are still waiting for audit', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '运单履约' }));
    await user.click(screen.getByRole('button', { name: '新建出货订单' }));
    expect(await screen.findByRole('dialog', { name: '新建出货订单' })).toBeInTheDocument();
    await user.clear(screen.getByLabelText('客户单号'));
    await user.type(screen.getByLabelText('客户单号'), 'ROUTE-DRAFT-001');
    await user.clear(screen.getByLabelText('系统单号'));
    await user.type(screen.getByLabelText('系统单号'), 'SYDRAFTROUTE001');
    await user.click(screen.getByRole('button', { name: '创建订单' }));
    expect(await screen.findByText('SYDRAFTROUTE001')).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: '渠道排货' }));
    const draftRoutingRow = await screen.findByRole('row', { name: /SYDRAFTROUTE001/ });

    expect(within(draftRoutingRow).queryByRole('button', { name: '分配渠道' })).not.toBeInTheDocument();
    expect(within(draftRoutingRow).queryByRole('button', { name: '填写转单号' })).not.toBeInTheDocument();
    expect(within(draftRoutingRow).queryByRole('button', { name: '添加轨迹' })).not.toBeInTheDocument();
    expect(within(draftRoutingRow).queryByRole('button', { name: '创建问题件' })).not.toBeInTheDocument();
    expect(within(draftRoutingRow).queryByRole('button', { name: '标记退货' })).not.toBeInTheDocument();
    expect(within(draftRoutingRow).queryByRole('button', { name: '修改' })).not.toBeInTheDocument();
    expect(within(draftRoutingRow).getByRole('button', { name: '排货日志' })).toBeInTheDocument();
  });

  it('opens routing lifecycle logs from the routing workspace', async () => {
    const user = userEvent.setup();
    employeeShipments.unshift(shipment('s-routing-log', 'SYGJ06061239998', 'SORT-LOG-0606', 'WAITING_SORT', '9409-Daloday', { latestTracking: '收货扫描' }));
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '渠道排货' }));
    expect(await screen.findByRole('heading', { name: '渠道排货中心' })).toBeInTheDocument();

    const routingRow = await screen.findByRole('row', { name: /SYGJ06061239998/ });
    await user.click(within(routingRow).getByRole('button', { name: '分配渠道' }));
    const assignmentDialog = await screen.findByRole('dialog', { name: '分配渠道' });
    expect(within(assignmentDialog).getByLabelText('代理')).toBeInTheDocument();
    expect(within(assignmentDialog).getByLabelText('发货渠道')).toBeInTheDocument();
    await user.click(within(assignmentDialog).getByRole('button', { name: '确认分配' }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/shipments\/s-routing-log\/route$/),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ channelId: 'ch-dhl-hk', agentId: 'a-yuhuan' })
        })
      )
    );
    expect(await screen.findByText('渠道排货已分配渠道，进入仓库管理的面单队列&待仓库出货')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /已排货/ })).toBeInTheDocument();

    const routedRow = await screen.findByRole('row', { name: /SYGJ06061239998/ });
    await user.click(within(routedRow).getByRole('button', { name: '排货日志' }));
    const routingLogDialog = await screen.findByRole('dialog', { name: '排货日志' });
    expect(within(routingLogDialog).getByText(/排货生命周期记录/)).toBeInTheDocument();
    expect(within(routingLogDialog).getByText(/渠道排货：分配渠道/)).toBeInTheDocument();
    expect(within(routingLogDialog).getByText('操作时间')).toBeInTheDocument();
    expect(routingLogDialog.querySelector('.ant-pagination')).toBeInTheDocument();
  });

  it('sends routed shipments to warehouse label queue for printing and dispatch', async () => {
    const user = userEvent.setup();
    employeeShipments.unshift(shipment('s-routing-label', 'SYGJ06061239997', 'SORT-LABEL-0606', 'WAITING_SORT', '9409-Daloday', { latestTracking: '收货扫描' }));
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '渠道排货' }));
    const routingRow = await screen.findByRole('row', { name: /SYGJ06061239997/ });
    await user.click(within(routingRow).getByRole('button', { name: '分配渠道' }));
    await user.click(within(await screen.findByRole('dialog', { name: '分配渠道' })).getByRole('button', { name: '确认分配' }));
    expect(await screen.findByText('渠道排货已分配渠道，进入仓库管理的面单队列&待仓库出货')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /已排货/ })).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    await user.click(screen.getByRole('button', { name: /面单队列/ }));
    const warehouseQueueRow = await screen.findByRole('row', { name: /SYGJ06061239997/ });

    expect(within(warehouseQueueRow).getByText('待仓库出货')).toBeInTheDocument();
    expect(within(warehouseQueueRow).getByRole('button', { name: '打单' })).toBeInTheDocument();
    expect(within(warehouseQueueRow).getByRole('button', { name: '出货' })).toBeInTheDocument();
    expect(within(warehouseQueueRow).queryByRole('button', { name: '确认收货' })).not.toBeInTheDocument();
    expect(within(warehouseQueueRow).queryByRole('button', { name: '申请面单' })).not.toBeInTheDocument();

    await user.click(within(warehouseQueueRow).getByRole('button', { name: '打单' }));
    expect(await screen.findByText(/已生成仓库出货面单/)).toBeInTheDocument();
    expect(screen.getAllByText('内部交货面单').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^A\d{6}$/).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/条形码 A\d{6}/)).toBeInTheDocument();
    expect(screen.getByText('1/1')).toBeInTheDocument();
    expect(screen.getAllByText('美国').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SYGJ06061239997').length).toBeGreaterThan(0);
  });

  it('keeps bulk tracking import hidden from the fulfillment workspace', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '运单履约' }));

    expect(await screen.findByRole('heading', { name: '运单履约中心' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '批量添加轨迹' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: '批量添加轨迹' })).not.toBeInTheDocument();
  });

  it('loads real master data and maintains customers channels fees fuel rates and exchange rates', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '基础资料' }));

    expect(await screen.findByRole('heading', { name: '基础资料中心' })).toBeInTheDocument();
    expect(screen.getAllByText('客户资料').length).toBeGreaterThan(0);
    expect(screen.getAllByText('客户编码').length).toBeGreaterThan(0);
    expect(screen.getAllByText('客户简称').length).toBeGreaterThan(0);
    expect(screen.getByText('客户全称')).toBeInTheDocument();
    expect(screen.getAllByText('客户类型').length).toBeGreaterThan(0);
    expect(screen.getAllByText('业务员').length).toBeGreaterThan(0);
    expect(screen.getAllByText('代理资料').length).toBeGreaterThan(0);
    expect(screen.queryByText('客户、联系人与账号')).not.toBeInTheDocument();
    expect(screen.queryByText('代理、承运商与渠道')).not.toBeInTheDocument();
    expect(screen.queryByText('承运商与渠道')).not.toBeInTheDocument();
    expect(screen.queryByText('费用、燃油与汇率')).not.toBeInTheDocument();
    expect(screen.getByText('9409')).toBeInTheDocument();
    expect(screen.getByText('Daloday')).toBeInTheDocument();
    expect(screen.getByText('Daloday Inc.')).toBeInTheDocument();
    expect(screen.getAllByText('直客').length).toBeGreaterThan(0);
    expect(screen.getByText('何俊妮')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /代理资料/ }));
    expect(screen.getAllByText('代理编码').length).toBeGreaterThan(0);
    expect(screen.getAllByText('代理简称').length).toBeGreaterThan(0);
    expect(screen.getAllByText('代理名称').length).toBeGreaterThan(0);
    expect(screen.getByText('YH')).toBeInTheDocument();
    expect(screen.getByText('宇环')).toBeInTheDocument();
    expect(screen.getByText('深圳宇环')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /客户资料/ }));
    await user.click(screen.getByRole('button', { name: '增加客户' }));
    const createCustomerDialog = await screen.findByRole('dialog', { name: '新建客户' });
    await user.type(within(createCustomerDialog).getByLabelText('客户编码'), '8888');
    await user.type(within(createCustomerDialog).getByLabelText('客户简称'), 'Mira Logistics');
    await user.type(within(createCustomerDialog).getByLabelText('客户全称'), 'Mira Logistics Co., Ltd.');
    await user.clear(within(createCustomerDialog).getByLabelText('客户类型'));
    await user.type(within(createCustomerDialog).getByLabelText('客户类型'), '直客');
    await user.type(within(createCustomerDialog).getByLabelText('业务员'), 'mira');
    await user.click(screen.getByRole('button', { name: '创建客户' }));
    expect(await screen.findByText('8888')).toBeInTheDocument();
    expect(await screen.findByText('Mira Logistics')).toBeInTheDocument();
    expect(await screen.findByText('Mira Logistics Co., Ltd.')).toBeInTheDocument();
    expect(await screen.findAllByText('mira')).toHaveLength(1);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '新建客户' })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: '修改客户' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '删除客户' })).toBeDisabled();

    await user.type(screen.getByLabelText('客户编码筛选'), '8888');
    await user.click(screen.getAllByRole('button', { name: /查\s*询/ })[0]);
    expect(screen.getByText('8888')).toBeInTheDocument();
    expect(screen.queryByText('9409')).not.toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /重\s*置/ })[0]);
    expect(await screen.findByText('9409')).toBeInTheDocument();

    await user.click(screen.getByText('8888'));
    await user.click(screen.getByRole('button', { name: '修改客户' }));
    const editCustomerDialog = await screen.findByRole('dialog', { name: '编辑客户' });
    await user.clear(within(editCustomerDialog).getByLabelText('客户简称'));
    await user.type(within(editCustomerDialog).getByLabelText('客户简称'), 'Mira CN');
    await user.click(screen.getByRole('button', { name: '保存客户' }));
    expect(await screen.findByText('Mira CN')).toBeInTheDocument();
    await user.click(screen.getByText('8888'));
    await user.click(screen.getByRole('button', { name: '删除客户' }));
    expect(await screen.findByText('确认停用该客户？')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认停用' }));
    expect(await screen.findByText('8888-Mira CN 已停用')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('确认停用该客户？')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: '客户列表设置' }));
    expect(await screen.findByRole('dialog', { name: '客户列表设置' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /确\s*定/ }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '客户列表设置' })).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /代理资料/ }));
    await user.click(screen.getByRole('button', { name: '增加代理' }));
    const createAgentDialog = await screen.findByRole('dialog', { name: '新建代理' });
    await user.type(within(createAgentDialog).getByLabelText('代理编码'), 'SZJST');
    await user.type(within(createAgentDialog).getByLabelText('代理简称'), '加时特');
    await user.type(within(createAgentDialog).getByLabelText('代理名称'), '深圳加时特');
    await user.click(screen.getByRole('button', { name: '创建代理' }));
    expect(await screen.findByText('SZJST')).toBeInTheDocument();
    expect(await screen.findByText('加时特')).toBeInTheDocument();
    expect(await screen.findByText('深圳加时特')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '增加代理' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '修改代理' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '删除代理' })).toBeDisabled();

    await user.type(screen.getByLabelText('代理编码筛选'), 'SZJST');
    await user.click(screen.getAllByRole('button', { name: /查\s*询/ }).at(-1)!);
    expect(screen.getByText('SZJST')).toBeInTheDocument();
    expect(screen.queryByText('YH')).not.toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /重\s*置/ }).at(-1)!);
    expect(await screen.findByText('YH')).toBeInTheDocument();

    await user.click(screen.getByText('SZJST'));
    await user.click(screen.getByRole('button', { name: '修改代理' }));
    const editAgentDialog = await screen.findByRole('dialog', { name: '编辑代理' });
    await user.clear(within(editAgentDialog).getByLabelText('代理简称'));
    await user.type(within(editAgentDialog).getByLabelText('代理简称'), '加时特华南');
    await user.click(screen.getByRole('button', { name: '保存代理' }));
    expect(await screen.findByText('加时特华南')).toBeInTheDocument();
    await user.click(screen.getByText('SZJST'));
    await user.click(screen.getByRole('button', { name: '删除代理' }));
    expect(await screen.findByText('确认停用该代理？')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认停用' }));
    expect(await screen.findByText('深圳加时特 已停用')).toBeInTheDocument();
    expect(screen.getAllByText('停用').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: '代理列表设置' }));
    expect(await screen.findByRole('dialog', { name: '代理列表设置' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /确\s*定/ }));
  });

  it('opens personal center with login logs and changes password through the backend', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(await screen.findByRole('button', { name: '个人中心' }));

    expect(await screen.findByRole('dialog', { name: '个人中心' })).toBeInTheDocument();
    expect(screen.getByText('当前账号')).toBeInTheDocument();
    expect(screen.getByText('系统管理员')).toBeInTheDocument();
    expect(await screen.findByText('127.0.0.1')).toBeInTheDocument();
    expect(screen.getByText('本机')).toBeInTheDocument();

    await user.type(screen.getByLabelText('当前密码'), 'admin123');
    await user.type(screen.getByLabelText('新密码'), 'newpass123');
    await user.type(screen.getByLabelText('确认新密码'), 'newpass123');
    await user.click(screen.getByRole('button', { name: '保存新密码' }));

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/change-password'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(await screen.findByRole('heading', { name: '登录思远物流' })).toBeInTheDocument();
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
    const roleByUsername: Record<string, string> = {
      admin: 'ADMIN',
      service: 'CUSTOMER_SERVICE',
      operator: 'OPERATOR',
      warehouse: 'WAREHOUSE',
      finance: 'FINANCE',
      customer: 'CUSTOMER'
    };
    const role = roleByUsername[body.username] ?? 'ADMIN';
    const permissions = systemRoleMatrix.roles.find((item) => item.key === role)?.permissions ?? [];
    return jsonResponse({
      accessToken: `${role}-token`,
      user: { id: `u-${body.username}`, username: body.username, role, customerId: role === 'CUSTOMER' ? 'c-9409' : undefined },
      permissions
    });
  }

  if (url.endsWith('/api/auth/login-logs')) {
    return jsonResponse([
      {
        id: 'login-log-1',
        username: 'admin',
        ip: '127.0.0.1',
        region: '本机',
        userAgent: 'Vitest Browser',
        createdAt: '2026-06-12T00:00:00.000Z'
      }
    ]);
  }

  if (url.endsWith('/api/auth/change-password')) {
    return jsonResponse({ ok: true });
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
    const created = shipment(`s-new-${body.systemOrderNo ?? body.customerOrderNo}`, body.systemOrderNo ?? 'SYGJ26060600021', body.customerOrderNo, body.initialStatus ?? 'DECLARED', '9409-Daloday', {
      transferNo: body.transferNo,
      destinationCountry: body.destinationCountry,
      receivableWeightKg: body.receivableWeightKg,
      agentWeightKg: body.agentWeightKg ?? body.receivableWeightKg,
      latestTracking: body.latestTracking ?? (body.initialStatus === 'DRAFT' ? '新建出货订单，待审核' : '客户已预报'),
      carrier: body.receivingChannel ?? 'DHL',
      channelName: 'DHL HK',
      agentName: '宇环'
    });
    const token = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? '');
    if (token.includes('CUSTOMER')) {
      upsertMockShipment(customerShipments, created);
    } else {
      upsertMockShipment(employeeShipments, created);
    }
    return jsonResponse(created);
  }

  if (url.endsWith('/api/shipments/s-1/receive')) {
    employeeShipments[0] = { ...employeeShipments[0], status: 'WAITING_SORT', latestTracking: '已收货' };
    return jsonResponse(employeeShipments[0]);
  }

  const routeMatch = url.match(/\/api\/shipments\/([^/]+)\/route$/);
  if (routeMatch) {
    const shipmentIndex = employeeShipments.findIndex((shipment) => shipment.id === routeMatch[1]);
    const currentShipment = employeeShipments[shipmentIndex];
    if (!currentShipment) {
      return jsonResponse({ message: '运单不存在' }, 404);
    }
    employeeShipments[shipmentIndex] = {
      ...currentShipment,
      status: 'WAITING_DISPATCH',
      channelName: 'DHL HK',
      agentName: '宇环',
      latestTracking: '渠道排货已分配渠道'
    };
    return jsonResponse(employeeShipments[shipmentIndex]);
  }

  const trackingEventMatch = url.match(/\/api\/shipments\/([^/]+)\/tracking-events$/);
  if (trackingEventMatch) {
    const shipmentIndex = employeeShipments.findIndex((shipment) => shipment.id === trackingEventMatch[1]);
    if (shipmentIndex === -1) {
      return Promise.resolve(new Response('Not found', { status: 404 }));
    }
    employeeShipments[shipmentIndex] = {
      ...employeeShipments[shipmentIndex],
      latestTracking: body.status,
      trackingStaleDays: 0
    };
    return jsonResponse(employeeShipments[shipmentIndex]);
  }

  if (url.endsWith('/api/shipments/s-3/labels') && init?.method === 'POST') {
    employeeShipments[1] = { ...employeeShipments[1], transferNo: '1Z26060600001', latestTracking: '已生成面单' };
    return jsonResponse({ label: shipmentLabels[0], shipment: employeeShipments[1] });
  }

  if (url.endsWith('/api/shipments/s-3/labels')) {
    return jsonResponse(shipmentLabels);
  }

  if (url.endsWith('/api/shipments/s-3/dispatch')) {
    employeeShipments[1] = { ...employeeShipments[1], status: 'WAITING_ONLINE', latestTracking: '已发货', dispatchedAt: '2026-06-06T10:00:00.000Z' };
    return jsonResponse(employeeShipments[1]);
  }

  const deleteShipmentMatch = url.match(/\/api\/shipments\/([^/]+)$/);
  if (deleteShipmentMatch && init?.method === 'DELETE') {
    const shipmentIndex = employeeShipments.findIndex((shipment) => shipment.id === deleteShipmentMatch[1]);
    if (shipmentIndex === -1) {
      return Promise.resolve(new Response('Not found', { status: 404 }));
    }
    const [deleted] = employeeShipments.splice(shipmentIndex, 1);
    return jsonResponse(deleted);
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

  const updateRolePermissionMatch = url.match(/\/api\/system\/roles\/([^/]+)\/permissions$/);
  if (updateRolePermissionMatch) {
    const roleIndex = systemRoleMatrix.roles.findIndex((role) => role.key === updateRolePermissionMatch[1]);
    systemRoleMatrix.roles[roleIndex] = { ...systemRoleMatrix.roles[roleIndex], permissions: body.permissions };
    return jsonResponse(systemRoleMatrix.roles[roleIndex]);
  }

  if (url.endsWith('/api/system/roles')) {
    return jsonResponse(systemRoleMatrix);
  }

  if (url.endsWith('/api/master-data/customers') && init?.method === 'POST') {
    const customer = {
      id: `c-${body.code}`,
      code: body.code,
      name: body.name,
      shortName: body.shortName ?? body.name,
      fullName: body.fullName ?? `${body.name} Co., Ltd.`,
      customerType: body.customerType ?? '直客',
      salesperson: body.salesperson ?? '',
      enabled: true
    };
    masterData.customers.push(customer);
    return jsonResponse(customer);
  }

  const customerUpdateMatch = url.match(/\/api\/master-data\/customers\/([^/]+)$/);
  if (customerUpdateMatch && init?.method === 'PUT') {
    const customer = masterData.customers.find((item) => item.id === customerUpdateMatch[1]);
    if (!customer) {
      return Promise.resolve(new Response('Not found', { status: 404 }));
    }
    Object.assign(customer, {
      code: body.code ?? customer.code,
      name: body.name ?? customer.name,
      shortName: body.shortName ?? customer.shortName,
      fullName: body.fullName ?? customer.fullName,
      customerType: body.customerType ?? customer.customerType,
      salesperson: body.salesperson ?? customer.salesperson,
      enabled: body.enabled ?? customer.enabled
    });
    return jsonResponse(customer);
  }

  const customerEnabledMatch = url.match(/\/api\/master-data\/customers\/([^/]+)\/enabled$/);
  if (customerEnabledMatch && init?.method === 'PUT') {
    const customer = masterData.customers.find((item) => item.id === customerEnabledMatch[1]);
    if (!customer) {
      return Promise.resolve(new Response('Not found', { status: 404 }));
    }
    customer.enabled = body.enabled === true;
    return jsonResponse(customer);
  }

  if (url.endsWith('/api/master-data/agents') && init?.method === 'POST') {
    const agent = {
      id: `a-${body.code ?? 'm7'}`,
      code: body.code ?? 'M7',
      shortName: body.shortName ?? body.name,
      name: body.name ?? 'M7 Agent',
      integrationType: body.integrationType ?? 'MANUAL',
      enabled: true
    };
    masterData.agents.push(agent);
    return jsonResponse(agent);
  }

  const agentUpdateMatch = url.match(/\/api\/master-data\/agents\/([^/]+)$/);
  if (agentUpdateMatch && init?.method === 'PUT') {
    const agent = masterData.agents.find((item) => item.id === agentUpdateMatch[1]);
    if (!agent) {
      return Promise.resolve(new Response('Not found', { status: 404 }));
    }
    Object.assign(agent, {
      code: body.code ?? agent.code,
      shortName: body.shortName ?? agent.shortName,
      name: body.name ?? agent.name,
      integrationType: body.integrationType ?? agent.integrationType,
      enabled: body.enabled ?? agent.enabled
    });
    return jsonResponse(agent);
  }

  const agentEnabledMatch = url.match(/\/api\/master-data\/agents\/([^/]+)\/enabled$/);
  if (agentEnabledMatch && init?.method === 'PUT') {
    const agent = masterData.agents.find((item) => item.id === agentEnabledMatch[1]);
    if (!agent) {
      return Promise.resolve(new Response('Not found', { status: 404 }));
    }
    agent.enabled = body.enabled === true;
    return jsonResponse(agent);
  }

  const contactMatch = url.match(/\/api\/master-data\/customers\/([^/]+)\/contacts$/);
  if (contactMatch) {
    const customerId = contactMatch[1];
    const customer = masterData.customers.find((item) => item.id === customerId);
    const contactName = body.name ?? 'M7 Contact';
    const contact = {
      id: `cc-${contactName}`,
      customerId,
      customerName: customer ? `${customer.code}-${customer.name}` : customerId,
      name: contactName,
      phone: body.phone ?? '13900000007',
      email: body.email ?? 'm7@example.com',
      enabled: true
    };
    masterData.contacts.push(contact);
    return jsonResponse(contact);
  }

  const customerUserMatch = url.match(/\/api\/master-data\/customers\/([^/]+)\/users$/);
  if (customerUserMatch) {
    const customerId = customerUserMatch[1];
    const customer = masterData.customers.find((item) => item.id === customerId);
    const username = body.username ?? 'm7customer';
    const customerUser = {
      id: `u-${username}`,
      customerId,
      customerName: customer ? `${customer.code}-${customer.name}` : customerId,
      username,
      enabled: true
    };
    masterData.customerUsers.push(customerUser);
    return jsonResponse(customerUser);
  }

  if (url.endsWith('/api/master-data/carriers') && init?.method === 'POST') {
    const carrier = { id: 'cr-m7', name: 'M7 Carrier', enabled: true };
    masterData.carriers.push(carrier);
    return jsonResponse(carrier);
  }

  if (url.endsWith('/api/master-data/channels') && init?.method === 'POST') {
    const channel = { id: 'ch-m7', name: 'M7 Channel', carrierId: 'cr-m7', carrierName: 'M7 Carrier', enabled: true };
    masterData.channels.push(channel);
    return jsonResponse(channel);
  }

  if (url.endsWith('/api/master-data/channels/ch-m7/enabled')) {
    masterData.channels[masterData.channels.findIndex((channel) => channel.id === 'ch-m7')] = { ...masterData.channels.find((channel) => channel.id === 'ch-m7')!, enabled: body.enabled };
    return jsonResponse(masterData.channels.find((channel) => channel.id === 'ch-m7'));
  }

  if (url.endsWith('/api/master-data/surcharges') && init?.method === 'POST') {
    const surcharge = { id: 'sc-m7', name: 'M7 附加费', amount: 88, enabled: true };
    masterData.surcharges.push(surcharge);
    return jsonResponse(surcharge);
  }

  if (url.endsWith('/api/master-data/fuel-rates') && init?.method === 'POST') {
    const fuelRate = { id: 'fr-m7', channelId: 'ch-m7', channelName: 'M7 Channel', rate: 0.18, activeAt: '2026-06-06T00:00:00.000Z' };
    masterData.fuelRates.push(fuelRate);
    return jsonResponse(fuelRate);
  }

  if (url.endsWith('/api/master-data/exchange-rates') && init?.method === 'POST') {
    const exchangeRate = { id: 'er-m7', baseCurrency: 'EUR', quoteCurrency: 'CNY', rate: 7.8, activeAt: '2026-06-06T00:00:00.000Z', enabled: true };
    masterData.exchangeRates.push(exchangeRate);
    return jsonResponse(exchangeRate);
  }

  if (url.endsWith('/api/master-data')) {
    return jsonResponse(masterData);
  }

  if (url.endsWith('/api/shipments')) {
    const token = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? '');
    return jsonResponse(token.includes('CUSTOMER') ? customerShipments : employeeShipments);
  }

  const operationalMatch = url.match(/\/api\/shipments\/([^/]+)\/operational$/);
  if (operationalMatch && init?.method === 'PATCH') {
    const shipment = employeeShipments.find((item) => item.id === operationalMatch[1]);
    if (!shipment) {
      return jsonResponse({ message: '运单不存在' }, 404);
    }
    Object.assign(shipment, {
      latestTracking: body.latestTracking ?? shipment.latestTracking,
      transferNo: body.transferNo || undefined,
      status: body.status ?? shipment.status,
      trackingStaleDays: body.latestTracking ? 0 : shipment.trackingStaleDays
    });
    return jsonResponse(shipment);
  }

  const paymentMatch = url.match(/\/api\/shipments\/([^/]+)\/payment$/);
  if (paymentMatch && init?.method === 'POST') {
    const shipment = employeeShipments.find((item) => item.id === paymentMatch[1]);
    if (!shipment) {
      return jsonResponse({ message: '运单不存在' }, 404);
    }
    Object.assign(shipment, {
      paymentAmountUsd: body.paymentAmountUsd,
      paymentAmountCny: body.paymentAmountCny,
      paymentMethod: body.paymentMethod
    });
    return jsonResponse(shipment);
  }

  if (url.endsWith('/api/shipments/tracking-events/import') && init?.method === 'POST') {
    const updated = (body.updates ?? []).map((item: { shipmentId: string; latestTracking: string }) => {
      const shipment = employeeShipments.find((current) => current.id === item.shipmentId);
      if (!shipment) {
        return undefined;
      }
      Object.assign(shipment, { latestTracking: item.latestTracking, trackingStaleDays: 0 });
      return shipment;
    }).filter(Boolean);
    return jsonResponse({ updated });
  }

  if (url.endsWith('/api/problem-tickets')) {
    return jsonResponse(problemTickets);
  }

  if (url.endsWith('/api/pricing/books/import') && init?.method === 'POST') {
    const book: PriceBookSummary = {
      id: `pb-${importedPriceBooks.length + 1}`,
      fileName: body.fileName,
      rowCount: body.rows.length,
      importedAt: '2026-06-07T13:06:11.000Z'
    };
    const rows: PriceBookRowSummary[] = body.rows.map((row: Omit<PriceBookRowSummary, 'id' | 'priceBookId'>, index: number) => ({
      ...row,
      id: `pbr-${importedPriceRows.length + index + 1}`,
      priceBookId: book.id,
      realChannelName: row.realChannelName ?? row.channelName,
      quoteSourceType: row.quoteSourceType ?? 'local'
    }));
    importedPriceBooks.unshift(book);
    importedPriceRows.unshift(...rows);
    return jsonResponse({ book, rows });
  }

  const priceBookRemarkMatch = url.match(/\/api\/pricing\/books\/([^/]+)\/remark$/);
  if (priceBookRemarkMatch && init?.method === 'PUT') {
    const book = importedPriceBooks.find((item) => item.id === priceBookRemarkMatch[1]);
    if (!book) {
      return jsonResponse({ message: '价格表不存在' }, 404);
    }
    book.remark = body.remark || undefined;
    return jsonResponse(book);
  }

  const priceBookDeleteMatch = url.match(/\/api\/pricing\/books\/([^/]+)$/);
  if (priceBookDeleteMatch && init?.method === 'DELETE') {
    const bookIndex = importedPriceBooks.findIndex((item) => item.id === priceBookDeleteMatch[1]);
    if (bookIndex < 0) {
      return jsonResponse({ message: '价格表不存在' }, 404);
    }
    const [book] = importedPriceBooks.splice(bookIndex, 1);
    for (let index = importedPriceRows.length - 1; index >= 0; index -= 1) {
      if (importedPriceRows[index].priceBookId === book.id) {
        importedPriceRows.splice(index, 1);
      }
    }
    return jsonResponse(book);
  }

  if (url.endsWith('/api/pricing/books')) {
    return jsonResponse({ books: importedPriceBooks, rows: importedPriceRows });
  }

  if (url.endsWith('/api/pricing/markup-rules') && init?.method === 'POST') {
    const rule: AgentMarkupSummary = {
      id: `markup-${agentMarkupRules.length + 1}`,
      agentName: body.agentName,
      channelName: body.channelName,
      realChannelName: body.realChannelName,
      destinationCountry: body.destinationCountry,
      markupPerKg: body.markupPerKg,
      enabled: body.enabled !== false
    };
    agentMarkupRules.unshift(rule);
    return jsonResponse(rule);
  }

  const markupUpdateMatch = url.match(/\/api\/pricing\/markup-rules\/([^/]+)$/);
  if (markupUpdateMatch && init?.method === 'PUT') {
    const rule = agentMarkupRules.find((item) => item.id === markupUpdateMatch[1]);
    if (!rule) {
      return jsonResponse({ message: '加价规则不存在' }, 404);
    }
    Object.assign(rule, body);
    return jsonResponse(rule);
  }

  if (markupUpdateMatch && init?.method === 'DELETE') {
    const rule = agentMarkupRules.find((item) => item.id === markupUpdateMatch[1]);
    if (!rule) {
      return jsonResponse({ message: '加价规则不存在' }, 404);
    }
    rule.enabled = false;
    return jsonResponse(rule);
  }

  if (url.endsWith('/api/pricing/markup-rules')) {
    return jsonResponse(agentMarkupRules);
  }

  if (url.endsWith('/api/pricing/lookup') && init?.method === 'POST') {
    const token = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? '');
    const isAdmin = token.includes('ADMIN');
    const chargeableWeightKg = Number(body.chargeableWeightKg);
    const warehouseCode = String(body.amazonCode ?? '').trim().toUpperCase();
    const markupRules = agentMarkupRules;
    const bookRemarkMap = new Map(importedPriceBooks.map((book) => [book.id, book.remark]));
    const matchedRows = [...importedPriceRows, ...backendSeedPriceRows].filter(
      (row) =>
        (!row.warehouseCode || !warehouseCode || row.warehouseCode.toUpperCase() === warehouseCode) &&
        row.destinationCountry === body.destinationCountry &&
        chargeableWeightKg >= row.minWeightKg &&
        chargeableWeightKg <= row.maxWeightKg
    );
    const recommendations = matchedRows
      .map((row) => {
        const markup = findBestTestMarkupRule(markupRules, row);
        if (!markup) {
          return undefined;
        }
        const salesRatePerKg = Math.round((row.costPerKg + markup.markupPerKg) * 100) / 100;
        const totalCost = Math.round(row.costPerKg * chargeableWeightKg * 100) / 100;
        const totalSales = Math.round(salesRatePerKg * chargeableWeightKg * 100) / 100;
        const visiblePrice: Omit<PriceBookRowSummary, 'costPerKg'> & { costPerKg?: number } = { ...row };
        if (!isAdmin) {
          visiblePrice.costPerKg = undefined;
        }
        return {
          price: visiblePrice,
          ...(isAdmin ? { markup } : {}),
          channelName: row.channelName,
          carrierName: row.carrierName ?? '专线',
          agentName: row.agentName,
          businessRouteName: row.businessRouteName,
          realChannelName: row.realChannelName ?? row.channelName,
          isRouteMapped: Boolean(row.businessRouteName),
          quoteSourceType: row.quoteSourceType ?? 'local',
          weightSegmentLabel: `${row.minWeightKg}-${row.maxWeightKg}kg`,
          salesRatePerKg,
          freightFee: totalSales,
          surchargeFee: row.surchargeFee ?? 0,
          totalFee: totalSales + (row.surchargeFee ?? 0),
          freightUnitPrice: salesRatePerKg,
          totalUnitPrice: Math.round(((totalSales + (row.surchargeFee ?? 0)) / chargeableWeightKg) * 100) / 100,
          ...(isAdmin ? { totalCost, grossProfit: Math.round((totalSales - totalCost) * 100) / 100 } : {}),
          totalSales,
          transitLabel: row.transitLabel ?? '时效待确认',
          surchargeDetails: row.surchargeDetails ?? [],
          ...(row.priceBookId && bookRemarkMap.get(row.priceBookId) ? { remark: bookRemarkMap.get(row.priceBookId) } : {})
        };
      })
      .filter(Boolean);
    const cheapestRecommendations = [...recommendations].sort((left: any, right: any) => left.totalSales - right.totalSales).slice(0, 3);
    const fastestRecommendations = [...recommendations].sort((left: any, right: any) => (left.price.transitDays ?? 99999) - (right.price.transitDays ?? 99999)).slice(0, 3);
    const best = cheapestRecommendations[0] as any;
    return jsonResponse({
      price: best.price,
      ...(isAdmin ? { markup: best.markup } : {}),
      recommendations,
      cheapestRecommendations,
      fastestRecommendations,
      agentErrors: [{ agentName: 'BSD', quoteCount: 0, errorCode: 'TOKEN_INVALID', errorMessage: 'Token不正确' }],
      amazonCode: body.amazonCode ?? '',
      productName: body.productName ?? '',
      postalCode: body.postalCode ?? '',
      address: body.address ?? '',
      packageInfo: body.packageInfo ?? '',
      channelName: best.channelName,
      chargeableWeightKg,
      weightSegmentLabel: best.weightSegmentLabel,
      salesRatePerKg: best.salesRatePerKg,
      ...(isAdmin ? { totalCost: best.totalCost, grossProfit: best.grossProfit } : {}),
      totalSales: best.totalSales,
      totalPrice: best.totalSales
    });
  }

  if (url.endsWith('/api/pricing/rules') && init?.method === 'POST') {
    const rule = {
      id: 'pr-dhl-us-5-20',
      channelId: 'ch-dhl-hk',
      channelName: 'DHL HK',
      destinationCountry: '美国',
      minWeightKg: 5,
      maxWeightKg: 20,
      ratePerKg: 8,
      currency: 'USD',
      enabled: true
    };
    pricingRules.push(rule);
    return jsonResponse(rule);
  }

  if (url.endsWith('/api/pricing/rules/pr-dhl-us-5-20/enabled')) {
    pricingRules[pricingRules.findIndex((rule) => rule.id === 'pr-dhl-us-5-20')] = {
      ...pricingRules.find((rule) => rule.id === 'pr-dhl-us-5-20')!,
      enabled: body.enabled
    };
    return jsonResponse(pricingRules.find((rule) => rule.id === 'pr-dhl-us-5-20'));
  }

  if (url.endsWith('/api/pricing/rules/quote')) {
    return jsonResponse({
      rule: pricingRules[0],
      freight: 290,
      fuel: 43.5,
      surchargeTotal: 50,
      total: 383.5,
      currency: 'CNY',
      originalCurrency: 'USD',
      exchangeRate: 7.25,
      appliedFuelRate: 0.15,
      appliedSurcharges: [{ name: '偏远附加费', amount: 50 }]
    });
  }

  if (url.endsWith('/api/pricing/rules')) {
    return jsonResponse(pricingRules);
  }

  if (url.endsWith('/api/pricing/quote')) {
    return jsonResponse({ freight: 200, fuel: 30, surchargeTotal: 50, total: 280 });
  }

  if (url.endsWith('/api/warehouse/packages')) {
    return jsonResponse(warehousePackages);
  }

  if (url.endsWith('/api/warehouse/package-groups')) {
    return jsonResponse([
      {
        id: '1399',
        customerCode: '1399',
        customerOrderNo: '1399',
        domesticTrackingNo: 'KY4001036478949',
        combinedOrderNo: '1399-KY4001036478949',
        expectedTotalPackageCount: 10,
        arrivedPackageCount: warehousePackages.filter((pkg) => pkg.customerOrderNo === '1399').length,
        remainingPackageCount: 7,
        totalActualWeightKg: 43.1,
        totalCbm: 0.878232,
        maxLengthCm: 126,
        maxWidthCm: 47,
        maxHeightCm: 52,
        maxVolumetricWeightKg: 51.32,
        totalChargeableWeightKg: 146.37,
        latestScanTime: '2026-06-08T10:12:43.000+08:00'
      }
    ]);
  }

  if (url.endsWith('/api/warehouse/packages/sync-mock') && init?.method === 'POST') {
    return jsonResponse(warehousePackages);
  }

  if (url.endsWith('/api/warehouse/consolidations') && init?.method === 'POST') {
    const selected = warehousePackages.filter((pkg) => body.packageIds.includes(pkg.id));
    const mode = body.mode;
    const consolidationNo = `${selected[0]?.customerOrderNo ?? 'WH'}-${mode === 'MERGE_AND_SHIP' ? 'OUT' : 'MERGE'}001`;
    selected.forEach((pkg) => {
      pkg.status = 'CONSOLIDATED';
    });
    if (mode === 'MERGE_AND_SHIP') {
      employeeShipments.unshift(shipment(`s-${consolidationNo}`, consolidationNo, selected[0]?.customerOrderNo ?? consolidationNo, 'DRAFT', '9409-Daloday', {
        businessType: 'DEDICATED_LINE',
        packageCount: selected.length,
        receivableWeightKg: selected.reduce((total, pkg) => total + pkg.chargeableWeightKg, 0),
        agentWeightKg: selected.reduce((total, pkg) => total + pkg.chargeableWeightKg, 0),
        latestTracking: '合并包裹创建出货订单，待审核'
      }));
    }
    return jsonResponse({
      id: `whc-${consolidationNo}`,
      consolidationNo,
      mode,
      shipmentId: mode === 'MERGE_AND_SHIP' ? `s-${consolidationNo}` : undefined,
      systemOrderNo: mode === 'MERGE_AND_SHIP' ? consolidationNo : undefined,
      packageIds: selected.map((pkg) => pkg.id),
      totalPackages: selected.length,
      totalActualWeightKg: selected.reduce((total, pkg) => total + pkg.weightKg, 0),
      totalVolumetricWeightKg: selected.reduce((total, pkg) => total + pkg.volumetricWeightKg, 0),
      totalChargeableWeightKg: selected.reduce((total, pkg) => total + pkg.chargeableWeightKg, 0),
      createdAt: '2026-06-11T20:00:00.000+08:00'
    });
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

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }));
}

function upsertMockShipment(collection: Shipment[], shipment: Shipment) {
  const index = collection.findIndex((item) => item.id === shipment.id);
  if (index >= 0) {
    collection[index] = shipment;
  } else {
    collection.unshift(shipment);
  }
}

function findBestTestMarkupRule(markupRules: AgentMarkupSummary[], row: PriceBookRowSummary): AgentMarkupSummary | undefined {
  const channelName = row.channelName.trim();
  const realChannelName = row.realChannelName?.trim() || channelName;
  const destinationCountry = row.destinationCountry.trim();
  return markupRules
    .filter((rule) => rule.enabled && rule.agentName === row.agentName)
    .sort((left, right) => testMarkupSpecificity(right, channelName, realChannelName, destinationCountry) - testMarkupSpecificity(left, channelName, realChannelName, destinationCountry))
    .find((rule) => {
      const channelMatches = !rule.channelName || rule.channelName === channelName;
      const realChannelMatches = !rule.realChannelName || rule.realChannelName === realChannelName;
      const countryMatches = !rule.destinationCountry || rule.destinationCountry === destinationCountry;
      return channelMatches && realChannelMatches && countryMatches;
    });
}

function testMarkupSpecificity(rule: AgentMarkupSummary, channelName: string, realChannelName: string, destinationCountry: string) {
  let score = 0;
  if (rule.channelName && rule.channelName === channelName) {
    score += 2;
  }
  if (rule.realChannelName && rule.realChannelName === realChannelName) {
    score += 4;
  }
  if (rule.destinationCountry && rule.destinationCountry === destinationCountry) {
    score += 1;
  }
  return score;
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
