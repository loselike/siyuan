import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Principal } from './rbac.js';
import { UserTablePreferenceController } from './user-table-preference.controller.js';
import {
  InMemoryUserTablePreferenceService,
  parseUserTablePreferenceKey,
  parseUserTablePreferenceValue,
  type UserTablePreferenceService
} from './user-table-preference.service.js';

const principal: Principal = { id: 'user-1', username: 'staff', role: 'UG_BUSINESS' };
const otherPrincipal: Principal = { id: 'user-2', username: 'other', role: 'UG_BUSINESS' };
const validKey = 'table.columns.0123456789abcdef';

describe('user table preference runtime input boundary', () => {
  it('keeps valid nested objects JSON-compatible and isolated from caller mutation', async () => {
    const input = { columns: ['code', 'status'], widths: { code: 120 }, hidden: false };
    const parsed = parseUserTablePreferenceValue(input);
    input.widths.code = 240;
    expect(parsed).toEqual({ columns: ['code', 'status'], widths: { code: 120 }, hidden: false });

    const service = new InMemoryUserTablePreferenceService();
    const saved = await service.upsert(principal, parseUserTablePreferenceKey(` ${validKey} `), parsed);
    expect(saved).toMatchObject({ key: validKey, value: parsed });
  });

  it.each([
    [undefined, '表格偏好内容必须是对象'],
    [null, '表格偏好内容必须是对象'],
    [[], '表格偏好内容必须是对象'],
    ['columns', '表格偏好内容必须是对象']
  ])('rejects the existing invalid value case %# with the existing message', (value, message) => {
    expect(() => parseUserTablePreferenceValue(value)).toThrowError(new BadRequestException(message));
  });

  it('keeps key and 64 KiB limits at the runtime boundary', () => {
    expect(() => parseUserTablePreferenceKey('table.columns.not-a-hash'))
      .toThrowError(new BadRequestException('表格偏好键无效'));
    expect(() => parseUserTablePreferenceValue({ value: 'x'.repeat(64 * 1024) }))
      .toThrowError(new BadRequestException('表格偏好内容过大'));
  });

  it('preserves the existing raw serialization error for cyclic input', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => parseUserTablePreferenceValue(cyclic)).toThrowError(TypeError);
  });

  it('parses before delegating and keeps the controller service contract unchanged', async () => {
    const upsert = vi.fn(async (_principal, key, value) => ({ key, value, updatedAt: '2026-08-14T00:00:00.000Z' }));
    const service = { upsert, list: vi.fn(), remove: vi.fn() } as unknown as UserTablePreferenceService;
    const controller = new UserTablePreferenceController(service);

    await expect(controller.upsert({ user: principal }, ` ${validKey} `, { value: { columns: ['code'] } }))
      .resolves.toMatchObject({ key: validKey, value: { columns: ['code'] } });
    expect(upsert).toHaveBeenCalledWith(principal, validKey, { columns: ['code'] });
    expect(() => controller.upsert({ user: principal }, validKey, {})).toThrowError(
      new BadRequestException('表格偏好内容必须是对象')
    );
  });

  it('keeps list, delete, and per-user isolation unchanged', async () => {
    const service = new InMemoryUserTablePreferenceService();
    await service.upsert(principal, validKey, { columns: ['code'] });
    await service.upsert(otherPrincipal, validKey, { columns: ['status'] });

    await expect(service.list(principal)).resolves.toEqual([
      expect.objectContaining({ key: validKey, value: { columns: ['code'] } })
    ]);
    await expect(service.remove(principal, validKey)).resolves.toEqual({ ok: true });
    await expect(service.list(principal)).resolves.toEqual([]);
    await expect(service.list(otherPrincipal)).resolves.toEqual([
      expect.objectContaining({ key: validKey, value: { columns: ['status'] } })
    ]);
  });
});
