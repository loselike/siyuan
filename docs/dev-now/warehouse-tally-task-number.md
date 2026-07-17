# warehouse-tally-task-number

- 状态：`complete`
- 输入来源：`无（当前会话明确请求）`
- 会话 slug：`warehouse-tally-task-number`
- 分支：`当前工作区`
- worktree：`/Users/j1ng/Tools/sunny`
- 认领时间：`2026-07-15 Asia/Shanghai`

## 输入摘要

- 目标：理货任务号按“客户编号 + 月日 +（同日第二单起两位编号）+ LH”生成，首单不带 `01`。
- 不做：不回填或改写已有历史理货任务号，不发布 47。

## 允许修改

- `apps/api/src/modules/warehouse-tally-task-number.ts`
- `apps/api/src/modules/warehouse-tally-task-number.test.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/app.warehouse.e2e.test.ts`

## 当前进度

- 已修复：首单生成 `客户编号 + 月日 + LH`，例如 `13990622LH`；同日后续任务从 `02` 开始递增。
- 已兼容：已有错误格式的 `01` 视为首单，后续新任务会从 `02` 继续，避免碰撞。
- 已加固：Prisma 持久化创建遇到任务号唯一键竞争时会重新取号并重试。
- 已保留：历史 `-TL001` 和已生成的 `01LH` 任务号不回填、不改写。

## 验证

- 已通过：`npm test -w @siyuan/api -- --run src/modules/warehouse-tally-task-number.test.ts`（3 项）。
- 已通过：`npm test -w @siyuan/api -- --run src/modules/app.warehouse.e2e.test.ts -t "lists in-stock packages, splits by pieces, and creates outbound order with tally requirement"`。
- 已通过：`git diff --check`。
- 未通过（既有）：`npm run typecheck -w @siyuan/api` 被当前共享类型/Prisma 客户端不一致阻塞；本轮新增文件和改动未产生额外报错。

## 交接

- 阻塞：无
- 剩余风险：历史旧号保留原样，后续新单将按新规则生成；未发布 47。
