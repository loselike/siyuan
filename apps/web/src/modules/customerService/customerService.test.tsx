import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { employeeShipments, renderAndLogin } from '../testSupport/appTestHarness';

describe('Customer service waiting departure module', () => {
  it('shows customer service dashboard metrics and opens status pools', async () => {
    const user = userEvent.setup();
    const thisWeek = new Date().toISOString();
    employeeShipments.push(
      { ...employeeShipments[0], id: 's-new-customer-1', systemOrderNo: 'SYNEW001', customerCode: 'NEW001', customerName: '本周新客户', entryAt: thisWeek, createdAt: thisWeek, status: 'REVIEW_PENDING' },
      { ...employeeShipments[0], id: 's-new-customer-2', systemOrderNo: 'SYNEW001-02', customerCode: 'NEW001', customerName: '本周新客户', entryAt: thisWeek, createdAt: thisWeek, status: 'REVIEW_PENDING' }
    );
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '客服管理' }));

    expect(await screen.findByRole('button', { name: /本周新客户\s+1/ })).toBeInTheDocument();
    expect(await screen.findByText('本周异常件')).toBeInTheDocument();
    expect(screen.getByText('本周已离港')).toBeInTheDocument();
    expect(screen.getByText('本周已派送')).toBeInTheDocument();
    expect(screen.getByText('本周已签收')).toBeInTheDocument();
    expect(screen.getByText('未关闭问题件')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /已派送\s+1/ }));
    expect(await screen.findByRole('row', { name: /SYGJ06061239999/ })).toBeInTheDocument();
  });

  it('confirms outbound business data before transfer number', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '客服管理' }));
    await user.click(await screen.findByRole('button', { name: '数据确认' }));

    const confirmRow = await screen.findByRole('row', { name: /SYGJ06061230004/ });
    expect(within(confirmRow).getByText('美国')).toBeInTheDocument();
    expect(within(confirmRow).getAllByText('12.5')).toHaveLength(2);
    expect(within(confirmRow).getAllByText('是')).toHaveLength(2);

    await user.click(within(confirmRow).getByRole('button', { name: /详\s*情/ }));
    const detailDialog = await screen.findByRole('dialog', { name: '运单详情' });
    expect(within(detailDialog).getByText('SYGJ06061230004')).toBeInTheDocument();
    expect(within(detailDialog).getByText('美国')).toBeInTheDocument();
    expect(within(detailDialog).getByText('代理计费重')).toBeInTheDocument();
    expect(within(detailDialog).getAllByText('12.5').length).toBeGreaterThanOrEqual(2);
    await user.click(within(detailDialog).getByRole('button', { name: /关\s*闭/ }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '运单详情' })).not.toBeInTheDocument());

    await user.click(within(confirmRow).getByRole('button', { name: /确\s*认/ }));
    const dialog = await screen.findByRole('dialog', { name: '数据确认' });
    expect(within(dialog).getByDisplayValue('美国')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('2')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('12.5')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('备注'), '业务数据已核对');
    await user.click(within(dialog).getByRole('button', { name: /确\s*认/ }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '数据确认' })).not.toBeInTheDocument());
    expect(await screen.findByRole('row', { name: /SYGJ06061230004/ })).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: '转单号' }));
    const transferRow = await screen.findByRole('row', { name: /SYGJ06061230004/ });
    expect(within(transferRow).queryByRole('button', { name: '问题件' })).not.toBeInTheDocument();
    expect(within(transferRow).queryByRole('button', { name: '确认待离港' })).not.toBeInTheDocument();
    expect(within(transferRow).getByRole('button', { name: '上传面单' })).toBeInTheDocument();
    await user.click(within(transferRow).getByRole('button', { name: '修改转单号' }));
    const transferDialog = await screen.findByRole('dialog', { name: '修改转单号' });
    await user.type(within(transferDialog).getByLabelText('新转单号'), '1ZCONFIRM0606');
    await user.click(within(transferDialog).getByRole('button', { name: /确\s*认/ }));

    expect(await screen.findByRole('row', { name: /1ZCONFIRM0606/ })).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: '待离港' }));
    expect(await screen.findByRole('row', { name: /1ZCONFIRM0606/ })).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: '列设置' })).toBeInTheDocument();

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

  it('confirms departure and moves the shipment to departed', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '客服管理' }));
    expect(await screen.findByRole('heading', { name: '客服管理' })).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: '待离港' }));

    const waitingRow = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    await user.click(within(waitingRow).getByRole('button', { name: /^修\s*改$/ }));

    const dialog = await screen.findByRole('dialog', { name: '修改待离港' });
    await user.type(within(dialog).getByLabelText('ETD/ATD'), '2026-06-06T10:00');
    await user.type(within(dialog).getByLabelText('ETA/ATA'), '2026-06-16T10:00');
    await user.click(within(dialog).getByLabelText('查询网站对业务显示'));
    await user.click(within(dialog).getByRole('button', { name: /确\s*定/ }));

    const waitingRowAfterEdit = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    await user.click(within(waitingRowAfterEdit).getByRole('button', { name: '确认已离港' }));
    expect(await screen.findByText('确认到达已离港？')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认到达已离港' }));

    expect(await screen.findByRole('row', { name: /SYGJ05291344165/ })).toBeInTheDocument();
  });

  it('shows departed columns, edits tracking data, and moves the shipment to arrived port', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '客服管理' }));
    await user.click(await screen.findByRole('button', { name: '待离港' }));

    const waitingRow = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    await user.click(within(waitingRow).getByRole('button', { name: /^修\s*改$/ }));
    const departureDialog = await screen.findByRole('dialog', { name: '修改待离港' });
    await user.type(within(departureDialog).getByLabelText('ETD/ATD'), '2026-06-06T10:00');
    await user.type(within(departureDialog).getByLabelText('ETA/ATA'), '2026-06-16T10:00');
    await user.type(within(departureDialog).getByLabelText('查询网站'), 'https://track.example/9064656160');
    await user.click(within(departureDialog).getByRole('button', { name: /确\s*定/ }));

    const waitingRowAfterEdit = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    await user.click(within(waitingRowAfterEdit).getByRole('button', { name: '确认已离港' }));
    await user.click(await screen.findByRole('button', { name: '确认到达已离港' }));

    await waitFor(() => {
      expect(within(screen.getByRole('row', { name: /SYGJ05291344165/ })).getByRole('button', { name: '已到港' })).toBeInTheDocument();
    });
    const departedRow = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    expect(within(departedRow).getByText('已确认')).toBeInTheDocument();
    expect(await screen.findByText(/屏蔽：https:\/\/track\.example\/9064656160/)).toBeInTheDocument();
    expect(within(departedRow).getByText('admin')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '列设置' })).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: '转单号' }));
    const transferToolRow = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    await user.click(within(transferToolRow).getByRole('button', { name: '修改转单号' }));
    const transferToolDialog = await screen.findByRole('dialog', { name: '修改转单号' });
    await user.clear(within(transferToolDialog).getByLabelText('新转单号'));
    await user.type(within(transferToolDialog).getByLabelText('新转单号'), '1Z-DEPARTED-UPDATED');
    await user.click(within(transferToolDialog).getByRole('button', { name: /确\s*认/ }));
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
    await user.click(within(editedRow).getByRole('button', { name: '已到港' }));
    expect(await screen.findByText('确认到达已到港？')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认到达已到港' }));
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
      expect(within(screen.getByRole('row', { name: /SYGJ05291344165/ })).getByRole('button', { name: '已到港' })).toBeInTheDocument();
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

  it('shows arrived port shipments, edits tracking data, and moves them to delivery', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '客服管理' }));
    await user.click(await screen.findByRole('button', { name: '已到港' }));

    const arrivedRow = await screen.findByRole('row', { name: /SYGJ06061238888/ });
    expect(within(arrivedRow).getByText('已确认')).toBeInTheDocument();
    expect(await screen.findByText(/屏蔽：https:\/\/track\.example\/1ZARRIVED/)).toBeInTheDocument();
    expect(within(arrivedRow).getByText('admin')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '列设置' })).toBeInTheDocument();

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
    await user.click(within(deliveryRow).getByRole('button', { name: '已派送/提取' }));

    expect(await screen.findByRole('row', { name: /SYGJ06061238888/ })).toBeInTheDocument();
  });

  it('shows delivered shipments, signs them, and creates after-sale problems', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '客服管理' }));
    await user.click(await screen.findByRole('button', { name: '已派送' }));

    const deliveringRow = await screen.findByRole('row', { name: /SYGJ06061239999/ });
    expect(within(deliveringRow).getByText('已确认')).toBeInTheDocument();
    expect(await screen.findByText(/屏蔽：https:\/\/track\.example\/1ZDELIVERING/)).toBeInTheDocument();
    expect(within(deliveringRow).getByText('admin')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '列设置' })).toBeInTheDocument();

    await user.click(within(deliveringRow).getByRole('button', { name: '售后问题' }));
    const dialog = await screen.findByRole('dialog', { name: '创建问题件' });
    await user.click(within(dialog).getByLabelText('货物破损'));
    await user.type(within(dialog).getByLabelText('问题原因'), '外箱破损待业务跟进');
    await user.click(within(dialog).getByRole('button', { name: /确\s*定/ }));

    await user.click((await screen.findAllByRole('button', { name: '问题件' }))[0]);
    expect(await screen.findByText('货物破损；外箱破损待业务跟进')).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: '已派送' }));
    const signedRow = await screen.findByRole('row', { name: /SYGJ06061239999/ });
    await user.click(within(signedRow).getByRole('button', { name: '正常签收（归档）' }));

    const archivedRow = await screen.findByRole('row', { name: /SYGJ06061239999/ });
    await user.click(within(archivedRow).getByRole('button', { name: '问题件' }));
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

  it('updates transfer number and uploads a label file from waiting departure', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '客服管理' }));
    await user.click(await screen.findByRole('button', { name: '待离港' }));

    const waitingRow = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    await user.click(within(waitingRow).getByRole('button', { name: '修改转单号' }));
    const transferDialog = await screen.findByRole('dialog', { name: '修改转单号' });
    await user.clear(within(transferDialog).getByLabelText('新转单号'));
    await user.type(within(transferDialog).getByLabelText('新转单号'), '1Z-NEW-0606');
    await user.type(within(transferDialog).getByLabelText('分单号'), 'SUB-01');
    await user.click(within(transferDialog).getByRole('button', { name: /确\s*认/ }));

    expect(await screen.findByRole('row', { name: /1Z-NEW-0606/ })).toBeInTheDocument();

    const updatedRow = await screen.findByRole('row', { name: /SYGJ05291344165/ });
    await user.click(within(updatedRow).getByRole('button', { name: '上传面单' }));
    const uploadDialog = await screen.findByRole('dialog', { name: '面单上传' });
    await user.upload(within(uploadDialog).getByLabelText('选择面单文件'), new File(['label'], 'label.png', { type: 'image/png' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '面单上传' })).not.toBeInTheDocument());
  });
});
