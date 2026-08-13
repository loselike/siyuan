import type { PrismaRepository } from '../../prisma.repository.js';

export const SYSTEM_IDENTITY_ADMIN_REPOSITORY = Symbol('SYSTEM_IDENTITY_ADMIN_REPOSITORY');

export type SystemIdentityAdminRepository = Pick<PrismaRepository,
  | 'getRolePermissionMatrix'
  | 'createRoleGroup'
  | 'updateRoleGroup'
  | 'updateRoleGroupEnabled'
  | 'deleteRoleGroup'
  | 'getStaffAccounts'
  | 'createSite'
  | 'updateSite'
  | 'updateSiteEnabled'
  | 'createStaffAccount'
  | 'updateStaffAccountEnabled'
  | 'updateStaffAccount'
  | 'deleteStaffAccount'
  | 'resetStaffAccountPasswords'
  | 'updateStaffAccountSite'
  | 'updateRolePermissions'
  | 'copyRolePermissions'
  | 'hasPermission'
  | 'recordPermissionDenied'
>;
