import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { Principal } from '../../rbac.js';
import {
  projectMarketRoutingReportShipment,
  projectMarketShipment,
  type MarketShipmentView
} from './shipment-overview-query.policy.js';
import {
  SHIPMENT_OVERVIEW_QUERY_REPOSITORY,
  type ShipmentOverviewRow,
  type ShipmentOverviewQueryRepository
} from './shipment-overview-query.repository.js';

@Injectable()
export class ShipmentOverviewQueryService {
  constructor(
    @Inject(SHIPMENT_OVERVIEW_QUERY_REPOSITORY)
    private readonly repository: ShipmentOverviewQueryRepository
  ) {}

  async listShipments(principal: Principal, costScope?: string): Promise<ShipmentOverviewRow[] | MarketShipmentView[]> {
    const canViewBusinessShipments = await this.repository.hasPermission(principal.role, 'business:shipment:list');
    if (canViewBusinessShipments && principal.role !== 'UG_MARKET') {
      return this.repository.getShipments(principal, {
        routeCostScope: costScope === 'routed' ? 'ROUTED' : undefined
      });
    }
    return this.listMarketShipments(principal, costScope);
  }

  async listMarketShipments(principal: Principal, costScope?: string): Promise<MarketShipmentView[]> {
    const role = principal.role;
    const [canViewDashboard, canViewPending, canViewRouted, canReroute, canReplaceAgent, canViewReport] = await Promise.all([
      this.repository.hasPermission(role, 'market:dashboard:view'),
      this.repository.hasPermission(role, 'market:pending-routing:view'),
      this.repository.hasPermission(role, 'market:routed:view'),
      this.repository.hasPermission(role, 'market:routed:reroute'),
      this.repository.hasPermission(role, 'market:routed:replace-agent'),
      this.repository.hasPermission(role, 'market:routing-report:view')
    ]);
    const rows = await this.repository.getShipments(principal, {
      routeCostScope: costScope === 'routed' && (canViewRouted || canViewReport) ? 'ROUTED' : undefined,
      marketSiteScope: true
    });
    const weekStart = new Date();
    const weekDay = weekStart.getDay() || 7;
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekDay + 1);
    const weekStartTime = weekStart.getTime();
    const isCurrentWeek = (value?: string) => Boolean(value && new Date(value).getTime() >= weekStartTime);

    return rows.flatMap((shipment) => {
      const reportVisible = canViewReport && (
        isCurrentWeek(shipment.routedAt)
        || shipment.status === 'OUTBOUNDED'
        || shipment.status === 'WAITING_DEPARTURE'
      );
      const detailVisible = (canViewPending && shipment.status === 'WAITING_SORT')
        || (canViewRouted && shipment.status === 'WAITING_DISPATCH')
        || (canViewRouted && canReroute && ['OUTBOUNDED', 'WAITING_DEPARTURE'].includes(shipment.status))
        || (canViewRouted
          && canReplaceAgent
          && shipment.status === 'OUTBOUNDED'
          && shipment.agentChangeRequest?.status === 'PENDING');
      if (detailVisible) return [projectMarketShipment(shipment, true)];
      if (reportVisible) return [projectMarketRoutingReportShipment(shipment)];
      const dashboardVisible = canViewDashboard && (
        shipment.status === 'WAITING_SORT'
        || shipment.status === 'WAITING_DISPATCH'
        || isCurrentWeek(shipment.routedAt)
        || isCurrentWeek(shipment.outboundAt)
        || isCurrentWeek(shipment.routeReturnedAt)
      );
      if (!dashboardVisible) return [];
      return [{
        id: shipment.id,
        status: shipment.status,
        createdAt: shipment.createdAt,
        routedAt: shipment.routedAt,
        outboundAt: shipment.outboundAt,
        routeReturnedAt: shipment.routeReturnedAt,
        agentName: shipment.agentName,
        channelName: shipment.channelName,
        sensitive: shipment.sensitive,
        declarationRequired: shipment.declarationRequired,
        customerName: '',
        systemOrderNo: '',
        destinationCountry: '',
        packageCount: 0,
        receivableWeightKg: 0
      }];
    });
  }

  getShipmentStatusCounts(principal: Principal) {
    return this.repository.getShipmentStatusCounts(principal);
  }

  getNavigationUnreadBadges(principal: Principal) {
    if (principal.role === 'CUSTOMER') throw new ForbiddenException('客户不使用员工端导航角标');
    return this.repository.getNavigationUnreadBadges(principal);
  }
}
