import type { WarehousePackageSummary } from '@siyuan/shared';

export interface WarehouseTallyOutputDisplayRow extends WarehousePackageSummary {
  displayId: string;
  pieceSequence: string;
  legacyAggregate: boolean;
}

export function buildWarehouseTallyOutputDisplayRows(packages: WarehousePackageSummary[]): WarehouseTallyOutputDisplayRow[] {
  const totalPieces = packages.reduce((sum, pkg) => sum + Math.max(1, Math.floor(Number(pkg.packageCount) || 1)), 0);
  let pieceIndex = 0;
  return packages.flatMap((pkg) => {
    const packagePieces = Math.max(1, Math.floor(Number(pkg.packageCount) || 1));
    const legacyAggregate = packagePieces > 1;
    return Array.from({ length: packagePieces }, (_, packagePieceIndex) => {
      pieceIndex += 1;
      return {
        ...pkg,
        displayId: `${pkg.id}:${packagePieceIndex + 1}`,
        pieceSequence: `${pieceIndex}/${totalPieces}`,
        packageCount: 1,
        legacyAggregate
      };
    });
  });
}
