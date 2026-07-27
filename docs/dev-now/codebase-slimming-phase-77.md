# 代码瘦身治理第七十七阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜77`
- 续接自：`docs/dev-now/codebase-slimming-phase-76.md`
- 上下文状态：`green`
- 输入来源：持续目标要求继续完成财务与巨型页面减量
- 会话 slug：`codebase-slimming-phase-77`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-27 Asia/Shanghai`

## 输入摘要

- 目标：在第 76 阶段旧编辑器退场后，删除 `App -> FinancePage` 已无消费者的财务兼容 props、23 个只为这些 props 存在的写操作 wrapper，以及由 wrapper 带出的死 helper。
- 固定样本：应收、业务成本、应付三个现行领域页面仍直接调用原 `ApiClient`，操作后仍通过 `loadRows -> onRowsChange` 刷新父级数据；操作日志和现行运单财务详情渲染 props 保留。
- 硬边界：不改 API 路径、方法、参数、状态码、错误文案、返回字段、金额公式、RBAC、数据范围、字段裁剪、数据库、写入结果、状态流转、审计、页面入口或提交载荷。

## 修改

- `apps/web/src/App.tsx`
- `apps/web/src/modules/finance/FinancePage.tsx`
- `docs/dev-now/codebase-slimming-phase-77.md`
- `.codex-state.md`

## 当前进度

- 本地与 47 当前源码逐项确认 23 个应收/业务成本/应付 wrapper 均只有“声明 + 两个 FinancePage prop 传递”三处引用，而 FinancePage 已无对应消费者；删除 wrapper、两处传参、组件 props 类型和专用输入类型导入。
- 同时删除只被这些 wrapper 调用的 `refreshBusinessCostAudits`、`refreshFinanceDetailIfOpen`，以及仅作为 FinancePage 死 prop 传递的 `handleDeleteShipment`；保留仍被真实链路使用的 `refreshReceivableAudits`、`refreshPayableAudits`、操作日志入口和运单财务详情渲染。
- 清理 FinancePage 剩余无用导入、旧 props 类型和 `ShipmentOperationLog` 兼容类型；将两个浏览器全局引用显式限定到 `window`，运行语义不变。
- 本地与 47 生产源码均增加 3 行、删除 305 行，净减少 302 行和 13,524 bytes；其中 App 减少 247 行 / 11,124 bytes，FinancePage 减少 55 行 / 2,400 bytes。
- 47 构建产物中主 `index` chunk 从 897.07/258.37 gzip kB 降至 893.35/257.77 gzip kB，减少 3.72 kB、gzip 0.60 kB；FinancePage chunk 从 229.81/56.73 gzip kB 降至 229.62/56.67 gzip kB。

## 财务边界审查

- 三个现行领域页面的创建、更新、审核、反审、作废/删除、批量和导出仍直接调用原 ApiClient；每次操作后的 `loadRows` 与 `onRowsChange(next.rows)` 链路保留。
- 现行 `finance:receivable:*`、`finance:business-cost:*`、`finance:payable:*` 权限判断未修改；金额计算、敏感字段判断和创建/更新载荷未修改。
- 删除的 App wrapper 在改动前没有运行时消费者，因此其中的通知、旧父级刷新和旧运单详情刷新从未被现行页面触发；本轮没有把任何业务入口迁移到新实现。
- 只改两个 Web 文件；API、Shared、Prisma、迁移、数据库、服务端 RBAC、字段裁剪、状态和审计均未改。

## 验证

- 本地与 47 候选四个 TSX 文件语法转译均为 0 错误，`git diff --check` 通过；26 个目标 wrapper/helper 符号在本地、47 候选、47 源码和构建产物中清零。
- FinancePage 定向 ESLint 从第 76 阶段剩余 14 个问题降至 0；App 本地既有 38 个问题保持 38 个，47 基线与候选均为 41 个，没有新增问题。
- 三个现行领域页面、权限标记、直接 ApiClient 调用、`loadRows -> onRowsChange` 和现行日志/详情 props 标记均保留；已知会卡住的财务整页用例本阶段未重复运行。
- 47 以线上当前两个文件为基线生成白名单候选，只构建/重启 Web，无 API、Shared、Prisma 或迁移变化；备份位于 `/opt/siyuan/backups/codex-20260727-codebase-slimming-phase-77/`。
- 47 App/FinancePage SHA-256 分别为 `a1de583c7834ae792ce8beae179716fe258d192395cb150083ecabce858a48b3`、`24e6810d58eadf6f239c5b761b6d50a665d6d57229ed173ea3c010db2d71587e`；production build、容器、公网页面、API health 和最近 Web 日志均通过。
- 漂移审计保持 `55 changed + 45 remote-only`。

## 交接

- 阻塞：无。
- 发布状态：`已发布 47`；仅构建和重启 Web，无迁移。
- 准确下一步：转入 `App.tsx` 剩余 38/47 基线 41 个既有 ESLint 问题，按引用密度选择下一组完整退场簇；优先清理只存在于巨型 App 的无用导入、恒定 state 和零调用弹窗函数，不碰仍有页面入口的运单写操作。
