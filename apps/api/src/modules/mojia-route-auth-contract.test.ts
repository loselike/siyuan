import { UnauthorizedException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataController } from './data.controller.js';

const originalDeviceToken = process.env.MOJIA_DEVICE_TOKEN;

afterEach(() => {
  if (originalDeviceToken === undefined) delete process.env.MOJIA_DEVICE_TOKEN;
  else process.env.MOJIA_DEVICE_TOKEN = originalDeviceToken;
});

describe('Mojia device route auth contract', () => {
  it.each([
    ['missing token', {}, undefined],
    ['wrong header token', { 'x-device-token': 'wrong-token' }, undefined],
    ['wrong query token', {}, 'wrong-token']
  ])('rejects %s before any repository write', async (_label, headers, queryToken) => {
    process.env.MOJIA_DEVICE_TOKEN = 'contract-test-token';
    const repository = {
      applyWarehouseTallyMeasurementByBarcode: vi.fn(),
      createWarehousePackage: vi.fn()
    };
    const controller = new DataController(repository as never, {} as never);
    const body: Parameters<DataController['receiveMojiaMeasurement']>[2] = {
      barcode: 'TEST-001',
      weightKg: 1,
      lengthCm: 1,
      widthCm: 1,
      heightCm: 1
    };

    await expect(controller.receiveMojiaMeasurement(headers, queryToken, body)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(repository.applyWarehouseTallyMeasurementByBarcode).not.toHaveBeenCalled();
    expect(repository.createWarehousePackage).not.toHaveBeenCalled();
  });
});
