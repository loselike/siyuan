# Sunny Phase95：今日收货失败回退安全收口（2026-08-15）

- 状态：`published_47`
- worktree：`/Users/j1ng/Tools/sunny-phase95-today-fallback`
- branch：`codex/sunny-phase95-today-fallback`

## 用户边界

不改变业务数据、系统数据、现有权限逻辑、成功路径 API 契约或前端操作链路。只修复今日收货查询异常时的降级展示：失败不得把另一个接口提供的全量包裹快照当作今日收货结果。

## 重评依据与参考

- 全局重扫后发现 `WarehousePage` 的今日收货请求失败会调用 `warehousePackages()`；该快照可能包含历史日期，且数据范围由不同接口决定，无法证明与今日收货查询等价。
- 参考 [Twenty monorepo guidance](https://github.com/twentyhq/twenty/blob/main/CLAUDE.md) 的边界隔离原则，以及 [Nx affected](https://nx.dev/docs/features/ci-features/affected) 的受影响测试思路；本轮不引入新框架。
- 失败路径采用 fail-closed：清空当前查询结果并保留原有操作入口，正常接口成功路径逐句不变。

## 修改边界

- `apps/web/src/modules/warehouse/WarehousePage.tsx`
  - 今日收货请求失败时不再读取或合并全量包裹快照。
  - 清空当前查询行、汇总与选择，重置分页并展示错误提示。
  - 删除仅服务于旧回退的本地过滤函数与无效 effect 依赖。
- `apps/web/src/modules/warehouse/WarehousePage.loading.test.tsx`
  - 新增失败即不调用全量快照的特征测试。

## 验证

- Shared build：通过。
- Web loading 定向测试：5/5 通过。
- Web typecheck：通过。
- `git diff --check`：通过。
- 未修改 Prisma schema/migration、数据库记录、权限定义、API 字段或状态。

仓库完整 Web 流程测试本轮也执行过：22 个场景中 3 个通过、19 个失败，失败集中为工作树既有的 `App.tsx:971 businessShipments.map is not a function` 及其连锁渲染错误；该错误不触及本轮文件，loading 定向测试作为本切片门禁。治理检查的 context 门因当前 `docs/dev-now` 活跃文件数为 13（上限 12）未通过，属于跨会话状态债务；架构治理快检通过。

独立高风险复审通过：恢复 `role` effect 依赖，成功路径与权限/API 参数不变；失败路径已证明清空旧行、汇总和选择、显示错误且不调用全量快照。

## 发布前审查

- 需要独立检查正常成功路径、角色权限与数据范围不变，以及失败路径不再展示未验证快照。
- 通过审查后只发布 Web；无 migration、无 API 构建。
- 发布后检查 Web 静态产物、容器状态、首页与 `/api/health`，并保留 47 运行时 provenance。

## 发布证据

- 已发布 47：`git-ac00ae36dbd0_web-92a9d9039db4_api-724b18a2de6f`。
- 发布范围：`web`；`MIGRATION_REQUIRED=false`；未执行数据库迁移或业务数据写入。
- Web/API 镜像构建、容器重启、内外 health、源码 provenance、镜像匹配、API release ID、lock/recovery 均通过。
- 运行时 provenance：`GIT_SOURCE_BUILD` / `SERVER_BUILD`，发布提交 `ac00ae36dbd064ae9dc9f6f60fc4cfb264d2adaf`，来源分支 `codex/release/phase95-integrate`。

## 下一轮重评

发布后重新扫描前端数据流与仓库页面热点；若 fail-closed 已关闭数据范围风险，再评估按查询域抽取 WarehousePage hook，而不是继续大规模拆分。
