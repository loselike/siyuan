import type {
  EnabledUpdateInput,
  RoleGroupInput,
  StaffAccountRoleKey
} from './index.js';
import type { PermissionKey } from './permissions.js';
import {
  RuntimeInputValidationError,
  defineRuntimeSchema
} from './runtime-schema.js';

const REQUEST_BODY_ERROR = '请求体格式不正确';

export interface RolePermissionsUpdateInput {
  permissions: PermissionKey[];
}

export interface RolePermissionsCopyInput {
  sourceRoleKey: StaffAccountRoleKey;
}

export const systemRoleGroupInputSchema = defineRuntimeSchema<RoleGroupInput>((value) => {
  const input = parseRecord(value);
  const label = parseRequiredString(input.label, '用户组名称不能为空', '用户组名称格式不正确');
  const description = parseOptionalNullableString(input.description, '用户组描述格式不正确');
  const site = parseOptionalNullableString(input.site, '站点格式不正确');
  const sortOrder = parseOptionalFiniteNumber(input.sortOrder, '排序格式不正确');
  const enabled = parseOptionalBoolean(input.enabled, '启用状态格式不正确');
  const templateRole = parseOptionalRoleKey(input.templateRole, '模板用户组格式不正确');
  const sourceRoleKey = parseOptionalRoleKey(input.sourceRoleKey, '权限来源用户组格式不正确');

  return {
    label,
    ...(description === undefined ? {} : { description }),
    ...(site === undefined ? {} : { site }),
    ...(sortOrder === undefined ? {} : { sortOrder }),
    ...(enabled === undefined ? {} : { enabled }),
    ...(templateRole === undefined ? {} : { templateRole }),
    ...(sourceRoleKey === undefined ? {} : { sourceRoleKey })
  };
});

export const systemRoleEnabledInputSchema = defineRuntimeSchema<EnabledUpdateInput>((value) => {
  const input = parseRecord(value);
  if (typeof input.enabled !== 'boolean') {
    throw new RuntimeInputValidationError(
      input.enabled === undefined ? '请选择启用状态' : '启用状态格式不正确'
    );
  }
  return { enabled: input.enabled };
});

export const systemRolePermissionsInputSchema = defineRuntimeSchema<RolePermissionsUpdateInput>((value) => {
  const input = parseRecord(value);
  if (!Array.isArray(input.permissions)) {
    throw new RuntimeInputValidationError(
      input.permissions === undefined ? '请提交权限列表' : '权限列表格式不正确'
    );
  }
  if (input.permissions.some((permission) => typeof permission !== 'string')) {
    throw new RuntimeInputValidationError('权限列表格式不正确');
  }
  return { permissions: input.permissions as PermissionKey[] };
});

export const systemRolePermissionsCopyInputSchema = defineRuntimeSchema<RolePermissionsCopyInput>((value) => {
  const input = parseRecord(value);
  if (input.sourceRoleKey === undefined || input.sourceRoleKey === null || input.sourceRoleKey === '') {
    throw new RuntimeInputValidationError('请选择权限来源用户组');
  }
  if (typeof input.sourceRoleKey !== 'string') {
    throw new RuntimeInputValidationError('权限来源用户组格式不正确');
  }
  return { sourceRoleKey: input.sourceRoleKey as StaffAccountRoleKey };
});

function parseRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RuntimeInputValidationError(REQUEST_BODY_ERROR);
  }
  return value as Record<string, unknown>;
}

function parseRequiredString(value: unknown, missingMessage: string, invalidMessage: string): string {
  if (value === undefined || value === '') {
    throw new RuntimeInputValidationError(missingMessage);
  }
  if (typeof value !== 'string') {
    throw new RuntimeInputValidationError(invalidMessage);
  }
  return value;
}

function parseOptionalString(value: unknown, message: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new RuntimeInputValidationError(message);
  }
  return value;
}

function parseOptionalNullableString(value: unknown, message: string): string | undefined {
  if (value === undefined) return undefined;
  if (value === null) return '';
  return parseOptionalString(value, message);
}

function parseOptionalRoleKey(value: unknown, message: string): StaffAccountRoleKey | undefined {
  if (value === undefined || value === null) return undefined;
  return parseOptionalString(value, message) as StaffAccountRoleKey;
}

function parseOptionalBoolean(value: unknown, message: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') {
    throw new RuntimeInputValidationError(message);
  }
  return value;
}

function parseOptionalFiniteNumber(value: unknown, message: string): number | undefined {
  if (value === undefined) return undefined;
  if ((typeof value !== 'number' && typeof value !== 'string')
    || (typeof value === 'string' && value.trim() === '')) {
    throw new RuntimeInputValidationError(message);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new RuntimeInputValidationError(message);
  }
  return parsed;
}
