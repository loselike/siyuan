import { describe, expect, it } from 'vitest';
import { canUpdateUnenteredWarehousePackage } from './warehouse-package-editability.js';

describe('canUpdateUnenteredWarehousePackage', () => {
  it('allows an unentered package in the normal in-stock state', () => {
    expect(canUpdateUnenteredWarehousePackage('RECEIVED')).toBe(true);
  });

  it('keeps order-entered and non-in-stock packages locked', () => {
    expect(canUpdateUnenteredWarehousePackage('RECEIVED', 'shipment-001')).toBe(false);
    expect(canUpdateUnenteredWarehousePackage('CONSOLIDATED')).toBe(false);
    expect(canUpdateUnenteredWarehousePackage('SHIPPED')).toBe(false);
    expect(canUpdateUnenteredWarehousePackage('TALLIED_ARCHIVED')).toBe(false);
  });
});
