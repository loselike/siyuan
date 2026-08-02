# 代码瘦身治理第六十八阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜68`
- 续接自：`docs/dev-now/codebase-slimming-phase-67.md`
- 上下文状态：`green`
- 输入来源：持续目标要求继续回补 47/Git 的低风险只读展示差异
- 会话 slug：`codebase-slimming-phase-68`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-27 Asia/Shanghai`

## 输入摘要

- 目标：回补 47 当前运行的 KG/CBM 加价单位展示和迪拜海运图片来源展示。
- 固定样本：重量加价显示 `/KG`、方数加价显示 `/CBM`；迪拜图片来源只显示文件名，不显示误导性的价格行数。
- 硬边界：不改加价金额、规则命中、报价计算、接口返回、规则写入、权限、数据库、状态或审计。

## 修改

- `packages/shared/src/index.ts`
- `apps/web/src/modules/pricing/pricingPageDisplay.tsx`
- `apps/web/src/modules/pricing/pricingPageDisplay.test.tsx`
- `docs/dev-now/codebase-slimming-phase-68.md`
- `.codex-state.md`

## 当前进度

- 为现有 `AgentMarkupSummary` 回补 47 已返回的可选 `rulePurpose` 类型；不新增运行时字段或序列化逻辑。
- 重量型加价按现有 `markupUnit` 显示 `/KG` 或 `/CBM`，缺失单位继续回退 `/KG`。
- `DUBAI_SEA_IMAGE` 来源只显示图片文件名，普通价格表来源继续显示文件名和行数。
- `pricingPageDisplay.tsx` 与 47 完整同哈希；漂移硬指标从 `57 changed + 46 remote-only` 降至 `56 changed + 46 remote-only`。

## 验证

- Shared typecheck 通过。
- Web 安全 runner 展示 helper 定向测试 3/3 通过，覆盖百分比、KG、CBM、迪拜图片来源及既有渠道要求交互。
- `git diff --check` 通过。
- 本地与 47 `pricingPageDisplay.tsx` SHA-256 均为 `1f01ffe97381e051e1719557a04e9d7c3b22df72196f945a14d4799dec9003c8`；47 静态产物包含 `DUBAI_SEA_IMAGE` 指纹。
- 47 管理员加价列表为 200/20；当前列表没有 `markupUnit` 或 `DUBAI_SEA_IMAGE` 样本，因此线上真实数据视觉效果未由该接口样本证实，只由源码、构建产物和定向测试证明。
- 公网首页和 API health 为 200。

## 交接

- 阻塞：无。
- 发布状态：`无需重复发布`；47 已运行相同展示代码和共享字段，本阶段只恢复 Git 基线。
- 准确下一步：停止继续追逐依赖大页面的单行展示差异，转向可从现有页面抽取并复用的纯只读 helper；候选为市场排货历史选择或代理展示，但必须先证明本地已有等价内联实现，避免把 47 新业务功能当作重构回补。
