export function createWarehouseTallyPackageLabelNo(taskNo: string, packageIndex: number, totalPackages: number) {
  if (totalPackages <= 1) return taskNo;
  return `${taskNo}-${String(packageIndex).padStart(2, '0')}`;
}
