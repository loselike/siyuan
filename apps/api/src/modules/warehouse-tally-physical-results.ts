import type { WarehouseTallyTaskPackageResultInput } from '@siyuan/shared';

export const MAX_WAREHOUSE_TALLY_PHYSICAL_PIECES = 5000;

export interface WarehouseTallyPhysicalResult extends WarehouseTallyTaskPackageResultInput {
  logicalResultIndex: number;
  physicalPieceIndex: number;
}

export function expandWarehouseTallyPhysicalResults(results: WarehouseTallyTaskPackageResultInput[]): WarehouseTallyPhysicalResult[] {
  let totalPhysicalPieces = 0;
  return results.flatMap((result, logicalResultIndex) => {
    const physicalPieceCount = Number(result.packageCount);
    if (!Number.isSafeInteger(physicalPieceCount) || physicalPieceCount < 1) throw new RangeError('理货后件数必须是正整数');
    totalPhysicalPieces += physicalPieceCount;
    if (totalPhysicalPieces > MAX_WAREHOUSE_TALLY_PHYSICAL_PIECES) {
      throw new RangeError(`单次理货最多生成 ${MAX_WAREHOUSE_TALLY_PHYSICAL_PIECES} 个实体件`);
    }
    const sourcePackageIds = Array.from(new Set(result.sourcePackageIds));
    return Array.from({ length: physicalPieceCount }, (_, physicalPieceIndex) => ({
      ...result,
      sourcePackageIds,
      packageCount: 1,
      logicalResultIndex,
      physicalPieceIndex
    }));
  });
}
