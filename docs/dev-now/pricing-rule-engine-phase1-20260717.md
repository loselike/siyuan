# 报价规则引擎第一阶段（2026-07-17）

- 状态：`completed`
- 输入来源：`用户当前会话明确请求`
- 会话 slug：`pricing-rule-engine-phase1-20260717`
- 分支：`codex/pricing-rule-engine-phase1`
- worktree：`/Users/j1ng/Tools/sunny`

## 目标

- 将价格表解析后的时效清洗、渠道要求清洗、加拿大私人/亚马逊仓库分区匹配收敛为共享、纯函数、可测试的领域规则层。
- 解析器和查询匹配继续复用现有接口与数据结构；不重写价格表格式，不修改线上数据。

## 验收

- 领域规则层由 Shared 导出，并覆盖时效、渠道要求、仓库分区的边界场景测试。
- API 价格表解析和加拿大查询调用同一规则层。
- Shared/API/Web 类型检查与 API 定向报价测试通过。

## 风险边界

- 当前工作区存在他人对 `docs/dev-now/route-tier-markup-workbench.md` 的未提交发布记录，本会话不修改、不纳入提交。
- 本轮不发布 47；只在本地建立可测试能力。

## 完成记录

- 新增 Shared 纯规则层：仓库编码解析、加拿大私人/FBA 范围匹配、时效清洗、渠道要求脱敏。
- 价格表解析器保留兼容导出但实际调用 Shared 规则；Prisma 和内存仓储报价展示改为直接调用同一 Shared 规则。
- 修复加拿大混合分区单元格（例如 `YVR+YXX2`）：输入 `YVR` 可匹配该行，不再因整格比较而漏价。

## 验证

- `npm run typecheck` 通过。
- `npm run build` 通过。
- `npm run test:safe -- npm test -w @siyuan/shared -- --run src/pricing-rule-engine.test.ts`：3 项通过。
- `npm run test:safe -- npm test -w @siyuan/api -- --run src/modules/app.pricing.e2e.test.ts -t 'Canada|加拿大|Kunyun|坤宇|transit|渠道要求'`：12 项通过。
