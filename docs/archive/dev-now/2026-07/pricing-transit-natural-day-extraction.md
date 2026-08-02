# 报价查价：自然日提取时效精简

- 状态：已完成并发布 47，未提交。
- 输入来源：当前会话明确请求。
- 范围：将 `交货次日8个自然日提取，，运费赔完即止` 这类文本只展示为自然日提取时效；不显示赔付、费用或货型要求。
- 修改：`sanitizePricingTransitLabel` 优先提取 `交货次日 N 个自然日提取` 或 `N 个自然日内提取`；API 回归测试覆盖两种输入。
- 验证：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.pricing.e2e.test.ts -t "natural-day pickup|parses Paige air express"`、`npm run typecheck -w @siyuan/api`、`git diff --check` 通过。
- 发布：仅同步 `apps/api/src/modules/pricing-excel.ts`，重建并重启 47 API，未运行 Prisma migration、未同步无关改动。
- 线上验证：ZIP `51500`、100KG 查价返回的派格空运时效为 `交货次日8个自然日提取` 或 `交货次日10个自然日提取`；API、首页和公网健康检查均正常。
