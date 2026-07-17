# 财务录单公司渠道货物计算

## 本轮目标

已选公司渠道后，仓库已选包裹必须按该渠道的除材积、多件比较和计费重进位规则计算并回填货物数据；不能把仓库自动汇总的数据误当作手工货物数据。

## 已完成

- 共享公司渠道计算将仓库的单件实重乘以该行件数，与材积重使用同一件数口径。
- 录单页选仓库包裹后汇总总件数、总实重和总方数；已选公司渠道优先于仓库预填渠道，切换渠道立即按新规则重算并同步费用计费重。
- API 的内存和 Prisma 仓储在 `AUTO_MATCHED` 且已关联仓库包裹时，使用逐包裹渠道规则计算，不再采用前端传来的旧汇总值；手动调整仍保留原有聚合计算。
- 增加共享计算与 API 自动仓库计算的回归用例。

## 验证

- `npm run build -w @siyuan/shared` 通过。
- `USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.orders.e2e.test.ts -t "calculates warehouse cargo from the selected company channel"` 通过。
- `npm run typecheck -w @siyuan/web` 通过。
- API 全量 typecheck 被现有无关错误阻塞：`WarehouseTallyTaskSummary.outputPackages` 与 Prisma `Set.has` 类型错误。

## 未发布

本轮未发布到 47。
