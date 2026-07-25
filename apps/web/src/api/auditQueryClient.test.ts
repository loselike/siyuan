import type { AuditLogListResponse } from '@siyuan/shared';
import { describe, expect, it, vi } from 'vitest';
import { AuditQueryClient, type AuditQueryRequest } from './auditQueryClient';

describe('AuditQueryClient', () => {
  it('keeps login-log and account-event read paths unchanged', async () => {
    const request = vi.fn().mockResolvedValue([]) as AuditQueryRequest;
    const client = new AuditQueryClient(request);

    await client.loginLogs();
    await client.accountEvents();

    expect(request).toHaveBeenNthCalledWith(1, '/auth/login-logs');
    expect(request).toHaveBeenNthCalledWith(2, '/auth/account-events');
  });

  it('keeps audit-log query serialization and response passthrough unchanged', async () => {
    const response: AuditLogListResponse = {
      rows: [],
      suspiciousDeleteWarnings: [],
      pagination: { page: 2, pageSize: 50, totalItems: 0 }
    };
    const request = vi.fn().mockResolvedValue(response) as AuditQueryRequest;
    const client = new AuditQueryClient(request);

    await expect(client.auditLogs({
      operator: 'admin',
      module: 'system',
      action: 'staff.update',
      target: '',
      result: 'FAILED',
      startedAt: '2026-07-01T00:00:00.000Z',
      endedAt: undefined,
      page: 2,
      pageSize: 50
    })).resolves.toBe(response);

    expect(request).toHaveBeenCalledWith(
      '/system/audit-logs?operator=admin&module=system&action=staff.update&result=FAILED&startedAt=2026-07-01T00%3A00%3A00.000Z&page=2&pageSize=50'
    );
  });

  it('passes audit query errors through without changing their message', async () => {
    const request = vi.fn().mockRejectedValue(new Error('当前账号无权限查看操作日志')) as AuditQueryRequest;
    const client = new AuditQueryClient(request);

    await expect(client.auditLogs()).rejects.toThrow('当前账号无权限查看操作日志');
  });
});
