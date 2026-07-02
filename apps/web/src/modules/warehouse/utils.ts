export interface WarehouseMetricInput {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  packageCount: number;
  divisor: number;
}

export interface WarehousePackageForException {
  domesticTrackingNo: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  packageCount: number;
}

export interface WarehousePackageDimensions {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  packageCount: number;
}

export function calculateWarehousePackageMetrics(values: WarehouseMetricInput) {
  const cbm = (values.lengthCm * values.widthCm * values.heightCm * values.packageCount) / 1_000_000;
  const volumetricWeightKg = (values.lengthCm * values.widthCm * values.heightCm * values.packageCount) / values.divisor;
  const actualWeightKg = values.weightKg * values.packageCount;
  return {
    cbm,
    volumetricWeightKg,
    chargeableWeightKg: Math.max(actualWeightKg, volumetricWeightKg)
  };
}

export function calculateWarehouseVolumetricWeight(pkg: WarehousePackageDimensions, divisor: 5000 | 6000) {
  return (pkg.lengthCm * pkg.widthCm * pkg.heightCm * pkg.packageCount) / divisor;
}

export function createWarehouseExceptions(pkg: WarehousePackageForException, expectedTotalPackageCount?: number) {
  const exceptions: string[] = [];
  if (!pkg.domesticTrackingNo.trim()) {
    exceptions.push('箱号缺失');
  }
  if (pkg.weightKg <= 0) {
    exceptions.push('重量为 0');
  }
  if (pkg.lengthCm <= 0 || pkg.widthCm <= 0 || pkg.heightCm <= 0) {
    exceptions.push('尺寸缺失');
  }
  if (expectedTotalPackageCount && pkg.packageCount !== expectedTotalPackageCount && expectedTotalPackageCount === 1 && pkg.packageCount > 1) {
    exceptions.push('件数与预报不一致');
  }
  return exceptions;
}

export function parseWarehousePackageCode(value: string) {
  const normalized = value.trim();
  const separatorIndex = normalized.search(/[-－—–]/);
  if (separatorIndex <= 0) {
    return { customerOrderNo: normalized, domesticTrackingNo: '' };
  }
  return {
    customerOrderNo: normalized.slice(0, separatorIndex).trim(),
    domesticTrackingNo: normalized.slice(separatorIndex + 1).trim()
  };
}

export function normalizeWarehouseScanTime(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})\.(\d{2})\.(\d{2})\/(\d{2}):(\d{2})'(\d{2})"?$/);
  if (!match) {
    return trimmed;
  }
  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export function formatWarehousePackageNo(pkg: { customerOrderNo: string; domesticTrackingNo: string }) {
  return pkg.domesticTrackingNo ? `${pkg.customerOrderNo}-${pkg.domesticTrackingNo}` : pkg.customerOrderNo;
}

export function createWarehouseInternalLabelNo(source: string) {
  const hash = Array.from(source).reduce((total, char, index) => total + char.charCodeAt(0) * (index + 17), 0);
  return `A${(hash % 1_000_000).toString().padStart(6, '0')}`;
}

export function createWarehouseBarcodeBars(labelNo: string) {
  const seed = Array.from(labelNo).reduce((total, char, index) => total + char.charCodeAt(0) * (index + 3), 0);
  return Array.from({ length: 30 }, (_, index) => 2 + ((seed + index * 7 + labelNo.charCodeAt(index % labelNo.length)) % 5));
}

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
