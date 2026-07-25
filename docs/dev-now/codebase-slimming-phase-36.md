# 代码瘦身治理第三十六阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜36`
- 续接自：`docs/dev-now/codebase-slimming-phase-35.md`
- 上下文状态：`green`
- 输入来源：持续目标要求继续治理巨型文件且不得改变业务逻辑
- 会话 slug：`codebase-slimming-phase-36`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-25 Asia/Shanghai`

## 输入摘要

- 目标：从 `PricingPage` 等量提取纯展示和报价文案辅助逻辑。
- 固定样本：普通报价与旧报价复制文本、加价格式、渠道要求裁剪/预览和点击行为保持原结果。
- 硬边界：API、HTTP、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入、状态流转、审计、页面入口、按钮、筛选、表格字段、JSX 调用位置和提交载荷全部不变。

## 修改

- `apps/web/src/modules/pricing/PricingPage.tsx`
- `apps/web/src/modules/pricing/pricingPageDisplay.tsx`
- `apps/web/src/modules/pricing/pricingPageDisplay.test.tsx`
- `docs/dev-now/codebase-slimming-phase-36.md`
- `.codex-state.md`

## 当前进度

- 11 个价格格式、加价展示、渠道要求、自定义备注和复制报价文案辅助导出迁入展示模块；零调用的 `getMarkupTypeLabel` 删除。
- 本地页面由 3560 行降至 3385 行，47 当前页面由 4445 行降至 4270 行；展示模块为 188 行。
- 运行时代码净增加 13 行，改善展示职责边界和定向测试入口，不改变性能或业务行为。

## 验证

- 已通过：新增展示契约测试 2/2，覆盖两类复制报价文案、价格和比例加价格式、渠道要求裁剪/标题/点击及自定义备注裁剪。
- 已通过：`git diff --check`；Web typecheck 的报价目标文件错误为 0。
- 已知基线阻断：Web 全量 typecheck 仍有财务审核页和仓库测试桩既有类型错误，与本阶段目标文件无关；两个既有整页测试在 30 秒无有效结果后按安全规则终止，未重复长跑。
- 已通过：基于 47 当前源码只应用两个 Web 文件白名单变更，保留远端迪拜图片加价单位、南非、加拿大及加价工作台功能；仅重建/重启 Web，无迁移。
- 已通过：47 production build；页面目标声明为 0、展示模块导出为 11、远端功能指纹仍在，静态产物包含“时效待确认”；Web/API 容器正常，容器内与公网 8899 首页/API health 为 200，Web 最近错误日志为 0。

## 交接

- 阻塞：无。
- 剩余主项：`PricingPage` 仍有大量状态、请求和多个业务工作区 JSX；`WarehousePage`、`App`、全局 CSS、shared contracts、`PrismaRepository` 和 `InMemoryRepository` 尚未完成治理。
- 发布状态：`已发布 47`；仅 Web，无迁移。备份位于 `/opt/siyuan/backups/codex-20260725-codebase-slimming-phase-36`。
- 准确下一步：停止继续横向增加报价微型 helper；扫描 `PricingPage` 中能形成完整局部视图的窄组件，若会牵动状态或事件签名则转去 `WarehousePage` 的纯模型/展示切片。
