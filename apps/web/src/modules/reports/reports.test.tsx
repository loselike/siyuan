import type { BusinessCostAuditSummary, PayableAuditSummary, ReceivableAuditSummary } from '@siyuan/shared';
import { Button } from 'antd';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useMemo, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ModuleSubNavContext, type SidebarSubNavState } from '../shared/ModuleSubWorkspace';
import { renderAndLogin, shipment } from '../testSupport/appTestHarness';
import { ReportsPage } from './ReportsPage';

function ReportsPageHarness({ children }: { children: ReactNode }) {
  const [subNav, setSubNav] = useState<SidebarSubNavState | null>(null);
  const value = useMemo(
    () => ({
      parentKey: 'reports',
      register: (state: Omit<SidebarSubNavState, 'parentKey' | 'signature'>) => {
        setSubNav({
          parentKey: 'reports',
          signature: state.items.map((item) => item.key).join('|'),
          ...state
        });
      },
      clear: () => setSubNav(null)
    }),
    []
  );

  return (
    <ModuleSubNavContext.Provider value={value}>
      {subNav ? (
        <div>
          {subNav.items.map((item) => (
            <Button key={item.key} onClick={() => subNav.onChange(item.key)}>
              {item.label}
            </Button>
          ))}
        </div>
      ) : null}
      {children}
    </ModuleSubNavContext.Provider>
  );
}

describe('Reports module', () => {
  it('keeps reports out of the staff main menu after the IA consolidation', async () => {
    await renderAndLogin('admin', 'admin123');

    expect(await screen.findByRole('menuitem', { name: '财务管理' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '统计报表' })).not.toBeInTheDocument();
  });

  it('renders real operations, warehouse, and finance reports and exports current data', async () => {
    const user = userEvent.setup();
    const today = new Date().toISOString();
    const createObjectURL = vi.fn(() => 'blob:test-report');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const shipments = [
      shipment('report-1', 'SYS-001', 'CUST-001', 'OUTBOUNDED', '客户A', {
        businessType: 'DEDICATED_LINE',
        outboundAt: today,
        sensitive: true,
        declarationRequired: true
      }),
      shipment('report-2', 'SYS-002', 'CUST-002', 'WAITING_DISPATCH', '客户B', {
        businessType: 'DEDICATED_LINE',
        shippingMarkRequired: true,
        businessInvoiceUploadedAt: today
      }),
      shipment('report-3', 'SYS-003', 'CUST-003', 'REVIEW_PENDING', '客户C', {
        businessType: 'EXPRESS',
        hasProblemTicket: true
      })
    ];
    const receivables: ReceivableAuditSummary[] = [
      {
        id: 'recv-1',
        shipmentId: 'report-1',
        systemOrderNo: 'SYS-001',
        customerName: '客户A',
        customerCode: 'C001',
        name: '运费',
        amount: 150,
        settled: false,
        currency: 'RMB',
        rmbAmount: 150,
        reconciliationStatus: 'PENDING'
      }
    ];
    const businessCosts: BusinessCostAuditSummary[] = [
      {
        id: 'cost-1',
        shipmentId: 'report-1',
        systemOrderNo: 'SYS-001',
        customerCode: 'C001',
        customerName: '客户A',
        name: '出货成本',
        amount: 100,
        settled: false,
        currency: 'RMB',
        rmbAmount: 100,
        reconciliationStatus: 'CONFIRMED',
        businessProfit: 50,
        receivableTotal: 150,
        businessCostTotal: 100
      }
    ];
    const payables: PayableAuditSummary[] = [
      {
        id: 'pay-1',
        shipmentId: 'report-1',
        systemOrderNo: 'SYS-001',
        customerCode: 'C001',
        customerName: '客户A',
        name: '代理成本',
        amount: 80,
        settled: false,
        currency: 'RMB',
        rmbAmount: 80,
        reconciliationStatus: 'LOCKED',
        payableTotal: 80,
        canViewProfit: true,
        operationProfit: 70
      }
    ];

    render(
      <ReportsPageHarness>
        <ReportsPage
          config={{
            title: '统计报表中心',
            description: '实时报表',
            capabilities: ['运营报表', '仓库报表', '财务报表'],
            aiEnhancements: ['日报摘要'],
            siliconFlowScenarios: ['识别异常']
          }}
          shipments={shipments}
          receivables={receivables}
          businessCostAudits={businessCosts}
          payableAudits={payables}
          notice={null}
          onAiAssist={vi.fn().mockResolvedValue(undefined)}
          aiLoading={false}
        />
      </ReportsPageHarness>
    );

    expect(screen.getByText('今日出货')).toBeInTheDocument();
    expect(screen.getByText('待仓库出货')).toBeInTheDocument();
    expect(screen.getByText('专线')).toBeInTheDocument();
    expect(screen.getByText('快递')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '仓库报表' }));
    expect(screen.getByText('待出库')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '已传业务发票' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '财务报表' }));
    expect(screen.getByText('应收')).toBeInTheDocument();
    expect(screen.getByText('业务成本')).toBeInTheDocument();
    expect(screen.getByText('应付')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '导出当前报表' }));
    expect(createObjectURL).toHaveBeenCalled();
    expect(anchorClick).toHaveBeenCalled();

    anchorClick.mockRestore();
  });
});
