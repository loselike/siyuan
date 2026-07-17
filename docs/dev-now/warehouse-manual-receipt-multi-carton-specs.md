# warehouse-manual-receipt-multi-carton-specs

- 状态：`completed`
- 输入来源：`当前会话任务卡：2026-07-15-warehouse-manual-receipt-multi-carton-specs`
- 会话 slug：`warehouse-manual-receipt-multi-carton-specs`
- 分支：`当前工作区`
- worktree：`/Users/j1ng/Tools/sunny`
- 认领时间：`2026-07-15 00:00 Asia/Shanghai`

## 输入摘要

- 目标：仓库手动添加收货支持同一票一次录入多条箱规，并按一条箱规一行保存展示。
- 不做：不改历史箱规、不改理货/拆票/出库流程、不发布 47、不做线上数据迁移。

## 允许修改

- `apps/web/src/modules/warehouse/WarehousePage.tsx`
- `apps/web/src/modules/warehouse/warehouse.test.tsx`
- `apps/web/src/modules/testSupport/appTestHarness.tsx`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/app.warehouse.e2e.test.ts`
- `packages/shared/src/index.ts`
- `apps/web/src/apiClient.ts`
- `apps/web/src/styles.css`

## 当前进度

- 已新增多箱规 DTO 和批量手动收货 API 入口。
- 已将手动添加收货抽屉改为多箱规紧凑行录入。
- 已补前端测试支撑与 API 覆盖用例。
- 已完成最小可执行验证，前端仓库单测命令存在 Vitest 进程不退出阻塞。

## 验证

- 通过：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.warehouse.e2e.test.ts -t "manual receipt|warehouse package|multi|duplicate"`
- 通过：`npm run build -w @siyuan/shared`
- 通过：`npm run typecheck -w @siyuan/shared`
- 通过：`npm run typecheck -w @siyuan/web`
- 通过：`git diff --check`
- 阻塞：`npm test -w @siyuan/web -- --run src/modules/warehouse/warehouse.test.tsx -t "手动添加收货多条箱规" --testTimeout=20000 --reporter=verbose` 卡在 Vitest 进程不退出，已手动中断。
- 未通过但非本卡引入：`npm run typecheck -w @siyuan/api` 剩余错误集中在既有 `User.department/departmentId` Prisma 类型不一致。

## 交接

- 阻塞：前端仓库单测进程不退出，需单独排查测试 harness 异步资源。
- 剩余风险：未做浏览器实机截图验证；API 全量 typecheck 受既有 Prisma 部门字段类型错误阻塞；`packages/shared/dist` 被 Git 忽略，fresh checkout 需要先构建 shared。
- 接手要求：如需继续，只在本任务允许文件内收尾和验证。
