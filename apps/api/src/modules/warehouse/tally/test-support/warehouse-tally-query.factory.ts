import type { Principal } from '../../../rbac.js';
import type { WarehouseTallyQueryRepository } from '../warehouse-tally-query.repository.js';

type WarehousePackageSummary = Awaited<ReturnType<WarehouseTallyQueryRepository['getWarehouseConsolidationItems']>>[number];
type WarehouseTallyTaskSummary = Awaited<ReturnType<WarehouseTallyQueryRepository['getWarehouseTallyTasks']>>[number];

export const warehouseTallyAdminPrincipal: Principal = {
  id: 'u-admin',
  username: 'admin',
  role: 'ADMIN'
};

export const warehouseTallyOperatorPrincipal: Principal = {
  id: 'u-operator',
  username: 'operator',
  name: '业务员',
  nickname: '小思',
  role: 'OPERATOR'
};

export function warehouseTallyPackageSummary(
  overrides: Partial<WarehousePackageSummary> = {}
): WarehousePackageSummary {
  return {
    id: 'pkg-output',
    customerCode: 'C001',
    customerOrderNo: 'ORDER-1',
    domesticTrackingNo: 'SF001',
    combinedOrderNo: 'ORDER-1-SF001',
    receivingChannel: '仓库设备',
    packageCount: 1,
    weightKg: 10,
    lengthCm: 50,
    widthCm: 40,
    heightCm: 30,
    cbm: 0.06,
    volumetricWeightKg: 10,
    chargeableWeightKg: 10,
    divisor: 6000,
    roundingRule: 'NONE',
    status: 'RECEIVED',
    exceptions: [],
    createdAt: '2026-07-25T01:00:00.000Z',
    ...overrides
  };
}

export function warehouseTallyTaskSummary(
  overrides: Partial<WarehouseTallyTaskSummary> = {}
): WarehouseTallyTaskSummary {
  return {
    id: 'task-1',
    taskNo: 'TL-001',
    status: 'COMPLETED',
    packageIds: ['pkg-source'],
    sourcePackageId: 'pkg-source',
    sourceCombinedOrderNo: 'ORDER-1-SF001',
    customerCode: 'C001',
    customerName: '客户一',
    salesperson: 'operator',
    packageCount: 1,
    originalWeightKg: 10,
    originalLengthCm: 50,
    originalWidthCm: 40,
    originalHeightCm: 30,
    originalVolumetricWeightKg: 10,
    originalVolumetricWeightKg5000: 12,
    tallyRequirement: '重新包装',
    createdAt: '2026-07-25T00:00:00.000Z',
    completedAt: '2026-07-25T01:00:00.000Z',
    labelStatus: 'NOT_GENERATED',
    ...overrides
  };
}

export function warehouseTallyPackageRow(overrides: Record<string, unknown> = {}) {
  const summary = warehouseTallyPackageSummary();
  return {
    ...summary,
    createdAt: new Date(summary.createdAt),
    ...overrides
  };
}

export function warehouseTallyTaskRow(overrides: Record<string, unknown> = {}) {
  const { labelStatus: _labelStatus, ...summary } = warehouseTallyTaskSummary();
  return {
    ...summary,
    sourcePackageId: undefined,
    createdAt: new Date(summary.createdAt),
    completedAt: summary.completedAt ? new Date(summary.completedAt) : undefined,
    ...overrides
  };
}
