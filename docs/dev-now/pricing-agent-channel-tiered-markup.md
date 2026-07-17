# 2026-07-14 报价查价代理渠道重量阶梯加价规则

- 状态：completed
- 输入来源：用户任务卡 `2026-07-14-报价查价-代理渠道重量阶梯加价规则`。
- 会话 slug：pricing-agent-channel-tiered-markup

## 输入摘要

- 目标：按查价模块、代理、真实渠道、KG/CBM 与区间维护阶梯加价，并使查价只命中一条最高优先级规则。
- 不做：不改导入/解析、百分比/按票/固定加价，不删除旧默认或线路规则，不发布 47。

## 允许修改

- `apps/web/src/modules/pricing/`、`apps/web/src/apiClient.ts`
- `packages/shared/src/index.ts`
- `apps/api/src/modules/data.controller.ts`、仓储层、Prisma schema 与最小迁移、报价测试。

## 完成

- 新增按查价模块、代理简称、真实渠道、计费单位和计费区间维护的渠道阶梯加价；渠道选项仅来自当前模块已导入价格行。
- 内存与 Prisma 仓储均校验单位匹配、区间合法性和启用规则区间重叠；查价优先命中一个渠道阶梯，未命中时继续兼容历史渠道统一/代理默认加价。
- 规则页新增渠道阶梯列表和多区间维护弹窗；业务员报价响应仍只返回最终报价。
- Prisma 增加最小字段与迁移 `20260714110000_agent_markup_chargeable_tiers`。

## 验证

- 通过：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.pricing.e2e.test.ts -t "markup|channel|weight|tier|fallback|permission"`（15 项）。
- 通过：`npm run build -w @siyuan/shared`、`npm run typecheck -w @siyuan/web`、`npm run typecheck -w @siyuan/api`。
- 通过：`git diff --check`。
- 未通过：Web 定向测试有 1 个既有应用壳导航夹具失败，断言期待 `报价查价` 菜单，但当前夹具渲染为市场管理；本轮阶梯 API 用例未受影响。

## 交接

- 阻塞：无
- 剩余风险：迁移尚未在 47/Prisma 真库执行；未做真实浏览器规则维护和查价截图验收。
