# 代码瘦身治理第七十三阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜73`
- 续接自：`docs/dev-now/codebase-slimming-phase-72.md`
- 上下文状态：`green`
- 输入来源：持续目标要求继续取得高投入产出比的代码减量，同时保持业务契约不变
- 会话 slug：`codebase-slimming-phase-73`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-27 Asia/Shanghai`

## 输入摘要

- 目标：继续治理仓库包裹列表相关成本，优先删除已经退出现行界面但仍留在组件渲染路径和构建产物中的包裹明细残片。
- 固定样本：仓库今日收货、在仓数据、待理货包裹、理货明细和合票选择继续保留；旧“剩余第 N 件/预计共 N 件，已处理 N 件”残片从源码和构建产物清零。
- 硬边界：不改仓库 API、权限、数据范围、字段、数据库、写入、状态、审计、页面入口、按钮、筛选、表格或提交载荷。

## 修改

- `apps/web/src/modules/warehouse/WarehousePage.tsx`
- `apps/web/src/modules/warehouse/warehousePageModel.ts`
- `docs/dev-now/codebase-slimming-phase-73.md`
- `.codex-state.md`

## 当前进度

- 完整生产引用复扫确认包裹明细筛选 draft/正式状态、到仓状态推导、剩余件数组、四列表定义和 `WarehouseRemainingPackageRow` 类型均只有声明及相互引用，没有 JSX、事件或其他模块消费者。
- 删除上述死状态、两个包裹数组筛选链、剩余件构造、列定义和专用类型，生产源码增加 1 行、删除 60 行，净减少 59 行。
- 默认仓库页面每次渲染不再无条件遍历并复制当前 1,442 条 `warehousePackages` 形成无人消费的 `filteredWarehousePackages`；现行业务使用的站点选项、在仓/今日收货回退、合票、理货和选中包裹逻辑保持不动。
- 仓库包裹默认全量响应仍被多个现行业务链路消费，因此本阶段没有为追求数字直接分页或裁字段。

## 验证

- 本地目标符号完整复扫全部清零，仓库页面模型定向测试 2/2 和 `git diff --check` 通过。
- 仓库整页单用例 30 秒无有效结果，已按安全规则停止且无残留，不记为通过；47 Web production build 作为 TypeScript 与生产打包门通过。
- 47 以当前远端源码为基线应用两个 Web 文件白名单删除补丁，只构建/重启 Web，无 API、共享契约、Prisma 或迁移变化；备份位于 `/opt/siyuan/backups/codex-20260727-codebase-slimming-phase-73/`。
- 47 两个源码文件合计减少 3,105 bytes；生产构建的仓库独立 chunk 为 197,536 bytes，旧“剩余第/预计共…已处理”标记由 2 个构建文件降为 0，现行“理货明细/全选待理货包裹/今日收货客户编号筛选”标记仍存在于 2 个构建文件。
- Web 容器、公网首页、API health 和 Web 错误日志均通过；漂移审计保持 `55 changed + 45 remote-only`。

## 交接

- 阻塞：无。
- 发布状态：`已发布 47`；仅构建和重启 Web，无迁移。
- 准确下一步：继续在 `WarehousePage` 与其他高密度页面中用“声明/引用计数 + 构建产物标记”扫描整簇退场代码；只选择预计净删至少 30 行、且能证明没有 JSX/事件/API 消费者的候选。仓库包裹默认分页另行设计，不与死代码删除混在同一阶段。
