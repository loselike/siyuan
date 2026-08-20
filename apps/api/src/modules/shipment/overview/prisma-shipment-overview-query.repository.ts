import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  shipmentAgentChangeRequestActions,
  summarizeShipmentAgentChangeRequest,
  summarizeStatusCounts,
  type BusinessType,
  type Shipment,
  type ShipmentStatus
} from '@siyuan/shared/shipment';
import { hasEffectivePricingCapability } from '@siyuan/shared/permissions';
import { PrismaService } from '../../prisma.service.js';
import {
  globalFieldMaskKeys,
  globalFieldMaskPermissionCode,
  isAdministratorRole,
  isBusinessAgentOwnOnlyRole,
  isSalesScopedRole,
  type GlobalFieldMaskState,
  type PermissionKey,
  type Principal,
  type RoleKey
} from '../../rbac.js';
import { resolveStoredRolePermissions } from '../../prisma-role-permissions.js';
import {
  buildShipmentStageDwell,
  buildShipmentStageDwellHistory,
  stageFallbackEnteredAt,
  stageForShipmentStatus,
  type ShipmentStageHistoryRecord
} from '../../shipment-stage-dwell.js';
import {
  applyShipmentDispatchArchiveFields,
  applyShipmentRouteArchiveFields,
  mapShipmentOverview,
  normalizeShipmentDispatchArchive,
  normalizeShipmentRouteArchive,
  scopeShipmentRouteCostSummary,
  shipmentOverviewIncludes,
  summarizeLinePoolFinanceRow,
  summarizeShipmentReceivables,
  summarizeShipmentRouteCostsFromRow,
  type ShipmentDispatchArchiveFields,
  type ShipmentRouteArchiveFields,
  type ShipmentWithRelations
} from './shipment-overview-prisma.mapper.js';
import type {
  ShipmentOverviewQueryOptions,
  ShipmentOverviewQueryRepository
} from './shipment-overview-query.repository.js';

const DEFAULT_MARKET_SITE = '深圳思远';
const warehouseNavigationViewPermissions: PermissionKey[] = [
  'warehouse:dashboard:view',
  'warehouse:today-receipt:view',
  'warehouse:in-stock:view',
  'warehouse:tally-pending:view',
  'warehouse:tally-pending:problem-view',
  'warehouse:tally-completed:view',
  'warehouse:dispatch-pending:view',
  'warehouse:outbounded:view',
  'warehouse:rent-detail:view'
];

@Injectable()
export class PrismaShipmentOverviewQueryRepository implements ShipmentOverviewQueryRepository {
  private readonly logger = new Logger(PrismaShipmentOverviewQueryRepository.name);
  private readonly salesScopedRoleCache = new Set<RoleKey>();

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async hasPermission(role: RoleKey, permission: PermissionKey): Promise<boolean> {
    const row = await this.prisma.role.findUnique({
      where: { name: role },
      include: { permissions: true }
    });
    if (!isAdministratorRole(role) && row && row.enabled !== true) return false;
    const permissions = resolveStoredRolePermissions(role, row?.permissions.map((item) => item.code as PermissionKey));
    return permissions.includes(permission) || hasEffectivePricingCapability(permissions, permission);
  }

  async getPermissionsForRole(role: RoleKey): Promise<PermissionKey[]> {
    const row = await this.prisma.role.findUnique({
      where: { name: role },
      include: { permissions: true }
    });
    if (!isAdministratorRole(role) && row && row.enabled !== true) return [];
    const permissions = resolveStoredRolePermissions(role, row?.permissions.map((item) => item.code as PermissionKey));
    if (permissions.includes('data-scope:sales-own')) this.salesScopedRoleCache.add(role);
    else this.salesScopedRoleCache.delete(role);
    return permissions;
  }

