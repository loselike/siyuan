# Sunny 深度重构第三阶段

- 状态：`completed`
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
- 47 白名单发布 `whitelist-706ae8c36f39b20cd997d314` 成功；三个目标源码校验和与候选完全一致，API 生产构建和重启成功，编译产物包含 parser/pipe 标记。
- 47 公网 `/api/health` 返回 200；目标路由未登录请求返回 401，证明原鉴权前置顺序未被输入 Pipe 绕过；API/Postgres/Redis 正常，发布锁 free、recovery clear。
- 47 当前为多会话累积的 `WHITELIST_CAS` 源码树，本 worktree 与远端全树审计为 409 个相同、9 个不同、1 个远端独有；这些差异不属于本阶段目标，三份白名单目标文件已逐一校验一致。

## 交接

- 阻塞：无。
- 风险：运行时校验目前只覆盖水单匹配一个写入口；推广到其他接口时仍需逐路由建立当前/旧版合法输入 characterization，并避免把历史兼容输入误判为非法。
- 发布状态：已发布并完成非浏览器线上验证。
