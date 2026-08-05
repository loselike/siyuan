import type { PrismaClient } from '@prisma/client';
import type { BusinessType, ShipmentStatus } from '@siyuan/shared';
import { hashPassword } from './password.js';
import { allPermissions, defaultPermissionsForRole } from './rbac.js';

const roles = [
  'ADMIN',
  'CUSTOMER_SERVICE',
  'OPERATOR',
  'WAREHOUSE',
  'FINANCE',
  'CUSTOMER',
  'UG_WAREHOUSE_RECEIVE',
  'UG_WAREHOUSE_OUTBOUND',
  'UG_CUSTOMER_SERVICE',
  'UG_FINANCE',
  'UG_PAYABLE_FINANCE',
  'UG_MARKET',
  'UG_BUSINESS',
  'UG_SZ_WUHAN',
  'UG_ZZ_SIHUA',
  'UG_WH_JIUYULIAN',
  'UG_BUSINESS_MANAGER',
  'UG_BUSINESS_SUPERVISOR'
] as const;
const permissions = allPermissions();

/* Retired static matrix retained below only as migration-era source context.
  'workspace:access',
  'orders:read',
  'orders:write',
  'orders:review:restore',
  'orders:review:purge',
  'routing:read',
  'routing:write',
  'warehouse:read',
  'warehouse:write',
  'tracking:read',
  'tracking:write',
  'problems:read',
  'problems:write',
  'pricing:lookup',
  'pricing:manage',
  'finance:read',
  'finance:settle',
  'finance:business-cost:read',
  'finance:business-cost:manage',
  'finance:business-cost:audit',
  'finance:business-cost:reverse',
  'finance:business-cost:void',
  'finance:business-cost:export',
  'finance:business-cost:view-all',
  'finance:business-cost:view-agent',
  'finance:business-cost:view-profit',
  'finance:order-fee:payable:view',
  'finance:order-fee:payable:manage',
  'finance:order-fee:profit:receivable-payable',
  'finance:order-fee:profit:receivable-business',
  'finance:order-fee:profit:business-payable',
  'finance:payable:read',
  'finance:payable:manage',
  'finance:payable:audit',
  'finance:payable:reverse',
  'finance:payable:void',
  'finance:payable:export',
  'finance:payable:payment',
  'finance:payable:bank',
  'finance:payable:attachment',
  'finance:payable:view-sensitive',
  'finance:payable:view-profit',
  'finance:payable:paid-read',
  'finance:payable:paid-confirm',
  'finance:payable:paid-reverse',
  'finance:payable:paid-export',
  'finance:payable:paid-voucher',
  'finance:payable:paid-bank-view',
  'finance:water-receipt:read',
  'finance:water-receipt:manage',
  'finance:water-receipt:arrive',
  'finance:water-receipt:match',
  'finance:water-receipt:adjust',
  'finance:water-receipt:void',
  'finance:water-receipt:archive',
  'finance:water-receipt:export',
  'finance:water-receipt:voucher',
  'finance:water-receipt:view-all',
  'reports:read',
  'master-data:read',
  'master-data:write',
  'master-data:customers:read',
  'master-data:customers:write',
  'master-data:finance:read',
  'master-data:finance:write',
  'master-data:agents:read',
  'master-data:agents:write',
  'master-data:agent-channels:read',
  'master-data:agent-channels:write',
  'master-data:channels:read',
  'master-data:channels:write',
  'master-data:channel-categories:read',
  'master-data:channel-categories:write',
  'master-data:remote-areas:read',
  'master-data:remote-areas:write',
  'master-data:exchange-rates:read',
  'master-data:exchange-rates:write',
  'master-data:assistant:read',
  'system:manage'
];

const rolePermissions: Record<(typeof roles)[number], string[]> = {
  ADMIN: permissions,
  CUSTOMER_SERVICE: ['workspace:access', 'orders:read', 'orders:write', 'tracking:read', 'tracking:write', 'problems:read', 'problems:write', 'pricing:lookup', 'master-data:read'],
  OPERATOR: ['workspace:access', 'orders:read', 'orders:write', 'routing:read', 'routing:write', 'warehouse:read', 'tracking:read', 'pricing:lookup', 'finance:business-cost:read', 'finance:business-cost:manage', 'finance:water-receipt:read', 'master-data:read', 'master-data:write', 'master-data:channels:read'],
  WAREHOUSE: ['workspace:access', 'orders:read', 'warehouse:read', 'warehouse:write', 'tracking:read'],
  FINANCE: ['workspace:access', 'orders:read', 'orders:review:restore', 'pricing:lookup', 'finance:read', 'finance:settle', 'finance:business-cost:read', 'finance:business-cost:manage', 'finance:business-cost:audit', 'finance:business-cost:reverse', 'finance:business-cost:void', 'finance:business-cost:export', 'finance:business-cost:view-all', 'finance:business-cost:view-agent', 'finance:business-cost:view-profit', 'finance:order-fee:payable:view', 'finance:order-fee:payable:manage', 'finance:order-fee:profit:receivable-payable', 'finance:order-fee:profit:receivable-business', 'finance:order-fee:profit:business-payable', 'finance:payable:read', 'finance:payable:manage', 'finance:payable:audit', 'finance:payable:reverse', 'finance:payable:void', 'finance:payable:export', 'finance:payable:payment', 'finance:payable:bank', 'finance:payable:attachment', 'finance:payable:view-sensitive', 'finance:payable:view-profit', 'finance:payable:paid-read', 'finance:payable:paid-confirm', 'finance:payable:paid-reverse', 'finance:payable:paid-export', 'finance:payable:paid-voucher', 'finance:payable:paid-bank-view', 'finance:water-receipt:read', 'finance:water-receipt:manage', 'finance:water-receipt:arrive', 'finance:water-receipt:match', 'finance:water-receipt:adjust', 'finance:water-receipt:void', 'finance:water-receipt:archive', 'finance:water-receipt:export', 'finance:water-receipt:voucher', 'finance:water-receipt:view-all', 'reports:read', 'master-data:read', 'master-data:agents:read'],
  CUSTOMER: ['workspace:access', 'orders:read', 'orders:write', 'finance:read', 'problems:read', 'problems:write', 'pricing:lookup'],
  UG_WAREHOUSE_RECEIVE: ['workspace:access', 'orders:read', 'warehouse:read', 'warehouse:write', 'tracking:read'],
  UG_WAREHOUSE_OUTBOUND: ['workspace:access', 'orders:read', 'warehouse:read', 'warehouse:write', 'tracking:read'],
  UG_CUSTOMER_SERVICE: ['workspace:access', 'orders:read', 'orders:write', 'tracking:read', 'tracking:write', 'problems:read', 'problems:write', 'pricing:lookup', 'master-data:read'],
  UG_FINANCE: ['workspace:access', 'orders:read', 'orders:review:restore', 'pricing:lookup', 'finance:read', 'finance:settle', 'finance:business-cost:read', 'finance:business-cost:manage', 'finance:business-cost:audit', 'finance:business-cost:reverse', 'finance:business-cost:void', 'finance:business-cost:export', 'finance:business-cost:view-all', 'finance:business-cost:view-agent', 'finance:business-cost:view-profit', 'finance:order-fee:payable:view', 'finance:order-fee:payable:manage', 'finance:order-fee:profit:receivable-payable', 'finance:order-fee:profit:receivable-business', 'finance:order-fee:profit:business-payable', 'finance:payable:read', 'finance:payable:manage', 'finance:payable:audit', 'finance:payable:reverse', 'finance:payable:void', 'finance:payable:export', 'finance:payable:payment', 'finance:payable:bank', 'finance:payable:attachment', 'finance:payable:view-sensitive', 'finance:payable:view-profit', 'finance:payable:paid-read', 'finance:payable:paid-confirm', 'finance:payable:paid-reverse', 'finance:payable:paid-export', 'finance:payable:paid-voucher', 'finance:payable:paid-bank-view', 'finance:water-receipt:read', 'finance:water-receipt:manage', 'finance:water-receipt:arrive', 'finance:water-receipt:match', 'finance:water-receipt:adjust', 'finance:water-receipt:void', 'finance:water-receipt:archive', 'finance:water-receipt:export', 'finance:water-receipt:voucher', 'finance:water-receipt:view-all', 'reports:read', 'master-data:read', 'master-data:agents:read'],
  UG_PAYABLE_FINANCE: ['workspace:access', 'orders:read', 'orders:review:restore', 'pricing:lookup', 'finance:read', 'finance:settle', 'finance:business-cost:read', 'finance:business-cost:manage', 'finance:business-cost:audit', 'finance:business-cost:reverse', 'finance:business-cost:void', 'finance:business-cost:export', 'finance:business-cost:view-all', 'finance:business-cost:view-agent', 'finance:business-cost:view-profit', 'finance:order-fee:payable:view', 'finance:order-fee:payable:manage', 'finance:order-fee:profit:receivable-payable', 'finance:order-fee:profit:receivable-business', 'finance:order-fee:profit:business-payable', 'finance:payable:read', 'finance:payable:manage', 'finance:payable:audit', 'finance:payable:reverse', 'finance:payable:void', 'finance:payable:export', 'finance:payable:payment', 'finance:payable:bank', 'finance:payable:attachment', 'finance:payable:view-sensitive', 'finance:payable:view-profit', 'finance:payable:paid-read', 'finance:payable:paid-confirm', 'finance:payable:paid-reverse', 'finance:payable:paid-export', 'finance:payable:paid-voucher', 'finance:payable:paid-bank-view', 'finance:water-receipt:read', 'finance:water-receipt:manage', 'finance:water-receipt:arrive', 'finance:water-receipt:match', 'finance:water-receipt:adjust', 'finance:water-receipt:void', 'finance:water-receipt:archive', 'finance:water-receipt:export', 'finance:water-receipt:voucher', 'finance:water-receipt:view-all', 'reports:read', 'master-data:read', 'master-data:agents:read'],
  UG_MARKET: ['workspace:access', 'orders:read', 'orders:write', 'routing:read', 'routing:write', 'warehouse:read', 'tracking:read', 'pricing:lookup', 'pricing:manage', 'finance:business-cost:read', 'finance:business-cost:manage', 'finance:water-receipt:read', 'master-data:read', 'master-data:channels:read'],
  UG_BUSINESS: ['workspace:access', 'orders:read', 'orders:write', 'routing:read', 'routing:write', 'warehouse:read', 'tracking:read', 'pricing:lookup', 'finance:business-cost:read', 'finance:business-cost:manage', 'finance:water-receipt:read', 'master-data:read', 'master-data:write', 'master-data:channels:read'],
  UG_SZ_WUHAN: ['workspace:access', 'orders:read', 'orders:write', 'routing:read', 'routing:write', 'warehouse:read', 'tracking:read', 'pricing:lookup', 'finance:business-cost:read', 'finance:business-cost:manage', 'finance:water-receipt:read', 'master-data:read', 'master-data:write', 'master-data:channels:read'],
  UG_ZZ_SIHUA: ['workspace:access', 'orders:read', 'orders:write', 'routing:read', 'routing:write', 'warehouse:read', 'tracking:read', 'pricing:lookup', 'finance:business-cost:read', 'finance:business-cost:manage', 'finance:water-receipt:read', 'master-data:read', 'master-data:write', 'master-data:channels:read'],
  UG_WH_JIUYULIAN: ['workspace:access', 'orders:read', 'orders:write', 'routing:read', 'routing:write', 'warehouse:read', 'tracking:read', 'pricing:lookup', 'finance:business-cost:read', 'finance:business-cost:manage', 'finance:water-receipt:read', 'master-data:read', 'master-data:write', 'master-data:channels:read'],
  UG_BUSINESS_MANAGER: ['workspace:access', 'orders:read', 'orders:write', 'routing:read', 'routing:write', 'warehouse:read', 'tracking:read', 'pricing:lookup', 'finance:business-cost:read', 'finance:business-cost:manage', 'finance:water-receipt:read', 'master-data:read', 'master-data:write', 'master-data:channels:read'],
  UG_BUSINESS_SUPERVISOR: ['workspace:access', 'orders:read', 'orders:write', 'routing:read', 'routing:write', 'warehouse:read', 'tracking:read', 'pricing:lookup', 'finance:business-cost:read', 'finance:business-cost:manage', 'finance:water-receipt:read', 'master-data:read', 'master-data:write', 'master-data:channels:read']
};

*/
const rolePermissions: Record<(typeof roles)[number], string[]> = Object.fromEntries(
  roles.map((role) => [role, defaultPermissionsForRole(role)])
) as Record<(typeof roles)[number], string[]>;

