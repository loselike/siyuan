# 报价查价：美国 ZIP 保留全部命中报价

- 状态：已完成并发布 47，未提交。
- 输入来源：当前会话明确请求。
- 范围：美国空海运查询中，同一 ZIP 命中的所有代理/渠道/邮编规则均保留；不再按规则精确度跨线路淘汰。
- 修改：`PrismaRepository` 与内存仓储的美国 ZIP 筛选统一返回全部命中行；E2E 覆盖全国通用、ZIP 区间、精确 ZIP 同时输出。
- 验证：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.pricing.e2e.test.ts -t "supports usa canada dubai pricing module isolation"`、`npm run typecheck -w @siyuan/api`、`git diff --check` 通过；47 仅同步两处 API 运行时文件并重建/重启 API，无 Prisma migration。线上用 ZIP `51500`、100KG 实测返回 13 条报价、2 个代理：派格 10 条（含海运）和拓普达 3 条。
- 剩余：无。
