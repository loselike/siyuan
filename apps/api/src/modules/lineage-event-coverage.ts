import { LINEAGE_EVENT_DEFINITIONS, type LineageEventDefinitionKey } from './lineage-event-catalog.js';

export type LineageEventWiringStatus = 'wired' | 'partial' | 'pending';

export interface LineageEventWiringRow {
  key: LineageEventDefinitionKey;
  domain: string;
  module: string;
  section: string;
  action: string;
  resultType: string;
  status: LineageEventWiringStatus;
  wiredBy: string[];
  traceVerified: boolean;
  nextBatch: string;
  note: string;
}

type WiringOverride = Pick<LineageEventWiringRow, 'status' | 'wiredBy' | 'traceVerified' | 'nextBatch' | 'note'>;

const WIRING_OVERRIDES: Partial<Record<LineageEventDefinitionKey, WiringOverride>> = {
  'pricing.lookup.quote': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.lookupPrice', 'PrismaRepository.lookupPrice'],
    traceVerified: false,
    nextBatch: '报价查价第一批',
    note: '运行时 hook 已绑定目录 key，记录查价过程、命中价格行和推荐数量。'
  },
  'pricing.lookup.legacy_quote': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.quoteLegacyPricing', 'PrismaRepository.quoteLegacyPricing'],
    traceVerified: false,
    nextBatch: '报价查价第一批',
    note: '运行时 hook 已绑定目录 key，记录兼容查价过程、候选行和模块指标。'
  },
  'pricing.lookup.routes_view': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.getPriceBookRows', 'PrismaRepository.getPriceBookRows'],
    traceVerified: false,
    nextBatch: '报价查价第一批',
    note: '查看线路候选查询已记录目录 key、查询范围、分页结果和候选价格行引用。'
  },
  'pricing.markup.rule_change': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.createAgentMarkupRule', 'InMemoryRepository.updateAgentMarkupRule', 'InMemoryRepository.deleteAgentMarkupRule', 'PrismaRepository.createAgentMarkupRule', 'PrismaRepository.updateAgentMarkupRule', 'PrismaRepository.deleteAgentMarkupRule'],
    traceVerified: false,
    nextBatch: '报价查价第一批',
    note: '代理加价规则新增、修改、删除已记录目录 key 和规则快照。'
  },
  'pricing.markup.batch_change': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.batchUpsertAgentMarkupRules', 'InMemoryRepository.batchUpdateAgentMarkupRules', 'InMemoryRepository.batchDeleteAgentMarkupRules', 'PrismaRepository.batchUpsertAgentMarkupRules', 'PrismaRepository.batchUpdateAgentMarkupRules', 'PrismaRepository.batchDeleteAgentMarkupRules'],
    traceVerified: false,
    nextBatch: '报价查价第一批',
    note: '代理加价批量设置、批量启停、批量删除已记录目录 key、范围和成功数量。'
  },
  'pricing.price_books.import': {
    status: 'wired',
    wiredBy: ['LineageWatcher.recordPriceBookImport', 'InMemoryRepository.importPriceBook', 'PrismaRepository.persistPriceBookRows'],
    traceVerified: true,
    nextBatch: '报价查价第一批',
    note: '已记录 raw batch、采样 raw row、clean row、price_book result 和预聚合。'
  },
  'pricing.price_books.raw_file': {
    status: 'wired',
    wiredBy: ['LineageWatcher.recordPriceBookImport', 'InMemoryRepository.createPriceBookImportJob', 'PrismaRepository.createPriceBookImportJob'],
    traceVerified: true,
    nextBatch: '报价查价第一批',
    note: '价格表导入和异步上传任务均记录原始文件批次和文件元数据，私密路径按目录敏感字段策略处理。'
  },
  'pricing.price_books.remark_update': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.updatePriceBookRemark', 'PrismaRepository.updatePriceBookRemark'],
    traceVerified: false,
    nextBatch: '报价查价第一批',
    note: '价格表备注维护已记录目录 key、前后备注快照和备注长度指标。'
  },
  'pricing.price_books.delete': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.deletePriceBook', 'PrismaRepository.deletePriceBook'],
    traceVerified: false,
    nextBatch: '报价查价第一批',
    note: '价格表删除已记录目录 key、删除行数、兼容源删除数量和价格表引用。'
  },
  'pricing.south_africa.rule_change': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.createSouthAfricaRateRule', 'InMemoryRepository.updateSouthAfricaRateRule', 'InMemoryRepository.updateSouthAfricaRateRuleEnabled', 'InMemoryRepository.deleteSouthAfricaRateRule', 'PrismaRepository.createSouthAfricaRateRule', 'PrismaRepository.updateSouthAfricaRateRule', 'PrismaRepository.updateSouthAfricaRateRuleEnabled', 'PrismaRepository.deleteSouthAfricaRateRule'],
    traceVerified: false,
    nextBatch: '报价查价第一批',
    note: '南非物料规则新增、修改、启停、删除已记录目录 key、规则快照和关键词数量。'
  },
  'orders.entry.submit': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.createOrderEntry', 'InMemoryRepository.updateOrderEntryDraft', 'PrismaRepository.createOrderEntry', 'PrismaRepository.updateOrderEntryDraft'],
    traceVerified: false,
    nextBatch: '业务管理第一批',
    note: '录单新建提交和草稿提交审核均已绑定目录 key，记录运单、仓库包裹和费用摘要。'
  },
  'orders.entry.draft': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.createOrderEntry', 'InMemoryRepository.updateOrderEntryDraft', 'PrismaRepository.createOrderEntry', 'PrismaRepository.updateOrderEntryDraft'],
    traceVerified: false,
    nextBatch: '业务管理第一批',
    note: '录单草稿新建和继续编辑均已绑定目录 key，草稿结果使用 shipment_draft 口径。'
  },
  'orders.entry.draft_delete': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.deleteOrderEntryDraft', 'PrismaRepository.deleteOrderEntryDraft'],
    traceVerified: false,
    nextBatch: '业务管理第一批',
    note: '录单草稿箱删除已记录删除原因、草稿包裹数量和草稿来源。'
  },
  'orders.review.approve': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.approveShipmentReview', 'PrismaRepository.approveShipmentReview'],
    traceVerified: false,
    nextBatch: '业务管理第一批',
    note: '业务员自审通过已记录审核结果、费用摘要和运单来源。'
  },
  'orders.review.reject': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.rejectShipmentReview', 'PrismaRepository.rejectShipmentReview'],
    traceVerified: false,
    nextBatch: '业务管理第一批',
    note: '审核驳回已记录驳回原因、费用摘要和运单来源。'
  },
  'orders.management.update': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.updateShipmentOperational', 'PrismaRepository.updateShipmentOperational'],
    traceVerified: false,
    nextBatch: '业务管理第一批',
    note: '运单管理人工修改已记录状态、转单号、渠道、ETA/ETD 和最新轨迹变更摘要。'
  },
  'orders.management.delete_restore': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.deleteShipmentReview', 'InMemoryRepository.restoreShipment', 'InMemoryRepository.permanentlyDeleteShipmentReview', 'InMemoryRepository.deleteShipment', 'PrismaRepository.deleteShipmentReview', 'PrismaRepository.restoreShipment', 'PrismaRepository.permanentlyDeleteShipmentReview', 'PrismaRepository.deleteShipment'],
    traceVerified: false,
    nextBatch: '业务管理第一批',
    note: '审核台删除、恢复、彻底删除和运单管理删除均已记录生命周期结果。'
  },
  'warehouse.today.receive': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.createWarehousePackage', 'PrismaRepository.createWarehousePackage'],
    traceVerified: false,
    nextBatch: '仓库管理第一批',
    note: '仓库收货录入已绑定目录 key，记录原始录入、包裹结果和件重尺摘要。'
  },
  'warehouse.packages.update': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.updateWarehousePackage', 'InMemoryRepository.updateWarehousePackageRemark', 'InMemoryRepository.updateWarehousePackageException', 'PrismaRepository.updateWarehousePackage', 'PrismaRepository.updateWarehousePackageRemark', 'PrismaRepository.updateWarehousePackageException'],
    traceVerified: false,
    nextBatch: '仓库管理第一批',
    note: '在仓包裹字段、备注和异常更新均已记录目录 key、前后快照和计费重摘要。'
  },
  'warehouse.packages.split': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.splitWarehousePackage', 'PrismaRepository.splitWarehousePackage'],
    traceVerified: false,
    nextBatch: '仓库管理第一批',
    note: '包裹拆分已记录源包裹、子包裹、中间件数重量和子包裹结果。'
  },
  'warehouse.tally.create': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.createWarehouseTallyTask', 'PrismaRepository.createWarehouseTallyTask'],
    traceVerified: false,
    nextBatch: '仓库管理第一批',
    note: '理货任务创建已记录源包裹、理货要求、原始重量体积和任务结果。'
  },
  'warehouse.tally.complete': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.completeWarehouseTallyTask', 'PrismaRepository.completeWarehouseTallyTask'],
    traceVerified: false,
    nextBatch: '仓库管理第一批',
    note: '理货完成已记录完成件重尺、材积重和源包裹关系。'
  },
  'warehouse.queue.dispatch': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.dispatchShipment', 'PrismaRepository.dispatchShipment'],
    traceVerified: false,
    nextBatch: '仓库管理第一批',
    note: '确认出库已绑定目录 key，记录运单、包裹来源、交接单、贴麦头确认和出库摘要。'
  },
  'warehouse.queue.label': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.createShipmentLabel', 'InMemoryRepository.uploadShipmentLabel', 'InMemoryRepository.generateWarehouseTallyTaskLabel', 'InMemoryRepository.printWarehouseTallyTaskLabel', 'InMemoryRepository.downloadWarehouseTallyTaskLabel', 'InMemoryRepository.applyWarehouseTallyTaskLabel', 'PrismaRepository.createShipmentLabel', 'PrismaRepository.uploadShipmentLabel', 'PrismaRepository.generateWarehouseTallyTaskLabel', 'PrismaRepository.printWarehouseTallyTaskLabel', 'PrismaRepository.downloadWarehouseTallyTaskLabel', 'PrismaRepository.applyWarehouseTallyTaskLabel'],
    traceVerified: false,
    nextBatch: '仓库管理第一批',
    note: '面单生成/上传与理货标签生成、打印、下载、扫描应用均已记录目录 key。'
  },
  'market.pending_routing.route': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.routeShipment', 'PrismaRepository.routeShipment'],
    traceVerified: false,
    nextBatch: '市场管理第一批',
    note: '市场排货确认已绑定目录 key，记录运单、渠道、代理、代理渠道、应付成本和贴麦头要求。'
  },
  'market.pending_routing.delete': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.deletePendingRoutingShipment', 'PrismaRepository.deletePendingRoutingShipment'],
    traceVerified: false,
    nextBatch: '市场管理第一批',
    note: '删除待排货已绑定目录 key，记录删除原因、操作人、状态和运单来源。'
  },
  'market.routed.reroute': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.rerouteShipment', 'PrismaRepository.rerouteShipment'],
    traceVerified: false,
    nextBatch: '市场管理第一批',
    note: '已排货/已出库退回重排已绑定目录 key，记录退回原因、原渠道代理和状态回退结果。'
  },
  'customer_service.data_confirm.approve': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.approveShipmentBusinessData', 'InMemoryRepository.approveShipmentAgentData', 'PrismaRepository.approveShipmentBusinessData', 'PrismaRepository.approveShipmentAgentData'],
    traceVerified: false,
    nextBatch: '客服管理第一批',
    note: '客服业务数据和代理数据确认已绑定目录 key，记录确认类型、审核人、业务字段和代理字段摘要。'
  },
  'customer_service.transfer.update': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.updateShipmentOperational', 'PrismaRepository.updateShipmentOperational'],
    traceVerified: false,
    nextBatch: '客服管理第一批',
    note: '转单号维护已绑定目录 key，记录转单号前后值、查询网站、面单引用和填写人。'
  },
  'customer_service.departure.confirm': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.updateShipmentOperational', 'PrismaRepository.updateShipmentOperational'],
    traceVerified: false,
    nextBatch: '客服管理第一批',
    note: '确认离港状态流转已绑定目录 key，记录 ETA/ETD、轨迹和状态批注。'
  },
  'customer_service.departed.update': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.updateShipmentOperational', 'PrismaRepository.updateShipmentOperational'],
    traceVerified: false,
    nextBatch: '客服管理第一批',
    note: '离港后 ETA/ETD 等维护已绑定目录 key，记录前后时间和值班人员。'
  },
  'customer_service.arrived_port.confirm': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.updateShipmentOperational', 'PrismaRepository.updateShipmentOperational'],
    traceVerified: false,
    nextBatch: '客服管理第一批',
    note: '确认到港状态流转已绑定目录 key，记录轨迹、批注和状态变化。'
  },
  'customer_service.delivering.confirm': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.updateShipmentOperational', 'PrismaRepository.updateShipmentOperational'],
    traceVerified: false,
    nextBatch: '客服管理第一批',
    note: '确认派送状态流转已绑定目录 key，记录轨迹、批注和状态变化。'
  },
  'customer_service.signed.confirm': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.updateShipmentOperational', 'PrismaRepository.updateShipmentOperational'],
    traceVerified: false,
    nextBatch: '客服管理第一批',
    note: '确认签收已绑定目录 key，记录签收人、转单号、轨迹和状态变化。'
  },
  'customer_service.problems.change': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.createProblemTicket', 'InMemoryRepository.replyProblemTicket', 'InMemoryRepository.closeProblemTicket', 'PrismaRepository.createProblemTicket', 'PrismaRepository.replyProblemTicket', 'PrismaRepository.closeProblemTicket'],
    traceVerified: false,
    nextBatch: '客服管理第一批',
    note: '问题件创建、回复和关闭已绑定目录 key，并通过运单 sourceRef 纳入整票链路。'
  },
  'tracking.tasks.run': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.runCarrierTask', 'InMemoryRepository.retryCarrierTask', 'InMemoryRepository.executeCarrierTask', 'PrismaRepository.runCarrierTask', 'PrismaRepository.retryCarrierTask', 'PrismaRepository.executeCarrierTask'],
    traceVerified: false,
    nextBatch: '物流轨迹第一批',
    note: '承运商轨迹任务运行、失败和重试已绑定目录 key，作为过程事件通过运单 sourceRef 纳入 trace。'
  },
  'tracking.latest.add_event': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.addTrackingEvent', 'InMemoryRepository.importTrackingEvents', 'InMemoryRepository.executeCarrierTask', 'PrismaRepository.addTrackingEvent', 'PrismaRepository.importTrackingEvents', 'PrismaRepository.executeCarrierTask'],
    traceVerified: false,
    nextBatch: '物流轨迹第一批',
    note: '手工添加轨迹、批量导入轨迹和承运商同步成功均记录最新轨迹结果。'
  },
  'tracking.manual_import.raw_file': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.importTrackingEvents', 'PrismaRepository.importTrackingEvents'],
    traceVerified: false,
    nextBatch: '物流轨迹第一批',
    note: '手动轨迹导入写入原始文件/原始行摘要，记录原始行数、失败行和未匹配单号。'
  },
  'tracking.manual_import.complete': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.importTrackingEvents', 'PrismaRepository.importTrackingEvents'],
    traceVerified: false,
    nextBatch: '物流轨迹第一批',
    note: '手动轨迹导入完成后记录导入结果、受影响运单和预聚合指标。'
  },
  'finance.receivables.audit': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.auditReceivableAudit', 'PrismaRepository.auditReceivableAudit'],
    traceVerified: false,
    nextBatch: '财务管理第一批',
    note: '应收审核结果已绑定目录 key，记录应收项、运单、审核人、状态变化和金额摘要。'
  },
  'finance.business_costs.audit': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.auditBusinessCostAudit', 'PrismaRepository.auditBusinessCostAudit'],
    traceVerified: false,
    nextBatch: '财务管理第一批',
    note: '业务成本审核结果已绑定目录 key，记录业务成本项、运单、审核人、状态变化和金额摘要。'
  },
  'finance.payables.audit': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.auditPayableAudit', 'PrismaRepository.auditPayableAudit'],
    traceVerified: false,
    nextBatch: '财务管理第一批',
    note: '应付审核结果已绑定目录 key，并关联审核后生成的待付款记录。'
  },
  'finance.payment_applications.create': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.createPaymentApplications', 'PrismaRepository.createPaymentApplications'],
    traceVerified: false,
    nextBatch: '财务管理第一批',
    note: '付款申请生成已绑定目录 key，记录申请、待付款、应付项和运单引用。'
  },
  'finance.paid_verification.confirm': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.confirmPaymentApplicationPaid', 'PrismaRepository.confirmPaymentApplicationPaid'],
    traceVerified: false,
    nextBatch: '财务管理第一批',
    note: '确认付款核销已绑定目录 key，记录付款申请、应付项、运单和付款凭证引用，银行账号按敏感字段脱敏。'
  },
  'finance.water_receipt_arrivals.arrive': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.markWaterReceiptArrived', 'PrismaRepository.markWaterReceiptArrived'],
    traceVerified: false,
    nextBatch: '财务管理第一批',
    note: '水单到账已绑定目录 key，记录客户账户余额变化和到账结果。'
  },
  'finance.water_receipts.create': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.createWaterReceipt', 'PrismaRepository.createWaterReceipt'],
    traceVerified: false,
    nextBatch: '财务管理第一批',
    note: '新增水单已绑定目录 key，记录客户、金额、币种、状态和余额摘要。'
  },
  'finance.water_receipts.match': {
    status: 'wired',
    wiredBy: ['InMemoryRepository.matchWaterReceiptOrders', 'PrismaRepository.matchWaterReceiptOrders'],
    traceVerified: false,
    nextBatch: '财务管理第一批',
    note: '水单匹配已改为目录 key resultType，按运单记录匹配结果、应收项和余额变化。'
  }
};

