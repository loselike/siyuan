# 代码瘦身治理第十九阶段

- 状态：`handed_off`
- 会话标题：`Sunny｜代码瘦身治理｜19`
- 续接自：`docs/dev-now/codebase-slimming-phase-18.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`Annotation 1 明确要求继续实施 warehouseTallyTaskHistoryChain 候选`
- 会话 slug：`codebase-slimming-phase-19`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：将只读仓库理货历史链查询迁入现有 `WarehouseQueryClient`，迁移页面调用，旧 `ApiClient` 入口暂时保留兼容转发。
- 固定样本：仓库页和财务录单页继续使用包裹 ID 查询 `/warehouse/tally-task-history-chain?packageId=...` 并消费原数组结果。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 不做：不修改后端、共享契约、财务金额或接口、仓库写接口、页面结构或视觉。

## 允许修改

- `apps/web/src/api/warehouseQueryClient.ts`
- `apps/web/src/api/warehouseQueryClient.test.ts`
- `apps/web/src/apiClient.ts`
- `apps/web/src/apiClient.test.ts`
- `apps/web/src/modules/warehouse/WarehousePage.tsx`
- `apps/web/src/modules/finance/entry/FinanceEntryPage.tsx`
- `docs/dev-now/codebase-slimming-phase-18.md`
- `docs/dev-now/codebase-slimming-phase-19.md`
- `.codex-state.md`

## 当前进度

- 已在 `WarehouseQueryClient` 增加理货历史链 GET 封装。
- 已迁移仓库页和财务录单页生产调用。
- 旧 `ApiClient.warehouseTallyTaskHistoryChain` 暂时保留，并改为领域客户端转发。
- 本地旧入口直接调用为 0，领域客户端调用为 2。
- 47 旧入口直接调用为 0，领域客户端调用为 3；47 独有的重复理货批次历史入口也已迁移。

## 验证

- 已通过：`git diff --check`。
- 已通过：Web 定向测试 `warehouseQueryClient.test.ts` 和 `apiClient.test.ts`，2 个文件共 10/10。
- 已通过：47 Web production Docker build 和仅 Web 容器重建；未修改 Prisma，未运行迁移。
- 已通过：47 管理员理货历史链查询为 200 且返回数组；客户角色为 403“没有访问权限”；未登录为 401“缺少登录凭证”。
- 已通过：47 源码旧生产调用为 0、领域调用为 3、兼容转发为 1；构建产物包含目标 GET 路径。
- 已通过：47 Web/API 容器正常，容器内与公网首页/API health 均为 200，Web 错误日志计数为 0。

## 交接

- 阻塞：无。
- 剩余风险：仓库外未纳管消费者无法由本仓和 47 源码扫描覆盖。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-19`。
- 准确下一步：将 `ApiClient.warehouseTallyTaskHistoryChain` 加入兼容零调用清单；兼容窗口结束后复扫并删除转发和兼容测试，再扫描下一个可由现有领域客户端承接的纯 GET。
