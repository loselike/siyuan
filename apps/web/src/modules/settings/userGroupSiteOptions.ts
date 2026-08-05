import type { SiteSummary } from '@siyuan/shared';

export type UserGroupSiteOption = { label: string; value: string };

export function createUserGroupSiteOptions(sites: SiteSummary[]): UserGroupSiteOption[] {
  return sites
    .filter((site) => site.enabled)
    .map((site) => ({ label: site.name, value: site.name }));
}

export function matchesUserGroupSiteOption(
  input: string,
  option?: { label?: unknown; value?: unknown }
): boolean {
  const keyword = input.trim().toLocaleLowerCase();
  if (!keyword) return true;
  const label = String(option?.label ?? option?.value ?? '').toLocaleLowerCase();
  return label.includes(keyword);
}
