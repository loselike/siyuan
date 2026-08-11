# Sunny 深度重构第五阶段

- 状态：`completed`
- 会话标题：`Sunny｜深度重构第五阶段｜05`
- 续接自：`docs/archive/dev-now/sunny-refactor-phase4.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：持续按全量扫描、GitHub 对标和业务逻辑不变准则推进
- 会话 slug：`sunny-refactor-phase5`
- 分支：`codex/sunny-refactor-phase5`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase5`
- 认领时间：`2026-08-12 Asia/Shanghai`

## 输入摘要

- 当前 47 核对：水单 Controller、match parser 和 Runtime Input Pipe 与 phase4 候选校验和一致，可作为本阶段精确基线。
- 两份巨型 Repository 与当前 47 CAS 源码不一致，禁止用陈旧分支直接覆盖；底层去重切片延后到取得当前源码基线后执行。
- 本阶段目标：参考 Medusa 的运行时契约，把创建、修改、到账、取消匹配和作废五个剩余水单写入口接入兼容型 parser；合法请求、数字字符串和现有错误文案保持不变。
- 固定样本：财务创建水单、修改付款编号、标记到账、匹配及撤销后结果与 phase4 一致；畸形类型在进入 application service/Repository 前返回 400。
- 不做：不改路由、权限、Repository、Prisma、金额口径、状态机、事务、审计或合法请求响应。

## 允许修改

- `apps/api/src/modules/finance/receivable/finance-receivable.controller.ts`
- `apps/api/src/modules/finance/water-receipt/water-receipt-allocation.input.ts`
- `apps/api/src/modules/finance/water-receipt/water-receipt-allocation.input.test.ts`
- `apps/api/src/modules/finance/water-receipt/water-receipt-lifecycle.input.ts`
- `apps/api/src/modules/finance/water-receipt/water-receipt-lifecycle.input.test.ts`
- `.codex-state.md`
- `docs/dev-now/sunny-refactor-phase5.md`

## 验证

- Parser 单测 21/21 通过：合法创建/修改/到账/取消匹配/作废、数字字符串、无 body 兼容及畸形输入拒绝均有保护。
- 三条既有财务 E2E 3/3 通过：严格编号与作废、付款编号创建/修改与审计、到账/匹配/撤销/归档/导出链路保持现状。
- API typecheck 与 `git diff --check` 通过。
- 行为与安全审查：Controller 路由、HTTP 方法、权限装饰器、application service 和 Repository 均未修改；合法字段、数字字符串、空到账/作废 body 和现有错误文案兼容保留；只对类型契约之外的畸形输入提前返回 400。
- 47 白名单发布 `whitelist-af4e5b917580d563818c3c60` 成功；三个运行目标文件校验和与候选完全一致，API 生产构建和重启成功，编译产物包含 lifecycle/allocation parser 标记。
- 47 五条目标写路由均只映射一次；公网 `/api/health` 200，未登录畸形创建请求仍先返回 401，证明鉴权顺序未被 Pipe 绕过；API/Postgres/Redis 正常，发布锁 free、recovery clear。

## 交接

- 阻塞：无。
- 风险：parser 会改变畸形请求的拒绝位置；只能提前拒绝类型契约之外的输入，合法请求字段、默认值、顺序和持久化副作用必须保持一致。
- 发布状态：已发布并完成非浏览器线上验证。
