export type BuiltinRoleKey = 'ADMIN' | 'CUSTOMER_SERVICE' | 'OPERATOR' | 'WAREHOUSE' | 'FINANCE' | 'CUSTOMER';
export type RoleKey = BuiltinRoleKey | (string & {});
export type PermissionKey =
  | 'operations:line-shipment:view'
  | 'operations:line-shipment:detail'
  | 'operations:line-shipment:process'
  | 'operations:line-shipment:status-update'
  | 'operations:line-shipment:tracking-add'
  | 'operations:line-shipment:problem-create'
  | 'operations:line-shipment:import'
  | 'operations:line-shipment:internal-log-view'
  | 'operations:line-shipment:export'
  | 'operations:ai-queue:view'
  | 'operations:ai-queue:assist'
  | 'operations:ai-queue:mark-read'
  | 'operations:ai-queue:handle'
  | 'operations:product-map:view'
  | 'operations:product-map:route-view'
  | 'operations:product-map:cost-sensitive-view'
  | 'operations:product-map:export'
  | 'operations:import-quality:view'
  | 'operations:import-quality:upload'
  | 'operations:import-quality:retry'
  | 'operations:import-quality:error-detail-view'
  | 'operations:import-quality:confirm'
  | 'business:dashboard:view'
  | 'business:dashboard:team-view'
  | 'business:dashboard:all-view'
  | 'business:dashboard:trend-view'
  | 'business:dashboard:pending-review-summary'
  | 'business:order-entry:view'
  | 'business:order-entry:warehouse-package-select'
  | 'business:order-entry:create'
  | 'business:order-entry:draft-view'
  | 'business:order-entry:draft-save'
  | 'business:order-entry:draft-delete'
  | 'business:order-entry:submit-review'
  | 'business:order-entry:invoice-upload'
  | 'business:order-entry:label-upload'
  | 'business:order-fee:view'
  | 'business:order-fee:create'
  | 'business:order-fee:update'
  | 'business:order-fee:delete'
  | 'business:order-fee:lock'
  | 'business:order-fee:unlock'
  | 'business:order-fee:profit-view'
  | 'business:review:list'
  | 'business:review:detail'
  | 'business:review:deleted-list'
  | 'business:review:approve'
  | 'business:review:reject'
  | 'business:review:reverse'
  | 'business:review:delete'
  | 'business:review:restore'
  | 'business:review:purge'
  | 'business:review:finance-detail-view'
  | 'business:review:operation-log-view'
  | 'business:shipment:list'
  | 'business:shipment:detail'
  | 'business:shipment:self-view'
  | 'business:shipment:team-view'
  | 'business:shipment:all-view'
  | 'business:shipment:update-basic'
  | 'business:shipment:update-operational'
  | 'business:shipment:delete'
  | 'business:shipment:payment-record'
  | 'business:shipment:tracking-add'
  | 'business:shipment:problem-create'
  | 'business:shipment:finance-detail-view'
  | 'business:shipment:receivable-view'
  | 'business:shipment:payable-view'
  | 'business:shipment:profit-view'
  | 'business:shipment:export'
  | 'business:shipment:column-setting'
  | 'business:order-ai:view'
  | 'business:order-ai:assist'
  | 'business:order-ai:finance-context'
  | 'business:order-ai:all-order-context'
  | 'business:order-ai:export-result'
  | 'market:dashboard:view'
  | 'market:dashboard:pending-summary'
  | 'market:dashboard:routed-summary'
  | 'market:dashboard:weekly-summary'
  | 'market:dashboard:agent-stats-view'
  | 'market:dashboard:channel-mode-stats-view'
  | 'market:dashboard:sensitive-summary-view'
  | 'market:dashboard:team-view'
  | 'market:dashboard:all-view'
  | 'market:pending-routing:view'
  | 'market:pending-routing:detail'
  | 'market:pending-routing:assign'
  | 'market:pending-routing:save-draft'
  | 'market:pending-routing:confirm'
  | 'market:pending-routing:audit'
  | 'market:pending-routing:update'
  | 'market:pending-routing:delete'
  | 'market:pending-routing:operation-log-view'
  | 'market:pending-routing:business-cost-view'
  | 'market:pending-routing:payable-cost-view'
  | 'market:pending-routing:agent-channel-view'
  | 'market:pending-routing:cost-field-view'
  | 'market:pending-routing:column-setting'
  | 'market:routed:view'
  | 'market:routed:detail'
  | 'market:routed:update'
  | 'market:routed:reroute'
  | 'market:routed:log-view'
  | 'market:routed:agent-cost-view'
  | 'market:routed:cost-total-view'
  | 'market:routed:agent-channel-view'
  | 'market:routed:column-setting'
  | 'market:weekly-routing:view'
  | 'market:weekly-routing:detail'
  | 'market:weekly-routing:agent-stats-view'
  | 'market:weekly-routing:channel-mode-stats-view'
  | 'market:weekly-routing:cost-view'
  | 'market:weekly-routing:reroute-stats-view'
  | 'market:weekly-routing:sensitive-stats-view'
  | 'market:weekly-routing:export'
  | 'market:weekly-routing:column-setting'
  | 'warehouse:today-receipt:view'
  | 'warehouse:today-receipt:filter'
  | 'warehouse:today-receipt:manual-create'
  | 'warehouse:today-receipt:update'
  | 'warehouse:today-receipt:remark-update'
  | 'warehouse:today-receipt:exception-manage'
  | 'warehouse:today-receipt:device-import'
  | 'warehouse:today-receipt:device-log-view'
  | 'warehouse:today-receipt:column-setting'
  | 'warehouse:in-stock:view'
  | 'warehouse:in-stock:update'
  | 'warehouse:in-stock:split'
  | 'warehouse:in-stock:batch-select'
  | 'warehouse:in-stock:tally-start'
  | 'warehouse:in-stock:batch-tally-start'
  | 'warehouse:in-stock:order-entry-select'
  | 'warehouse:in-stock:batch-order-entry'
  | 'warehouse:in-stock:tally-record-view'
  | 'warehouse:in-stock:column-setting'
  | 'warehouse:tally-pending:view'
  | 'warehouse:tally-pending:task-create'
  | 'warehouse:tally-pending:task-update'
  | 'warehouse:tally-pending:task-process'
  | 'warehouse:tally-pending:merge-only'
  | 'warehouse:tally-pending:merge-and-ship'
  | 'warehouse:tally-pending:split'
  | 'warehouse:tally-pending:detail-view'
  | 'warehouse:tally-pending:history-view'
  | 'warehouse:tally-pending:filter'
  | 'warehouse:tally-completed:view'
  | 'warehouse:tally-completed:history-view'
  | 'warehouse:tally-completed:detail-view'
  | 'warehouse:tally-label:generate'
  | 'warehouse:tally-label:reprint'
  | 'warehouse:tally-label:print'
  | 'warehouse:tally-label:download'
  | 'warehouse:tally-label:scan-apply'
  | 'warehouse:tally-label:overwrite-package'
  | 'warehouse:dispatch-pending:view'
  | 'warehouse:dispatch-pending:batch-select'
  | 'warehouse:dispatch-pending:handover-preview'
  | 'warehouse:dispatch-pending:handover-print'
  | 'warehouse:dispatch-pending:dispatch-confirm'
  | 'warehouse:dispatch-pending:batch-dispatch-confirm'
  | 'warehouse:dispatch-pending:shipping-mark-confirm'
  | 'warehouse:dispatch-pending:label-generate'
  | 'warehouse:dispatch-pending:label-view'
  | 'warehouse:dispatch-pending:label-void'
  | 'warehouse:dispatch-pending:column-setting'
  | 'warehouse:outbounded:view'
  | 'warehouse:outbounded:handover-view'
  | 'warehouse:outbounded:detail-view'
  | 'warehouse:outbounded:export'
  | 'tracking:carrier-task:view'
  | 'tracking:carrier-task:detail'
  | 'tracking:carrier-task:run'
  | 'tracking:carrier-task:retry'
  | 'tracking:carrier-task:error-view'
  | 'tracking:carrier-task:log-view'
  | 'tracking:carrier-task:column-setting'
  | 'tracking:external:view'
  | 'tracking:external:latest-view'
  | 'tracking:external:stale-days-view'
  | 'tracking:external:detail'
  | 'tracking:external:single-add'
  | 'tracking:external:import-upload'
  | 'tracking:external:import-preview'
  | 'tracking:external:import-confirm'
  | 'tracking:external:import-error-view'
  | 'tracking:external:unmatched-view'
  | 'tracking:external:overwrite'
  | 'tracking:external:customer-visible-update'
  | 'tracking:external:column-setting'
  | 'tracking:external:export'
  | 'customer-service:transfer:view'
  | 'customer-service:transfer:write'
  | 'customer-service:transfer:batch-write'
  | 'customer-service:transfer:view-outbound-time'
  | 'customer-service:transfer:view-agent'
  | 'customer-service:transfer:view-agent-data'
  | 'customer-service:transfer:view-sensitive'
  | 'customer-service:transfer:view-all'
  | 'customer-service:dashboard:view'
  | 'customer-service:dashboard:task-card-view'
  | 'customer-service:dashboard:problem-summary-view'
  | 'customer-service:dashboard:after-sale-summary-view'
  | 'customer-service:dashboard:team-view'
  | 'customer-service:dashboard:all-view'
  | 'customer-service:data-confirm:view'
  | 'customer-service:data-confirm:business-view'
  | 'customer-service:data-confirm:agent-view'
  | 'customer-service:data-confirm:business-update'
  | 'customer-service:data-confirm:agent-update'
  | 'customer-service:data-confirm:business-approve'
  | 'customer-service:data-confirm:agent-approve'
  | 'customer-service:data-confirm:approve-all'
  | 'customer-service:data-confirm:reverse'
  | 'customer-service:data-confirm:column-setting'
  | 'customer-service:transfer:sub-order-write'
  | 'customer-service:transfer:push-sales'
  | 'customer-service:transfer:tracking-website-view'
  | 'customer-service:transfer:label-upload'
  | 'customer-service:transfer:label-view'
  | 'customer-service:transfer:column-setting'
  | 'customer-service:pending-routing:view'
  | 'customer-service:pending-routing:fee-detail-view'
  | 'customer-service:pending-routing:agent-view'
  | 'customer-service:pending-routing:problem-create'
  | 'customer-service:pending-routing:column-setting'
  | 'customer-service:waiting-departure:view'
  | 'customer-service:waiting-departure:update-info'
  | 'customer-service:waiting-departure:update-transfer-no'
  | 'customer-service:waiting-departure:update-etd-eta'
  | 'customer-service:waiting-departure:update-tracking-website'
  | 'customer-service:waiting-departure:confirm-departure'
  | 'customer-service:waiting-departure:problem-create'
  | 'customer-service:waiting-departure:label-upload'
  | 'customer-service:waiting-departure:column-setting'
  | 'customer-service:departed:view'
  | 'customer-service:departed:update-info'
  | 'customer-service:departed:update-eta'
  | 'customer-service:departed:update-tracking-website'
  | 'customer-service:departed:confirm-arrived-port'
  | 'customer-service:departed:problem-create'
  | 'customer-service:departed:column-setting'
  | 'customer-service:arrived-port:view'
  | 'customer-service:arrived-port:update-info'
  | 'customer-service:arrived-port:update-tracking-website'
  | 'customer-service:arrived-port:confirm-delivering'
  | 'customer-service:arrived-port:problem-create'
  | 'customer-service:arrived-port:column-setting'
  | 'customer-service:delivering:view'
  | 'customer-service:delivering:update-info'
  | 'customer-service:delivering:confirm-signed'
  | 'customer-service:delivering:after-sale-create'
  | 'customer-service:delivering:problem-create'
  | 'customer-service:delivering:column-setting'
  | 'customer-service:signed:view'
  | 'customer-service:signed:confirm'
  | 'customer-service:signed:remark'
  | 'customer-service:signed:after-sale-create'
  | 'customer-service:signed:after-sale-view'
  | 'customer-service:signed:after-sale-assist'
  | 'customer-service:signed:after-sale-close'
  | 'customer-service:signed:column-setting'
  | 'customer-service:problem:view'
  | 'customer-service:problem:create'
  | 'customer-service:problem:reply'
  | 'customer-service:problem:close'
  | 'customer-service:problem:assist'
  | 'customer-service:problem:after-sale-view'
  | 'customer-service:problem:customer-visible-view'
  | 'customer-service:problem:customer-visible-update'
  | 'customer-service:problem:filter'
  | 'customer-service:problem:column-setting'
  | 'customer-service:problem:export'
  | `pricing:${string}`
  | 'finance:dashboard:view'
  | 'finance:dashboard:receivable-todo'
  | 'finance:dashboard:payable-todo'
  | 'finance:dashboard:water-receipt-todo'
  | 'finance:dashboard:payment-todo'
  | 'finance:dashboard:exception-view'
  | 'finance:dashboard:profit-view'
  | 'finance:dashboard:view-all'
  | 'finance:customer-account:read'
  | 'finance:receivable:read'
  | 'finance:receivable:detail'
  | 'finance:receivable:create'
  | 'finance:receivable:update'
  | 'finance:receivable:audit'
  | 'finance:receivable:batch-audit'
  | 'finance:receivable:reverse'
  | 'finance:receivable:batch-reverse'
  | 'finance:receivable:void'
  | 'finance:receivable:batch-void'
  | 'finance:receivable:match-water'
  | 'finance:receivable:export'
  | 'finance:receivable:view-sensitive'
  | 'finance:receivable:view-all'
  | 'finance:business-cost:read'
  | 'finance:business-cost:manage'
  | 'finance:business-cost:audit'
  | 'finance:business-cost:reverse'
  | 'finance:business-cost:void'
  | 'finance:business-cost:export'
  | 'finance:business-cost:view-all'
  | 'finance:business-cost:view-agent'
  | 'finance:business-cost:view-profit'
  | 'finance:business-cost:detail'
  | 'finance:business-cost:batch-audit'
  | 'finance:business-cost:batch-reverse'
  | 'finance:business-cost:batch-void'
  | 'finance:business-cost:view-sensitive'
  | 'finance:order-fee:payable:view'
  | 'finance:order-fee:payable:manage'
  | 'finance:order-fee:profit:receivable-payable'
  | 'finance:order-fee:profit:receivable-business'
  | 'finance:order-fee:profit:business-payable'
  | 'finance:payable:read'
  | 'finance:payable:manage'
  | 'finance:payable:audit'
  | 'finance:payable:reverse'
  | 'finance:payable:void'
  | 'finance:payable:export'
  | 'finance:payable:payment'
  | 'finance:payable:bank'
  | 'finance:payable:attachment'
  | 'finance:payable:view-sensitive'
  | 'finance:payable:view-profit'
  | 'finance:payable:paid-read'
  | 'finance:payable:paid-confirm'
  | 'finance:payable:paid-reverse'
  | 'finance:payable:paid-export'
  | 'finance:payable:paid-voucher'
  | 'finance:payable:paid-bank-view'
  | 'finance:payable:detail'
  | 'finance:payable:match-shipment'
  | 'finance:payable:batch-audit'
  | 'finance:payable:batch-reverse'
  | 'finance:payable:batch-void'
  | 'finance:payable:attachment-view'
  | 'finance:payable:attachment-upload'
  | 'finance:pending-payment:read'
  | 'finance:pending-payment:detail'
  | 'finance:pending-payment:create'
  | 'finance:pending-payment:update'
  | 'finance:pending-payment:cancel'
  | 'finance:pending-payment:bank-select'
  | 'finance:pending-payment:bank-manage'
  | 'finance:pending-payment:bill-voucher-view'
  | 'finance:pending-payment:bill-voucher-upload'
  | 'finance:pending-payment:payment-voucher-view'
  | 'finance:pending-payment:payment-voucher-upload'
  | 'finance:pending-payment:export'
  | 'finance:pending-payment:view-sensitive'
  | 'finance:paid-payment:read'
  | 'finance:paid-payment:detail'
  | 'finance:paid-payment:confirm'
  | 'finance:paid-payment:update'
  | 'finance:paid-payment:reverse'
  | 'finance:paid-payment:voucher-view'
  | 'finance:paid-payment:voucher-upload'
  | 'finance:paid-payment:voucher-delete'
  | 'finance:paid-payment:bank-view'
  | 'finance:paid-payment:export'
  | 'finance:paid-payment:view-sensitive'
  | 'finance:water-receipt:read'
  | 'finance:water-receipt:manage'
  | 'finance:water-receipt:arrive'
  | 'finance:water-receipt:match'
  | 'finance:water-receipt:adjust'
  | 'finance:water-receipt:void'
  | 'finance:water-receipt:archive'
  | 'finance:water-receipt:export'
  | 'finance:water-receipt:voucher'
  | 'finance:water-receipt:view-all'
  | 'finance:water-receipt:detail'
  | 'finance:water-receipt:create'
  | 'finance:water-receipt:update'
  | 'finance:water-receipt:reverse-archive'
  | 'finance:water-receipt:voucher-view'
  | 'finance:water-receipt:voucher-upload'
  | 'finance:water-receipt:voucher-delete'
  | 'finance:water-receipt:view-sensitive'
  | 'finance:water-match:read'
  | 'finance:water-match:receivable-view'
  | 'finance:water-match:create'
  | 'finance:water-match:cancel'
  | 'finance:water-match:adjust'
  | 'finance:water-match:history-view'
  | 'finance:water-match:difference-view'
  | 'finance:water-match:export'
  | 'finance:agent-bill:read'
  | 'finance:agent-bill:detail'
  | 'finance:agent-bill:import'
  | 'finance:agent-bill:save'
  | 'finance:agent-bill:difference-manage'
  | 'finance:agent-bill:difference-resolve'
  | 'finance:agent-bill:archive'
  | 'finance:agent-bill:reverse-archive'
  | 'finance:agent-bill:attachment-view'
  | 'finance:agent-bill:attachment-upload'
  | 'finance:agent-bill:export'
  | 'finance:agent-bill:view-sensitive'
  | 'master-data:customers:read'
  | 'master-data:customers:write'
  | 'master-data:finance:read'
  | 'master-data:finance:write'
  | 'master-data:agents:read'
  | 'master-data:agents:write'
  | 'master-data:agent-channels:read'
  | 'master-data:agent-channels:write'
  | 'master-data:channels:read'
  | 'master-data:channels:write'
  | 'master-data:channel-categories:read'
  | 'master-data:channel-categories:write'
  | 'master-data:remote-areas:read'
  | 'master-data:remote-areas:write'
  | 'master-data:exchange-rates:read'
  | 'master-data:exchange-rates:write'
  | 'master-data:assistant:read'
  | `master-data:${string}`
  | `system:${string}`;

