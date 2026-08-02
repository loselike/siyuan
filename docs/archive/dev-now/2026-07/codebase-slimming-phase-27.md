# 代码瘦身治理第二十七阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜27`
- 续接自：`docs/dev-now/codebase-slimming-phase-26.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`持续目标要求继续治理，且不得改变任何业务逻辑`
- 会话 slug：`codebase-slimming-phase-27`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：扩展现有 `PriceBookQueryController`，承接旧报价元数据、迪拜当前展示、迪拜展示版本和南非价格表图片四个纯 GET。
- 固定样本：业务员读取旧报价元数据时继续得到完整模块结构但 `agents=[]`，业务员继续可读迪拜当前展示；市场角色继续可读迪拜版本和南非图片；客户和未登录请求继续被拒绝。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。
- 不做：不修改 Prisma/InMemory Repository，不移动迪拜图片文件响应、版本发布/重试、南非图片上传，不移动含响应清洗的迪拜表格和南非规则，不修改前端、共享契约、数据库或视觉。

## 修改

- `apps/api/src/modules/pricing/price-book/price-book-query.controller.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/price-book-query.e2e.test.ts`
- `docs/dev-now/codebase-slimming-phase-27.md`
- `.codex-state.md`

## 当前进度

- 已逐项核对四个 Prisma/InMemory Repository 实现：仅执行读取和响应映射，不写数据库、不写审计、不触发后台任务。
- 已把四个 GET 的原权限装饰器、业务员禁止客户访问判断及 Repository 调用原样迁入现有价格表查询 Controller。
- 迪拜展示图片文件响应仍留在 `DataController`，避免改变 `StreamableFile`、响应头和缓存语义；所有版本发布、重试、南非图片上传及其他写接口保持原位。
- 已扩展既有 E2E，覆盖业务员元数据内部来源裁剪、业务员迪拜展示、市场版本/图片读取、客户四路径 403。

## 验证

- 已通过：`npm run test:api:safe -- --run src/modules/price-book-query.e2e.test.ts`，1 个文件 2/2。
- 已通过：`git diff --check`。
- 已通过：47 API production Docker build 和仅 API 容器重建；未修改 Prisma schema/migrations，未运行迁移。
- 已通过：47 四个目标 GET 在 `DataController` 中均为 0，在 `PriceBookQueryController` 中各为 1；Nest 启动映射合计为 4。
- 已通过：47 业务员元数据和迪拜展示为 200，且元数据 `agents` 继续裁剪为空；市场角色迪拜版本和南非图片为 200。
- 已通过：47 客户四路径均为 403“没有访问权限”，未登录为 401“缺少登录凭证”；API/Web 容器正常，公网 health 为 200，API 实际错误日志为 0。

## 治理效果

- `DataController` 再减少 27 行；运行时代码只是等量搬移，总量不变。
- 定向测试新增角色和字段裁剪契约，全仓本阶段净增加 46 行；本阶段改善模块边界，不宣称性能提升或代码总量下降。
- Repository 查询、权限矩阵、内部代理字段裁剪、图片数据、展示版本状态和所有写入/审计均未改变。

## 交接

- 阻塞：无。
- 剩余风险：`PriceBookQueryController` 仍直接依赖巨型 `PrismaRepository`；迪拜表格和南非规则 GET 含响应清洗，不能仅搬方法而忽略远端已有字段裁剪。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-27`。
- 准确下一步：扩展现有 `MasterDataChannelQueryController` 承接代理资料与代理渠道两个纯 GET；必须原样保留 `isBusinessAgentRestrictedRole` 的两条显式拒绝文案，并验证管理员允许、业务角色拒绝、客户无权限以及返回字段不变。
