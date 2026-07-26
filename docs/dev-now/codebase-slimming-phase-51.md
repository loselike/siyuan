# 代码瘦身治理第五十一阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜51`
- 续接自：`docs/dev-now/codebase-slimming-phase-50.md`
- 上下文状态：`green`
- 输入来源：持续目标要求在业务逻辑不变的前提下继续结构治理和真实减量
- 会话 slug：`codebase-slimming-phase-51`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-26 Asia/Shanghai`

## 输入摘要

- 目标：收敛查价推荐中重复的公开线路名、承运商和时效展示/排序 helper，保持管理员与运营的实际响应不变。
- 固定样本：`TPD-S4-美西组合海卡 -> 美西组合海卡`、纯英文线路回退“可报价线路”、UPS/FEDEX/DHL/海运/空运/专线推断，以及无时效推荐不进入最快列表。
- 硬边界：API 契约、RBAC、数据范围、字段裁剪、报价金额、数据库、写入、状态、审计和页面全部不变。

## 修改

- `apps/api/src/modules/pricing/price-recommendation-display.shared.ts`
- `apps/api/src/modules/pricing/price-recommendation-display.shared.test.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `docs/dev-now/codebase-slimming-phase-51.md`
- `.codex-state.md`

## 当前进度

- TypeScript AST 确认 `publicPricingRouteCode`、`extractChinesePricingRouteName`、`matchedTransitDays` 和 `inferBackendPriceCarrierName` 在本地与 47、Prisma 与 InMemory 四份源码逐字一致。
- 四个函数迁入 `price-recommendation-display.shared.ts`；中英文清洗正则、默认文案、承运商判定顺序和无时效 `Infinity` 回退均保持原实现。
- `omitInternalPriceFields`、`maskPriceRouteForBusiness`、`redactLegacyPricingResponse`、`redactPriceBookRows` 等实际字段裁剪和权限函数保持原位，没有改动裁剪政策。
- 两套 Repository 各增加 1 行、删除 37 行，新增 38 行共享运行时，生产源码净减少 34 行；计入 15 行测试后净减少 19 行。
- 本阶段不修改查询条件、响应字段、数值计算、权限、写入或页面，不宣称性能提升。

## 验证

- 本地共享 helper 固定样本 1/1，公开线路裁剪与未知时效完整 API 样本 2/2；`npm run governance:check` 与 `git diff --check` 通过。
- 发布范围为 `api`；无 Prisma schema 或 migrations 变化，只构建并重启 API，47 production build 通过。
- 47 三个运行时文件与上传候选 SHA-256 完全一致；两套 Repository 四个旧定义均为 0，共享模块保留四个唯一定义。
- 47 编译产物固定样本输出公开线路 `[美西组合海卡, 可报价线路]`、承运商 `[UPS, FEDEX, DHL, 海运, 空运, 专线]` 和时效 `[5, Infinity]`。
- 47 真实只读查价响应发布前后逐字等价：管理员 SHA-256 均为 `d4d5eb51793fc0413c93b7e49b116cfe7bcf27b39f0e013be95b49ade17e809e`，运营 SHA-256 均为 `4f6353c081567110f2f221fbc0081e0bb04d6d55967b5e237c572bce349e32d4`；运营响应为 201/2 条推荐/2 条最快推荐且不含 `totalCost`。
- 客户保持 403“没有访问权限”，未登录保持 401“缺少登录凭证”；API/Web/Postgres/Redis 容器正常，API 容器内、宿主实际端口 18899 和公网 8899 health 均为 200，API 启动成功且实际错误日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算：结构治理约 `62%`；真正全仓减量约 `40%`；综合约 `51%`。
- 剩余主项：两套巨型 Repository、全局 CSS 和 shared contracts 仍是主要边界；`App`、`PricingPage`、`WarehousePage` 仍包含大量状态、请求和工作区 JSX。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260726-codebase-slimming-phase-51`。
- 准确下一步：从“两套 Repository 内部函数去重”转向横跨 Controller/Repository 的窄领域边界扫描，优先找可删除旧转发或可扩展现有领域模块的纯 GET/纯展示路径；继续排除金额计算、写入、字段裁剪、数据范围、状态和审计。
