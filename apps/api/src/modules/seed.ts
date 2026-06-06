import type { PrismaClient } from '@prisma/client';
import type { BusinessType, ShipmentStatus } from '@siyuan/shared';
import { hashPassword } from './password.js';

const roles = ['ADMIN', 'CUSTOMER_SERVICE', 'OPERATOR', 'FINANCE', 'CUSTOMER'] as const;
const permissions = [
  'shipments:read',
  'shipments:write',
  'finance:read',
  'finance:settle',
  'master-data:read',
  'system:manage'
];

const rolePermissions: Record<(typeof roles)[number], string[]> = {
  ADMIN: permissions,
  CUSTOMER_SERVICE: ['shipments:read', 'shipments:write', 'master-data:read'],
  OPERATOR: ['shipments:read', 'shipments:write', 'master-data:read'],
  FINANCE: ['shipments:read', 'finance:read', 'finance:settle', 'master-data:read'],
  CUSTOMER: ['shipments:read', 'shipments:write', 'finance:read']
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
