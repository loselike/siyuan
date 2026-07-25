# 代码瘦身治理第二十五阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜25`
- 续接自：`docs/dev-now/codebase-slimming-phase-24.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`持续目标要求继续治理，且不得改变任何业务逻辑`
- 会话 slug：`codebase-slimming-phase-25`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：把 `DataController` 中价格表列表、同步体检和导入任务三个无副作用 JSON GET 迁入独立 `PriceBookQueryController`，保持 Repository 查询、字段裁剪和错误处理不变。
- 固定样本：管理员读取价格表和同步体检继续返回原结构，缺失导入任务继续返回 404“价格表导入任务不存在”，`includeRows=true` 继续返回原 400 文案；市场角色继续允许，未登录和客户角色继续被拒绝。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 不做：不修改 Prisma/InMemory Repository，不移动会触发后台规则刷新的进度 GET、不移动会写 lineage 的线路 GET、不移动会写下载审计的文件 GET，不修改价格表导入、备注、删除、规则或查价接口，不修改前端、共享契约或视觉。

## 允许修改

- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/pricing/price-book/price-book-query.controller.ts`
- `apps/api/src/modules/price-book-query.e2e.test.ts`
- `docs/dev-now/codebase-slimming-phase-24.md`
- `docs/dev-now/codebase-slimming-phase-25.md`
- `.codex-state.md`

## 当前进度

- 已核对剩余价格表 GET 的实际 Repository 副作用，并排除规则刷新、线路 lineage 和下载审计三个接口。
- 已将三个无副作用 JSON GET 及原权限装饰器原样迁入独立 Controller。
- 新 Controller 继续注入同一个 `PrismaRepository` 令牌；生产和内存实现、查询、裁剪及错误文案保持原位。
- 所有价格表写接口、查价接口和三个有副作用/特殊响应的 GET 继续留在 `DataController`。
- 已增加只读 E2E，覆盖响应结构、两个原错误文案、市场允许、未登录 401 和客户角色三个路径 403。

## 验证

- 已通过：新价格表查询 E2E，1 个文件共 2/2；覆盖价格表列表、同步体检、缺失导入任务、禁止完整明细、市场角色、未登录和客户拒绝。
- 已通过：`npm run governance:check` 和 `git diff --check`。
- 已通过：47 API production Docker build 和仅 API 容器重建；未修改 Prisma schema/migrations，未运行迁移。
- 已通过：47 三个目标 GET 在 `DataController` 中均为 0，在新 Controller 中各为 1；Nest 启动映射各为 1。
- 已通过：47 管理员价格表列表为 200 且 `books + rows=[]` 结构正确，同步体检为 200 且分页/统计结构正确；缺失导入任务为 404“价格表导入任务不存在”，`includeRows=true` 为原 400 文案。
- 已通过：47 市场角色读取价格表为 200；客户角色三个路径均为 403“没有访问权限”；未登录为 401“缺少登录凭证”。
- 已通过：规则刷新、两条线路查询、下载和远端既有价格表加价线路 GET 仍在原 Controller；47 API/Web 容器正常，容器内与公网 health 均为 200，API 实际错误日志计数为 0。

## 治理效果

- `DataController` 删除三个只读方法，文件净缩小 21 行。
- 新增独立 Controller 和定向测试后，全仓总行数没有减少；本阶段建立价格表无副作用查询边界，不宣称性能提升或代码总量下降。
- Repository 查询、价格字段裁剪、分页、权限矩阵、规则刷新、lineage、下载审计和所有写接口均未改变。

## 交接

- 阻塞：无。
- 剩余风险：新 Controller 仍直接依赖巨型 `PrismaRepository`；价格表线路 GET 和规则进度 GET 含 lineage/后台刷新副作用，不能按普通纯查询直接迁移。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-25`。
- 准确下一步：继续复扫剩余 GET 的真实副作用；优先扩展已有查询 Controller，只迁移无写入、无后台调度、无私有裁剪 helper 的成组路径。
