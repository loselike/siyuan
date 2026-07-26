# 代码瘦身治理第六十三阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜63`
- 续接自：`docs/dev-now/codebase-slimming-phase-62.md`
- 上下文状态：`green`
- 输入来源：持续目标要求在业务逻辑不变的前提下继续结构治理和真实减量
- 会话 slug：`codebase-slimming-phase-63`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-26 Asia/Shanghai`

## 输入摘要

- 目标：继续收敛 Prisma 与 InMemory 两套巨型 Repository 中重复的代理加价模块识别和只读过滤实现。
- 固定样本：美国价格表、迪拜只读价格表与报价限制、迪拜和未分类加价列表。
- 硬边界：API、RBAC、数据范围、字段裁剪、报价金额、数据库、写入、状态流转、审计和页面全部不变。

## 修改

- `apps/api/src/modules/pricing/agent-markup-query.shared.ts`
- `apps/api/src/modules/pricing/agent-markup-query.shared.test.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `docs/dev-now/codebase-slimming-phase-63.md`
- `.codex-state.md`

## 当前进度

- 将 `isLegacyPricingModule`、`normalizeAgentMarkupLegacyModule`、`normalizeAgentMarkupModuleQuery`、`filterAgentMarkupRulesByModule` 四个模块识别与过滤函数迁入现有 `agent-markup-query.shared.ts`；两套 Repository 只改为导入共享实现。
- 本地与 47 的 Prisma/InMemory 四份变更前源码经 AST 哈希确认四个函数完全一致；共享后的四个函数体也与旧 47 实现逐项同哈希。
- `normalizeAgentSources` 复用共享的 legacy module 归一化函数，删除同语义私有实现；Prisma 专用 `filterAgentMarkupRulesByModuleSources` 保持原位。
- 两套 Repository 各增加 1 行、删除 39 行，共享运行时增加 39 行、删除 7 行，生产源码净减少 44 行；计入 19 行净测试增量后，生产源码与测试合计净减少 25 行。
- 本轮没有修改 Controller、DTO、Prisma schema、权限、字段裁剪、规则写入或页面，也不宣称性能提升。

## 验证

- 共享 helper 6/6、美国/加拿大/迪拜模块隔离与按模块加价规则 E2E 1/1、治理检查和 `git diff --check` 通过。
- 已基于 47 当前三份源码应用白名单候选，只构建/重启 API，无 Prisma schema 或 migrations 变化；production build 通过。上传后的 Prisma、InMemory、共享源码 SHA-256 分别为 `c8022fa3e99011ec1c584724fda23b2250f8e0af2b5c108a1b185fa5ad6a432c`、`ebe45d533183b456d3834cb3c88a476d90ae25f2fbcf969c39559862ec65a971`、`2b9d8c19f40159a7f4334e1539b811844f274b06fceb0014567c6516a8a1f5c0`，与远端当前源码生成的候选一致。
- 47 美国目标模块价格表、迪拜报价 400、迪拜加价列表、未分类加价列表发布前后响应逐字一致，SHA-256 分别保持 `a8b0f55a907504d565cc178718b3deb9c143cfe27a3be116cfd9ed01077e8961`、`6bdee7c335bdb4f66e9e74f21a988c7820507b8ca33bda76d0fb68aefdf2b2c8`、`0cc8b5a25c79f1eeb8d1194a2de68375c40f0e9170d6f0bd1e9002946b51df35`、`7ea2fb1147e5a35e5d6d41a1e1b725ffa3d08e224359ce4ddaa53a108912606d`。
- 迪拜表响应只有动态 `generatedAt` 不同；删除该字段后发布前后稳定哈希均为 `02a7eabd3c966bb43c9039a446adf66c20017148618fa801038fcd5232f50bdf`。迪拜报价仍为 400“迪拜空海运模块仅支持价格表浏览”，客户加价查询仍为 403“没有访问权限”。
- 47 编译产物探针确认七类模块识别、无效模块拒绝、未分类查询以及 amazon/unclassified 规则隔离符合旧实现；Web/API/Postgres/Redis 容器正常，宿主 18899 与公网 8899 首页和 API health 均为 200，API 实际 ERROR 日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算仍为：结构治理约 `63%`；真正全仓减量约 `42%`；综合约 `53%`。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260726-codebase-slimming-phase-63`。
- 明确保留：审计、状态流转、字段裁剪和写入归一化函数不进入下一批；`filterAgentMarkupRulesByModuleSources` 为 Prisma 专用来源过滤，继续保留原位。
- 下一候选：扫描本地与 47 四份源码完全一致的代理加价只读健康检查簇或其他高密度只读领域。`findBestPriceBookRouteMarkupRule`、`resolvePriceBookRowMarkup` 在 47 依赖不同的 `findBestMarkupRule`，未设计显式兼容回调前不得直接迁移；代理名称清理函数同时参与写入清理，也暂不迁移。
