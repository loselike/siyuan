import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Req } from '@nestjs/common';
import { RequireAuth, RequirePermission } from '../../require-permission.decorator.js';
import type { Principal } from '../../rbac.js';
import type {
  ProblemTicketTagCreateInput,
  ProblemTicketTagUpdateInput
} from './problem-ticket-tag.repository.js';
import { ProblemTicketTagService } from './problem-ticket-tag.service.js';

@Controller('customer-service/problem-tags')
export class ProblemTicketTagController {
  constructor(
    @Inject(ProblemTicketTagService)
    private readonly tags: ProblemTicketTagService
  ) {}

  @Get()
  @RequireAuth()
  async problemTicketCommonTags(@Req() request: { user: Principal }) {
    return this.tags.list(request.user);
  }

  @Post()
  @RequirePermission('customer-service:problem:tag-manage')
  async createProblemTicketCommonTag(
    @Req() request: { user: Principal },
    @Body() body: ProblemTicketTagCreateInput
  ) {
    return this.tags.create(request.user, body);
  }

  @Put(':id')
  @RequirePermission('customer-service:problem:tag-manage')
  async updateProblemTicketCommonTag(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: ProblemTicketTagUpdateInput
  ) {
    return this.tags.update(request.user, id, body);
  }

  @Delete(':id')
  @RequirePermission('customer-service:problem:tag-manage')
  async deleteProblemTicketCommonTag(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.tags.delete(request.user, id);
  }
}
