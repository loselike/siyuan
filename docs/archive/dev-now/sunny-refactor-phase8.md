# Sunny 深度重构第八阶段：理货生命周期边界

- 状态：`completed`
- 会话标题：`Sunny｜深度重构｜08`
- 续接自：`docs/archive/dev-now/sunny-refactor-phase7.md`
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`无（用户要求继续快速推进）`
- 会话 slug：`sunny-refactor-phase8`
- 分支：`codex/sunny-refactor-phase8`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase8`
- 认领时间：`2026-08-12 00:35 Asia/Shanghai`

## 输入摘要

- 目标：为理货开始与取消已完成补齐行为保护，并把 Controller 对巨型 Repository 的直接调用切换到最小 application service/port。
- 固定样本：仓库账号创建、开始、完成、取消已完成理货；验证未登录与操作员拒绝、重复操作、原包恢复、结果包归档及审计结果。
- 不做：不修改 HTTP 契约、权限、数据范围、状态流、包裹持久化、事务、异常文案和 Prisma/InMemory 既有审计差异。

## 修改范围

- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-lifecycle.repository.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-lifecycle.service.ts`
- `apps/api/src/modules/warehouse/tally/warehouse-tally-lifecycle.service.test.ts`
- `apps/api/src/modules/warehouse-tally-lifecycle.e2e.test.ts`
- `apps/api/src/modules/mojia-route-auth-contract.test.ts`
- `.codex-state.md`
- `docs/archive/dev-now/sunny-refactor-phase8.md`

## 结果

- 新增稳定的 `WarehouseTallyLifecycleRepository` port 和只委托不改写错误/结果的 application service。
- `DataController` 的开始、取消已完成两条路由改为调用 service；装饰器、方法、body、状态码和响应保持原样。
- Prisma/InMemory Repository 源码未修改，继续分别保留现有权限、范围、状态、包裹副作用、事务及审计动作/载荷差异。
- 新增完整 InMemory E2E characterization 和 service 参数、结果、错误透传单测。

## 验证

- 定向 E2E/service/Mojia 安全测试 6/6 通过。
- API typecheck、`git diff --check`、`architecture:check:fast` 通过；架构门仍为 432 个路由契约，未增加 shared 根入口或热点预算。
- 47 API production build、重启和 health 通过；发布批次 `whitelist-94e12703d8197e5bf7ad9910`。
- 四份运行源码 checksum 与候选一致；使用线上真实管理员短期 JWT 对不存在任务调用开始、取消已完成均返回原有 404，证明路由、RBAC、service 与生产 Repository 链路已贯通且没有生产业务写入。
- 公网 `/api/health` 200，API/Postgres/Redis 正常，最近错误日志无新增异常，发布锁 free、recovery clear。

## 交接

- 阻塞：无。
- 剩余风险：生产真实成功写路径未执行，避免污染仓库业务数据；其行为由未改动的 Prisma 方法、生产构建和本地完整 E2E共同保护。
- 用户验收目标：继续借鉴优秀项目的模块边界快速拆分，同时整个系统业务逻辑保持不变。
- 效果证据：完整本地生命周期输出与持久化副作用通过；线上两条生产调用链进入原 Repository 并返回预期 404。
- 安全证据：允许/拒绝 E2E、API typecheck、432 路由架构门、47 条件发布与 checksum 均通过。
- 未验证项：未对生产真实理货任务执行开始或取消，未运行浏览器验收。
- 发布状态：已发布 47，release `whitelist-94e12703d8197e5bf7ad9910`。
- 稳定附件：无。
- 准确下一步：从 `codex/sunny-refactor-phase8` 建立 phase9，优先为理货创建/修改/完成中的一个最小切片补 characterization，再抽取对应 command port；不得顺手统一现有适配器差异。
