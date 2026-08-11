# Sunny 深度重构第十三阶段：历史聚合理货纠正独立模块

- 状态：`completed`
- 会话标题：`Sunny｜深度重构｜13`
- 续接自：`docs/archive/dev-now/sunny-refactor-phase12.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`持续目标自动续接`
- 会话 slug：`sunny-refactor-phase13`
- 分支：`codex/sunny-refactor-phase13`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase13`
- 认领时间：`2026-08-12 01:26 Asia/Shanghai`

## 输入摘要

- 目标：把历史聚合理货修正预览与执行从巨型 `DataController` 迁入独立 Controller/Service/Repository port。
- 固定样本：两件历史聚合结果对应两条不同墨家扫描，验证预览指纹、实体件确认、过期预览、站点范围、Serializable 事务、结果包替换、来源包改链、任务汇总、幂等和审计。
- 不做：不修改外部路由、权限、输入输出、状态码、扫描选择、站点范围、事务、包裹写入、审计或 lineage；不补 InMemory 中原本不存在的修正实现；不在生产执行真实纠正写入。

## 修改范围

- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-correction.controller.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-correction.repository.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-correction.service.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-correction.service.test.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-aggregate-correction.test.ts`
- `apps/api/src/modules/prisma.repository.warehouse-tally-correction.test.ts`
- `apps/api/src/modules/warehouse-tally-correction-route.e2e.test.ts`
- `config/architecture/governance-baseline.json`
- `docs/architecture/baseline/api-route-permission-matrix.md`
- `.codex-state.md`
- `docs/archive/dev-now/sunny-refactor-phase13.md`

## 结果

- 新增 correction Controller/Service/port；GET 预览和 POST 执行的路径、权限与默认状态码原样迁移，service 只透传 principal、ID、body 和错误。
- AppModule 继续以 `useExisting: PrismaRepository` 连接生产适配器；原 Prisma 权限、站点范围、扫描选择、预览指纹、Serializable 重试、包裹替换、来源包改链、任务更新、审计和异步 lineage 实现未改。
- 新增生产 Prisma 写链 characterization，覆盖成功持久化副作用、实体件确认、过期预览、站点/销售范围和已纠正幂等；弥补此前只有生产实现、没有成功路径保护的空白。
- `DataController` 减少 2 条路由、17 行；治理预算从 267/2,996 收紧到 265/2,979，432 条总路由和权限集合不变。

## 验证

- 重构前先运行扫描策略与 Prisma 写链测试 4/4；重构后定向策略、Repository、service、路由 E2E 9/9，最终完整治理附带 Mojia 安全契约 3/3。
- API typecheck、`git diff --check`、432 路由快速门、完整 `governance:check`（含 lint no-new-debt）通过。
- 主线程风险复核确认外部 metadata 不变，Repository 高风险方法未移动或修改，service 不吞异常，成功事务仍为 Serializable，幂等和审计仍在原适配器。
- 47 API production build、重启成功；发布 `whitelist-b972ff7ac8979ef07b96bcb3`。
- 五份运行源码 checksum 与候选一致；线上 GET/POST 未登录均 401、业务员均 403、管理员不存在任务均 404；公网 health 200，API/Postgres/Redis 正常，最近 API 错误日志 0，锁 free、recovery clear。

## 交接

- 阻塞：无。
- 剩余风险：生产真实纠正成功路径未执行，避免改写真实仓库包裹、任务和审计；由未改 Prisma 方法、本地生产适配器写链 characterization、生产构建和线上拒绝路径共同保护。InMemory 适配器仍没有历史纠正方法，这是本轮前已存在且明确未修复的开发环境差异。
- 用户验收目标：持续拆除巨型 Controller/Repository 直接耦合，同时整个 Sunny 业务逻辑不变。
- 效果证据：本地完整成功副作用与拒绝/幂等保护通过；DataController 路由和行数实际下降。
- 安全证据：权限与站点范围、预览指纹、Serializable、审计、API typecheck、432 路由、完整治理、47 CAS/checksum、容器和日志均通过。
- 未验证项：未在生产对真实任务执行纠正，未运行浏览器验收。
- 发布状态：已发布 47，release `whitelist-b972ff7ac8979ef07b96bcb3`。
- 稳定附件：无。
- 准确下一步：从 `codex/sunny-refactor-phase13` 建立 phase14，把已经接入 `WarehouseTallyLifecycleService` 的创建、修改、开始、取消、完成、完成件数、反审核和取消已完成八条路由整体迁入独立 lifecycle Controller，先复用 phase8-11 characterization，再保持两套 Repository 实现不动。
