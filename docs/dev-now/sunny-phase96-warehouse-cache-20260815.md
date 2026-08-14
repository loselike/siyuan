# Sunny Phase96：仓库缓存授权范围隔离

- 状态：completed
- 任务边界：只隔离 `WarehousePage` 的内存缓存键；不修改业务数据、系统数据、权限定义、既有 API 参数/返回语义、数据库 schema、迁移或既有操作链路。服务端仅附加不透明的 session 字段供缓存失效使用。
- 用户验收目标：同一 API 客户端在角色或权限范围变化后重新打开仓库页面，不应直接展示上一授权范围的今日收货/在仓缓存。

## 现状与第一性原理

`WarehousePage` 使用 `WeakMap<ApiClient, WarehousePageCache>`，其中 `todayByQuery` 和 `inStockByQuery` 原来只以查询对象序列化结果作为键。`App` 通常按 access token 复用 `ApiClient`；同 token 的角色/权限刷新或重新挂载页面时，旧缓存可能先于新请求展示。Phase95 已移除今日收货失败时回退全量快照，本切片继续收窄剩余缓存范围，不改变服务端裁剪。

## GitHub 参考与取舍

- [Twenty CLAUDE.md](https://github.com/twentyhq/twenty/blob/main/CLAUDE.md)：借鉴其按边界组织前端模块、显式区分视图状态与数据访问边界；Sunny 不复制 Twenty 的数据模型或权限实现。
- [Nx affected CI features](https://nx.dev/docs/features/ci-features/affected)：借鉴“受影响范围显式化”的工程原则；本切片把授权范围作为可审计的缓存键输入，不引入 Nx 或改变构建流程。
- 许可证/安全取舍：仅参考公开架构原则与文档，不复制代码；Sunny 仍以现有后端 canonical permission、客户/站点裁剪和线上接口为最终安全边界。

## 实施

- 服务端在 RBAC guard 完成当前用户/团队/站点范围 hydration 后用现有服务端 JWT secret 做 HMAC 生成不透明 `warehouseScopeFingerprint`，`/auth/login` 和 `/auth/session` 以附加字段返回；密钥不回传，不把团队成员名单或可枚举的无密钥摘要暴露给前端，也不改变授权决策。
- 前端缓存键由该 fingerprint、role 和去重排序后的 permissions 组成；`todayByQuery`、`inStockByQuery`、packages、completed archive、tally tasks、查询完成标记和机器导出就绪校验统一使用 `授权范围 + 查询条件` 边界。
- `WeakMap<ApiClient, Map<scopeKey, ...>>` 按 scope 分区整个 cache，并限制单个客户端最多保留 4 个 scope 分区；即使旧 scope 的异步回调晚到，也只能写回自己的分区。全量 fallback promise 也携带 scopeKey，scope 改变时不会复用旧 promise。
- 角色、权限或服务端范围变化会触发相应查询 effect，并立即清空缓存派生 rows、汇总、选择项、归档、理货任务和通知详情；旧缓存不删除业务数据，只因边界不匹配而不可复用。
- App 以完整授权 scope key（fingerprint、角色、权限）作为 `WarehousePage` 的 React key；实际授权范围变化时先卸载旧页面实例，再挂载新范围页面，避免旧范围表格在 effect 清理前短暂提交到 DOM。
- `WarehousePage` 只有在 App 同时提供匹配的 `shipmentsScopeKey` 时才把 workspace 运单用于 API 失败时的兼容 fallback；未标记或跨 scope 的运单按空集合处理。
- App 的 workspace refresh 也按同一 scope 生成代际：范围变化立即清空本地 workspace 快照，旧请求的运单、客户服务、财务、台账、主数据和任务写回全部丢弃；仓库父级更新/出库回调同样检查当前 scope，旧页面异步完成不会回写新范围。
- 保持 Phase95 的今日收货失败 fail-closed 路径；在仓失败回退逻辑、权限判断、API payload 和所有持久化行为不变。
- 个人资料修改接口在服务端完成更新后重新 hydration 当前 principal，并在同一成功响应中返回新的 HMAC fingerprint；前端只合并这个原子响应，不依赖可能并发的旧 session refresh。
- 如果资料写入已成功但范围 hydration 暂时失败，接口返回一次性 `scope-refresh-required:<UUID>` 不透明失效边界；这只触发前端缓存失效，不参与后端授权，下一次受保护 session 刷新会重新生成 HMAC。

## 验证计划

- focused Web loading test：成功写入旧范围缓存，使用同一 `ApiClient` 改变 scope fingerprint 并在同一挂载实例触发新请求；新请求未完成前不得出现旧行，失败后显示错误且不调用全量快照。
- focused Web fallback test：未标记或跨 scope 的 workspace 运单不会进入失败兼容快照。
- focused API tests：覆盖正常资料更新的 rehydration/HMAC 响应，以及 hydration 失败时的 fail-closed 不透明边界。
- API/Web typecheck、Shared build、`git diff --check`、`architecture:check:fast`。
- 由于改动涉及数据范围缓存，发布前由独立风险审查检查角色/权限依赖、查询键一致性、导出就绪状态和 fail-closed 语义。
- 47 发布涉及 API session 响应和 Web 缓存；无 migration、无业务/系统数据写入；发布后检查 runtime provenance、health、release lock/recovery，并用只读 session/health 证据确认 fingerprint 字段存在且权限拒绝路径未改变。

## 发布与线上证据（2026-08-15）

- 已在 `codex/release/phase96-integrate2` 精确发布，范围为 `web+api`；`MIGRATION_REQUIRED=false`，未执行迁移、写入业务数据或系统数据。
- 运行版本：`git-051ad6499676_web-cae0defd104c_api-48096bfbc6af`；源码提交为 `051ad64996768e6548a5c923eaddae662c1a8b1d`。
- 47 公网与容器内 health 均返回 `ok`；API/Web/Postgres/Redis 容器正常运行。
- 发布后 provenance 审计为 `traceable`，`WEB_IMAGE_MATCH=true`、`API_IMAGE_MATCH=true`、`API_RELEASE_ID_MATCH=true`；发布锁为 `free`，recovery 为 `clear`。
- 容器内只读 session 探针确认 fingerprint 为 64 位 opaque 字段；无今日收货权限的现有启用账号访问目标接口返回 403。探针未输出 token、密钥、账号标识或业务数据。
- Web 构建仅有既有的大 chunk warning，没有构建失败或运行时 health 错误；浏览器排版与交互仍由用户在 47 人工检查。

## 未验证项

- fingerprint 当前由 RBAC guard 按 hydrated principal 计算；登录响应的首次 fingerprint 不含尚未 hydration 的团队列表，但首次受保护请求会刷新 `/auth/session` 并替换范围键，旧缓存因此 fail-closed。后续可考虑由服务端提供显式 scope revision，减少登录后的首次刷新抖动。
- session 刷新是异步网络请求，刷新响应返回前页面仍沿用上一次已知授权状态；这是客户端无法在未知服务器状态下推断的窗口，后续可由服务端提供单调 scope revision 或 push 失效信号进一步缩短。个人资料写入不再依赖该并发 refresh 来更新 fingerprint。
- 浏览器视觉验收不属于本切片自动门禁，由用户在 47 的仓库今日收货/在仓页面人工检查。
