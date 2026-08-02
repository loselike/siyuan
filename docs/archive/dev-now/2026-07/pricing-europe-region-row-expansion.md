# 欧洲价格表分区误展开修复

- 状态：`completed`
- 输入来源：`无（当前会话明确请求）`
- 会话 slug：`pricing-europe-region-row-expansion`
- 分支：`共享工作区，未切换分支`
- worktree：`/Users/j1ng/Tools/sunny`
- 认领时间：`2026-07-15 Asia/Shanghai`

## 输入摘要

- 目标：修复欧洲横向价格表把国家/分区数字误拆为仓库编码，导致振韵价格表膨胀至 32737 行的问题，并在 47 规则重建后验证。
- 不做：不修改原始价格表金额、报价匹配、代理加价或亚马逊明确仓库编码解析。

## 允许修改

- `apps/api/src/modules/pricing-excel.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/app.pricing.e2e.test.ts`
- `docs/dev-now/pricing-europe-region-row-expansion.md`

## 当前进度

- 已确认 `意大利专线` 的国家/分区列表被错误按仓库组合展开，单个价格单元复制为 57 或 114 条。
- 欧洲模块仅在存在明确仓库列时拆分仓库编码；数字分区保留为邮编/分区规则，不再参与仓库交叉展开。
- 规则刷新兼容唯一同名但未关联 `priceBookId` 的历史报价副本，仍拒绝多个同名副本的歧义关联。

## 验证

- 通过：API 类型检查；价格解析 E2E 定向用例；`git diff --check`；原始 `7.3振韵.xls` 本地复跑为 2319 行。
- 47：已仅构建/重启 API，执行 `20260715193000_price_book_rule_refresh` migration；`7.3振韵.xls` 规则刷新成功，`32737` 行已原子替换为 `2319` 行，parser rule version 为 `5`，API health 200。

## 交接

- 阻塞：无
- 剩余风险：横向欧洲表中少数非报价说明行仍可能被现有通用解析器识别为目的地，应以实际查价命中样本继续清理，不影响本次 32737 行膨胀修复。