export interface Principal {
  id: string;
  username: string;
  role: RoleKey;
  customerId?: string;
  name?: string;
  phone?: string;
  gender?: string;
  nickname?: string;
  mustChangePassword?: boolean;
}

export interface PermissionDefinition {
  code: PermissionKey;
  label: string;
  group: string;
}

export interface RolePermissionRow {
  key: RoleKey;
  label: string;
  account: string;
  scope: string;
  permissions: PermissionKey[];
  restriction: string;
  description?: string;
  site?: string;
  sortOrder?: number;
  enabled?: boolean;
  systemBuiltin?: boolean;
}

export const permissionDefinitions: PermissionDefinition[] = [
  { code: 'operations:line-shipment:view', label: '查看专线运单池', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:detail', label: '查看运单详情', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:process', label: '处理运单', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:status-update', label: '修改运营状态', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:tracking-add', label: '添加运营轨迹', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:problem-create', label: '新建运营问题件', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:import', label: '导入运单', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:internal-log-view', label: '查看内部流通日志', group: '运营工作台 / 专线运单池' },
  { code: 'operations:line-shipment:export', label: '导出专线运单池', group: '运营工作台 / 专线运单池' },
  { code: 'operations:ai-queue:view', label: '查看 AI 优先队列', group: '运营工作台 / AI 优先队列' },
  { code: 'operations:ai-queue:assist', label: '调用运营 AI 助手', group: '运营工作台 / AI 优先队列' },
  { code: 'operations:ai-queue:mark-read', label: '标记 AI 队列已读', group: '运营工作台 / AI 优先队列' },
  { code: 'operations:ai-queue:handle', label: '处理 AI 推荐任务', group: '运营工作台 / AI 优先队列' },
  { code: 'operations:product-map:view', label: '查看产品地图', group: '运营工作台 / 产品地图' },
  { code: 'operations:product-map:route-view', label: '查看产品渠道关系', group: '运营工作台 / 产品地图' },
  { code: 'operations:product-map:cost-sensitive-view', label: '查看产品地图敏感成本', group: '运营工作台 / 产品地图' },
  { code: 'operations:product-map:export', label: '导出产品地图', group: '运营工作台 / 产品地图' },
  { code: 'operations:import-quality:view', label: '查看导入质检', group: '运营工作台 / 导入质检' },
  { code: 'operations:import-quality:upload', label: '上传运单导入文件', group: '运营工作台 / 导入质检' },
  { code: 'operations:import-quality:retry', label: '重试导入', group: '运营工作台 / 导入质检' },
  { code: 'operations:import-quality:error-detail-view', label: '查看导入错误详情', group: '运营工作台 / 导入质检' },
  { code: 'operations:import-quality:confirm', label: '确认导入结果', group: '运营工作台 / 导入质检' },
  { code: 'business:dashboard:view', label: '查看业务看板', group: '业务管理 / 业务看板' },
  { code: 'business:dashboard:team-view', label: '查看团队统计', group: '业务管理 / 业务看板' },
  { code: 'business:dashboard:all-view', label: '查看全部统计', group: '业务管理 / 业务看板' },
  { code: 'business:dashboard:trend-view', label: '查看录单趋势', group: '业务管理 / 业务看板' },
  { code: 'business:dashboard:pending-review-summary', label: '查看待审核摘要', group: '业务管理 / 业务看板' },
  { code: 'business:order-entry:view', label: '进入录单页面', group: '业务管理 / 录单' },
  { code: 'business:order-entry:warehouse-package-select', label: '选择在仓货物录单', group: '业务管理 / 录单' },
  { code: 'business:order-entry:create', label: '新建录单', group: '业务管理 / 录单' },
  { code: 'business:order-entry:draft-view', label: '查看录单草稿', group: '业务管理 / 录单' },
  { code: 'business:order-entry:draft-save', label: '保存录单草稿', group: '业务管理 / 录单' },
  { code: 'business:order-entry:draft-delete', label: '删除录单草稿', group: '业务管理 / 录单' },
  { code: 'business:order-entry:submit-review', label: '提交审核', group: '业务管理 / 录单' },
  { code: 'business:order-entry:invoice-upload', label: '上传业务发票', group: '业务管理 / 录单' },
  { code: 'business:order-entry:label-upload', label: '上传业务标签', group: '业务管理 / 录单' },
  { code: 'business:order-fee:view', label: '查看订单费用', group: '业务管理 / 录单' },
  { code: 'business:order-fee:create', label: '新增订单费用', group: '业务管理 / 录单' },
  { code: 'business:order-fee:update', label: '修改订单费用', group: '业务管理 / 录单' },
  { code: 'business:order-fee:delete', label: '删除订单费用', group: '业务管理 / 录单' },
  { code: 'business:order-fee:lock', label: '锁定订单费用', group: '业务管理 / 录单' },
  { code: 'business:order-fee:unlock', label: '解锁订单费用', group: '业务管理 / 录单' },
  { code: 'business:order-fee:profit-view', label: '查看订单利润', group: '业务管理 / 录单' },
  { code: 'business:review:list', label: '查看待审核列表', group: '业务管理 / 待审核运单' },
  { code: 'business:review:detail', label: '查看待审核详情', group: '业务管理 / 待审核运单' },
  { code: 'business:review:deleted-list', label: '查看已删除订单', group: '业务管理 / 待审核运单' },
  { code: 'business:review:approve', label: '审核通过', group: '业务管理 / 待审核运单' },
  { code: 'business:review:reject', label: '审核不通过', group: '业务管理 / 待审核运单' },
  { code: 'business:review:reverse', label: '反审核', group: '业务管理 / 待审核运单' },
  { code: 'business:review:delete', label: '删除待审核订单', group: '业务管理 / 待审核运单' },
  { code: 'business:review:restore', label: '恢复已删除订单', group: '业务管理 / 待审核运单' },
  { code: 'business:review:purge', label: '彻底删除订单', group: '业务管理 / 待审核运单' },
  { code: 'business:review:finance-detail-view', label: '查看审核财务明细', group: '业务管理 / 待审核运单' },
  { code: 'business:review:operation-log-view', label: '查看审核操作日志', group: '业务管理 / 待审核运单' },
  { code: 'business:shipment:list', label: '查看运单管理列表', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:detail', label: '查看运单详情', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:self-view', label: '查看本人运单', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:team-view', label: '查看团队运单', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:all-view', label: '查看全部运单', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:update-basic', label: '修改运单基础资料', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:update-operational', label: '修改运单运营资料', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:delete', label: '删除运单', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:payment-record', label: '登记收付款信息', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:tracking-add', label: '添加运单轨迹', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:problem-create', label: '创建运单问题件', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:finance-detail-view', label: '查看运单财务明细', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:receivable-view', label: '查看运单应收', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:payable-view', label: '查看运单应付', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:profit-view', label: '查看运单利润', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:export', label: '导出运单', group: '业务管理 / 运单管理' },
  { code: 'business:shipment:column-setting', label: '保存运单列设置', group: '业务管理 / 运单管理' },
  { code: 'business:order-ai:view', label: '查看 AI 订单助手', group: '业务管理 / AI 订单助手' },
  { code: 'business:order-ai:assist', label: '调用 AI 订单助手', group: '业务管理 / AI 订单助手' },
  { code: 'business:order-ai:finance-context', label: '允许 AI 使用财务上下文', group: '业务管理 / AI 订单助手' },
  { code: 'business:order-ai:all-order-context', label: '允许 AI 使用全部订单上下文', group: '业务管理 / AI 订单助手' },
  { code: 'business:order-ai:export-result', label: '导出 AI 订单结果', group: '业务管理 / AI 订单助手' },
  { code: 'market:dashboard:view', label: '查看市场看板', group: '市场管理 / 市场看板' },
  { code: 'market:dashboard:pending-summary', label: '查看待排货概览', group: '市场管理 / 市场看板' },
  { code: 'market:dashboard:routed-summary', label: '查看已排货概览', group: '市场管理 / 市场看板' },
  { code: 'market:dashboard:weekly-summary', label: '查看本周排货统计', group: '市场管理 / 市场看板' },
  { code: 'market:dashboard:agent-stats-view', label: '查看代理统计', group: '市场管理 / 市场看板' },
  { code: 'market:dashboard:channel-mode-stats-view', label: '查看空海运渠道统计', group: '市场管理 / 市场看板' },
  { code: 'market:dashboard:sensitive-summary-view', label: '查看敏感货与申报统计', group: '市场管理 / 市场看板' },
  { code: 'market:dashboard:team-view', label: '查看团队市场数据', group: '市场管理 / 市场看板' },
  { code: 'market:dashboard:all-view', label: '查看全部市场数据', group: '市场管理 / 市场看板' },
  { code: 'market:pending-routing:view', label: '查看待排货列表', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:detail', label: '查看待排货详情', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:assign', label: '打开并填写排货', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:save-draft', label: '保存排货资料', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:confirm', label: '确认排货', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:audit', label: '审核排货', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:update', label: '修改排货资料', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:delete', label: '删除待排货', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:operation-log-view', label: '查看待排货操作日志', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:business-cost-view', label: '查看业务成本', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:payable-cost-view', label: '查看应付成本', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:agent-channel-view', label: '查看代理与代理渠道', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:cost-field-view', label: '查看计费重与市场成本', group: '市场管理 / 待排货' },
  { code: 'market:pending-routing:column-setting', label: '保存待排货列设置', group: '市场管理 / 待排货' },
  { code: 'market:routed:view', label: '查看已排货列表', group: '市场管理 / 已排货' },
  { code: 'market:routed:detail', label: '查看已排货详情', group: '市场管理 / 已排货' },
  { code: 'market:routed:update', label: '修改已排货资料', group: '市场管理 / 已排货' },
  { code: 'market:routed:reroute', label: '退回重排', group: '市场管理 / 已排货' },
  { code: 'market:routed:log-view', label: '查看排货日志', group: '市场管理 / 已排货' },
  { code: 'market:routed:agent-cost-view', label: '查看代理成本', group: '市场管理 / 已排货' },
  { code: 'market:routed:cost-total-view', label: '查看市场成本合计', group: '市场管理 / 已排货' },
  { code: 'market:routed:agent-channel-view', label: '查看代理渠道', group: '市场管理 / 已排货' },
  { code: 'market:routed:column-setting', label: '保存已排货列设置', group: '市场管理 / 已排货' },
  { code: 'market:weekly-routing:view', label: '查看本周排货数据', group: '市场管理 / 本周排货数据' },
  { code: 'market:weekly-routing:detail', label: '查看本周排货明细', group: '市场管理 / 本周排货数据' },
  { code: 'market:weekly-routing:agent-stats-view', label: '查看本周代理统计', group: '市场管理 / 本周排货数据' },
  { code: 'market:weekly-routing:channel-mode-stats-view', label: '查看本周渠道统计', group: '市场管理 / 本周排货数据' },
  { code: 'market:weekly-routing:cost-view', label: '查看本周成本', group: '市场管理 / 本周排货数据' },
  { code: 'market:weekly-routing:reroute-stats-view', label: '查看本周退回重排统计', group: '市场管理 / 本周排货数据' },
  { code: 'market:weekly-routing:sensitive-stats-view', label: '查看本周敏感货与申报统计', group: '市场管理 / 本周排货数据' },
  { code: 'market:weekly-routing:export', label: '导出本周排货数据', group: '市场管理 / 本周排货数据' },
  { code: 'market:weekly-routing:column-setting', label: '保存本周排货列设置', group: '市场管理 / 本周排货数据' },
  { code: 'warehouse:today-receipt:view', label: '查看今日收货', group: '仓库管理 / 今日收货' },
  { code: 'warehouse:today-receipt:filter', label: '筛选今日收货', group: '仓库管理 / 今日收货' },
  { code: 'warehouse:today-receipt:manual-create', label: '手动添加收货', group: '仓库管理 / 今日收货' },
  { code: 'warehouse:today-receipt:update', label: '修改收货入仓数据', group: '仓库管理 / 今日收货' },
  { code: 'warehouse:today-receipt:remark-update', label: '维护收货备注', group: '仓库管理 / 今日收货' },
  { code: 'warehouse:today-receipt:exception-manage', label: '维护收货异常', group: '仓库管理 / 今日收货' },
  { code: 'warehouse:today-receipt:device-import', label: '接收设备推送', group: '仓库管理 / 今日收货' },
  { code: 'warehouse:today-receipt:device-log-view', label: '查看设备推送日志', group: '仓库管理 / 今日收货' },
  { code: 'warehouse:today-receipt:column-setting', label: '保存今日收货列设置', group: '仓库管理 / 今日收货' },
  { code: 'warehouse:in-stock:view', label: '查看在仓数据', group: '仓库管理 / 在仓数据' },
  { code: 'warehouse:in-stock:update', label: '修改在仓包裹', group: '仓库管理 / 在仓数据' },
  { code: 'warehouse:in-stock:split', label: '拆分在仓包裹', group: '仓库管理 / 在仓数据' },
  { code: 'warehouse:in-stock:batch-select', label: '批量勾选在仓包裹', group: '仓库管理 / 在仓数据' },
  { code: 'warehouse:in-stock:tally-start', label: '发起理货', group: '仓库管理 / 在仓数据' },
  { code: 'warehouse:in-stock:batch-tally-start', label: '批量发起理货', group: '仓库管理 / 在仓数据' },
  { code: 'warehouse:in-stock:order-entry-select', label: '选择包裹录单', group: '仓库管理 / 在仓数据' },
  { code: 'warehouse:in-stock:batch-order-entry', label: '批量录单', group: '仓库管理 / 在仓数据' },
  { code: 'warehouse:in-stock:tally-record-view', label: '查看理货记录', group: '仓库管理 / 在仓数据' },
  { code: 'warehouse:in-stock:column-setting', label: '保存在仓列设置', group: '仓库管理 / 在仓数据' },
  { code: 'warehouse:tally-pending:view', label: '查看未完成理货', group: '仓库管理 / 未完成理货' },
  { code: 'warehouse:tally-pending:task-create', label: '创建理货任务', group: '仓库管理 / 未完成理货' },
  { code: 'warehouse:tally-pending:task-update', label: '修改理货任务', group: '仓库管理 / 未完成理货' },
  { code: 'warehouse:tally-pending:task-process', label: '处理理货', group: '仓库管理 / 未完成理货' },
  { code: 'warehouse:tally-pending:merge-only', label: '合并成一箱', group: '仓库管理 / 未完成理货' },
  { code: 'warehouse:tally-pending:merge-and-ship', label: '理货并创建出货单', group: '仓库管理 / 未完成理货' },
  { code: 'warehouse:tally-pending:split', label: '拆票理货', group: '仓库管理 / 未完成理货' },
  { code: 'warehouse:tally-pending:detail-view', label: '查看理货明细', group: '仓库管理 / 未完成理货' },
  { code: 'warehouse:tally-pending:history-view', label: '查看理货记录', group: '仓库管理 / 未完成理货' },
  { code: 'warehouse:tally-pending:filter', label: '筛选未完成理货', group: '仓库管理 / 未完成理货' },
  { code: 'warehouse:tally-completed:view', label: '查看已完成理货', group: '仓库管理 / 已完成理货' },
  { code: 'warehouse:tally-completed:history-view', label: '查看已完成理货历史', group: '仓库管理 / 已完成理货' },
  { code: 'warehouse:tally-completed:detail-view', label: '查看已完成理货详情', group: '仓库管理 / 已完成理货' },
  { code: 'warehouse:tally-label:generate', label: '生成理货标签', group: '仓库管理 / 已完成理货' },
  { code: 'warehouse:tally-label:reprint', label: '重打理货标签', group: '仓库管理 / 已完成理货' },
  { code: 'warehouse:tally-label:print', label: '打印理货标签', group: '仓库管理 / 已完成理货' },
  { code: 'warehouse:tally-label:download', label: '下载理货标签', group: '仓库管理 / 已完成理货' },
  { code: 'warehouse:tally-label:scan-apply', label: '扫描应用理货标签', group: '仓库管理 / 已完成理货' },
  { code: 'warehouse:tally-label:overwrite-package', label: '标签覆盖在仓包裹', group: '仓库管理 / 已完成理货' },
  { code: 'warehouse:dispatch-pending:view', label: '查看待出库', group: '仓库管理 / 待出库' },
  { code: 'warehouse:dispatch-pending:batch-select', label: '勾选待出库订单', group: '仓库管理 / 待出库' },
  { code: 'warehouse:dispatch-pending:handover-preview', label: '预览代理交接单', group: '仓库管理 / 待出库' },
  { code: 'warehouse:dispatch-pending:handover-print', label: '打印代理交接单', group: '仓库管理 / 待出库' },
  { code: 'warehouse:dispatch-pending:dispatch-confirm', label: '确认出库', group: '仓库管理 / 待出库' },
  { code: 'warehouse:dispatch-pending:batch-dispatch-confirm', label: '批量确认出库', group: '仓库管理 / 待出库' },
  { code: 'warehouse:dispatch-pending:shipping-mark-confirm', label: '确认贴唛头', group: '仓库管理 / 待出库' },
  { code: 'warehouse:dispatch-pending:label-generate', label: '生成内部交货面单', group: '仓库管理 / 待出库' },
  { code: 'warehouse:dispatch-pending:label-view', label: '查看内部交货面单', group: '仓库管理 / 待出库' },
  { code: 'warehouse:dispatch-pending:label-void', label: '作废内部交货面单', group: '仓库管理 / 待出库' },
  { code: 'warehouse:dispatch-pending:column-setting', label: '保存待出库列设置', group: '仓库管理 / 待出库' },
  { code: 'warehouse:outbounded:view', label: '查看已出库历史', group: '仓库管理 / 已出库' },
  { code: 'warehouse:outbounded:handover-view', label: '查看已出库交接单', group: '仓库管理 / 已出库' },
  { code: 'warehouse:outbounded:detail-view', label: '查看已出库详情', group: '仓库管理 / 已出库' },
  { code: 'warehouse:outbounded:export', label: '导出已出库历史', group: '仓库管理 / 已出库' },
  ...[
    ['carrier-task', 'view', '查看承运商任务', '承运商任务'], ['carrier-task', 'detail', '查看任务详情', '承运商任务'], ['carrier-task', 'run', '手动同步轨迹', '承运商任务'], ['carrier-task', 'retry', '重试失败任务', '承运商任务'], ['carrier-task', 'error-view', '查看失败原因', '承运商任务'], ['carrier-task', 'log-view', '查看同步日志', '承运商任务'], ['carrier-task', 'column-setting', '保存任务列设置', '承运商任务'],
    ['external', 'view', '查看外部物流轨迹', '外部物流轨迹'], ['external', 'latest-view', '查看最新物流轨迹', '外部物流轨迹'], ['external', 'stale-days-view', '查看未更新天数', '外部物流轨迹'], ['external', 'detail', '查看轨迹详情', '外部物流轨迹'], ['external', 'single-add', '单票添加轨迹', '外部物流轨迹'], ['external', 'import-upload', '上传轨迹表', '外部物流轨迹'], ['external', 'import-preview', '查看导入预览', '外部物流轨迹'], ['external', 'import-confirm', '确认导入轨迹', '外部物流轨迹'], ['external', 'import-error-view', '查看失败行', '外部物流轨迹'], ['external', 'unmatched-view', '查看未匹配单号', '外部物流轨迹'], ['external', 'overwrite', '覆盖最新物流轨迹', '外部物流轨迹'], ['external', 'customer-visible-update', '更新客户可见轨迹', '外部物流轨迹'], ['external', 'column-setting', '保存轨迹列设置', '外部物流轨迹'], ['external', 'export', '导出轨迹列表', '外部物流轨迹']
  ].map(([section, action, label, group]) => ({ code: `tracking:${section}:${action}` as PermissionKey, label, group: `物流轨迹管理 / ${group}` })),
  { code: 'customer-service:dashboard:view', label: '查看客服看板', group: '客服管理 / 客服看板' },
  { code: 'customer-service:dashboard:task-card-view', label: '查看任务卡片', group: '客服管理 / 客服看板' },
  { code: 'customer-service:dashboard:problem-summary-view', label: '查看问题件摘要', group: '客服管理 / 客服看板' },
  { code: 'customer-service:dashboard:after-sale-summary-view', label: '查看需协助摘要', group: '客服管理 / 客服看板' },
  { code: 'customer-service:dashboard:team-view', label: '查看团队看板数据', group: '客服管理 / 客服看板' },
  { code: 'customer-service:dashboard:all-view', label: '查看全部客服看板数据', group: '客服管理 / 客服看板' },
  { code: 'customer-service:data-confirm:view', label: '查看数据确认', group: '客服管理 / 数据确认' },
  { code: 'customer-service:data-confirm:business-view', label: '查看业务数据', group: '客服管理 / 数据确认' },
  { code: 'customer-service:data-confirm:agent-view', label: '查看代理数据', group: '客服管理 / 数据确认' },
  { code: 'customer-service:data-confirm:business-update', label: '修改业务数据', group: '客服管理 / 数据确认' },
  { code: 'customer-service:data-confirm:agent-update', label: '修改代理数据', group: '客服管理 / 数据确认' },
  { code: 'customer-service:data-confirm:business-approve', label: '审核业务数据', group: '客服管理 / 数据确认' },
  { code: 'customer-service:data-confirm:agent-approve', label: '审核代理数据', group: '客服管理 / 数据确认' },
  { code: 'customer-service:data-confirm:approve-all', label: '双数据审核通过', group: '客服管理 / 数据确认' },
  { code: 'customer-service:data-confirm:reverse', label: '反审核数据确认', group: '客服管理 / 数据确认' },
  { code: 'customer-service:data-confirm:column-setting', label: '保存数据确认列设置', group: '客服管理 / 数据确认' },
  { code: 'customer-service:transfer:view', label: '转单号查看', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:write', label: '填写转单号', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:batch-write', label: '批量填写转单号', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:sub-order-write', label: '填写分单号', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:push-sales', label: '推送业务待办', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:tracking-website-view', label: '查看追踪网站', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:label-upload', label: '上传面单', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:label-view', label: '查看面单', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:column-setting', label: '保存转单号列设置', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:view-outbound-time', label: '查看转单号出库时间', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:view-agent', label: '查看转单号代理信息', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:view-agent-data', label: '查看转单号代理数据', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:view-sensitive', label: '查看转单号敏感货物属性', group: '客服管理 / 转单号' },
  { code: 'customer-service:transfer:view-all', label: '查看全部授权转单号订单', group: '客服管理 / 转单号' },
  ...[
    ['pending-routing', 'view', '查看待排货'], ['pending-routing', 'fee-detail-view', '查看费用明细'], ['pending-routing', 'agent-view', '查看代理信息'], ['pending-routing', 'problem-create', '创建问题件'], ['pending-routing', 'column-setting', '保存待排货列设置'],
    ['waiting-departure', 'view', '查看待离港'], ['waiting-departure', 'update-info', '修改待离港资料'], ['waiting-departure', 'update-transfer-no', '修改转单号'], ['waiting-departure', 'update-etd-eta', '修改 ETD/ETA'], ['waiting-departure', 'update-tracking-website', '修改追踪网站'], ['waiting-departure', 'confirm-departure', '确认离港'], ['waiting-departure', 'problem-create', '创建问题件'], ['waiting-departure', 'label-upload', '上传面单'], ['waiting-departure', 'column-setting', '保存待离港列设置'],
    ['departed', 'view', '查看已离港'], ['departed', 'update-info', '修改已离港资料'], ['departed', 'update-eta', '修改 ETA'], ['departed', 'update-tracking-website', '修改追踪网站'], ['departed', 'confirm-arrived-port', '确认到港'], ['departed', 'problem-create', '创建问题件'], ['departed', 'column-setting', '保存已离港列设置'],
    ['arrived-port', 'view', '查看已到港'], ['arrived-port', 'update-info', '修改已到港资料'], ['arrived-port', 'update-tracking-website', '修改追踪网站'], ['arrived-port', 'confirm-delivering', '确认派送'], ['arrived-port', 'problem-create', '创建问题件'], ['arrived-port', 'column-setting', '保存已到港列设置'],
    ['delivering', 'view', '查看已派送'], ['delivering', 'update-info', '修改已派送资料'], ['delivering', 'confirm-signed', '确认签收'], ['delivering', 'after-sale-create', '创建售后'], ['delivering', 'problem-create', '创建问题件'], ['delivering', 'column-setting', '保存已派送列设置'],
    ['signed', 'view', '查看已签收'], ['signed', 'confirm', '确认签收'], ['signed', 'remark', '维护签收备注'], ['signed', 'after-sale-create', '创建售后'], ['signed', 'after-sale-view', '查看售后'], ['signed', 'after-sale-assist', '标记售后需协助'], ['signed', 'after-sale-close', '关闭售后'], ['signed', 'column-setting', '保存已签收列设置'],
    ['problem', 'view', '查看问题件'], ['problem', 'create', '创建问题件'], ['problem', 'reply', '回复问题件'], ['problem', 'close', '关闭问题件'], ['problem', 'assist', '标记需协助'], ['problem', 'after-sale-view', '查看需协助问题件'], ['problem', 'customer-visible-view', '查看客户可见信息'], ['problem', 'customer-visible-update', '维护客户可见信息'], ['problem', 'filter', '筛选问题件'], ['problem', 'column-setting', '保存问题件列设置'], ['problem', 'export', '导出问题件']
  ].map(([section, action, label]) => ({ code: `customer-service:${section}:${action}` as PermissionKey, label, group: `客服管理 / ${({ 'pending-routing': '待排货', 'waiting-departure': '待离港', departed: '已离港', 'arrived-port': '已到港', delivering: '已派送', signed: '已签收 / 售后', problem: '问题件' } as Record<string, string>)[section]}` })),
  ...[
    ['lookup:view', '进入报价查价页面', '查价'], ['lookup:meta-view', '加载查价基础数据', '查价'],
    ['lookup:amazon', '亚马逊查询', '查价'], ['lookup:europe-oversize', '欧洲海运超大件查询', '查价'], ['lookup:europe-express', '欧洲空海运铁路快递查询', '查价'], ['lookup:south-africa', '南非专线查询', '查价'], ['lookup:usa-air-sea', '美国空海运查询', '查价'], ['lookup:canada-air-sea', '加拿大空海查询', '查价'], ['lookup:dubai-air-sea', '迪拜空海运查询', '查价'],
    ['lookup:dubai-image-view', '查看迪拜原表图片', '查价'], ['lookup:south-africa-table-view', '查看南非规则表与匹配明细', '查价'], ['lookup:copy-quote', '复制推荐报价', '查价'], ['lookup:requirement-detail-view', '查看渠道要求详情', '查价'], ['lookup:postal-rule-view', '查看美国邮编规则与价格区', '查价'], ['lookup:error-detail-view', '查看查价失败详情', '查价'],
    ['lookup:internal-source-view', '查看内部来源价格表', '查价 / 敏感字段'], ['lookup:cost-view', '查看成本单价与成本总价', '查价 / 敏感字段'], ['lookup:gross-profit-view', '查看毛利与利润差额', '查价 / 敏感字段'], ['lookup:markup-breakdown-view', '查看代理加价拆分', '查价 / 敏感字段'],
    ['markup:read', '查看代理加价规则', '代理加价规则'], ['markup:metrics-view', '查看加价规则统计', '代理加价规则'], ['markup:module-view', '按查价模块切换规则', '代理加价规则'], ['markup:default-create', '新增默认代理加价', '代理加价规则'], ['markup:update', '编辑代理加价', '代理加价规则'], ['markup:enable', '启用停用代理加价', '代理加价规则'], ['markup:delete', '删除代理加价', '代理加价规则'], ['markup:export', '导出代理加价规则', '代理加价规则'], ['markup:import', '导入代理加价规则', '代理加价规则'], ['markup:batch-upsert', '批量新增或覆盖代理加价', '代理加价规则'], ['markup:batch-enable', '批量启用停用代理加价', '代理加价规则'], ['markup:batch-delete', '批量删除代理加价', '代理加价规则'], ['markup:preview', '预览代理加价变更', '代理加价规则'], ['markup:line-detail-view', '查看渠道线路详情', '代理加价规则'], ['markup:line-custom-create', '新增线路自定义加价', '代理加价规则'], ['markup:line-custom-update', '修改线路自定义加价', '代理加价规则'], ['markup:batch-line-update', '批量设置线路加价范围', '代理加价规则'], ['markup:source-price-book-view', '查看关联来源价格表', '代理加价规则'], ['markup:unmatched-view', '查看无有效价格表异常', '代理加价规则'],
    ['markup-tier:read', '查看渠道阶梯加价', '渠道阶梯加价'], ['markup-tier:create', '新增渠道阶梯加价', '渠道阶梯加价'], ['markup-tier:update', '修改渠道阶梯加价', '渠道阶梯加价'], ['markup-tier:enable', '启用停用渠道阶梯加价', '渠道阶梯加价'], ['markup-tier:delete', '删除渠道阶梯加价', '渠道阶梯加价'], ['markup-tier:kg-view', '查看 KG 阶梯', '渠道阶梯加价'], ['markup-tier:cbm-view', '查看 CBM 阶梯', '渠道阶梯加价'],
    ['channel-remark:read', '查看代理渠道自定义备注', '代理渠道自定义备注'], ['channel-remark:create', '新增代理渠道自定义备注', '代理渠道自定义备注'], ['channel-remark:update', '修改代理渠道自定义备注', '代理渠道自定义备注'], ['channel-remark:enable', '启用停用代理渠道自定义备注', '代理渠道自定义备注'],
    ['price-books:read', '查看价格表管理', '价格表管理'], ['price-books:list-view', '查看价格表列表', '价格表管理'], ['price-books:rows-view', '查看价格表明细行', '价格表管理'], ['price-books:import-job-view', '查看价格表导入任务', '价格表管理'], ['price-books:upload', '上传价格表文件', '价格表管理'], ['price-books:import', '确认导入价格表', '价格表管理'], ['price-books:import-error-view', '查看导入失败原因', '价格表管理'], ['price-books:remark-update', '修改价格表备注', '价格表管理'], ['price-books:delete', '删除价格表', '价格表管理'], ['price-books:sync-health-view', '查看价格表同步体检', '价格表管理'], ['price-books:health-report-view', '查看价格表健康报告', '价格表管理'], ['price-books:legacy-source-view', '查看历史价格源', '价格表管理'], ['price-books:legacy-source-import', '导入历史价格源', '价格表管理'], ['price-books:legacy-source-delete', '删除历史价格源', '价格表管理'], ['price-books:legacy-rebuild', '重建历史价格源索引', '价格表管理'], ['price-books:cleanup-original-agents', '清理旧原始代理数据', '价格表管理'], ['price-books:cost-row-view', '查看价格表成本行', '价格表管理 / 敏感字段'], ['price-books:view-all-agents', '查看所有代理价格表', '价格表管理 / 敏感字段'], ['price-books:postal-rule-view', '查看邮编规则与价格区', '价格表管理'],
    ['dubai-display:active-view', '查看迪拜当前展示版本', '迪拜原表图片展示版本'], ['dubai-display:versions-view', '查看迪拜历史展示版本', '迪拜原表图片展示版本'], ['dubai-display:retry', '重新生成迪拜展示图片', '迪拜原表图片展示版本'], ['dubai-display:activate', '手动切换迪拜展示版本', '迪拜原表图片展示版本'], ['dubai-display:unpublished-view', '查看迪拜未发布或失败版本', '迪拜原表图片展示版本'],
    ['south-africa:rules-read', '查看南非专线规则', '南非专线规则'], ['south-africa:rules-create', '新增南非规则', '南非专线规则'], ['south-africa:rules-update', '修改南非规则', '南非专线规则'], ['south-africa:rules-enable', '启用停用南非规则', '南非专线规则'], ['south-africa:rules-delete', '删除南非规则', '南非专线规则'], ['south-africa:image-view', '查看南非图片或附件', '南非专线规则'], ['south-africa:image-upload', '上传南非图片或附件', '南非专线规则'], ['south-africa:match-result-view', '查看南非匹配明细', '南非专线规则']
  ].map(([code, label, group]) => ({ code: `pricing:${code}` as PermissionKey, label, group: `报价查价 / ${group}` })),
  ...[
    ['dashboard', 'view', '查看财务看板'], ['dashboard', 'receivable-todo', '查看应收待办'], ['dashboard', 'payable-todo', '查看应付待办'], ['dashboard', 'water-receipt-todo', '查看水单待办'], ['dashboard', 'payment-todo', '查看付款待办'], ['dashboard', 'exception-view', '查看财务异常'], ['dashboard', 'profit-view', '查看利润指标'], ['dashboard', 'view-all', '查看全公司汇总'],
    ['customer-account', 'read', '查看客户账户与流水'],
    ['receivable', 'read', '查看应收审核'], ['receivable', 'detail', '查看应收详情'], ['receivable', 'create', '新增应收'], ['receivable', 'update', '编辑应收'], ['receivable', 'audit', '审核应收'], ['receivable', 'batch-audit', '批量审核应收'], ['receivable', 'reverse', '反审核应收'], ['receivable', 'batch-reverse', '批量反审核应收'], ['receivable', 'void', '作废应收'], ['receivable', 'batch-void', '批量作废应收'], ['receivable', 'match-water', '匹配水单'], ['receivable', 'export', '导出应收'], ['receivable', 'view-sensitive', '查看应收敏感字段'], ['receivable', 'view-all', '查看全部应收'],
    ['business-cost', 'detail', '查看业务成本详情'], ['business-cost', 'batch-audit', '批量审核业务成本'], ['business-cost', 'batch-reverse', '批量反审核业务成本'], ['business-cost', 'batch-void', '批量作废业务成本'], ['business-cost', 'view-sensitive', '查看业务成本敏感字段'],
    ['payable', 'detail', '查看应付详情'], ['payable', 'match-shipment', '匹配应付运单'], ['payable', 'batch-audit', '批量审核应付'], ['payable', 'batch-reverse', '批量反审核应付'], ['payable', 'batch-void', '批量作废应付'], ['payable', 'attachment-view', '查看应付附件'], ['payable', 'attachment-upload', '上传应付附件'],
    ['pending-payment', 'read', '查看待付款'], ['pending-payment', 'detail', '查看付款申请详情'], ['pending-payment', 'create', '生成付款申请'], ['pending-payment', 'update', '编辑付款申请'], ['pending-payment', 'cancel', '取消付款申请'], ['pending-payment', 'bank-select', '选择收款银行'], ['pending-payment', 'bank-manage', '维护收款银行'], ['pending-payment', 'bill-voucher-view', '查看供应商账单'], ['pending-payment', 'bill-voucher-upload', '上传供应商账单'], ['pending-payment', 'payment-voucher-view', '预览付款凭证'], ['pending-payment', 'payment-voucher-upload', '上传付款凭证'], ['pending-payment', 'export', '导出待付款'], ['pending-payment', 'view-sensitive', '查看敏感付款信息'],
    ['paid-payment', 'read', '查看已付款'], ['paid-payment', 'detail', '查看已付款详情'], ['paid-payment', 'confirm', '确认付款'], ['paid-payment', 'update', '补充付款信息'], ['paid-payment', 'reverse', '反确认付款'], ['paid-payment', 'voucher-view', '查看付款凭证'], ['paid-payment', 'voucher-upload', '上传付款凭证'], ['paid-payment', 'voucher-delete', '删除付款凭证'], ['paid-payment', 'bank-view', '查看付款银行'], ['paid-payment', 'export', '导出已付款'], ['paid-payment', 'view-sensitive', '查看敏感付款信息'],
    ['water-receipt', 'detail', '查看水单详情'], ['water-receipt', 'create', '新增水单'], ['water-receipt', 'update', '编辑水单'], ['water-receipt', 'reverse-archive', '反归档水单'], ['water-receipt', 'voucher-view', '查看水单凭证'], ['water-receipt', 'voucher-upload', '上传水单凭证'], ['water-receipt', 'voucher-delete', '删除水单凭证'], ['water-receipt', 'view-sensitive', '查看敏感收款信息'],
    ['water-match', 'read', '查看水单匹配'], ['water-match', 'receivable-view', '查看可匹配应收'], ['water-match', 'create', '匹配订单应收'], ['water-match', 'cancel', '取消水单匹配'], ['water-match', 'adjust', '调整匹配金额'], ['water-match', 'history-view', '查看匹配历史'], ['water-match', 'difference-view', '查看匹配差异'], ['water-match', 'export', '导出匹配结果'],
    ['agent-bill', 'read', '查看代理账单'], ['agent-bill', 'detail', '查看代理账单详情'], ['agent-bill', 'import', '导入代理账单'], ['agent-bill', 'save', '保存代理账单'], ['agent-bill', 'difference-manage', '处理账单差异'], ['agent-bill', 'difference-resolve', '标记差异已处理'], ['agent-bill', 'archive', '归档代理账单'], ['agent-bill', 'reverse-archive', '反归档代理账单'], ['agent-bill', 'attachment-view', '查看代理账单附件'], ['agent-bill', 'attachment-upload', '上传代理账单附件'], ['agent-bill', 'export', '导出代理账单'], ['agent-bill', 'view-sensitive', '查看代理敏感结算信息']
  ].map(([section, action, label]) => ({ code: `finance:${section}:${action}` as PermissionKey, label, group: `财务管理 / ${({ dashboard: '财务看板', receivable: '应收审核', 'business-cost': '业务成本审核', payable: '市场应付审核', 'pending-payment': '待付款', 'paid-payment': '已付款', 'water-receipt': '水单到账查询', 'water-match': '水单匹配', 'agent-bill': '代理账单' } as Record<string, string>)[section]}` })),
  { code: 'finance:business-cost:read', label: '业务员成本查看', group: '财务管理 / 业务成本审核' },
  { code: 'finance:business-cost:manage', label: '业务员成本维护', group: '财务管理 / 业务成本审核' },
  { code: 'finance:business-cost:audit', label: '业务员成本审核', group: '财务管理 / 业务成本审核' },
  { code: 'finance:business-cost:reverse', label: '业务员成本反审核', group: '财务管理 / 业务成本审核' },
  { code: 'finance:business-cost:void', label: '业务员成本作废', group: '财务管理 / 业务成本审核' },
  { code: 'finance:business-cost:export', label: '业务员成本导出', group: '财务管理 / 业务成本审核' },
  { code: 'finance:business-cost:view-all', label: '业务员成本查看全部', group: '财务管理 / 业务成本审核' },
  { code: 'finance:business-cost:view-agent', label: '业务员成本查看代理', group: '财务管理 / 业务成本审核' },
  { code: 'finance:business-cost:view-profit', label: '业务员成本查看利润', group: '财务管理 / 业务成本审核' },
  { code: 'finance:order-fee:payable:view', label: '单票费用查看应付', group: '财务管理 / 单票费用' },
  { code: 'finance:order-fee:payable:manage', label: '单票费用维护应付', group: '财务管理 / 单票费用' },
  { code: 'finance:order-fee:profit:receivable-payable', label: '单票费用应收应付利润', group: '财务管理 / 单票费用' },
  { code: 'finance:order-fee:profit:receivable-business', label: '单票费用应收业务利润', group: '财务管理 / 单票费用' },
  { code: 'finance:order-fee:profit:business-payable', label: '单票费用业务应付利润', group: '财务管理 / 单票费用' },
  { code: 'finance:payable:read', label: '市场应付审核查看', group: '财务管理 / 市场应付审核' },
  { code: 'finance:payable:manage', label: '应付费用维护', group: '财务管理 / 市场应付审核' },
  { code: 'finance:payable:audit', label: '应付费用审核', group: '财务管理 / 市场应付审核' },
  { code: 'finance:payable:reverse', label: '应付反审核', group: '财务管理 / 市场应付审核' },
  { code: 'finance:payable:void', label: '应付作废', group: '财务管理 / 市场应付审核' },
  { code: 'finance:payable:export', label: '应付导出', group: '财务管理 / 市场应付审核' },
  { code: 'finance:payable:payment', label: '待付款维护', group: '财务管理 / 待付款' },
  { code: 'finance:payable:bank', label: '代理银行维护', group: '财务管理 / 待付款' },
  { code: 'finance:payable:attachment', label: '应付账单截图', group: '财务管理 / 市场应付审核' },
  { code: 'finance:payable:view-sensitive', label: '应付敏感字段', group: '财务管理 / 市场应付审核' },
  { code: 'finance:payable:view-profit', label: '应付利润查看', group: '财务管理 / 市场应付审核' },
  { code: 'finance:water-receipt:read', label: '水单查看', group: '财务管理 / 水单到账查询' },
  { code: 'finance:water-receipt:manage', label: '水单维护', group: '财务管理 / 水单到账查询' },
  { code: 'finance:water-receipt:arrive', label: '水单到账确认', group: '财务管理 / 水单到账查询' },
  { code: 'finance:water-receipt:match', label: '水单匹配应收', group: '财务管理 / 水单匹配' },
  { code: 'finance:water-receipt:adjust', label: '已到账金额调整', group: '财务管理 / 水单到账查询' },
  { code: 'finance:water-receipt:void', label: '水单作废', group: '财务管理 / 水单到账查询' },
  { code: 'finance:water-receipt:archive', label: '水单归档', group: '财务管理 / 水单到账查询' },
  { code: 'finance:water-receipt:export', label: '水单导出', group: '财务管理 / 水单到账查询' },
  { code: 'finance:water-receipt:voucher', label: '水单凭证维护', group: '财务管理 / 水单到账查询' },
  { code: 'finance:water-receipt:view-all', label: '水单查看全部', group: '财务管理 / 水单到账查询' },
  ...[
    ['customers', 'read', '查看客户资料'], ['customers', 'view-own', '查看本人客户'], ['customers', 'view-all', '查看全部客户'], ['customers', 'detail', '查看客户详情'], ['customers', 'create', '新增客户'], ['customers', 'update', '编辑客户'], ['customers', 'assign-salesperson', '调整业务员归属'], ['customers', 'enable', '启用停用客户'], ['customers', 'delete', '删除客户'], ['customers', 'import', '导入客户'], ['customers', 'export', '导出客户'], ['customers', 'contacts-view', '查看收货人'], ['customers', 'contacts-manage', '维护收货人'], ['customers', 'contacts-disable', '停用收货人'], ['customers', 'user-create', '创建客户登录账号'], ['customers', 'view-sensitive', '查看客户敏感信息'], ['customers', 'list-setting', '保存客户列设置'],
    ['finance', 'read', '查看财务资料'], ['finance', 'fee-name:create', '新增费用名称'], ['finance', 'fee-name:update', '编辑费用名称'], ['finance', 'fee-name:delete', '删除费用名称'], ['finance', 'fee-name:reorder', '调整费用名称排序'], ['finance', 'settlement:create', '新增结算方式'], ['finance', 'settlement:update', '编辑结算方式'], ['finance', 'settlement:delete', '删除结算方式'], ['finance', 'cargo-type:create', '新增货物类型'], ['finance', 'cargo-type:update', '编辑货物类型'], ['finance', 'cargo-type:delete', '删除货物类型'], ['finance', 'product-name:create', '新增品名'], ['finance', 'product-name:update', '编辑品名'], ['finance', 'product-name:delete', '删除品名'], ['finance', 'surcharge-manage', '维护附加费'], ['finance', 'surcharge-enable', '启用停用附加费'], ['finance', 'fuel-rate-manage', '维护燃油费率'], ['finance', 'view-sensitive', '查看财务资料敏感配置'],
    ['agents', 'read', '查看代理资料'], ['agents', 'detail', '查看代理详情'], ['agents', 'create', '新增代理'], ['agents', 'update', '编辑代理'], ['agents', 'enable', '启用停用代理'], ['agents', 'batch-enable', '批量启用停用代理'], ['agents', 'delete', '删除代理'], ['agents', 'batch-delete', '批量删除代理'], ['agents', 'warehouse-view', '查看代理仓库'], ['agents', 'tracking-site-view', '查看代理查询网站'], ['agents', 'invoice-template-view', '查看发票模板'], ['agents', 'invoice-template-manage', '维护发票模板'], ['agents', 'bank-view', '查看代理银行'], ['agents', 'bank-manage', '维护代理银行'], ['agents', 'integration-type-view', '查看代理对接类型'], ['agents', 'list-setting', '保存代理列设置'],
    ['agent-channels', 'read', '查看代理渠道'], ['agent-channels', 'filter-agent', '按代理筛选渠道'], ['agent-channels', 'create', '新增代理渠道'], ['agent-channels', 'update', '编辑代理渠道'], ['agent-channels', 'enable', '启用停用代理渠道'], ['agent-channels', 'delete', '删除代理渠道'],
    ['channels', 'read', '查看公司渠道'], ['channels', 'create', '新增公司渠道'], ['channels', 'update', '编辑公司渠道'], ['channels', 'enable', '启用停用公司渠道'], ['channels', 'delete', '删除公司渠道'], ['channels', 'carrier-manage', '维护承运商'], ['channels', 'carrier-enable', '启用停用承运商'], ['channels', 'business-type-manage', '维护业务类型'], ['channels', 'category-manage', '维护渠道类别'], ['channels', 'volume-rule-manage', '维护除材积'], ['channels', 'weight-rule-manage', '维护多件重量规则'], ['channels', 'settlement-rule-manage', '维护结算重量规则'], ['channels', 'large-cargo-rule-manage', '维护大货起始重量'], ['channels', 'remote-rule-manage', '维护偏远规则'],
    ['channel-categories', 'read', '查看渠道类别'], ['channel-categories', 'create', '新增渠道类别'], ['channel-categories', 'update', '编辑渠道类别'], ['channel-categories', 'enable', '启用停用渠道类别'], ['channel-categories', 'delete', '删除渠道类别'],
    ['remote-areas', 'read', '查看偏远规则'], ['remote-areas', 'file-view', '查看偏远附件'], ['remote-areas', 'file-upload', '上传偏远附件'], ['remote-areas', 'file-delete', '删除偏远附件'], ['remote-areas', 'file-paste-upload', '粘贴上传偏远附件'], ['remote-areas', 'rule-manage', '维护偏远规则'],
    ['exchange-rates', 'read', '查看当前汇率'], ['exchange-rates', 'history-view', '查看历史汇率'], ['exchange-rates', 'create', '新增历史汇率'], ['exchange-rates', 'update', '修改历史汇率'], ['exchange-rates', 'disable', '停用历史汇率'], ['exchange-rates', 'period-view', '查看汇率生效区间'], ['exchange-rates', 'export', '导出汇率记录'],
    ['assistant', 'read', '查看资料辅助'], ['assistant', 'ai-check', '执行 AI 资料体检'], ['assistant', 'missing-warning-view', '查看资料缺失提醒'], ['assistant', 'stats-view', '查看资料快捷统计'], ['assistant', 'suggestion-generate', '生成维护建议']
  ].map(([section, action, label]) => ({ code: `master-data:${section}:${action}` as PermissionKey, label, group: `基础资料库 / ${({ customers: '客户资料', finance: '财务资料', agents: '代理资料', 'agent-channels': '代理渠道', channels: '公司渠道', 'channel-categories': '渠道类别', 'remote-areas': '偏远', 'exchange-rates': '汇率', assistant: '资料辅助' } as Record<string, string>)[section]}` })),
  ...[
    ['user-groups', 'read', '查看用户组'], ['user-groups', 'detail', '查看用户组详情'], ['user-groups', 'create', '新建用户组'], ['user-groups', 'update', '编辑用户组'], ['user-groups', 'enable', '启用停用用户组'], ['user-groups', 'create-from-template', '从模板创建用户组'], ['user-groups', 'staff-view', '查看用户组绑定员工'], ['user-groups', 'audit-view', '查看用户组审计日志'], ['user-groups', 'export', '导出用户组'],
    ['accounts', 'read', '查看员工账号'], ['accounts', 'filter', '筛选员工账号'], ['accounts', 'create', '新建员工账号'], ['accounts', 'update-profile', '编辑员工资料'], ['accounts', 'update-role', '修改员工用户组'], ['accounts', 'update-site', '修改员工站点'], ['accounts', 'enable', '启用停用员工账号'], ['accounts', 'delete', '删除员工账号'], ['accounts', 'reset-password', '重置员工密码'], ['accounts', 'import', '导入员工账号'], ['accounts', 'export', '导出员工账号'], ['accounts', 'view-sensitive', '查看员工敏感资料'], ['accounts', 'must-change-password-view', '查看需改密账号'], ['accounts', 'incomplete-view', '查看资料未完善账号'],
    ['sites', 'read', '查看站点'], ['sites', 'create', '新建站点'], ['sites', 'update', '编辑站点'], ['sites', 'enable', '启用停用站点'], ['sites', 'sort', '调整站点排序'], ['sites', 'staff-view', '查看站点绑定员工'], ['sites', 'export', '导出站点'],
    ['audit', 'read', '查看操作日志'], ['audit', 'failed-view', '查看失败操作'], ['audit', 'important-view', '查看重要操作'], ['audit', 'permission-finance-view', '查看权限与财务变更'], ['audit', 'filter-actor', '按操作人筛选'], ['audit', 'filter-module', '按模块筛选'], ['audit', 'filter-target', '按对象筛选'], ['audit', 'filter-time', '按时间筛选'], ['audit', 'ip-view', '查看 IP 地址'], ['audit', 'detail-view', '查看审计详情'], ['audit', 'before-after-view', '查看变更前后'], ['audit', 'raw-request-view', '查看原始请求'], ['audit', 'export', '导出操作日志'], ['audit', 'lineage-view', '查看链路追溯'], ['audit', 'permission-denied-view', '查看权限拒绝日志'],
    ['role-permissions', 'read', '查看角色权限分配'], ['role-permissions', 'module-tree-view', '查看权限模块树'], ['role-permissions', 'overview-view', '查看角色权限概览'], ['role-permissions', 'update', '编辑角色权限'], ['role-permissions', 'save', '保存角色权限'], ['role-permissions', 'copy-role', '复制角色权限'], ['role-permissions', 'batch-grant', '批量授权'], ['role-permissions', 'batch-revoke', '批量取消授权'], ['role-permissions', 'clear', '清空角色权限'], ['role-permissions', 'readonly-mode', '仅查看权限'], ['role-permissions', 'compare', '对比其他角色'], ['role-permissions', 'risk-view', '查看高风险权限'], ['role-permissions', 'admin-update', '修改管理员组权限'],
    ['security', 'read', '查看权限安全区'], ['security', 'denied-view', '查看越权拦截记录'], ['security', 'risk-permission-view', '查看高风险权限清单'], ['security', 'role-conflict-view', '查看角色冲突提示'], ['security', 'sensitive-field-view', '查看敏感字段覆盖'], ['security', 'api-scan-view', '查看未授权接口扫描'], ['security', 'export', '导出安全区报告'],
    ['ai-security', 'read', '查看 AI 接口安全'], ['ai-security', 'permission-check', '执行 AI 权限体检'], ['ai-security', 'scenario-view', '查看 AI 调用场景'], ['ai-security', 'scenario-manage', '维护 AI 场景白名单'], ['ai-security', 'log-view', '查看 AI 调用日志'], ['ai-security', 'redaction-view', '查看 AI 脱敏策略'], ['ai-security', 'redaction-manage', '维护 AI 脱敏策略'], ['ai-security', 'scenario-enable', '启用停用 AI 场景'], ['ai-security', 'failed-view', '查看 AI 失败记录'],
    ['base-config', 'read', '查看系统基础配置'], ['base-config', 'template-manage', '维护系统模板'], ['base-config', 'status-dictionary-manage', '维护状态字典'], ['base-config', 'default-manage', '维护默认配置'], ['base-config', 'import-config-manage', '维护导入配置'], ['base-config', 'export-config-manage', '维护导出配置'], ['base-config', 'audit-view', '查看配置变更记录'], ['base-config', 'restore', '恢复系统配置'], ['base-config', 'export', '导出系统配置'], ['config', 'import', '导入系统配置'], ['permissions', 'export', '导出权限矩阵']
  ].map(([section, action, label]) => ({ code: `system:${section}:${action}` as PermissionKey, label, group: `系统管理 / ${({ 'user-groups': '用户组', accounts: '用户名', sites: '站点', audit: '操作日志', 'role-permissions': '角色权限分配', security: '权限安全区', 'ai-security': 'AI 接口安全', 'base-config': '系统基础配置', config: '系统基础配置', permissions: '角色权限分配' } as Record<string, string>)[section]}` }))
];

export const builtinRoleKeys: BuiltinRoleKey[] = ['ADMIN', 'CUSTOMER_SERVICE', 'OPERATOR', 'WAREHOUSE', 'FINANCE', 'CUSTOMER'];

const permissionWorkspacePrefixes = [
  '运营工作台 / ',
  '报价查价 / ',
  '业务管理 / ',
  '仓库管理 / ',
  '市场管理 / ',
  '客服管理 / ',
  '物流轨迹管理 / ',
  '财务管理 / ',
  '基础资料库 / ',
  '系统管理 / '
] as const;

/** 权限目录是角色配置页面的唯一事实源，不能由前端按文案静默去重。 */
export function assertPermissionDefinitionsIntegrity(definitions: readonly PermissionDefinition[] = permissionDefinitions): void {
  const codes = new Set<string>();
  const groupLabels = new Set<string>();

  for (const definition of definitions) {
    if (codes.has(definition.code)) throw new Error(`权限定义重复 code：${definition.code}`);
    if (!permissionWorkspacePrefixes.some((prefix) => definition.group.startsWith(prefix))) {
      throw new Error(`权限定义目录错误：${definition.code} 不属于已登记业务模块`);
    }
    const groupLabel = `${definition.group}::${definition.label.trim()}`;
    if (groupLabels.has(groupLabel)) throw new Error(`权限定义重复文案：${definition.group} / ${definition.label}`);
    codes.add(definition.code);
    groupLabels.add(groupLabel);
  }
}

export function getPermissionDefinitions(): typeof permissionDefinitions {
  assertPermissionDefinitionsIntegrity();
  return permissionDefinitions;
}

export function isBuiltinRoleKey(role: string): role is BuiltinRoleKey {
  return builtinRoleKeys.includes(role as BuiltinRoleKey);
}

export const defaultRoleGroups: Array<{
  key: RoleKey;
  label: string;
  description?: string;
  site?: string;
  sortOrder: number;
  templateRole: BuiltinRoleKey;
}> = [
  { key: 'UG_WAREHOUSE_RECEIVE', label: '仓库收货', site: '深圳思远', sortOrder: 1, templateRole: 'WAREHOUSE' },
  { key: 'UG_WAREHOUSE_OUTBOUND', label: '仓库出货', site: '深圳思远', sortOrder: 2, templateRole: 'WAREHOUSE' },
  { key: 'UG_CUSTOMER_SERVICE', label: '客服', description: '处理一般客服工作', site: '深圳思远', sortOrder: 3, templateRole: 'CUSTOMER_SERVICE' },
  { key: 'UG_FINANCE', label: '财务', site: '深圳思远', sortOrder: 4, templateRole: 'FINANCE' },
  { key: 'UG_PAYABLE_FINANCE', label: '出入账财务', description: '处理代理结算', site: '深圳思远', sortOrder: 5, templateRole: 'FINANCE' },
  { key: 'UG_MARKET', label: '市场部', description: '处理排货', site: '深圳思远', sortOrder: 6, templateRole: 'OPERATOR' },
  { key: 'UG_BUSINESS', label: '业务部', sortOrder: 7, templateRole: 'OPERATOR' },
  { key: 'UG_SZ_WUHAN', label: '深圳思远武汉', sortOrder: 8, templateRole: 'OPERATOR' },
  { key: 'UG_ZZ_SIHUA', label: '漳州思华', sortOrder: 9, templateRole: 'OPERATOR' },
  { key: 'UG_WH_JIUYULIAN', label: '武汉九域联', sortOrder: 10, templateRole: 'OPERATOR' },
  { key: 'UG_BUSINESS_MANAGER', label: '业务经理', sortOrder: 11, templateRole: 'OPERATOR' },
  { key: 'UG_BUSINESS_SUPERVISOR', label: '业务主管', sortOrder: 12, templateRole: 'OPERATOR' }
];

const warehouseBasePermissions: PermissionKey[] = [
  'warehouse:today-receipt:view', 'warehouse:today-receipt:filter', 'warehouse:today-receipt:manual-create', 'warehouse:today-receipt:update', 'warehouse:today-receipt:remark-update', 'warehouse:today-receipt:exception-manage', 'warehouse:today-receipt:column-setting',
  'warehouse:in-stock:view', 'warehouse:in-stock:update', 'warehouse:in-stock:split', 'warehouse:in-stock:batch-select', 'warehouse:in-stock:tally-start', 'warehouse:in-stock:batch-tally-start', 'warehouse:in-stock:tally-record-view', 'warehouse:in-stock:column-setting',
  'warehouse:tally-pending:view', 'warehouse:tally-pending:task-create', 'warehouse:tally-pending:task-update', 'warehouse:tally-pending:task-process', 'warehouse:tally-pending:merge-only', 'warehouse:tally-pending:merge-and-ship', 'warehouse:tally-pending:split', 'warehouse:tally-pending:detail-view', 'warehouse:tally-pending:history-view', 'warehouse:tally-pending:filter',
  'warehouse:tally-completed:view', 'warehouse:tally-completed:history-view', 'warehouse:tally-completed:detail-view', 'warehouse:tally-label:generate', 'warehouse:tally-label:print', 'warehouse:tally-label:download', 'warehouse:tally-label:scan-apply',
  'warehouse:dispatch-pending:view', 'warehouse:dispatch-pending:batch-select', 'warehouse:dispatch-pending:handover-preview', 'warehouse:dispatch-pending:handover-print', 'warehouse:dispatch-pending:dispatch-confirm', 'warehouse:dispatch-pending:batch-dispatch-confirm', 'warehouse:dispatch-pending:shipping-mark-confirm', 'warehouse:dispatch-pending:label-generate', 'warehouse:dispatch-pending:label-view', 'warehouse:dispatch-pending:column-setting',
  'warehouse:outbounded:view', 'warehouse:outbounded:handover-view', 'warehouse:outbounded:detail-view'
];

const marketBasePermissions: PermissionKey[] = [
  'market:dashboard:view', 'market:dashboard:pending-summary', 'market:dashboard:routed-summary', 'market:dashboard:weekly-summary', 'market:dashboard:agent-stats-view', 'market:dashboard:channel-mode-stats-view', 'market:dashboard:sensitive-summary-view', 'market:dashboard:team-view',
  'market:pending-routing:view', 'market:pending-routing:detail', 'market:pending-routing:assign', 'market:pending-routing:save-draft', 'market:pending-routing:confirm', 'market:pending-routing:audit', 'market:pending-routing:update', 'market:pending-routing:delete', 'market:pending-routing:operation-log-view', 'market:pending-routing:business-cost-view', 'market:pending-routing:payable-cost-view', 'market:pending-routing:agent-channel-view', 'market:pending-routing:cost-field-view', 'market:pending-routing:column-setting',
  'market:routed:view', 'market:routed:detail', 'market:routed:update', 'market:routed:reroute', 'market:routed:log-view', 'market:routed:agent-cost-view', 'market:routed:cost-total-view', 'market:routed:agent-channel-view', 'market:routed:column-setting',
  'market:weekly-routing:view', 'market:weekly-routing:detail', 'market:weekly-routing:agent-stats-view', 'market:weekly-routing:channel-mode-stats-view', 'market:weekly-routing:cost-view', 'market:weekly-routing:reroute-stats-view', 'market:weekly-routing:sensitive-stats-view', 'market:weekly-routing:column-setting'
];

const customerServiceBasePermissions: PermissionKey[] = permissionDefinitions
  .filter((permission) => permission.code.startsWith('customer-service:'))
  .map((permission) => permission.code);

const financeFunctionPermissions: PermissionKey[] = permissionDefinitions
  .filter((permission) => permission.code.startsWith('finance:'))
  .map((permission) => permission.code);

const pricingLookupBusinessPermissions: PermissionKey[] = permissionDefinitions
  .filter((permission) => permission.code.startsWith('pricing:lookup:'))
  .map((permission) => permission.code)
  .filter((permission) => ![
    'pricing:lookup:internal-source-view',
    'pricing:lookup:cost-view',
    'pricing:lookup:gross-profit-view',
    'pricing:lookup:markup-breakdown-view'
  ].includes(permission));

// 南非物料规则是业务报价的公开口径。业务员只读查看全量规则，
// 维护权限仍由 south-africa:rules-create/update/enable/delete 单独控制。
const pricingSouthAfricaBusinessReadPermissions: PermissionKey[] = [
  'pricing:south-africa:rules-read'
];

const pricingManagementPermissions: PermissionKey[] = permissionDefinitions
  .filter((permission) => permission.code.startsWith('pricing:'))
  .map((permission) => permission.code);

const masterDataReferencePermissions: PermissionKey[] = [
  'master-data:customers:read',
  'master-data:finance:read',
  'master-data:agents:read',
  'master-data:agent-channels:read',
  'master-data:channels:read',
  'master-data:channel-categories:read',
  'master-data:exchange-rates:read'
];

const businessMasterDataReferencePermissions: PermissionKey[] = [
  'business:shipment:finance-detail-view',
  'master-data:customers:read',
  'master-data:customers:view-own',
  'master-data:customers:detail',
  'master-data:customers:create',
  'master-data:customers:update',
  'master-data:customers:enable',
  'master-data:customers:delete',
  'master-data:customers:contacts-view',
  'master-data:customers:contacts-manage',
  'master-data:customers:contacts-disable',
  'master-data:customers:user-create',
  'master-data:customers:list-setting',
  'master-data:finance:read',
  'master-data:channels:read',
  'master-data:channel-categories:read',
  'master-data:exchange-rates:read'
];

export const rolePermissions: Record<BuiltinRoleKey, PermissionKey[]> = {
  ADMIN: allPermissions(),
  CUSTOMER_SERVICE: [...pricingLookupBusinessPermissions, ...masterDataReferencePermissions, 'tracking:external:view', 'tracking:external:latest-view', 'tracking:external:stale-days-view', 'tracking:external:detail', ...customerServiceBasePermissions],
  OPERATOR: [...pricingLookupBusinessPermissions, ...pricingSouthAfricaBusinessReadPermissions, 'finance:business-cost:read', 'finance:business-cost:manage', 'finance:water-receipt:read', 'finance:water-receipt:voucher-view', 'finance:water-receipt:voucher-upload', 'finance:water-receipt:voucher-delete', ...businessMasterDataReferencePermissions, 'operations:line-shipment:view', 'operations:line-shipment:detail', 'operations:line-shipment:process', 'operations:line-shipment:status-update', 'operations:line-shipment:tracking-add', 'operations:line-shipment:problem-create', 'operations:line-shipment:import', 'operations:line-shipment:internal-log-view', 'operations:ai-queue:view', 'operations:ai-queue:assist', 'operations:ai-queue:mark-read', 'operations:ai-queue:handle', 'operations:product-map:view', 'operations:product-map:route-view', 'operations:import-quality:view', 'operations:import-quality:upload', 'operations:import-quality:retry', 'operations:import-quality:error-detail-view', 'operations:import-quality:confirm', 'business:dashboard:view', 'business:dashboard:trend-view', 'business:dashboard:pending-review-summary', 'business:order-entry:view', 'business:order-entry:warehouse-package-select', 'business:order-entry:create', 'business:order-entry:draft-view', 'business:order-entry:draft-save', 'business:order-entry:draft-delete', 'business:order-entry:submit-review', 'business:order-entry:invoice-upload', 'business:order-entry:label-upload', 'business:order-fee:view', 'business:order-fee:create', 'business:order-fee:update', 'business:order-fee:delete', 'business:review:list', 'business:review:detail', 'business:review:approve', 'business:shipment:list', 'business:shipment:detail', 'business:shipment:self-view', 'business:shipment:update-basic', 'business:shipment:tracking-add', 'business:shipment:problem-create', 'business:shipment:column-setting', 'business:order-ai:view', 'business:order-ai:assist'],
  WAREHOUSE: ['operations:line-shipment:view', 'operations:line-shipment:detail', ...warehouseBasePermissions],
  FINANCE: ['business:shipment:list', 'business:review:restore', ...pricingLookupBusinessPermissions, ...financeFunctionPermissions, 'master-data:finance:read', 'master-data:agents:read', 'master-data:agents:bank-view', 'master-data:exchange-rates:read'],
  CUSTOMER: [
    'business:order-entry:create',
    'business:shipment:list',
    'business:shipment:detail',
    'business:shipment:self-view',
    'customer-service:problem:view',
    'customer-service:problem:create',
    'customer-service:problem:reply',
    'customer-service:problem:close',
    'finance:customer-account:read'
  ]
};

export const roleMetadata: Record<BuiltinRoleKey, Omit<RolePermissionRow, 'permissions'>> = {
  ADMIN: {
    key: 'ADMIN',
    label: '管理员组',
    account: 'admin',
    scope: '全局数据',
    restriction: '系统管理员：全部权限，运单、财务、基础资料、系统管理'
  },
  CUSTOMER_SERVICE: {
    key: 'CUSTOMER_SERVICE',
    label: '客服',
    account: 'service',
    scope: '客户与问题件',
    restriction: '运单读写、基础资料读取；不能核销、不能改系统权限'
  },
  OPERATOR: {
    key: 'OPERATOR',
    label: '业务员',
    account: 'operator',
    scope: '客户出货与渠道排货',
    restriction: '可操作运单、排货、查询报价和维护自己范围的业务成本；不能查看代理、全部成本、价格表管理、财务核销和系统设置'
  },
  WAREHOUSE: {
    key: 'WAREHOUSE',
    label: '仓库',
    account: 'warehouse',
    scope: '入库、合票、打单、出货',
    restriction: '只处理仓库管理和必要轨迹查看；不能访问报价管理、财务和系统设置'
  },
  FINANCE: {
    key: 'FINANCE',
    label: '财务',
    account: 'finance',
    scope: '财务数据',
    restriction: '运单读取、财务读取、财务核销、基础资料读取；不能改系统权限'
  },
  CUSTOMER: {
    key: 'CUSTOMER',
    label: '客户',
    account: 'customer',
    scope: '本人客户数据',
    restriction: '客户门户、本人运单、本人费用、本人问题件'
  }
};

export function allPermissions(): PermissionKey[] {
  return getPermissionDefinitions().map((item) => item.code);
}

export function isSalesScopedRole(role: string): boolean {
  return [
    'OPERATOR',
    'UG_MARKET',
    'UG_BUSINESS',
    'UG_SZ_WUHAN',
    'UG_ZZ_SIHUA',
    'UG_WH_JIUYULIAN',
    'UG_BUSINESS_MANAGER',
    'UG_BUSINESS_SUPERVISOR'
  ].includes(role);
}

export function isBusinessAgentRestrictedRole(role: string): boolean {
  return isSalesScopedRole(role) && role !== 'UG_MARKET';
}

export function hasPermission(role: RoleKey, permission: PermissionKey): boolean {
  if (role === 'ADMIN') {
    return true;
  }
  return defaultPermissionsForRole(role).includes(permission);
}

export function normalizeRolePermissions(role: RoleKey, permissions: PermissionKey[]): PermissionKey[] {
  if (role === 'ADMIN') {
    return allPermissions();
  }
  const allowed = new Set(allPermissions());
  return [...new Set(permissions)].filter((permission) => allowed.has(permission));
}

export function defaultPermissionsForRole(role: RoleKey): PermissionKey[] {
  if (isBuiltinRoleKey(role)) return rolePermissions[role];
  const roleGroup = defaultRoleGroups.find((group) => group.key === role);
  if (roleGroup) {
    const inherited = [...rolePermissions[roleGroup.templateRole]];
    if (role === 'UG_WAREHOUSE_RECEIVE') {
      return inherited.filter((permission) => permission.startsWith('warehouse:today-receipt:') || permission === 'warehouse:in-stock:view' || permission === 'warehouse:in-stock:column-setting' || !permission.startsWith('warehouse:'));
    }
    if (role === 'UG_WAREHOUSE_OUTBOUND') {
      return inherited.filter((permission) => permission.startsWith('warehouse:dispatch-pending:') || permission.startsWith('warehouse:outbounded:') || !permission.startsWith('warehouse:'));
    }
    if (role === 'UG_MARKET') {
      return [...new Set<PermissionKey>([
        ...inherited,
        'master-data:agents:read',
        'master-data:agent-channels:read',
        ...marketBasePermissions,
        ...pricingManagementPermissions
      ])];
    }
    if (role === 'UG_BUSINESS_MANAGER' || role === 'UG_BUSINESS_SUPERVISOR') {
      inherited.push(
        'business:dashboard:team-view',
        'business:review:deleted-list',
        'business:review:approve',
        'business:review:reject',
        'business:review:reverse',
        'business:review:delete',
        'business:review:restore',
        'business:review:finance-detail-view',
        'business:review:operation-log-view',
        'business:shipment:team-view',
        'business:shipment:update-operational',
        'business:shipment:payment-record'
      );
    }
    return [...new Set(inherited)];
  }
  return [];
}

export function getRoleMetadata(role: RoleKey): Omit<RolePermissionRow, 'permissions'> {
  if (isBuiltinRoleKey(role)) {
    return roleMetadata[role];
  }
  return {
    key: role,
    label: role,
    account: '-',
    scope: '自定义用户组',
    restriction: '按勾选权限执行',
    sortOrder: 0,
    enabled: true,
    systemBuiltin: false
  };
}

export function buildRolePermissionRow(role: RoleKey, permissions: PermissionKey[], metadata: Partial<Omit<RolePermissionRow, 'key' | 'permissions'>> = {}): RolePermissionRow {
  return {
    ...getRoleMetadata(role),
    ...metadata,
    key: role,
    permissions: normalizeRolePermissions(role, permissions)
  };
}
