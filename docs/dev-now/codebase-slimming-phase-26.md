# 代码瘦身治理第二十六阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜26`
- 续接自：`docs/dev-now/codebase-slimming-phase-25.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`持续目标要求继续治理，且不得改变任何业务逻辑`
- 会话 slug：`codebase-slimming-phase-26`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：扩展现有 `PriceBookQueryController`，承接历史价格源列表和健康报告两个无副作用 JSON GET，继续缩小 `DataController`。
- 固定样本：管理员按 `module=amazon` 查询历史价格源继续返回 `sources` 数组，健康报告继续返回 `module/rowCount/issues`；客户和未登录请求继续被拒绝。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 不做：不修改 Prisma/InMemory Repository，不移动历史价格源导入、删除和重建写接口，不修改前端、共享契约、数据库或视觉。

## 修改

- `apps/api/src/modules/pricing/price-book/price-book-query.controller.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/price-book-query.e2e.test.ts`
- `docs/dev-now/codebase-slimming-phase-26.md`
- `.codex-state.md`

## 当前进度

- 已确认 `getLegacyPricingSources` 和 `getLegacyPricingHealth` 仅查询数据；两个实现都不写数据库、不写审计、不触发后台调度。
- 已把两个 GET 及原权限装饰器、查询参数和 Repository 调用原样迁入现有价格表查询 Controller。
- 历史价格源导入、删除、重建和其他价格表写接口继续留在 `DataController`。
- 已扩展既有 E2E，覆盖管理员响应结构、客户 403 和未登录 401。

## 验证

- 已通过：`npm run test:api:safe -- --run src/modules/price-book-query.e2e.test.ts`，1 个文件 2/2。
- 已通过：`git diff --check`。
- 已通过：47 API production Docker build 和仅 API 容器重建；未修改 Prisma schema/migrations，未运行迁移。
- 已通过：47 两个目标 GET 在 `DataController` 中均为 0，在 `PriceBookQueryController` 中各为 1；Nest 启动映射合计为 2。
- 已通过：47 管理员两个查询均为 200，历史源返回 `sources` 数组，健康报告保留 `module/rowCount/issues`；客户两个路径均为 403“没有访问权限”，未登录为 401“缺少登录凭证”。
- 已通过：API 容器和 Web 容器正常，容器内及公网 health 为 200，排除路由名误匹配后的 API 实际错误日志为 0。

## 治理效果

- `DataController` 再减少 12 行；运行时代码仅搬移同样 12 行，总量不变。
- 定向测试增加契约覆盖，因此全仓净增加 24 行；本阶段改善模块边界，不宣称性能提升或代码总量下降。
- Repository 查询、权限矩阵、字段结构、价格源写接口和审计均未改变。

## 交接

- 阻塞：无。
- 剩余风险：`PriceBookQueryController` 仍直接依赖巨型 `PrismaRepository`；历史价格源健康查询会读取较多行，但本阶段未改变其查询算法或性能。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-26`。
- 准确下一步：扩展现有价格表查询 Controller，优先迁移已由 `PriceBookQueryClient` 承接、且不依赖私有裁剪 helper 的 `legacy/quote-meta`、迪拜展示/版本和南非图片四个纯 GET；迪拜表格和南非规则因含响应清洗逻辑暂不移动。
