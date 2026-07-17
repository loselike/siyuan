import { describe, expect, it } from 'vitest';
import { canUpdateUnenteredWarehousePackage } from './warehouse-package-editability.js';

describe('canUpdateUnenteredWarehousePackage', () => {
  it('allows every unentered package in the normal in-stock states', () => {
    expect(canUpdateUnenteredWarehousePackage('PENDING')).toBe(true);
    expect(canUpdateUnenteredWarehousePackage('RECEIVED')).toBe(true);
  });

  it('keeps order-entered and non-in-stock packages locked', () => {
    expect(canUpdateUnenteredWarehousePackage('PENDING', 'shipment-001')).toBe(false);
    expect(canUpdateUnenteredWarehousePackage('RECEIVED', 'shipment-001')).toBe(false);
    expect(canUpdateUnenteredWarehousePackage('CONSOLIDATED')).toBe(false);
    expect(canUpdateUnenteredWarehousePackage('SHIPPED')).toBe(false);
    expect(canUpdateUnenteredWarehousePackage('TALLIED_ARCHIVED')).toBe(false);
  });
});
