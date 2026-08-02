# 振韵渠道要求抓取

- 状态：`completed`
- 输入来源：`无（当前会话明确请求）`
- 会话 slug：`pricing-zhenyun-channel-requirements`
- 分支：`codex/agent-master-data`
- worktree：`/Users/j1ng/Tools/sunny`
- 认领时间：`2026-07-16 Asia/Shanghai`

## 输入摘要

- 目标：抓取振韵价格表同 Sheet 底部的操作明细、货物限制、卸货要求及首页注意事项，并展示为渠道要求。
- 不做：不修改报价金额、渠道匹配、权限或历史价格表数据。

## 允许修改

- `apps/api/src/modules/pricing-excel.ts`
- `apps/api/src/modules/app.pricing.e2e.test.ts`

## 当前进度

- 已将振韵各价格 Sheet 最后一张价格表下方的要求块写入该 Sheet 的所有价格行；首页要求作为工作簿级要求合并。

## 验证

- 已通过：`npm test -w @siyuan/api -- --run src/modules/app.pricing.e2e.test.ts -t "振韵 horizontal"`
- 已通过：`npm run typecheck -w @siyuan/api`
- 已通过：`git diff --check`

## 交接

- 阻塞：无
- 剩余风险：历史已导入价格表不会自动重解析，需重新导入后显示新增渠道要求。
- 接手要求：状态改为 `handed_off` 后，新的唯一写会话才能继续。