const roleMetadata: Record<(typeof roles)[number], { label: string; description?: string; site?: string; sortOrder: number; systemBuiltin: boolean }> = {
  ADMIN: { label: '管理员组', description: '系统管理员', sortOrder: 0, systemBuiltin: true },
  CUSTOMER_SERVICE: { label: '客服', sortOrder: 103, systemBuiltin: true },
  OPERATOR: { label: '业务员', sortOrder: 104, systemBuiltin: true },
  WAREHOUSE: { label: '仓库', sortOrder: 102, systemBuiltin: true },
  FINANCE: { label: '财务', sortOrder: 105, systemBuiltin: true },
  CUSTOMER: { label: '客户', sortOrder: 106, systemBuiltin: true },
  UG_WAREHOUSE_RECEIVE: { label: '仓库收货', site: '深圳思远', sortOrder: 1, systemBuiltin: false },
  UG_WAREHOUSE_OUTBOUND: { label: '仓库出货', site: '深圳思远', sortOrder: 2, systemBuiltin: false },
  UG_CUSTOMER_SERVICE: { label: '客服', description: '处理一般客服工作', site: '深圳思远', sortOrder: 3, systemBuiltin: false },
  UG_FINANCE: { label: '财务', site: '深圳思远', sortOrder: 4, systemBuiltin: false },
  UG_PAYABLE_FINANCE: { label: '出入账财务', description: '处理代理结算', site: '深圳思远', sortOrder: 5, systemBuiltin: false },
  UG_MARKET: { label: '市场部', description: '处理排货', site: '深圳思远', sortOrder: 6, systemBuiltin: false },
  UG_BUSINESS: { label: '业务部', sortOrder: 7, systemBuiltin: false },
  UG_SZ_WUHAN: { label: '深圳思远武汉', sortOrder: 8, systemBuiltin: false },
  UG_ZZ_SIHUA: { label: '漳州思华', sortOrder: 9, systemBuiltin: false },
  UG_WH_JIUYULIAN: { label: '武汉九域联', sortOrder: 10, systemBuiltin: false },
  UG_BUSINESS_MANAGER: { label: '业务经理', sortOrder: 11, systemBuiltin: false },
  UG_BUSINESS_SUPERVISOR: { label: '业务主管', sortOrder: 12, systemBuiltin: false }
};

