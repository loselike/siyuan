import {
  canTransitionShipment,
  getAvailableFulfillmentActions,
  hasPricingWorkspaceCapability,
  type FulfillmentAction,
  type Shipment,
  type StaffMenuKey
} from '@siyuan/shared';
import type { PermissionKey, RoleKey } from '../../apiClient';
import { formatCurrency, formatUsd } from '../shared/format';
import { demoOperationalNow, menuItems } from './config';

export function getRoleDisplayName(role: RoleKey) {
  const labels: Record<RoleKey, string> = {
    ADMIN: '管理员组',
    CUSTOMER_SERVICE: '客服',
    OPERATOR: '业务员',
    WAREHOUSE: '仓库',
    FINANCE: '财务',
    CUSTOMER: '客户'
  };
  return labels[role];
}

export function getVisibleStaffMenuKeysByPermissions(permissions: PermissionKey[], role: RoleKey): StaffMenuKey[] {
  if (role === 'ADMIN') {
    return menuItems.map((item) => item.key);
  }
  const permissionSet = new Set(permissions);
  const canAny = (...keys: PermissionKey[]) => keys.some((key) => permissionSet.has(key));
  const rules: Array<[StaffMenuKey, boolean]> = [
    ['workspace', canAny(
      'operations:line-shipment:view',
      'operations:ai-queue:view',
      'operations:product-map:view',
      'operations:import-quality:view'
    )],
    ['pricing', hasPricingWorkspaceCapability(permissions)],
    ['business', role !== 'CUSTOMER' && canAny(
      'business:dashboard:view',
      'business:order-entry:view',
      'business:review:view',
      'business:shipment:list',
      'business:order-ai:view'
    )],
    ['receive', canAny(
      'warehouse:today-receipt:view',
      'warehouse:in-stock:view',
      'warehouse:tally-pending:view',
      'warehouse:tally-completed:view',
      'warehouse:dispatch-pending:view',
      'warehouse:outbounded:view'
    )],
    ['market', canAny(
      'market:dashboard:view',
      'market:pending-routing:view',
      'market:routed:view',
      'market:weekly-routing:view'
    )],
    ['customerService', canAny('customer-service:dashboard:view', 'customer-service:data-confirm:view', 'customer-service:transfer:view', 'customer-service:pending-routing:view', 'customer-service:waiting-departure:view', 'customer-service:departed:view', 'customer-service:arrived-port:view', 'customer-service:delivering:view', 'customer-service:signed:view', 'customer-service:problem:view')],
    ['logisticsTracking', canAny('tracking:carrier-task:view', 'tracking:external:view')],
    ['finance', canAny('finance:dashboard:view', 'finance:receivable:read', 'finance:business-cost:read', 'finance:payable:read', 'finance:pending-payment:read', 'finance:paid-payment:read', 'finance:water-receipt:read', 'finance:water-match:read', 'finance:agent-bill:read')],
    ['miscFees', permissions.some((permission) => permission.startsWith('misc-fee:') && permission.endsWith(':read'))],
    ['master', canAny('master-data:customers:read', 'master-data:finance:read', 'master-data:agents:read', 'master-data:agent-channels:read', 'master-data:channels:read', 'master-data:channel-categories:read', 'master-data:remote-areas:read', 'master-data:exchange-rates:read', 'master-data:assistant:read')],
    ['settings', canAny('system:user-groups:read', 'system:accounts:read', 'system:sites:read', 'system:audit:read', 'system:role-permissions:read', 'system:security:read', 'system:ai-security:read', 'system:base-config:read')]
  ];
  return rules.filter(([, visible]) => visible).map(([key]) => key);
}

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function downloadHtmlFile(html: string, fileName: string, mimeType: string) {
  const blob = new globalThis.Blob([html], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function formatPaymentSummary(usd?: number, cny?: number) {
  const usdText = usd === undefined ? 'USD 未知' : formatUsd(usd);
  const cnyText = cny === undefined ? 'RMB 未知' : formatCurrency(cny);
  return `${usdText} / ${cnyText}`;
}

export const fulfillmentActionLabels: Record<FulfillmentAction, string> = {
  'confirm-declare': '审核通过',
  'reject-declare': '审核不通过',
  'confirm-receive': '确认收货',
  'assign-route': '分配渠道',
  'confirm-dispatch': '确认出库',
  'fill-transfer-no': '填写转单号',
  'add-tracking': '添加轨迹',
  'mark-return': '标记退货',
  'create-problem': '创建问题件'
};

export function resolveFulfillmentAction(record: Shipment, action: FulfillmentAction): {
  ok: boolean;
  message: string;
  patch?: Partial<Shipment>;
} {
  if (!getAvailableFulfillmentActions({ status: record.status, hasTransferNo: Boolean(record.transferNo) }).includes(action)) {
    return { ok: false, message: `当前状态不允许执行${fulfillmentActionLabels[action]}` };
  }

  if (action === 'confirm-receive') {
    if (!canTransitionShipment(record.status, 'WAITING_RECEIVE')) {
      return { ok: false, message: `当前状态不允许执行${fulfillmentActionLabels[action]}` };
    }
    return {
      ok: true,
      message: '已确认收货，进入已入库',
      patch: { status: 'WAITING_RECEIVE', latestTracking: '收货扫描', trackingStaleDays: 0 }
    };
  }

  if (action === 'confirm-declare') {
    if (!canTransitionShipment(record.status, 'WAITING_SORT')) {
      return { ok: false, message: `当前状态不允许执行${fulfillmentActionLabels[action]}` };
    }
    return {
      ok: true,
      message: '已审核通过，进入待排货',
      patch: { status: 'WAITING_SORT', latestTracking: '审核通过，等待渠道排货', trackingStaleDays: 0 }
    };
  }

  if (action === 'reject-declare') {
    if (!canTransitionShipment(record.status, 'REVIEW_REJECTED')) {
      return { ok: false, message: `当前状态不允许执行${fulfillmentActionLabels[action]}` };
    }
    return {
      ok: true,
      message: '已审核不通过，等待业务员修改资料',
      patch: { status: 'REVIEW_REJECTED', latestTracking: '审核不通过，资料需修改后重新提交', trackingStaleDays: 0 }
    };
  }

  if (action === 'assign-route') {
    return {
      ok: true,
      message: '已分配渠道，进入仓库管理的面单队列&待仓库出货',
      patch: { status: 'WAITING_DISPATCH', channelName: record.channelName || 'AI 推荐渠道' }
    };
  }

  if (action === 'confirm-dispatch') {
    return {
      ok: true,
      message: '已确认出库，等待客服补齐转单号',
      patch: { status: 'OUTBOUNDED', latestTracking: '仓库已出库，等待客服补齐转单号', dispatchedAt: demoOperationalNow }
    };
  }

  if (action === 'fill-transfer-no') {
    return {
      ok: true,
      message: '已填写转单号，进入待离港',
      patch: { transferNo: `${record.carrier}${record.systemOrderNo.slice(-6)}`, status: 'WAITING_DEPARTURE' }
    };
  }

  if (action === 'add-tracking') {
    return {
      ok: true,
      message: '已添加轨迹',
      patch: { latestTracking: '人工新增轨迹', trackingStaleDays: 0 }
    };
  }

  if (action === 'mark-return') {
    return {
      ok: true,
      message: '已标记退货',
      patch: { status: 'WAITING_RETURN', latestTracking: '已标记退货' }
    };
  }

  if (action === 'create-problem') {
    return {
      ok: true,
      message: '已创建问题件',
      patch: { status: 'PROBLEM', hasProblemTicket: true, latestTracking: '新建问题件' }
    };
  }

  return { ok: false, message: `当前状态不允许执行${fulfillmentActionLabels[action]}` };
}
