# 代理简称唯一与资料库加载隔离

- 状态：`complete`
- 任务卡：用户特例授权，无任务卡
- 会话 slug：`master-data-agent-short-name-unique`
- 分支：`codex/agent-master-data`
- worktree：`/Users/j1ng/Tools/sunny`
- 认领时间：`2026-07-10 Asia/Shanghai`

## 允许修改

- `apps/api/src/modules/in-memory.repository.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/app.orders.e2e.test.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/modules/masterData/MasterDataPage.tsx`
- `apps/web/src/modules/masterData/masterData.test.tsx`
- `docs/dev-now/master-data-agent-short-name-unique.md`

## 当前进度

- 已在内存仓库与 Prisma 仓库补代理简称去空格、忽略大小写查重。
- 已让重复错误在代理弹窗内明确展示并保留当前输入。
- 已将工作区初始化改为按权限请求，并让各财务请求独立降级，不再阻断基础资料加载。

## 验证

- 已通过：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.orders.e2e.test.ts -t "duplicate master data agent short names"`
- 已通过：`npm test -w @siyuan/web -- --run src/modules/masterData/masterData.test.tsx`
- 已通过：`npm run typecheck -w @siyuan/web`
- 已通过：`npm run typecheck -w @siyuan/api`
- 已通过：`git diff --check`

## 交接

- 阻塞：无
- 剩余风险：历史重复代理不在本轮自动合并或删除；未新增数据库唯一索引，并发写入的最终唯一性仍需历史数据治理后由数据库约束兜底。
- 接手要求：状态改为 `handed_off` 后，新的唯一写会话才能继续。
