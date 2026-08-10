import type {
  AgentChannelSummary,
  AgentInvoiceTemplate,
  AgentSummary,
  ChannelCategorySummary,
  CompanyChannelBusinessType,
  MasterDataSnapshot
} from '@siyuan/shared';
import { PrismaService } from '../prisma.service.js';

/**
 * Read-only master-data slice extracted from the application repository.
 *
 * This class deliberately owns no permissions, transactions, writes, or audit
 * behavior. It is a compatibility boundary for the existing snapshot shape;
 * the application repository still exposes the same getMasterData method.
 */
export class PrismaMasterDataReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSnapshot(): Promise<MasterDataSnapshot> {
    const [customers, contacts, customerUsers, salespersonAccounts, carriers, channels, channelCategories, roles, agents, agentChannels, surcharges, fuelRates, exchangeRates] = await Promise.all([
      this.prisma.customer.findMany({ orderBy: { code: 'asc' } }),
      this.prisma.customerContact.findMany({ include: { customer: true }, orderBy: { name: 'asc' } }),
      this.prisma.user.findMany({ where: { customerId: { not: null }, role: { name: 'CUSTOMER' } }, include: { customer: true }, orderBy: { username: 'asc' } }),
      this.prisma.user.findMany({ where: { site: { not: null } }, select: { username: true, site: true } }),
      this.prisma.carrier.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.channel.findMany({ where: { deletedAt: null }, include: { carrier: true }, orderBy: { name: 'asc' } }),
      this.prisma.channelCategory.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.role.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.agent.findMany({ orderBy: [{ createdAt: 'desc' } as any, { name: 'asc' }] }),
      this.prisma.agentChannel.findMany({ include: { agent: true }, orderBy: [{ agent: { name: 'asc' } }, { channelName: 'asc' }] }),
      this.prisma.surcharge.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.fuelRate.findMany({ orderBy: { activeAt: 'desc' } }),
      (this.prisma as any).exchangeRate.findMany({ orderBy: { activeAt: 'desc' } })
    ]);
    const channelMap = new Map(channels.map((channel) => [channel.id, channel.name]));
    const salespersonSiteByUsername = new Map(salespersonAccounts.map((account) => [account.username, account.site]));