export const LINEAGE_EVENT_WIRING_ROWS: LineageEventWiringRow[] = LINEAGE_EVENT_DEFINITIONS.map((definition) => {
  const override = WIRING_OVERRIDES[definition.key];
  return {
    key: definition.key,
    domain: definition.domain,
    module: definition.module,
    section: definition.section,
    action: definition.action,
    resultType: definition.resultType,
    status: override?.status ?? 'pending',
    wiredBy: override?.wiredBy ?? [],
    traceVerified: override?.traceVerified ?? false,
    nextBatch: override?.nextBatch ?? defaultNextBatch(definition.module),
    note: override?.note ?? '目录已定义，运行时 hook 未接入。'
  };
});

export function getLineageEventWiringReport() {
  const totals = LINEAGE_EVENT_WIRING_ROWS.reduce(
    (summary, row) => {
      summary.total += 1;
      summary[row.status] += 1;
      return summary;
    },
    { total: 0, wired: 0, partial: 0, pending: 0 } satisfies Record<LineageEventWiringStatus | 'total', number>
  );
  const modules = Array.from(new Set(LINEAGE_EVENT_WIRING_ROWS.map((row) => row.module))).map((module) => {
    const rows = LINEAGE_EVENT_WIRING_ROWS.filter((row) => row.module === module);
    return {
      module,
      total: rows.length,
      wired: rows.filter((row) => row.status === 'wired').length,
      partial: rows.filter((row) => row.status === 'partial').length,
      pending: rows.filter((row) => row.status === 'pending').length,
      rows
    };
  });
  return { totals, modules, rows: LINEAGE_EVENT_WIRING_ROWS };
}

function defaultNextBatch(module: string) {
  const order: Record<string, string> = {
    报价查价: '报价查价第一批',
    业务管理: '业务管理第一批',
    仓库管理: '仓库管理第一批',
    财务管理: '财务管理第一批',
    市场管理: '市场管理第一批',
    客服管理: '客服管理第一批',
    物流轨迹管理: '物流轨迹第一批',
    基础资料库: '基础资料第一批',
    系统管理: '系统管理第一批',
    运营工作台: '运营工作台第一批'
  };
  return order[module] ?? '待排期';
}
