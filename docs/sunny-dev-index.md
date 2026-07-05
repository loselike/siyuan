# Sunny 第一阶段开发入口

本文档是 A-F 第一阶段唯一开发入口。`docs/sunny-lifecycle-objective-audit.md` 是历史审计证据库；`docs/slices/` 是可连续执行任务卡；`.codex-state.md` 是当前推进指针。

## 开发协作规则入口

- `AGENTS.md` 只保留每次会话必须加载的硬规则和文档索引。
- `docs/dev-thread-rules.md` 存放详细工程规则、多会话分工、Ponytail 细则、长需求拆卡、模块交付、前端布局和验证矩阵。
- A-F 任务推进仍以本文档和 `.codex-state.md` 为准；需要执行具体任务卡时再打开对应 `docs/slices/<任务卡>`。

## 第一阶段总目标

用同一组固定样本证明五条主线可以从头走到尾：

1. 货：仓库今日收货 -> 在仓 -> 理货 -> 标签 -> 合票/录单 -> 待出库 -> 出库归档。
2. 单：仓库货物生成订单 -> 待审核 -> 排货 -> 出库桥接 -> 客服数据确认 -> 转单号/面单 -> 状态池 -> 签收。
3. 钱：水单到账 -> 应收匹配审核；真实应付 -> 付款申请 -> 已付款凭证 -> 代理账单差异。
4. 权限：业务员、仓库、市场、客服、财务、管理员只能读写自己该看的字段和动作。
5. 日志：每个关键动作都有同一目标对象可反查的审计记录。

## 固定样本对象

| 对象 | 固定值 | 用途 |
| --- | --- | --- |
| 客户编号 | `9409` | 全流程主识别键。 |
| 客户名称 | `Daloday` | 客户资料和费用归属。 |
| 业务员 | `operator` / `R-sales` | 非管理员验收。 |
| 站点 | `深圳站` | 仓库和站点字段裁剪。 |
| 代理 | `AG-9409-UPS` | 真实代理和付款对象。 |
| 代理渠道 | `AGCH-UPS-EXP` | 市场排货和应付。 |
| 公司渠道 | `COCH-US-UPS-EXP` | 业务员可见渠道。 |
| 组合号 | `9409-KY-STOCK-075` | 今日收货、在仓、理货和出库。 |
| 合票批次 | `9409-OUT001` | 合票录单桥接。 |
| 运单号 | `SY-9409-001` 或系统自动号 | 订单、客服、费用主线。 |
| 转单号 | `1Z9409001` | 双审核后由客服回填。 |
| 水单编号 | `WR-9409-001` | 应收匹配。 |
| 付款申请 | `PA-9409-001` | 应付到付款。 |

## A-F 批次顺序

| 批次 | 目标 | slices |
| --- | --- | --- |
| A 基础资料 | 先保证客户、代理、渠道、站点、账号、权限和资料日志可复用。 | A1-A6 |
| B 仓库 | 货物从今日收货走到出库归档。 | B1-B7 |
| C 订单客服 | 订单从仓库货物走到签收。 | C1-C8 |
| D 财务 | 水单、应收、业务成本、应付、付款凭证闭环。 | D1-D7 |
| E 权限审计 | 同一票角色矩阵、字段裁剪、403 和追溯。 | E1-E5 |
| F 代理账单 | 代理账单、差异、杂费、跨越账单和账单费用审计。 | F1-F6 |

## Slice 队列

