# 查价模块独立价格池与仓库代码导入

- 状态：`complete`
- 输入：用户明确要求所有查价模块以导入目标模块作为独立价格池，修复拓普达 `TPD-加拿大直航海卡经济` 导入“亚马逊查询”后无法按 `XYY4` 查价的问题。

## 已完成

- 横向价格表识别 `仓库分区` 列，保留括号内仓库代码，并将同一单元格中的多个代码拆为独立价格行。
- `多伦多（YYZ/YHM1/YOO1/YDC5/XYY4）` 现在生成 `YHM1`、`YOO1`、`YDC5`、`XYY4` 的可查记录；目的地标准化为“加拿大”。
- 亚马逊查询不再在未填写国家时强制追加“美国”筛选；价格池仍严格由导入的 `targetModule` 决定。
- Prisma 回退查询和价格表转旧报价行均优先使用显式 `targetModule`，不再按“加拿大/海卡”等原表文字推断并排除行。
- 新增 API 回归：加拿大线路表导入 `amazon` 后，`XYY4 + 21kg` 能在亚马逊查询返回报价。

## 验证

- `USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.pricing.e2e.test.ts -t "explicitly imported module pricing|feeds price book imports|supports usa canada dubai|maps Amazon warehouse|strict weightBand|uses the supplier highest"`：6 passed。
- `npm run typecheck -w @siyuan/api`：通过。
- `git diff --check`：通过。

## 注意

- 已按旧解析逻辑导入的历史价格表没有保存括号内原始仓库代码，需重新导入原表后才能生成 `XYY4` 等拆分记录；本轮未发布 47。
