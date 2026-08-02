# 代码瘦身治理第三十三阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜33`
- 续接自：`docs/dev-now/codebase-slimming-phase-32.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`持续目标要求继续治理，且不得改变任何业务逻辑`
- 会话 slug：`codebase-slimming-phase-33`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：把仓库待出库/已出库列表和已打印交接单预览两个无写副作用 GET 迁入独立 `WarehouseDispatchQueryController`。
- 固定样本：仓库角色继续只看到有权限的待出库/已出库状态且不泄露付款或费用字段；交接单未打印继续返回原 404，打印后继续返回完整摘要；客户和未登录请求继续沿用原拒绝。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 排除：出库确认和交接单打印两个写接口及其状态流转、审计和 lineage 全部保持原位。

## 修改

- `apps/api/src/modules/warehouse/dispatch/warehouse-dispatch-query.controller.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/warehouse-dispatch-query.e2e.test.ts`
- `docs/dev-now/codebase-slimming-phase-33.md`
- `.codex-state.md`

## 当前进度

- 两条原 GET 的路径、权限装饰器、路径参数和 Repository 调用已原样迁入仓库出库查询 Controller。
- 出库确认、交接单打印、Repository、RBAC、共享契约、Prisma schema、前端和页面调用均未修改。
- 新 E2E 覆盖非空状态筛选、仓库敏感字段裁剪、客户/未登录拒绝、未打印 404、打印后预览字段和客户拒绝。

## 验证

- 已通过：`npm run test:api:safe -- --run src/modules/warehouse-dispatch-query.e2e.test.ts`，1 个文件 2/2。
- 已通过：`npm run governance:check`、`git diff --check`。
- 已通过：基于 47 当前源码只应用三个 API 运行时文件白名单补丁，完整保留远端 `PayerBankAccountController` 等本地尚无功能；仅重建/重启 API，无迁移。
- 已通过：47 两个目标 GET 在 `DataController` 中为 0，在新 Controller 中为 2；镜像内编译产物存在，Nest 启动映射两条目标 GET 各一次；出库确认和交接单打印写路由继续各映射一次。
- 已通过：47 管理员与仓库角色待出库列表均为 200/1 条，所有状态均属于 `WAITING_DISPATCH/OUTBOUNDED`；仓库响应继续不含付款编号和费用明细。
- 已通过：47 既有已打印交接单为 200 且 12 个摘要字段完整；既有未打印运单保留 404“尚未打印代理交接单”；客户两条 GET 均保留 403“没有访问权限”，未登录列表保留 401“缺少登录凭证”。
- 已通过：API/Web 容器正常，容器内与公网 health 为 200，API 最近实际错误日志为 0。

## 治理效果

- `DataController` 再减少 12 行。
- 运行时代码净增加 10 行，契约测试增加 100 行；本阶段改善领域边界和状态/字段裁剪回归保护，不宣称性能提升或全仓代码量下降。
- 查询继续复用原 Repository；数据库查询、权限组合、状态筛选、数据范围、字段裁剪和交接单审计读取均未改。

## 交接

- 阻塞：无。
- 剩余风险：47 没有启用的仓库账号，本轮线上仓库角色使用容器内短期只读 JWT 验证，未改角色权限或生产数据。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-33`。
- 准确下一步：复核内部面单列表与承运商任务列表两个纯 GET，若确认无写副作用则迁入新的履约/承运查询 Controller；面单作废、任务执行和重试写接口继续保持原位。
