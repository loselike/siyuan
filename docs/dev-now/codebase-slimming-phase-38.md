# 代码瘦身治理第三十八阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜38`
- 续接自：`docs/dev-now/codebase-slimming-phase-37.md`
- 上下文状态：`green`
- 输入来源：持续目标要求继续治理巨型文件且不得改变业务逻辑
- 会话 slug：`codebase-slimming-phase-38`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：从 `App.tsx` 提取完整的页面错误隔离与懒加载回退组件边界，缩小根应用职责范围。
- 固定样本：页面渲染异常继续拦截白屏并上报当前路由/菜单/分区，懒加载页面继续显示原加载提示。
- 硬边界：API、HTTP、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入、状态流转、审计、路由、页面入口、按钮、筛选、表格字段、页面组件参数和提交载荷全部不变。

## 修改

- `apps/web/src/App.tsx`
- `apps/web/src/modules/appShell/AppPageBoundary.tsx`
- `apps/web/src/modules/appShell/AppPageBoundary.test.tsx`
- `docs/dev-now/codebase-slimming-phase-38.md`
- `.codex-state.md`

## 当前进度

- 页面错误 ID、错误上报、错误恢复卡片及 Suspense 加载回退迁入一个完整组件，App 继续传入原 `resetKey/menuKey/sectionKey/onReport` 并包裹原页面树。
- 本地 App 由 3452 行降至 3363 行，47 当前 App 由 3645 行降至 3556 行；新边界组件 109 行，两端运行时代码均净增加 20 行。
- 改善根应用错误隔离与页面编排的职责边界，不改变性能、路由或业务行为，也不宣称全仓总代码量下降。

## 验证

- 已通过：新组件契约测试 2/2，覆盖渲染异常恢复 UI、当前路由/菜单/分区上报和懒加载回退文案。
- 已通过：`git diff --check`；Web typecheck 的 App 与新组件目标文件错误为 0。
- 已知基线阻断：Web 全量 typecheck 仍有财务审核页和仓库测试桩既有类型错误，与本阶段目标文件无关。
- 已通过：基于 47 当前 App 源码应用一个精确补丁并新增边界组件，保留远端模块初始路由、侧栏展开、问题件弹窗、代理字段、排货费用目录和审核就绪判断，共 18 处远端功能指纹；仅重建/重启 Web，无迁移。
- 已通过：47 production build；旧边界声明为 0、新边界引用为 3，静态产物包含“页面加载失败”；Web/API 容器正常，实际监听端口 18899 的首页/API health 与公网 8899 首页/API health 均为 200，Web 最近错误日志为 0。

## 交接

- 阻塞：无。
- 当前总目标估算：结构治理约 `48%`；真正全仓减量仍约 `25%–30%`。本阶段建立了完整组件边界，但模块包装与测试继续抵消总代码量下降。
- 剩余主项：`PrismaRepository`、`InMemoryRepository`、全局 CSS 和 shared contracts 仍是主要巨型边界；`App`、`PricingPage`、`WarehousePage` 也仍包含大量状态、请求和多个工作区 JSX。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-38`。
- 准确下一步：停止为 App 增加小型 helper，转向已隔离只读 Controller 背后的 Repository 查询实现；先选择系统目录以外、能形成多查询领域 Repository 且不触及财务、账号、状态流转和审计的窄切片。
