# Sunny 深度重构第三阶段

- 状态：`in_progress`
- 会话标题：`Sunny｜深度重构第三阶段｜03`
- 续接自：`docs/archive/dev-now/sunny-refactor-phase2.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：用户要求继续按全量扫描和 GitHub 对标方案优化
- 会话 slug：`sunny-refactor-phase3`
- 分支：`codex/sunny-refactor-phase3`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase3`
- 认领时间：`2026-08-11 Asia/Shanghai`

## 输入摘要

- 当前代码核对：扫描报告中的密码无盐 SHA-256、上传目录匿名暴露、登录限流和水单并发风险已经在 47 当前基线中完成加固；不得重复改造或恢复旧实现。
- 本阶段目标：参考 Medusa 的“API 类型与运行时校验一致”做第一条运行时输入验证切片，为水单匹配命令建立可复用 Runtime Input Pipe，同时保持全部合法请求的路由、权限、金额、审核队列、持久化和审计结果不变。
- 固定样本：财务提交一笔合法水单匹配申请，仍只生成待审核 allocation；畸形金额、非法币种或非法来源类型在进入 Repository 前返回 400，且不产生匹配申请。
- 不做：不改 Prisma schema，不改权限，不改合法请求响应，不改财务状态流转，不修改生产财务数据，不全局一次性接入全部 DTO。

## 允许修改

- `apps/api/src/modules/runtime-input.pipe.ts`
- `apps/api/src/modules/finance/water-receipt/water-receipt-allocation.input.ts`
- `apps/api/src/modules/finance/water-receipt/water-receipt-allocation.input.test.ts`
- `apps/api/src/modules/finance/receivable/finance-receivable.controller.ts`
- `apps/api/src/modules/app.finance.e2e.test.ts`
- `.codex-state.md`
- `docs/dev-now/sunny-refactor-phase3.md`

## 验证

- Runtime parser/pipe 单测 7/7 通过：当前/旧版合法输入、数字字符串兼容、空匹配、非法币种、非法来源、非正金额和缺失应收标识。
- 两条既有水单匹配 E2E 2/2 通过；新增非法币种 400 后，固定样本仍按原流程生成 PENDING allocation、审核落账、反审核撤销。
- API typecheck 与 `git diff --check` 通过。
- 行为等价审查：原权限装饰器、Service、Repository、事务、金额策略、审核队列和审计实现均未修改；合法输入默认值与旧 `receivableFinanceItemId` 兼容保留。
- 待执行：47 精确发布和线上验证。

## 交接

- 阻塞：无。
- 风险：运行时校验会改变畸形请求的拒绝位置；只能影响类型契约之外的非法输入，合法业务路径必须由原 E2E 证明等价。
- 发布状态：未发布。
