# 代码瘦身治理第七十六阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜76`
- 续接自：`docs/dev-now/codebase-slimming-phase-75.md`
- 上下文状态：`green`
- 输入来源：用户明确允许继续优化财务模块
- 会话 slug：`codebase-slimming-phase-76`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-27 Asia/Shanghai`

## 输入摘要

- 目标：删除 `FinancePage` 在应收、业务成本和应付三个现行领域页面上线后已不可达的旧内嵌编辑器及其计算残片。
- 固定样本：财务管理仍通过 `ReceivableAuditPage`、`BusinessCostAuditPage`、`PayableAuditPage` 进入新增、编辑、审核等现行业务链；旧页面级编辑器、筛选和摘要符号从源码及构建产物清零。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、金额口径、数据库、写入结果、状态流转、审计、页面入口和提交载荷均不变。

## 修改

- `apps/web/src/modules/finance/FinancePage.tsx`
- `docs/dev-now/codebase-slimming-phase-76.md`
- `.codex-state.md`

## 当前进度

- 声明—引用和状态流复扫确认三个旧内嵌编辑器没有生产打开入口：旧 open state 只能由同簇零调用函数置为 `true`；现行三个领域页面均已独立承接创建、编辑、批量操作和权限判断。
- 删除三个旧 Modal、三套表单/筛选 state、三个无消费筛选链、两个无消费摘要 reduce、两个零调用编辑函数、三个不可达提交函数、四组只写不读选择状态及相关导入；本地生产源码增加 2 行、删除 466 行，净减少 464 行和 21,477 bytes。
- 47 当前源码基线从 2,261 行 / 119,895 bytes 降至 1,800 行 / 98,256 bytes，净减少 461 行和 21,639 bytes。
- 财务看板的应收条数从恒定空筛选结果长度改为等价的 `receivables.length`；金额汇总、缺失汇率判断和账户余额计算保持原实现。
- 删除了每次相关数据变化时无人消费的应收、业务成本、应付数组过滤，以及业务成本/应付摘要的多次 filter/reduce；这是确定的计算减量，但未做性能基准，因此不宣称具体响应时间提升。

## 财务边界审查

- 现行 `ReceivableAuditPage` 继续以 `finance:receivable:*` 权限控制创建、审核、反审、作废、批量和导出，并继续调用原 `ApiClient` 方法。
- 现行 `BusinessCostAuditPage` 与 `PayableAuditPage` 继续以各自 `manage/audit/reverse/void/batch/export` 权限控制操作；计费重 × 单价的金额计算、创建/更新分支和刷新链路均未修改。
- 本轮只改 Web 单文件；未改 API、Shared、Prisma、迁移、数据库、服务端 RBAC、字段裁剪、状态流转或审计实现。
- 47 白名单候选以线上当前 `FinancePage` 为基线生成，保留线上已有的代理身份、北京时间筛选、初始财务分区和缺失汇率提示等本地尚未回补能力。

## 验证

- 本地与 47 候选 TypeScript 语法转译均为 0 错误，`git diff --check` 通过；目标旧符号清零，三个现行领域页面、现行创建/管理权限和 API 调用标记保留。
- FinancePage 定向 ESLint 从基线 54 个问题降至 14 个；剩余均为本轮前已有的无用导入/参数和浏览器全局配置问题，没有新增错误。
- 财务整页固定样本在 30 秒内未产出有效结果，已由安全 runner 停止且不记为通过；47 Web production build 通过，作为最终 TypeScript 与生产打包门。
- 47 只同步 `FinancePage.tsx`，只构建/重启 Web，无 API、Shared、Prisma 或迁移变化；备份位于 `/opt/siyuan/backups/codex-20260727-codebase-slimming-phase-76/`。
- 47 上传源码 SHA-256 为 `9877befb60636c3ee10cf310e6ecf707de82e08990a9b6e5445c97ec602ba542`；源码和构建产物旧符号为 0，现行三个领域页面和权限标记保留。
- Web production build、容器、公网页面和反向代理 API health 均通过，最近 Web 日志无错误；漂移审计保持 `55 changed + 45 remote-only`。

## 交接

- 阻塞：无。
- 发布状态：`已发布 47`；仅构建和重启 Web，无迁移。
- 准确下一步：继续扫描 `FinancePage` 剩余 14 个既有 ESLint 问题，优先把同属已退场运单财务内嵌能力的无用导入和兼容 props 作为下一个完整零引用簇；仍不得触碰金额、RBAC、状态、审计或线上独有能力。
