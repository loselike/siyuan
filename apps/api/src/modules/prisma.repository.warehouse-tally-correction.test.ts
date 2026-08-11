import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from './prisma.service.js';
import { PrismaRepository } from './prisma.repository.js';
import type { Principal } from './rbac.js';

const admin: Principal = { id: 'u-admin', username: 'admin', role: 'ADMIN' };
const now = new Date('2026-08-01T08:00:00.000Z');

function packageRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'aggregate-1',
    customerCode: '9409',
    customerName: '测试客户',
    site: '深圳站',
    salesperson: 'operator',
    customerOrderNo: '9409',
    domesticTrackingNo: 'SF-HISTORY-1',
    combinedOrderNo: 'TL-HISTORY-001',
    labelNo: 'TL-HISTORY-001',
    sourcePackageId: 'source-1',
    sourcePackageNo: '9409-SF-HISTORY-1',
    archivedByPackageId: null,
    archivedByPackageNo: null,
    archivedReason: null,
    archivedAt: null,
    tallyTaskId: 'task-history-1',
    tallyTaskNo: 'TL-HISTORY-001',
    systemOrderNo: null,
    shipmentId: null,
    receivingChannel: '理货结果',
    destinationCountry: '美国',
    expectedTotalPackageCount: 2,
    packageIndex: 1,
    packageCount: 2,
    weightKg: 11,
    lengthCm: 40,
    widthCm: 25,
    heightCm: 15,
    cbm: 0.03,
    volumetricWeightKg: 5,
    chargeableWeightKg: 11,
    divisor: 6000,
    roundingRule: 'NONE',
    scanTime: now,
    remark: '历史聚合样本',
    manualException: null,
    scanSource: '仓库设备',
    measurementStatus: 'MEASURED',
    measurementMatchedAt: now,
    measurementMatchedBy: 'warehouse',
    status: 'RECEIVED',
    exceptions: [],
    createdBy: 'warehouse',
    createdAt: now,
    ...overrides
  };
}

function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-history-1',
    taskNo: 'TL-HISTORY-001',
    status: 'COMPLETED',
    tallyChannel: '空运',
    tallyProgressStatus: 'COMPLETED',
    tallyStartedAt: now,
    tallyStartedBy: 'warehouse',
    rootTallyTaskId: 'task-history-1',
    previousTallyTaskId: null,
    tallySequence: 1,
    packageIds: ['source-1', 'source-2'],
    sourcePackageId: 'source-1',
    sourceCombinedOrderNo: '9409-SF-HISTORY-1',
    customerCode: '9409',
    customerName: '测试客户',
    salesperson: 'operator',
    packageCount: 2,
    originalWeightKg: 11,
    originalLengthCm: 40,
    originalWidthCm: 25,
    originalHeightCm: 15,
    originalVolumetricWeightKg: 5,
    originalVolumetricWeightKg5000: 6,
    tallyRequirement: '重新测量',
    remark: '历史聚合样本',
    createdBy: 'warehouse',
    createdAt: now,
    completedPackageCount: 2,
    completedWeightKg: 11,
    completedLengthCm: 40,
    completedWidthCm: 25,
    completedHeightCm: 15,
    completedVolumetricWeightKg: 5,
    completedVolumetricWeightKg5000: 6,
    completedBy: 'warehouse',
    completedAt: now,
    labelStatus: 'GENERATED',
    labelNo: 'TL-HISTORY-001',
    labelQrContent: null,
    labelGeneratedAt: now,
    labelGeneratedBy: 'warehouse',
    labelPrintedAt: null,
    labelPrintedBy: null,
    labelDownloadedAt: null,
    labelDownloadedBy: null,
    appliedPackageId: 'aggregate-1',
    appliedPackageNo: 'TL-HISTORY-001',
    labelAppliedAt: now,
    labelAppliedBy: 'warehouse',
    cancelReason: null,
    cancelledAt: null,
    cancelledBy: null,
    ...overrides
  };
}

function sourcePackage(id: string) {
  return packageRow({
    id,
    combinedOrderNo: `SOURCE-${id}`,
    labelNo: null,
    sourcePackageId: null,
    sourcePackageNo: null,
    packageCount: 1,
    packageIndex: id === 'source-1' ? 1 : 2,
    status: 'TALLIED_ARCHIVED',
    archivedByPackageId: 'aggregate-1',
    archivedByPackageNo: 'TL-HISTORY-001'
  });
}

function scan(id: string, receivedAt: string, weightKg: number, lengthCm: number) {
  return {
    id,
    deviceNo: 'mojia-1',
    payload: {
      barcode: 'TL-HISTORY-001',
      measuredAt: receivedAt,
      weightKg,
      lengthCm,
      widthCm: 20,
      heightCm: 10
    },
    payloadHash: `hash-${id}`,
    result: 'SUCCESS',
    errorMessage: null,
    receivedAt: new Date(receivedAt)
  };
}

