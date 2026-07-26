# 代码瘦身治理第四十八阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜48`
- 续接自：`docs/dev-now/codebase-slimming-phase-47.md`
- 上下文状态：`green`
- 输入来源：持续目标要求在业务逻辑不变的前提下继续结构治理和真实减量
- 会话 slug：`codebase-slimming-phase-48`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-26 Asia/Shanghai`

## 输入摘要

- 目标：复核代理加价只读响应簇，收敛本地与 47 四份源码中确定等价的列表过滤、规则命中、金额格式和排序原语。
- 固定样本：默认/线路自定义/数值加价过滤、升降序与同价排序、价格表级和代理级命中边界、命中开关、范围等级和金额显示。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计和页面全部不变。

## 修改

- `apps/api/src/modules/pricing/agent-markup-query.shared.ts`
- `apps/api/src/modules/pricing/agent-markup-query.shared.test.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `docs/dev-now/codebase-slimming-phase-48.md`
- `.codex-state.md`

## 当前进度

- 完整审计确认 `buildAgentMarkupListResponse`、`groupAgentMarkupRows` 和 `buildAgentMarkupDisplay` 不能直接整体迁移：47 已增加去重线路计数、规则比较、禁用规则处理、规则拆分说明和迪拜海运按 CBM 展示，本地尚无这些实现。为避免覆盖 47 业务口径，本阶段不移动三个响应构造器。
- 将四份源码逐字一致的 `shouldIncludeAgentMarkupHits`、`formatMarkupNumber`、`formatMarkupPerKg`、`hasPriceBookRowMarkupControls`、`applyPriceBookRowMarkupControls`、`markupScopeRank`、`matchingPriceRowsForRule` 和 `countAgentMarkupHits` 收敛到 `agent-markup-query.shared.ts`。
- 共享模块的私有金额取整仍使用原 `Math.round(value * 100) / 100`；过滤顺序、默认 `0.5`、来源判断、中文排序和规则命中优先边界不变。
- 两套 Repository 合计增加 2 行、删除 131 行；新增共享运行时 74 行后，生产源码净减少 55 行。新增 70 行测试后，生产源码与测试合计净增加 15 行。
- 47 两套 Repository 应用相同窄补丁后生产源码同样净减少 55 行，并保留远端加价响应、迪拜 CBM 展示和其他独有实现。
- 本阶段不修改加价规则内容、金额口径、查询条件、字段、权限或任何写入，不宣称性能提升。

## 验证

- 本地安全测试 4/4：共享 helper 三个固定样本，以及混合加价规则、价格行来源、数值过滤和降序的完整 API 样本；`npm run governance:check` 与 `git diff --check` 通过。
- 发布范围为 `api`；无 Prisma schema 或 migrations 变化，只构建并重启 API。47 production build 通过。
- 47 三个运行时文件与上传候选 SHA-256 完全一致；两套 Repository 的八类旧定义为 0，共享模块保留八个唯一导出。
- 47 编译产物固定样本验证线路自定义升序为 `custom-a/custom-b`、数值 `0.30` 保留原顺序、默认控制开关、`+¥0.50/kg`、命中数和范围等级。
- 47 真实只读响应发布前后逐字等价：加价规则 20/41 条，SHA-256 均为 `c0c3f188d509b2a9a5e2ebc587d7786fb3f01fa69197fa455c4a8a8cec638731`；750 行价格表降序前 100 条 SHA-256 均为 `14f6bcfd16eff376a587a58924d34fab8b365411a5a02fa06c7768dfb81eeb60`；默认来源过滤前 100 条 SHA-256 均为 `390c1a0cf516281b4c34f9c60ba40d5775d27aa5ca6af507197d6e795a0c73fd`。
- 客户保持 403“没有访问权限”，未登录保持 401“缺少登录凭证”；API/Web/Postgres/Redis 容器正常，API 容器内、宿主实际端口 18899 和公网 8899 health 均为 200，API 启动成功且实际错误日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算：结构治理约 `59%`；真正全仓减量约 `37%`；综合约 `48%`。
- 剩余主项：两套巨型 Repository、全局 CSS 和 shared contracts 仍是主要边界；`App`、`PricingPage`、`WarehousePage` 仍包含大量状态、请求和工作区 JSX。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260726-codebase-slimming-phase-48`，包含两个原 Repository，并记录共享模块原先不存在。
- 准确下一步：审计本地与 47 完全一致的代理来源归一化和范围分组闭包 `normalizeAgentSources`、`groupAgentSourcesByScope`、`agentMarkupScopeKey`，重点确认 `normalizeAgentMarkupLegacyModule` / `isLegacyPricingModule` 的全仓调用面；继续保留三套存在业务差异的响应构造器，不触碰加价写入、财务、账号、数据范围、状态流转和审计。
