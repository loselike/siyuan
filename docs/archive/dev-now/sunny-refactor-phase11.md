# Sunny 深度重构第十一阶段：理货反审核命令边界

- 状态：`completed`
- 会话标题：`Sunny｜深度重构｜11`
- 续接自：`docs/archive/dev-now/sunny-refactor-phase10.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`持续目标自动续接`
- 会话 slug：`sunny-refactor-phase11`
- 分支：`codex/sunny-refactor-phase11`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase11`
- 认领时间：`2026-08-12 01:05 Asia/Shanghai`

## 输入摘要

- 目标：把理货反审核从 `DataController -> PrismaRepository` 直连切换到 lifecycle application service/port，并去除两套 Repository 重复的已完成件数拒绝方法。
- 固定样本：仓库账号完成理货后，验证直接改件数被拒绝，再反审核回待处理；核对未登录、越权、状态清空、源包恢复、结果包归档、重复反审核和审计。
- 不做：不修改路由、权限、数据范围、状态口径、事务、行锁、异常文案、审计或 lineage；不处理历史聚合修正和标签命令。

## 修改范围

- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-lifecycle.repository.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-lifecycle.service.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-lifecycle.service.test.ts`
- `apps/api/src/modules/warehouse-tally-lifecycle.e2e.test.ts`
- `.codex-state.md`
- `docs/archive/dev-now/sunny-refactor-phase11.md`

## 结果

- lifecycle port/service 新增反审核透传；Controller 仅切换依赖方向，原 Prisma/InMemory 权限、范围、行锁、事务、状态回退、包裹归档/恢复和审计实现未改。
- “已完成理货不允许直接修改件数，请先反审核”从两套 Repository 的相同方法集中到 application service，两份巨型 Repository 各减少 12 行。
- Characterization 固定当前查询语义：反审核后的源包裹在列表中仍显示为当前待理货任务；结果包归档原因保持“理货反审核回退”。这些现有行为未在重构中修正或统一。

## 验证

- lifecycle E2E 与 service 单测 6/6 通过；覆盖 401/403、件数拒绝、允许反审核、状态与字段清空、源/结果包副作用、重复提交和审计。
- API typecheck、`git diff --check`、`architecture:check:fast` 通过；仍为 432 个路由契约，shared root import 预算未增加。
- 主线程对抗式复核确认 Controller 装饰器未动、service 原样透传 principal/ID、Repository 反审核方法未改；件数拒绝仍在鉴权后、任务查询前发生，状态码和文案不变。
- 47 API production build、重启成功；发布 `whitelist-b884b8b6ac6f50d71f965a7e`。
- 五份运行源码 checksum 与候选一致；线上未登录件数接口 401、管理员件数接口 400 且文案一致、管理员反审核不存在任务 404；最近 API 错误日志为 0，锁 free、recovery clear。

## 交接

- 阻塞：无。
- 剩余风险：生产真实反审核成功路径未执行，避免写入线上仓库数据；由未改 Prisma 状态机、本地完整 E2E、生产构建和线上安全拒绝路径共同保护。
- 用户验收目标：持续拆除巨型 Controller/Repository 直接耦合，同时整个 Sunny 业务逻辑不变。
- 效果证据：本地完整反审核状态、包裹副作用和审计通过；线上件数拒绝与反审核 404 调用链贯通。
- 安全证据：未登录/越权、状态幂等 characterization、API typecheck、432 路由门、47 CAS/checksum、容器和日志均通过。
- 未验证项：未在生产反审核真实理货任务，未运行浏览器验收。
- 发布状态：已发布 47，release `whitelist-b884b8b6ac6f50d71f965a7e`。
- 稳定附件：无。
- 准确下一步：从 `codex/sunny-refactor-phase11` 建立 phase12，先冻结标签生成、打印、下载和扫码应用的权限、状态、幂等与审计，再接入独立标签 application boundary；历史聚合修正另开切片。
