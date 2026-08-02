import type { AgentSummary } from '@siyuan/shared';

export function getDetailedCompanyAgentOptions(agents: AgentSummary[]) {
  return agents
    .filter((agent) => agent.enabled)
    .map((agent) => ({
      label: agent.shortName ? `${agent.name}（${agent.shortName}）` : agent.name,
      value: agent.id,
      searchText: [agent.name, agent.shortName, agent.code].filter(Boolean).join(' ')
    }));
}

export function resolveAgentIdByIdentity(agents: AgentSummary[], identity?: string) {
  const value = identity?.trim();
  if (!value) return undefined;
  const matches = agents.filter((agent) => agent.name === value || agent.shortName === value);
  return matches.length === 1 ? matches[0].id : undefined;
}