function correctionFixture() {
  const task = taskRow();
  const aggregate = packageRow();
  const sources = [sourcePackage('source-1'), sourcePackage('source-2')];
  const samples = [
    scan('sample-1', '2026-08-01T08:01:00.000Z', 5, 30),
    scan('sample-2', '2026-08-01T08:02:00.000Z', 6, 40)
  ];
  const createdPackages: Array<Record<string, unknown>> = [];
  const taskFindUnique = vi.fn().mockResolvedValue(task);
  const taskFindFirst = vi.fn().mockResolvedValue(null);
  const taskUpdate = vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve({ ...task, ...data })
  );
  const packageFindFirst = vi.fn().mockImplementation(({ where }: { where: Record<string, unknown> }) =>
    Promise.resolve('archivedReason' in where ? null : null)
  );
  const packageFindMany = vi.fn().mockImplementation(({ where }: { where: Record<string, unknown> }) => {
    if ('tallyTaskId' in where) return Promise.resolve([aggregate]);
    return Promise.resolve(sources);
  });
  const packageCreate = vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
    const created = packageRow({
      ...data,
      id: `corrected-${createdPackages.length + 1}`,
      createdAt: now
    });
    createdPackages.push(created);
    return Promise.resolve(created);
  });
  const packageUpdateMany = vi.fn().mockImplementation(({ where }: { where: Record<string, unknown> }) =>
    Promise.resolve({ count: typeof where.id === 'string' ? 1 : 2 })
  );
  const auditCreate = vi.fn().mockResolvedValue({});
  const prisma = {
    warehouseTallyTask: {
      findUnique: taskFindUnique,
      findFirst: taskFindFirst,
      update: taskUpdate
    },
    warehousePackage: {
      findFirst: packageFindFirst,
      findMany: packageFindMany,
      create: packageCreate,
      updateMany: packageUpdateMany
    },
    warehouseConsolidationItem: { count: vi.fn().mockResolvedValue(0) },
    shipment: { findFirst: vi.fn().mockResolvedValue(null) },
    mojiaRequestSample: { findMany: vi.fn().mockResolvedValue(samples) },
    auditLog: { create: auditCreate },
    $queryRaw: vi.fn().mockResolvedValue([]),
    $transaction: vi.fn()
  };
  prisma.$transaction.mockImplementation(async (operation: (tx: typeof prisma) => Promise<unknown>) => operation(prisma));
  const repository = new PrismaRepository(prisma as unknown as PrismaService);
  vi.spyOn(repository, 'hasPermission').mockResolvedValue(true);
  return { repository, prisma, createdPackages, auditCreate, packageUpdateMany, taskUpdate };
}

