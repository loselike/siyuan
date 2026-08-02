import type { AgentSummary, Shipment } from '@siyuan/shared';
import { formatBeijingDate } from '../shared/format';
import { getRoutingAgentShortName } from './routingAgentDisplay';

export type RoutedShipmentFilters = {
  entryDateFrom: string;
  entryDateTo: string;
  agentShortName: string;
};

export const emptyRoutedShipmentFilters: RoutedShipmentFilters = {
  entryDateFrom: '',
  entryDateTo: '',
  agentShortName: ''
};

export function filterRoutedShipments(
  shipments: Shipment[],
  agents: AgentSummary[],
  filters: RoutedShipmentFilters
) {
  const expectedAgentShortName = filters.agentShortName.trim().toLocaleLowerCase();

  return shipments.filter((shipment) => {
    const entryDate = formatBeijingDate(shipment.createdAt);
    if (filters.entryDateFrom && entryDate < filters.entryDateFrom) return false;
    if (filters.entryDateTo && entryDate > filters.entryDateTo) return false;
    if (!expectedAgentShortName) return true;
    return getRoutingAgentShortName(shipment, agents).trim().toLocaleLowerCase() === expectedAgentShortName;
  });
}
