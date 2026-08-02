import type { MenuKey } from './config';
import { resolveStaffSectionKey } from './config';

export const optimizedModuleSectionKeys = {
  workspace: ['shipmentPool', 'aiQueue', 'productMap', 'importQuality'],
  business: ['business-dashboard', 'finance-entry', 'order-entry-drafts', 'pending-review', 'order-management', 'order-ai'],
  finance: ['finance-dashboard', 'receivables', 'business-costs', 'payables', 'payment-applications', 'paid-verification', 'paid-payments', 'water-receipt-arrivals', 'water-receipts', 'agent-bill-ai'],
  miscFees: ['kuayue', 'pickup', 'tally', 'purchase', 'delivery', 'hang', 'market-profit', 'warehouse-profit', 'finance-profit'],
  receive: ['dashboard', 'today', 'packages', 'consolidation', 'completed-consolidation', 'queue', 'outbounded'],
  pricing: ['lookup', 'markup', 'priceBooks'],
  master: ['customers', 'financeCatalog', 'payerBanks', 'agents', 'agentChannels', 'companyChannels', 'channelCategories', 'remoteAreas', 'exchangeRates', 'assistant'],
  settings: ['userGroups', 'accounts', 'sites', 'audit', 'rolePermissions', 'security', 'aiSecurity', 'baseConfig']
} as const satisfies Partial<Record<MenuKey, readonly string[]>>;

export function resolveModuleInitialSection(
  menuKey: keyof typeof optimizedModuleSectionKeys,
  sectionSegment: string | undefined,
  fallback: string
) {
  return resolveStaffSectionKey(menuKey, sectionSegment, [...optimizedModuleSectionKeys[menuKey]]) ?? fallback;
}
