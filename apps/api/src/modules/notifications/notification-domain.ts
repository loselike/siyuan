import type { AnnouncementAudienceType, NotificationCategory, NotificationSeverity } from './notification.types.js';

export const notificationSeverities = ['INFO', 'SUCCESS', 'WARNING', 'CRITICAL'] as const;
export const announcementAudienceTypes = ['ALL', 'STAFF', 'CUSTOMER', 'ROLE', 'DEPARTMENT', 'SITE', 'USERS'] as const;

export interface ShipmentReviewNotificationTemplate {
  type: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  body: string;
  targetSection: string;
}

export interface BusinessEventNotificationContext {
  actorName: string;
  systemOrderNo?: string;
  receiptNo?: string;
  paymentNo?: string;
  customerCode?: string;
  reason?: string;
  manualException?: string;
  previousManualException?: string;
  tallyTaskNo?: string;
}

export interface BusinessEventNotificationTemplate extends ShipmentReviewNotificationTemplate {
  targetModule: string;
  targetEntityType: string;
  mandatory: boolean;
}

export const stationNotificationAuditActions = [
  'shipment.review.business_approve',
  'shipment.review.reject',
  'shipment.review.reverse',
  'finance.water_receipt.arrive',
  'finance.water_receipt.match_request.submit',
  'finance.water_receipt.match_request.fee_approve',
  'finance.water_receipt.match_request.fee_reverse',
  'finance.water_receipt.match_request.reject',
  'finance.receivable.audit',
  'finance.receivable.reverse_audit',
  'warehouse.package.update',
  'warehouse.tally.complete',
  'shipment.dispatch',
  'customer_service.issue.attach',
  'customer_service.issue.update',
  'customer_service.issue.close'
] as const;

export function isNotificationSeverity(value: string): value is NotificationSeverity {
  return notificationSeverities.includes(value as NotificationSeverity);
}

export function isAnnouncementAudienceType(value: string): value is AnnouncementAudienceType {
  return announcementAudienceTypes.includes(value as AnnouncementAudienceType);
}

export function buildShipmentReviewNotification(
  action: string,
  systemOrderNo: string,
  actorName: string,
  reason?: string
): ShipmentReviewNotificationTemplate | null {
  if (action === 'shipment.review.business_approve') {
    return {
      type: 'shipment.review.approved',
      category: 'ORDER',
      severity: 'SUCCESS',
      title: `运单 ${systemOrderNo} 已审核通过`,
      body: `${actorName} 已完成审核，运单已进入待排货。`,
      targetSection: 'order-management'
    };
  }
  if (action === 'shipment.review.reject') {
    return {
      type: 'shipment.review.rejected',
      category: 'ORDER',
      severity: 'WARNING',
      title: `运单 ${systemOrderNo} 审核未通过`,
      body: reason ? `${actorName} 已退回该运单：${reason}` : `${actorName} 已退回该运单，请补充资料后重新提交。`,
      targetSection: 'pending-review'
    };
  }
  if (action === 'shipment.review.reverse') {
    return {
      type: 'shipment.review.reversed',
      category: 'ORDER',
      severity: 'WARNING',
      title: `运单 ${systemOrderNo} 已被反审核`,
      body: reason ? `${actorName} 已反审核该运单：${reason}` : `${actorName} 已反审核该运单，订单已回到待审核。`,
      targetSection: 'pending-review'
    };
  }
  return null;
}

