# Sunny Phase102：Prisma 生成前置与根命令确定性

- 状态：completed
- 目标：让根 `build` 与 `typecheck` 自动先生成 Prisma Client，消除新 worktree/CI 因缺少 `.prisma/client` 产生的伪失败。
- worktree：`/Users/j1ng/Tools/sunny-phase102-prisma-tooling`
- branch：`codex/sunny-phase102-prisma-tooling`
- 禁止：不执行 `migrate deploy`、`db push`、seed；不修改 schema/migration、业务数据、权限、API、前端运行逻辑或数据库连接配置。

## GitHub/成熟实践参考

- [Nx affected tasks](https://nx.dev/docs/features/ci-features/affected)：把生成代码/依赖任务作为受影响任务的显式前置，避免在不同入口下得到不同结果；本轮只借鉴确定性前置，不引入 Nx。
- [Prisma CLI generate](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/generating-prisma-client)：`prisma generate` 只生成客户端代码，不执行数据库变更；根命令显式调用，和现有 API workspace script 保持一致。
- [GitHub Actions dependency steps](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)：CI 将工具生成步骤放在编译/检查前；Sunny 本地根命令与 CI 保持同一前置顺序。

## 行为保持边界

- 只改根 `package.json` 的脚本编排；不改变任何 HTTP 路由、权限、请求/响应、状态流转、数据裁剪或持久化行为。
- `build`/`typecheck` 仍按原顺序构建 shared、API、Web；新增步骤仅为 API Prisma Client 生成。

## 验收与发布

- 最小验收：在干净 worktree 删除本地生成客户端后执行根 `typecheck`，确认命令自动恢复并通过；执行根 `build` 不触发迁移。
- 辅助验收：`git diff --check`、`npm run architecture:check:fast`，必要时 `npm run governance:check`。
- 本轮无运行时代码、schema 或 migration，若代码门禁通过不需要发布 47；仍受 context governance 状态归档门禁约束。

## 验证结果与重审

- 新 worktree 在 `npm install --ignore-scripts` 后没有 `.prisma/client`；根 `npm run typecheck` 自动执行 `prisma generate`，随后 Shared/API/Web typecheck 全部通过。
- 根 `npm run build` 自动生成 Prisma Client，Shared/API/Web 生产构建通过；未执行迁移、seed 或数据库写入。
- 全回归 workflow 删除了根 `typecheck` 已覆盖的重复 Prisma 生成步骤；CI 仍在 typecheck 前生成一次，受影响任务脚本保持独立生成前置。
- `git diff --check`、`npm run architecture:check:fast`（434 route contracts）通过；`npm run governance:check` 仍只被既有 context 状态治理阻断（活动文件超限及 Phase96–101 终态待归档）。
- 复审未发现业务逻辑、权限、接口、数据库或发布脚本变化。下一最高收益回到模块化拆分，但应优先选择已有 Controller 边界并保持每次一条只读查询链路。
