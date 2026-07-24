import { Controller, Get, Inject, Req } from '@nestjs/common';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import { SystemDirectoryService } from './system-directory.service.js';

@Controller()
export class SystemDirectoryController {
  constructor(@Inject(SystemDirectoryService) private readonly service: SystemDirectoryService) {}

  @Get('system/departments')
  @RequirePermission('system:accounts:read')
  getDepartments(@Req() request: { user: Principal }) {
    return this.service.getDepartments(request.user);
  }

  @Get('system/sites')
  @RequirePermission('system:sites:read')
  getSites(@Req() request: { user: Principal }) {
    return this.service.getSites(request.user);
  }
}
