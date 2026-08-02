export type WarehouseSplitPiece = number | null;

export function canOpenWarehouseSplit(packageCount: number, pendingRemeasure: boolean): boolean {
  return !pendingRemeasure && Number(packageCount) > 0;
}

export function createEvenWarehouseSplitPieces(totalPieces: number, splitCount: number): WarehouseSplitPiece[] {
  const total = Math.floor(Number(totalPieces));
  const count = Math.floor(Number(splitCount));
  if (!Number.isFinite(total) || !Number.isFinite(count) || count < 2 || total <= 0) {
    return [];
  }
  if (total < count) {
    return Array.from({ length: count }, () => null);
  }
  const base = Math.floor(total / count);
  const remainder = total % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function resizeWarehouseSplitPieces(
  pieces: WarehouseSplitPiece[],
  splitCount: number
): WarehouseSplitPiece[] {
  const count = Math.max(2, Math.floor(Number(splitCount) || 2));
  return Array.from({ length: count }, (_, index) => pieces[index] ?? null);
}

export function validateWarehouseSplitPieces(
  pieces: WarehouseSplitPiece[],
  splitCount: number
): string | null {
  const count = Math.floor(Number(splitCount));
  if (!Number.isFinite(count) || count < 2 || pieces.length !== count || pieces.some((piece) => piece === null)) {
    return `请填写 ${Math.max(2, count || 2)} 票的件数`;
  }
  if (pieces.some((piece) => !Number.isInteger(piece) || Number(piece) <= 0)) {
    return '每票件数必须是大于 0 的整数';
  }
  return null;
}
