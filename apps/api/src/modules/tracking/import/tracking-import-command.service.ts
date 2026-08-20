import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { PermissionKey, Principal } from '../../rbac.js';
import {
  TRACKING_IMPORT_COMMAND_REPOSITORY,
  type TrackingImportCommandInput,
  type TrackingImportCommandRepository
} from './tracking-import-command.repository.js';

@Injectable()
export class TrackingImportCommandService {
  constructor(
    @Inject(TRACKING_IMPORT_COMMAND_REPOSITORY)
    private readonly repository: TrackingImportCommandRepository
  ) {}

  async import(principal: Principal, input: TrackingImportCommandInput) {
    if (principal.role === 'CUSTOMER') {
      throw new ForbiddenException('客户不能批量导入轨迹');
    }
    await this.ensurePermission(principal, 'tracking:external:import');
    return this.repository.importTrackingEvents(principal, input);
  }

  private async ensurePermission(principal: Principal, permission: PermissionKey) {
    if (await this.repository.hasPermission(principal.role, permission)) return;
    await this.repository.recordPermissionDenied(principal, {
      permissions: [permission],
      method: 'SERVER',
      path: 'tracking/external/import'
    }).catch(() => undefined);
    throw new ForbiddenException('没有访问权限');
  }
}
