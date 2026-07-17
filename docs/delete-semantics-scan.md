# 删除功能语义扫描清单

扫描日期：2026-07-10。范围：`apps/web/src/**/*.tsx`、`apps/web/src/apiClient.ts`、`apps/api/src/modules/**/*.ts`。本清单记录当前真实行为，不把“从列表消失”等同于物理删除。

| 模块/入口 | 当前文案与接口 | 当前真实行为 | 结论/阶段 |
| --- | --- | --- | --- |
| 基础资料-客户资料 | 删除；`DELETE /master-data/customers/:id` | 无运单、财务、账号、余额引用时物理删除；否则失败 | 已符合，保留 `master_data.customer.delete` 审计 |
| 基础资料-收货人 | 原“删除”，`PUT /master-data/customers/:id/contacts/:contactId` | `enabled=false` | 本轮改文案为“停用”；后续如需要物理删除应另设引用规则 |
| 基础资料-代理资料 | 删除；`POST /master-data/agents/batch-delete` | 无仍有效业务引用时物理删除；已删除价格表的历史导入任务不阻断 | 已符合，`master_data.agent.delete` 独立审计 |
| 基础资料-代理渠道 | 删除；`DELETE /master-data/agent-channels/:id` | 物理删除 | 本轮完成，`master_data.agent_channel.delete` 独立审计 |
| 基础资料-公司渠道 | 删除；`DELETE /master-data/channels/:id` | 无运单、报价规则、燃油费率引用时物理删除；有引用失败 | 本轮完成，`master_data.channel.delete` 独立审计 |
| 基础资料-渠道类别 | 删除；`DELETE /master-data/channel-categories/:id` | 无公司渠道引用时物理删除；有引用失败 | 本轮完成，`master_data.channel_category.delete` 独立审计 |
| 基础资料-历史汇率 | 原“删除”；`DELETE /master-data/exchange-rates/:id` | `enabled=false` | 本轮改文案为“停用”；审计仍为 update，后续可单列启停审计治理 |
| 基础资料-偏远附件 | 删除；本地状态移除 | 未持久化的上传暂存项移除 | 不适用物理数据删除；后续确认附件持久化后再补接口与审计 |
| 财务资料目录 | 删除；`DELETE /finance/catalog/:id` | 资料记录物理删除并写 delete 审计 | 已有专用任务卡，后续在该任务内复核引用保护 |
| 报价-价格表 | 删除；`DELETE /pricing/books/:id` | 物理删除价格表、价格行与对应报价源；历史加价配置保留 | 已符合，`pricing.price_book.delete` 审计带 `hardDelete` |
| 报价-代理加价规则 | 删除；`DELETE/POST ...markup-rules...` | 物理删除规则；历史报价保留金额快照 | 本轮第二阶段已改，审计带 `hardDelete` |
| 报价-南非物料规则 | 删除；`DELETE /pricing/south-africa/rules/:id` | 物理删除规则 | 本轮第二阶段已改，审计带 `hardDelete` |
| 系统管理-员工账号 | 删除；`DELETE /system/staff-accounts/:id` | 无登录记录时物理删除；有登录记录时拒绝并提示使用停用 | 本轮第二阶段已改 |
| 系统管理-站点/角色 | 停用；`PUT .../enabled` | `enabled=false` | 文案与行为一致，本轮不改 |
| 财务-应收审核 | 作废；`DELETE /finance/receivable-audits/:id` | 标记 `voided=true` | 文案一致；接口是历史命名，若改为普通删除须先明确历史对账保留口径 |
| 财务-业务成本审核 | 作废；`DELETE /finance/business-cost-audits/:id` | 标记 `voided=true` | 文案一致；若改为物理删除，已审核/核销数据需要引用保护 |
| 财务-应付审核 | 删除；`DELETE /finance/payable-audits/:id` | 无付款申请、付款记录或凭证引用时物理删除；有引用则拒绝 | 第三阶段已改，`finance.payable.delete` 审计带 `hardDelete` |
| 录单费用行 | 删除；`DELETE /shipments/:id/finance-items/:feeId` | 无付款申请、付款记录、凭证或水单匹配引用时物理删除；有引用则拒绝 | 第三阶段已改，`shipment.finance_item.delete` 审计带 `hardDelete` |
| 待审核订单 | 删除；`DELETE /shipments/:id/review` | 写入 `deletedAt`，可恢复；另有“彻底删除”物理清理关联数据 | 普通删除与动作不一致；物理删除会连带清理费用、付款、水单匹配、轨迹、问题件等 |
| 工作台运单 | 删除；`DELETE /shipments/:id` | 写入 `deletedAt`，可恢复 | 文案与动作不一致；需复用彻底删除的关联清理/引用保护策略 |
| 待排货 | 删除；`DELETE /shipments/:id/pending-routing` | 写入 `deletedAt`，可恢复 | 文案与动作不一致；需确认是否允许删除待排货运单本体 |
| 录单草稿 | 删除草稿；`DELETE /shipments/:id/order-entry-draft` | 草稿与未引用费用物理删除，仓库包裹释放；付款、水单、轨迹、面单、承运任务或问题件引用时拒绝 | 第四阶段已改，`shipment.order_entry.draft_delete` 审计带 `hardDelete` |
| 客服、仓库、物流轨迹、问题件、运营工作台 | 未发现独立持久化删除入口 | 以状态推进、作废、撤销、归档为主 | 当前无“删除”语义整改项；后续新增入口须先走本清单规则 |

## 本轮代表模块结论

- 已改：客户、代理、代理渠道、公司渠道、渠道类别、代理加价规则、南非物料规则、员工账号、应付审核、录单费用行、录单草稿。
- 已更正：收货人、历史汇率的停用文案。
- 待后续阶段：待审核订单、工作台运单、待排货目前仍为软删除。后续改为物理删除时必须拒绝付款、水单、问题件、轨迹、面单、承运任务等业务引用，且不删除审计日志。