interface SeedShipment {
  id: string;
  customerId: string;
  agentId?: string;
  channelId?: string;
  customerOrderNo: string;
  systemOrderNo: string;
  transferNo?: string;
  businessType: BusinessType;
  status: ShipmentStatus;
  destinationCountry: string;
  packageType: 'DOC' | 'WPX' | 'PAK';
  packageCount: number;
  receivableWeightKg: number;
  agentWeightKg: number;
  latestTracking: string;
  trackingStaleDays: number;
  isRemoteArea: boolean;
  createdAt: Date;
}

const seedShipments: SeedShipment[] = [
  {
    id: 's-seed-1',
    customerId: 'c-9409',
    agentId: 'a-far-east',
    channelId: 'ch-fedex-au',
    customerOrderNo: 'DAL-0605-AU',
    systemOrderNo: 'SYGJ06059409051',
    businessType: 'EXPRESS',
    packageType: 'WPX',
    destinationCountry: '澳大利亚',
    packageCount: 4,
    receivableWeightKg: 56,
    agentWeightKg: 56,
    latestTracking: '收货扫描',
    trackingStaleDays: 1,
    isRemoteArea: false,
    status: 'WAITING_SORT',
    createdAt: new Date('2026-06-05T15:37:00.000Z')
  },
  {
    id: 's-seed-2',
    customerId: 'c-1344',
    agentId: 'a-yuhuan',
    channelId: 'ch-dhl-hk',
    customerOrderNo: 'TILL-0529',
    systemOrderNo: 'SYGJ05291344165',
    transferNo: '9064656160',
    businessType: 'EXPRESS',
    packageType: 'WPX',
    destinationCountry: '未知',
    packageCount: 5,
    receivableWeightKg: 77,
    agentWeightKg: 76,
    latestTracking: '已出库，待客服补齐离港信息',
    trackingStaleDays: 9,
    isRemoteArea: false,
    status: 'WAITING_DEPARTURE',
    createdAt: new Date('2026-05-27T16:58:00.000Z')
  },
  {
    id: 's-seed-3',
    customerId: 'c-9409',
    agentId: 'a-yuhuan',
    channelId: 'ch-dhl-hk',
    customerOrderNo: 'RCV-0606',
    systemOrderNo: 'SYGJ06061230001',
    businessType: 'EXPRESS',
    packageType: 'WPX',
    destinationCountry: '美国',
    packageCount: 2,
    receivableWeightKg: 18,
    agentWeightKg: 18,
    latestTracking: '审核通过，等待渠道排货',
    trackingStaleDays: 0,
    isRemoteArea: false,
    status: 'WAITING_SORT',
    createdAt: new Date('2026-06-06T09:40:00.000Z')
  },
  {
    id: 's-seed-4',
    customerId: 'c-9509',
    agentId: 'a-canada',
    channelId: 'ch-ups-ca',
    customerOrderNo: 'DSP-0606',
    systemOrderNo: 'SYGJ06061230002',
    transferNo: '1Z26060600001',
    businessType: 'EXPRESS',
    packageType: 'WPX',
    destinationCountry: '加拿大',
    packageCount: 1,
    receivableWeightKg: 21,
    agentWeightKg: 19.5,
    latestTracking: '渠道已确认，等待仓库出库',
    trackingStaleDays: 0,
    isRemoteArea: false,
    status: 'WAITING_DISPATCH',
    createdAt: new Date('2026-06-06T09:55:00.000Z')
  },
  {
    id: 's-seed-5',
    customerId: 'c-9409',
    agentId: 'a-lanmate',
    channelId: 'ch-usps',
    customerOrderNo: 'SP-US-0606',
    systemOrderNo: 'SYXB0606US001',
    businessType: 'SMALL_PACKET',
    packageType: 'PAK',
    destinationCountry: '美国',
    packageCount: 8,
    receivableWeightKg: 12.4,
    agentWeightKg: 12,
    latestTracking: '新建出货订单，待审核',
    trackingStaleDays: 0,
    isRemoteArea: false,
    status: 'DRAFT',
    createdAt: new Date('2026-06-06T08:42:00.000Z')
  },
  {
    id: 's-seed-6',
    customerId: 'c-1344',
    agentId: 'a-europe',
    channelId: 'ch-europe-truck',
    customerOrderNo: 'FBA-UK-0606',
    systemOrderNo: 'SYZX0606UK001',
    businessType: 'DEDICATED_LINE',
    packageType: 'WPX',
    destinationCountry: '英国',
    packageCount: 28,
    receivableWeightKg: 460,
    agentWeightKg: 455,
    latestTracking: '清关查验',
    trackingStaleDays: 4,
    isRemoteArea: false,
    status: 'PROBLEM',
    createdAt: new Date('2026-06-06T07:50:00.000Z')
  }
];

