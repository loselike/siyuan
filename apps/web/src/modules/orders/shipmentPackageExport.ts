import type { Shipment, ShipmentReviewPackageSummary } from '@siyuan/shared';
import { addRowsWorksheet, createWorkbook, downloadWorkbook, type SimpleWorkbook } from '../shared/excel';
import { formatBeijingDateTime } from '../shared/format';
import { resolveShipmentOutboundOrderNo } from '../shared/shipmentOrderNo';

const packageDetailExportHeaders = [
  '序号',
  '出货单号',
  '客户编号',
  '客户名称',
  '包裹号',
  '快递单号',
  '件数',
  '实重(KG)',
  '长(cm)',
  '宽(cm)',
  '高(cm)',
  '尺寸(cm)',
  '体积(CBM)',
  '材积重(KG)',
  '计费重(KG)',
  '入仓时间',
  '仓库备注',
  '异常'
] as const;

export function resolveShipmentPackageExportRows(
  packages: ShipmentReviewPackageSummary[],
  selectedPackageIds: string[]
) {
  if (!selectedPackageIds.length) return packages;
  const selectedIds = new Set(selectedPackageIds);
  return packages.filter((item) => selectedIds.has(item.id));
}

export function buildShipmentPackageDetailWorkbook(
  shipment: Shipment,
  packages: ShipmentReviewPackageSummary[]
): SimpleWorkbook {
  const workbook = createWorkbook();
  const outboundOrderNo = resolveShipmentOutboundOrderNo(shipment);
  addRowsWorksheet(workbook, '单件货物明细', [
    [...packageDetailExportHeaders],
    ...packages.map((item, index) => [
      index + 1,
      outboundOrderNo,
      shipment.customerCode || '',
      shipment.customerName || '',
      item.packageNo || '',
      item.domesticTrackingNo || '',
      item.packageCount,
      item.weightKg,
      item.lengthCm,
      item.widthCm,
      item.heightCm,
      `${item.lengthCm.toFixed(1)} × ${item.widthCm.toFixed(1)} × ${item.heightCm.toFixed(1)}`,
      item.cbm,
      item.volumetricWeightKg,
      item.chargeableWeightKg,
      item.inboundAt ? formatBeijingDateTime(item.inboundAt) : '',
      item.warehouseRemark || '',
      item.exceptions.join('、')
    ])
  ], {
    headerRow: true,
    columnWidths: [8, 20, 14, 24, 26, 24, 8, 12, 10, 10, 10, 24, 14, 14, 14, 20, 24, 24]
  });
  return workbook;
}

export function shipmentPackageDetailExportFilename(shipment: Shipment) {
  const safeOrderNo = resolveShipmentOutboundOrderNo(shipment).replace(/[\\/:*?"<>|]/g, '-');
  return `${safeOrderNo || '运单'}-单件货物明细.xlsx`;
}

export async function downloadShipmentPackageDetailWorkbook(
  shipment: Shipment,
  packages: ShipmentReviewPackageSummary[]
) {
  await downloadWorkbook(
    buildShipmentPackageDetailWorkbook(shipment, packages),
    shipmentPackageDetailExportFilename(shipment)
  );
}
