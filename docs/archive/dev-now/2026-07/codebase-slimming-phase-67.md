# 代码瘦身治理第六十七阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜67`
- 续接自：`docs/dev-now/codebase-slimming-phase-66.md`
- 上下文状态：`green`
- 输入来源：持续目标要求继续回补能与 47 完整同哈希的低风险窄切片
- 会话 slug：`codebase-slimming-phase-67`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-27 Asia/Shanghai`

## 输入摘要

- 目标：回补 47 已运行的仓库理货标签打印临时窗口自动关闭行为。
- 固定样本：写入打印 HTML、触发打印、模拟打印完成或取消，临时窗口关闭一次。
- 硬边界：不改标签内容、尺寸、条码、打印触发时机、仓库数据、API、权限、状态流转或审计。

## 修改

- `apps/web/src/modules/warehouse/warehouse-tally-print.ts`
- `apps/web/src/modules/warehouse/warehouse-tally-print.test.ts`
- `docs/dev-now/codebase-slimming-phase-67.md`
- `.codex-state.md`

## 当前进度

- 回补 47 当前 `onafterprint` 清理逻辑：打印完成或用户取消打印后，若临时窗口仍打开则自动关闭。
- 生产源码只回补 5 行，不改变打印前路径和返回值；生产文件与 47 完整同哈希。
- 漂移硬指标从 `58 changed + 46 remote-only` 降至 `57 changed + 46 remote-only`。

## 验证

- Web 安全 runner 定向测试 2/2 通过：既有 Code128/标签尺寸样本保持；新增打印与窗口关闭样本通过。
- `git diff --check` 通过。
- 本地与 47 `warehouse-tally-print.ts` SHA-256 均为 `0d1bbe5118b663438a6f3434040d1a16f37ca1b1bff5670e11a22b54d66e6578`。
- 47 `WarehousePage` 静态产物存在 `onafterprint` 指纹；Web/API/Postgres/Redis 正常，宿主 API health 与公网首页为 200。

## 交接

- 阻塞：无。
- 发布状态：`无需重复发布`；47 已运行相同源码，本阶段只恢复 Git 基线。
- 准确下一步：回补 `pricingPageDisplay.tsx` 中 47 已运行的 KG/CBM 加价单位和迪拜图片来源展示窄切片，并扩展既有展示 helper 测试；该批仍只读展示，不触碰报价计算或规则写入。
