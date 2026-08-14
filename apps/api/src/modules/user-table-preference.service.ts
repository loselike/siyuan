import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Principal } from './rbac.js';
import { PrismaService } from './prisma.service.js';

export type UserTablePreferenceValue = Record<string, unknown>;

export type UserTablePreferenceSummary = {
  key: string;
  value: UserTablePreferenceValue;
  updatedAt: string;
};

const preferenceKeyPattern = /^table\.(?:columns|widths|view|legacy)\.[a-f0-9]{16}$/;
const maxPreferenceKeyLength = 240;
const maxPreferenceValueBytes = 64 * 1024;
const maxPreferencesPerUser = 500;

export abstract class UserTablePreferenceService {
  abstract list(principal: Principal): Promise<UserTablePreferenceSummary[]>;
  abstract upsert(principal: Principal, key: string, value: unknown): Promise<UserTablePreferenceSummary>;
  abstract remove(principal: Principal, key: string): Promise<{ ok: true }>;
}

export function parseUserTablePreferenceKey(key: unknown) {
  if (typeof key !== 'string') {
    throw new BadRequestException('表格偏好键无效');
  }
  const normalized = key.trim();
  if (!normalized || normalized.length > maxPreferenceKeyLength || !preferenceKeyPattern.test(normalized)) {
    throw new BadRequestException('表格偏好键无效');
  }
  return normalized;
}

export function parseUserTablePreferenceValue(value: unknown): UserTablePreferenceValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('表格偏好内容必须是对象');
  }
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, 'utf8') > maxPreferenceValueBytes) {
    throw new BadRequestException('表格偏好内容过大');
  }
  return JSON.parse(serialized) as UserTablePreferenceValue;
}

function clonePreferenceValue(value: UserTablePreferenceValue) {
  return JSON.parse(JSON.stringify(value)) as UserTablePreferenceValue;
}

@Injectable()
export class PrismaUserTablePreferenceService extends UserTablePreferenceService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    super();
  }

  async list(principal: Principal): Promise<UserTablePreferenceSummary[]> {
    const rows = await this.prisma.userTablePreference.findMany({
      where: { userId: principal.id },
      orderBy: { updatedAt: 'asc' }
    });
    return rows.map((row) => ({
      key: row.preferenceKey,
      value: parseUserTablePreferenceValue(row.value),
      updatedAt: row.updatedAt.toISOString()
    }));
  }

  async upsert(principal: Principal, key: string, value: unknown): Promise<UserTablePreferenceSummary> {
    const preferenceKey = parseUserTablePreferenceKey(key);
    const normalizedValue = parseUserTablePreferenceValue(value);
    const existing = await this.prisma.userTablePreference.findUnique({
      where: { userId_preferenceKey: { userId: principal.id, preferenceKey } },
      select: { id: true }
    });
    if (!existing) {
      const count = await this.prisma.userTablePreference.count({ where: { userId: principal.id } });
      if (count >= maxPreferencesPerUser) {
        throw new BadRequestException('表格偏好数量已达上限');
      }
    }
    const row = await this.prisma.userTablePreference.upsert({
      where: { userId_preferenceKey: { userId: principal.id, preferenceKey } },
      create: { userId: principal.id, preferenceKey, value: normalizedValue as Prisma.InputJsonValue },
      update: { value: normalizedValue as Prisma.InputJsonValue }
    });
    return {
      key: row.preferenceKey,
      value: parseUserTablePreferenceValue(row.value),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  async remove(principal: Principal, key: string): Promise<{ ok: true }> {
    const preferenceKey = parseUserTablePreferenceKey(key);
    await this.prisma.userTablePreference.deleteMany({
      where: { userId: principal.id, preferenceKey }
    });
    return { ok: true };
  }
}

@Injectable()
export class InMemoryUserTablePreferenceService extends UserTablePreferenceService {
  private readonly preferences = new Map<string, Map<string, { value: UserTablePreferenceValue; updatedAt: string }>>();

  async list(principal: Principal): Promise<UserTablePreferenceSummary[]> {
    return Array.from(this.preferences.get(principal.id)?.entries() ?? [])
      .map(([key, item]) => ({ key, value: clonePreferenceValue(item.value), updatedAt: item.updatedAt }))
      .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt));
  }

  async upsert(principal: Principal, key: string, value: unknown): Promise<UserTablePreferenceSummary> {
    const preferenceKey = parseUserTablePreferenceKey(key);
    const normalizedValue = parseUserTablePreferenceValue(value);
    const userPreferences = this.preferences.get(principal.id) ?? new Map();
    if (!userPreferences.has(preferenceKey) && userPreferences.size >= maxPreferencesPerUser) {
      throw new BadRequestException('表格偏好数量已达上限');
    }
    const updatedAt = new Date().toISOString();
    userPreferences.set(preferenceKey, { value: clonePreferenceValue(normalizedValue), updatedAt });
    this.preferences.set(principal.id, userPreferences);
    return { key: preferenceKey, value: clonePreferenceValue(normalizedValue), updatedAt };
  }

  async remove(principal: Principal, key: string): Promise<{ ok: true }> {
    this.preferences.get(principal.id)?.delete(parseUserTablePreferenceKey(key));
    return { ok: true };
  }
}
