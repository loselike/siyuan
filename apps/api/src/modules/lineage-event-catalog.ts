export type JsonValue = unknown;

export type LineageEventKind = 'raw' | 'process' | 'result' | 'aggregate';

export type LineageRef = { nodeType: string; id: string };

export type LineageEventContext = {
  actorUsername?: string;
  businessId?: string;
  payload?: JsonValue;
  rawPayload?: JsonValue;
  sourceRefs?: LineageRef[];
  metrics?: JsonValue;
  metadata?: JsonValue;
};

export interface LineageEventDefinition {
  key: string;
  domain: string;
  module: string;
  section: string;
  action: string;
  eventKind: LineageEventKind;
  resultType: string;
  businessIdResolver?: (context: LineageEventContext) => string | undefined;
  sourceRefsResolver?: (context: LineageEventContext) => LineageRef[];
  metricsBuilder?: (context: LineageEventContext) => JsonValue;
  sensitiveFields: string[];
}

const COMMON_SENSITIVE_FIELDS = [
  'password',
  'newPassword',
  'oldPassword',
  'token',
  'jwt',
  'secret',
  'apiKey',
  'captcha',
  'bankAccountNo',
  'accountNo',
  'cardNo',
  'filePath',
  'localPath'
];

function define(input: Omit<LineageEventDefinition, 'sensitiveFields'> & { sensitiveFields?: string[] }): LineageEventDefinition {
  return {
    ...input,
    sensitiveFields: [...COMMON_SENSITIVE_FIELDS, ...(input.sensitiveFields ?? [])]
  };
}

const byBusinessId = (context: LineageEventContext) => context.businessId;
const bySourceRefs = (context: LineageEventContext) => context.sourceRefs ?? [];
const byMetrics = (context: LineageEventContext) => context.metrics;

