import JsBarcode from 'jsbarcode';
import type { WarehousePackageSummary, WarehouseTallyTaskSummary } from '@siyuan/shared';
import { escapeHtml } from './utils';

export function createCode128Svg(labelNo: string) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  JsBarcode(svg, labelNo, { format: 'CODE128', displayValue: false, margin: 0, height: 72, width: 2 });
  return svg.outerHTML;
}

export function createWarehouseTallyLabelHtml(task: WarehouseTallyTaskSummary, packages: WarehousePackageSummary[]) {
  const rows = packages.length ? packages : [{
    id: task.id,
    labelNo: task.labelNo ?? task.taskNo,
    packageIndex: 1,
    expectedTotalPackageCount: 1,
    packageCount: task.completedPackageCount ?? task.packageCount
  } as WarehousePackageSummary];
  const labels = rows.map((pkg, index) => {
    const labelNo = pkg.labelNo ?? task.taskNo;
    const packageIndex = pkg.packageIndex ?? index + 1;
    const totalPackages = pkg.expectedTotalPackageCount ?? rows.length;
    return `<section class="label">
      <div class="barcode">${createCode128Svg(labelNo)}</div>
      <div class="label-no">${escapeHtml(labelNo)}</div>
      <div class="piece">${packageIndex} / ${totalPackages}</div>
      <div class="count">${pkg.packageCount} 件</div>
    </section>`;
  }).join('');
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(task.taskNo)}</title>
  <style>
    @page { size: 100mm 150mm; margin: 0; }
    body { font-family: Arial, "Microsoft YaHei", sans-serif; margin: 0; color: #000; }
    .label { box-sizing: border-box; width: 100mm; height: 150mm; padding: 13mm 8mm; text-align: center; page-break-after: always; overflow: hidden; }
    .label:last-child { page-break-after: auto; }
    .barcode svg { width: 84mm; height: 28mm; }
    .label-no { margin-top: 6mm; font-size: 28pt; font-weight: 700; letter-spacing: 0; white-space: nowrap; }
    .piece { margin-top: 18mm; font-size: 46pt; font-weight: 800; letter-spacing: 0; }
    .count { margin-top: 6mm; font-size: 22pt; font-weight: 700; letter-spacing: 0; }
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
