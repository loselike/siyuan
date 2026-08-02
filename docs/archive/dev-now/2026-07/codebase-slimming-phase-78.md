# 代码瘦身治理第七十八阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜78`
- 续接自：`docs/dev-now/codebase-slimming-phase-77.md`
- 上下文状态：`green`
- 输入来源：持续目标要求继续改造，并允许财务范围在业务边界不变时参与治理
- 会话 slug：`codebase-slimming-phase-78`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-27 Asia/Shanghai`

## 输入摘要

- 目标：从巨型 `App.tsx` 剩余 ESLint 问题中删除完整零入口退场簇，同时清理 `OrdersPage` 对应死 props 和弹窗，不触碰仍有入口的运单、排货或财务写流程。
- 固定样本：订单管理继续展示收款金额/方式、发票上传、编辑运单与操作日志；排货页继续编辑和删除业务成本/应付成本。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计、页面入口、按钮、筛选、表格字段和提交载荷不变。

## 修改

- `apps/web/src/App.tsx`
- `apps/web/src/modules/orders/OrdersPage.tsx`
- `docs/dev-now/codebase-slimming-phase-78.md`
- `.codex-state.md`

## 当前进度

- 删除零调用 `openPendingRoutingDeleteModal` 唯一能置真的待排货删除弹窗簇：专用 form/state、提交函数和弹窗 JSX；保留仍有页面消费者的 `handleDeletePendingRoutingCost`，因此排货成本删除链路不变。
- 删除零调用 `openShipmentPaymentModal` 唯一能置真的旧订单收款弹窗簇：两阶段 state、form、提交/确认函数、`OrdersPage` 七个死 props 和两个永久关闭弹窗；保留订单收款金额/方式只读展示和服务端/ApiClient 能力，不新增或迁移写入口。
- 删除 App 中无人消费的结算方式目录 state/派生值及对应加载请求、履约建议队列、履约筛选数组、内部财务可见性常量，以及剩余零引用 imports；`OrdersPage.visibleShipments` 死 prop 同步退场。
- 本地生产源码增加 9 行、删除 304 行，净减少 295 行和 11,729 bytes；47 当前源码增加 10 行、删除 275 行，净减少 265 行和 10,997 bytes。
- 本轮 47 production build 的主 `index` chunk 从第 77 阶段 893.35/257.77 gzip kB 降至 888.21/256.31 gzip kB，减少 5.14 kB、gzip 1.46 kB；FinancePage chunk 保持 229.62/56.67 gzip kB。

## 边界审查

- 改动前两个 opener 在完整生产源码中均只有定义、没有事件、prop 或跨模块消费者；对应 open state 没有其他非空写入，两个 UI 簇运行时永久不可达。
- 订单管理现行 `formatPaymentSummary(record.paymentAmountUsd, record.paymentAmountCny)`、待上传发票、编辑运单、日志和权限判断保留；排货成本保存/删除的 ApiClient、state 更新、刷新和日志链路保留。
- `registerShipmentPayment` 与 `deletePendingRoutingShipment` 客户端/服务端能力未删除；本轮只移除没有入口的前端孤岛，不改变任何请求契约、权限、金额、持久化、状态或审计逻辑。
- 只改两个 Web 运行时文件；API、Shared、Prisma、迁移和数据库均未改。

## 验证

- 本地与 47 候选的 `App.tsx`、`OrdersPage.tsx` 共四个文件 TypeScript 语法转译 0 错误；两组候选 ESLint 均从 App 38/47 基线 41 个问题和 OrdersPage 3 个问题降至 0，`git diff --check` 通过。
- 本地 Web typecheck 仍被既有 `ReceivableAuditPage` 一处和 `appTestHarness` 五处无关类型错误阻断，两个目标文件不在错误清单；47 production build 包含完整 `tsc -b` 并通过。
- 47 基于当前线上两个文件生成白名单候选，只构建/重启 Web，无迁移；源码 SHA-256 为 `d6b02c35273675278478865b972a9c5ce83d09e2d742a4215c70b6615b63114a` 和 `6d4727d10350fb56352c8a40d0c47efd82572d1a4c1eb54361995fc89326438c`。
- 发布后又发生一次并发 Web 重建，但两个目标源码指纹保持一致；当前容器活动 bundle 中旧收款弹窗、确认弹窗和待排货删除原因文案均为 0，现行收款金额展示和待上传发票标记保留。
- Web/API 容器、公网首页和 API health 均为 200，最近 Web 错误日志为 0；漂移审计保持 `55 changed + 45 remote-only`。
- 正确备份位于 `/opt/siyuan/backups/codex-20260727-codebase-slimming-phase-78/`；备份阶段误建的 `/apps` 副本已立即删除并验证路径不存在，生产源码未受影响。

## 交接

- 阻塞：无。
- 发布状态：`已发布 47`；仅构建和重启 Web，无迁移。
- 准确下一步：App 与 OrdersPage 本地/47 候选 ESLint 已清零；下一阶段优先扫描 47 远端 `.orig`/备份源码和其他生产树遗留文件，再选择一个至少净删 100 行或可消除真实无效请求/计算的高密度切片，避免回到单符号低产出治理。
