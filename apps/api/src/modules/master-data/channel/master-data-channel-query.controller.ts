import { Controller, ForbiddenException, Get, Inject, Req } from '@nestjs/common';
import { PrismaRepository } from '../../prisma.repository.js';
import { RequirePermission } from '../../require-permission.decorator.js';
import { isBusinessAgentRestrictedRole, type Principal } from '../../rbac.js';

@Controller()
export class MasterDataChannelQueryController {
  constructor(@Inject(PrismaRepository) private readonly repository: PrismaRepository) {}

  @Get('master-data/carriers')
  @RequirePermission('master-data:channels:read')
  async masterDataCarriers() {
    return (await this.repository.getMasterData()).carriers;
  }

  @Get('master-data/channels')
  @RequirePermission('master-data:channels:read')
  async masterDataChannels() {
    return (await this.repository.getMasterData()).channels;
  }

  @Get('master-data/channel-categories')
  @RequirePermission('master-data:channel-categories:read')
  async masterDataChannelCategories() {
    return (await this.repository.getMasterData()).channelCategories;
  }

  @Get('master-data/agents')
  @RequirePermission('master-data:agents:read')
  async masterDataAgents(@Req() request: { user: Principal }) {
    if (isBusinessAgentRestrictedRole(request.user.role)) {
      throw new ForbiddenException('业务角色不能查看真实代理资料');
    }
    return (await this.repository.getMasterData()).agents;
  }

  @Get('master-data/agent-channels')
  @RequirePermission('master-data:agent-channels:read')
  async masterDataAgentChannels(@Req() request: { user: Principal }) {
    if (isBusinessAgentRestrictedRole(request.user.role)) {
      throw new ForbiddenException('业务角色不能查看真实代理渠道');
    }
    return (await this.repository.getMasterData()).agentChannels;
  }
}
