import { BadRequestException, Inject, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type {
  AnnouncementAudienceOptions,
  AnnouncementCreateInput,
  AnnouncementSummary,
  NotificationActionTaskListResponse,
  NotificationListResponse,
  NotificationOperationsResponse,
  NotificationPreferenceSummary,
  NotificationSummary,
  NotificationUnreadSummary
} from './notification.types.js';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { Principal } from '../rbac.js';
import { PrismaService } from '../prisma.service.js';
import {
  buildNotificationTargetPath,
  buildBusinessEventNotification,
  buildShipmentReviewNotification,
  isAnnouncementAudienceType,
  isNotificationSeverity,
  stationNotificationAuditActions
} from './notification-domain.js';

const stationNotificationCursorKey = 'station-notifications-v2';
const maxProcessingAttempts = 5;
const notificationCategories = ['ANNOUNCEMENT', 'ORDER', 'FINANCE', 'WAREHOUSE', 'CUSTOMER_SERVICE', 'SYSTEM'] as const;
const notificationCategoryLabels: Record<(typeof notificationCategories)[number], string> = {
  ANNOUNCEMENT: '公告', ORDER: '订单', FINANCE: '财务', WAREHOUSE: '仓库', CUSTOMER_SERVICE: '客服', SYSTEM: '系统'
};

type NotificationFilter = { status?: string; category?: string; keyword?: string; page?: number; pageSize?: number };

export abstract class NotificationService {
  abstract getUnreadSummary(principal: Principal): Promise<NotificationUnreadSummary>;
  abstract listNotifications(principal: Principal, filter?: NotificationFilter): Promise<NotificationListResponse>;
  abstract listActionTasks(principal: Principal): Promise<NotificationActionTaskListResponse>;
  abstract markRead(principal: Principal, deliveryId: string): Promise<{ ok: true }>;
  abstract markAllRead(principal: Principal): Promise<{ ok: true; updatedCount: number }>;
  abstract archive(principal: Principal, deliveryId: string): Promise<{ ok: true }>;
  abstract restore(principal: Principal, deliveryId: string): Promise<{ ok: true }>;
  abstract acknowledge(principal: Principal, deliveryId: string): Promise<{ ok: true }>;
  abstract getPreferences(principal: Principal): Promise<NotificationPreferenceSummary[]>;
  abstract updatePreferences(principal: Principal, input: { category: string; enabled: boolean }[]): Promise<NotificationPreferenceSummary[]>;
  abstract getAnnouncementAudienceOptions(principal: Principal): Promise<AnnouncementAudienceOptions>;
  abstract createAnnouncement(principal: Principal, input: AnnouncementCreateInput): Promise<AnnouncementSummary>;
  abstract listAnnouncements(principal: Principal): Promise<AnnouncementSummary[]>;
  abstract withdrawAnnouncement(principal: Principal, announcementId: string): Promise<AnnouncementSummary>;
  abstract listOperations(principal: Principal, filter?: { status?: string }): Promise<NotificationOperationsResponse>;
  abstract retryOperation(principal: Principal, processingId: string): Promise<{ ok: true }>;
  processPendingAuditEvents(): Promise<number> {
    return Promise.resolve(0);
  }
}

function asRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function optionalIso(value?: Date | null): string | undefined {
  return value?.toISOString();
}

function isAuditEventLater(
  candidateAt: Date | null | undefined,
  candidateId: string | null | undefined,
  referenceAt: Date,
  referenceId: string
) {
  if (!candidateAt) return false;
  const timeDifference = candidateAt.getTime() - referenceAt.getTime();
  return timeDifference > 0 || (timeDifference === 0 && (candidateId ?? '') > referenceId);
}

@Injectable()
export class PrismaNotificationService extends NotificationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    super();
  }

  async getUnreadSummary(principal: Principal): Promise<NotificationUnreadSummary> {
    const now = new Date();
    const where = {
      userId: principal.id,
      readAt: null,
      archivedAt: null,
      notification: {
        withdrawnAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
      }
    } satisfies Prisma.NotificationDeliveryWhereInput;
    const [unreadCount, latest] = await Promise.all([
      this.prisma.notificationDelivery.count({ where }),
      this.prisma.notificationDelivery.findFirst({ where, orderBy: { deliveredAt: 'desc' }, select: { deliveredAt: true } })
    ]);
    return {
      unreadCount,
      displayCount: unreadCount > 99 ? '99+' : String(unreadCount),
      latestDeliveredAt: optionalIso(latest?.deliveredAt)
    };
  }

  async listNotifications(principal: Principal, filter: NotificationFilter = {}): Promise<NotificationListResponse> {
    const now = new Date();
    const page = Math.max(1, Math.trunc(filter.page || 1));
    const pageSize = Math.min(50, Math.max(10, Math.trunc(filter.pageSize || 20)));
    const keyword = filter.keyword?.trim().slice(0, 100);
    const where: Prisma.NotificationDeliveryWhereInput = {
      userId: principal.id,
      ...(filter.status === 'ARCHIVED' ? { archivedAt: { not: null } } : { archivedAt: null }),
      ...(filter.status === 'UNREAD' ? { readAt: null } : {}),
      notification: {
        withdrawnAt: null,
        ...(filter.category && filter.category !== 'ALL' ? { category: filter.category } : {}),
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          ...(keyword ? [{ OR: [
            { title: { contains: keyword, mode: 'insensitive' as const } },
            { body: { contains: keyword, mode: 'insensitive' as const } }
          ] }] : [])
        ]
      }
    };
    const [rows, total, unreadCount] = await Promise.all([
      this.prisma.notificationDelivery.findMany({
        where,
        include: { notification: true },
        orderBy: { deliveredAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.notificationDelivery.count({ where }),
      this.prisma.notificationDelivery.count({
        where: {
          userId: principal.id,
          readAt: null,
          archivedAt: null,
          notification: { withdrawnAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }
        }
      })
    ]);
    return {
      items: rows.map((row) => this.mapDelivery(row, principal)),
      total,
      unreadCount,
      page,
      pageSize,
      hasMore: page * pageSize < total
    };
  }

  async listActionTasks(principal: Principal): Promise<NotificationActionTaskListResponse> {
    if (principal.customerId || principal.role === 'CUSTOMER') return { items: [], total: 0 };
    const rows = await this.prisma.notificationActionTask.findMany({
      where: { ownerUserId: principal.id, status: 'OPEN', type: 'FINANCE_WATER_RECEIPT_MATCH_RESUBMIT' },
      orderBy: { openedAt: 'desc' }
    });
    return {
      items: rows.map((row) => ({
        id: row.id,
        type: 'FINANCE_WATER_RECEIPT_MATCH_RESUBMIT',
        title: row.title,
        body: row.body,
        targetModule: row.targetModule,
        targetSection: row.targetSection,
        targetEntityType: row.targetEntityType,
        targetEntityId: row.targetEntityId,
        targetPath: buildNotificationTargetPath(row.targetModule, row.targetSection, row.targetEntityType, row.targetEntityId),
        openedAt: row.openedAt.toISOString()
      })),
      total: rows.length
    };
  }

  async markRead(principal: Principal, deliveryId: string): Promise<{ ok: true }> {
    const result = await this.prisma.notificationDelivery.updateMany({
      where: { id: deliveryId, userId: principal.id, readAt: null },
      data: { readAt: new Date() }
    });
    if (!result.count) {
      const exists = await this.prisma.notificationDelivery.count({ where: { id: deliveryId, userId: principal.id } });
      if (!exists) throw new NotFoundException('消息不存在');
    }
    return { ok: true };
  }

  async markAllRead(principal: Principal): Promise<{ ok: true; updatedCount: number }> {
    const result = await this.prisma.notificationDelivery.updateMany({
      where: { userId: principal.id, readAt: null, archivedAt: null },
      data: { readAt: new Date() }
    });
    return { ok: true, updatedCount: result.count };
  }

  async archive(principal: Principal, deliveryId: string): Promise<{ ok: true }> {
    const delivery = await this.prisma.notificationDelivery.findFirst({
      where: { id: deliveryId, userId: principal.id },
      select: { readAt: true, archivedAt: true, acknowledgedAt: true, notification: { select: { requiresAcknowledgement: true } } }
    });
    if (!delivery) throw new NotFoundException('消息不存在');
    if (delivery.archivedAt) return { ok: true };
    if (delivery.notification.requiresAcknowledgement && !delivery.acknowledgedAt) {
      throw new BadRequestException('请先确认知晓后再归档');
    }
    const now = new Date();
    await this.prisma.notificationDelivery.updateMany({
      where: { id: deliveryId, userId: principal.id, archivedAt: null },
      data: { archivedAt: now, ...(delivery.readAt ? {} : { readAt: now }) }
    });
    return { ok: true };
  }

  async restore(principal: Principal, deliveryId: string): Promise<{ ok: true }> {
    const result = await this.prisma.notificationDelivery.updateMany({
      where: { id: deliveryId, userId: principal.id, archivedAt: { not: null } },
      data: { archivedAt: null }
    });
    if (!result.count) {
      const exists = await this.prisma.notificationDelivery.count({ where: { id: deliveryId, userId: principal.id } });
      if (!exists) throw new NotFoundException('消息不存在');
    }
    return { ok: true };
  }

  async acknowledge(principal: Principal, deliveryId: string): Promise<{ ok: true }> {
    const delivery = await this.prisma.notificationDelivery.findFirst({
      where: { id: deliveryId, userId: principal.id },
      select: { readAt: true, acknowledgedAt: true, notification: { select: { requiresAcknowledgement: true } } }
    });
    if (!delivery?.notification.requiresAcknowledgement) throw new NotFoundException('需要确认的消息不存在');
    if (delivery.acknowledgedAt) return { ok: true };
    const now = new Date();
    await this.prisma.notificationDelivery.updateMany({
      where: { id: deliveryId, userId: principal.id, acknowledgedAt: null, notification: { requiresAcknowledgement: true } },
      data: { acknowledgedAt: now, ...(delivery.readAt ? {} : { readAt: now }) }
    });
    return { ok: true };
  }

  async getPreferences(principal: Principal): Promise<NotificationPreferenceSummary[]> {
    const allowedCategories = principal.customerId || principal.role === 'CUSTOMER'
      ? ['ANNOUNCEMENT'] as const
      : notificationCategories;
    const rows = await this.prisma.notificationPreference.findMany({ where: { userId: principal.id } });
    const enabledByCategory = new Map(rows.map((row) => [row.category, row.enabled]));
    return allowedCategories.map((category) => ({
      category,
      enabled: enabledByCategory.get(category) ?? true,
      locked: false,
      label: notificationCategoryLabels[category]
    }));
  }

  async updatePreferences(principal: Principal, input: { category: string; enabled: boolean }[]): Promise<NotificationPreferenceSummary[]> {
    if (!Array.isArray(input)) throw new BadRequestException('通知偏好格式无效');
    const allowed = new Set<string>(principal.customerId || principal.role === 'CUSTOMER' ? ['ANNOUNCEMENT'] : notificationCategories);
    const normalized = new Map<string, boolean>();
    for (const item of input) {
      if (!allowed.has(item?.category) || typeof item.enabled !== 'boolean') throw new BadRequestException('通知偏好包含无效分类');
      normalized.set(item.category, item.enabled);
    }
    await this.prisma.$transaction([...normalized.entries()].map(([category, enabled]) => this.prisma.notificationPreference.upsert({
      where: { userId_category: { userId: principal.id, category } },
      update: { enabled },
      create: { userId: principal.id, category, enabled }
    })));
    return this.getPreferences(principal);
  }

  async getAnnouncementAudienceOptions(_principal: Principal): Promise<AnnouncementAudienceOptions> {
    const [roles, departments, users] = await Promise.all([
      this.prisma.role.findMany({ where: { enabled: true }, orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }], select: { name: true, label: true } }),
      this.prisma.department.findMany({ where: { enabled: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
      this.prisma.user.findMany({
        where: { enabled: true },
        orderBy: { username: 'asc' },
        select: { id: true, username: true, name: true, site: true, customerId: true, role: { select: { name: true, label: true } } }
      })
    ]);
    const sites = [...new Set(users.filter((user) => !user.customerId).map((user) => user.site?.trim()).filter(Boolean) as string[])].sort((left, right) => left.localeCompare(right, 'zh-CN'));
    return {
      roles: roles.map((role) => ({ value: role.name, label: role.label || role.name })),
      departments: departments.map((department) => ({ value: department.id, label: department.name })),
      sites: sites.map((site) => ({ value: site, label: site })),
      users: users.map((user) => ({
        value: user.id,
        label: `${user.name || user.username} · ${user.role.label || user.role.name}`,
        role: user.role.name,
        site: user.site ?? undefined,
        customer: Boolean(user.customerId)
      }))
    };
  }

  async createAnnouncement(principal: Principal, input: AnnouncementCreateInput): Promise<AnnouncementSummary> {
    const normalized = this.normalizeAnnouncementInput(input);
    const existing = await this.prisma.announcement.findUnique({ where: { requestId: normalized.requestId } });
    if (existing) {
      if (existing.createdById !== principal.id) throw new BadRequestException('公告请求标识已被占用');
      return this.buildAnnouncementSummary(existing.id);
    }
    let userIds = await this.resolveAnnouncementRecipients(normalized.audienceType, normalized.audienceValues);
    if (normalized.severity !== 'CRITICAL' && userIds.length) {
      const disabled = await this.prisma.notificationPreference.findMany({
        where: { userId: { in: userIds }, category: 'ANNOUNCEMENT', enabled: false },
        select: { userId: true }
      });
      const disabledIds = new Set(disabled.map((item) => item.userId));
      userIds = userIds.filter((userId) => !disabledIds.has(userId));
    }
    if (!userIds.length) throw new BadRequestException('当前公告受众没有启用用户');
    const now = new Date();
    let announcement: { id: string };
    try {
      announcement = await this.prisma.$transaction(async (tx) => {
        const created = await tx.announcement.create({
          data: {
            requestId: normalized.requestId,
            title: normalized.title,
            body: normalized.body,
            severity: normalized.severity,
            audienceType: normalized.audienceType,
            audienceValues: normalized.audienceValues,
            requiresAcknowledgement: normalized.requiresAcknowledgement,
            expiresAt: normalized.expiresAt,
            publishedAt: now,
            createdById: principal.id
          }
        });
        const notification = await tx.notification.create({
          data: {
            kind: 'ANNOUNCEMENT',
            type: 'system.announcement.published',
            category: 'ANNOUNCEMENT',
            severity: normalized.severity,
            title: normalized.title,
            body: normalized.body,
            actorId: principal.id,
            actorName: principal.name || principal.username,
            sourceType: 'ANNOUNCEMENT',
            sourceId: created.id,
            dedupeKey: `announcement:${created.id}`,
            requiresAcknowledgement: normalized.requiresAcknowledgement,
            expiresAt: normalized.expiresAt,
            announcementId: created.id
          }
        });
        await tx.notificationDelivery.createMany({
          data: userIds.map((userId) => ({ notificationId: notification.id, userId })),
          skipDuplicates: true
        });
        await tx.auditLog.create({
          data: {
            actorId: principal.id,
            action: 'system.announcement.publish',
            target: created.id,
            after: {
              title: created.title,
              severity: created.severity,
              audienceType: created.audienceType,
              recipientCount: userIds.length,
              requiresAcknowledgement: created.requiresAcknowledgement,
              expiresAt: created.expiresAt?.toISOString()
            }
          }
        });
        return created;
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      const duplicated = await this.prisma.announcement.findUnique({ where: { requestId: normalized.requestId } });
      if (!duplicated || duplicated.createdById !== principal.id) throw error;
      announcement = duplicated;
    }
    return this.buildAnnouncementSummary(announcement.id);
  }

  async listAnnouncements(_principal: Principal): Promise<AnnouncementSummary[]> {
    const rows = await this.prisma.announcement.findMany({
      orderBy: { publishedAt: 'desc' },
      take: 100,
      include: { notifications: { include: { deliveries: true } } }
    });
    return rows.map((row) => this.mapAnnouncementSummary(row));
  }

  async withdrawAnnouncement(principal: Principal, announcementId: string): Promise<AnnouncementSummary> {
    const existing = await this.prisma.announcement.findUnique({ where: { id: announcementId } });
    if (!existing) throw new NotFoundException('公告不存在');
    if (existing.status !== 'WITHDRAWN') {
      const now = new Date();
      await this.prisma.$transaction([
        this.prisma.announcement.update({ where: { id: announcementId }, data: { status: 'WITHDRAWN', withdrawnAt: now, withdrawnById: principal.id } }),
        this.prisma.notification.updateMany({ where: { announcementId }, data: { withdrawnAt: now } }),
        this.prisma.auditLog.create({ data: { actorId: principal.id, action: 'system.announcement.withdraw', target: announcementId, before: { status: existing.status }, after: { status: 'WITHDRAWN' } } })
      ]);
    }
    return this.buildAnnouncementSummary(announcementId);
  }

  async processPendingAuditEvents(): Promise<number> {
    const cursor = await this.prisma.notificationEventCursor.findUnique({ where: { key: stationNotificationCursorKey } });
    if (!cursor) return 0;
    const rows = await this.prisma.auditLog.findMany({
      where: {
        action: { in: [...stationNotificationAuditActions] },
        OR: [
          { createdAt: { gt: cursor.lastCreatedAt } },
          { createdAt: cursor.lastCreatedAt, id: { gt: cursor.lastAuditLogId } }
        ]
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 100
    });
    let processed = 0;
    for (const row of rows) {
      await this.processAuditEventSafely(row);
      await this.prisma.notificationEventCursor.updateMany({
        where: {
          key: stationNotificationCursorKey,
          OR: [
            { lastCreatedAt: { lt: row.createdAt } },
            { lastCreatedAt: row.createdAt, lastAuditLogId: { lt: row.id } }
          ]
        },
        data: { lastCreatedAt: row.createdAt, lastAuditLogId: row.id }
      });
      processed += 1;
    }
    const retryRows = await this.prisma.notificationEventProcessing.findMany({
      where: {
        OR: [
          { status: 'FAILED', attempts: { lt: maxProcessingAttempts }, OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }] },
          { status: 'PROCESSING', lockedAt: { lte: new Date(Date.now() - 5 * 60_000) } }
        ]
      },
      orderBy: { updatedAt: 'asc' },
      take: 20
    });
    for (const retry of retryRows) {
      if (retry.status === 'PROCESSING' && retry.attempts >= maxProcessingAttempts) {
        await this.prisma.notificationEventProcessing.updateMany({
          where: { id: retry.id, status: 'PROCESSING', lockToken: retry.lockToken, lockedAt: retry.lockedAt },
          data: { status: 'DEAD_LETTER', error: '通知处理租约超时且已达到最大尝试次数', nextRetryAt: null, lockToken: null, lockedAt: null, processedAt: new Date() }
        });
        continue;
      }
      const audit = await this.prisma.auditLog.findUnique({ where: { id: retry.auditLogId } });
      if (audit) {
        await this.processAuditEventSafely(audit);
      } else {
        await this.prisma.notificationEventProcessing.updateMany({
          where: { id: retry.id, status: { in: ['FAILED', 'PROCESSING'] } },
          data: { status: 'DEAD_LETTER', error: '源审计事件不存在，无法重放', nextRetryAt: null, lockToken: null, lockedAt: null, processedAt: new Date() }
        });
      }
    }
    return processed;
  }

  async listOperations(_principal: Principal, filter: { status?: string } = {}): Promise<NotificationOperationsResponse> {
    const where = filter.status && filter.status !== 'ALL' ? { status: filter.status } : {};
    const statuses = ['PENDING', 'PROCESSING', 'PROCESSED', 'SKIPPED', 'NO_RECIPIENT', 'FAILED', 'DEAD_LETTER'] as const;
    const [items, total, ...counts] = await Promise.all([
      this.prisma.notificationEventProcessing.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 100 }),
      this.prisma.notificationEventProcessing.count({ where }),
      ...statuses.map((status) => this.prisma.notificationEventProcessing.count({ where: { status } }))
    ]);
    return {
      items: items.map((row) => ({
        id: row.id,
        auditLogId: row.auditLogId,
        action: row.action,
        status: row.status as NotificationOperationsResponse['items'][number]['status'],
        attempts: row.attempts,
        recipientCount: row.recipientCount,
        error: row.error ?? undefined,
        nextRetryAt: optionalIso(row.nextRetryAt),
        processedAt: optionalIso(row.processedAt),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString()
      })),
      total,
      counts: Object.fromEntries(statuses.map((status, index) => [status, counts[index] ?? 0])) as NotificationOperationsResponse['counts']
    };
  }

  async retryOperation(principal: Principal, processingId: string): Promise<{ ok: true }> {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.notificationEventProcessing.findUnique({ where: { id: processingId } });
      if (!current || !['FAILED', 'DEAD_LETTER'].includes(current.status)) throw new NotFoundException('可重试的通知运行记录不存在');
      const updated = await tx.notificationEventProcessing.updateMany({
        where: { id: processingId, status: current.status, lockToken: current.lockToken },
        data: { status: 'FAILED', attempts: 0, error: null, nextRetryAt: new Date(), lockToken: null, lockedAt: null, processedAt: null }
      });
      if (!updated.count) throw new BadRequestException('通知运行状态已变化，请刷新后重试');
      await tx.auditLog.create({
        data: {
          actorId: principal.id,
          action: 'system.notification.retry',
          target: processingId,
          before: {
            status: current.status,
            attempts: current.attempts,
            auditLogId: current.auditLogId,
            error: current.error,
            nextRetryAt: current.nextRetryAt?.toISOString()
          },
          after: { status: 'FAILED', attempts: 0, queuedAt: new Date().toISOString() }
        }
      });
    });
    return { ok: true };
  }

  private async processAuditEventSafely(row: { id: string; actorId: string; action: string; target: string; before: Prisma.JsonValue | null; after: Prisma.JsonValue | null; createdAt: Date }) {
    const claim = await this.claimAuditEvent(row);
    if (!claim) return;
    try {
      const result = await this.processAuditEvent(row);
      await this.prisma.notificationEventProcessing.updateMany({
        where: { auditLogId: row.id, status: 'PROCESSING', lockToken: claim.lockToken },
        data: { status: result.status, recipientCount: result.recipientCount, error: null, nextRetryAt: null, lockToken: null, lockedAt: null, processedAt: new Date() }
      });
    } catch (error) {
      const status = claim.attempts >= maxProcessingAttempts ? 'DEAD_LETTER' : 'FAILED';
      const errorMessage = (error instanceof Error ? error.message : String(error)).slice(0, 1000);
      await this.prisma.notificationEventProcessing.updateMany({
        where: { auditLogId: row.id, status: 'PROCESSING', lockToken: claim.lockToken },
        data: {
          status,
          error: errorMessage,
          nextRetryAt: status === 'FAILED' ? new Date(Date.now() + Math.min(300_000, 10_000 * 2 ** claim.attempts)) : null,
          lockToken: null,
          lockedAt: null,
          processedAt: status === 'DEAD_LETTER' ? new Date() : null
        }
      });
    }
  }

  private async claimAuditEvent(row: { id: string; action: string }): Promise<{ lockToken: string; attempts: number } | null> {
    await this.prisma.notificationEventProcessing.upsert({
      where: { auditLogId: row.id },
      update: {},
      create: { auditLogId: row.id, action: row.action, status: 'PENDING', attempts: 0 }
    });
    const lockToken = randomUUID();
    const now = new Date();
    const claimed = await this.prisma.notificationEventProcessing.updateMany({
      where: {
        auditLogId: row.id,
        attempts: { lt: maxProcessingAttempts },
        OR: [
          { status: 'PENDING' },
          { status: 'FAILED', OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }] },
          { status: 'PROCESSING', lockedAt: { lte: new Date(now.getTime() - 5 * 60_000) } }
        ]
      },
      data: { status: 'PROCESSING', attempts: { increment: 1 }, lockToken, lockedAt: now, error: null, nextRetryAt: null }
    });
    if (!claimed.count) return null;
    const rowWithAttempt = await this.prisma.notificationEventProcessing.findFirst({
      where: { auditLogId: row.id, lockToken }, select: { attempts: true }
    });
    return rowWithAttempt ? { lockToken, attempts: rowWithAttempt.attempts } : null;
  }

  private async processAuditEvent(row: { id: string; actorId: string; action: string; target: string; before: Prisma.JsonValue | null; after: Prisma.JsonValue | null; createdAt: Date }): Promise<{ status: 'PROCESSED' | 'SKIPPED' | 'NO_RECIPIENT'; recipientCount: number }> {
    const dedupeKey = `audit:${row.id}`;
    const existing = await this.prisma.notification.findUnique({ where: { dedupeKey }, select: { id: true, _count: { select: { deliveries: true } } } });
    if (existing) return { status: existing._count.deliveries ? 'PROCESSED' : 'NO_RECIPIENT', recipientCount: existing._count.deliveries };
    const after = asRecord(row.after);
    const before = asRecord(row.before);
    if (row.action === 'finance.water_receipt.match_request.submit') {
      await this.resolveReturnWorkTasksFromSubmission(row, after);
      return { status: 'SKIPPED', recipientCount: 0 };
    }
    const actor = await this.prisma.user.findUnique({ where: { id: row.actorId }, select: { username: true, name: true } });
    let shipmentId = typeof after.shipmentId === 'string' ? after.shipmentId : undefined;
    let targetEntityId = row.target;
    const directRecipientIds: string[] = [];
    const ownerUsernames: Array<string | undefined> = [
      typeof after.entryBy === 'string' ? after.entryBy : undefined,
      typeof after.salesperson === 'string' ? after.salesperson : undefined
    ];
    let receiptNo = typeof after.receiptNo === 'string' ? after.receiptNo : undefined;
    let paymentNo = typeof after.paymentNo === 'string' ? after.paymentNo : undefined;
    let customerCode = typeof after.customerCode === 'string' ? after.customerCode : undefined;
    let tallyTaskNo = typeof after.taskNo === 'string' ? after.taskNo : undefined;
    let returnWorkTask: {
      sourceRequestId: string;
      ownerUserId: string;
      receivableSourceType: string;
      receivableId: string;
      waterReceiptId: string;
      shipmentId?: string;
      title: string;
      body: string;
      openedAt: Date;
    } | undefined;

    if (row.action.startsWith('finance.water_receipt.match_request.')) {
      const request = await this.prisma.waterReceiptMatchRequest.findUnique({
        where: { id: row.target },
        select: {
          requestedByUserId: true,
          shipmentId: true,
          receivableSourceType: true,
          receivableFinanceItemId: true,
          receivableFeeId: true,
          shipment: { select: { systemOrderNo: true } },
          waterReceipt: { select: { id: true, receiptNo: true, paymentNo: true, customerCode: true } }
        }
      });
      if (!request) return { status: 'SKIPPED', recipientCount: 0 };
      if (request.requestedByUserId) directRecipientIds.push(request.requestedByUserId);
      shipmentId = request.shipmentId;
      receiptNo ||= request.waterReceipt.receiptNo;
      paymentNo ||= request.waterReceipt.paymentNo ?? undefined;
      customerCode ||= request.waterReceipt.customerCode ?? undefined;
      after.systemOrderNo ||= request.shipment.systemOrderNo;
      targetEntityId = request.shipmentId;
      const receivableId = request.receivableSourceType === 'SYSTEM'
        ? request.receivableFeeId
        : request.receivableFinanceItemId;
      if (row.action === 'finance.water_receipt.match_request.reject' && request.requestedByUserId && receivableId) {
        const rejectionReason = typeof after.rejectionReason === 'string' ? after.rejectionReason.trim() : '';
        returnWorkTask = {
          sourceRequestId: row.target,
          ownerUserId: request.requestedByUserId,
          receivableSourceType: request.receivableSourceType,
          receivableId,
          waterReceiptId: request.waterReceipt.id,
          shipmentId: request.shipmentId,
          title: `运单 ${request.shipment.systemOrderNo} 的水单匹配待修改`,
          body: rejectionReason ? `财务已驳回该匹配申请：${rejectionReason}` : '财务已驳回该匹配申请，请核对后重新提交。',
          openedAt: row.createdAt
        };
      }
    } else if (row.action === 'finance.water_receipt.arrive') {
      const receipt = await this.prisma.waterReceipt.findUnique({ where: { id: row.target }, select: { createdByUserId: true, receiptNo: true, paymentNo: true, customerCode: true } });
      if (!receipt) return { status: 'SKIPPED', recipientCount: 0 };
      if (receipt.createdByUserId) directRecipientIds.push(receipt.createdByUserId);
      receiptNo ||= receipt.receiptNo;
      paymentNo ||= receipt.paymentNo ?? undefined;
      customerCode ||= receipt.customerCode ?? undefined;
    } else if (row.action === 'warehouse.package.update') {
      const pkg = await this.prisma.warehousePackage.findUnique({ where: { id: row.target }, select: { shipmentId: true, systemOrderNo: true, salesperson: true, customerCode: true } });
      if (!pkg) return { status: 'SKIPPED', recipientCount: 0 };
      shipmentId = pkg.shipmentId ?? undefined;
      after.systemOrderNo ||= pkg.systemOrderNo ?? undefined;
      ownerUsernames.push(pkg.salesperson ?? undefined);
      customerCode ||= pkg.customerCode;
    } else if (row.action === 'warehouse.tally.complete') {
      const task = await this.prisma.warehouseTallyTask.findUnique({ where: { id: row.target }, select: { taskNo: true, salesperson: true, customerCode: true } });
      if (!task) return { status: 'SKIPPED', recipientCount: 0 };
      tallyTaskNo ||= task.taskNo;
      ownerUsernames.push(task.salesperson ?? undefined);
      customerCode ||= task.customerCode;
    }

    const actionUsesTargetShipment = row.action.startsWith('shipment.review.') || row.action === 'shipment.dispatch';
    if (!shipmentId && actionUsesTargetShipment) shipmentId = row.target;
    const shipment = shipmentId ? await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { id: true, systemOrderNo: true, entryBy: true, customer: { select: { salesperson: true } } }
    }) : null;
    if (shipment) {
      after.systemOrderNo ||= shipment.systemOrderNo;
      ownerUsernames.push(shipment.entryBy ?? undefined, shipment.customer.salesperson ?? undefined);
    }
    const reason = [after.reason, after.rejectReason, after.rejectionReason, after.reverseReason]
      .find((value): value is string => typeof value === 'string' && Boolean(value.trim()));
    const template = buildBusinessEventNotification(row.action, {
      actorName: actor?.name || actor?.username || '系统操作人',
      systemOrderNo: typeof after.systemOrderNo === 'string' ? after.systemOrderNo : undefined,
      receiptNo,
      paymentNo,
      customerCode,
      reason,
      manualException: typeof after.manualException === 'string' ? after.manualException : undefined,
      previousManualException: typeof before.manualException === 'string' ? before.manualException : undefined,
      tallyTaskNo
    });
    if (!template) return { status: 'SKIPPED', recipientCount: 0 };
    if (template.targetEntityType === 'SHIPMENT' && shipmentId) targetEntityId = shipmentId;
    const uniqueOwnerUsernames = [...new Set(ownerUsernames.map((value) => value?.trim()).filter(Boolean) as string[])];
    const hasIntendedRecipientReference = directRecipientIds.length > 0 || uniqueOwnerUsernames.length > 0;
    const hasIntendedNonActorReference = directRecipientIds.some((userId) => userId !== row.actorId)
      || uniqueOwnerUsernames.some((username) => username !== actor?.username);
    const eligibleUsers = uniqueOwnerUsernames.length || directRecipientIds.length ? await this.prisma.user.findMany({
      where: {
        enabled: true,
        customerId: null,
        role: { name: { not: 'CUSTOMER' } },
        OR: [
          ...(uniqueOwnerUsernames.length ? [{ username: { in: uniqueOwnerUsernames } }] : []),
          ...(directRecipientIds.length ? [{ id: { in: directRecipientIds } }] : [])
        ]
      },
      select: { id: true }
    }) : [];
    const candidateIds = [...new Set(eligibleUsers.map((user) => user.id))].filter((userId) => userId !== row.actorId);
    if (!candidateIds.length && hasIntendedRecipientReference && !hasIntendedNonActorReference) {
      return { status: 'SKIPPED', recipientCount: 0 };
    }
    const disabledPreferences = template.mandatory || !candidateIds.length ? [] : await this.prisma.notificationPreference.findMany({
      where: { userId: { in: candidateIds }, category: template.category, enabled: false }, select: { userId: true }
    });
    const disabledIds = new Set(disabledPreferences.map((preference) => preference.userId));
    const recipientIds = candidateIds.filter((id) => !disabledIds.has(id));
    if (!recipientIds.length) {
      if (template.mandatory) throw new Error('强制通知暂无可用收件人，请修复业务归属或启用收件账号后重试');
      return { status: 'NO_RECIPIENT', recipientCount: 0 };
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        const notification = await tx.notification.create({
          data: {
            kind: 'BUSINESS',
            type: template.type,
            category: template.category,
            severity: template.severity,
            title: template.title,
            body: template.body,
            actorId: row.actorId,
            actorName: actor?.name || actor?.username,
            sourceType: template.targetEntityType,
            sourceId: row.target,
            targetModule: template.targetModule,
            targetSection: template.targetSection,
            targetEntityType: template.targetEntityType,
            targetEntityId,
            dedupeKey,
            createdAt: row.createdAt
          }
        });
        await tx.notificationDelivery.createMany({
          data: recipientIds.map((userId) => ({ notificationId: notification.id, userId, deliveredAt: row.createdAt })),
          skipDuplicates: true
        });
        if (returnWorkTask && recipientIds.includes(returnWorkTask.ownerUserId)) {
          const watermark = await tx.notificationActionTaskWatermark.upsert({
            where: {
              ownerUserId_receivableSourceType_receivableId: {
                ownerUserId: returnWorkTask.ownerUserId,
                receivableSourceType: returnWorkTask.receivableSourceType,
                receivableId: returnWorkTask.receivableId
              }
            },
            update: {},
            create: {
              ownerUserId: returnWorkTask.ownerUserId,
              receivableSourceType: returnWorkTask.receivableSourceType,
              receivableId: returnWorkTask.receivableId
            }
          });
          if (!isAuditEventLater(watermark.lastSubmissionAt, watermark.lastSubmissionAuditLogId, row.createdAt, row.id)) {
            await tx.notificationActionTask.upsert({
              where: { sourceRequestId: returnWorkTask.sourceRequestId },
              update: {},
              create: {
                ...returnWorkTask,
                type: 'FINANCE_WATER_RECEIPT_MATCH_RESUBMIT',
                targetModule: 'finance',
                targetSection: 'water-receipts',
                targetEntityType: 'WATER_RECEIPT',
                targetEntityId: returnWorkTask.waterReceiptId,
                status: 'OPEN'
              }
            });
          }
        }
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      const raced = await this.prisma.notification.findUnique({ where: { dedupeKey }, select: { _count: { select: { deliveries: true } } } });
      if (!raced) throw error;
      return { status: raced._count.deliveries ? 'PROCESSED' : 'NO_RECIPIENT', recipientCount: raced._count.deliveries };
    }
    return { status: 'PROCESSED', recipientCount: recipientIds.length };
  }

  private async resolveReturnWorkTasksFromSubmission(
    row: { id: string; actorId: string; createdAt: Date },
    after: Record<string, unknown>
  ) {
    const receivables = new Map<string, { receivableSourceType: string; receivableId: string }>();
    const matches = Array.isArray(after.matches) ? after.matches : [];
    for (const match of matches) {
      const item = asRecord(match as Prisma.JsonValue);
      const receivableSourceType = typeof item.receivableSourceType === 'string' ? item.receivableSourceType : undefined;
      const receivableId = typeof item.receivableId === 'string' ? item.receivableId : undefined;
      if (receivableSourceType && receivableId) {
        receivables.set(`${receivableSourceType}:${receivableId}`, { receivableSourceType, receivableId });
      }
    }
    if (!receivables.size) return;
    await this.prisma.$transaction(async (tx) => {
      for (const { receivableSourceType, receivableId } of receivables.values()) {
        const key = { ownerUserId: row.actorId, receivableSourceType, receivableId };
        await tx.notificationActionTaskWatermark.upsert({
          where: { ownerUserId_receivableSourceType_receivableId: key },
          update: {},
          create: key
        });
        const advanced = await tx.notificationActionTaskWatermark.updateMany({
          where: {
            ...key,
            OR: [
              { lastSubmissionAt: null },
              { lastSubmissionAt: { lt: row.createdAt } },
              { lastSubmissionAt: row.createdAt, lastSubmissionAuditLogId: { lt: row.id } }
            ]
          },
          data: { lastSubmissionAt: row.createdAt, lastSubmissionAuditLogId: row.id }
        });
        if (!advanced.count) continue;
        await tx.notificationActionTask.updateMany({
          where: {
            ownerUserId: row.actorId,
            type: 'FINANCE_WATER_RECEIPT_MATCH_RESUBMIT',
            status: 'OPEN',
            receivableSourceType,
            receivableId,
            openedAt: { lte: row.createdAt }
          },
          data: { status: 'RESOLVED', resolvedAt: new Date(), resolvedByAuditLogId: row.id }
        });
      }
    });
  }

  private mapDelivery(row: Prisma.NotificationDeliveryGetPayload<{ include: { notification: true } }>, principal: Principal): NotificationSummary {
    const notification = row.notification;
    return {
      id: row.id,
      kind: notification.kind as NotificationSummary['kind'],
      type: notification.type,
      category: notification.category as NotificationSummary['category'],
      severity: notification.severity as NotificationSummary['severity'],
      title: notification.title,
      body: notification.body,
      actorName: (principal.customerId || principal.role === 'CUSTOMER') && notification.kind === 'ANNOUNCEMENT' ? undefined : notification.actorName ?? undefined,
      sourceType: notification.sourceType ?? undefined,
      sourceId: notification.sourceId ?? undefined,
      targetModule: notification.targetModule ?? undefined,
      targetSection: notification.targetSection ?? undefined,
      targetEntityType: notification.targetEntityType ?? undefined,
      targetEntityId: notification.targetEntityId ?? undefined,
      targetPath: buildNotificationTargetPath(notification.targetModule, notification.targetSection, notification.targetEntityType, notification.targetEntityId),
      requiresAcknowledgement: notification.requiresAcknowledgement,
      deliveredAt: row.deliveredAt.toISOString(),
      readAt: optionalIso(row.readAt),
      acknowledgedAt: optionalIso(row.acknowledgedAt),
      archivedAt: optionalIso(row.archivedAt)
    };
  }

  private normalizeAnnouncementInput(input: AnnouncementCreateInput) {
    const requestId = input.requestId?.trim();
    if (!requestId || !/^[A-Za-z0-9:_-]{8,100}$/.test(requestId)) throw new BadRequestException('公告请求标识无效');
    const title = input.title?.trim();
    const body = input.body?.trim();
    if (!title) throw new BadRequestException('请填写公告标题');
    if (title.length > 100) throw new BadRequestException('公告标题不能超过 100 个字符');
    if (!body) throw new BadRequestException('请填写公告正文');
    if (body.length > 2000) throw new BadRequestException('公告正文不能超过 2000 个字符');
    if (!isNotificationSeverity(input.severity)) throw new BadRequestException('公告级别无效');
    if (!isAnnouncementAudienceType(input.audienceType)) throw new BadRequestException('公告受众类型无效');
    const audienceValues = [...new Set((input.audienceValues ?? []).map((value) => value.trim()).filter(Boolean))];
    if (['ROLE', 'DEPARTMENT', 'SITE', 'USERS'].includes(input.audienceType) && !audienceValues.length) {
      throw new BadRequestException('请选择公告受众');
    }
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : undefined;
    if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date())) {
      throw new BadRequestException('公告过期时间必须晚于当前时间');
    }
    return {
      requestId,
      title,
      body,
      severity: input.severity,
      audienceType: input.audienceType,
      audienceValues,
      requiresAcknowledgement: input.requiresAcknowledgement === true,
      expiresAt
    };
  }

  private async resolveAnnouncementRecipients(audienceType: AnnouncementCreateInput['audienceType'], values: string[]): Promise<string[]> {
    const where: Prisma.UserWhereInput = {
      enabled: true,
      ...(audienceType === 'STAFF' ? { customerId: null } : {}),
      ...(audienceType === 'CUSTOMER' ? { customerId: { not: null } } : {}),
      ...(['DEPARTMENT', 'SITE'].includes(audienceType) ? { customerId: null } : {}),
      ...(audienceType === 'ROLE' ? { role: { name: { in: values } } } : {}),
      ...(audienceType === 'DEPARTMENT' ? { departmentId: { in: values } } : {}),
      ...(audienceType === 'SITE' ? { site: { in: values } } : {}),
      ...(audienceType === 'USERS' ? { id: { in: values } } : {})
    };
    const users = await this.prisma.user.findMany({ where, select: { id: true } });
    return users.map((user) => user.id);
  }

  private async buildAnnouncementSummary(announcementId: string): Promise<AnnouncementSummary> {
    const row = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
      include: { notifications: { include: { deliveries: true } } }
    });
    if (!row) throw new NotFoundException('公告不存在');
    return this.mapAnnouncementSummary(row);
  }

  private mapAnnouncementSummary(row: Prisma.AnnouncementGetPayload<{ include: { notifications: { include: { deliveries: true } } } }>): AnnouncementSummary {
    const deliveries = row.notifications.flatMap((notification) => notification.deliveries);
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      severity: row.severity as AnnouncementSummary['severity'],
      audienceType: row.audienceType as AnnouncementSummary['audienceType'],
      audienceValues: Array.isArray(row.audienceValues) ? row.audienceValues.filter((value): value is string => typeof value === 'string') : [],
      status: row.status as AnnouncementSummary['status'],
      requiresAcknowledgement: row.requiresAcknowledgement,
      expiresAt: optionalIso(row.expiresAt),
      publishedAt: row.publishedAt.toISOString(),
      withdrawnAt: optionalIso(row.withdrawnAt),
      recipientCount: deliveries.length,
      readCount: deliveries.filter((delivery) => delivery.readAt).length,
      acknowledgedCount: deliveries.filter((delivery) => delivery.acknowledgedAt).length
    };
  }
}