  async getShipments(principal: Principal, options: ShipmentOverviewQueryOptions = {}): Promise<Shipment[]> {
    const [canViewAgentIdentity, canViewReceivableSummary, canViewCustomerServiceAgent, canViewCustomerServiceTransferAgentWeight, canViewShipmentAgentWeight] = await Promise.all([
      this.hasAnyPermission(principal.role, [
        'master-data:agents:read',
        'master-data:agent-channels:read',
        'finance:business-cost:view-agent',
        'finance:payable:view-sensitive'
      ]),
      this.canViewShipmentFinanceDetail(principal),
      options.customerServiceFieldScope
        ? this.hasPermission(principal.role, 'customer-service:data-confirm:agent-view')
        : Promise.resolve(false),
      options.customerServiceTransferAgentWeight
        ? this.hasPermission(principal.role, 'customer-service:transfer:view-agent-data')
        : Promise.resolve(false),
      this.canViewShipmentAgentWeight(principal)
    ]);
    const fieldMasks = await this.getGlobalFieldMaskState(principal);
    const canViewMarketRouteCost = options.marketSiteScope === true
      && !fieldMasks['payable-cost']
      && await this.hasAnyPermission(principal.role, [
        'market:pending-routing:route',
        'market:pending-routing:edit',
        'market:routed:view',
        'market:routing-report:view'
      ]);
    const canViewLinePoolFinanceSummary = options.includeLinePoolFinanceSummary === true && (
      await this.hasPermission(principal.role, 'operations:line-shipment:process')
      || await this.hasPermission(principal.role, 'operations:product-map:cost-sensitive-view')
    );
    const canViewAgentReplacementAudit = options.marketSiteScope === true
      && !fieldMasks['agent-short-name']
      && !fieldMasks['agent-company-name']
      && !fieldMasks['agent-channel']
      && !fieldMasks['agent-data']
      && !fieldMasks['payable-cost']
      && !fieldMasks['payable-status']
      && await this.hasPermission(principal.role, 'market:routed:view');
    const canViewAgentChangeRequest = options.marketSiteScope === true
      && !fieldMasks['agent-short-name']
      && !fieldMasks['agent-company-name']
      && !fieldMasks['agent-channel']
      && !fieldMasks['agent-data']
      && !fieldMasks['payable-cost']
      && !fieldMasks['payable-status']
      && await this.hasPermission(principal.role, 'market:routed:replace-agent');
    const shipmentOwnerWhere = options.marketSiteScope || options.customerServiceScope
      ? undefined
      : this.shipmentOwnerWhere(principal, options.salesScopeMode);
    const marketSiteWhere = options.marketSiteScope ? await this.marketShipmentSiteWhere(principal) : undefined;
    const customerServiceWhere = options.customerServiceScope ? await this.customerServiceShipmentWhere(principal) : undefined;
    const accessWhere = [shipmentOwnerWhere, marketSiteWhere, customerServiceWhere]
      .filter((value): value is Record<string, unknown> => Boolean(value));
    const rows = await this.prisma.shipment.findMany({
      where: {
        deletedAt: null,
        ...(principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : {}),
        ...(accessWhere.length ? { AND: accessWhere } : {})
      },
      include: shipmentOverviewIncludes,
      orderBy: { createdAt: 'desc' }
    }) as ShipmentWithRelations[];

    const marketOwners = [...new Set(rows
      .map((row) => row.customer.salesperson?.trim() || row.entryBy?.trim())
      .filter((value): value is string => Boolean(value)))];
    const marketOwnerSites = new Map(
      (await this.prisma.user.findMany({
        where: { username: { in: marketOwners } },
        select: { username: true, site: true }
      })).map((user) => [user.username, user.site ?? undefined])
    );

    const dispatchLogs = rows.length
      ? await this.prisma.auditLog.findMany({
          where: { action: 'shipment.dispatch', target: { in: rows.map((row) => row.id) } },
          orderBy: { createdAt: 'desc' },
          select: { target: true, after: true }
        })
      : [];
    const latestDispatchByShipmentId = new Map<string, ShipmentDispatchArchiveFields>();
    dispatchLogs.forEach((row) => {
      if (!latestDispatchByShipmentId.has(row.target)) {
        latestDispatchByShipmentId.set(row.target, normalizeShipmentDispatchArchive(row.after));
      }
    });

    const routeLogs = rows.length
      ? await this.prisma.auditLog.findMany({
          where: {
            action: { in: canViewAgentReplacementAudit
              ? ['shipment.agent.replace', 'shipment.route', 'shipment.route.update']
              : ['shipment.route', 'shipment.route.update'] },
            target: { in: rows.map((row) => row.id) }
          },
          orderBy: { createdAt: 'desc' },
          select: { target: true, action: true, after: true, createdAt: true }
        })
      : [];
    const latestRouteByShipmentId = new Map<string, ShipmentRouteArchiveFields>();
    const agentReplacementCountByShipmentId = new Map<string, number>();
    routeLogs.forEach((row) => {
      if (row.action === 'shipment.agent.replace') {
        agentReplacementCountByShipmentId.set(row.target, (agentReplacementCountByShipmentId.get(row.target) ?? 0) + 1);
      }
      if (!latestRouteByShipmentId.has(row.target)) {
        latestRouteByShipmentId.set(row.target, normalizeShipmentRouteArchive(row.after, row.createdAt));
      }
    });
    const requestRows = canViewAgentChangeRequest && rows.length
      ? await this.prisma.auditLog.findMany({
          where: {
            target: { in: rows.map((row) => row.id) },
            action: { in: Object.values(shipmentAgentChangeRequestActions) }
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true, target: true, action: true, after: true, createdAt: true }
        })
      : [];
    const requestRowsByShipmentId = new Map<string, typeof requestRows>();
    requestRows.forEach((row) => requestRowsByShipmentId.set(row.target, [
      ...(requestRowsByShipmentId.get(row.target) ?? []),
      row
    ]));

    const visibleShipments = rows.map((row) => {
      const visibleShipment = {
        ...applyShipmentDispatchArchiveFields(
          applyShipmentRouteArchiveFields(mapShipmentOverview(row), latestRouteByShipmentId.get(row.id)),
          latestDispatchByShipmentId.get(row.id)
        ),
        ...(agentReplacementCountByShipmentId.get(row.id)
          ? { agentReplacementCount: agentReplacementCountByShipmentId.get(row.id) }
          : {}),
        ...(canViewAgentChangeRequest
          ? (() => {
              const request = summarizeShipmentAgentChangeRequest(row.id, requestRowsByShipmentId.get(row.id) ?? []);
              return request ? { agentChangeRequest: request } : {};
            })()
          : {}),
        ...(canViewLinePoolFinanceSummary ? { linePoolFinanceSummary: summarizeLinePoolFinanceRow(row) } : {}),
        ...(canViewReceivableSummary ? { receivableSummary: summarizeShipmentReceivables(row) } : {}),
        site: marketOwnerSites.get(row.customer.salesperson?.trim() || row.entryBy?.trim() || '') ?? ''
      };
      const routeCostSummary = isAfterRouteDispatch(visibleShipment.status)
        ? scopeShipmentRouteCostSummary(
            summarizeShipmentRouteCostsFromRow(row),
            { canViewDetails: canViewMarketRouteCost, canViewTotals: canViewMarketRouteCost }
          )
        : undefined;
      return this.maskShipmentListFields(principal, {
        ...visibleShipment,
        ...(routeCostSummary ? { routeCostSummary } : {})
      }, {
        canViewAgentIdentity: canViewAgentIdentity || canViewCustomerServiceAgent,
        canViewLegacyMarketCostDetails: canViewMarketRouteCost,
        canViewLegacyMarketCostTotals: canViewMarketRouteCost,
        canViewRoutedCostDetails: canViewMarketRouteCost,
        canViewRoutedCostTotals: canViewMarketRouteCost,
        exposeWarehouseRouting: options.exposeWarehouseRouting ?? false,
        allowSalesScopedAgent: canViewCustomerServiceAgent,
        canViewAgentWeight: canViewShipmentAgentWeight || canViewCustomerServiceAgent || canViewCustomerServiceTransferAgentWeight,
        fieldMasks
      });
    });
    return this.attachShipmentStageDwell(visibleShipments);
  }