export function buildBusinessEventNotification(
  action: string,
  context: BusinessEventNotificationContext
): BusinessEventNotificationTemplate | null {
  const orderNo = context.systemOrderNo || '相关运单';
  const shipmentReview = buildShipmentReviewNotification(action, orderNo, context.actorName, context.reason);
  if (shipmentReview) {
    return {
      ...shipmentReview,
      targetModule: 'business',
      targetEntityType: 'SHIPMENT',
      mandatory: action !== 'shipment.review.business_approve'
    };
  }
  if (action === 'finance.water_receipt.arrive') {
    const reference = context.paymentNo || context.receiptNo || '水单';
    return {
      type: 'finance.water_receipt.arrived', category: 'FINANCE', severity: 'SUCCESS',
      title: `${reference} 已确认到账`,
      body: `${context.actorName} 已确认客户 ${context.customerCode || '-'} 的水单到账，可继续进行费用匹配。`,
      targetModule: 'finance', targetSection: 'water-receipt-arrivals', targetEntityType: 'WATER_RECEIPT', mandatory: false
    };
  }
  if (action === 'finance.water_receipt.match_request.fee_approve') {
    return {
      type: 'finance.match_request.approved', category: 'FINANCE', severity: 'SUCCESS',
      title: `运单 ${orderNo} 的水单匹配已审核`,
      body: `${context.actorName} 已审核通过该费用的水单匹配。`,
      targetModule: 'business', targetSection: 'order-management', targetEntityType: 'SHIPMENT', mandatory: false
    };
  }
  if (action === 'finance.water_receipt.match_request.fee_reverse') {
    return {
      type: 'finance.match_request.reversed', category: 'FINANCE', severity: 'WARNING',
      title: `运单 ${orderNo} 的水单匹配已反审核`,
      body: context.reason ? `${context.actorName} 已反审核：${context.reason}` : `${context.actorName} 已反审核该费用的水单匹配，请重新核对。`,
      targetModule: 'business', targetSection: 'order-management', targetEntityType: 'SHIPMENT', mandatory: true
    };
  }
  if (action === 'finance.water_receipt.match_request.reject') {
    return {
      type: 'finance.match_request.rejected', category: 'FINANCE', severity: 'WARNING',
      title: `运单 ${orderNo} 的水单匹配被退回`,
      body: context.reason ? `${context.actorName} 已退回：${context.reason}` : `${context.actorName} 已退回该费用的水单匹配，请修改后重新提交。`,
      targetModule: 'business', targetSection: 'order-management', targetEntityType: 'SHIPMENT', mandatory: true
    };
  }
  if (action === 'finance.receivable.audit') {
    return {
      type: 'finance.receivable.approved', category: 'FINANCE', severity: 'SUCCESS',
      title: `运单 ${orderNo} 的应收费用已审核`, body: `${context.actorName} 已完成应收费用审核。`,
      targetModule: 'business', targetSection: 'order-management', targetEntityType: 'SHIPMENT', mandatory: false
    };
  }
  if (action === 'finance.receivable.reverse_audit') {
    return {
      type: 'finance.receivable.reversed', category: 'FINANCE', severity: 'WARNING',
      title: `运单 ${orderNo} 的应收费用已反审核`,
      body: context.reason ? `${context.actorName} 已反审核：${context.reason}` : `${context.actorName} 已反审核该应收费用，请重新核对。`,
      targetModule: 'business', targetSection: 'order-management', targetEntityType: 'SHIPMENT', mandatory: true
    };
  }
  if (action === 'warehouse.package.update' && context.manualException !== context.previousManualException) {
    const hasException = Boolean(context.manualException?.trim());
    return {
      type: hasException ? 'warehouse.package.exception_reported' : 'warehouse.package.exception_cleared',
      category: 'WAREHOUSE', severity: hasException ? 'WARNING' : 'SUCCESS',
      title: hasException ? `${orderNo} 的在仓货物出现异常` : `${orderNo} 的在仓异常已解除`,
      body: hasException ? `${context.actorName} 标记异常：${context.manualException}` : `${context.actorName} 已解除该货物的手工异常标记。`,
      targetModule: 'warehouse', targetSection: 'in-stock', targetEntityType: 'WAREHOUSE_PACKAGE', mandatory: hasException
    };
  }
  if (action === 'warehouse.tally.complete') {
    return {
      type: 'warehouse.tally.completed', category: 'WAREHOUSE', severity: 'SUCCESS',
      title: `${context.tallyTaskNo || '理货任务'} 已完成`, body: `${context.actorName} 已完成理货，相关货物数据已更新。`,
      targetModule: 'warehouse', targetSection: 'in-stock', targetEntityType: 'WAREHOUSE_TALLY', mandatory: false
    };
  }
  if (action === 'shipment.dispatch') {
    return {
      type: 'warehouse.shipment.dispatched', category: 'WAREHOUSE', severity: 'SUCCESS',
      title: `运单 ${orderNo} 已出库`, body: `${context.actorName} 已完成出库交接。`,
      targetModule: 'business', targetSection: 'order-management', targetEntityType: 'SHIPMENT', mandatory: false
    };
  }
  if (action === 'customer_service.issue.attach') {
    return {
      type: 'customer_service.issue.created', category: 'CUSTOMER_SERVICE', severity: 'WARNING',
      title: `运单 ${orderNo} 新增问题件`, body: `${context.actorName} 已登记问题件，请关注后续处理。`,
      targetModule: 'business', targetSection: 'order-management', targetEntityType: 'SHIPMENT', mandatory: true
    };
  }
  if (action === 'customer_service.issue.update') {
    return {
      type: 'customer_service.issue.updated', category: 'CUSTOMER_SERVICE', severity: 'INFO',
      title: `运单 ${orderNo} 的问题件有新进展`, body: `${context.actorName} 已更新问题件处理记录。`,
      targetModule: 'business', targetSection: 'order-management', targetEntityType: 'SHIPMENT', mandatory: false
    };
  }
  if (action === 'customer_service.issue.close') {
    return {
      type: 'customer_service.issue.closed', category: 'CUSTOMER_SERVICE', severity: 'SUCCESS',
      title: `运单 ${orderNo} 的问题件已关闭`, body: `${context.actorName} 已完成问题件处理。`,
      targetModule: 'business', targetSection: 'order-management', targetEntityType: 'SHIPMENT', mandatory: false
    };
  }
  return null;
}

export function buildNotificationTargetPath(
  targetModule?: string | null,
  targetSection?: string | null,
  targetEntityType?: string | null,
  targetEntityId?: string | null
): string | undefined {
  if (!targetModule || !/^[a-z][a-z0-9-]*$/i.test(targetModule)) return undefined;
  if (targetSection && !/^[a-z][a-z0-9-]*$/i.test(targetSection)) return undefined;
  const path = `/app/${targetModule}${targetSection ? `/${targetSection}` : ''}`;
  if (!targetEntityType || !targetEntityId) return path;
  if (!/^[A-Z][A-Z0-9_]*$/.test(targetEntityType) || !/^[A-Za-z0-9_-]{1,128}$/.test(targetEntityId)) return path;
  const params = new URLSearchParams({ notificationEntityType: targetEntityType, notificationEntityId: targetEntityId });
  return `${path}?${params.toString()}`;
}
