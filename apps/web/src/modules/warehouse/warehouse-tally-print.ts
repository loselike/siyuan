import JsBarcode from 'jsbarcode';
import type { WarehousePackageSummary, WarehouseTallyTaskSummary } from '@siyuan/shared';
import { formatBeijingDateTime } from '../shared/format';
import { escapeHtml } from './utils';

export function createCode128Svg(labelNo: string) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  JsBarcode(svg, labelNo, { format: 'CODE128', displayValue: false, margin: 0, height: 72, width: 2 });
  return svg.outerHTML;
}

export function createWarehouseTallyLabelHtml(
  task: WarehouseTallyTaskSummary,
  packages: WarehousePackageSummary[],
  printedAt: string | number | Date = new Date()
) {
  const rows = packages.length ? packages : [{
    id: task.id,
    labelNo: task.labelNo ?? task.taskNo,
    packageIndex: 1,
    expectedTotalPackageCount: 1,
    packageCount: task.completedPackageCount ?? task.packageCount
  } as WarehousePackageSummary];
  const hasAggregatedPackages = rows.some((pkg) => Math.max(1, Math.floor(Number(pkg.packageCount) || 1)) > 1);
  const physicalLabels = hasAggregatedPackages
    ? rows.flatMap((pkg) => Array.from(
      { length: Math.max(1, Math.floor(Number(pkg.packageCount) || 1)) },
      () => pkg
    )).map((pkg, index, expandedRows) => ({ pkg, packageIndex: index + 1, totalPackages: expandedRows.length }))
    : rows.map((pkg, index) => ({
      pkg,
      packageIndex: pkg.packageIndex ?? index + 1,
      totalPackages: pkg.expectedTotalPackageCount ?? rows.length
    }));
  const printedAtText = formatBeijingDateTime(printedAt).slice(0, 16);
  const labels = physicalLabels.map(({ pkg, packageIndex, totalPackages }) => {
    const labelNo = pkg.labelNo ?? task.taskNo;
    return `<section class="label">
      <div class="print-time">打印时间 ${escapeHtml(printedAtText)}</div>
      <div class="barcode">${createCode128Svg(labelNo)}</div>
      <div class="label-no">${escapeHtml(labelNo)}</div>
      <div class="piece">${packageIndex} / ${totalPackages}</div>
      <div class="count">${totalPackages} 件</div>
    </section>`;
  }).join('');
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(task.taskNo)}</title>
  <style>
    @page { size: 100mm 100mm; margin: 0; }
    body { font-family: Arial, "Microsoft YaHei", sans-serif; margin: 0; color: #000; }
    .label { box-sizing: border-box; width: 100mm; height: 100mm; padding: 5mm 8mm 4mm; text-align: center; page-break-after: always; overflow: hidden; }
    .label:last-child { page-break-after: auto; }
    .print-time { height: 5mm; text-align: left; font-size: 9pt; line-height: 5mm; white-space: nowrap; }
    .barcode { margin-top: 2mm; }
    .barcode svg { display: block; width: 84mm; height: 22mm; }
    .label-no { margin-top: 3mm; font-size: 25pt; line-height: 1.1; font-weight: 700; letter-spacing: 0; white-space: nowrap; }
    .piece { margin-top: 7mm; font-size: 40pt; line-height: 1; font-weight: 800; letter-spacing: 0; }
    .count { margin-top: 4mm; font-size: 20pt; line-height: 1; font-weight: 700; letter-spacing: 0; }
  </style>
</head>
<body>
  ${labels}
</body>
</html>`;
}

export function printWarehouseTallyLabelHtml(html: string, targetWindow?: Window | null) {
  const printWindow = targetWindow ?? window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onafterprint = () => {
    if (!printWindow.closed) {
      printWindow.close();
    }
  };
  printWindow.setTimeout(() => printWindow.print(), 100);
  return true;
}
