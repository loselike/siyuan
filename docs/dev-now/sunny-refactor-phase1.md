# Sunny 深度重构第一阶段

- 状态：`in_progress`
- 会话标题：`Sunny｜深度重构第一阶段｜01`
- 续接自：无
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`无（当前会话明确请求）`
- 会话 slug：`sunny-refactor-phase1`
- 分支：`codex/sunny-refactor-phase1`
- worktree：`/Users/j1ng/Tools/sunny-refactor-phase1`
- 认领时间：`2026-08-11 21:00 Asia/Shanghai`

## 输入摘要

- 目标：以 47 当前运行源码为基线，参考优秀 GitHub 项目，将 Sunny 渐进重构为边界明确、可验证、易扩展的模块化单体，并以财务水单作为第一条代表切片。
- 不做：本阶段不一次性重写全系统，不拆微服务，不改变既有数据库结构、HTTP 契约、业务口径和权限模型，不批量翻新全部页面。

## 允许修改

- `docs/adr/0005-incremental-modular-monolith-refactor.md`
- `docs/architecture/github-reference-projects.md`
- `docs/dev-now/sunny-refactor-phase1.md`
- `apps/api/src/modules/finance/water-receipt/**`
- 为接入上述领域策略所必需的 `apps/api/src/modules/prisma.repository.ts`、`apps/api/src/modules/in-memory.repository.ts` 及定向测试

## 当前进度

- 已创建独立 worktree 与分支。
- 已通过只读源码指纹审计确认 47 与候选分支有 7 个运行时文件差异，并将这 7 个文件按远端原样导入；复核结果为 413/413 文件一致。
- 已确认采用渐进式模块化单体，记录 ADR 与 GitHub 参考模式。
- 已抽取财务水单币种、输入金额模式、汇率冲突和原币换算公共策略，Prisma 与 InMemory Repository 已切换到同一实现。

## 验证

- 已通过：水单领域策略定向测试 8/8、Shared build、API typecheck、`git diff --check`。
- 基线债务：两个旧 Finance E2E 分别停在既有 `locked` 审计断言和“提交后立即出现 matches”断言；当前线上已改为待审核匹配队列，与本轮金额策略抽取无关。`architecture:check:fast` 也因 47 已发布但治理基线尚未吸收的路由权限与热点计数失败，本轮不扩大修改范围。
- 待执行：47 API 白名单发布、线上源码指纹、容器与公网 health 检查。

## 交接

- 阻塞：无
- 剩余风险：水单属于财务高风险状态流，抽取时必须保持币种、余额、并发锁、权限和审计行为完全一致。
- 用户验收目标：后续新增或调整水单规则时只修改清晰的领域模块，两个 Repository 不再各自复制规则，现有线上流程不回归。
- 效果证据：领域策略 8 个用例覆盖 CNY 兼容、原币匹配、RMB 换算、RMB 固定汇率兼容、非法输入模式、非正金额、币种不一致和过期汇率拒绝。
- 安全证据：47 运行源码基线审计 413/413 一致；Shared build 与 API typecheck 通过。
- 未验证项：尚未取得 47 发布后的源码与健康证据；两条旧 Finance E2E 需要后续按待审核队列语义更新。
- 发布状态：`未发布`
- 稳定附件：无
- 准确下一步：用 CAS 白名单仅发布两个 Repository 和新增领域策略文件，重建 API，并核对 47 源码校验和、容器、health 与错误日志。
- 建议新标题：`Sunny｜深度重构第一阶段｜02`
- 建议新状态文件：`docs/dev-now/sunny-refactor-phase1-02.md`
- 接手要求：状态改为 `handed_off` 后，新的唯一写会话才能继续。
