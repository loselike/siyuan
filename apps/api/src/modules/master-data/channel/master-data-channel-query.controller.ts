import { Controller, Get, Inject } from '@nestjs/common';
import { PrismaRepository } from '../../prisma.repository.js';
import { RequirePermission } from '../../require-permission.decorator.js';

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
}
