import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  APP_DATE_FORMAT,
  AppDatePicker,
  AppDateRangePicker,
  buildConfirmActionSummary,
  buildConfirmActionTitle,
  buildNoticeBarPresentation,
  cleanNoticeMessage,
  confirmDangerAction,
  createNoticeMessage,
  isAppDateRangeInvalid,
  isAppDateValue
} from './ui';

describe('notice presentation', () => {
  it('treats duplicate and conflict messages as red errors', () => {
    expect(buildNoticeBarPresentation('客户代码已存在')).toMatchObject({ type: 'error' });
    expect(buildNoticeBarPresentation('客户编码重复')).toMatchObject({ type: 'error' });
    expect(buildNoticeBarPresentation('保存冲突，请重新提交')).toMatchObject({ type: 'error' });
  });

  it('keeps completed actions green even when the follow-up instruction contains 必须', () => {
    expect(buildNoticeBarPresentation('已新建用户 chuhuo，该账号首次登录必须修改密码。')).toMatchObject({ type: 'success' });
    expect(buildNoticeBarPresentation('仓库出货权限已保存，RBAC 即时生效')).toMatchObject({ type: 'success' });
    expect(buildNoticeBarPresentation('导入成功 8 条，失败 1 条：客户编码重复')).toMatchObject({ type: 'warning' });
    expect(buildNoticeBarPresentation('已合票、已出库或已绑定运单的包裹不能直接修改')).toMatchObject({ type: 'error' });
  });

  it('keeps repeated notice events invisible to users', () => {
    const first = createNoticeMessage('客户代码已存在');
    const second = createNoticeMessage('客户代码已存在');

    expect(first).not.toBe(second);
    expect(cleanNoticeMessage(first ?? '')).toBe('客户代码已存在');
    expect(cleanNoticeMessage(second ?? '')).toBe('客户代码已存在');
  });

  it('hides nginx html errors from users', () => {
    expect(cleanNoticeMessage('<html><head><title>504 Gateway Time-out</title></head></html>')).toBe('服务暂不可用，请稍后重试');
    expect(cleanNoticeMessage('<html><head><title>502 Bad Gateway</title></head></html>')).toBe('服务暂不可用，请稍后重试');
  });

  it('date 日期 helpers keep YYYY-MM-DD and reject reversed ranges', () => {
    expect(APP_DATE_FORMAT).toBe('YYYY-MM-DD');
    expect(isAppDateValue('2026-07-09')).toBe(true);
    expect(isAppDateValue('2026-7-9')).toBe(false);
    expect(isAppDateRangeInvalid('2026-07-10', '2026-07-09')).toBe(true);
    expect(isAppDateRangeInvalid('2026-07-09', '2026-07-10')).toBe(false);
    expect(isAppDateRangeInvalid(undefined, '2026-07-10')).toBe(false);
  });

  it('date 日期 picker shows 清除 今天 确认 actions and confirms selected value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(createElement(AppDatePicker, { value: undefined, onChange }));

    await user.click(screen.getByPlaceholderText('年 / 月 / 日'));

    expect(await screen.findByText('清除')).toBeInTheDocument();
    expect(screen.getByText('今天')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /确\s*认/ })).toBeInTheDocument();

    await user.click(screen.getAllByText('15')[0]);
    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /确\s*认/ }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-15$/)));
  });

  it('date 日期 range picker shows 清除 今天 确认 actions', async () => {
    const user = userEvent.setup();
    render(createElement(AppDateRangePicker, { value: [undefined, undefined], onChange: vi.fn() }));

    await user.click(screen.getByPlaceholderText('开始日期'));

    await waitFor(() => expect(screen.getAllByText('清除').length).toBeGreaterThan(0));
    expect(screen.getAllByText('今天').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /确\s*认/ }).length).toBeGreaterThan(0);
  });

  it('confirm 确认 dangerous action includes status amount count and reason guard', async () => {
    const summary = buildConfirmActionSummary({
      objectName: 'SD20260709001',
      currentStatus: '未到账',
      nextStatus: '已作废',
      count: 1,
      amount: '100.00',
      currency: 'RMB',
      riskTip: '作废后不能继续匹配'
    });
    expect(buildConfirmActionTitle('作废')).toBe('确认作废？');
    expect(summary.map((item) => item.label)).toEqual(['操作对象', '状态变化', '影响数量', '财务金额', '风险提示']);
    expect(summary.find((item) => item.label === '财务金额')?.value).toBe('100.00 RMB');

    const confirm = vi.fn();
    const onConfirm = vi.fn();
    confirmDangerAction({
      actionName: '作废',
      objectName: 'SD20260709001',
      currentStatus: '未到账',
      nextStatus: '已作废',
      count: 1,
      amount: '100.00',
      currency: 'RMB',
      riskTip: '作废后不能继续匹配',
      requireReason: true,
      risk: 'danger',
      onConfirm,
      confirm
    });
    const options = confirm.mock.calls[0]?.[0];
    expect(options.title).toBe('确认作废？');
    expect(options.okText).toBe('确认作废');
    expect(options.cancelText).toBe('取消');
    expect(options.okButtonProps).toEqual({ danger: true });
    await expect(options.onOk()).rejects.toThrow('请填写操作原因');
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
