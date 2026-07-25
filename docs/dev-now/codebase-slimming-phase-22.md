# 代码瘦身治理第二十二阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜22`
- 续接自：`docs/dev-now/codebase-slimming-phase-21.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`持续目标要求继续治理，且不得改变任何业务逻辑`
- 会话 slug：`codebase-slimming-phase-22`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：把 `DataController` 中五个仓库库存纯 GET 路由迁入独立 `WarehouseInventoryQueryController`，保持现有 Repository 实现不变。
- 固定样本：管理员读取包裹、今日收货、在库、包裹组和手工收货客户候选继续返回原结构；未登录和客户角色继续被拒绝。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 不做：不修改 Prisma/InMemory 查询，不修改仓库写接口，不新增 Service/Repository 抽象，不修改前端、共享契约、页面结构或视觉。

## 允许修改

- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/warehouse/inventory/warehouse-inventory-query.controller.ts`
- `apps/api/src/modules/warehouse-inventory-query.e2e.test.ts`
- `docs/dev-now/codebase-slimming-phase-21.md`
- `docs/dev-now/codebase-slimming-phase-22.md`
- `.codex-state.md`

## 当前进度

- 已将五个 GET 路由及原权限装饰器原样迁入独立仓库库存查询 Controller。
- 新 Controller 继续注入同一个 `PrismaRepository` 令牌；生产和内存 E2E 的 Repository 实现选择不变。
- `DataController` 删除对应方法及两个不再使用的查询类型导入；仓库写接口保持原位。
- 已增加只读 E2E，覆盖五个路径、响应形状、未登录 401 和客户角色 403。

## 验证

- 已通过：新仓库库存查询 E2E 和两个既有仓库固定样本，2 个文件共 4/4。
- 已通过：`npm run governance:check` 和 `git diff --check`。
- 已通过：47 API production Docker build 和仅 API 容器重建；未修改 Prisma schema/migrations，未运行迁移。
- 已通过：47 五个目标路由在 `DataController` 中均为 0，在新 Controller 中各为 1；Nest 启动日志中每个 GET 映射各为 1。
- 已通过：47 管理员五个目标查询均为 200，包裹/包裹组/客户候选返回数组，今日收货/在库返回 `totals + rows`。
- 已通过：47 客户角色读取包裹和客户候选均为 403“没有访问权限”；未登录读取包裹为 401“缺少登录凭证”。
- 已通过：47 API/Web 容器正常，容器内与公网 API health 均为 200，API 启动成功且实际错误日志计数为 0。

## 治理效果

- `DataController` 减少五个方法和两个类型导入，文件净缩小 32 行。
- 新增独立 Controller 和定向测试后，全仓总行数没有减少；本阶段效果是建立清晰路由边界，不宣称性能提升或代码总量下降。
- Prisma/InMemory 查询、排序、数据范围和字段裁剪仍在原 Repository，下一阶段才可评估把生产 Prisma 查询迁入仓库库存领域 Repository。

## 交接

- 阻塞：无。
- 剩余风险：新 Controller 暂时直接依赖巨型 `PrismaRepository`；仓库库存查询实现尚未从巨型 Repository 拆出。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-22`。
- 准确下一步：先只读梳理五个查询在 Prisma/InMemory 中的共享 helper、数据范围和字段裁剪依赖；若能无复制地形成领域 Repository，再单独迁移 Prisma 实现并保留内存 Legacy 适配，不碰仓库写逻辑。
