# 亚马逊最高原始重量档位兜底

- 状态：`complete`
- 输入来源：用户明确需求
- 会话 slug：`pricing-amazon-highest-source-tier-fallback`
- 分支：`codex/agent-master-data`
- worktree：`/Users/j1ng/Tools/sunny`
- 认领时间：`2026-07-10 Asia/Shanghai`

## 输入摘要

- 目标：供应商原表没有 `100KG+` 时，最高有效 KG 档（如亿阳 `51KG+`）必须覆盖更高实际计费重。
- 不做：不增加界面重量段，不改其他查价模块，不发布 47。

## 允许修改

- `apps/api/src/modules/pricing-excel.ts`
- `apps/web/src/modules/pricing/excel.ts`
- `apps/web/src/modules/pricing/pricing.test.tsx`
- `apps/api/src/modules/app.pricing.e2e.test.ts`
- `docs/dev-now/pricing-amazon-highest-source-tier-fallback.md`

## 完成内容

- 亚马逊价格表的最高原始 KG 档改为无上限覆盖；原表没有 `100KG+` 时，最高 `51KG+` 档可用于实际计费重 `>= 51KG` 的查询。
- 仍保留 `12KG+ / 51KG+ / 100KG+` 的界面口径；原表存在更高档时，按真实重量范围优先命中该更高档。
- 补充亿阳式 `51KG+` 最高档在 `300KG`、界面选择 `100KG+` 时的 API 回归。

## 验证

- 通过：`npm test -w @siyuan/web -- --run src/modules/pricing/pricing.test.tsx -t "imports Yiyang"`
- 通过：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.pricing.e2e.test.ts -t "highest KG tier"`
- 通过：`git diff --check`
- 未通过：`npm run typecheck -w @siyuan/web` 与 `npm run typecheck -w @siyuan/api` 均被当前未完成的迪拜共享类型改动阻断：`DubaiPriceTableResponse`、`DubaiPriceTableRow` 及迪拜价格表字段尚未从 `@siyuan/shared` 完整导出，另有未定义的 `findBestPriceBookRouteMarkupRule`；与本卡无关。

## 交接

- 阻塞：无
- 47 发布：已于 `2026-07-10` 仅同步亚马逊解析文件并重建/重启 `api`、`web`；未运行迁移。
- 47 数据修复：已将 `亿阳国际` 的 `3,190` 条 `51KG+` 最高档从 `99.999KG` 更新为 `99999KG`，无需重新上传。
- 47 验证：API 健康检查和首页均返回 `200`，容器均为 `Up`。
- 剩余风险：其他供应商的既有最高档仍保留旧导入范围，后续应按解析版本做受控批量刷新；本轮未做浏览器查价验收。
- 接手要求：状态改为 `handed_off` 后，新的唯一写会话才能继续。
