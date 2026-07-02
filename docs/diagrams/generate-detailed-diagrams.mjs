import { writeFileSync } from 'node:fs';

const font = '-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif';

const diagrams = [
  {
    id: 'sunny-a-master-data-detail',
    title: 'A 基础资料与权限底座详细图',
    subtitle: '先保证客户、代理、渠道、站点、账号、权限和资料日志能被后续流程复用。',
    color: '#ea580c',
    sections: [
      ['客户资料', ['客户编号 9409 为主识别键', '客户名称 Daloday、业务员 R-sales', '结算方式、币种、收货人、联系人', '客户只作为归属，不替代仓库包裹']],
      ['代理资料', ['代理 AG-9409-UPS / 宇环', '代理银行账号挂代理资料', '供应商账单和付款对象来自代理', '业务员默认不能看代理银行']],
      ['渠道资料', ['代理渠道 AGCH-UPS-EXP', '公司渠道 COCH-US-UPS-EXP', '渠道类别 UPS / 美西卡车', '重量进位：15.2->15.5，15.7->16，21.1->22']],
      ['汇率/偏远', ['USD/RMB、EUR/RMB 历史生效日期', '偏远附加费、附加费规则', '汇率按业务时间匹配', 'AI 价格表后置，不阻塞第一阶段']],
      ['站点/账号/角色', ['深圳站', 'R-sales、R-warehouse、R-market、R-service、R-finance、R-admin', '复用 RBAC，不新建权限体系', '非管理员不能维护系统资料']],
      ['审计验收', ['master_data.*', 'system.site.*', 'system.staff.*', 'system.role_permissions.update', '操作人、对象、before/after 必须可查']],
    ],
  },
  {
    id: 'sunny-b-warehouse-detail',
    title: 'B 仓库货物生命周期详细图',
    subtitle: '货从客户/工厂来，到今日收货、在仓、理货、标签、合票、待出库、确认出库归档。',
    color: '#0891b2',
    sections: [
      ['B1 今日收货', ['客户编号、客户单号、快递单号', '件数、重量、长宽高、CBM', '机器默认 6000，系统补算 5000', '扫描时间、站点、备注、异常']],
      ['B2 在仓数据', ['只显示未出库货物池', '组合号 9409-KY-STOCK-075', '业务员只看自己货且不返回站点', 'CONSOLIDATED/SHIPPED 不进入在仓池']],
      ['B3 理货任务', ['理货需求、来源包裹、原始件重尺', 'PENDING 未完成，COMPLETED 已完成', '创建人、完成时间、完成人', '业务员只能读，不能完成理货']],
      ['B4 理货标签', ['标签号、二维码内容', '客户编号、日期、件数', '生成/打印/下载时间和操作人', '完成理货必须能生成标签']],
      ['B5 拆票/合票', ['拆票子编号 -1/-2', '源包裹关系可追溯', '合票批次 9409-OUT001', '合票进入录单，不替代理货完成']],
      ['B6 出库归档', ['待出库含代理、渠道、排货时间', '交接单不能含价格', '确认出库写 outboundAt、出库人', '包裹 SHIPPED，出库后转客服确认']],
      ['权限/日志', ['仓库看货，不看应收/应付/利润/水单/银行', 'warehouse.package.*', 'warehouse.tally.*', 'warehouse.consolidation.create', 'shipment.dispatch']],
    ],
  },
  {
    id: 'sunny-c-order-service-detail',
    title: 'C 订单与客服生命周期详细图',
    subtitle: '订单从仓库货物生成，经过审核、排货、出库桥接、客服双审核、转单号、状态池和签收。',
    color: '#2563eb',
    sections: [
      ['C1 仓库货物录单', ['从 WarehousePackage 汇总重量尺寸', '客户编号、业务渠道、目的地、收货人', '应收、业务成本', '录单阶段不得直接填转单号']],
      ['C2 待审核', ['审核摘要、货物、费用', '审核人、审核时间、驳回原因', '删除/恢复/彻底删除按权限', '审核后才能待排货']],
      ['C3 市场排货', ['真实代理、代理渠道、真实应付', '排货人、排货时间、排货审核人', '业务渠道不等于真实代理渠道', '业务员不可见真实代理渠道和真实应付']],
      ['C4 出库桥接', ['排货审核后进入仓库待出库', '仓库确认出库后进入客服确认', '不能跳过客服确认直接进轨迹', '出库时间和包裹 SHIPPED 必须可追溯']],
      ['C5 客服双审核', ['业务数据审核 + 代理数据审核', '计费重差异反馈', '修改/反审核记录', '双审核完成后才能填转单号']],
      ['C6 转单号/面单', ['转单号 1Z9409001', '面单号、面单 URL、推送开关', '追踪网站默认对业务员隐藏', '生成面单不能绕过双审核']],
      ['C7 状态池/签收', ['WAITING_DEPARTURE -> DEPARTED -> ARRIVED_PORT -> DELIVERING -> SIGNED', 'ETA/ETD、停留时长', '问题件挂载不移出原状态池', '最终由归属业务员确认签收']],
    ],
  },
  {
    id: 'sunny-d-finance-detail',
    title: 'D 财务费用生命周期详细图',
    subtitle: '钱从水单到账到应收审核，从业务成本/真实应付到付款申请、已付款凭证和付款审计。',
    color: '#16a34a',
    sections: [
      ['D1 水单到账', ['水单编号 WR-9409-001', '客户编号、币种、金额、付款编号', '凭证、到账人、到账时间', '未到账水单不能抵扣应收']],
      ['D2 应收匹配审核', ['应收费用行、匹配金额、余额', '同币种匹配；跨币种要明确汇率', '应收审核后锁定', '匹配后反审核必须先撤销匹配']],
      ['D3 业务成本', ['业务成本费用行、业务员', '计费重、单价、金额、币种', '业务员可见业务成本口径', '业务员看不到真实应付']],
      ['D4 真实应付审核', ['真实代理、代理渠道、应付费用行', '供应商账单、付款编号、代理银行', '业务成本不能替代真实应付', '审核后生成待付款，反审核失效待付款']],
      ['D5 付款申请', ['付款申请 PA-9409-001', '按代理、银行、币种分组', '跨代理/跨银行/跨币种不得混付', '撤回后待付款回 READY']],
      ['D6 已付款凭证', ['付款时间、付款人、付款银行账号', '付款凭证/水单/银行流水元数据', '已撤回申请不能确认付款', '客服/业务员不能确认付款或看敏感凭证']],
      ['D7 财务审计', ['finance.water_receipt.*', 'finance.receivable.*', 'finance.business_cost.*', 'finance.payable.*', 'finance.payment_application.*', 'finance.paid_payment.*']],
    ],
  },
  {
    id: 'sunny-e-permission-audit-detail',
    title: 'E 角色权限与审计详细图',
    subtitle: '同一票对象在不同角色下字段不同；越权动作必须 403 并写拒绝日志。',
    color: '#7c3aed',
    sections: [
      ['业务员', ['看自己客户、自己货物、录单、应收、业务成本', '不能看真实应付、真实代理渠道', '不能看代理银行、付款凭证、完整代理账单', '可确认自己订单签收']],
      ['仓库', ['看今日收货、在仓、理货、标签、待出库、交接单', '不能看价格、应收、业务成本、真实应付、利润', '不能看水单、付款、代理银行', '出库动作由 warehouse:write 控制']],
      ['市场', ['看待排货、真实代理、代理渠道、真实应付', '负责排货和排货审核', '不能确认水单到账或付款', '排货形成真实应付来源']],
      ['客服', ['看客服数据确认、转单号、面单、状态池、问题件', '不能付款、不能越权修改财务审核', '追踪网站默认对业务员隐藏', '客服不能代替业务员签收']],
      ['财务', ['看水单、应收、业务成本、应付、待付款、已付款', '处理凭证、代理账单、差异和杂费', '不能替仓库收货或市场排货', '撤销链路必须按状态守门']],
      ['审计/导出', ['后端响应裁剪为准，前端隐藏不算', '导出按完整筛选或勾选范围', 'security.permission.denied', 'workflow.guard_denied']],
    ],
  },
  {
    id: 'sunny-f-agent-bill-47-detail',
    title: 'F 代理账单与 47 验收详细图',
    subtitle: '代理账单、差异、杂费、跨越账单最终回写费用链；47 受控样本负责最终销账。',
    color: '#0f766e',
    sections: [
      ['F1 代理账单导入', ['代理账单号、账单周期、代理、渠道', '账单金额、币种、文件/凭证元数据', '第一阶段人工导入，AI 后置', '导入写日志']],
      ['F2 应付匹配', ['系统应付 vs 代理账单', '匹配运单、费用行、代理渠道', '不能静默覆盖系统应付', '差异进入处理池']],
      ['F3 差异处理', ['差异金额、差异原因、责任归属', '业务员确认归属订单', '财务确认处理结果', '差异回写利润归档']],
      ['F4 杂费归属', ['杂费类型、提货费、送货费', '归属运单/客户/代理', '未来进入业务成本和应付', '第一阶段人工入口']],
      ['F5 跨越账单', ['跨越账单号、月结/人工录入', '暂不做自动匹配', '可挂回订单和费用行', '后续可扩展批量导入']],
      ['47 验收', ['47 数据库是事实来源', '本地测试不能替代线上销账', '受控同一 Shipment.id 才算证明', 'STRICT_FULL_CHAIN_CANDIDATE >= 1']],
    ],
  },
];

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function sectionSvg(section, index, color) {
  const [title, lines] = section;
  const col = index % 3;
  const row = Math.floor(index / 3);
  const x = 70 + col * 535;
  const y = 185 + row * 280;
  const bullets = lines.map((line, i) => {
    const by = y + 92 + i * 34;
    return `<circle cx="${x + 36}" cy="${by - 6}" r="4" fill="${color}"/><text class="body" x="${x + 52}" y="${by}">${escapeXml(line)}</text>`;
  }).join('\n');
  return `
  <rect class="card" x="${x}" y="${y}" width="480" height="230" rx="18"/>
  <rect x="${x}" y="${y}" width="480" height="54" rx="18" fill="${color}" opacity="0.12"/>
  <text class="cardTitle" x="${x + 28}" y="${y + 36}">${escapeXml(title)}</text>
${bullets}`;
}

