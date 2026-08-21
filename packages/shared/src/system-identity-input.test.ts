import { describe, expect, it } from 'vitest';
import {
  systemRoleEnabledInputSchema,
  systemRoleGroupInputSchema,
  systemRolePermissionsCopyInputSchema,
  systemRolePermissionsInputSchema
} from './system-identity-input.js';

describe('system role runtime input schemas', () => {
  it('preserves legal role fields, legacy numeric sort order and unknown-field stripping', () => {
    expect(systemRoleGroupInputSchema.parse({
      label: ' 深圳仓库 ',
      description: '',
      site: '深圳思远',
      sortOrder: '61',
      enabled: false,
      templateRole: 'WAREHOUSE',
      sourceRoleKey: 'UG_SOURCE',
      ignoredField: true
    })).toEqual({
      label: ' 深圳仓库 ',
      description: '',
      site: '深圳思远',
      sortOrder: 61,
      enabled: false,
      templateRole: 'WAREHOUSE',
      sourceRoleKey: 'UG_SOURCE'
    });
    expect(systemRoleGroupInputSchema.parse({
      label: 'A',
      description: null,
      site: null,
      templateRole: null,
      sourceRoleKey: null
    })).toEqual({ label: 'A', description: '', site: '' });
  });

  it.each([
    [null, '请求体格式不正确'],
    [[], '请求体格式不正确'],
    [{}, '用户组名称不能为空'],
    [{ label: 61 }, '用户组名称格式不正确'],
    [{ label: 'A', description: 1 }, '用户组描述格式不正确'],
    [{ label: 'A', site: false }, '站点格式不正确'],
    [{ label: 'A', sortOrder: '' }, '排序格式不正确'],
    [{ label: 'A', sortOrder: null }, '排序格式不正确'],
    [{ label: 'A', sortOrder: 'Infinity' }, '排序格式不正确'],
    [{ label: 'A', enabled: 'true' }, '启用状态格式不正确'],
    [{ label: 'A', sourceRoleKey: 1 }, '权限来源用户组格式不正确']
  ])('rejects malformed role input %#', (value, message) => {
    expect(() => systemRoleGroupInputSchema.parse(value)).toThrow(message as string);
  });

  it('requires exact enabled and permission payloads', () => {
    expect(systemRoleEnabledInputSchema.parse({ enabled: true, ignored: 1 })).toEqual({ enabled: true });
    expect(systemRolePermissionsInputSchema.parse({ permissions: [], ignored: 1 })).toEqual({ permissions: [] });
    expect(systemRolePermissionsInputSchema.parse({ permissions: ['warehouse:today-receipt:view'] })).toEqual({
      permissions: ['warehouse:today-receipt:view']
    });
    expect(systemRolePermissionsCopyInputSchema.parse({ sourceRoleKey: 'WAREHOUSE', ignored: 1 })).toEqual({
      sourceRoleKey: 'WAREHOUSE'
    });

    expect(() => systemRoleEnabledInputSchema.parse({})).toThrow('请选择启用状态');
    expect(() => systemRoleEnabledInputSchema.parse({ enabled: null })).toThrow('启用状态格式不正确');
    expect(() => systemRoleEnabledInputSchema.parse({ enabled: 'true' })).toThrow('启用状态格式不正确');
    expect(() => systemRolePermissionsInputSchema.parse({})).toThrow('请提交权限列表');
    expect(() => systemRolePermissionsInputSchema.parse({ permissions: null })).toThrow('权限列表格式不正确');
    expect(() => systemRolePermissionsInputSchema.parse({ permissions: 1 })).toThrow('权限列表格式不正确');
    expect(() => systemRolePermissionsInputSchema.parse({ permissions: [1] })).toThrow('权限列表格式不正确');
    expect(() => systemRolePermissionsCopyInputSchema.parse({})).toThrow('请选择权限来源用户组');
    expect(() => systemRolePermissionsCopyInputSchema.parse({ sourceRoleKey: null })).toThrow('请选择权限来源用户组');
    expect(() => systemRolePermissionsCopyInputSchema.parse({ sourceRoleKey: 1 })).toThrow('权限来源用户组格式不正确');
  });
});
