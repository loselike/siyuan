import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { normalizeProblemTicketTagName, normalizeProblemTicketTagSnapshot } from './problem-ticket-tag.policy.js';

describe('problem ticket tag policy', () => {
  it('normalizes names without changing the existing length rule', () => {
    expect(normalizeProblemTicketTagName('  标签   名称  ')).toBe('标签 名称');
    expect(normalizeProblemTicketTagName('12345678901234567890')).toBe('12345678901234567890');
  });

  it.each([
    [undefined, '请填写标签名称'],
    [123, '请填写标签名称'],
    ['   ', '请填写标签名称'],
    ['123456789012345678901', '标签名称最多 20 个字符'],
    ['标签,名称', '标签名称不能包含逗号'],
    ['标签，名称', '标签名称不能包含逗号']
  ])('rejects invalid name %# with the existing message', (value, message) => {
    expect(() => normalizeProblemTicketTagName(value)).toThrow(new BadRequestException(message));
  });

  it('preserves missing and empty snapshot behavior', () => {
    expect(normalizeProblemTicketTagSnapshot(undefined)).toBeUndefined();
    expect(normalizeProblemTicketTagSnapshot([])).toBeUndefined();
  });

  it('normalizes and de-duplicates snapshots in first-seen order', () => {
    expect(normalizeProblemTicketTagSnapshot(['  标签   一  ', '标签二', '标签 一'])).toEqual(['标签 一', '标签二']);
  });

  it.each([
    ['不是数组', '常用标签格式不正确'],
    [Array.from({ length: 11 }, (_, index) => `标签${index + 1}`), '单个问题件最多选择 10 个常用标签'],
    [['标签,名称'], '标签名称不能包含逗号']
  ])('rejects invalid snapshot %# with the existing message', (value, message) => {
    expect(() => normalizeProblemTicketTagSnapshot(value)).toThrow(new BadRequestException(message));
  });
});
