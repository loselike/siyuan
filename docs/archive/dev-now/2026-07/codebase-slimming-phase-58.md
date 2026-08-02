# 代码瘦身治理第五十八阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜58`
- 续接自：`docs/dev-now/codebase-slimming-phase-57.md`
- 上下文状态：`green`
- 输入来源：持续目标要求在业务逻辑不变的前提下继续结构治理和真实减量
- 会话 slug：`codebase-slimming-phase-58`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-26 Asia/Shanghai`

## 输入摘要

- 目标：继续治理巨型全局样式，删除旧原生文件上传控件的零引用样式，不影响现行价格表、轨迹、面单和凭证上传入口。
- 固定样本：本地与 47 的完整运行时类名清单，以及现行 `visually-hidden-file-input`、凭证图片输入和客服面单拖放区样式。
- 硬边界：API 契约、RBAC、数据范围、字段裁剪、数据库、上传请求、写入、状态、审计、页面入口、按钮和提交载荷全部不变。

## 修改

- `apps/web/src/styles.css`
- `docs/dev-now/codebase-slimming-phase-58.md`
- `.codex-state.md`

## 当前进度

- 本地与 47 生产运行时源码完整类名复扫确认 `upload-label`、`file-input`、`file-button-label` 均为零引用；动态类名检查未发现从文件或上传状态拼接这些名称。
- 删除三个旧原生上传样式及 `file-button-label input` 子规则，共减少 25 行生产 CSS；没有新增替代样式、组件或包装。
- 现行报价价格表上传继续使用 `visually-hidden-file-input`，财务凭证继续使用 `voucher-image-input__file`，客服面单继续使用 `customer-service-upload-dropzone`，三组样式均保留。
- 本轮没有修改 TypeScript/TSX、上传函数、接口、权限、文件校验、数据、状态或页面结构；效果是减少全局样式体积与无效上传控件维护面，不宣称可感知运行性能提升。

## 验证

- PostCSS 完整解析、目标选择器清零、现行上传选择器保留和 `git diff --check` 通过。
- 轨迹 Excel 整页导入定向用例超过 30 秒未产生有效结果，已按安全测试规则停止且未遗留 Vitest 进程；没有把该次执行记为通过，后续由 production build 提供编译安全证据。
- 47 production build 通过，其中包含 Shared build、Web TypeScript build 和 Vite build；发布范围为 `web`，无 Shared 运行时改动、API、Prisma schema 或 migrations 变化，只重建并重启 Web。
- 47 上传后目标 CSS SHA-256 与远端当前源码生成的白名单候选一致：`4e7226d71d7684687c0039c5d2630c86251b2c2a89dc1d7154701f1675996a7d`；相对备份只删除三个目标类的 25 行样式。
- 构建 CSS 产物由约 `205.20 kB / gzip 33.55 kB` 降至 `204.91 kB / gzip 33.50 kB`；主 JS 保持约 `909.10 kB / gzip 261.77 kB`。
- Web/API/Postgres/Redis 容器正常，容器内 Web、宿主首页、宿主 API health、公网首页和公网 API health 均为 200，Web 最近错误日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算仍为：结构治理约 `63%`；真正全仓减量约 `42%`；综合约 `53%`。
- 剩余主项：两套巨型 Repository、全局 CSS 和 shared contracts 仍是主要边界；`App`、`PricingPage`、`WarehousePage` 仍包含大量状态、请求和工作区 JSX。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260726-codebase-slimming-phase-58`。
- 准确下一步：复核 `managed-column-settings-grid` 与现行 `managed-column-settings-list/row` 的替换关系；若本地、47 和动态 `className` 均确认旧网格零引用，单独删除该旧规则并用 ManagedTable 列设置固定样本验证。
