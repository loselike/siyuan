# 代码瘦身治理第四十一阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜41`
- 续接自：`docs/dev-now/codebase-slimming-phase-40.md`
- 上下文状态：`green`
- 输入来源：持续目标要求在业务逻辑不变的前提下继续真实减量
- 会话 slug：`codebase-slimming-phase-41`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-26 Asia/Shanghai`

## 输入摘要

- 目标：合并 `PrismaRepository` 与 `InMemoryRepository` 中逐字等价的仓库纯函数，减少重复实现和运行时代码。
- 固定样本：手工多箱规收货、拆票、理货输出、入库标签、北京时间查询边界和录单包裹 ID 归一化保持原结果。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库结构、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。

## 修改

- `apps/api/src/modules/warehouse/warehouse-domain.shared.ts`
- `apps/api/src/modules/warehouse/warehouse-domain.shared.test.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `docs/dev-now/codebase-slimming-phase-41.md`
- `.codex-state.md`

## 当前进度

- 手工收货箱规展开、合并单号解析、北京时间查询边界、入库标签号、理货标签二维码、录单包裹 ID 归一化、包裹重量/拆票汇总和拆票序号九组纯函数迁入单一共享模块。
- 两套 Repository 删除对应重复定义；内存理货最近一个月截止时间直接复用既有 `warehouse-query.shared.ts`，并删除两份零调用 `roundWarehouseMeasure`。
- 未合并两套实现语义不同的 `summarizeWarehousePackageGroups`：内存实现继续使用客户单号作为 `id`，避免兼容性变化。
- 本地 `PrismaRepository` 由 19,130 行降至 19,008 行，减少 122 行；`InMemoryRepository` 由 14,766 行降至 14,639 行，减少 127 行。
- 新共享运行时模块 163 行，因此本地生产运行时代码净减少 86 行；新增 84 行回归测试后，生产源码与回归测试合计仍净减少 2 行（不计状态文档）。
- 47 当前两套 Repository 共减少 244 行，新增共享运行时模块后生产运行时代码净减少 81 行。
- 这是减量治理，不改变查询复杂度或数据库访问次数，不宣称接口性能提升。

## 验证

- 已通过：共享 helper 定向单测 3/3，覆盖九组 helper、北京时间日/周/近七日/月/自定义边界和四条原错误文案。
- 已通过：内存仓库手工收货、按件拆票并创建出库单、重复理货输出和入库标签固定样本 4/4。
- 已通过：`npm run governance:check` 和 `git diff --check`。
- API 全量 typecheck 仍被当前基线既有的理货状态、可选字符串、财务 `filterOptions` 和包裹可编辑性错误阻断；新共享模块及测试错误为 0。
- 已基于 47 当前源码生成三文件白名单补丁，保留远端北京时间、理货生命周期、仓租、客服数据确认、付款银行等功能；只重建/重启 API，无 Prisma 迁移。
- 47 production build 通过；九组 helper 只在共享模块定义，两个 Repository 定义数为 0、共享导入数为 2。
- 47 运行时北京时间今日边界为 `2026-07-25T16:00:00Z` 至 `2026-07-26T16:00:00Z`，月边界为 `2026-06-30T16:00:00Z` 至 `2026-07-31T16:00:00Z`，与发布前逻辑一致。
- 47 管理员今日收货 200 且结构为 `rows/totals`，在库 200/1416，理货任务 200/5；未登录保留 401“缺少登录凭证”。
- API/Web 容器正常，容器内、宿主实际端口 18899 和公网 `/api/health` 均为 200，API 最近错误日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算：结构治理约 `52%`；真正全仓减量仍约 `25%–30%`。本阶段首次在新增回归证据后仍实现生产源码与测试合计净减量。
- 剩余主项：`PrismaRepository`、`InMemoryRepository`、全局 CSS 和 shared contracts 仍是主要巨型边界；`App`、`PricingPage`、`WarehousePage` 仍包含大量状态、请求和多个工作区 JSX。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260726-codebase-slimming-phase-41`。
- 准确下一步：继续扫描两套 Repository 中逐字等价且无财务、账号、状态流转、审计副作用的多函数领域簇；优先选择已有共享模块可承接的纯函数，生产与本地实现不等价时停止合并。