const seedAgentMarkupRules = [
  { id: 'markup-a-default', agentName: 'a代理', markupPerKg: 0.5, markupType: 'WEIGHT', markupValue: 0.5, priority: 100 },
  { id: 'markup-b-default', agentName: 'b代理', markupPerKg: 1, markupType: 'WEIGHT', markupValue: 1, priority: 100 }
];

const seedWarehousePackages = [
  { id: 'wh-api-1399-1', combinedOrderNo: '1399-KY4001036478949', customerCode: '1399', customerOrderNo: '1399', domesticTrackingNo: 'KY4001036478949', expectedTotalPackageCount: 10, weightKg: 14.2, lengthCm: 128, widthCm: 46, heightCm: 51, cbm: 0.300288, volumetricWeightKg: 50.05, scanTime: new Date('2026-06-08T10:07:28+08:00'), remark: '木架，外箱轻微磨损' },
  { id: 'wh-api-1399-2', combinedOrderNo: '1399-KY4001036478949', customerCode: '1399', customerOrderNo: '1399', domesticTrackingNo: 'KY4001036478949', expectedTotalPackageCount: 10, weightKg: 13.9, lengthCm: 130, widthCm: 46, heightCm: 51, cbm: 0.30498, volumetricWeightKg: 50.83, scanTime: new Date('2026-06-08T10:08:08+08:00') },
  { id: 'wh-api-1399-3', combinedOrderNo: '1399-KY4001036478949', customerCode: '1399', customerOrderNo: '1399', domesticTrackingNo: 'KY4001036478949', expectedTotalPackageCount: 10, weightKg: 14.2, lengthCm: 129, widthCm: 46, heightCm: 51, cbm: 0.302634, volumetricWeightKg: 50.44, scanTime: new Date('2026-06-08T10:08:48+08:00') },
  { id: 'wh-api-p710-1', combinedOrderNo: 'P710-999056444656', customerCode: 'P710', customerOrderNo: 'P710', domesticTrackingNo: '999056444656', expectedTotalPackageCount: 5, weightKg: 18, lengthCm: 54, widthCm: 34, heightCm: 41, cbm: 0.075276, volumetricWeightKg: 12.55, scanTime: new Date('2026-06-08T10:14:14+08:00') },
  { id: 'wh-api-p710-2', combinedOrderNo: 'P710-999056444656', customerCode: 'P710', customerOrderNo: 'P710', domesticTrackingNo: '999056444656', expectedTotalPackageCount: 5, weightKg: 18, lengthCm: 54, widthCm: 34, heightCm: 41, cbm: 0.075276, volumetricWeightKg: 12.55, scanTime: new Date('2026-06-08T10:14:14+08:00') },
  { id: 'wh-api-p710-3', combinedOrderNo: 'P710-999056444656', customerCode: 'P710', customerOrderNo: 'P710', domesticTrackingNo: '999056444656', expectedTotalPackageCount: 5, weightKg: 18, lengthCm: 54, widthCm: 35, heightCm: 41, cbm: 0.07749, volumetricWeightKg: 12.91, scanTime: new Date('2026-06-08T10:14:23+08:00') }
];

