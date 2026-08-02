# 代码瘦身治理第四十五阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜45`
- 续接自：`docs/dev-now/codebase-slimming-phase-44.md`
- 上下文状态：`green`
- 输入来源：持续目标要求在业务逻辑不变的前提下继续结构治理和真实减量
- 会话 slug：`codebase-slimming-phase-45`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-26 Asia/Shanghai`

## 输入摘要

- 目标：扩展既有亚马逊定价共享边界，收敛两套巨型 Repository 中逐字等价的重量档与 CBM 纯函数簇。
- 固定样本：来源表 `21KG+` 不折叠为历史档位，`51KG+` 与最高实际 `100KG+` 继续按现行规则匹配；CBM 区间与开放端点保持原边界。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计和页面全部不变。

## 修改

- `apps/api/src/modules/pricing/amazon-pricing.shared.ts`
- `apps/api/src/modules/pricing/amazon-pricing.shared.test.ts`
- 删除并由上述文件替代 `apps/api/src/modules/pricing/amazon-origin.shared.ts` 及其测试
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `apps/api/src/modules/pricing-excel.ts`
- `docs/dev-now/codebase-slimming-phase-45.md`
- `.codex-state.md`

## 当前进度

- 将 `normalizeAmazonCbmTier`、`amazonWeightBandMinimum`、`normalizeAmazonWeightBand`、`inferAmazonWeightBandFromMin`、`priceRowAmazonWeightBandMatches`、`isOpenEndedKgTier`、`cbmTierMatches`、`withOpenEndedHighestPriceTiers` 八个纯函数迁入统一共享模块。
- 迁移前用 TypeScript AST 对本地与 47 两套 Repository 的八个函数块逐项比较，所有规范化函数体哈希一致；本阶段只移动实现和切换导入，不改变分支、常量、比较边界或返回值。
- 原 `amazon-origin.shared.ts` 更名为 `amazon-pricing.shared.ts`，保留第四十四阶段的来源仓归一化和去重排序；Excel 解析器只切换导入路径。
- 本地 `PrismaRepository` 净减少 73 行，`InMemoryRepository` 净减少 71 行；旧共享运行时 51 行替换为 126 行新共享运行时后，生产源码净减少 69 行。旧测试 21 行替换为 41 行扩展测试后，生产源码与测试合计净减少 49 行。
- 47 当前源码应用相同窄补丁后生产源码同样净减少 69 行，并保留远端既有上传、迪拜加价、仓库理货生命周期和其他差异。
- 本阶段没有修改价格数值、计算公式、价格表数据、查询条件、权限或接口，不宣称性能提升。

## 验证

- 本地安全测试 6/6：共享 helper 四个边界样本，以及既有亚马逊 `21KG+` 来源档位与最高实际 KG 档位两个完整报价样本。
- `npm run governance:check` 与 `git diff --check` 通过。
- 发布范围判定为 `api`；无 Prisma schema 或 migrations 变化，只构建并重启 API。47 production build 通过。
- 47 四个运行时文件与上传候选 SHA-256 完全一致，旧 `amazon-origin.shared.ts` 已删除，新 `amazon-pricing.shared.ts` 存在；八个目标定义只保留在共享模块一份。
- 47 编译产物直接验证：`21kg+ -> 21KG+`，`100KG+` 不识别为 CBM，`1-2CBM` 包含两个端点，`1CBM+` 不包含 1 但包含 1.001，最高开放 KG 档扩展到 99999 且低档上限不变。
- 47 业务组 `GET /api/pricing/legacy/quote-meta` 保持 200，五个数组字段完整；当前生产数据返回 7 个模块、0 个来源。未登录保持 401“缺少登录凭证”。
- API/Web/Postgres/Redis 容器正常；API 容器内、宿主实际端口 18899 和公网 8899 health 均为 200，API 启动成功且本次窗口实际错误日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算：结构治理约 `56%`；真正全仓减量约 `33%`；综合约 `45%`。
- 剩余主项：两套巨型 Repository、全局 CSS 和 shared contracts 仍是主要边界；`App`、`PricingPage`、`WarehousePage` 仍包含大量状态、请求和工作区 JSX。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260726-codebase-slimming-phase-45`，包含被替换的旧模块及三个原运行时文件，可恢复。
- 准确下一步：对两套 Repository 中相邻的亚马逊仓库匹配/计费重纯函数簇做逐函数与常量哈希复核，重点检查 `normalizeWarehouseCode`、`calculateLookupChargeableWeight`、`createWarehouseLookupProfile`、`getWarehouseMatchRank`、`selectPriceRowsForLookup` 及仓库 profile 常量；只有完全等价并建立固定报价边界测试后才继续共享，仍避开财务、账号、数据范围、状态流转和审计。
