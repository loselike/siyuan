# Sunny 深度重构第十二阶段：理货标签独立模块

- 状态：`completed`
- 会话标题：`Sunny｜深度重构｜12`
- 续接自：`docs/archive/dev-now/sunny-refactor-phase11.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`持续目标自动续接`
- 会话 slug：`sunny-refactor-phase12`
- 分支：`codex/sunny-refactor-phase12`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase12`
- 认领时间：`2026-08-12 01:14 Asia/Shanghai`

## 输入摘要

- 目标：把理货标签生成/重打、打印、下载和扫码应用四条命令从巨型 `DataController` 迁入独立领域 Controller/Service/Repository port。
- 固定样本：仓库账号创建并完成一件理货任务，验证完成前生成拒绝、完成后重打、打印、下载、待复测扫码拒绝、人工测量后重复扫码和审计。
- 不做：不修改路由、HTTP 方法、权限、输入输出、状态、包裹查询、审计或 lineage；不修改 Prisma/InMemory 标签实现；不处理历史聚合修正。

## 修改范围

- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-label.controller.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-label.repository.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-label.service.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-label.service.test.ts`
- `apps/api/src/modules/warehouse-tally-label-lifecycle.e2e.test.ts`
- `config/architecture/governance-baseline.json`
- `docs/architecture/baseline/api-route-permission-matrix.md`
- `.codex-state.md`
- `docs/archive/dev-now/sunny-refactor-phase12.md`

## 结果

- 新增标签领域 Controller/Service/port；四条外部路径和权限装饰器原样迁移，Post 默认 201、body 和返回值保持不变。
- AppModule 通过 `useExisting: PrismaRepository` 连接当前生产/内存适配器；service 只透传 principal、ID/input，不翻译错误。
- Prisma/InMemory 标签方法完全未修改，既有 completed-block、reprint-block、download-block、状态校验、标签号清洗、包裹查询、审计和异步 lineage 均保留。
- `DataController` 减少 4 条路由、25 行；治理基线只将四条已审查路由的内部 handler 更新为新 Controller，并把 DataController、两套 Repository 的既有下降预算同步收紧，未提高任何债务上限。

## 验证

- 重构前后同一标签 E2E 均通过；最终标签 E2E + service 单测 3/3，覆盖 401/403、状态拒绝、reprint、打印/下载、扫码清洗、404、待复测、测量后重复扫码和三类审计。
- API typecheck、`git diff --check`、432 路由 `architecture:check:fast`、完整 `governance:check`（含 lint no-new-debt、Mojia 安全契约）通过。
- 主线程风险复核确认路由/权限 metadata 不变、Repository 方法未改、service 原样透传、审计和 lineage 仍在原适配器内执行。
- 47 API production build、重启成功；发布 `whitelist-6d1d3654e8171287a77383f5`。
- 五份运行源码 checksum 与候选一致；线上未登录生成 401、业务员生成 403、管理员三条任务命令不存在 404、空扫码 400、不存在标签 404；最近 API 错误日志为 0，锁 free、recovery clear。

## 交接

- 阻塞：无。
- 剩余风险：生产真实标签重打/打印/下载/扫码成功路径未执行，避免写入线上仓库任务与审计；由未改 Prisma 方法、本地完整 E2E、生产构建和线上拒绝路径共同保护。
- 用户验收目标：持续拆除巨型 Controller/Repository 直接耦合，同时整个 Sunny 业务逻辑不变。
- 效果证据：本地完整标签操作链和审计通过；DataController 路由数与行数实际下降。
- 安全证据：权限允许/拒绝、状态拒绝、重复扫码、API typecheck、432 路由、完整治理、47 CAS/checksum、容器和日志均通过。
- 未验证项：未在生产对真实任务执行标签成功操作，未运行浏览器验收。
- 发布状态：已发布 47，release `whitelist-6d1d3654e8171287a77383f5`。
- 稳定附件：无。
- 准确下一步：从 `codex/sunny-refactor-phase12` 建立 phase13，先冻结历史聚合理货修正预览/执行的权限、站点范围、指纹冲突、幂等、事务、包裹与审计，再迁入独立 correction Controller/Service/port。