  async getShipmentStatusCounts(principal: Principal) {
    return summarizeStatusCounts(await this.getShipments(principal));
  }

  async getNavigationUnreadBadges(principal: Principal) {
    const shipments = await this.getShipments(principal);
    const shipmentIds = shipments.map((row) => row.id);
    const auditRows = shipmentIds.length
      ? await this.prisma.auditLog.findMany({ where: { target: { in: shipmentIds } }, select: { target: true, createdAt: true, action: true } })
      : [];
    const canReadFinance = await this.hasPermission(principal.role, 'finance:dashboard:view');
    const financeAuditRows = canReadFinance
      ? await this.prisma.auditLog.findMany({ where: { action: { startsWith: 'finance.' } }, select: { target: true, createdAt: true, action: true } })
      : [];
    const auditWatermarks = new Map<string, string>();
    auditRows.forEach((row) => {
      const value = row.createdAt.toISOString();
      const current = auditWatermarks.get(row.target);
      if (!current || value > current) auditWatermarks.set(row.target, value);
    });
    const readStates = await this.prisma.userModuleReadState.findMany({ where: { userId: principal.id } });
    const stateByKey = new Map(readStates.map((state) => [`${state.moduleKey}:${state.sectionKey}`, state.watermark.toISOString()]));
    const shipmentRows = (statuses: ShipmentStatus[], businessType?: BusinessType) => shipments
      .filter((row) => (statuses.length === 0 || statuses.includes(row.status)) && (!businessType || row.businessType === businessType))
      .map((row) => ({ id: row.id, watermark: auditWatermarks.get(row.id) ?? row.createdAt }));
    const ticketRows = await this.prisma.problemTicket.findMany({
      where: { status: { not: 'CLOSED' }, ...(principal.role === 'CUSTOMER' ? { customerVisible: true, shipment: { customerId: principal.customerId } } : { shipment: { id: { in: shipmentIds } } }) },
      include: { replies: { select: { createdAt: true } } }
    });
    const salesScope = this.operatorCustomerScope(principal);
    const warehouseRows = await this.prisma.warehousePackage.findMany({
      where: {
        status: { notIn: ['CONSOLIDATED', 'SHIPPED', 'TALLIED_ARCHIVED'] },
        ...(salesScope ? { salesperson: { in: salesScope } } : {})
      },
      select: { id: true, status: true, updatedAt: true }
    });
    const pendingTallyRows = await this.prisma.warehouseTallyTask.findMany({
      where: { status: 'PENDING', ...(salesScope ? { salesperson: { in: salesScope } } : {}) },
      select: { id: true, createdAt: true }
    });
    const read = (moduleKey: string, sectionKey: string, rows: Array<{ id: string; watermark: string }>) => {
      const watermark = stateByKey.get(`${moduleKey}:${sectionKey}`);
      const unread = watermark ? rows.filter((row) => row.watermark > watermark) : rows;
      const unreadCount = new Set(unread.map((row) => row.id)).size;
      return { moduleKey, sectionKey, unreadCount, displayCount: unreadCount > 999 ? '999+' : String(unreadCount), latestWatermark: rows.map((row) => row.watermark).sort().at(-1) };
    };
    const ticketBadges = ticketRows.map((ticket) => ({
      id: ticket.id,
      watermark: [ticket.createdAt.toISOString(), ticket.closedAt?.toISOString(), ...ticket.replies.map((reply) => reply.createdAt.toISOString())].filter(Boolean).sort().at(-1) ?? ticket.createdAt.toISOString()
    }));
    const canViewCustomerServicePendingRouting = principal.role === 'ADMIN'
      || await this.hasPermission(principal.role, 'customer-service:pending-routing:view');
    const items = [
      read('customerService', 'pending-routing', canViewCustomerServicePendingRouting ? shipmentRows(['WAITING_SORT']) : []),
      read('customerService', 'waitingDeparture', shipmentRows(['WAITING_DEPARTURE'])),
      read('customerService', 'departed', shipmentRows(['DEPARTED'])),
      read('customerService', 'problems', ticketBadges),
      read('receive', 'consolidation', pendingTallyRows.map((row) => ({ id: row.id, watermark: row.createdAt.toISOString() }))),
      read('receive', 'packages', warehouseRows.map((row) => ({ id: row.id, watermark: row.updatedAt.toISOString() }))),
      read('receive', 'queue', shipmentRows(['WAITING_DISPATCH'])),
      read('workspace', 'shipmentPool', shipmentRows([], 'DEDICATED_LINE')),
      read('business', 'order-entry-drafts', shipmentRows(['DRAFT', 'REVIEW_REJECTED'])),
      read('business', 'pending-review', shipmentRows(['REVIEW_PENDING'])),
      read('business', 'order-management', shipmentRows([
        'DRAFT', 'REVIEW_PENDING', 'REVIEW_REJECTED', 'WAITING_RECEIVE', 'WAITING_SORT', 'WAITING_DISPATCH',
        'OUTBOUNDED', 'WAITING_DEPARTURE', 'DEPARTED', 'ARRIVED_PORT', 'DELIVERING', 'SIGNED'
      ])),
      read('market', 'pending-routing', shipmentRows(['WAITING_SORT'])),
      read('market', 'routed', shipmentRows(['WAITING_DISPATCH'])),
      read('finance', 'receivables', financeAuditRows.filter((row) => row.action.startsWith('finance.receivable')).map((row) => ({ id: row.target, watermark: row.createdAt.toISOString() }))),
      read('finance', 'payment-applications', financeAuditRows.filter((row) => row.action.startsWith('finance.payment_application')).map((row) => ({ id: row.target, watermark: row.createdAt.toISOString() })))
    ];
    const visible = new Set<string>();
    if (await this.hasPermission(principal.role, 'operations:line-shipment:view')) visible.add('workspace');
    if (await this.hasAnyPermission(principal.role, warehouseNavigationViewPermissions)) visible.add('receive');
    if (await this.hasAnyPermission(principal.role, ['business:dashboard:view', 'business:order-entry:view', 'business:review:view', 'business:shipment:list', 'business:order-ai:view'])) visible.add('business');
    if (await this.hasAnyPermission(principal.role, ['market:dashboard:view', 'market:pending-routing:view', 'market:routed:view', 'market:routing-report:view'])) visible.add('market');
    if (await this.hasAnyPermission(principal.role, ['customer-service:dashboard:view', 'customer-service:data-confirm:view', 'customer-service:transfer:view', 'customer-service:pending-routing:view', 'customer-service:waiting-departure:view', 'customer-service:departed:view', 'customer-service:arrived-port:view', 'customer-service:delivering:view', 'customer-service:signed:view', 'customer-service:problem:view'])) visible.add('customerService');
    if (canReadFinance) visible.add('finance');
    const scoped = items.filter((item) => visible.has(item.moduleKey));
    const parentItems = [...new Set(scoped.map((item) => item.moduleKey))].map((moduleKey) => {
      const unreadCount = scoped.filter((item) => item.moduleKey === moduleKey).reduce((total, item) => total + item.unreadCount, 0);
      return { moduleKey, unreadCount, displayCount: unreadCount > 999 ? '999+' : String(unreadCount) };
    });
    return { items: [...scoped, ...parentItems] };
  }