| 批次 | 任务卡 |
| --- | --- |
| A | `A1-customer-master.md`, `A2-agent-master.md`, `A3-channel-master.md`, `A4-rate-remote-category.md`, `A5-site-user-role.md`, `A6-master-audit-log.md` |
| B | `B1-today-receipt.md`, `B2-in-stock.md`, `B3-sorting.md`, `B4-sorting-label.md`, `B5-split-consolidation.md`, `B6-outbound-handover-archive.md`, `B7-warehouse-audit.md` |
| C | `C1-order-from-warehouse.md`, `C2-order-review.md`, `C3-routing.md`, `C4-outbound-bridge.md`, `C5-service-data-confirm.md`, `C6-transfer-no-tracking.md`, `C7-status-pool-signature.md`, `C8-order-service-audit.md` |
| D | `D1-water-receipt.md`, `D2-receivable-match-review.md`, `D3-business-cost.md`, `D4-payable-review.md`, `D5-payment-application.md`, `D6-paid-payment-proof.md`, `D7-finance-audit.md` |
| E | `E1-role-read-matrix.md`, `E2-sensitive-field-trim.md`, `E3-permission-denied.md`, `E4-object-traceability.md`, `E5-audit-log-verification.md` |
| F | `F1-agent-bill-import.md`, `F2-agent-bill-payable-match.md`, `F3-difference-handling.md`, `F4-extra-fee-attribution.md`, `F5-kuayue-bill-manual-entry.md`, `F6-bill-fee-audit.md` |

## 每次开工前检查门

每张任务卡开始前必须先做复用审计，并把结论写入当轮输出或当前 slice：

1. 当前已有页面。
2. 当前已有接口。
3. 当前已有数据库表/字段。
4. 当前已有状态枚举。
5. 当前已有权限点。
6. 当前已有审计 action。
7. 当前已有 e2e/unit 测试。
8. 哪些能力可以直接复用。
9. 哪些能力只需要补字段。
10. 哪些能力只需要补页面操作。
11. 哪些能力只需要补接口返回。
12. 哪些能力只需要补权限裁剪。
13. 哪些能力只需要补 audit log。
14. 哪些能力只需要补测试断言。
15. 哪些确实不存在，才允许新增。

## 每次完工销账格式

```md
任务卡：
复用审计：
最小改动：
数据证据：
角色证据：
日志证据：
字段裁剪证据：
测试/验证：
47 口径：
剩余风险：
下一张任务卡：
```

销账必须同时覆盖数据、角色和日志。不能只用管理员账号验收；不能只看前端页面；后端接口必须验证敏感字段裁剪。

## 红线

- 已有接口能表达的，不新建平行接口。
- 已有表能表达的，不新建平行表。
- 已有状态机能扩展的，不新建第二套状态机。
- 已有 `WarehousePackage` / stock / receipt 能力，不新建另一套仓库包裹模型。
- 已有 `Shipment` / order 能力，不新建另一套订单模型。
- 已有 finance / receivable / payable / payment 能力，不新建另一套财务模型。
- 已有 `AuditLog`，不新建另一套日志表。
- 已有 RBAC，不新建另一套权限体系。
- 已有页面菜单或占位页，不新开重复路由。
- 已有 e2e 测试，不绕开，只补断言。
- 不为了样本跑通写孤立 mock 数据。
- 不用临时字段绕过真实业务状态。
- 不只前端隐藏敏感字段，后端必须裁剪。
- 不用订单 `receiveShipment` 代替仓库今日收货。
- 不把 AI、PDA、企业微信真实推送、外部会计系统当作第一阶段前置。

## 如何继续下一张任务卡

1. 读 `.codex-state.md` 的 `下一步任务卡`。
2. 打开对应 `docs/slices/<任务卡>`。
3. 按该卡的“开工前现状审计清单”审计现有页面、接口、表、状态、权限、日志和测试。
4. 只做该卡允许的最小补差。
5. 完工后更新 `.codex-state.md`：当前任务卡、已完成、未完成、样本对象状态、最近一次验收结论和下一步任务卡。

当前指针：`docs/slices/C5-service-data-confirm.md`。历史本地落地记录只作为复用审计事实线索，不作为跳过任务卡的依据；后续按 `.codex-state.md` 连续执行。

## 47 结论

- 47 已发布到 `20260627173000_add_order_fee_permissions`，`finance:order-fee:* = 5`。
- `STRICT_FULL_CHAIN_CANDIDATE = 0`，不能用历史数据销账五条主线。
- 47 上有真实数据库；本机测试、Docker 发布成功、迁移结构检查、只读字段检查都不能替代 47 线上受控业务样本验证。
- 创建 47 受控 QA 样本、历史清洗、生产写入和付款动作必须单独授权。
