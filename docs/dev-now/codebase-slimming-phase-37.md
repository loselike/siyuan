# 代码瘦身治理第三十七阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜37`
- 续接自：`docs/dev-now/codebase-slimming-phase-36.md`
- 上下文状态：`green`
- 输入来源：持续目标要求继续治理巨型文件且不得改变业务逻辑
- 会话 slug：`codebase-slimming-phase-37`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：从 `WarehousePage` 等量提取纯类型、列配置、计算和 API 数据映射逻辑，缩小巨型页面的职责范围。
- 固定样本：仓库分页、北京时间转换、箱规合计、设备扫描固定数据和客户到仓进度保持原结果。
- 硬边界：API、HTTP、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入、状态流转、审计、页面入口、按钮、筛选、表格字段、JSX 调用位置和提交载荷全部不变。

## 修改

- `apps/web/src/modules/warehouse/WarehousePage.tsx`
- `apps/web/src/modules/warehouse/warehousePageModel.ts`
- `apps/web/src/modules/warehouse/warehousePageModel.test.ts`
- `docs/dev-now/codebase-slimming-phase-37.md`
- `.codex-state.md`

## 当前进度

- 10 类页面模型、列配置、时间与箱规计算、理货状态判断、交接单号、测试扫描包裹构造和 API 包裹映射迁入模型模块，共 29 个导出。
- 本地页面由 3856 行降至 3369 行，模型为 537 行，运行时代码净增加约 50 行；47 当前页面由 4362 行降至 3904 行，远端适配模型为 511 行，运行时代码净增加约 53 行。
- 改善仓库页面职责边界和纯逻辑定向测试入口，不改变性能或业务行为，也不宣称全仓总代码量下降。

## 验证

- 已通过：模型与既有页面定向测试 2 个文件共 3/3，覆盖分页、北京时间转换、箱规合计、设备扫描固定样本、部分到仓进度和未录单包裹可编辑判断。
- 已通过：`git diff --check`；Web typecheck 的 Warehouse 目标文件错误为 0。
- 已知基线阻断：Web 全量 typecheck 仍有财务审核页和仓库测试桩既有类型错误，与本阶段目标文件无关；一个既有整页仓库测试在 30 秒无有效结果后按安全规则终止，未重复长跑。
- 已通过：基于 47 当前源码只应用两个 Warehouse Web 运行时文件白名单补丁，保留远端缓存、租金详情、重复理货统计、设备备注/测量、分页和排序功能；仅重建/重启 Web，无迁移。
- 已通过：47 production build；页面迁移声明为 0、模型导出为 29、远端功能指纹为 20，静态产物包含“部分到仓”；Web/API 容器正常，容器内与公网 8899 首页/API health 为 200，Web 最近错误日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算：结构治理约 `47%`；真正全仓减量约 `25%–30%`。本阶段继续形成可维护边界，但新增测试与模块包装抵消了总代码量下降。
- 剩余主项：`PrismaRepository`、`InMemoryRepository`、`App`、全局 CSS 和 shared contracts 仍是主要巨型边界；`PricingPage`、`WarehousePage` 也仍包含大量状态、请求和多个工作区 JSX。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-37`。
- 准确下一步：优先扫描 `App.tsx` 中能形成完整路由/导航模型的纯结构切片，避免继续扩张页面 helper；若远端差异使等量迁移风险过高，则转向已隔离查询 Controller 背后的 Repository 实现。