  private async hasAnyPermission(role: RoleKey, permissions: PermissionKey[]) {
    for (const permission of permissions) {
      if (await this.hasPermission(role, permission)) return true;
    }
    return false;
  }

  private async getGlobalFieldMaskState(principal: Principal): Promise<GlobalFieldMaskState> {
    if (principal.globalFieldMasks) return principal.globalFieldMasks;
    const state = Object.fromEntries(globalFieldMaskKeys.map((key) => [key, false])) as GlobalFieldMaskState;
    const entries = await Promise.all(globalFieldMaskKeys.map(async (key) => [
      key,
      await this.hasPermission(principal.role, globalFieldMaskPermissionCode(key))
    ] as const));
    entries.forEach(([key, enabled]) => { state[key] = enabled; });
    if (state['agent-data']) {
      state['agent-short-name'] = true;
      state['agent-company-name'] = true;
      state['agent-channel'] = true;
    }
    return state;
  }

  private canViewShipmentFinanceDetail(principal: Principal) {
    return this.hasAnyPermission(principal.role, [
      'customer-service:data-confirm:business-update',
      'business:review:view',
      'business:shipment:finance-detail-view',
      'business:order-entry:business-cost',
      'market:pending-routing:business-cost:view',
      'market:pending-routing:payable-cost:view',
      'business:order-entry:payable-fee',
      'business:shipment:payable-view',
      'business:shipment:profit-view',
      'business:order-fee:view',
      'business:order-fee:profit-view',
      'market:pending-routing:business-cost:view',
      'finance:receivable:read',
      'finance:business-cost:read',
      'finance:business-cost:view-profit',
      'finance:order-fee:payable:view',
      'finance:order-fee:profit:receivable-payable',
      'finance:order-fee:profit:receivable-business',
      'finance:order-fee:profit:business-payable',
      'finance:payable:view-sensitive',
      'finance:payable:view-profit'
    ]);
  }

