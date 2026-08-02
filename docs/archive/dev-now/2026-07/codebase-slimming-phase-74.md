# 代码瘦身治理第七十四阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜74`
- 续接自：`docs/dev-now/codebase-slimming-phase-73.md`
- 上下文状态：`green`
- 输入来源：持续目标要求继续按声明—引用证据删除整簇退场代码
- 会话 slug：`codebase-slimming-phase-74`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-27 Asia/Shanghai`

## 输入摘要

- 目标：删除仓库页面旧入库标签/内部交货面单的组件、状态、工具和样式残片，同时保留现行代理交接单打印与批量出货链。
- 固定样本：点击“打印代理交接单”仍打开现行交接单预览，保留公司标题、代理分组、唛头确认、打印及批量出货；旧“入库标签/内部交货面单”标记从源码和构建产物清零。
- 硬边界：不改页面入口、待出库表格、选择、交接单字段、打印 HTML、出货动作、API、权限、数据、状态流转或审计。

## 修改

- `apps/web/src/modules/warehouse/WarehousePage.tsx`
- `apps/web/src/modules/warehouse/warehousePageModel.ts`
- `apps/web/src/modules/warehouse/utils.ts`
- `apps/web/src/styles.css`
- `docs/dev-now/codebase-slimming-phase-74.md`
- `.codex-state.md`

## 当前进度

- TypeScript 声明—引用计数、本地与 47 生产源码复扫确认 `WarehouseInboundLabelCard`、`WarehouseInternalLabelCard`、三个未调用打印/出货函数、旧阶段时间 helper、两组只写不展示的标签 map、永远为空的出库归档 state、只写不读的唛头确认 map 均无现行业务消费者。
- 删除上述组件、状态、数组生成器、两个标签工具函数、`WarehouseOutboundLabel` 类型和 153 行专用样式；生产源码增加 4 行、删除 310 行，净减少 306 行。
- “打印代理交接单”不再按选中订单件数生成并写入无人读取的内部标签数组；现行 `createWarehouseHandoverHtml`、交接单预览、唛头确认、打印 API 和批量出货函数保持不动。
- 47 四个源码文件合计减少 10,118 bytes。

## 验证

- 目标符号与样式类在本地完整清零；PostCSS 解析、仓库模型测试 2/2 和 `git diff --check` 通过。
- 代理交接单整页单用例 30 秒无有效结果，已按规则停止且无残留，不记为通过；47 Web production build 作为 TypeScript 和生产打包门通过。
- 47 以当前远端源码为基线应用四个 Web 文件白名单补丁，只构建/重启 Web，无 API、共享契约、Prisma 或迁移变化；备份位于 `/opt/siyuan/backups/codex-20260727-codebase-slimming-phase-74/`。
- 生产构建 CSS 从 198.95 kB / gzip 32.51 kB 降至 196.51 kB / gzip 32.05 kB；仓库 chunk 从 197.54 kB / gzip 49.16 kB 降至 196.33 kB / gzip 48.82 kB。
- 旧“入库标签/内部交货面单”构建标记由 2 个文件降为 0；现行“代理交接单/深圳思远国际货运代理有限公司/唛头确认”标记仍存在于 4 个构建文件。
- Web 容器、公网首页、API health 和 Web 错误日志均通过；漂移审计保持 `55 changed + 45 remote-only`。

## 交接

- 阻塞：无。
- 发布状态：`已发布 47`；仅构建和重启 Web，无迁移。
- 准确下一步：继续复扫仓库页面剩余低引用声明，优先处理“声明一次且无调用”的函数和“setter 无调用/值恒定”的 state；若候选不足 30 行，则转到下一个高密度页面，避免碎片化小批次。
