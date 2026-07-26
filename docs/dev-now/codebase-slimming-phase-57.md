# 代码瘦身治理第五十七阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜57`
- 续接自：`docs/dev-now/codebase-slimming-phase-56.md`
- 上下文状态：`green`
- 输入来源：持续目标要求在业务逻辑不变的前提下继续结构治理和真实减量
- 会话 slug：`codebase-slimming-phase-57`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-26 Asia/Shanghai`

## 输入摘要

- 目标：继续治理巨型全局样式，删除一组仓库标签与交接界面的零引用旧包装选择器，不改变现行仓库标签或交接单。
- 固定样本：现行理货标签独立 HTML 生成测试，以及待出库表格、代理交接预览和内部面单三个仍在使用的相邻类名。
- 硬边界：API 契约、RBAC、数据范围、字段裁剪、数据库、写入、状态、审计、仓库入口、按钮、筛选、表格和提交载荷全部不变。

## 修改

- `apps/web/src/styles.css`
- `docs/dev-now/codebase-slimming-phase-57.md`
- `.codex-state.md`

## 当前进度

- 本地与 47 生产源码完整类名复扫确认 `warehouse-label-preview-grid`、`warehouse-label-actions`、`warehouse-label-print-button`、`warehouse-handover-trace` 均为零引用；动态类名只生成其他已知名称，独立打印 HTML 使用 `agent-handover`、`barcode` 等自身样式，不会生成本轮候选。
- 删除四个旧包装选择器及 `warehouse-label-preview-grid` 的打印媒体规则，共减少 36 行生产 CSS；没有新增替代样式、组件或包装。
- `warehouse-label-queue-table`、`warehouse-agent-handover-preview`、`warehouse-internal-label` 及其打印分页规则继续保留，现行待出库表格、代理交接预览和内部面单不动。
- 本轮没有修改 TypeScript/TSX、打印函数、接口、权限、数据、状态或页面结构；效果是继续减少全局样式体积与无效维护面，不宣称可感知运行性能提升。

## 验证

- PostCSS 完整解析通过；现行理货标签 HTML 固定样本经 Web 安全 runner 通过 1/1；`git diff --check` 通过。
- 本地与 47 生产源码的四个目标类名引用均为 0；47 上传后目标 CSS SHA-256 与远端当前源码生成的白名单候选一致：`634e7943c2536b2340cc5e043873f725168f204ada39744f52ab848a7ac71a39`。
- 发布范围为 `web`；无 Shared、API、Prisma schema 或 migrations 变化，只构建并重启 Web，47 production build 通过。
- 构建 CSS 产物由约 `205.69 kB / gzip 33.64 kB` 降至 `205.20 kB / gzip 33.55 kB`；主 JS 保持约 `909.10 kB / gzip 261.77 kB`。
- Web/API/Postgres/Redis 容器正常，容器内 Web、宿主首页、宿主 API health、公网首页和公网 API health 均为 200，Web 最近错误日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算仍为：结构治理约 `63%`；真正全仓减量约 `42%`；综合约 `53%`。
- 剩余主项：两套巨型 Repository、全局 CSS 和 shared contracts 仍是主要边界；`App`、`PricingPage`、`WarehousePage` 仍包含大量状态、请求和工作区 JSX。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260726-codebase-slimming-phase-57`。
- 准确下一步：继续扫描与本轮相邻但语义独立的通用旧样式；优先复核 `file-button-label`、`compact-module-card` 和列设置旧网格，不把通用类名、第三方类名或动态修饰符纳入同一批次。
