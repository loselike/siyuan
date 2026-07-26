# 代码瘦身治理第五十阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜50`
- 续接自：`docs/dev-now/codebase-slimming-phase-49.md`
- 上下文状态：`green`
- 输入来源：持续目标要求在业务逻辑不变的前提下继续结构治理和真实减量
- 会话 slug：`codebase-slimming-phase-50`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-26 Asia/Shanghai`

## 输入摘要

- 目标：收敛同步体检中美国邮编和仓库编码的两组重复纯查询健康检查，保持问题顺序、文案和响应不变。
- 固定样本：美国邮编缺失与同渠道/价格组/重量段重叠，以及含无效段的仓库编码规则。
- 硬边界：API 契约、RBAC、数据范围、字段裁剪、数据库、写入、状态、审计和页面全部不变；不修改报价金额。

## 修改

- `apps/api/src/modules/pricing/pricing-rule-health.shared.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `docs/dev-now/codebase-slimming-phase-50.md`
- `.codex-state.md`

## 当前进度

- TypeScript AST 确认 `getUsPostalRuleHealthIssues` 和 `getWarehouseCodeRuleHealthIssues` 在本地与 47、Prisma 与 InMemory 四份源码逐字一致。
- 两个函数迁入 `pricing-rule-health.shared.ts`；问题判定顺序、三条邮编文案、仓库规则文案、无效段恢复和去重顺序均保持原实现。
- 两套 Repository 中只服务于这两个函数的五个 shared 导入同步删除；其他邮编报价匹配和仓库规则逻辑保持原位。
- 两套 Repository 各增加 1 行、删除 26 行，新增 29 行共享运行时，生产源码净减少 21 行。
- 本阶段不修改查询条件、响应字段、规则内容、权限、价格、写入或页面，不宣称性能提升。

## 验证

- 本地定向 E2E 2/2：同重量段美国 ZIP 重叠判定，以及价格表/同步体检契约。`npm run governance:check` 与 `git diff --check` 通过。
- 全 API typecheck 仍被当前基线的仓库理货状态、可选字段和财务返回类型错误阻断；本轮三个目标运行时文件未出现新错误，47 production build 通过。
- 发布范围为 `api`；无 Prisma schema 或 migrations 变化，只构建并重启 API。
- 47 三个运行时文件与上传候选 SHA-256 完全一致；两套 Repository 旧定义均为 0，共享模块保留两个唯一定义。
- 47 编译产物固定样本输出“美国价格行未配置邮编范围”、“同一渠道、价格组和重量段存在邮编区间重叠”和“仓库编码规则无效：坏规则，需修正或重新导入”。
- 47 真实只读同步体检响应发布前后逐字等价：10 个价格表、14048 行，SHA-256 均为 `b4a95676709a506e259002453283e0134f7dd17ac3d946f099e058f792757b18`。
- 客户保持 403“没有访问权限”，未登录保持 401“缺少登录凭证”；API/Web/Postgres/Redis 容器正常，API 容器内、宿主实际端口 18899 和公网 8899 health 均为 200，API 启动成功且实际错误日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算：结构治理约 `61%`；真正全仓减量约 `39%`；综合约 `50%`。
- 剩余主项：两套巨型 Repository、全局 CSS 和 shared contracts 仍是主要边界；`App`、`PricingPage`、`WarehousePage` 仍包含大量状态、请求和工作区 JSX。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260726-codebase-slimming-phase-50`。
- 准确下一步：重新扫描两套 Repository 的剩余重复纯展示/查询函数，优先选择两个以上可一次收敛的窄簇；继续排除金额计算、写入、字段裁剪、数据范围、状态和审计。
