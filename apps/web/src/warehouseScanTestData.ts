export interface WarehouseScanTestRow {
  sheetName: string;
  combinedOrderNo: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  cbm: number;
  volumetricWeightKg: number;
  scanTime: string;
  expectedTotalPackageCount?: number;
}

export const warehouseScanTestRows: WarehouseScanTestRow[] = [
  {
    sheetName: '8',
    combinedOrderNo: 'W022-金属',
    weightKg: 24.2,
    lengthCm: 43,
    widthCm: 24,
    heightCm: 22,
    cbm: 0.022704,
    volumetricWeightKg: 3.78,
    scanTime: '2026.06.08/09:27\'11"'
  },
  {
    sheetName: '8',
    combinedOrderNo: 'SHB022-合箱后数据',
    weightKg: 8,
    lengthCm: 48,
    widthCm: 30,
    heightCm: 36,
    cbm: 0.05184,
    volumetricWeightKg: 8.64,
    scanTime: '2026.06.08/09:44\'06"'
  },
  {
    sheetName: '8',
    combinedOrderNo: '1399-KY4001036478949',
    weightKg: 14.2,
    lengthCm: 128,
    widthCm: 46,
    heightCm: 51,
    cbm: 0.300288,
    volumetricWeightKg: 50.05,
    scanTime: '2026.06.08/10:07\'28"',
    expectedTotalPackageCount: 10
  },
  {
    sheetName: '8',
    combinedOrderNo: '1399-KY4001036478949',
    weightKg: 13.9,
    lengthCm: 130,
    widthCm: 46,
    heightCm: 51,
    cbm: 0.30498,
    volumetricWeightKg: 50.83,
    scanTime: '2026.06.08/10:08\'08"'
  },
  {
    sheetName: '8',
    combinedOrderNo: '1399-KY4001036478949',
    weightKg: 14.2,
    lengthCm: 129,
    widthCm: 46,
    heightCm: 51,
    cbm: 0.302634,
    volumetricWeightKg: 50.44,
    scanTime: '2026.06.08/10:08\'48"'
  },
  {
    sheetName: '8',
    combinedOrderNo: 'P710-999056444656',
    weightKg: 18,
    lengthCm: 54,
    widthCm: 34,
    heightCm: 41,
    cbm: 0.075276,
    volumetricWeightKg: 12.55,
    scanTime: '2026.06.08/10:14\'14"'
  },
  {
    sheetName: '8',
    combinedOrderNo: 'P710-999056444656',
    weightKg: 18,
    lengthCm: 54,
    widthCm: 34,
    heightCm: 41,
    cbm: 0.075276,
    volumetricWeightKg: 12.55,
    scanTime: '2026.06.08/10:14\'14"'
  },
  {
    sheetName: '8',
    combinedOrderNo: 'P710-999056444656',
    weightKg: 18,
    lengthCm: 54,
    widthCm: 35,
    heightCm: 41,
    cbm: 0.07749,
    volumetricWeightKg: 12.91,
    scanTime: '2026.06.08/10:14\'23"'
  },
  {
    sheetName: '8',
    combinedOrderNo: 'P710-999056444656',
    weightKg: 18,
    lengthCm: 55,
    widthCm: 33,
    heightCm: 41,
    cbm: 0.074415,
    volumetricWeightKg: 12.4,
    scanTime: '2026.06.08/10:14\'31"'
  },
  {
    sheetName: '8',
    combinedOrderNo: 'P710-999056444656',
    weightKg: 17.9,
    lengthCm: 55,
    widthCm: 45,
    heightCm: 33,
    cbm: 0.081675,
    volumetricWeightKg: 13.61,
    scanTime: '2026.06.08/10:14\'42"'
  },
  {
    sheetName: '8',
    combinedOrderNo: 'P710-999056444656',
    weightKg: 17.9,
    lengthCm: 55,
    widthCm: 45,
    heightCm: 32,
    cbm: 0.0792,
    volumetricWeightKg: 13.2,
    scanTime: '2026.06.08/10:14\'56"'
  },
  {
    sheetName: '8',
    combinedOrderNo: 'P710-999056444656',
    weightKg: 13.4,
    lengthCm: 48,
    widthCm: 35,
    heightCm: 29,
    cbm: 0.04872,
    volumetricWeightKg: 8.12,
    scanTime: '2026.06.08/10:15\'06"'
  },
  {
    sheetName: '8',
    combinedOrderNo: 'P710-999056444656',
    weightKg: 13.3,
    lengthCm: 47,
    widthCm: 36,
    heightCm: 29,
    cbm: 0.049068,
    volumetricWeightKg: 8.18,
    scanTime: '2026.06.08/10:15\'14"'
  },
  {
    sheetName: '8',
    combinedOrderNo: 'P710-999056444656',
    weightKg: 13.4,
    lengthCm: 49,
    widthCm: 36,
    heightCm: 30,
    cbm: 0.05292,
    volumetricWeightKg: 8.82,
    scanTime: '2026.06.08/10:15\'22"'
  },
  {
    sheetName: '8',
    combinedOrderNo: 'P710-999056444656',
    weightKg: 11.7,
    lengthCm: 54,
    widthCm: 28,
    heightCm: 33,
    cbm: 0.049896,
    volumetricWeightKg: 8.32,
    scanTime: '2026.06.08/10:15\'33"'
  },
  {
    sheetName: '8',
    combinedOrderNo: 'P710-999056444656',
    weightKg: 15.4,
    lengthCm: 55,
    widthCm: 36,
    heightCm: 36,
    cbm: 0.07128,
    volumetricWeightKg: 11.88,
    scanTime: '2026.06.08/10:15\'43"'
  },
  {
    sheetName: '8',
    combinedOrderNo: 'P710-999056444656',
    weightKg: 11.3,
    lengthCm: 57,
    widthCm: 38,
    heightCm: 23,
    cbm: 0.049818,
    volumetricWeightKg: 8.3,
    scanTime: '2026.06.08/10:15\'52"'
  },
  {
    sheetName: '8',
    combinedOrderNo: 'P710-999056444656',
    weightKg: 17.9,
    lengthCm: 55,
    widthCm: 43,
    heightCm: 32,
    cbm: 0.07568,
    volumetricWeightKg: 12.61,
    scanTime: '2026.06.08/10:16\'03"'
  },
  {
    sheetName: '8',
    combinedOrderNo: 'P710-999056444656',
    weightKg: 17.9,
    lengthCm: 54,
    widthCm: 44,
    heightCm: 31,
    cbm: 0.073656,
    volumetricWeightKg: 12.28,
    scanTime: '2026.06.08/10:16\'12"'
  },
  {
    sheetName: '8',
    combinedOrderNo: 'S677-KY4001066447624',
    weightKg: 17.7,
    lengthCm: 110,
    widthCm: 59,
    heightCm: 22,
    cbm: 0.14278,
    volumetricWeightKg: 23.8,
    scanTime: '2026.06.08/10:16\'43"'
  },
  {
    sheetName: '8',
    combinedOrderNo: 'S677-KY4001066447624',
    weightKg: 15.8,
    lengthCm: 110,
    widthCm: 61,
    heightCm: 22,
    cbm: 0.14762,
    volumetricWeightKg: 24.6,
    scanTime: '2026.06.08/10:16\'56"'
  }
];
