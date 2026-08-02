import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { RequireAuth, RequirePermission } from '../require-permission.decorator.js';
import type { Principal } from '../rbac.js';
import { NotificationService } from './notification.service.js';
import type { AnnouncementCreateInput } from './notification.types.js';

@Controller('notifications')
export class NotificationController {
  constructor(@Inject(NotificationService) private readonly notifications: NotificationService) {}

  @Get('summary')
  @RequireAuth()
  summary(@Req() request: { user: Principal }) {
    return this.notifications.getUnreadSummary(request.user);
  }

  @Get()
  @RequireAuth()
  list(
    @Req() request: { user: Principal },
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    return this.notifications.listNotifications(request.user, { status, category, keyword, page: Number(page) || 1, pageSize: Number(pageSize) || 20 });
  }

  @Get('action-tasks')
  @RequireAuth()
  actionTasks(@Req() request: { user: Principal }) {
    return this.notifications.listActionTasks(request.user);
  }

  @Patch(':id/read')
  @RequireAuth()
  markRead(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.notifications.markRead(request.user, id);
  }

  @Post('read-all')
  @RequireAuth()
  markAllRead(@Req() request: { user: Principal }) {
    return this.notifications.markAllRead(request.user);
  }

  @Patch(':id/archive')
  @RequireAuth()
  archive(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.notifications.archive(request.user, id);
  }

  @Patch(':id/restore')
  @RequireAuth()
  restore(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.notifications.restore(request.user, id);
  }

  @Post(':id/acknowledge')
  @RequireAuth()
  acknowledge(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.notifications.acknowledge(request.user, id);
  }

  @Get('preferences')
  @RequireAuth()
  preferences(@Req() request: { user: Principal }) {
    return this.notifications.getPreferences(request.user);
  }

  @Patch('preferences')
  @RequireAuth()
  updatePreferences(@Req() request: { user: Principal }, @Body() input: { items?: Array<{ category: string; enabled: boolean }> }) {
    return this.notifications.updatePreferences(request.user, input.items ?? []);
  }
}

@Controller('system/announcements')
export class AnnouncementController {
  constructor(@Inject(NotificationService) private readonly notifications: NotificationService) {}

  @Get('audience-options')
  @RequirePermission('system:announcements:read')
  audienceOptions(@Req() request: { user: Principal }) {
    return this.notifications.getAnnouncementAudienceOptions(request.user);
  }

  @Get()
  @RequirePermission('system:announcements:read')
  list(@Req() request: { user: Principal }) {
    return this.notifications.listAnnouncements(request.user);
  }

  @Post()
  @RequirePermission('system:announcements:publish')
  create(@Req() request: { user: Principal }, @Body() input: AnnouncementCreateInput) {
    return this.notifications.createAnnouncement(request.user, input);
  }

  @Post(':id/withdraw')
  @RequirePermission('system:announcements:withdraw')
  withdraw(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.notifications.withdrawAnnouncement(request.user, id);
  }
}

@Controller('system/notification-operations')
export class NotificationOperationsController {
  constructor(@Inject(NotificationService) private readonly notifications: NotificationService) {}

  @Get()
  @RequirePermission('system:notifications:operations-read')
  list(@Req() request: { user: Principal }, @Query('status') status?: string) {
    return this.notifications.listOperations(request.user, { status });
  }

  @Post(':id/retry')
  @RequirePermission('system:notifications:retry')
  retry(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.notifications.retryOperation(request.user, id);
  }
}
