import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { employeeShipments, renderAndLogin } from '../testSupport/appTestHarness';
import { CustomerServicePage } from './CustomerServicePage';

describe('Customer service waiting departure module', () => {
  it('客服账号可独立修改代理应付成本计费数量并提交新值', async () => {
    const user = userEvent.setup();
    const shipment = employeeShipments.find((row) => row.id === 's-confirm')!;
    const dataConfirmResponse = {
      rows: [{
        shipment,
        businessDataApproved: false,
        agentDataApproved: false,
        businessDataSnapshot: { packageCount: 2, weightKg: 12.5, volumeCbm: 0.08, chargeWeightKg: 12.5 },
        agentDataSnapshot: { packageCount: 2, weightKg: 21, volumeCbm: 0.08, chargeWeightKg: 21 }
      }],
      pagination: { page: 1, pageSize: 10, totalItems: 1 }
    };
    const payablePreview = {
      shipmentId: 's-confirm',
      rows: [{
        id: 'pf-confirm', type: 'PAYABLE' as const, name: '运费', amount: 672, currency: 'RMB', billingUnit: 'KG' as const,
        billingQuantity: 21, chargeWeightKg: 21, unitPrice: 32, reconciliationStatus: 'PENDING' as const, locked: false, selectable: true
      }, {
        id: 'pf-locked', type: 'PAYABLE' as const, name: '已锁定附加费', amount: 50, currency: 'RMB', billingUnit: 'KG' as const,
        billingQuantity: 1, chargeWeightKg: 1, unitPrice: 50, reconciliationStatus: 'CONFIRMED' as const, locked: true, selectable: false
      }, {
        id: 'pf-legacy', type: 'PAYABLE' as const, name: '历史应付费', amount: 99, currency: 'RMB', billingUnit: 'KG' as const,
        chargeWeightKg: undefined, unitPrice: undefined, reconciliationStatus: 'PENDING' as const, locked: false, selectable: true
      }]
    };
    let submittedBillingQuantity: number | undefined;
    const updateCustomerServiceFinanceItem = vi.fn(async (_shipmentId: string, _feeId: string, _kind: 'business' | 'agent', input: { billingQuantity: number }) => {
      submittedBillingQuantity = input.billingQuantity;
      return { ...payablePreview.rows[0], amount: input.billingQuantity * 32, billingQuantity: input.billingQuantity, chargeWeightKg: input.billingQuantity };
    });
    const apiClient = {
      customerServiceDataConfirmShipments: vi.fn(async () => dataConfirmResponse),
      customerServiceFinanceUpdatePreview: vi.fn(async () => payablePreview),
      updateCustomerServiceFinanceItem
    };

    render(<CustomerServicePage
      shipments={[]}
      problemTickets={[]}
      apiClient={apiClient as never}
      initialSection="dataConfirm"
      role="UG_CUSTOMER_SERVICE"
      permissions={[
        'customer-service:data-confirm:view',
        'customer-service:data-confirm:business-view',
        'customer-service:data-confirm:agent-view',
        'customer-service:data-confirm:agent-update'
      ]}
    />);

    const confirmRow = await screen.findByRole('row', { name: /OUT-CONFIRM/ });
    await user.click(within(confirmRow).getByRole('button', { name: '代理修改' }));

    const dialog = await screen.findByRole('dialog', { name: /代理数据修改/ });
    const quantityInput = await within(dialog).findByLabelText('应付成本计费数量-pf-confirm');
    expect(quantityInput).toBeEnabled();
    expect(within(dialog).getByLabelText('应付成本计费数量-pf-locked')).toBeDisabled();
    expect(within(dialog).getByText('99.00 RMB')).toBeInTheDocument();
    expect(quantityInput).toHaveValue('21.000');
    await user.clear(quantityInput);
    await user.type(quantityInput, '25');
    await user.click(within(dialog).getByRole('button', { name: '保存修改' }));

    await waitFor(() => expect(submittedBillingQuantity).toBe(25));
    expect(updateCustomerServiceFinanceItem).toHaveBeenCalledTimes(1);
    expect(updateCustomerServiceFinanceItem).toHaveBeenCalledWith('s-confirm', 'pf-confirm', 'agent', expect.objectContaining({ billingQuantity: 25 }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /代理数据修改/ })).not.toBeInTheDocument());
  });

  it('shows 待排货 between transfer and departure with read-only fee detail', async () => {
    const user = userEvent.setup();
    Object.assign(employeeShipments[0], {
      status: 'WAITING_SORT',
      businessReviewedAt: '2026-06-25T10:30:00.000Z',
      latestTracking: '业务员自审通过，进入待排货',
      routeCostTotal: 140,
      routeCurrency: 'RMB'
    });
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '客服管理' }));
    const transferButton = await screen.findByRole('button', { name: '转单号' });
    const pendingButton = await screen.findByRole('button', { name: '待排货' });
    const departureButton = await screen.findByRole('button', { name: '待离港' });
    expect(transferButton.compareDocumentPosition(pendingButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(pendingButton.compareDocumentPosition(departureButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(pendingButton);
    expect(await screen.findByRole('columnheader', { name: '业务成本' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '应付成本' })).toBeInTheDocument();

    const pendingRow = await screen.findByRole('row', { name: /SYGJ06061230001/ });
    expect(within(pendingRow).getByRole('button', { name: '查看费用' })).toBeInTheDocument();
    expect(within(pendingRow).getByText('只读')).toBeInTheDocument();
    expect(within(pendingRow).queryByRole('button', { name: '审核' })).not.toBeInTheDocument();
    expect(within(pendingRow).queryByRole('button', { name: '修改' })).not.toBeInTheDocument();
    expect(within(pendingRow).queryByRole('button', { name: '排货' })).not.toBeInTheDocument();
    expect(within(pendingRow).queryByRole('button', { name: '出库' })).not.toBeInTheDocument();
    expect(within(pendingRow).queryByText('代理成本')).not.toBeInTheDocument();
    expect(within(pendingRow).queryByText('140.00 RMB')).not.toBeInTheDocument();

    await user.click(within(pendingRow).getByRole('button', { name: '查看费用' }));
    const feeDialog = await screen.findByRole('dialog', { name: '费用明细' });
    expect(await within(feeDialog).findByText('基础运费')).toBeInTheDocument();
    expect(within(feeDialog).getByText('空运业务成本')).toBeInTheDocument();
    expect(within(feeDialog).getByText('应收合计：230.00 USD')).toBeInTheDocument();
    expect(within(feeDialog).getByText('业务成本合计：160.00 RMB')).toBeInTheDocument();
    expect(within(feeDialog).queryByText('代理运费')).not.toBeInTheDocument();
    expect(within(feeDialog).queryByText(/利润/)).not.toBeInTheDocument();
  });

  it('客服看板展示状态任务卡颜色并支持跳转', async () => {
    const user = userEvent.setup();
    const thisWeek = new Date().toISOString();
    employeeShipments.push(
      { ...employeeShipments[0], id: 's-new-customer-1', systemOrderNo: 'SYNEW001', customerCode: 'NEW001', customerName: '本周新客户', entryAt: thisWeek, createdAt: thisWeek, status: 'REVIEW_PENDING' },
      { ...employeeShipments[0], id: 's-new-customer-2', systemOrderNo: 'SYNEW001-02', customerCode: 'NEW001', customerName: '本周新客户', entryAt: thisWeek, createdAt: thisWeek, status: 'REVIEW_PENDING' }
    );
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '客服管理' }));

    expect(await screen.findByText('今日待处理')).toBeInTheDocument();
    expect(screen.getByText('运输流转')).toBeInTheDocument();
    expect(screen.getByText('异常与 SLA')).toBeInTheDocument();
    expect(screen.getByText('本周结果')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /数据确认.*1/ })).toHaveClass('customer-service-task-card-amber');
    expect(screen.getByRole('button', { name: /已派送.*1/ })).toHaveClass('customer-service-task-card-blue');
    expect(screen.getByRole('button', { name: /未关闭问题件/ })).toHaveClass('customer-service-task-card-red');
    expect(screen.getByRole('button', { name: /售后待处理.*0/ })).toHaveClass('customer-service-task-card-gray');
    expect(screen.getByRole('button', { name: /本周新客户.*1/ })).toHaveClass('customer-service-task-card-green');
    expect(await screen.findByText('本周异常件')).toBeInTheDocument();
    expect(screen.getByText('本周已签收')).toBeInTheDocument();
    expect(screen.getByText('未关闭问题件')).toBeInTheDocument();
    expect(screen.queryByText('代理成本')).not.toBeInTheDocument();
    expect(screen.queryByText('利润')).not.toBeInTheDocument();
    expect(screen.queryByText('应付合计')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /已派送.*1/ }));
    expect(await screen.findByRole('row', { name: /SYGJ06061239999/ })).toBeInTheDocument();
  });

  it('confirms outbound business data and 数据确认列设置 before transfer number', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '客服管理' }));
    await user.click(await screen.findByRole('button', { name: '数据确认' }));

    const confirmRow = await screen.findByRole('row', { name: /SYGJ06061230004/ });
    expect(within(confirmRow).getByText('美国')).toBeInTheDocument();
    expect(within(confirmRow).getAllByText('12.5').length).toBeGreaterThanOrEqual(1);
    expect(within(confirmRow).getAllByText('是').length).toBeGreaterThanOrEqual(1);

    await user.click(screen.getByRole('button', { name: '列设置' }));
    const columnDialog = await screen.findByRole('dialog', { name: '数据确认列设置' });
    expect(within(columnDialog).getByLabelText('品名')).toBeInTheDocument();
    await user.click(within(columnDialog).getByLabelText('品名'));
    expect(screen.queryByRole('columnheader', { name: '品名' })).not.toBeInTheDocument();
    await user.click(within(columnDialog).getAllByRole('button', { name: /下\s*移/ })[0]);
    await user.click(within(columnDialog).getByRole('button', { name: '恢复默认' }));
    expect(screen.getByRole('columnheader', { name: '品名' })).toBeInTheDocument();
    await user.click(within(columnDialog).getByRole('button', { name: /完\s*成/ }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '数据确认列设置' })).not.toBeInTheDocument());
    const resizeHandle = screen.getByTestId('column-resize-handle-outboundAt');
    fireEvent.mouseDown(resizeHandle, { clientX: 180 });
    fireEvent.mouseMove(window, { clientX: 240 });
    fireEvent.mouseUp(window);
    await waitFor(() => {
      const widths = JSON.parse(window.localStorage.getItem('sunny.customer-service.dataConfirm.columns:widths') ?? '{}') as Record<string, number>;
      expect(widths.outboundAt).toBeGreaterThan(170);
    });

    await user.click(within(confirmRow).getByRole('button', { name: /详\s*情/ }));
    const detailDialog = await screen.findByRole('dialog', { name: '运单详情' });
    expect(within(detailDialog).getByText('SYGJ06061230004')).toBeInTheDocument();
    expect(within(detailDialog).getByText('美国')).toBeInTheDocument();
    expect(within(detailDialog).getByText('代理计费重')).toBeInTheDocument();
    expect(within(detailDialog).getAllByText('12.5').length).toBeGreaterThanOrEqual(2);
    await user.click(within(detailDialog).getByRole('button', { name: /关\s*闭/ }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '运单详情' })).not.toBeInTheDocument());

    await user.click(within(confirmRow).getByRole('button', { name: '全部审核' }));
    const dialog = await screen.findByRole('dialog', { name: '全部审核' });
    expect(within(dialog).getByDisplayValue('美国')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('2')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('12.5')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('备注'), '业务数据已核对');
    await user.click(within(dialog).getByRole('button', { name: '全部审核' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '全部审核' })).not.toBeInTheDocument());
    expect(screen.getByText('数据确认')).toBeInTheDocument();
  });

  it('shows problem categories, filters, and handles problem actions', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '客服管理' }));
    await user.click((await screen.findAllByRole('button', { name: '问题件' }))[0]);

    expect(await screen.findByRole('button', { name: /全部\s+1/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /离港前问题件\s+1/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /到港问题件\s+0/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /派送问题件\s+0/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /售后\s+0/ })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '列设置' }).length).toBeGreaterThan(0);

    const row = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    expect(within(row).getByText('离港前问题件')).toBeInTheDocument();
    expect(within(row).getByText(/^\d+天$/)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('客户编号'), '1344');
    expect(await screen.findByRole('row', { name: /SYGJ05291344165/ })).toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText('客户编号'));
    await user.type(screen.getByPlaceholderText('目的地'), 'NO_MATCH');
    await waitFor(() => expect(screen.queryByRole('row', { name: /SYGJ05291344165/ })).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /重\s*置/ }));

    const visibleRow = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    await user.click(within(visibleRow).getByRole('button', { name: '问题件需协助' }));
    expect(await screen.findByText('确认标记需协助？')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认需协助' }));
    expect(await screen.findByText('2026-06-06 20:00:00')).toBeInTheDocument();
    const assistedRow = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    await user.click(within(assistedRow).getByRole('button', { name: '问题件已经解决' }));
    const closedRow = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    await waitFor(() => expect(within(closedRow).getByRole('button', { name: '问题件已经解决' })).toBeDisabled());
  });

  it('确认离港增加批注后自动切到已离港并展示该运单', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '客服管理' }));
    expect(await screen.findByRole('heading', { name: '客服管理' })).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: '待离港' }));

    const waitingRow = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    expect(screen.getByRole('columnheader', { name: 'ETD/ATD' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'ETA/ATA' })).toBeInTheDocument();
    await user.click(within(waitingRow).getByRole('button', { name: /^修\s*改$/ }));

    const dialog = await screen.findByRole('dialog', { name: '修改信息' });
    await user.type(within(dialog).getByLabelText('ETD/ATD'), '2026-06-06T10:00');
    await user.type(within(dialog).getByLabelText('ETA/ATA'), '2026-06-16T10:00');
    await user.click(within(dialog).getByLabelText('查询网站对业务显示'));
    await user.click(within(dialog).getByRole('button', { name: /确\s*定/ }));

    const waitingRowAfterEdit = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    expect(within(waitingRowAfterEdit).getByText('2026-06-06 10:00:00')).toBeInTheDocument();
    expect(within(waitingRowAfterEdit).getByText('2026-06-16 10:00:00')).toBeInTheDocument();
    await user.click(within(waitingRowAfterEdit).getByRole('button', { name: '确认离港/增加批注' }));
    const statusDialog = await screen.findByRole('dialog', { name: '确认离港/增加批注' });
    await user.type(within(statusDialog).getByLabelText('批注'), '离港前已核对 ETA');
    await user.click(within(statusDialog).getByRole('button', { name: '确认离港' }));

    await waitFor(() => {
      expect(within(screen.getByRole('row', { name: /SYGJ05291344165/ })).getByRole('button', { name: '确认到港/增加批注' })).toBeInTheDocument();
    });
    expect(await screen.findByRole('row', { name: /SYGJ05291344165/ })).toBeInTheDocument();
  });

  it('shows a clear ETA/ETD error when confirming departure before editing times', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '客服管理' }));
    await user.click(await screen.findByRole('button', { name: '待离港' }));

    const waitingRow = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    await user.click(within(waitingRow).getByRole('button', { name: '确认离港/增加批注' }));

    expect(await screen.findByText('确认离港前请先填写 ETD/ATD 和 ETA/ATA')).toBeInTheDocument();
    expect(await screen.findByRole('row', { name: /SYGJ05291344165/ })).toBeInTheDocument();
  });

  it('确认到港增加批注后进入已到港', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '客服管理' }));
    await user.click(await screen.findByRole('button', { name: '待离港' }));

    const waitingRow = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    await user.click(within(waitingRow).getByRole('button', { name: /^修\s*改$/ }));
    const departureDialog = await screen.findByRole('dialog', { name: '修改信息' });
    await user.type(within(departureDialog).getByLabelText('ETD/ATD'), '2026-06-06T10:00');
    await user.type(within(departureDialog).getByLabelText('ETA/ATA'), '2026-06-16T10:00');
    await user.clear(within(departureDialog).getByLabelText('查询网站'));
    await user.type(within(departureDialog).getByLabelText('查询网站'), 'https://track.example/9064656160');
    await user.click(within(departureDialog).getByRole('button', { name: /确\s*定/ }));

    const waitingRowAfterEdit = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    await user.click(within(waitingRowAfterEdit).getByRole('button', { name: '确认离港/增加批注' }));
    const confirmDialog = await screen.findByRole('dialog', { name: '确认离港/增加批注' });
    await user.type(within(confirmDialog).getByLabelText('批注'), '离港已确认');
    await user.click(within(confirmDialog).getByRole('button', { name: '确认离港' }));

    await waitFor(() => {
      expect(within(screen.getByRole('row', { name: /SYGJ05291344165/ })).getByRole('button', { name: '确认到港/增加批注' })).toBeInTheDocument();
    });
    const departedRow = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    expect(within(departedRow).getByText('已确认')).toBeInTheDocument();
    expect(await screen.findByText(/屏蔽：https:\/\/track\.example\/9064656160/)).toBeInTheDocument();
    expect(within(departedRow).getByText('admin')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '列设置' }).length).toBeGreaterThan(0);

    await user.click(await screen.findByRole('button', { name: '转单号' }));
    const transferToolRow = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    await user.click(within(transferToolRow).getByRole('button', { name: /^修\s*改$/ }));
    const transferToolDialog = await screen.findByRole('dialog', { name: '修改信息' });
    await user.clear(within(transferToolDialog).getByLabelText('新转单号'));
    await user.type(within(transferToolDialog).getByLabelText('新转单号'), '1Z-DEPARTED-UPDATED');
    await user.click(within(transferToolDialog).getByRole('button', { name: /确\s*定/ }));
    expect(await screen.findByRole('row', { name: /1Z-DEPARTED-UPDATED/ })).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: '已离港' }));
    expect(await screen.findByRole('row', { name: /1Z-DEPARTED-UPDATED/ })).toBeInTheDocument();

    const departedRowAfterTransfer = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    await user.click(within(departedRowAfterTransfer).getByRole('button', { name: /^修\s*改$/ }));
    const editDialog = await screen.findByRole('dialog');
    await user.clear(within(editDialog).getByLabelText('查询网站'));
    await user.type(within(editDialog).getByLabelText('查询网站'), 'https://track.example/updated');
    await user.click(within(editDialog).getByLabelText('查询网站对业务显示'));
    await user.click(within(editDialog).getByRole('button', { name: /确\s*定/ }));
    expect(await screen.findByText('https://track.example/updated')).toBeInTheDocument();

    const editedRow = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    await user.click(within(editedRow).getByRole('button', { name: '确认到港/增加批注' }));
    await user.click(within(await screen.findByRole('dialog', { name: '确认到港/增加批注' })).getByRole('button', { name: '确认到港' }));
    expect(await screen.findByRole('row', { name: /SYGJ05291344165/ })).toBeInTheDocument();
  });

  it('creates a departed problem ticket with destination port tags', async () => {
    const user = userEvent.setup();
    const targetShipment = employeeShipments.find((item) => item.id === 's-2');
    if (targetShipment) {
      Object.assign(targetShipment, {
        status: 'DEPARTED',
        latestTracking: '已离港',
        etdAt: '2026-06-06T10:00:00.000Z',
        etaAt: '2026-06-16T10:00:00.000Z'
      });
    }
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '客服管理' }));
    await user.click(await screen.findByRole('button', { name: '已离港' }));
    await waitFor(() => {
      expect(within(screen.getByRole('row', { name: /SYGJ05291344165/ })).getByRole('button', { name: '确认到港/增加批注' })).toBeInTheDocument();
    });
    const departedRow = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    await user.click(within(departedRow).getByRole('button', { name: '问题件' }));
    const dialog = await screen.findByRole('dialog', { name: '创建问题件' });
    await user.click(within(dialog).getByLabelText('目的港运港查验'));
    await user.type(within(dialog).getByLabelText('问题原因'), '码头等待放行');
    await user.click(within(dialog).getByRole('button', { name: /确\s*定/ }));

    await user.click((await screen.findAllByRole('button', { name: '问题件' }))[0]);
    expect(await screen.findByText('目的港运港查验；码头等待放行')).toBeInTheDocument();
  });

  it('确认派送增加批注后进入已派送', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '客服管理' }));
    await user.click(await screen.findByRole('button', { name: '已到港' }));

    const arrivedRow = await screen.findByRole('row', { name: /SYGJ06061238888/ });
    expect(within(arrivedRow).getByText('已确认')).toBeInTheDocument();
    expect(await screen.findByText(/屏蔽：https:\/\/track\.example\/1ZARRIVED/)).toBeInTheDocument();
    expect(within(arrivedRow).getByText('admin')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '列设置' }).length).toBeGreaterThan(0);

    await user.click(within(arrivedRow).getByRole('button', { name: /^修\s*改$/ }));
    const editDialog = await screen.findByRole('dialog');
    await user.clear(within(editDialog).getByLabelText('查询网站'));
    await user.type(within(editDialog).getByLabelText('查询网站'), 'https://track.example/arrived-updated');
    await user.click(within(editDialog).getByLabelText('查询网站对业务显示'));
    await user.click(within(editDialog).getByRole('button', { name: /确\s*定/ }));
    expect(await screen.findByText('https://track.example/arrived-updated')).toBeInTheDocument();

    const editedArrivedRow = await screen.findByRole('row', { name: /SYGJ06061238888/ });
    await user.click(within(editedArrivedRow).getByRole('button', { name: '问题件' }));
    const dialog = await screen.findByRole('dialog', { name: '创建问题件' });
    await user.click(within(dialog).getByLabelText('联系不上收货人'));
    await user.type(within(dialog).getByLabelText('问题原因'), '电话无人接听');
    await user.click(within(dialog).getByRole('button', { name: /确\s*定/ }));

    await user.click((await screen.findAllByRole('button', { name: '问题件' }))[0]);
    expect(await screen.findByText('联系不上收货人；电话无人接听')).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: '已到港' }));
    const deliveryRow = await screen.findByRole('row', { name: /SYGJ06061238888/ });
    await user.click(within(deliveryRow).getByRole('button', { name: '确认派送/增加批注' }));
    await user.click(within(await screen.findByRole('dialog', { name: '确认派送/增加批注' })).getByRole('button', { name: '确认派送' }));

    expect(await screen.findByRole('row', { name: /SYGJ06061238888/ })).toBeInTheDocument();
  });

  it('确认签收增加批注后进入已签收，已签收可继续增加批注', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '客服管理' }));
    await user.click(await screen.findByRole('button', { name: '已派送' }));

    const deliveringRow = await screen.findByRole('row', { name: /SYGJ06061239999/ });
    expect(within(deliveringRow).getByText('已确认')).toBeInTheDocument();
    expect(await screen.findByText(/屏蔽：https:\/\/track\.example\/1ZDELIVERING/)).toBeInTheDocument();
    expect(within(deliveringRow).getByText('admin')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '列设置' }).length).toBeGreaterThan(0);

    await user.click(within(deliveringRow).getByRole('button', { name: '售后问题' }));
    const dialog = await screen.findByRole('dialog', { name: '创建问题件' });
    await user.click(within(dialog).getByLabelText('货物破损'));
    await user.type(within(dialog).getByLabelText('问题原因'), '外箱破损待业务跟进');
    await user.click(within(dialog).getByRole('button', { name: /确\s*定/ }));

    await user.click((await screen.findAllByRole('button', { name: '问题件' }))[0]);
    expect(await screen.findByText('货物破损；外箱破损待业务跟进')).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: '已派送' }));
    const signedRow = await screen.findByRole('row', { name: /SYGJ06061239999/ });
    await user.click(within(signedRow).getByRole('button', { name: '确认签收/增加批注' }));
    await user.click(within(await screen.findByRole('dialog', { name: '确认签收/增加批注' })).getByRole('button', { name: '确认签收' }));

    const archivedRow = await screen.findByRole('row', { name: /SYGJ06061239999/ });
    await user.click(within(archivedRow).getByRole('button', { name: '增加批注' }));
    const remarkDialog = await screen.findByRole('dialog', { name: '增加批注' });
    await user.click(within(remarkDialog).getByRole('button', { name: '保存批注' }));
    expect(await screen.findByRole('row', { name: /SYGJ06061239999/ })).toBeInTheDocument();
    const archivedRowAfterRemark = await screen.findByRole('row', { name: /SYGJ06061239999/ });
    await user.click(within(archivedRowAfterRemark).getByRole('button', { name: '问题件' }));
    const signedProblemDialog = await screen.findByRole('dialog', { name: '创建问题件' });
    await user.click(within(signedProblemDialog).getByLabelText('货物丢失'));
    await user.click(within(signedProblemDialog).getByRole('button', { name: /确\s*定/ }));

    expect(await screen.findByRole('button', { name: /售后\s+1/ })).toHaveClass('ant-btn-primary');
    expect(await screen.findByText('货物丢失')).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: '售后' }));
    const afterSaleRow = await screen.findByRole('row', { name: /SYGJ06061239999/ });
    expect(within(afterSaleRow).getByText('需赔付')).toBeInTheDocument();
    expect(within(afterSaleRow).getByRole('button', { name: '问题件需协助' })).toBeInTheDocument();

    await user.click(within(afterSaleRow).getByRole('button', { name: '问题件需协助' }));
    expect(await screen.findByText('确认标记需协助？')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认需协助' }));
    await waitFor(() => {
      expect(within(screen.getByRole('row', { name: /SYGJ06061239999/ })).getByText('需协助')).toBeInTheDocument();
    });

    await user.click(within(screen.getByRole('row', { name: /SYGJ06061239999/ })).getByRole('button', { name: '问题件已经解决' }));
    await waitFor(() => {
      expect(within(screen.getByRole('row', { name: /SYGJ06061239999/ })).getByText('已解决')).toBeInTheDocument();
    });
  });

  it('creates a problem ticket from waiting departure with tags and handwritten reason', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '客服管理' }));
    await user.click(await screen.findByRole('button', { name: '待离港' }));

    const waitingRow = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    await user.click(within(waitingRow).getByRole('button', { name: '问题件' }));

    const dialog = await screen.findByRole('dialog', { name: '创建问题件' });
    await user.click(within(dialog).getByLabelText('数据不对'));
    await user.type(within(dialog).getByLabelText('问题原因'), '客户反馈重量异常');
    await user.click(within(dialog).getByRole('button', { name: /确\s*定/ }));

    await user.click((await screen.findAllByRole('button', { name: '问题件' }))[0]);
    expect(await screen.findByText('数据不对；客户反馈重量异常')).toBeInTheDocument();
  });

  it('统一修改入口保留修改转单号字段并上传面单', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '客服管理' }));
    await user.click(await screen.findByRole('button', { name: '待离港' }));
    const fetchMock = vi.mocked(fetch);

    const waitingRow = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    expect(within(waitingRow).getAllByRole('button', { name: /^修\s*改$/ })).toHaveLength(1);
    expect(within(waitingRow).queryByRole('button', { name: '修改转单号' })).not.toBeInTheDocument();
    await user.click(within(waitingRow).getByRole('button', { name: /^修\s*改$/ }));
    const transferDialog = await screen.findByRole('dialog', { name: '修改信息' });
    expect(within(transferDialog).getByText('基础信息')).toBeInTheDocument();
    expect(within(transferDialog).getByText('转单信息')).toBeInTheDocument();
    expect(within(transferDialog).getByText('轨迹信息')).toBeInTheDocument();
    expect(within(transferDialog).getByText('同步选项')).toBeInTheDocument();
    expect(within(transferDialog).getByLabelText('ETD/ATD')).toBeInTheDocument();
    expect(within(transferDialog).getByLabelText('ETA/ATA')).toBeInTheDocument();
    expect(within(transferDialog).getByLabelText('查询网站')).toBeInTheDocument();
    expect(within(transferDialog).getByLabelText('查询网站')).toHaveValue('https://agent-track.example.com?no=9064656160');
    expect(within(transferDialog).getByLabelText('分单号')).toBeInTheDocument();
    expect(within(transferDialog).getByLabelText('是否推送业务')).toBeInTheDocument();
    await user.clear(within(transferDialog).getByLabelText('新转单号'));
    await user.type(within(transferDialog).getByLabelText('新转单号'), '1Z-NEW-0606');
    await user.type(within(transferDialog).getByLabelText('分单号'), 'SUB-01');
    await user.type(within(transferDialog).getByLabelText('ETD/ATD'), '2026-06-06T10:00');
    await user.type(within(transferDialog).getByLabelText('ETA/ATA'), '2026-06-16T10:00');
    await user.clear(within(transferDialog).getByLabelText('查询网站'));
    await user.type(within(transferDialog).getByLabelText('查询网站'), 'https://track.example/unified');
    await user.click(within(transferDialog).getByRole('button', { name: /确\s*定/ }));

    expect(await screen.findByRole('row', { name: /1Z-NEW-0606/ })).toBeInTheDocument();

    const updatedRow = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    await user.click(within(updatedRow).getByRole('button', { name: '上传面单' }));
    const uploadDialog = await screen.findByRole('dialog', { name: '面单上传' });
    const uploadCallsBeforeSelect = fetchMock.mock.calls.filter(([url]) => String(url).includes('/labels/upload')).length;
    const dropzone = within(uploadDialog).getByText(/添加文件/).closest('[role="button"]');
    expect(dropzone).toBeTruthy();

    fireEvent.paste(dropzone as HTMLElement, {
      clipboardData: {
        files: [new File(['paste-label'], 'paste-label.png', { type: 'image/png' })]
      }
    });
    expect(within(uploadDialog).getByText('paste-label.png')).toBeInTheDocument();
    expect(within(uploadDialog).getByRole('button', { name: '确认上传' })).toBeEnabled();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/labels/upload'))).toHaveLength(uploadCallsBeforeSelect);

    await user.click(within(uploadDialog).getByRole('button', { name: /修\s*改/ }));
    await user.upload(within(uploadDialog).getByLabelText('选择面单文件'), new File(['label'], 'label-replace.pdf', { type: 'application/pdf' }));
    expect(within(uploadDialog).getByText('label-replace.pdf')).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/labels/upload'))).toHaveLength(uploadCallsBeforeSelect);

    await user.click(within(uploadDialog).getByRole('button', { name: '确认上传' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '面单上传' })).not.toBeInTheDocument());
    expect((await screen.findAllByText('已上传面单')).length).toBeGreaterThan(0);

    const labelRow = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    await user.click(within(labelRow).getByRole('button', { name: '查看面单' }));
    const viewDialog = await screen.findByRole('dialog', { name: '面单上传' });
    expect(within(viewDialog).getByText('当前面单')).toBeInTheDocument();
    expect(within(viewDialog).getByText(/label-replace\.pdf|UPL260606/)).toBeInTheDocument();
    expect(within(viewDialog).getAllByRole('link', { name: '查看/下载' })[0]).toHaveAttribute('href', expect.stringContaining('/api/uploads/labels/label-replace.pdf'));
    expect(within(viewDialog).getByRole('button', { name: '修改/替换面单' })).toBeInTheDocument();
  });
});
