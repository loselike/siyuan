import { Body, Controller, Get, Inject, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import type {
  CustomerServiceDataConfirmListQuery,
  CustomerServiceDataReviewInput,
  CustomerServiceDataReverseInput,
  CustomerServiceDataUpdateInput,
  CustomerServiceFinanceItemUpdateInput
} from './customer-service-data-confirm.repository.js';
import { CustomerServiceDataConfirmService } from './customer-service-data-confirm.service.js';

@Controller()
export class CustomerServiceDataConfirmController {
  constructor(
    @Inject(CustomerServiceDataConfirmService)
    private readonly dataConfirm: CustomerServiceDataConfirmService
  ) {}

  @Post('shipments/:id/business-data/approve')
  @RequirePermission('customer-service:data-confirm:business-approve')
  approveShipmentBusinessData(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerServiceDataReviewInput) {
    return this.dataConfirm.approveBusiness(request.user, id, body);
  }

  @Post('shipments/:id/agent-data/approve')
  @RequirePermission('customer-service:data-confirm:agent-approve')
  approveShipmentAgentData(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerServiceDataReviewInput) {
    return this.dataConfirm.approveAgent(request.user, id, body);
  }

  @Patch('shipments/:id/business-data')
  @RequirePermission('customer-service:data-confirm:business-update')
  updateShipmentBusinessData(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerServiceDataUpdateInput) {
    return this.dataConfirm.updateBusiness(request.user, id, body);
  }

  @Get('shipments/:id/customer-service/cost-preview')
  @RequirePermission(['customer-service:data-confirm:business-update', 'customer-service:data-confirm:agent-update'])
  customerServiceCostPreview(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Query('kind') kind?: string
  ) {
    return this.dataConfirm.previewFinance(request.user, id, kind);
  }

  @Put('shipments/:id/customer-service/finance-items/:feeId')
  @RequirePermission(['customer-service:data-confirm:business-update', 'customer-service:data-confirm:agent-update'])
  updateCustomerServiceFinanceItem(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Param('feeId') feeId: string,
    @Query('kind') kind: string,
    @Body() body: CustomerServiceFinanceItemUpdateInput
  ) {
    return this.dataConfirm.updateFinanceItem(request.user, id, feeId, kind, body);
  }

  @Patch('shipments/:id/agent-data')
  @RequirePermission('customer-service:data-confirm:agent-update')
  updateShipmentAgentData(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerServiceDataUpdateInput) {
    return this.dataConfirm.updateAgent(request.user, id, body);
  }

  @Post('shipments/:id/business-data/reverse')
  @RequirePermission('customer-service:data-confirm:reverse')
  reverseShipmentBusinessData(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerServiceDataReverseInput) {
    return this.dataConfirm.reverseBusiness(request.user, id, body);
  }

  @Post('shipments/:id/agent-data/reverse')
  @RequirePermission('customer-service:data-confirm:reverse')
  reverseShipmentAgentData(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerServiceDataReverseInput) {
    return this.dataConfirm.reverseAgent(request.user, id, body);
  }

  @Post('shipments/:id/data-confirmation/approve-all')
  @RequirePermission('customer-service:data-confirm:approve-all')
  approveShipmentAllData(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerServiceDataReviewInput) {
    return this.dataConfirm.approveAll(request.user, id, body);
  }

  @Post('shipments/:id/data-confirmation/reverse-all')
  @RequirePermission('customer-service:data-confirm:reverse')
  reverseShipmentAllData(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: CustomerServiceDataReverseInput) {
    return this.dataConfirm.reverseAll(request.user, id, body);
  }

  @Get('customer-service/data-confirm-shipments')
  @RequirePermission('customer-service:data-confirm:view')
  customerServiceDataConfirmShipments(@Req() request: { user: Principal }, @Query() query: CustomerServiceDataConfirmListQuery) {
    return this.dataConfirm.list(request.user, query);
  }
}
