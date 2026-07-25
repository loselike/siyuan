# 代码瘦身治理第十八阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜18`
- 续接自：`docs/dev-now/codebase-slimming-phase-17.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`Annotation 1 明确要求继续，视为结束南非兼容窗口`
- 会话 slug：`codebase-slimming-phase-18`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：复扫并删除零调用的 `ApiClient.southAfricaRateRules` 转发、对应兼容测试和无用类型导入；继续扫描现有客户端可承接的纯 GET。
- 固定样本：报价页初始化和南非规则刷新继续通过 `PriceBookQueryClient` 请求 `/pricing/south-africa/rules`。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 不做：不修改领域客户端、页面生产调用、后端、共享契约、南非写接口、页面结构或视觉。

## 允许修改

- `apps/web/src/apiClient.ts`
- `apps/web/src/apiClient.test.ts`
- `docs/dev-now/codebase-slimming-phase-17.md`
- `docs/dev-now/codebase-slimming-phase-18.md`
- `.codex-state.md`

## 当前进度

- 复扫确认：本地和 47 生产源码旧入口直接调用均为 0。
- 已删除旧兼容转发、对应兼容测试和不再需要的 `SouthAfricaRateRuleListResponse` 导入。
- `PriceBookQueryClient` 与 `PricingPage` 两处生产调用保持不动。

## 下一窄切片扫描

- 下一候选为仓库理货历史链 `warehouseTallyTaskHistoryChain(packageId)`。
- 它是 `GET /warehouse/tally-task-history-chain?packageId=...`，只读取仓库理货历史，权限为 `warehouse:tally-completed:view`，不写财务、不推进状态、不写审计。
- 可扩展现有 `WarehouseQueryClient`，无需新建客户端。
- 当前本地有五处生产调用，分布在 `WarehousePage` 和 `FinanceEntryPage`；47 当前源码有两处生产调用。财务录单页面仅消费仓库历史数组，本候选不触碰财务接口或金额逻辑。
- 下一阶段若实施：只新增领域客户端封装与路径测试，迁移上述调用，旧 `ApiClient` 方法暂时保留转发。

## 验证

- 已通过：本地 `git diff --check`；本地和 47 生产源码旧方法、旧生产调用均为 0。
- 已通过：`PriceBookQueryClient` 与剩余 `ApiClient` 网关测试，2 个文件共 9/9。
- 已通过：47 Web production Docker build 和仅 Web 容器重建；静态产物继续包含南非费率规则路径，领域客户端方法和页面两处调用均保留。
- 已通过：47 管理员南非费率规则查询为 200 且 `rules` 结构正确；客户角色仍为 403“没有访问权限”，未登录仍为 401“缺少登录凭证”。
- 已通过：47 五个南非规则写/查价方法均保留；未发现鉴权旁路环境变量。
- 已通过：47 Web 容器、容器内首页与 API health、公网 8899 首页与 API health 均为 200，Web 错误日志计数为 0。

## 交接

- 阻塞：无。
- 剩余风险：仓库外未纳管消费者无法由本仓和 47 源码扫描覆盖。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-18`。
- 准确下一步：扩展现有 `WarehouseQueryClient` 承接 `warehouseTallyTaskHistoryChain`，迁移 `WarehousePage` 与 `FinanceEntryPage` 调用，旧入口保留兼容转发；不改后端和财务逻辑。
