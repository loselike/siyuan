export interface WarehouseDeviceRemarkParts {
  deviceNo?: string;
  businessRemark: string;
}

const DEVICE_REMARK_PATTERN = /^设备号\s*[:：]\s*([^；;]+?)(?:\s*[；;]\s*(?:备注\s*[:：]\s*)?(.*))?$/;

export function splitWarehouseDeviceRemark(
  scanSource: string | undefined,
  remark: string | undefined
): WarehouseDeviceRemarkParts {
  const normalizedRemark = remark?.trim() ?? '';
  if (scanSource?.trim() !== '墨家设备') {
    return { businessRemark: normalizedRemark };
  }

  const matched = DEVICE_REMARK_PATTERN.exec(normalizedRemark);
  if (!matched) {
    return { businessRemark: normalizedRemark };
  }

  return {
    deviceNo: matched[1].trim(),
    businessRemark: matched[2]?.trim() ?? ''
  };
}

export function composeWarehouseDeviceRemark(
  deviceNo: string | undefined,
  businessRemark: string
): string {
  const normalizedDeviceNo = deviceNo?.trim() ?? '';
  const normalizedBusinessRemark = businessRemark.trim();
  if (!normalizedDeviceNo) return normalizedBusinessRemark;
  if (!normalizedBusinessRemark) return `设备号：${normalizedDeviceNo}`;
  return `设备号：${normalizedDeviceNo}；备注：${normalizedBusinessRemark}`;
}
