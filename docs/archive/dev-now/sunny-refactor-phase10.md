# Sunny 深度重构第十阶段：理货待处理命令边界

- 状态：`completed`
- 会话标题：`Sunny｜深度重构｜10`
- 续接自：`docs/archive/dev-now/sunny-refactor-phase9.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`持续目标自动续接`
- 会话 slug：`sunny-refactor-phase10`
- 分支：`codex/sunny-refactor-phase10`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase10`
- 认领时间：`2026-08-12 00:59 Asia/Shanghai`

## 输入摘要

- 目标：把理货创建、修改、取消未完成从 `DataController -> PrismaRepository` 直接调用切换到既有 lifecycle application service/port。
- 固定样本：仓库账号创建、修改并取消待处理理货任务；验证未登录、操作员越权、非法渠道、空需求、重复创建、空包裹、字段 trim、重复取消和审计。
- 不做：不修改路由、输入输出、权限、数据范围、状态、幂等、事务、行锁、异常文案、审计或 lineage。

## 修改范围

- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-lifecycle.repository.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-lifecycle.service.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-lifecycle.service.test.ts`
- `apps/api/src/modules/warehouse-tally-lifecycle.e2e.test.ts`
- `.codex-state.md`
- `docs/archive/dev-now/sunny-refactor-phase10.md`

## 结果

- lifecycle port 增加 create/update/cancel pending 三个既有 Repository 能力，service 原样透传 principal、ID、input、返回值和错误。
- `DataController` 三条路由仅切换调用目标；HTTP 方法、路径、权限装饰器、body、状态码和响应均保持不变。
- Prisma/InMemory Repository 源码未修改；创建事务与客户锁、修改/取消任务行锁、数据范围、冲突检查、审计和 lineage 继续由原实现负责。
- Characterization 明确冻结重复取消返回既有 `CANCELLED` 结果且不重复写取消审计。

## 验证

- lifecycle E2E 与 service 单测 4/4 通过；覆盖创建/修改/取消的允许、拒绝、输入、字段清洗、幂等与三类审计。
- API typecheck、`git diff --check`、`architecture:check:fast` 通过；仍为 432 个路由契约，未增加架构债务预算。
- 47 API production build、重启成功；发布 `whitelist-a7e9c5dc910d47bc1a6f53f1`。
- 三份运行源码 checksum 与候选一致；线上未登录创建 401、管理员非法渠道创建 400、修改不存在任务 404、取消不存在任务 404，证明生产调用链贯通且没有写入业务数据。
- API/Postgres/Redis 正常，最近错误日志无新增异常，发布锁 free、recovery clear。

## 交接

- 阻塞：无。
- 剩余风险：生产真实成功创建/修改/取消路径未执行，避免污染仓库数据；由未改 Prisma 方法、完整 InMemory E2E、生产构建和线上安全拒绝路径共同保护。
- 用户验收目标：持续拆除巨型 Controller/Repository 直接耦合，同时整个 Sunny 业务逻辑不变。
- 效果证据：本地完整待处理命令状态流和审计通过；线上三条生产调用链均到达原 Repository。
- 安全证据：角色拒绝、输入拒绝、幂等 characterization、API typecheck、432 路由门、47 CAS 与 checksum 均通过。
- 未验证项：未在生产创建真实理货任务，未运行浏览器验收。
- 发布状态：已发布 47，release `whitelist-a7e9c5dc910d47bc1a6f53f1`。
- 稳定附件：无。
- 准确下一步：从 `codex/sunny-refactor-phase10` 建立 phase11，先固定理货反审核和已完成件数更新拒绝行为，再接入 lifecycle command boundary。
