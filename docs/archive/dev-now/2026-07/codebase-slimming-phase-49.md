# 代码瘦身治理第四十九阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜49`
- 续接自：`docs/dev-now/codebase-slimming-phase-48.md`
- 上下文状态：`green`
- 输入来源：持续目标要求在业务逻辑不变的前提下继续结构治理和真实减量
- 会话 slug：`codebase-slimming-phase-49`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-26 Asia/Shanghai`

## 输入摘要

- 目标：收敛代理来源类型、来源归一化、范围分组和范围键纯实现，保持代理加价来源汇总与所有范围判断不变。
- 固定样本：字符串来源与对象来源清洗、空代理排除、非法模块清空、相同价格表/文件重复行数合并、同范围文件名稳定排序和范围键分隔。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计和页面全部不变。

## 修改

- `apps/api/src/modules/pricing/agent-markup-query.shared.ts`
- `apps/api/src/modules/pricing/agent-markup-query.shared.test.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `docs/dev-now/codebase-slimming-phase-49.md`
- `.codex-state.md`

## 当前进度

- TypeScript AST 确认 `ActivePriceBookAgentSource`、`normalizeAgentSources`、`groupAgentSourcesByScope` 和 `agentMarkupScopeKey` 在本地与 47 四份源码逐字一致。
- 四个声明迁入现有 `agent-markup-query.shared.ts`；范围键仍按 `legacyModule / priceBookId / agentName` 和 `\u0001` 分隔，Repository 的全部调用位置保持不变。
- 来源模块归一化在共享模块内部复刻原 `isLegacyPricingModule` 七个允许值；原 `normalizeAgentMarkupLegacyModule` 和 `isLegacyPricingModule` 因还参与批量规则、导入目标等更广调用面而保留原位，避免扩展到写入路径。
- 两套 Repository 各增加 1 行、删除 41 行；共享运行时增加 47 行、删除 1 行后，生产源码净减少 34 行。测试增加 21 行、删除 1 行后，生产源码与测试合计净减少 14 行。
- 47 应用同一窄补丁后生产源码同样净减少 34 行，并保留远端加价响应、迪拜 CBM 展示和其他独有实现。
- 本阶段不修改来源数据、加价规则、金额口径、查询条件、字段、权限或任何写入，不宣称性能提升。

## 验证

- 本地安全测试 5/5：共享 helper 四个固定样本，以及混合加价规则、来源、数值过滤和排序完整 API 样本；`npm run governance:check` 与 `git diff --check` 通过。
- 发布范围为 `api`；无 Prisma schema 或 migrations 变化，只构建并重启 API。47 production build 通过。
- 47 三个运行时文件与上传候选 SHA-256 完全一致；两套 Repository 的四类旧声明为 0，共享模块保留四个唯一声明。
- 47 编译产物固定样本验证清洗后 5 个来源、非法模块清空、范围键拆分为 `amazon/book-b/代理甲`，同范围文件按“甲表/乙表”排序且乙表重复行数合并为 5。
- 47 真实只读响应发布前后逐字等价：加价规则 41/41 条，活动来源行数 `14048`、来源价格表数 `10`，SHA-256 均为 `29f0ca0dd27a37f4e8166d02eeb55cf7ec4ff17037b0659feaeff3efb296c0bc`；750 行价格表降序前 100 条 SHA-256 均为 `14f6bcfd16eff376a587a58924d34fab8b365411a5a02fa06c7768dfb81eeb60`。
- 客户保持 403“没有访问权限”，未登录保持 401“缺少登录凭证”；API/Web/Postgres/Redis 容器正常，API 容器内、宿主实际端口 18899 和公网 8899 health 均为 200，API 启动成功且实际错误日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算：结构治理约 `60%`；真正全仓减量约 `38%`；综合约 `49%`。
- 剩余主项：两套巨型 Repository、全局 CSS 和 shared contracts 仍是主要边界；`App`、`PricingPage`、`WarehousePage` 仍包含大量状态、请求和工作区 JSX。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260726-codebase-slimming-phase-49`，包含三个原运行时文件。
- 准确下一步：重新执行四份 Repository 的 AST 重复与调用闭包扫描，转向不参与金额计算、写入、字段裁剪、数据范围或审计的下一个纯查询/展示簇；`normalizeMarkupRouteTiers`、`applyAgentMarkup`、`buildMarkupRuleIndex` 等写入或报价金额候选继续保留不动。
