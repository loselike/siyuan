import type { LineShipmentPackageSummary, Shipment, WarehousePackageSummary } from '@siyuan/shared';

type ShipmentPackageBinding = { shipmentId: string; packageIds: string[] };

export function buildLineShipmentPackageSummaries(
  shipments: Shipment[],
  packages: WarehousePackageSummary[],
  bindings: ShipmentPackageBinding[] = []
): Record<string, LineShipmentPackageSummary> {
  const packageById = new Map(packages.map((pkg) => [pkg.id, pkg]));
  const shipmentById = new Map(shipments.map((shipment) => [shipment.id, shipment]));
  const shipmentBySystemOrderNo = new Map(shipments.map((shipment) => [shipment.systemOrderNo, shipment]));
  const packageIdsByShipmentId = new Map<string, Set<string>>();

  const addPackage = (shipmentId: string, packageId: string) => {
    if (!shipmentById.has(shipmentId) || !packageById.has(packageId)) return;
    const ids = packageIdsByShipmentId.get(shipmentId) ?? new Set<string>();
    ids.add(packageId);
    packageIdsByShipmentId.set(shipmentId, ids);
  };

  packages.forEach((pkg) => {
    const shipment = (pkg.shipmentId ? shipmentById.get(pkg.shipmentId) : undefined)
      ?? (pkg.systemOrderNo ? shipmentBySystemOrderNo.get(pkg.systemOrderNo) : undefined);
    if (shipment) addPackage(shipment.id, pkg.id);
  });
  shipments.forEach((shipment) => {
    (shipment.draftWarehousePackageIds ?? []).forEach((packageId) => addPackage(shipment.id, packageId));
  });
  bindings.forEach((binding) => binding.packageIds.forEach((packageId) => addPackage(binding.shipmentId, packageId)));

  const result: Record<string, LineShipmentPackageSummary> = {};
  packageIdsByShipmentId.forEach((seedIds, shipmentId) => {
    const relatedIds = new Set(seedIds);
    let changed = true;
    while (changed) {
      changed = false;
      const relatedTaskIds = new Set(
        packages.filter((pkg) => relatedIds.has(pkg.id) && pkg.tallyTaskId).map((pkg) => pkg.tallyTaskId!)
      );
      packages.forEach((pkg) => {
        const related = relatedIds.has(pkg.id)
          || Boolean(pkg.sourcePackageId && relatedIds.has(pkg.sourcePackageId))
          || Boolean(pkg.archivedByPackageId && relatedIds.has(pkg.archivedByPackageId))
          || Boolean(pkg.tallyTaskId && relatedTaskIds.has(pkg.tallyTaskId));
        if (!related) return;
        [pkg.id, pkg.sourcePackageId, pkg.archivedByPackageId].filter(Boolean).forEach((id) => {
          if (!relatedIds.has(id!)) {
            relatedIds.add(id!);
            changed = true;
          }
        });
      });
    }

    const allRows = Array.from(relatedIds).map((id) => packageById.get(id)).filter((pkg): pkg is WarehousePackageSummary => Boolean(pkg));
    const activeRows = allRows.filter((pkg) => pkg.status !== 'TALLIED_ARCHIVED');
    const totalRows = activeRows.length ? activeRows : allRows;
    result[shipmentId] = {
      packageCount: totalRows.reduce((sum, pkg) => sum + (pkg.packageCount || 1), 0),
      totalWeightKg: round2(totalRows.reduce((sum, pkg) => sum + actualWeightTotal(pkg), 0)),
      totalCbm: round2(totalRows.reduce((sum, pkg) => sum + Number(pkg.cbm ?? 0), 0)),
      domesticTrackingNos: Array.from(new Set(allRows.map((pkg) => pkg.domesticTrackingNo).filter(Boolean))),
      combinedOrderNos: Array.from(new Set(allRows.map((pkg) => pkg.combinedOrderNo).filter(Boolean)))
    };
  });
  return result;
}

function actualWeightTotal(pkg: Pick<WarehousePackageSummary, 'sourcePackageId' | 'weightKg' | 'packageCount'>): number {
  return pkg.sourcePackageId ? pkg.weightKg : pkg.weightKg * pkg.packageCount;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
