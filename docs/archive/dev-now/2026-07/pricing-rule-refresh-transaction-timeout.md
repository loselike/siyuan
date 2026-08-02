# 价格表规则同步事务超时修复

- 根因：47 上“拓普达VIP美加专线2026.7.14号20：00生效.xlsx”在 Amazon v5 刷新时，原子替换价格行的 Prisma 事务在 20 秒默认上限后于 21.39 秒关闭；首次将上限调至 90 秒后，实际展开的 10,074 行在 114.825 秒仍超时。
- 修复：规则同步写回仍保持原子删除/重建，事务启动等待上限设为 15 秒、执行上限设为 180 秒；Amazon 规则版本升至 v7，使 v6 已失败的保留原文件自动进入一次新的受控同步。
- 验证：`npm test -w @siyuan/api -- --run src/modules/app.pricing.e2e.test.ts -t "Topuda|rule revision|rule refresh|supports usa canada dubai pricing module isolation"`、`npm run typecheck -w @siyuan/api`、`git diff --check` 通过。
- 发布：已只同步 `pricing-excel.ts` 与 `prisma.repository.ts` 到 47，并仅重建/重启 API，未同步本机其他改动、未运行 Prisma migration。v7 自动重试于 2026-07-16 21:20:38 完成：10,074/10,074 行成功，价格表状态为 `CURRENT`，公网 `/api/health` 返回 200。