export async function resetAndSeedDatabase(prisma: PrismaClient) {
  await prisma.problemReply.deleteMany();
  await prisma.problemTicket.deleteMany();
  await prisma.trackingEvent.deleteMany();
  await prisma.shipmentEvent.deleteMany();
  await prisma.shipmentPackage.deleteMany();
  await prisma.receivableFee.deleteMany();
  await prisma.payableFee.deleteMany();
  await (prisma as any).pricingRule.deleteMany();
  await (prisma as any).exchangeRate.deleteMany();
  await prisma.fuelRate.deleteMany();
  await prisma.surcharge.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.accountLedger.deleteMany();
  await prisma.carrierTask.deleteMany();
  await prisma.shipmentLabel.deleteMany();
  await (prisma as any).warehouseConsolidationItem.deleteMany();
  await (prisma as any).warehouseConsolidation.deleteMany();
  await (prisma as any).warehousePackage.deleteMany();
  await (prisma as any).agentMarkupRule.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.customerContact.deleteMany();
  await prisma.customerAccount.deleteMany();
  await prisma.customer.deleteMany();
  await (prisma as any).site.deleteMany();
  await (prisma as any).agentChannel.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.carrier.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();

  for (const code of permissions) {
    await prisma.permission.create({ data: { id: `p-${code}`, code } });
  }

  for (const role of roles) {
    const metadata = roleMetadata[role];
    await prisma.role.create({
      data: {
        id: `r-${role.toLowerCase()}`,
        name: role,
        label: metadata.label,
        description: metadata.description,
        site: metadata.site,
        sortOrder: metadata.sortOrder,
        enabled: true,
        systemBuiltin: metadata.systemBuiltin,
        permissions: { connect: rolePermissions[role].map((code) => ({ code })) }
      }
    });
  }

  await prisma.department.createMany({
    data: [
      { id: 'department-business', name: '业务部', enabled: true },
      { id: 'department-market', name: '市场部', enabled: true },
      { id: 'department-warehouse', name: '仓储部', enabled: true },
      { id: 'department-customer-service', name: '客服部', enabled: true },
      { id: 'department-finance', name: '财务部', enabled: true },
      { id: 'department-system', name: '系统管理部', enabled: true }
    ]
  });

  await prisma.customer.createMany({
    data: [
      { id: 'c-9409', code: '9409', name: 'Daloday', customerSource: '手动录入', salesperson: 'operator', defaultSettlementMethod: 'RMB月结' },
      { id: 'c-1344', code: '1344', name: 'TILL' },
      { id: 'c-9509', code: '9509', name: 'Cam&Clae' }
    ]
  });

  await prisma.customerContact.createMany({
    data: [
      { id: 'cc-9409-main', customerId: 'c-9409', name: 'Daloday 联系人', company: 'Daloday Inc.', phone: '13800000001', email: 'daloday@example.com', address: '9409 Sample Street', country: 'US', state: 'CA', postalCode: '90001' },
      { id: 'cc-1344-main', customerId: 'c-1344', name: 'TILL 联系人', phone: '13800000002', email: 'till@example.com' }
    ]
  });

  await prisma.customerAccount.createMany({
    data: [
      { id: 'ca-9409-cny', customerId: 'c-9409', balance: 10000, currency: 'RMB' },
      { id: 'ca-1344-cny', customerId: 'c-1344', balance: 8000, currency: 'RMB' }
    ]
  });

  await prisma.accountLedger.createMany({
    data: [
      { id: 'al-seed-9409', partyType: 'CUSTOMER', partyId: 'c-9409', amount: 10000, balance: 10000, note: '期初余额', createdAt: new Date('2026-06-01T10:00:00.000Z') },
      { id: 'al-seed-1344', partyType: 'CUSTOMER', partyId: 'c-1344', amount: 8000, balance: 8000, note: '期初余额', createdAt: new Date('2026-06-01T10:00:00.000Z') }
    ]
  });

  await prisma.user.createMany({
    data: [
      { id: 'u-admin', username: 'admin', passwordHash: hashPassword('admin123'), roleId: 'r-admin', departmentId: 'department-system' },
      { id: 'u-cs', username: 'service', passwordHash: hashPassword('service123'), roleId: 'r-customer_service', departmentId: 'department-customer-service' },
      { id: 'u-op', username: 'operator', passwordHash: hashPassword('operator123'), roleId: 'r-operator', departmentId: 'department-business' },
      { id: 'u-market', username: 'market', passwordHash: hashPassword('market123'), roleId: 'r-ug_market', name: 'market', departmentId: 'department-market' },
      { id: 'u-warehouse', username: 'warehouse', passwordHash: hashPassword('warehouse123'), roleId: 'r-warehouse', departmentId: 'department-warehouse' },
      { id: 'u-finance', username: 'finance', passwordHash: hashPassword('finance123'), roleId: 'r-finance', departmentId: 'department-finance' },
      { id: 'u-r-admin', username: 'R-admin', passwordHash: hashPassword('R-admin@123'), roleId: 'r-admin', name: 'R-admin', departmentId: 'department-system' },
      { id: 'u-r-sales', username: 'R-sales', passwordHash: hashPassword('R-sales@123'), roleId: 'r-operator', name: 'R-sales', site: '深圳站', departmentId: 'department-business' },
      { id: 'u-r-market', username: 'R-market', passwordHash: hashPassword('R-market@123'), roleId: 'r-operator', name: 'R-market', departmentId: 'department-market' },
      { id: 'u-r-warehouse', username: 'R-warehouse', passwordHash: hashPassword('R-warehouse@123'), roleId: 'r-warehouse', name: 'R-warehouse', site: '深圳站', departmentId: 'department-warehouse' },
      { id: 'u-r-service', username: 'R-service', passwordHash: hashPassword('R-service@123'), roleId: 'r-customer_service', name: 'R-service', departmentId: 'department-customer-service' },
      { id: 'u-r-finance', username: 'R-finance', passwordHash: hashPassword('R-finance@123'), roleId: 'r-finance', name: 'R-finance', departmentId: 'department-finance' },
      {
        id: 'u-customer',
        username: 'customer',
        passwordHash: hashPassword('customer123'),
        roleId: 'r-customer',
        customerId: 'c-9409'
      }
    ]
  });

  await (prisma as any).site.createMany({
    data: [
      { id: 'site-sz-siyuan', sortOrder: 1, name: '深圳站', enabled: true },
      { id: 'site-shenzhen-siyuan', sortOrder: 2, name: '深圳思远', enabled: true },
      { id: 'site-shenzhen-siyuan-wuhan', sortOrder: 3, name: '深圳思远武汉', enabled: true },
      { id: 'site-zhangzhou-sihua', sortOrder: 4, name: '漳州思华', enabled: true },
      { id: 'site-wuhan-jiuyulian', sortOrder: 5, name: '武汉九域联', enabled: true }
    ]
  });

  await prisma.agent.createMany({
    data: [
      { id: 'a-9409-ups', code: 'AG-9409-UPS', shortName: 'AG-9409-UPS', name: 'AG-9409-UPS' },
      { id: 'a-yuhuan', name: '宇环' },
      { id: 'a-far-east', name: '远东' },
      { id: 'a-canada', name: '加美代理' },
      { id: 'a-lanmate', name: '蓝玛特' },
      { id: 'a-europe', name: '欧洲代理' }
    ]
  });

  await prisma.carrier.createMany({
    data: [
      { id: 'cr-dhl', name: 'DHL' },
      { id: 'cr-fedex', name: 'FEDEX' },
      { id: 'cr-ups', name: 'UPS' },
      { id: 'cr-usps', name: 'USPS' },
      { id: 'cr-yanwen', name: 'YANWEN' },
      { id: 'cr-line', name: '专线承运商' }
    ]
  });

  await prisma.channel.createMany({
    data: [
      { id: 'ch-9409-ups-exp', name: 'COCH-US-UPS-EXP', carrierId: 'cr-ups', businessType: 'EXPRESS', category: 'UPS', volumeDivisor: 6000 },
      { id: 'ch-dhl-hk', name: 'DHL HK', carrierId: 'cr-dhl' },
      { id: 'ch-fedex-au', name: 'FEDEX AU 促销', carrierId: 'cr-fedex' },
      { id: 'ch-ups-ca', name: 'UPS 加美线', carrierId: 'cr-ups' },
      { id: 'ch-usps', name: 'USPS 小包线', carrierId: 'cr-usps' },
      { id: 'ch-yanwen', name: '燕文小包线', carrierId: 'cr-yanwen' },
      { id: 'ch-europe-truck', name: '欧洲卡航', carrierId: 'cr-line' }
    ]
  });

  await (prisma as any).agentChannel.createMany({
    data: [
      { id: 'ach-9409-ups-exp', agentId: 'a-9409-ups', channelName: 'AGCH-UPS-EXP' },
      { id: 'ach-yuhuan-dhl', agentId: 'a-yuhuan', channelName: '宇环 DHL' },
      { id: 'ach-far-east-fedex', agentId: 'a-far-east', channelName: '远东 FEDEX' }
    ]
  });

  await prisma.surcharge.createMany({
    data: [
      { id: 'sc-remote', name: '偏远附加费', amount: 50 }
    ]
  });

  await prisma.fuelRate.createMany({
    data: [
      { id: 'fr-dhl-hk', channelId: 'ch-dhl-hk', rate: 0.15, activeAt: new Date('2026-06-06T00:00:00.000Z') }
    ]
  });

  await (prisma as any).exchangeRate.createMany({
    data: [
      { id: 'er-usd-cny', baseCurrency: 'USD', quoteCurrency: 'RMB', rate: 7.245, activeAt: new Date('2026-06-06T00:00:00.000Z'), enabled: true }
    ]
  });

  await (prisma as any).pricingRule.createMany({
    data: [
      { id: 'pr-dhl-us-0-5', channelId: 'ch-dhl-hk', destinationCountry: '美国', minWeightKg: 0, maxWeightKg: 5, ratePerKg: 10, currency: 'USD', enabled: true },
      { id: 'pr-dhl-us-5-20', channelId: 'ch-dhl-hk', destinationCountry: '美国', minWeightKg: 5, maxWeightKg: 20, ratePerKg: 9.5, currency: 'USD', enabled: true },
      { id: 'pr-fedex-us-0-5', channelId: 'ch-fedex-au', destinationCountry: '美国', minWeightKg: 0, maxWeightKg: 5, ratePerKg: 68, currency: 'RMB', enabled: true },
      { id: 'pr-fedex-us-5-20', channelId: 'ch-fedex-au', destinationCountry: '美国', minWeightKg: 5, maxWeightKg: 20, ratePerKg: 62, currency: 'RMB', enabled: true },
      { id: 'pr-line-us-0-5', channelId: 'ch-europe-truck', destinationCountry: '美国', minWeightKg: 0, maxWeightKg: 5, ratePerKg: 48, currency: 'RMB', enabled: true },
      { id: 'pr-line-us-5-20', channelId: 'ch-europe-truck', destinationCountry: '美国', minWeightKg: 5, maxWeightKg: 20, ratePerKg: 42, currency: 'RMB', enabled: true }
    ]
  });

  await (prisma as any).agentMarkupRule.createMany({
    data: seedAgentMarkupRules.map((rule) => ({
      ...rule,
      markupPerKg: rule.markupPerKg,
      enabled: true
    }))
  });

  await (prisma as any).warehousePackage.createMany({
    data: seedWarehousePackages.map((pkg) => ({
      ...pkg,
      receivingChannel: '仓库接口返回',
      destinationCountry: '美国',
      packageCount: 1,
      chargeableWeightKg: Math.max(pkg.weightKg, pkg.volumetricWeightKg),
      divisor: 6000,
      roundingRule: 'NONE',
      status: 'RECEIVED',
      exceptions: pkg.expectedTotalPackageCount && pkg.expectedTotalPackageCount > 1 ? ['部分到仓'] : []
    }))
  });

  for (const shipment of seedShipments) {
    await prisma.shipment.create({
      data: {
        ...shipment,
        packages: {
          create: {
            id: `${shipment.id}-pkg-1`,
            lengthCm: 30,
            widthCm: 20,
            heightCm: 10,
            actualKg: shipment.receivableWeightKg,
            volumeKg: shipment.receivableWeightKg
          }
        },
        events: {
          create: {
            id: `${shipment.id}-evt-created`,
            toStatus: shipment.status,
            note: 'seed'
          }
        },
        trackingEvents: {
          create: {
            id: `${shipment.id}-trk-latest`,
            status: shipment.latestTracking,
            happenedAt: shipment.createdAt
          }
        }
      }
    });
  }

  await prisma.shipmentLabel.create({
    data: {
      id: 'lbl-seed-1',
      shipmentId: 's-seed-4',
      carrier: 'UPS',
      channelName: 'UPS 加美线',
      labelNo: 'LBL26060600001',
      transferNo: '1Z26060600001',
      labelUrl: '/mock-labels/LBL26060600001.pdf',
      status: 'CREATED',
      createdAt: new Date('2026-06-06T10:00:00.000Z')
    }
  });

  await prisma.carrierTask.create({
    data: {
      id: 'ct-seed-1',
      shipmentId: 's-seed-2',
      type: 'TRACKING_SYNC',
      carrier: 'DHL',
      transferNo: '9064656160',
      status: 'PENDING',
      attempts: 0,
      createdAt: new Date('2026-06-06T10:05:00.000Z')
    }
  });

  await prisma.problemTicket.create({
    data: {
      id: 'pt-seed-1',
      shipmentId: 's-seed-2',
      reason: '轨迹超过3天未更新',
      status: 'OPEN',
      customerVisible: true,
      replies: { create: { id: 'ptr-seed-1', author: '客服', message: '已联系代理确认上网节点' } }
    }
  });

  await prisma.receivableFee.createMany({
    data: [
      { id: 'rf-seed-1', shipmentId: 's-seed-1', name: '基础运费', amount: 1864.2 },
      { id: 'rf-seed-2', shipmentId: 's-seed-2', name: '基础运费', amount: 2410.5 }
    ]
  });

  await prisma.payableFee.createMany({
    data: [
      { id: 'pf-seed-1', shipmentId: 's-seed-1', name: '代理成本', amount: 1490.6 },
      { id: 'pf-seed-2', shipmentId: 's-seed-2', name: '代理成本', amount: 2056.3 }
    ]
  });
}