export const LINEAGE_EVENT_DEFINITIONS = [
  define({ key: 'workspace.shipment_pool.batch_action', domain: 'workspace', module: '运营工作台', section: '专线运单池', action: '批量处理运单', eventKind: 'process', resultType: 'workspace_batch_action', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'workspace.ai_queue.suggestion', domain: 'workspace', module: '运营工作台', section: 'AI 优先队列', action: '生成风险建议', eventKind: 'process', resultType: 'workspace_ai_suggestion', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'workspace.product_map.snapshot', domain: 'workspace', module: '运营工作台', section: '产品地图', action: '生成模块覆盖快照', eventKind: 'aggregate', resultType: 'workspace_product_map_snapshot', businessIdResolver: byBusinessId, metricsBuilder: byMetrics }),
  define({ key: 'workspace.import_quality.snapshot', domain: 'workspace', module: '运营工作台', section: '导入质检', action: '生成导入质检快照', eventKind: 'aggregate', resultType: 'workspace_import_quality_snapshot', businessIdResolver: byBusinessId, metricsBuilder: byMetrics }),

  define({ key: 'pricing.lookup.quote', domain: 'pricing', module: '报价查价', section: '查价', action: '报价试算', eventKind: 'process', resultType: 'price_lookup', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'pricing.lookup.legacy_quote', domain: 'pricing', module: '报价查价', section: '查价', action: '兼容报价试算', eventKind: 'process', resultType: 'legacy_price_lookup', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'pricing.lookup.routes_view', domain: 'pricing', module: '报价查价', section: '查价', action: '线路候选计算', eventKind: 'process', resultType: 'price_route_candidates', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'pricing.markup.rule_change', domain: 'pricing', module: '报价查价', section: '代理加价规则', action: '维护代理加价规则', eventKind: 'result', resultType: 'agent_markup_rule', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'pricing.markup.batch_change', domain: 'pricing', module: '报价查价', section: '代理加价规则', action: '批量设置线路加价', eventKind: 'result', resultType: 'agent_markup_batch', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'pricing.price_books.import', domain: 'pricing', module: '报价查价', section: '价格表管理', action: '价格表导入落库', eventKind: 'result', resultType: 'price_book', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics, sensitiveFields: ['originalBuffer'] }),
  define({ key: 'pricing.price_books.raw_file', domain: 'pricing', module: '报价查价', section: '价格表管理', action: '上传价格表原始文件', eventKind: 'raw', resultType: 'price_book_file', businessIdResolver: byBusinessId, metricsBuilder: byMetrics, sensitiveFields: ['originalBuffer', 'filePath'] }),
  define({ key: 'pricing.price_books.remark_update', domain: 'pricing', module: '报价查价', section: '价格表管理', action: '维护价格表备注', eventKind: 'result', resultType: 'price_book_remark', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'pricing.price_books.delete', domain: 'pricing', module: '报价查价', section: '价格表管理', action: '删除价格表', eventKind: 'result', resultType: 'price_book_delete', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'pricing.south_africa.rule_change', domain: 'pricing', module: '报价查价', section: '南非专线查询', action: '维护南非物料规则', eventKind: 'result', resultType: 'south_africa_rate_rule', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),

  define({ key: 'orders.entry.submit', domain: 'orders', module: '业务管理', section: '录单', action: '提交录单', eventKind: 'result', resultType: 'shipment', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'orders.entry.draft', domain: 'orders', module: '业务管理', section: '草稿箱', action: '保存录单草稿', eventKind: 'result', resultType: 'shipment_draft', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'orders.entry.draft_delete', domain: 'orders', module: '业务管理', section: '草稿箱', action: '删除录单草稿', eventKind: 'result', resultType: 'shipment_draft_delete', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'orders.review.approve', domain: 'orders', module: '业务管理', section: '待审核运单', action: '审核通过', eventKind: 'result', resultType: 'shipment_review', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'orders.review.reject', domain: 'orders', module: '业务管理', section: '待审核运单', action: '审核驳回', eventKind: 'result', resultType: 'shipment_review', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'orders.management.update', domain: 'orders', module: '业务管理', section: '运单管理', action: '修改运单', eventKind: 'result', resultType: 'shipment_update', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'orders.management.delete_restore', domain: 'orders', module: '业务管理', section: '运单管理', action: '删除或恢复运单', eventKind: 'result', resultType: 'shipment_lifecycle', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'orders.ai.suggestion', domain: 'orders', module: '业务管理', section: 'AI 订单助手', action: '生成订单建议', eventKind: 'process', resultType: 'order_ai_suggestion', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),

  define({ key: 'warehouse.today.receive', domain: 'warehouse', module: '仓库管理', section: '今日收货', action: '仓库收货录入', eventKind: 'result', resultType: 'warehouse_package', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'warehouse.packages.update', domain: 'warehouse', module: '仓库管理', section: '在仓数据', action: '更新件重尺或备注', eventKind: 'result', resultType: 'warehouse_package_update', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'warehouse.packages.split', domain: 'warehouse', module: '仓库管理', section: '在仓数据', action: '拆分包裹', eventKind: 'result', resultType: 'warehouse_package_split', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'warehouse.tally.create', domain: 'warehouse', module: '仓库管理', section: '未完成理货', action: '创建理货任务', eventKind: 'result', resultType: 'warehouse_tally_task', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'warehouse.tally.complete', domain: 'warehouse', module: '仓库管理', section: '已完成理货', action: '完成理货', eventKind: 'result', resultType: 'warehouse_tally_complete', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'warehouse.pending_routing.snapshot', domain: 'warehouse', module: '仓库管理', section: '待排货', action: '待排货快照', eventKind: 'aggregate', resultType: 'warehouse_pending_routing_snapshot', businessIdResolver: byBusinessId, metricsBuilder: byMetrics }),
  define({ key: 'warehouse.queue.dispatch', domain: 'warehouse', module: '仓库管理', section: '待出库', action: '确认出库', eventKind: 'result', resultType: 'shipment_dispatch', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'warehouse.queue.label', domain: 'warehouse', module: '仓库管理', section: '待出库', action: '生成或打印标签', eventKind: 'result', resultType: 'warehouse_label', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'warehouse.outbounded.snapshot', domain: 'warehouse', module: '仓库管理', section: '已出库', action: '已出库结果快照', eventKind: 'aggregate', resultType: 'warehouse_outbounded_snapshot', businessIdResolver: byBusinessId, metricsBuilder: byMetrics }),
  define({ key: 'warehouse.dashboard.snapshot', domain: 'warehouse', module: '仓库管理', section: '仓库看板', action: '仓库指标快照', eventKind: 'aggregate', resultType: 'warehouse_dashboard_snapshot', businessIdResolver: byBusinessId, metricsBuilder: byMetrics }),

  define({ key: 'market.dashboard.snapshot', domain: 'market', module: '市场管理', section: '市场看板', action: '市场指标快照', eventKind: 'aggregate', resultType: 'market_dashboard_snapshot', businessIdResolver: byBusinessId, metricsBuilder: byMetrics }),
  define({ key: 'market.pending_routing.route', domain: 'market', module: '市场管理', section: '待排货', action: '排货确认', eventKind: 'result', resultType: 'shipment_route', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'market.pending_routing.approve', domain: 'market', module: '市场管理', section: '待排货', action: '排货审核通过', eventKind: 'result', resultType: 'shipment_route_approval', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'market.pending_routing.delete', domain: 'market', module: '市场管理', section: '待排货', action: '删除待排货', eventKind: 'result', resultType: 'shipment_pending_routing_delete', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'market.routed.reroute', domain: 'market', module: '市场管理', section: '已排货', action: '重新排货', eventKind: 'result', resultType: 'shipment_reroute', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'market.weekly_routing.snapshot', domain: 'market', module: '市场管理', section: '本周排货数据', action: '本周排货快照', eventKind: 'aggregate', resultType: 'market_weekly_routing_snapshot', businessIdResolver: byBusinessId, metricsBuilder: byMetrics }),

  define({ key: 'customer_service.dashboard.snapshot', domain: 'customer_service', module: '客服管理', section: '客服看板', action: '客服指标快照', eventKind: 'aggregate', resultType: 'customer_service_dashboard_snapshot', businessIdResolver: byBusinessId, metricsBuilder: byMetrics }),
  define({ key: 'customer_service.data_confirm.approve', domain: 'customer_service', module: '客服管理', section: '数据确认', action: '确认业务数据', eventKind: 'result', resultType: 'customer_service_data_confirm', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'customer_service.transfer.update', domain: 'customer_service', module: '客服管理', section: '转单号', action: '维护转单号', eventKind: 'result', resultType: 'shipment_transfer_update', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'customer_service.pending_routing.snapshot', domain: 'customer_service', module: '客服管理', section: '待排货', action: '客服待排货快照', eventKind: 'aggregate', resultType: 'customer_service_pending_routing_snapshot', businessIdResolver: byBusinessId, metricsBuilder: byMetrics }),
  define({ key: 'customer_service.departure.confirm', domain: 'customer_service', module: '客服管理', section: '待离港', action: '确认离港', eventKind: 'result', resultType: 'shipment_departure_confirm', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'customer_service.departed.update', domain: 'customer_service', module: '客服管理', section: '已离港', action: '维护离港后信息', eventKind: 'result', resultType: 'shipment_departed_update', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'customer_service.arrived_port.confirm', domain: 'customer_service', module: '客服管理', section: '已到港', action: '确认到港', eventKind: 'result', resultType: 'shipment_arrived_port_confirm', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'customer_service.delivering.confirm', domain: 'customer_service', module: '客服管理', section: '已派送', action: '确认派送', eventKind: 'result', resultType: 'shipment_delivering_confirm', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'customer_service.signed.confirm', domain: 'customer_service', module: '客服管理', section: '已签收', action: '确认签收', eventKind: 'result', resultType: 'shipment_signed_confirm', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'customer_service.problems.change', domain: 'customer_service', module: '客服管理', section: '问题件', action: '创建或处理问题件', eventKind: 'result', resultType: 'problem_ticket', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'customer_service.after_sale.change', domain: 'customer_service', module: '客服管理', section: '售后', action: '处理售后', eventKind: 'result', resultType: 'after_sale_case', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),

  define({ key: 'tracking.tasks.run', domain: 'tracking', module: '物流轨迹管理', section: '承运商任务', action: '运行或重试轨迹任务', eventKind: 'process', resultType: 'carrier_tracking_task', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'tracking.latest.add_event', domain: 'tracking', module: '物流轨迹管理', section: '最新轨迹', action: '轨迹结果落库', eventKind: 'result', resultType: 'tracking_event', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'tracking.manual_import.raw_file', domain: 'tracking', module: '物流轨迹管理', section: '手动添加轨迹', action: '上传轨迹原始文件', eventKind: 'raw', resultType: 'tracking_import_file', businessIdResolver: byBusinessId, metricsBuilder: byMetrics, sensitiveFields: ['originalBuffer'] }),
  define({ key: 'tracking.manual_import.complete', domain: 'tracking', module: '物流轨迹管理', section: '手动添加轨迹', action: '手动轨迹导入落库', eventKind: 'result', resultType: 'tracking_manual_import', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),

  define({ key: 'finance.dashboard.snapshot', domain: 'finance', module: '财务管理', section: '财务看板', action: '财务指标快照', eventKind: 'aggregate', resultType: 'finance_dashboard_snapshot', businessIdResolver: byBusinessId, metricsBuilder: byMetrics }),
  define({ key: 'finance.receivables.audit', domain: 'finance', module: '财务管理', section: '应收审核', action: '应收审核或反审', eventKind: 'result', resultType: 'receivable_finance_item', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'finance.business_costs.audit', domain: 'finance', module: '财务管理', section: '业务成本审核', action: '业务成本审核或反审', eventKind: 'result', resultType: 'business_cost_finance_item', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'finance.payables.audit', domain: 'finance', module: '财务管理', section: '市场应付审核', action: '应付审核或反审', eventKind: 'result', resultType: 'payable_finance_item', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'finance.payment_applications.create', domain: 'finance', module: '财务管理', section: '待付款', action: '生成付款申请', eventKind: 'result', resultType: 'payment_application', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'finance.paid_verification.confirm', domain: 'finance', module: '财务管理', section: '已付款', action: '确认付款核销', eventKind: 'result', resultType: 'paid_payment', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics, sensitiveFields: ['payerBankAccountNo', 'payeeBankAccountNo'] }),
  define({ key: 'finance.water_receipt_arrivals.arrive', domain: 'finance', module: '财务管理', section: '水单到账查询', action: '确认水单到账', eventKind: 'result', resultType: 'water_receipt_arrival', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'finance.water_receipts.create', domain: 'finance', module: '财务管理', section: '水单匹配', action: '新增水单', eventKind: 'result', resultType: 'water_receipt', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'finance.water_receipts.match', domain: 'finance', module: '财务管理', section: '水单匹配', action: '匹配或撤销匹配水单', eventKind: 'result', resultType: 'water_receipt_match', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'finance.agent_bill_ai.process', domain: 'finance', module: '财务管理', section: '代理账单', action: '代理账单解析建议', eventKind: 'process', resultType: 'agent_bill_ai_result', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics, sensitiveFields: ['originalBuffer'] }),

  define({ key: 'master.customers.change', domain: 'master_data', module: '基础资料库', section: '客户资料', action: '维护客户资料', eventKind: 'result', resultType: 'customer', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'master.finance_catalog.change', domain: 'master_data', module: '基础资料库', section: '财务资料', action: '维护财务资料', eventKind: 'result', resultType: 'finance_catalog', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'master.agents.change', domain: 'master_data', module: '基础资料库', section: '代理资料', action: '维护代理资料', eventKind: 'result', resultType: 'agent', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'master.agent_channels.change', domain: 'master_data', module: '基础资料库', section: '代理渠道', action: '维护代理渠道', eventKind: 'result', resultType: 'agent_channel', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'master.company_channels.change', domain: 'master_data', module: '基础资料库', section: '公司渠道', action: '维护公司渠道', eventKind: 'result', resultType: 'company_channel', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'master.channel_categories.change', domain: 'master_data', module: '基础资料库', section: '渠道类别', action: '维护渠道类别', eventKind: 'result', resultType: 'channel_category', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'master.remote_areas.change', domain: 'master_data', module: '基础资料库', section: '偏远', action: '维护偏远规则', eventKind: 'result', resultType: 'remote_area_rule', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'master.exchange_rates.change', domain: 'master_data', module: '基础资料库', section: '汇率', action: '维护汇率', eventKind: 'result', resultType: 'exchange_rate', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'master.assistant.suggestion', domain: 'master_data', module: '基础资料库', section: '资料辅助', action: '资料体检建议', eventKind: 'process', resultType: 'master_data_assistant_result', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),

  define({ key: 'system.user_groups.change', domain: 'system', module: '系统管理', section: '用户组', action: '维护用户组', eventKind: 'result', resultType: 'user_group', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'system.accounts.change', domain: 'system', module: '系统管理', section: '用户名', action: '维护账号', eventKind: 'result', resultType: 'staff_account', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics, sensitiveFields: ['passwordHash'] }),
  define({ key: 'system.sites.change', domain: 'system', module: '系统管理', section: '站点', action: '维护站点', eventKind: 'result', resultType: 'site', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'system.audit.trace_query', domain: 'system', module: '系统管理', section: '操作日志', action: '链路查询入口', eventKind: 'process', resultType: 'lineage_trace_query', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'system.role_permissions.change', domain: 'system', module: '系统管理', section: '角色权限分配', action: '维护角色权限', eventKind: 'result', resultType: 'role_permissions', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'system.security.guard_denied', domain: 'system', module: '系统管理', section: '权限安全区', action: '权限防护拦截', eventKind: 'process', resultType: 'security_guard_denied', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'system.ai_security.change', domain: 'system', module: '系统管理', section: 'AI 接口安全', action: '维护 AI 接口安全配置', eventKind: 'result', resultType: 'ai_security_config', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics }),
  define({ key: 'system.base_config.change', domain: 'system', module: '系统管理', section: '系统基础配置', action: '维护系统基础配置', eventKind: 'result', resultType: 'system_base_config', businessIdResolver: byBusinessId, sourceRefsResolver: bySourceRefs, metricsBuilder: byMetrics })
] as const;

export type LineageEventDefinitionKey = typeof LINEAGE_EVENT_DEFINITIONS[number]['key'];

export const LINEAGE_EVENT_CATALOG: Record<LineageEventDefinitionKey, LineageEventDefinition> = Object.fromEntries(
  LINEAGE_EVENT_DEFINITIONS.map((definition) => [definition.key, definition])
) as Record<LineageEventDefinitionKey, LineageEventDefinition>;

export function getLineageEventDefinition(key: LineageEventDefinitionKey | string) {
  return LINEAGE_EVENT_CATALOG[key as LineageEventDefinitionKey];
}