describe('PrismaRepository warehouse tally historical aggregate correction', () => {
  it('preserves preview fingerprint, serializable replacement, source rewiring and audit', async () => {
    const fixture = correctionFixture();
    const preview = await fixture.repository.getWarehouseTallyHistoricalAggregateCorrectionPreview(
      admin,
      'task-history-1'
    );

    expect(preview).toEqual(expect.objectContaining({
      taskId: 'task-history-1',
      taskNo: 'TL-HISTORY-001',
      eligible: true,
      alreadyCorrected: false,
      legacyPackageId: 'aggregate-1',
      expectedPackageCount: 2,
      scans: [
        expect.objectContaining({ sampleId: 'sample-1', weightKg: 5 }),
        expect.objectContaining({ sampleId: 'sample-2', weightKg: 6 })
      ],
      previewFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/)
    }));

    const result = await fixture.repository.correctWarehouseTallyHistoricalAggregate(
      admin,
      'task-history-1',
      {
        sampleIds: ['sample-1', 'sample-2'],
        previewFingerprint: preview.previewFingerprint!,
        confirmedPhysicalPieces: true
      }
    );

    expect(result).toEqual(expect.objectContaining({
      archivedAggregatePackageId: 'aggregate-1',
      alreadyCorrected: false,
      correctedPackages: [
        expect.objectContaining({
          id: 'corrected-1',
          combinedOrderNo: 'TL-HISTORY-001-01',
          packageCount: 1,
          weightKg: 5,
          volumetricWeightKg: 1,
          chargeableWeightKg: 5
        }),
        expect.objectContaining({
          id: 'corrected-2',
          combinedOrderNo: 'TL-HISTORY-001-02',
          packageCount: 1,
          weightKg: 6,
          volumetricWeightKg: 1.33,
          chargeableWeightKg: 6
        })
      ],
      task: expect.objectContaining({
        id: 'task-history-1',
        appliedPackageId: 'corrected-1',
        completedPackageCount: 2,
        completedWeightKg: 11,
        outputPackages: expect.arrayContaining([
          expect.objectContaining({ id: 'corrected-1' }),
          expect.objectContaining({ id: 'corrected-2' })
        ])
      })
    }));
    expect(fixture.prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable'
    });
    expect(fixture.packageUpdateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { id: 'aggregate-1', status: 'RECEIVED' },
      data: expect.objectContaining({
        status: 'TALLIED_ARCHIVED',
        archivedByPackageId: 'corrected-1',
        archivedReason: '历史聚合理货纠正'
      })
    }));
    expect(fixture.packageUpdateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({
        id: { in: ['source-1', 'source-2'] },
        archivedByPackageId: 'aggregate-1'
      }),
      data: { archivedByPackageId: 'corrected-1', archivedByPackageNo: 'TL-HISTORY-001-01' }
    }));
    expect(fixture.taskUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'task-history-1' },
      data: expect.objectContaining({ appliedPackageId: 'corrected-1', labelStatus: 'GENERATED' })
    }));
    expect(fixture.auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        actorId: 'u-admin',
        action: 'warehouse.tally.historical_aggregate.correct',
        target: 'task-history-1'
      })
    }));
  });

  it('preserves physical confirmation and stale-preview rejection before writes', async () => {
    const fixture = correctionFixture();
    const preview = await fixture.repository.getWarehouseTallyHistoricalAggregateCorrectionPreview(
      admin,
      'task-history-1'
    );

    await expect(fixture.repository.correctWarehouseTallyHistoricalAggregate(admin, 'task-history-1', {
      sampleIds: ['sample-1', 'sample-2'],
      previewFingerprint: preview.previewFingerprint!,
      confirmedPhysicalPieces: false
    })).rejects.toThrow('请先确认每条扫描数据对应不同的实体包裹');
    await expect(fixture.repository.correctWarehouseTallyHistoricalAggregate(admin, 'task-history-1', {
      sampleIds: ['sample-1', 'sample-2'],
      previewFingerprint: 'stale-preview',
      confirmedPhysicalPieces: true
    })).rejects.toThrow('设备扫描预览已变化，请重新打开并核对后再确认');
    expect(fixture.createdPackages).toHaveLength(0);
    expect(fixture.auditCreate).not.toHaveBeenCalled();
  });

  it('preserves site scope rejection before exposing the correction preview', async () => {
    const warehouse: Principal = {
      id: 'u-warehouse',
      username: 'warehouse',
      role: 'WAREHOUSE',
      site: '广州站'
    };
    const salesOwn: Principal = {
      id: 'u-sales',
      username: 'sales',
      role: 'OPERATOR',
      site: '深圳站',
      dataScope: 'SALES_OWN'
    };

    await expect(correctionFixture().repository.getWarehouseTallyHistoricalAggregateCorrectionPreview(
      warehouse,
      'task-history-1'
    )).rejects.toThrow('只能纠正当前账号所属站点的历史理货数据');
    await expect(correctionFixture().repository.getWarehouseTallyHistoricalAggregateCorrectionPreview(
      salesOwn,
      'task-history-1'
    )).rejects.toThrow('销售员数据范围账号不能纠正历史理货数据');
  });

  it('preserves already-corrected idempotence without creating packages or a second audit', async () => {
    const task = taskRow();
    const aggregate = packageRow({
      status: 'TALLIED_ARCHIVED',
      archivedReason: '历史聚合理货纠正',
      archivedAt: now
    });
    const correctedPackages = [1, 2].map((index) => packageRow({
      id: `corrected-${index}`,
      combinedOrderNo: `TL-HISTORY-001-0${index}`,
      labelNo: `TL-HISTORY-001-0${index}`,
      sourcePackageId: 'aggregate-1',
      packageCount: 1,
      packageIndex: index,
      status: 'RECEIVED'
    }));
    const packageCreate = vi.fn();
    const auditCreate = vi.fn();
    const prisma = {
      warehouseTallyTask: { findUnique: vi.fn().mockResolvedValue(task) },
      warehousePackage: {
        findFirst: vi.fn().mockResolvedValue(aggregate),
        findMany: vi.fn().mockResolvedValue(correctedPackages),
        create: packageCreate
      },
      auditLog: { create: auditCreate },
      $queryRaw: vi.fn().mockResolvedValue([]),
      $transaction: vi.fn()
    };
    prisma.$transaction.mockImplementation(async (operation: (tx: typeof prisma) => Promise<unknown>) => operation(prisma));
    const repository = new PrismaRepository(prisma as unknown as PrismaService);
    vi.spyOn(repository, 'hasPermission').mockResolvedValue(true);

    await expect(repository.correctWarehouseTallyHistoricalAggregate(admin, 'task-history-1', {
      sampleIds: [],
      previewFingerprint: '',
      confirmedPhysicalPieces: false
    })).resolves.toEqual(expect.objectContaining({
      archivedAggregatePackageId: 'aggregate-1',
      alreadyCorrected: true,
      correctedPackages: [
        expect.objectContaining({ id: 'corrected-1' }),
        expect.objectContaining({ id: 'corrected-2' })
      ]
    }));
    expect(packageCreate).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });
});
