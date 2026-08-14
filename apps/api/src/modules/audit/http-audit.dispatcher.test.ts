import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Principal } from '../rbac.js';
import { HttpAuditDispatcher } from './http-audit.dispatcher.js';
import type { HttpAuditWriter } from './http-audit.writer.js';

const principal = { id: 'u-1', role: 'ADMIN', username: 'admin' } as Principal;
const input = {
  id: 'audit-request-1',
  method: 'POST',
  path: '/api/warehouse/packages',
  result: 'SUCCESS' as const,
  durationMs: 12
};

describe('HttpAuditDispatcher', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not block the caller and retries a transient write failure', async () => {
    vi.useFakeTimers();
    const writer: HttpAuditWriter = {
      recordHttpAudit: vi.fn()
        .mockRejectedValueOnce(new Error('temporary unavailable'))
        .mockResolvedValueOnce(undefined)
    };
    const dispatcher = new HttpAuditDispatcher(writer);

    expect(dispatcher.enqueue(principal, input)).toBeUndefined();
    expect(writer.recordHttpAudit).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(100);
    expect(writer.recordHttpAudit).toHaveBeenCalledTimes(2);
    expect(writer.recordHttpAudit).toHaveBeenLastCalledWith(principal, input);
  });

  it('contains a persistent audit failure and emits a sanitized warning', async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const writer: HttpAuditWriter = {
      recordHttpAudit: vi.fn().mockRejectedValue(new Error('database password leaked here'))
    };
    const dispatcher = new HttpAuditDispatcher(writer);

    dispatcher.enqueue(principal, input);
    await vi.advanceTimersByTimeAsync(600);

    expect(writer.recordHttpAudit).toHaveBeenCalledTimes(3);
    expect(warn).toHaveBeenCalledWith('HTTP 审计后台写入持续失败，本次审计未落库');
    expect(warn.mock.calls.flat().join(' ')).not.toContain('database password');
  });

  it('reuses the same audit event id across retry attempts', async () => {
    vi.useFakeTimers();
    const receivedIds: string[] = [];
    const writer: HttpAuditWriter = {
      recordHttpAudit: vi.fn(async (_principal, event) => {
        receivedIds.push(event.id);
        if (receivedIds.length === 1) throw new Error('commit outcome unknown');
      })
    };
    const dispatcher = new HttpAuditDispatcher(writer);

    dispatcher.enqueue(principal, input);
    await vi.advanceTimersByTimeAsync(100);

    expect(receivedIds).toEqual(['audit-request-1', 'audit-request-1']);
  });
});
