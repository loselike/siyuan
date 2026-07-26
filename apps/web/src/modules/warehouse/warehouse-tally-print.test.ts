import { describe, expect, it, vi } from 'vitest';
import type { WarehousePackageSummary, WarehouseTallyTaskSummary } from '@siyuan/shared';
import { createCode128Svg, createWarehouseTallyLabelHtml, printWarehouseTallyLabelHtml } from './warehouse-tally-print';

describe('warehouse tally label print', () => {
  it('renders a scanner-compatible Code 128 SVG and the package sequence', () => {
    const labelNo = '1399062202LH';
    const svg = createCode128Svg(labelNo);
    expect(svg).toContain('<svg');
    expect(svg).toContain('<rect');
    expect(svg.match(/<rect/g)?.length).toBeGreaterThan(20);

    const html = createWarehouseTallyLabelHtml({
      id: 'task-1',
      taskNo: labelNo,
      labelNo,
      packageCount: 8
    } as WarehouseTallyTaskSummary, [{
      id: 'package-5',
      labelNo,
      packageIndex: 5,
      expectedTotalPackageCount: 8,
      packageCount: 1
    } as WarehousePackageSummary]);
    expect(html).toContain(labelNo);
    expect(html).toContain('5 / 8');
    expect(html).toContain('1 件');
    expect(html).toContain('@page { size: 100mm 150mm');
  });

  it('closes the temporary print tab after printing or cancelling', () => {
    const printWindow = {
      document: { open: vi.fn(), write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
      print: vi.fn(),
      close: vi.fn(),
      closed: false,
      onafterprint: null as null | (() => void),
      setTimeout: (callback: () => void) => { callback(); return 1; }
    };

    expect(printWarehouseTallyLabelHtml('<html><body>label</body></html>', printWindow as unknown as Window)).toBe(true);
    expect(printWindow.print).toHaveBeenCalledOnce();
    expect(printWindow.onafterprint).toBeTypeOf('function');
    printWindow.onafterprint?.();
    expect(printWindow.close).toHaveBeenCalledOnce();
  });
});
