# 迪拜空海运价格表直接展示

- 状态：complete
- 任务：2026-07-10-报价查价-迪拜空海运价格表直接展示
- 范围：迪拜价格表解析、只读浏览接口、双表页面、相关类型与测试
- 允许修改：
  - `apps/web/src/modules/pricing/PricingPage.tsx`
  - `apps/web/src/modules/pricing/excel.ts`
  - `apps/web/src/modules/pricing/pricing.test.tsx`
  - `apps/web/src/apiClient.ts`
  - `apps/api/src/modules/pricing-excel.ts`
  - `apps/api/src/modules/data.controller.ts`
  - `apps/api/src/modules/in-memory.repository.ts`
  - `apps/api/src/modules/prisma.repository.ts`
  - `apps/api/src/modules/app.pricing.e2e.test.ts`
  - `packages/shared/src/index.ts`
  - `docs/dev-now/quote-pricing-dubai-table.md`
- 边界：不改其他查价模块，不改报价计算口径，不做数据库迁移，不发布 47
- 验证：任务卡指定 Web/API 测试、Web/API typecheck、`git diff --check`

## 完成结果

- 迪拜模块改为只读空运/海运双表，移除页面查询条件、查询/清空/复制动作及报价结果区。
- 新增公开表格接口，只返回业务单价、渠道代码、时效、入仓信息和渠道要求；旧报价接口明确拒绝查价。
- Web/API 解析器支持 `渠道代码/通道代码`，按产品类别或服务内容价格块继承，不跨块串用。
- 真实样表抽样解析 64 行，识别 5 组空运代码和 4 组海运代码，包括 `AE空运-P`、`AH海运-P`。
- 任务卡小验证、Web/API typecheck、`git diff --check` 全部通过。
- 风险：历史已导入行没有新展示字段时会显示“未提供渠道代码”，需重新导入对应迪拜价格表；未发布 47。

## 2026-07-10 补充：按已识别渠道代码归类空海运

- 输入：用户指出页面已经识别出 `AE空运-*`、`AH海运-*` 渠道代码，要求直接按该结果分类空海运。
- 范围：只改迪拜价格表接口的空/海运分类与字段透传，不改报价计算口径、不改数据库、不发布 47。
- 完成：迪拜双表组装优先按 `cbmPrice/CBM/方` 判海运，同时兜底按 `AH海运/海运/海派` 判海运；旧导入行从 legacy 行转表格行时补透 `cbmPrice`、`priceTierLabel`、`sourceSheetName`、`realChannelName`。海运行如果历史重量段是 `0KG+`，海运表方数段显示 `按方`。
- 验证：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.pricing.e2e.test.ts -t "dubai|迪拜|price table|海运"`、`npm run typecheck -w @siyuan/api`、`npm test -w @siyuan/web -- --run src/modules/pricing/pricing.test.tsx -t "迪拜|空海运|价格表"`、`git diff --check` 均通过。
- 发布：2026-07-10 已按 API 范围发布 47。为避免带上本机其他未发布差异，本轮只同步 `apps/api/src/modules/in-memory.repository.ts`、`apps/api/src/modules/prisma.repository.ts` 两个运行时文件；未同步无关 Web/财务/主数据差异，未运行迁移。47 `docker compose build api`、`docker compose up -d --remove-orphans api` 成功，容器本地和公网 `/api/health` 均正常，API 日志包含 `Nest application successfully started`。
- 风险：47 本次只发布 API 分类逻辑；如果浏览器前端已有缓存，刷新后重新请求接口即可看到 `AH海运-*` 进入海运表。