  private canViewShipmentAgentWeight(principal: Principal) {
    return this.hasPermission(principal.role, 'business:shipment:agent-weight-view');
  }

  private operatorCustomerScope(principal: Principal) {
    if (principal.shipmentAllView && !isBusinessAgentOwnOnlyRole(principal.role)) return undefined;
    const isSalesScoped = principal.dataScope === 'SALES_OWN'
      || this.salesScopedRoleCache.has(principal.role)
      || isSalesScopedRole(principal.role);
    if (principal.role === 'UG_MARKET' || !isSalesScoped) return undefined;
    return Array.from(new Set([principal.username, principal.name, principal.nickname].filter((value): value is string => Boolean(value))));
  }

  private shipmentOwnerWhere(
    principal: Principal,
    salesScopeMode: 'CUSTOMER_OR_ENTRY' | 'ENTRY_ONLY' | 'FEE_OWNER' = 'CUSTOMER_OR_ENTRY',
    allowDepartmentTeam = true
  ) {
    const departmentTeamScope = allowDepartmentTeam ? principal.departmentTeamScope?.filter(Boolean) : undefined;
    if (salesScopeMode === 'FEE_OWNER') {
      if (isAdministratorRole(principal.role) || principal.financeReceivableAllView) return undefined;
      const scope = departmentTeamScope?.length ? departmentTeamScope : principal.username?.trim() ? [principal.username.trim()] : undefined;
      if (!scope?.length) return { id: '__NO_FINANCE_OWNER_SCOPE__' };
      return {
        OR: [
          { customer: { salesperson: { in: scope } } },
          { AND: [{ OR: [{ customer: { salesperson: null } }, { customer: { salesperson: '' } }] }, { entryBy: { in: scope } }] }
        ]
      };
    }
    if (principal.shipmentAllView && !isBusinessAgentOwnOnlyRole(principal.role)) return undefined;
    if (departmentTeamScope?.length) {
      return salesScopeMode === 'ENTRY_ONLY'
        ? { entryBy: { in: departmentTeamScope } }
        : { OR: [{ entryBy: { in: departmentTeamScope } }, { customer: { salesperson: { in: departmentTeamScope } } }] };
    }
    const scope = this.operatorCustomerScope(principal);
    if (!scope) return undefined;
    return salesScopeMode === 'ENTRY_ONLY'
      ? { entryBy: { in: scope } }
      : { OR: [{ entryBy: { in: scope } }, { customer: { salesperson: { in: scope } } }] };
  }

