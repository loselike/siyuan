import { describe, expect, it } from 'vitest';
import { buildNoticeBarPresentation, cleanNoticeMessage, createNoticeMessage } from './ui';

describe('notice presentation', () => {
  it('treats duplicate and conflict messages as red errors', () => {
    expect(buildNoticeBarPresentation('客户代码已存在')).toMatchObject({ type: 'error' });
    expect(buildNoticeBarPresentation('客户编码重复')).toMatchObject({ type: 'error' });
    expect(buildNoticeBarPresentation('保存冲突，请重新提交')).toMatchObject({ type: 'error' });
  });

  it('keeps repeated notice events invisible to users', () => {
    const first = createNoticeMessage('客户代码已存在');
    const second = createNoticeMessage('客户代码已存在');

    expect(first).not.toBe(second);
    expect(cleanNoticeMessage(first ?? '')).toBe('客户代码已存在');
    expect(cleanNoticeMessage(second ?? '')).toBe('客户代码已存在');
  });
});
