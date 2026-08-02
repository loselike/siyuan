# 报价原始重量档位保留与匹配

- 状态：`complete`
- 输入摘要：保留供应商价格表真实重量档位，例如 `50KG+`；亚马逊查询界面继续使用 `12KG+ / 51KG+ / 100KG+`，查价按实际计费重匹配原始区间。
- 任务卡：用户明确授权的非任务卡需求
- 会话 slug：`pricing-source-weight-tier-preservation`
- 分支：`codex/agent-master-data`
- worktree：`/Users/j1ng/Tools/sunny`
- 认领时间：`2026-07-10 Asia/Shanghai`

## 允许修改

- `apps/web/src/modules/pricing/excel.ts`
- `apps/web/src/modules/shared/excel.ts`
- `apps/web/src/modules/pricing/pricing.test.tsx`
- `apps/api/src/modules/pricing-excel.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/app.pricing.e2e.test.ts`
- `docs/dev-now/pricing-source-weight-tier-preservation.md`

## 不做范围

- 不增加亚马逊查询界面的重量档位选项。
- 不把 `50KG+` 改名为 `51KG+`。
- 不批量回填历史价格表，不修改数据库结构，不发布 47。

## 当前进度

- 已保留供应商原始重量档位，不再丢弃或改名 `50KG+`。
- 已适配派格美国空海运双层表头、渠道继承、美西/美中/美东分区及实际重量档。
- 已恢复派格失效外部公式中的有效数值缓存，并受控支持 `IUS* / XUS* / IUTE` 仓库别名。
- 已改为按实际计费重匹配原始价格区间，亚马逊界面仍只展示三个标准档位。
- 已验证派格数据仅进入 `usaAirSea`，加拿大、迪拜、亚马逊、欧洲和南非数据池不受影响。

## 验证

- 已通过：真实 `/Users/j1ng/Downloads/7-9派格 .xls` 解析 1029 行，其中空海运 152 行、FBA `50KG+` 877 行。
- 已通过：`npm test -w @siyuan/web -- --run src/modules/pricing/pricing.test.tsx -t "imports Yiyang|保留美国派格|亚马逊查询重量段固定"`
- 已通过：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.pricing.e2e.test.ts -t "Paige|派格|usa canada dubai pricing module isolation|strict weightBand"`
- 已通过：`npm run typecheck -w @siyuan/web`
- 已通过：`npm run typecheck -w @siyuan/api`
- 已通过：`git diff --check`

## 交接

- 阻塞：无
- 剩余风险：历史已导入且丢失的 `50KG+` 行需要重新导入原价格表；本轮未发布 47。
- 接手要求：状态改为 `handed_off` 后，新的唯一写会话才能继续。
