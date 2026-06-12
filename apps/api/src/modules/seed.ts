import type { PrismaClient } from '@prisma/client';
import type { BusinessType, ShipmentStatus } from '@siyuan/shared';
import { hashPassword } from './password.js';

const roles = ['ADMIN', 'CUSTOMER_SERVICE', 'OPERATOR', 'WAREHOUSE', 'FINANCE', 'CUSTOMER'] as const;
const permissions = [
  'workspace:access',
  'orders:read',
  'orders:write',
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
  'reports:read',
  'master-data:read',
  'master-data:write',
  'system:manage'
];

const rolePermissions: Record<(typeof roles)[number], string[]> = {
  ADMIN: permissions,
  CUSTOMER_SERVICE: ['workspace:access', 'orders:read', 'orders:write', 'tracking:read', 'tracking:write', 'problems:read', 'problems:write', 'pricing:lookup', 'master-data:read'],
  OPERATOR: ['workspace:access', 'orders:read', 'orders:write', 'routing:read', 'routing:write', 'tracking:read', 'pricing:lookup', 'master-data:read'],
  WAREHOUSE: ['workspace:access', 'orders:read', 'warehouse:read', 'warehouse:write', 'tracking:read'],
  FINANCE: ['workspace:access', 'orders:read', 'pricing:lookup', 'finance:read', 'finance:settle', 'reports:read', 'master-data:read'],
  CUSTOMER: ['workspace:access', 'orders:read', 'orders:write', 'finance:read', 'problems:read', 'problems:write', 'pricing:lookup']
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
    latestTracking: '离开扫描',
    trackingStaleDays: 9,
    isRemoteArea: false,
    status: 'WAITING_ONLINE',
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
    latestTracking: '客户已预报',
    trackingStaleDays: 0,
    isRemoteArea: false,
    status: 'WAITING_RECEIVE',
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
    latestTracking: '已生成面单',
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
    latestTracking: '已预报',
    trackingStaleDays: 0,
    isRemoteArea: false,
    status: 'DECLARED',
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
    status: 'STUCK',
    createdAt: new Date('2026-06-06T07:50:00.000Z')
  }
];

const seedAgentMarkupRules = [
  { id: 'markup-a-default', agentName: 'a代理', markupPerKg: 0.5 },
  { id: 'markup-b-default', agentName: 'b代理', markupPerKg: 1 },
  { id: 'markup-yiyang-default', agentName: '亿阳国际', markupPerKg: 0.5 }
];

const seedWarehousePackages = [
  { id: 'wh-api-1399-1', combinedOrderNo: '1399-KY4001036478949', customerCode: '1399', customerOrderNo: '1399', domesticTrackingNo: 'KY4001036478949', expectedTotalPackageCount: 10, weightKg: 14.2, lengthCm: 128, widthCm: 46, heightCm: 51, cbm: 0.300288, volumetricWeightKg: 50.05, scanTime: new Date('2026-06-08T10:07:28+08:00') },
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
  await prisma.customerContact.deleteMany();
  await prisma.customerAccount.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.carrier.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();

  for (const code of permissions) {
    await prisma.permission.create({ data: { id: `p-${code}`, code } });
  }

  for (const role of roles) {
    await prisma.role.create({
      data: {
        id: `r-${role.toLowerCase()}`,
        name: role,
        permissions: { connect: rolePermissions[role].map((code) => ({ code })) }
      }
    });
  }

  await prisma.customer.createMany({
    data: [
      { id: 'c-9409', code: '9409', name: 'Daloday' },
      { id: 'c-1344', code: '1344', name: 'TILL' },
      { id: 'c-9509', code: '9509', name: 'Cam&Clae' }
    ]
  });

  await prisma.customerContact.createMany({
    data: [
      { id: 'cc-9409-main', customerId: 'c-9409', name: 'Daloday 联系人', phone: '13800000001', email: 'daloday@example.com' },
      { id: 'cc-1344-main', customerId: 'c-1344', name: 'TILL 联系人', phone: '13800000002', email: 'till@example.com' }
    ]
  });

  await prisma.customerAccount.createMany({
    data: [
      { id: 'ca-9409-cny', customerId: 'c-9409', balance: 10000, currency: 'CNY' },
      { id: 'ca-1344-cny', customerId: 'c-1344', balance: 8000, currency: 'CNY' }
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
      { id: 'u-admin', username: 'admin', passwordHash: hashPassword('admin123'), roleId: 'r-admin' },
      { id: 'u-cs', username: 'service', passwordHash: hashPassword('service123'), roleId: 'r-customer_service' },
      { id: 'u-op', username: 'operator', passwordHash: hashPassword('operator123'), roleId: 'r-operator' },
      { id: 'u-warehouse', username: 'warehouse', passwordHash: hashPassword('warehouse123'), roleId: 'r-warehouse' },
      { id: 'u-finance', username: 'finance', passwordHash: hashPassword('finance123'), roleId: 'r-finance' },
      {
        id: 'u-customer',
        username: 'customer',
        passwordHash: hashPassword('customer123'),
        roleId: 'r-customer',
        customerId: 'c-9409'
      }
    ]
  });

  await prisma.agent.createMany({
    data: [
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
      { id: 'ch-dhl-hk', name: 'DHL HK', carrierId: 'cr-dhl' },
      { id: 'ch-fedex-au', name: 'FEDEX AU 促销', carrierId: 'cr-fedex' },
      { id: 'ch-ups-ca', name: 'UPS 加美线', carrierId: 'cr-ups' },
      { id: 'ch-usps', name: 'USPS 小包线', carrierId: 'cr-usps' },
      { id: 'ch-yanwen', name: '燕文小包线', carrierId: 'cr-yanwen' },
      { id: 'ch-europe-truck', name: '欧洲卡航', carrierId: 'cr-line' }
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
      { id: 'er-usd-cny', baseCurrency: 'USD', quoteCurrency: 'CNY', rate: 7.245, activeAt: new Date('2026-06-06T00:00:00.000Z'), enabled: true }
    ]
  });

  await (prisma as any).pricingRule.createMany({
    data: [
      { id: 'pr-dhl-us-0-5', channelId: 'ch-dhl-hk', destinationCountry: '美国', minWeightKg: 0, maxWeightKg: 5, ratePerKg: 10, currency: 'USD', enabled: true },
      { id: 'pr-dhl-us-5-20', channelId: 'ch-dhl-hk', destinationCountry: '美国', minWeightKg: 5, maxWeightKg: 20, ratePerKg: 9.5, currency: 'USD', enabled: true },
      { id: 'pr-fedex-us-0-5', channelId: 'ch-fedex-au', destinationCountry: '美国', minWeightKg: 0, maxWeightKg: 5, ratePerKg: 68, currency: 'CNY', enabled: true },
      { id: 'pr-fedex-us-5-20', channelId: 'ch-fedex-au', destinationCountry: '美国', minWeightKg: 5, maxWeightKg: 20, ratePerKg: 62, currency: 'CNY', enabled: true },
      { id: 'pr-line-us-0-5', channelId: 'ch-europe-truck', destinationCountry: '美国', minWeightKg: 0, maxWeightKg: 5, ratePerKg: 48, currency: 'CNY', enabled: true },
      { id: 'pr-line-us-5-20', channelId: 'ch-europe-truck', destinationCountry: '美国', minWeightKg: 5, maxWeightKg: 20, ratePerKg: 42, currency: 'CNY', enabled: true }
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
