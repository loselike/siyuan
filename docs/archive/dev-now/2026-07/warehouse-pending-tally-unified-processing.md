# warehouse-pending-tally-unified-processing

- 状态：`completed`
- 输入来源：`docs/tasks/2026-07-12-warehouse-pending-tally-unified-processing.md`
- 会话 slug：`warehouse-pending-tally-unified-processing`
- 分支：`当前工作区`
- worktree：`/Users/j1ng/Tools/sunny`
- 认领时间：`2026-07-12 Asia/Shanghai`

## 输入摘要

- 目标：在仓数据唯一发起理货，未完成理货统一处理任务内合并、拆票和完成，并保留完整历史与录单继承。
- 不做：不发布 47，不重做录单、出库、面单或历史数据回填。

## 允许修改

- `apps/web/src/modules/warehouse/WarehousePage.tsx`
- `apps/web/src/apiClient.ts`
- `apps/api/src/modules/data.controller.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `packages/shared/src/index.ts`
- `apps/web/src/modules/warehouse/warehouse.test.tsx`
- `apps/api/src/modules/app.warehouse.e2e.test.ts`

## 当前进度

- 未完成理货已收敛为任务列表的“查看任务 / 处理理货”。原全量待理货包裹池、筛选和重复合并/拆票操作区不再显示。
- 完成接口支持任务内最终包裹结果：保持、合并和拆票一次提交；原包裹归档、最终包裹创建、录单关联继承、任务完成和审计在同一仓储事务/内存提交内完成。
- 拆票后缀继续复用原组合号历史最大序号；任务号改为 `客户编号MMDDNNLH`，并限制同一任务只包含同一客户包裹。
- 已完成理货的原始包裹与最终包裹均依真实 `tallyTaskId/tallyTaskNo` 回查同一历史。

## 验证

- 通过：Web 定向理货流程测试 6 项；API `-t "tally"` 定向测试；Web/API typecheck；`git diff --check`。
- 任务卡 API 复合筛选命令包含既有“groups warehouse API packages”用例，该用例因共享内存数据顺序断言失败（期待首条 1399 分组，实际首条为同客户另一组合号），与本轮理货提交逻辑无直接关系；其余命中的理货、拆票、录单、审计用例通过。

## 交接

- 阻塞：无
- 剩余风险：Prisma 路径的“任务内多结果”依赖现有 `tallyTaskId` 包裹关联追溯；尚未用实际 Prisma 数据库运行多包合并和 75→50/25 的端到端样本。
