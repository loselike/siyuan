# 代码瘦身治理第三十五阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜35`
- 续接自：`docs/dev-now/codebase-slimming-phase-34.md`
- 上下文状态：`green`
- 输入来源：持续目标要求治理巨型文件且不得改变业务逻辑
- 会话 slug：`codebase-slimming-phase-35`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：从 `PricingPage` 等量提取纯类型、常量和计算辅助逻辑，缩小巨型页面的职责范围。
- 固定样本：价格表线路/目的地解析、导入代理选项及模糊搜索、南非品名分类保持原结果。
- 硬边界：API、HTTP、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入、状态流转、审计、页面入口、按钮、筛选、表格字段和提交载荷全部不变。

## 修改

- `apps/web/src/modules/pricing/PricingPage.tsx`
- `apps/web/src/modules/pricing/pricingPageModel.ts`
- `docs/dev-now/codebase-slimming-phase-35.md`
- `.codex-state.md`

## 当前进度

- 33 个纯模型导出迁入 `pricingPageModel.ts`；页面保留原 React 状态、JSX、API 调用和六个既有测试导出入口。
- 本地页面由 3870 行降至 3560 行，47 当前页面由 4757 行降至 4445 行；模型为 371 行。
- 本阶段运行时代码净增加约 60 行，改善模块边界和后续单测入口，不宣称性能提升或全仓总代码量下降。

## 验证

- 已通过：报价纯函数固定样本 3/3，覆盖线路/目的地解析、启用代理筛选和南非品名分类。
- 已通过：`git diff --check`；Web typecheck 的报价目标文件错误为 0。
- 已知基线阻断：Web 全量 typecheck 仍有财务审核页和仓库测试桩既有类型错误，与本阶段两个报价文件无关。
- 已通过：基于 47 当前源码只应用两个 Web 文件白名单变更，保留远端迪拜、南非、加拿大及加价工作台新增功能；仅重建/重启 Web，无迁移。
- 已通过：47 production build；目标声明在页面为 0、模型声明存在，静态产物包含原查价超时文案；Web/API 容器正常，容器内与公网 8899 首页/API health 为 200，Web 最近错误日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算：结构治理约 `45%`；已完成只减不增门槛、前端领域查询客户端拆分与兼容清理、多个后端只读 Controller 边界。真正全仓减量约 `25%`，因为大量阶段新增了领域边界和契约测试。
- 剩余主项：`PrismaRepository`/`InMemoryRepository` 仍巨大且在 47 相对初始门槛继续增长；`WarehousePage`、`App`、全局 CSS 和 shared contracts 尚未系统拆分；`PricingPage` 只完成第一块纯模型提取。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-35`。
- 准确下一步：继续拆 `PricingPage` 的展示配置或局部视图边界，优先选择不触碰请求、提交和状态流转的窄切片；随后再转 `WarehousePage`。每个切片继续以 47 当前源码为基线精确发布。