    return {
      customers: customers.map((customer) => ({
        id: customer.id,
        code: customer.code,
        name: customer.name,
        shortName: customer.name,
        fullName: `${customer.name} Co., Ltd.`,
        customerType: '直客',
        customerSource: (customer as any).customerSource ?? undefined,
        salesperson: customer.salesperson ?? '',
        salespersonSite: customer.salesperson ? salespersonSiteByUsername.get(customer.salesperson) ?? undefined : undefined,
        defaultSettlementMethod: (customer as any).defaultSettlementMethod ?? undefined,
        enabled: customer.enabled
      })),
      contacts: contacts.map((contact) => ({
        id: contact.id,
        customerId: contact.customerId,
        customerName: `${contact.customer.code}-${contact.customer.name}`,
        name: contact.name,
        company: contact.company ?? undefined,
        phone: contact.phone ?? undefined,
        email: contact.email ?? undefined,
        fbaWarehouseCode: contact.fbaWarehouseCode ?? undefined,
        address: contact.address ?? undefined,
        country: contact.country ?? undefined,
        state: contact.state ?? undefined,
        postalCode: contact.postalCode ?? undefined,
        enabled: contact.enabled
      })),
      customerUsers: customerUsers.map((user) => ({
        id: user.id,
        customerId: user.customerId!,
        customerName: user.customer ? `${user.customer.code}-${user.customer.name}` : user.customerId!,
        username: user.username,
        enabled: user.enabled
      })),
      carriers: carriers.map((carrier) => ({
        id: carrier.id,
        name: carrier.name,
        enabled: carrier.enabled
      })),
      channelCategories: channelCategories.map((category) => mapChannelCategory(category)),
      channels: channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        carrierId: channel.carrierId ?? undefined,
        carrierName: channel.carrier?.name,
        businessType: (channel.businessType ?? 'EXPRESS') as CompanyChannelBusinessType,
        category: channel.category ?? '',
        volumeDivisor: channel.volumeDivisor,
        multiPieceWeightRule: channel.multiPieceWeightRule ?? 'SUM_THEN_COMPARE',
        singleWeightRoundingRule: channel.singleWeightRoundingRule ?? channel.roundingRule ?? 'ACTUAL',
        settlementWeightRule: channel.settlementWeightRule ?? 'MAX_ACTUAL_VOLUME',
        settlementWeightRoundingRule: channel.settlementWeightRoundingRule ?? channel.roundingRule ?? 'NONE',
        largeCargoThresholdKg: channel.largeCargoThresholdKg === null ? undefined : Number(channel.largeCargoThresholdKg),
        overweightWarningThresholdKg: channel.overweightWarningThresholdKg === null ? undefined : Number(channel.overweightWarningThresholdKg),
        overGirthLengthWidthHeightThresholdCm: channel.overGirthLengthWidthHeightThresholdCm === null ? undefined : Number(channel.overGirthLengthWidthHeightThresholdCm),
        overGirthLengthPlusTwoWidthHeightThresholdCm: channel.overGirthLengthPlusTwoWidthHeightThresholdCm === null ? undefined : Number(channel.overGirthLengthPlusTwoWidthHeightThresholdCm),
        perPieceMinimumChargeWeightKg: channel.perPieceMinimumChargeWeightKg === null ? undefined : Number(channel.perPieceMinimumChargeWeightKg),
        perShipmentMinimumCharge: channel.perShipmentMinimumCharge === null ? undefined : Number(channel.perShipmentMinimumCharge),
        perShipmentMinimumChargeUnit: channel.perShipmentMinimumChargeUnit as 'KG' | 'CBM' | null ?? undefined,
        densityRatio: channel.densityRatio === null ? undefined : Number(channel.densityRatio),
        remoteAreaRule: channel.remoteAreaRule ?? 'NONE',
        enabled: channel.enabled
      })),
      agents: agents.map((agent) => ({
        id: agent.id,
        code: agent.code ?? agent.name.toUpperCase().slice(0, 6),
        shortName: agent.shortName ?? agent.name,
        name: agent.name,
        createdAt: ((agent as any).createdAt instanceof Date ? (agent as any).createdAt : new Date()).toISOString(),
        integrationType: (agent.integrationType ?? 'MANUAL') as AgentSummary['integrationType'],
        settlementCycle: normalizeAgentSettlementCycle(agent.settlementCycle),
        warehouseAddress1: agent.warehouseAddress1 ?? undefined,
        warehouseAddress2: agent.warehouseAddress2 ?? undefined,
        warehouseAddress3: agent.warehouseAddress3 ?? undefined,
        warehouseContact: agent.warehouseContact ?? undefined,
        warehouseContactName1: (agent as any).warehouseContactName1 ?? agent.warehouseContact ?? undefined,
        warehouseContactPhone1: (agent as any).warehouseContactPhone1 ?? undefined,
        warehouseContactName2: (agent as any).warehouseContactName2 ?? undefined,
        warehouseContactPhone2: (agent as any).warehouseContactPhone2 ?? undefined,
        warehouseContactName3: (agent as any).warehouseContactName3 ?? undefined,
        warehouseContactPhone3: (agent as any).warehouseContactPhone3 ?? undefined,
        invoiceTemplateName: agent.invoiceTemplateName ?? undefined,
        invoiceTemplateUrl: agent.invoiceTemplateUrl ?? undefined,
        invoiceTemplateName2: (agent as any).invoiceTemplateName2 ?? undefined,
        invoiceTemplateUrl2: (agent as any).invoiceTemplateUrl2 ?? undefined,
        invoiceTemplateName3: (agent as any).invoiceTemplateName3 ?? undefined,
        invoiceTemplateUrl3: (agent as any).invoiceTemplateUrl3 ?? undefined,
        invoiceTemplates: agentInvoiceTemplates(agent as any),
        trackingWebsite: (agent as any).trackingWebsite ?? undefined,
        enabled: agent.enabled
      })),
      agentChannels: agentChannels.map((channel) => mapAgentChannel(channel)),
      surcharges: surcharges.map((surcharge) => ({
        id: surcharge.id,
        name: surcharge.name,
        amount: Number(surcharge.amount),
        enabled: surcharge.enabled
      })),
      fuelRates: fuelRates.filter((fuelRate) => channelMap.has(fuelRate.channelId)).map((fuelRate) => ({
        id: fuelRate.id,
        channelId: fuelRate.channelId,
        channelName: channelMap.get(fuelRate.channelId) ?? fuelRate.channelId,
        rate: Number(fuelRate.rate),
        activeAt: fuelRate.activeAt.toISOString()
      })),
      exchangeRates: exchangeRates.map((exchangeRate: any) => ({
        id: exchangeRate.id,
        baseCurrency: exchangeRate.baseCurrency,
        quoteCurrency: exchangeRate.quoteCurrency,
        rate: Number(exchangeRate.rate),
        activeAt: exchangeRate.activeAt.toISOString(),
        endAt: exchangeRate.endAt?.toISOString(),
        enabled: exchangeRate.enabled
      })),
      roles: roles.map((role) => role.name)
    };
  }
}

function agentInvoiceTemplates(agent: AgentSummary | null | undefined): AgentInvoiceTemplate[] {
  const stored = (agent as any)?.invoiceTemplates;
  if (Array.isArray(stored)) {
    return stored.flatMap((item): AgentInvoiceTemplate[] => {
      if (!item || typeof item !== 'object') return [];
      const id = typeof item.id === 'string' ? item.id.trim() : '';
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      const url = typeof item.url === 'string' ? item.url.trim() : '';
      return id && name && url ? [{ id, name, url }] : [];
    });
  }
  return [
    { id: 'legacy-1', name: (agent as any)?.invoiceTemplateName, url: (agent as any)?.invoiceTemplateUrl },
    { id: 'legacy-2', name: (agent as any)?.invoiceTemplateName2, url: (agent as any)?.invoiceTemplateUrl2 },
    { id: 'legacy-3', name: (agent as any)?.invoiceTemplateName3, url: (agent as any)?.invoiceTemplateUrl3 }
  ].flatMap(({ id, name, url }, index) => typeof url === 'string' && url.trim()
    ? [{ id, name: typeof name === 'string' && name.trim() ? name.trim() : `模板 ${index + 1}`, url: url.trim() }]
    : []);
}

function mapAgentChannel(channel: { id: string; agentId: string; channelName: string; enabled: boolean; agent: { name: string; shortName?: string | null } }): AgentChannelSummary {
  return {
    id: channel.id,
    agentId: channel.agentId,
    agentName: channel.agent.shortName || channel.agent.name,
    channelName: channel.channelName,
    enabled: channel.enabled
  };
}

function mapChannelCategory(category: { id: string; name: string; enabled: boolean }): ChannelCategorySummary {
  return { id: category.id, name: category.name, enabled: category.enabled };
}

function normalizeAgentSettlementCycle(value: unknown): 'WEEKLY' | 'MONTHLY' | 'PER_SHIPMENT' | undefined {
  return value === 'WEEKLY' || value === 'MONTHLY' || value === 'PER_SHIPMENT' ? value : undefined;
}
