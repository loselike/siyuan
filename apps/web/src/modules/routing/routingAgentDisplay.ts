import type { AgentSummary, Shipment } from '@siyuan/shared';

function normalizeAgentIdentity(value?: string) {
  return (value ?? '').trim().toLocaleLowerCase();
}

export function getRoutingAgentShortName(
  shipment: Pick<Shipment, 'agentId' | 'agentName'>,
  agents: AgentSummary[]
) {
  const agentName = normalizeAgentIdentity(shipment.agentName);
  const agent = agents.find((item) => item.id === shipment.agentId)
    ?? agents.find((item) => [item.name, item.shortName, item.code]
      .some((identity) => normalizeAgentIdentity(identity) === agentName));

  return agent?.shortName?.trim() || '-';
}

export function getRoutingAgentChannelName(
  shipment: Pick<Shipment, 'routeAgentChannelName' | 'channelName'>
) {
  return shipment.routeAgentChannelName?.trim() || '待分配';
}
