# Sunny 深度重构第九阶段：理货完成命令边界

- 状态：`completed`
- 会话标题：`Sunny｜深度重构｜09`
- 续接自：`docs/archive/dev-now/sunny-refactor-phase8.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`持续目标自动续接`
- 会话 slug：`sunny-refactor-phase9`
- 分支：`codex/sunny-refactor-phase9`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase9`
- 认领时间：`2026-08-12 00:49 Asia/Shanghai`

## 输入摘要

- 目标：把理货完成从 `DataController -> PrismaRepository` 直接调用切换到既有理货生命周期 application service/port，并先固定生产语义。
- 固定样本：仓库账号完成理货；验证未登录与操作员拒绝、缺失实体结果、成功完成、重复提交幂等、原包归档、结果包生成和审计。
- 不做：不修改路由、输入输出、权限、数据范围、幂等结果、状态、包裹字段、事务、并发 claim、异常文案、审计或 lineage。

## 修改范围

- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-lifecycle.repository.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-lifecycle.service.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-lifecycle.service.test.ts`
- `apps/api/src/modules/warehouse-tally-lifecycle.e2e.test.ts`
- `.codex-state.md`
- `docs/archive/dev-now/sunny-refactor-phase9.md`

## 结果

- 既有 lifecycle port 增加 `completeWarehouseTallyTask`，service 原样透传 principal、任务 ID、完整 input、返回值和错误。
- `DataController` 的 POST `warehouse/tally-tasks/:id/complete` 仅切换到 lifecycle service；装饰器、方法签名、body 与状态码保持不变。
- Prisma/InMemory Repository 源码未修改；生产事务、客户锁、包裹行锁、`PENDING -> PROCESSING` 条件 claim、结果建档、原包归档、审计和 lineage 仍由原实现执行。
- Characterization 明确冻结完成后的重复请求即使 body 缺少 results 也返回既有完成结果，防止后续误改幂等顺序。

## 验证

- lifecycle E2E 与 service 单测 3/3 通过；覆盖 401、403、400、201、重复 201、包裹副作用和完成审计。
- API typecheck、`git diff --check`、`architecture:check:fast` 通过；仍为 432 个路由契约，未增加架构债务预算。
- 47 API production build、重启成功；发布 `whitelist-44c5de99c7afc491d6330419`。
- 三份运行源码 checksum 与候选一致；线上未登录完成请求 401，真实管理员短期 JWT 对不存在任务完成请求 404，证明 RBAC、Controller、service 和生产 Repository 链路贯通且没有写入生产业务数据。
- API/Postgres/Redis 正常，最近错误日志无新增异常，发布锁 free、recovery clear。

## 交接

- 阻塞：无。
- 剩余风险：生产真实成功完成路径未执行，避免污染仓库业务数据；当前证据由未改 Prisma 方法、完整 InMemory E2E、生产构建和线上只读失败路径共同组成。
- 用户验收目标：借鉴 Vendure/Medusa 的 application service 与稳定 port，持续拆除巨型 Controller/Repository 直接耦合，同时业务逻辑不变。
- 效果证据：完整本地完成状态流、幂等结果、包裹副作用和审计均通过；线上生产调用链到达原 Repository。
- 安全证据：允许/拒绝 characterization、API typecheck、432 路由架构门、47 CAS 与 checksum 均通过。
- 未验证项：未对生产真实理货任务执行完成，未运行浏览器验收。
- 发布状态：已发布 47，release `whitelist-44c5de99c7afc491d6330419`。
- 稳定附件：无。
- 准确下一步：从 `codex/sunny-refactor-phase9` 建立 phase10，先为理货创建或修改补角色、数据范围、输入拒绝和审计 characterization，再接入同一 command boundary。
