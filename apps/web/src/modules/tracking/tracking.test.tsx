import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { addRowsWorksheet, createWorkbook, writeWorkbookBuffer } from '../shared/excel';
import { renderAndLogin } from '../testSupport/appTestHarness';

describe('Tracking module', () => {
  it('opens 外部物流轨迹列表 on the tracking monitor page', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '物流轨迹管理' }));

    expect(await screen.findByRole('heading', { name: '轨迹监控中心' })).toBeInTheDocument();
    expect(screen.getAllByText('承运商任务').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /外部物流轨迹/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '手动添加轨迹' })).not.toBeInTheDocument();
    expect(screen.getAllByText('更新时间').length).toBeGreaterThan(0);
    expect(screen.getAllByText('最新物流轨迹').length).toBeGreaterThan(0);
    expect(screen.getAllByText('未更新天数').length).toBeGreaterThan(0);
    expect(screen.getByText('导入轨迹')).toBeInTheDocument();
  });

  it('previews and confirms 最新轨迹 Excel imports by 运单号 and 轨迹日期时间', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '物流轨迹管理' }));
    expect(await screen.findByRole('heading', { name: '轨迹监控中心' })).toBeInTheDocument();

    const workbook = createWorkbook();
    addRowsWorksheet(workbook, '手动轨迹', [
      ['出货单号', '轨迹日期时间', '地点', '轨迹信息'],
      ['SYGJ06061230001', '2026-05-20 12:52:11', '深圳', '已揽收'],
      ['SYGJ06061230001', '2026/05/21 09:00:00', '香港', '已签收'],
      ['MISS-TRACK-001', '2026-05-22 10:00:00', '上海', '未匹配轨迹'],
      ['SYGJ06061230002', '', '广州', '缺时间']
    ]);
    await user.upload(screen.getByLabelText('上传轨迹表'), new File([await writeWorkbookBuffer(workbook)], '手动轨迹导入.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }));

    expect(await screen.findByText('手动轨迹导入.xlsx')).toBeInTheDocument();
    expect(screen.getByText('原始行数 4')).toBeInTheDocument();
    expect(screen.getByText('可覆盖运单数 1')).toBeInTheDocument();
    expect(screen.getByText('未匹配 1')).toBeInTheDocument();
    expect(screen.getByText('错误行 1')).toBeInTheDocument();
    expect(screen.getByText('未匹配出货单号：MISS-TRACK-001')).toBeInTheDocument();
    expect(screen.getByText('缺少出货单号、轨迹日期时间或轨迹信息')).toBeInTheDocument();
    expect(screen.getAllByText('覆盖更新时间').length).toBeGreaterThan(0);
    expect(screen.getByText('已揽收（深圳）')).toBeInTheDocument();
    expect(screen.getAllByText('已签收（香港）').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: '确认导入' }));

    expect(await screen.findByText('已覆盖轨迹 1 票，未匹配 1 个单号，失败行 1 行')).toBeInTheDocument();
    const updatedRow = screen.getAllByRole('row').find(row =>
      within(row).queryByText('已签收（香港）') &&
      within(row).queryByText('香港') &&
      within(row).queryByRole('button', { name: '查看详情' })
    );
    expect(updatedRow).toBeTruthy();
    expect(within(updatedRow!).getByText('已签收（香港）')).toBeInTheDocument();
    expect(within(updatedRow!).getByText('香港')).toBeInTheDocument();
    expect(within(updatedRow!).getByText(/2026/)).toBeInTheDocument();
  });
});
