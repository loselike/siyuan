import { describe, expect, it } from 'vitest';
import type { PermissionDefinition } from '../../apiClient';
import { getPermissionControls } from './rolePermissionPresentation';

describe('paid payment voucher permission presentation', () => {
  it('exposes payment-voucher deletion as an independent high-risk action', () => {
    const permissions: PermissionDefinition[] = [
      { code: 'finance:paid-payment:read', label: '查看', group: '财务管理 / 已付款' },
      { code: 'finance:paid-payment:voucher-view', label: '查看付款凭证', group: '财务管理 / 已付款' },
      { code: 'finance:paid-payment:voucher-upload', label: '上传付款凭证', group: '财务管理 / 已付款' },
      { code: 'finance:paid-payment:voucher-delete', label: '删除付款凭证', group: '财务管理 / 已付款' }
    ];

    expect(getPermissionControls('财务管理 / 已付款', permissions)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: '删除付款凭证',
        category: '高风险操作',
        risk: 'high',
        codes: ['finance:paid-payment:voucher-delete']
      })
    ]));
  });
});