@Injectable()
export class InMemoryNotificationService extends NotificationService {
  private readonly deliveries = new Map<string, NotificationSummary[]>();
  private readonly announcements: AnnouncementSummary[] = [];
  private readonly announcementRequests = new Map<string, { principalId: string; announcementId: string }>();
  private readonly preferences = new Map<string, Map<string, boolean>>();

  async getUnreadSummary(principal: Principal): Promise<NotificationUnreadSummary> {
    const unreadCount = (this.deliveries.get(principal.id) ?? []).filter((item) => !item.readAt).length;
    return { unreadCount, displayCount: unreadCount > 99 ? '99+' : String(unreadCount) };
  }

  async listNotifications(principal: Principal, filter: NotificationFilter = {}): Promise<NotificationListResponse> {
    const all = this.deliveries.get(principal.id) ?? [];
    const page = Math.max(1, filter.page || 1);
    const pageSize = Math.min(50, Math.max(10, filter.pageSize || 20));
    const keyword = filter.keyword?.trim().toLowerCase();
    const filtered = all.filter((item) => {
      if (filter.status === 'ARCHIVED' ? !item.archivedAt : Boolean(item.archivedAt)) return false;
      return (filter.status !== 'UNREAD' || !item.readAt)
        && (!filter.category || filter.category === 'ALL' || item.category === filter.category)
        && (!keyword || `${item.title}\n${item.body}`.toLowerCase().includes(keyword));
    });
    const items = filtered.slice((page - 1) * pageSize, page * pageSize);
    return { items, total: filtered.length, unreadCount: all.filter((item) => !item.readAt && !item.archivedAt).length, page, pageSize, hasMore: page * pageSize < filtered.length };
  }
  async listActionTasks(_principal: Principal): Promise<NotificationActionTaskListResponse> { return { items: [], total: 0 }; }

