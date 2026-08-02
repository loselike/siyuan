# 代码瘦身治理第四十七阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜47`
- 续接自：`docs/dev-now/codebase-slimming-phase-46.md`
- 上下文状态：`green`
- 输入来源：持续目标要求在业务逻辑不变的前提下继续结构治理和真实减量
- 会话 slug：`codebase-slimming-phase-47`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-26 Asia/Shanghai`

## 输入摘要

- 目标：收敛 `PrismaRepository` 与 `InMemoryRepository` 重复的迪拜价格表响应构造、空海运识别、价格档位和备注去重纯实现。
- 固定样本：AIR 业务价、SEA 每方加价、`AH海运-M` 识别、`0KG+` 海运显示“按方”、重复渠道要求去重，以及零价行排除。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计和页面全部不变。

## 修改

- `apps/api/src/modules/pricing/dubai-pricing.shared.ts`
- `apps/api/src/modules/pricing/dubai-pricing.shared.test.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `docs/dev-now/codebase-slimming-phase-47.md`
- `.codex-state.md`

## 当前进度

- 将 `buildDubaiPriceTableResponse`、`inferDubaiPriceMode`、`formatDubaiPriceTier` 和 `uniqueDubaiText` 收敛到统一共享模块，两套 Repository 只保留查询与加价策略注入。
- AST 复核发现三个辅助函数在本地和 47 四份源码完全一致；响应构造函数只有一处真实差异：本地现状为空运和海运都应用加价，47 现状仅海运应用加价。共享构造器因此显式接收 `resolveMarkup` 回调，本地调用保留原本全模式加价，47 白名单候选保留原本 `mode === 'SEA'` 策略，没有用本地实现覆盖远端业务口径。
- 本地两套 Repository 各增加 4 行、删除 75 行；新增共享运行时 90 行后，生产源码净减少 52 行。新增 49 行测试后，生产源码与测试合计净减少 3 行。
- 47 两套 Repository 同样各增加 4 行、删除 75 行，新增共享运行时后生产源码净减少 52 行；保留远端上传、展示发布、海运加价和其他独有实现。
- 本阶段不修改查询条件、价格规则内容、响应字段、权限或任何写入，不宣称性能提升。

## 验证

- 本地安全测试 3/3：共享 helper 两个固定样本，以及迪拜空海运价格表完整 API 样本；`npm run governance:check` 与 `git diff --check` 通过。
- 发布范围为 `api`；无 Prisma schema 或 migrations 变化，只构建并重启 API。47 production build 通过。
- 47 三个运行时文件与上传候选 SHA-256 完全一致；两套 Repository 的四个旧定义为 0，共享模块保留四个唯一导出。
- 47 编译产物固定样本验证 AIR `18` 保持不加价、SEA `1800 + 2 = 1802`、`AH海运-M` 识别为 SEA、档位显示“按方”且重复要求按原顺序去重。
- 47 当前迪拜价格表生产数据为空；真实只读响应在发布前后规范化 SHA-256 均为 `dc5f9d6cedde8bb0a345e25c239ad432ea5d2a6ac7d1e7098ad97d8c3d025d49`，管理员保持 200，业务组保持 403“没有访问权限”，未登录保持 401“缺少登录凭证”。非空金额与字段行为由本地完整 API 样本和 47 编译产物固定样本共同覆盖。
- API/Web/Postgres/Redis 容器正常；API 容器内、宿主实际端口 18899 和公网 8899 health 均为 200，API 启动成功且排除路由映射文案后本次窗口实际错误日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算：结构治理约 `58%`；真正全仓减量约 `36%`；综合约 `47%`。
- 剩余主项：两套巨型 Repository、全局 CSS 和 shared contracts 仍是主要边界；`App`、`PricingPage`、`WarehousePage` 仍包含大量状态、请求和工作区 JSX。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260726-codebase-slimming-phase-47`，包含两个原 Repository，并记录共享模块原先不存在。
- 准确下一步：以完整依赖闭包复核两套 Repository 中逐字重复的代理加价只读响应簇 `buildAgentMarkupListResponse`、`groupAgentMarkupRows`、`buildAgentMarkupDisplay`；只有确认本地与 47 依赖和金额展示语义逐项一致后才整体迁移，继续避开加价规则写入、财务、账号、数据范围、状态流转和审计。
