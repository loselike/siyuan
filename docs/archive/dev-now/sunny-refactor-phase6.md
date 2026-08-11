# Sunny 深度重构第六阶段

- 状态：`completed`
- 会话标题：`Sunny｜深度重构第六阶段｜06`
- 续接自：`docs/archive/dev-now/sunny-refactor-phase5.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：持续按全量扫描、GitHub 对标和业务逻辑不变准则推进
- 会话 slug：`sunny-refactor-phase6`
- 分支：`codex/sunny-refactor-phase6`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase6`
- 认领时间：`2026-08-12 Asia/Shanghai`

## 输入摘要

- 目标：先把 47 当前 CAS 运行源码形成可追溯 Git 基线，再从 Prisma/InMemory 两份巨型 Repository 抽取第一组完全相同的水单展示纯策略。
- 固定样本：付款编号清洗、凭证可见性与审计快照、水单列表金额/币种/状态汇总在抽取前后逐字段一致。
- 不做：不改 HTTP 路由、权限、数据范围、筛选排序、分页、金额与汇率口径、状态机、事务、持久化或审计事件。
- 硬门禁：继续执行 ADR 0005；外部 GitHub 项目只借鉴模块边界和 UI 工程，不改变 Sunny 业务逻辑。

## 修改范围

- `apps/api/src/modules/finance/water-receipt/water-receipt-view.policy.ts`
- `apps/api/src/modules/finance/water-receipt/water-receipt-view.policy.test.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/app.finance.e2e.test.ts`
- `.codex-state.md`
- `docs/archive/dev-now/sunny-refactor-phase6.md`

## 结果

- 提交 `0323ac6` 从 47 精确吸收 9 个已变化运行文件和 1 个远端迁移；吸收后本地/47 为 422/422 同哈希，并推送独立分支。
- 提交 `5540cda` 新增水单展示纯策略，统一两套 Repository 的付款编号清洗、凭证裁剪、凭证审计快照和列表汇总；保留两套适配器各自现有筛选、日期、排序和分页差异。
- 两份巨型 Repository 各减少 69 行；没有新增路由、API 字段、权限、数据库或业务状态。
- 修正旧财务 E2E 对当前 47 安全行为的陈旧断言：受保护凭证未登录为 401，操作员看不到不属于自己的水单且不能删除其凭证，管理员路径保持成功。

## 验证

- 水单展示策略单测 4/4 通过；付款编号与受保护凭证两条财务 E2E 2/2 通过；基线吸收后全仓 typecheck、重构后 API typecheck 与 `git diff --check` 通过。
- 架构门禁仍失败，但在重构前基线提交 `0323ac6` 上已复现相同的路由契约和预算陈旧项；本次两份 Repository 行数和方法数均下降，未批准或改写安全契约基线。
- 47 白名单发布 `whitelist-ce14f12fbe842965a0662c7c` 成功；三份运行源码 checksum 与候选一致，API production build、重启、容器状态通过。
- 发布后本地/47 运行源码 423/423 同哈希；公网 `/api/health` 200，未登录水单列表和凭证均 401，容器内纯策略固定样本返回 `POLICY_PROBE_OK`，最近 API 错误日志为空，发布锁 free、recovery clear。

## 交接

- 阻塞：无。
- 风险：架构治理基线落后于 47 当前已上线权限和仓库路由，必须独立做权限审查后再更新，不能在行为保持重构中顺手批准。
- 发布状态：已发布并完成非浏览器线上验证。
- 准确下一步：以 `codex/sunny-refactor-phase6` 为最新巨型 Repository 基线，继续抽取水单查询过滤/排序或摘要映射前，先补 Prisma/InMemory 等价固定样本，仍禁止改变现有差异。
