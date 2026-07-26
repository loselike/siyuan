# 代码瘦身治理第四十六阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜46`
- 续接自：`docs/dev-now/codebase-slimming-phase-45.md`
- 上下文状态：`green`
- 输入来源：持续目标要求在业务逻辑不变的前提下继续结构治理和真实减量
- 会话 slug：`codebase-slimming-phase-46`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-26 Asia/Shanghai`

## 输入摘要

- 目标：继续扩展既有亚马逊定价共享边界，收敛两套巨型 Repository 中重复的仓库匹配、计费重和价格行选择纯实现。
- 固定样本：ONT8 继续映射 LAX9/IUSJ 等美西仓；无关 HOU8 不命中；精确 ONT8 高重量兜底优先于映射仓；计费重继续取手工、体积、实际和尺寸重最大值。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计和页面全部不变。

## 修改

- `apps/api/src/modules/pricing/amazon-pricing.shared.ts`
- `apps/api/src/modules/pricing/amazon-pricing.shared.test.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `docs/dev-now/codebase-slimming-phase-46.md`
- `.codex-state.md`

## 当前进度

- 将 `amazonWarehouseProfiles`、`normalizeWarehouseCode`、`calculateLookupChargeableWeight`、`createWarehouseLookupProfile`、`getWarehouseMatchRank` 和 `selectPriceRowsForLookup` 收敛到统一共享模块。
- 使用 TypeScript AST 对本地与 47 两套 Repository 的一个常量和五个函数逐项比较，四份规范化声明文本的 SHA-256 全部一致。
- 原计费重函数依赖 Repository 内通用 `roundMoney`；共享模块使用相同 `Math.round(value * 100) / 100` 公式的私有 `roundLookupMoney`，没有把财务或其他金额取整调用迁出 Repository。
- 本地 `PrismaRepository` 净减少 138 行，`InMemoryRepository` 净减少 139 行；共享运行时净增加 142 行后，生产源码净减少 135 行。测试增加 70 行后，生产源码与测试合计净减少 65 行。
- 47 当前源码应用相同窄补丁后生产源码同样净减少 135 行，并保留远端上传、迪拜加价、理货生命周期、付款银行和其他独有差异。
- 本阶段没有修改仓库映射表内容、比较优先级、价格数值、价格公式、查询条件、权限或接口，不宣称性能提升。

## 验证

- 本地安全测试 9/9：共享 helper 七个样本，以及“ONT8 映射区域价格行”和“精确 ONT8 高重量兜底优先”两个完整 API 报价样本。
- 固定样本验证体积重 `0.8 * 167 = 133.6` 胜出，单件实际重 `12.345 * 3` 按原公式取整为 `37.04`；ONT8 profile 包含 LAX9/IUSJ。
- `npm run governance:check` 与 `git diff --check` 通过。
- 发布范围为 `api`；无 Prisma schema 或 migrations 变化，只构建并重启 API。47 production build 通过。
- 47 三个运行时文件与上传候选 SHA-256 完全一致；两套 Repository 中六个目标声明均为 0，共享模块保留唯一实现。
- 47 编译产物直接验证计费重、精确仓低价兜底、映射仓命中和无关区域排除；业务组 `GET /api/pricing/legacy/quote-meta` 保持 200/7 个模块，未登录保持 401“缺少登录凭证”。
- API/Web/Postgres/Redis 容器正常；API 容器内、宿主实际端口 18899 和公网 8899 health 均为 200，API 启动成功且本次窗口实际错误日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算：结构治理约 `57%`；真正全仓减量约 `35%`；综合约 `46%`。
- 剩余主项：两套巨型 Repository、全局 CSS 和 shared contracts 仍是主要边界；`App`、`PricingPage`、`WarehousePage` 仍包含大量状态、请求和工作区 JSX。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260726-codebase-slimming-phase-46`，包含三个原运行时文件，可恢复。
- 准确下一步：复核两套 Repository 中完全相同的迪拜价格表响应纯函数簇 `buildDubaiPriceTableResponse`、`inferDubaiPriceMode`、`formatDubaiPriceTier`、`uniqueDubaiText`，优先扩展现有迪拜定价边界或建立单一共享模块；继续避开字段裁剪、财务、账号、数据范围、状态流转和审计。
