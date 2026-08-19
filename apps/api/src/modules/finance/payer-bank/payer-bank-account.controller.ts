import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, Req } from '@nestjs/common';
import type { PayerBankAccountInput } from '@siyuan/shared';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import { PayerBankAccountService } from './payer-bank-account.service.js';

@Controller('master-data/payer-bank-accounts')
export class PayerBankAccountController {
  constructor(@Inject(PayerBankAccountService) private readonly service: PayerBankAccountService) {}

  @Get()
  @RequirePermission('master-data:payer-banks:read')
  async list(@Req() request: { user: Principal }, @Query('keyword') keyword?: string) {
    return this.service.list(request.user, { keyword });
  }

  @Post()
  @RequirePermission('master-data:payer-banks:create')
  async create(@Req() request: { user: Principal }, @Body() body: PayerBankAccountInput) {
    return this.service.create(request.user, body);
  }

  @Put(':id')
  @RequirePermission('master-data:payer-banks:update')
  async update(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: Partial<PayerBankAccountInput>
  ) {
    return this.service.update(request.user, id, body);
  }

  @Delete(':id')
  @RequirePermission('master-data:payer-banks:delete')
  async delete(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.service.delete(request.user, id);
  }
}