  private async marketShipmentSiteIdentities(principal: Principal): Promise<string[] | undefined> {
    if (isAdministratorRole(principal.role)) return undefined;
    const site = principal.site?.trim() || DEFAULT_MARKET_SITE;
    const users = await this.prisma.user.findMany({
      where: site === DEFAULT_MARKET_SITE ? { OR: [{ site: DEFAULT_MARKET_SITE }, { site: '' }, { site: null }] } : { site },
      select: { username: true, site: true }
    });
    return users
      .filter((user) => (user.site?.trim() || DEFAULT_MARKET_SITE) === site)
      .map((user) => user.username);
  }

  private async marketShipmentSiteWhere(principal: Principal): Promise<Record<string, unknown> | undefined> {
    const identities = await this.marketShipmentSiteIdentities(principal);
    if (!identities) return undefined;
    return {
      OR: [
        { customer: { salesperson: { in: identities } } },
        { AND: [{ OR: [{ customer: { salesperson: null } }, { customer: { salesperson: '' } }] }, { entryBy: { in: identities } }] }
      ]
    };
  }

  private async customerServiceShipmentWhere(principal: Principal): Promise<Record<string, unknown> | undefined> {
    if (isAdministratorRole(principal.role)) return undefined;
    const site = principal.site?.trim() || DEFAULT_MARKET_SITE;
    const permissions = new Set(await this.getPermissionsForRole(principal.assignedRole ?? principal.role));
    const canViewAll = permissions.has('customer-service:dashboard:all-view');
    const canViewTeam = permissions.has('customer-service:dashboard:team-view');
    const siteWhere = principal.site?.trim() ? { site } : { OR: [{ site }, { site: null }, { site: '' }] };
    const users = await this.prisma.user.findMany({ where: siteWhere, select: { username: true } });
    const siteIdentities = new Set(users.map((user) => user.username));
    const team = principal.departmentTeamScope?.filter((username) => siteIdentities.has(username));
    const identities = canViewAll
      ? [...siteIdentities]
      : canViewTeam
        ? (team?.length ? team : [principal.username].filter((username) => siteIdentities.has(username)))
        : [principal.username].filter((username) => siteIdentities.has(username));
    if (!identities.length) return { id: '__NO_CUSTOMER_SERVICE_SCOPE__' };
    return {
      OR: [
        { customer: { salesperson: { in: identities } } },
        { AND: [{ OR: [{ customer: { salesperson: null } }, { customer: { salesperson: '' } }] }, { entryBy: { in: identities } }] }
      ]
    };
  }

