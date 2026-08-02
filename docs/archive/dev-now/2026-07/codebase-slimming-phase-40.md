# 代码瘦身治理第四十阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜40`
- 续接自：`docs/dev-now/codebase-slimming-phase-39.md`
- 上下文状态：`green`
- 输入来源：持续目标要求继续治理巨型文件且不得改变业务逻辑
- 会话 slug：`codebase-slimming-phase-40`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：把已隔离在 `WarehouseInventoryQueryController` 背后的包裹全集、包裹分组和手工收货客户三个无副作用 Prisma 查询迁入领域 Repository。
- 固定样本：管理员读取包裹、分组和启用客户继续返回原字段、理货状态与排序；墨家设备重复推送继续识别为已接收。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库结构、写入结果、状态流转、审计日志、页面入口、按钮、筛选、表格字段和提交载荷全部不变。

## 修改

- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/warehouse/inventory/warehouse-inventory-query.controller.ts`
- `apps/api/src/modules/warehouse/inventory/warehouse-inventory-query.repository.ts`
- `apps/api/src/modules/warehouse/inventory/legacy-warehouse-inventory-query.repository.ts`
- `apps/api/src/modules/warehouse/inventory/warehouse-inventory-query.repository.test.ts`
- `apps/api/src/modules/warehouse/warehouse-query.shared.ts`
- `docs/dev-now/codebase-slimming-phase-40.md`
- `.codex-state.md`

## 当前进度

- 仓库包裹全集、包裹分组和手工收货客户迁入 `PrismaWarehouseInventoryQueryRepository`；内存模式继续通过 Legacy 适配器调用原实现。
- `WarehouseInventoryQueryController` 的三个纯查询使用领域令牌；今日收货和在库查询仍直接调用 `PrismaRepository`，保留其查看审计写入。
- 墨家设备重复检测改为调用领域库存查询，重复判断和后续创建/审计路径不变。
- 包裹与理货任务关联映射、理货生命周期状态和包裹分组汇总迁入共用 helper；在库查询与录单包裹选择继续调用同一 helper。
- 本地 `PrismaRepository` 由 19,224 行降至 19,130 行，减少 94 行；47 当前 Repository 由 23,178 行降至 23,071 行，减少 107 行。
- 新增领域 Repository、Legacy 适配器和共享 helper 后，两端运行时代码净增加约 78 行；本阶段改善职责边界和复用，不改变查询性能，也不宣称全仓总代码量下降。

## 验证

- 已通过：领域 Repository 契约测试和既有库存只读 E2E 共 5/5，覆盖查询顺序、待理货/理货中/已理货映射、分组汇总、启用客户排序和角色拒绝。
- 已通过：墨家设备测量与重复推送固定样本 1/1，证明重复检测、写入、失败审计和返回文案保持。
- 已通过：包裹分组、合票和创建草稿运单固定样本 1/1，证明分组字段与后续业务调用保持。
- 已通过：`npm run governance:check` 和 `git diff --check`。
- 已知基线阻断：API 全量 typecheck 仍存在内存理货状态、可选字符串、财务 `filterOptions` 和仓库包裹可编辑性等既有错误；本阶段目标文件错误为 0。
- 已通过：发布前从 47 当前源码生成七文件白名单补丁，保留远端包裹理货生命周期、理货任务创建时间排序、仓租、重复理货、客服数据确认和付款银行功能；只重建/重启 API，无 Prisma 迁移。
- 已通过：47 production build；巨型 Repository 中三个目标查询及私有映射为 0、领域 Repository 为 3、共享映射调用为 3；今日收货和在库两个查询及查看审计动作指纹合计为 4，五条库存 GET 路由各映射一次。
- 已通过：47 管理员包裹 200/1441 且关键字段完整，分组 200/412 且关键字段完整，手工收货客户 200/10 且只返回 `code/name` 并保持代码排序；包裹结果同时存在“待理货/理货中/已理货”三类状态。
- 已通过：47 客户保留 403“没有访问权限”，未登录保留 401“缺少登录凭证”；API/Web 容器正常，容器内、宿主实际端口和公网 `/api/health` 均为 200，API 最近错误日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算：结构治理约 `51%`；真正全仓减量仍约 `25%–30%`。仓库两个查询 Controller 已开始拥有独立生产 Repository，但新边界和测试仍抵消全仓总代码量下降。
- 剩余主项：`PrismaRepository`、`InMemoryRepository`、全局 CSS 和 shared contracts 仍是主要巨型边界；`App`、`PricingPage`、`WarehousePage` 仍包含大量状态、请求和多个工作区 JSX。
- 保留边界：今日收货和在库查询会写查看审计，继续留在原 Repository；下一阶段不得为了减行把审计写入伪装成纯 GET。
- 发布状态：`已发布 47`；仅 API，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-40`。
- 准确下一步：复扫仓库库存以外的现有领域 Controller，选择不依赖写审计、财务、账号或状态流转的多查询实现；若没有足够安全的多查询切片，则转向拆 `InMemoryRepository` 的测试 fixture 与领域适配器，不继续强拆有副作用查询。