function svg(diagram) {
  const rows = Math.ceil(diagram.sections.length / 3);
  const height = 170 + rows * 280 + 80;
  const cards = diagram.sections.map((section, index) => sectionSvg(section, index, diagram.color)).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1680" height="${height}" viewBox="0 0 1680 ${height}">
  <style>
    .bg{fill:#f8fafc}
    .title{font:700 38px ${font};fill:#0f172a}
    .subtitle{font:500 20px ${font};fill:#475569}
    .card{fill:#ffffff;stroke:#cbd5e1;stroke-width:2}
    .cardTitle{font:700 22px ${font};fill:#111827}
    .body{font:17px ${font};fill:#334155}
    .footer{font:15px ${font};fill:#64748b}
  </style>
  <rect class="bg" width="1680" height="${height}"/>
  <text class="title" x="70" y="68">${escapeXml(diagram.title)}</text>
  <text class="subtitle" x="70" y="106">${escapeXml(diagram.subtitle)}</text>
  <line x1="70" y1="135" x2="1610" y2="135" stroke="${diagram.color}" stroke-width="4" stroke-linecap="round"/>
${cards}
  <text class="footer" x="70" y="${height - 38}">生成口径：docs/sunny-dev-index.md、docs/slices/*、docs/sunny-lifecycle-objective-audit.md；图片用于业务闭环和后续代码落地对齐。</text>
</svg>`;
}

for (const diagram of diagrams) {
  writeFileSync(new URL(`./${diagram.id}.svg`, import.meta.url), svg(diagram));
}