  private maskShipmentListFields(
    principal: Principal,
    shipment: Shipment,
    visibility: {
      canViewAgentIdentity: boolean;
      canViewLegacyMarketCostDetails: boolean;
      canViewLegacyMarketCostTotals: boolean;
      canViewRoutedCostDetails: boolean;
      canViewRoutedCostTotals: boolean;
      exposeWarehouseRouting: boolean;
      allowSalesScopedAgent: boolean;
      canViewAgentWeight?: boolean;
      fieldMasks?: GlobalFieldMaskState;
    }
  ): Shipment {
    const safeVisible = { ...shipment };
    delete safeVisible.paymentAmountUsd;
    delete safeVisible.paymentAmountCny;
    delete safeVisible.paymentMethod;
    if (this.operatorCustomerScope(principal) && principal.role !== 'UG_MARKET' && !visibility.allowSalesScopedAgent) {
      safeVisible.routeAgentChannelName = '';
    }
    if (!visibility.canViewAgentIdentity && !visibility.exposeWarehouseRouting) {
      safeVisible.agentName = '';
      safeVisible.agentShortName = '';
      safeVisible.routeAgentChannelName = '';
    }
    if (!visibility.canViewLegacyMarketCostDetails) {
      delete safeVisible.routeChargeWeightKg;
      delete safeVisible.routeUnitPrice;
      delete safeVisible.routeOtherFee;
    }
    if (!visibility.canViewLegacyMarketCostTotals) delete safeVisible.routeCostTotal;
    if (!visibility.canViewLegacyMarketCostDetails && !visibility.canViewLegacyMarketCostTotals) delete safeVisible.routeCurrency;
    safeVisible.routeCostSummary = scopeShipmentRouteCostSummary(safeVisible.routeCostSummary, {
      canViewDetails: visibility.canViewRoutedCostDetails,
      canViewTotals: visibility.canViewRoutedCostTotals
    });
    if (!safeVisible.routeCostSummary) delete safeVisible.routeCostSummary;
    if (principal.role === 'CUSTOMER') delete safeVisible.warehouseOutboundRemark;
    if (!visibility.canViewAgentWeight) delete (safeVisible as Partial<Shipment>).agentWeightKg;
    const fieldMasks = visibility.fieldMasks;
    if (fieldMasks?.['agent-short-name'] || fieldMasks?.['agent-data']) delete (safeVisible as Partial<Shipment>).agentShortName;
    if (fieldMasks?.['agent-company-name'] || fieldMasks?.['agent-data']) delete (safeVisible as Partial<Shipment>).agentName;
    if (fieldMasks?.['agent-channel'] || fieldMasks?.['agent-data']) delete (safeVisible as Partial<Shipment>).routeAgentChannelName;
    if (fieldMasks?.['agent-data']) {
      delete (safeVisible as Partial<Shipment>).agentId;
      delete (safeVisible as Partial<Shipment>).agentWeightKg;
      delete (safeVisible as Partial<Shipment>).invoiceTemplateAvailable;
      delete (safeVisible as Partial<Shipment>).invoiceTemplateOptions;
    }
    if (fieldMasks?.['payable-cost']) {
      if (safeVisible.linePoolFinanceSummary) {
        const withoutPayableCost = { ...safeVisible.linePoolFinanceSummary };
        delete withoutPayableCost.payableCostTotals;
        safeVisible.linePoolFinanceSummary = withoutPayableCost;
      }
      delete safeVisible.routeChargeWeightKg;
      delete safeVisible.routeUnitPrice;
      delete safeVisible.routeOtherFee;
      delete safeVisible.routeCostTotal;
      delete safeVisible.routeCurrency;
      delete safeVisible.routeCostSummary;
    }
    if (fieldMasks?.['payable-status'] && safeVisible.linePoolFinanceSummary) {
      const withoutPayableStatus = { ...safeVisible.linePoolFinanceSummary };
      delete withoutPayableStatus.payableStatus;
      safeVisible.linePoolFinanceSummary = withoutPayableStatus;
    }
    return safeVisible;
  }

