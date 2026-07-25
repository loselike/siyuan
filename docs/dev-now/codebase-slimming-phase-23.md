# 代码瘦身治理第二十三阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜23`
- 续接自：`docs/dev-now/codebase-slimming-phase-22.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`持续目标要求继续治理，且不得改变任何业务逻辑`
- 会话 slug：`codebase-slimming-phase-23`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：把 `DataController` 中四个仓库理货纯 GET 路由迁入独立 `WarehouseTallyQueryController`，保持现有 Repository 实现不变。
- 固定样本：管理员读取理货列表、历史链、合票明细和结果包裹继续返回原结构；未登录和客户角色继续被拒绝，缺失理货任务继续返回原 404 文案。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 不做：不修改 Prisma/InMemory 查询，不修改理货创建、修改、完成、标签、合票写接口，不新增 Service/Repository 抽象，不修改前端、共享契约、页面结构或视觉。

## 允许修改

- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-query.controller.ts`
- `apps/api/src/modules/warehouse-tally-query.e2e.test.ts`
- `docs/dev-now/codebase-slimming-phase-22.md`
- `docs/dev-now/codebase-slimming-phase-23.md`
- `.codex-state.md`

## 当前进度

- 五个库存查询的 Prisma 实现依赖权限、数据范围、理货状态映射、审计写入和多个私有 helper；为避免复制或扩大改动，本阶段不迁移 Repository。
- 已将四个仓库理货 GET 路由及原权限装饰器原样迁入独立 Controller。
- 新 Controller 继续注入同一个 `PrismaRepository` 令牌；生产和内存 E2E 的 Repository 实现选择不变。
- `DataController` 删除对应方法及不再使用的查询类型导入；全部仓库写接口保持原位。
- 已增加只读 E2E，覆盖列表、历史链、缺失任务 404 原文、未登录 401 和客户角色四个路径 403。

## 验证

- 已通过：新仓库理货只读 E2E 和两个既有仓库理货固定样本，2 个文件共 4/4，另有 11 个非目标用例按筛选跳过。
- 已通过：`npm run governance:check` 和 `git diff --check`。
- 已通过：47 API production Docker build 和仅 API 容器重建；未修改 Prisma schema/migrations，未运行迁移。
- 已通过：47 四个目标 GET 在 `DataController` 中均为 0，在新 Controller 中各为 1；Nest 启动映射各为 1，远端既有重复理货统计 GET 仍保留并映射 1 次。
- 已通过：47 管理员读取理货列表、历史链、合票明细均为 200 且返回数组，缺失任务结果包裹仍为 404“理货任务不存在”。
- 已通过：47 客户角色访问四个路径均为 403“没有访问权限”；未登录读取理货列表为 401“缺少登录凭证”。
- 已通过：47 API/Web 容器正常，容器内与公网 API health 均为 200，API 启动成功且实际错误日志计数为 0。

## 治理效果

- `DataController` 删除四个只读方法和一个类型导入，文件净缩小 25 行。
- 新增独立 Controller 和定向测试后，全仓总行数没有减少；本阶段降低巨型 Controller 的职责密度，不宣称查询性能提升或代码总量下降。
- Prisma/InMemory 查询、权限、数据范围、字段裁剪、排序和错误处理继续使用原实现，没有触碰仓库写入、状态流转或审计。

## 交接

- 阻塞：无。
- 剩余风险：新 Controller 暂时直接依赖巨型 `PrismaRepository`；理货查询实现尚未从巨型 Repository 拆出。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-23`。
- 准确下一步：复扫 `DataController` 中下一个成组纯 GET 切片；继续避开财务、账号、状态流转、审计写入和依赖多组私有 helper 的查询，不为凑数量新增单方法 Controller。