  async markRead(principal: Principal, deliveryId: string) { return this.patch(principal, deliveryId, { readAt: new Date().toISOString() }); }
  async markAllRead(principal: Principal) {
    const items = this.deliveries.get(principal.id) ?? [];
    const now = new Date().toISOString();
    const updatedCount = items.filter((item) => !item.readAt).length;
    items.forEach((item) => { item.readAt ||= now; });
    return { ok: true as const, updatedCount };
  }
  async archive(principal: Principal, deliveryId: string) {
    const items = this.deliveries.get(principal.id) ?? [];
    const row = items.find((item) => item.id === deliveryId);
    if (!row) throw new NotFoundException('消息不存在');
    if (row.requiresAcknowledgement && !row.acknowledgedAt) throw new BadRequestException('请先确认知晓后再归档');
    row.archivedAt = new Date().toISOString();
    row.readAt ||= row.archivedAt;
    return { ok: true as const };
  }
  async restore(principal: Principal, deliveryId: string) { return this.patch(principal, deliveryId, { archivedAt: undefined }); }
  async acknowledge(principal: Principal, deliveryId: string) {
    const now = new Date().toISOString();
    return this.patch(principal, deliveryId, { readAt: now, acknowledgedAt: now });
  }
  async getPreferences(principal: Principal): Promise<NotificationPreferenceSummary[]> {
    const allowed = principal.customerId || principal.role === 'CUSTOMER' ? ['ANNOUNCEMENT'] : notificationCategories;
    const values = this.preferences.get(principal.id) ?? new Map<string, boolean>();
    return allowed.map((category) => ({ category: category as NotificationPreferenceSummary['category'], enabled: values.get(category) ?? true, locked: false, label: notificationCategoryLabels[category as keyof typeof notificationCategoryLabels] }));
  }
  async updatePreferences(principal: Principal, input: { category: string; enabled: boolean }[]): Promise<NotificationPreferenceSummary[]> {
    const allowed = new Set<string>(principal.customerId || principal.role === 'CUSTOMER' ? ['ANNOUNCEMENT'] : notificationCategories);
    if (input.some((item) => !allowed.has(item.category) || typeof item.enabled !== 'boolean')) throw new BadRequestException('通知偏好包含无效分类');
    const values = this.preferences.get(principal.id) ?? new Map<string, boolean>();
    input.forEach((item) => values.set(item.category, item.enabled));
    this.preferences.set(principal.id, values);
    return this.getPreferences(principal);
  }
  async getAnnouncementAudienceOptions(): Promise<AnnouncementAudienceOptions> { return { roles: [], departments: [], sites: [], users: [] }; }
  async createAnnouncement(principal: Principal, input: AnnouncementCreateInput): Promise<AnnouncementSummary> {
    const requestId = input.requestId?.trim();
    if (!requestId) throw new BadRequestException('公告请求标识无效');
    const existingRequest = this.announcementRequests.get(requestId);
    if (existingRequest) {
      if (existingRequest.principalId !== principal.id) throw new BadRequestException('公告请求标识已被占用');
      const existing = this.announcements.find((item) => item.id === existingRequest.announcementId);
      if (existing) return existing;
    }
    const now = new Date().toISOString();
    const id = `announcement-${Date.now()}`;
    const summary: AnnouncementSummary = { id, title: input.title, body: input.body, severity: input.severity, audienceType: input.audienceType, audienceValues: input.audienceValues ?? [], status: 'PUBLISHED', requiresAcknowledgement: input.requiresAcknowledgement === true, expiresAt: input.expiresAt, publishedAt: now, recipientCount: 1, readCount: 0, acknowledgedCount: 0 };
    this.announcements.unshift(summary);
    this.announcementRequests.set(requestId, { principalId: principal.id, announcementId: id });
    const item: NotificationSummary = { id: `delivery-${id}`, kind: 'ANNOUNCEMENT', type: 'system.announcement.published', category: 'ANNOUNCEMENT', severity: input.severity, title: input.title, body: input.body, requiresAcknowledgement: input.requiresAcknowledgement === true, deliveredAt: now };
    this.deliveries.set(principal.id, [item, ...(this.deliveries.get(principal.id) ?? [])]);
    return summary;
  }
  async listAnnouncements(): Promise<AnnouncementSummary[]> { return this.announcements; }
  async withdrawAnnouncement(_principal: Principal, announcementId: string): Promise<AnnouncementSummary> {
    const row = this.announcements.find((item) => item.id === announcementId);
    if (!row) throw new NotFoundException('公告不存在');
    row.status = 'WITHDRAWN';
    row.withdrawnAt = new Date().toISOString();
    return row;
  }
  async listOperations(): Promise<NotificationOperationsResponse> {
    return { items: [], total: 0, counts: { PENDING: 0, PROCESSING: 0, PROCESSED: 0, SKIPPED: 0, NO_RECIPIENT: 0, FAILED: 0, DEAD_LETTER: 0 } };
  }
  async retryOperation(): Promise<{ ok: true }> { return { ok: true }; }

  private async patch(principal: Principal, deliveryId: string, patch: Partial<NotificationSummary>) {
    const row = (this.deliveries.get(principal.id) ?? []).find((item) => item.id === deliveryId);
    if (!row) throw new NotFoundException('消息不存在');
    Object.assign(row, patch);
    return { ok: true as const };
  }
}

@Injectable()
export class NotificationAuditWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationAuditWorker.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(@Inject(NotificationService) private readonly notifications: NotificationService) {}

  onModuleInit() {
    void this.run();
    this.timer = setInterval(() => void this.run(), 10_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async run() {
    if (this.running) return;
    this.running = true;
    try {
      await this.notifications.processPendingAuditEvents();
    } catch (error) {
      // 审核业务已经提交，消息桥失败时保留游标并在下一轮自动重试。
      this.logger.warn(`站内信审核事件同步失败，将自动重试：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.running = false;
    }
  }
}
