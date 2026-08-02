# 代码瘦身治理第五十九阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜59`
- 续接自：`docs/dev-now/codebase-slimming-phase-58.md`
- 上下文状态：`green`
- 输入来源：持续目标要求在业务逻辑不变的前提下继续结构治理和真实减量
- 会话 slug：`codebase-slimming-phase-59`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-26 Asia/Shanghai`

## 输入摘要

- 目标：删除已经被现行列表式 ManagedTable 列设置替代的旧网格样式，不改变列显隐、排序、锁定、宽度或持久化行为。
- 固定样本：ManagedTable 列设置弹窗隐藏并重排列的组件测试。
- 硬边界：页面入口、表格字段、列设置按钮、存储键、默认隐藏列、固定选择列、接口、权限、数据和业务状态全部不变。

## 修改

- `apps/web/src/styles.css`
- `docs/dev-now/codebase-slimming-phase-59.md`
- `.codex-state.md`

## 当前进度

- Git 历史直接证明 `Checkbox.Group className="managed-column-settings-grid"` 已被 `managed-column-settings-list` 和逐行 `managed-column-settings-row` 实现替换；旧 CSS 当时未同步删除。
- 本地与 47 当前运行时源码完整类名复扫确认旧 `managed-column-settings-grid` 均为零引用，现行 `list` 与 `row` 各有真实生产引用。
- 删除旧网格规则，共减少 7 行生产 CSS；没有修改 `ManagedTable` 组件、测试、列配置或任何页面调用方。
- 本轮只消除替换后遗留样式，不改变界面布局或交互，也不宣称可感知运行性能提升。

## 验证

- PostCSS 完整解析、旧选择器清零、现行 `list/row` 规则保留和 `git diff --check` 通过。
- ManagedTable 列设置隐藏与重排固定样本经 Web 安全 runner 通过 1/1。
- 47 production build 通过，其中包含 Shared build、Web TypeScript build 和 Vite build；发布范围为 `web`，无 API、Prisma schema 或 migrations 变化，只重建并重启 Web。
- 47 上传后目标 CSS SHA-256 与远端当前源码生成的白名单候选一致：`2e031e0ba2afc924387de712911c6891a55f8bfd3ff6859078a23a117c2b5252`；相对备份只删除目标规则 7 行。
- 构建 CSS 产物由约 `204.91 kB / gzip 33.50 kB` 降至 `204.79 kB / gzip 33.49 kB`；主 JS 保持约 `909.10 kB / gzip 261.77 kB`。
- Web/API/Postgres/Redis 容器正常，容器内 Web、宿主首页、宿主 API health、公网首页和公网 API health 均为 200，Web 最近错误日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算仍为：结构治理约 `63%`；真正全仓减量约 `42%`；综合约 `53%`。
- 剩余主项：两套巨型 Repository、全局 CSS 和 shared contracts 仍是主要边界；`App`、`PricingPage`、`WarehousePage` 仍包含大量状态、请求和工作区 JSX。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260726-codebase-slimming-phase-59`。
- 下一候选：`compact-module-card` 已完成本地与 47 零引用初筛，旧样式仅提供 92px 最小高度；下一阶段需进一步核对历史使用点和动态修饰符后，单独删除并用仍使用 `module-card` 的运营/轨迹卡片固定样本验证。
