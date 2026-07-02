type JsonRecord = Record<string, unknown>;

export function shipmentInput(overrides: JsonRecord = {}) {
  return {
    customerId: 'c-9409',
    customerOrderNo: `E2E-${Date.now()}`,
    businessType: 'EXPRESS',
    packageType: 'WPX',
    destinationCountry: '美国',
    packageCount: 1,
    receivableWeightKg: 2,
    agentWeightKg: 2,
    channelId: 'ch-dhl-hk',
    ...overrides
  };
}

export function warehousePackageInput(overrides: JsonRecord = {}) {
  return {
    customerCode: '9409',
    customerOrderNo: `PKG-${Date.now()}`,
    domesticTrackingNo: `KY${Date.now()}`,
    expectedTotalPackageCount: 1,
    packageIndex: 1,
    packageCount: 1,
    weightKg: 2,
    lengthCm: 30,
    widthCm: 20,
    heightCm: 10,
    scanTime: '2026-06-12T10:00:00.000+08:00',
    ...overrides
  };
}