  private async attachShipmentStageDwell(shipments: Shipment[]): Promise<Shipment[]> {
    if (!shipments.length) return shipments;
    const shipmentIds = shipments.map((shipment) => shipment.id);
    try {
      const [historyRows, auditRows] = await Promise.all([
        this.prisma.shipmentStageHistory.findMany({
          where: { shipmentId: { in: shipmentIds } },
          orderBy: [{ enteredAt: 'asc' }, { visitNo: 'asc' }],
          select: { shipmentId: true, stageKey: true, enteredAt: true, exitedAt: true, visitNo: true }
        }),
        this.prisma.auditLog.findMany({
          where: { target: { in: shipmentIds }, action: { in: ['customer_service.business_data.approved', 'customer_service.business_data.reversed', 'customer_service.business_data.updated', 'customer_service.agent_data.approved', 'customer_service.agent_data.reversed', 'customer_service.agent_data.updated'] } },
          orderBy: { createdAt: 'asc' },
          select: { target: true, action: true, createdAt: true }
        })
      ]);
      const historyByShipmentId = new Map<string, ShipmentStageHistoryRecord[]>();
      historyRows.forEach((row) => historyByShipmentId.set(row.shipmentId, [
        ...(historyByShipmentId.get(row.shipmentId) ?? []),
        { stageKey: row.stageKey as ShipmentStageHistoryRecord['stageKey'], enteredAt: row.enteredAt, exitedAt: row.exitedAt, visitNo: row.visitNo }
      ]));
      const auditsByShipmentId = new Map<string, typeof auditRows>();
      auditRows.forEach((row) => auditsByShipmentId.set(row.target, [...(auditsByShipmentId.get(row.target) ?? []), row]));
      return shipments.map((shipment) => {
        const history = [...(historyByShipmentId.get(shipment.id) ?? [])];
        const audits = auditsByShipmentId.get(shipment.id) ?? [];
        let currentStage = stageForShipmentStatus(shipment.status);
        let fallback = currentStage ? stageFallbackEnteredAt(shipment, currentStage) : undefined;
        if (shipment.status === 'OUTBOUNDED') {
          const latestFirst = [...audits].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          const approved = (kind: 'business' | 'agent') => {
            const row = latestFirst.find((item) => item.action.startsWith(`customer_service.${kind}_data.`));
            return row?.action.endsWith('.approved') || row?.action.endsWith('.updated');
          };
          const businessApproved = approved('business');
          const agentApproved = approved('agent');
          if (businessApproved && agentApproved && !shipment.transferNo) currentStage = 'TRANSFER_NO';
          else if (businessApproved || agentApproved) currentStage = 'DATA_CONFIRM';
          else currentStage = 'OUTBOUNDED';
          const stageRows = audits.filter((row) => currentStage === 'TRANSFER_NO'
            ? row.action.endsWith('.approved')
            : currentStage === 'DATA_CONFIRM'
              ? row.action.endsWith('.approved') || row.action.endsWith('.updated')
              : false);
          fallback = stageRows[0]?.createdAt ?? fallback;
        }
        if ((currentStage === 'DATA_CONFIRM' || currentStage === 'TRANSFER_NO') && fallback) {
          history.forEach((row) => { if (row.stageKey === 'OUTBOUNDED' && !row.exitedAt) row.exitedAt = fallback; });
        }
        if (currentStage && !history.some((row) => row.stageKey === currentStage) && fallback) {
          history.push({ stageKey: currentStage, enteredAt: fallback, visitNo: 1 });
        }
        const stageDwellHistory = buildShipmentStageDwellHistory(history);
        const stageDwell = buildShipmentStageDwell(history, currentStage, fallback);
        return { ...shipment, ...(stageDwellHistory.length ? { stageDwellHistory } : {}), ...(stageDwell ? { stageDwell } : {}) };
      });
    } catch (error) {
      this.logger.error('阶段停留读取失败，列表继续返回基础运单数据', error instanceof Error ? error.stack : undefined);
      return shipments;
    }
  }
}

function isAfterRouteDispatch(status?: string): boolean {
  return [
    'WAITING_DISPATCH', 'OUTBOUNDED', 'WAITING_DEPARTURE', 'DEPARTED', 'ARRIVED_PORT', 'DELIVERING',
    'WAITING_ONLINE', 'WAITING_SIGNED', 'WAITING_RETURN', 'PROBLEM', 'STUCK', 'SIGNED'
  ].includes(status ?? '');
}
