import type { WarehousePackageCreateInput } from '@siyuan/shared';

const MOJIA_DEVICE_SITE_BY_DEVICE_NO: Readonly<Record<string, string>> = {
  MJ20210327: '深圳思远'
};

export function resolveWarehouseDeviceSite(
  input: Pick<WarehousePackageCreateInput, 'remark' | 'scanSource'>
): string | undefined {
  if (input.scanSource?.trim() !== '墨家设备') return undefined;

  const matched = /^设备号：(.+)$/.exec(input.remark?.trim() ?? '');
  if (!matched) return undefined;

  return MOJIA_DEVICE_SITE_BY_DEVICE_NO[matched[1].trim()];
}
