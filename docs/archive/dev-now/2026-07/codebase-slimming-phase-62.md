# 代码瘦身治理第六十二阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜62`
- 续接自：`docs/dev-now/codebase-slimming-phase-61.md`
- 上下文状态：`green`
- 输入来源：持续目标要求在业务逻辑不变的前提下继续结构治理和真实减量
- 会话 slug：`codebase-slimming-phase-62`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-26 Asia/Shanghai`

## 输入摘要

- 目标：继续收敛 Prisma 与 InMemory 两套巨型 Repository 中重复的代理加价纯原语，不改变报价金额、规则优先级或列表响应。
- 固定样本：混合加价列表/价格行来源与欧洲快递报价；共享 helper 的重量、百分比、单票加价、计费单位、有效规则索引和线路特异度。
- 硬边界：API、RBAC、字段裁剪、排序、计数、报价金额、数据库、写入、状态流转、审计和页面全部不变。

## 修改

- `apps/api/src/modules/pricing/agent-markup-query.shared.ts`
- `apps/api/src/modules/pricing/agent-markup-query.shared.test.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `docs/dev-now/codebase-slimming-phase-62.md`
- `.codex-state.md`

## 当前进度

- 原候选 `buildAgentMarkupDisplay`、`groupAgentMarkupRows`、`buildAgentMarkupListResponse` 经四份源码审计后未迁移：47 两仓的响应构造器比本地多出真实字段和处理分支，直接共享本地实现会覆盖远端行为，因此继续保留原位。
- 改选 `applyAgentMarkup`、`markupUnitForRow`、`buildMarkupRuleIndex`、`markupRuleIndexKey`、`markupSpecificity` 五个本地与 47 四份源码逐字一致、无写副作用的加价原语，迁入现有 `agent-markup-query.shared.ts`。
- 五个函数体及其金额取整函数与变更前两仓逐项 SHA-256 一致；重量/百分比/单票金额算法、禁用和删除规则排除、价格表索引键、KG/CBM 判断与线路特异度权重保持不变。
- 两套 Repository 各增加 1 行、删除 51 行；共享运行时净增加 50 行，生产源码净减少 50 行。增加 18 行定向测试后，生产源码与测试合计净减少 32 行。
- 本轮没有修改 Controller、DTO、Prisma、权限、字段裁剪、规则写入或页面，也不宣称性能提升。

## 验证

- 共享加价 helper 5/5 通过；混合加价列表和欧洲快递报价完整 E2E 2/2 通过；治理检查与 `git diff --check` 通过。
- 已基于 47 当前三份源码应用白名单补丁，只构建/重启 API，无 Prisma schema 或 migrations 变化；production build 通过。
- 47 上传后三个源码 SHA-256 分别为 `08fc3ec4a15c697793cd8df8b71ab0f16455c8ff73ffa20c65887f07cbadad6f`、`8aebcd23d4b46a64b15f9090a1463a8c93b3522a2d965f4462c12a65792ff242`、`26a39af1b84f867a32557d36cf783be9bd8dfe15e9400255781bb2d4343e2f82`，与远端当前源码生成的候选一致；两仓旧定义清零，共享模块为五个单一定义。
- 47 管理员加价列表与 ONT8 60KG 报价发布前后响应逐字一致，SHA-256 分别保持 `c0c3f188d509b2a9a5e2ebc587d7786fb3f01fa69197fa455c4a8a8cec638731`、`6ddaaf762e4d23c32d807402b06a7802ae79e4dc3a15b71870f045fdaa49e23f`。
- 47 编译产物探针确认重量加价 `31.5/10.5`、百分比加价 `33/11`、单票加价 `35/11.67`、计费单位 `KG/CBM`、有效索引数量 `1`、完整特异度 `7`；客户仍为 403“没有访问权限”。
- Web/API/Postgres/Redis 容器正常，宿主 18899 与公网 8899 首页和 API health 均为 200，API 实际 ERROR 日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算仍为：结构治理约 `63%`；真正全仓减量约 `42%`；综合约 `53%`。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260726-codebase-slimming-phase-62`。
- 明确保留：三个加价列表响应构造器因本地/47 语义不同不得迁移，除非先把远端实现完整回补本地并验证字段兼容。
- 下一候选：审计 `isLegacyPricingModule`、`normalizeAgentMarkupLegacyModule`、`normalizeAgentMarkupModuleQuery`、`filterAgentMarkupRulesByModule` 的模块过滤只读簇；要求四份源码一致，并验证迪拜、旧报价模块和加价列表的模块隔离。Prisma 专用 `filterAgentMarkupRulesByModuleSources` 保持原位。
