# Sunny Phase98：工作区请求代际隔离

- 状态：completed
- 任务边界：在不修改业务数据、系统数据、权限定义、数据库结构、迁移或 API 业务语义的前提下，为已有授权范围 key 增加请求代际，阻止 A→B→A 时旧同范围异步结果重新写入。
- 用户验收目标：同一账号范围快速切换后，旧工作区 promise、父级回调和刷新 coordinator 不能覆盖新一代页面；首次加载、同一范围正常刷新和仓库兼容 fallback 仍保持 Phase97/96 语义。

## 重新评估与选择

Phase97 已关闭跨客户/团队范围的 P1 首帧与晚到写回风险。当前剩余候选包括 UI 美化、App 单体拆分、后端 Repository 纵向切片和同范围旧请求代际。按安全/数据流/架构效率/UI 复评，先处理请求代际：它直接消除已审查发现的同 scope 陈旧响应风险，改动集中且不改变业务口径，再进入 App 数据层抽取或后端领域切片。

## GitHub 参考与取舍

- [Nx affected CI features](https://nx.dev/docs/features/ci-features/affected)：借鉴把受影响任务和执行边界作为显式 key；Sunny 用本地授权 scope + generation 作为工作区请求边界，不引入 Nx。
- [Twenty CLAUDE.md](https://github.com/twentyhq/twenty/blob/main/CLAUDE.md)：借鉴模块边界和可审查的数据访问层；本切片只调整前端请求生命周期，不复制 Twenty 数据模型或状态管理。

## 实施

- 保留 `warehouseAuthorizationScopeKey` 作为 WarehousePage 缓存/兼容 fallback 的授权范围 key。
- App 另生成 `workspaceScopeKeyForGeneration(authScope, generation)`；授权范围变化时 generation 单调递增，工作区快照、页面 React key、父级 setter、notice、详情、AI、批量导入和文件下载的旧闭包因此不会在回到同一授权范围后复活。
- `workspaceRefreshCoordinator` 的 dedupe key 同时包含 generation，A→B→A 会发起新一代刷新，不复用旧 A promise；WarehousePage 仍收到纯 auth scope key，避免改变既有缓存边界。

## 本地验证

- Web safe 定向测试 19/19（含 workspace scope generation、workspace refresh characterization、WarehousePage loading）。
- Shared/API/Web typecheck、`architecture:check:fast`（434 route contracts）和 `git diff --check` 通过。
- 独立高风险审查：未发现 P0/P1；首次渲染、A→B→A、fallback key、刷新去重和权限/业务语义等价性通过复核。P2 为 render 阶段 generation ref、缺少 App 级 deferred characterization、同授权范围缓存可短暂陈旧，不阻断本切片。

## 发布边界

- 预计发布范围为 `web`；无 API、Prisma schema/migration 或业务数据写入。
- 发布前从 47 当前 Phase97 运行基线捕获 receipt；发布后核对 Web provenance、镜像、health、锁/recovery。视觉和真实角色切换由用户人工验收。

## 发布证据

- 发布分支：`codex/release/phase98-integrate`
- 发布提交：`b5934fe4f2117e8497e8ba0c4aa8d6e51e8342cb`
- 运行版本：`git-b5934fe4f211_web-89d28f83506f_api-fb50f8dc1ab0`
- 发布范围：`web`；`MIGRATION_REQUIRED=false`；API 未重建业务逻辑，数据库未执行迁移或写入。
- 47 发布：Web 构建、重启和本地 health 通过；公网 `/api/health` 返回 `ok=true`，首页 HTTP 200。
- 发布后 provenance：`traceable`；`WEB_IMAGE_MATCH=true`、`API_IMAGE_MATCH=true`、`API_RELEASE_ID_MATCH=true`。
- 发布锁与 recovery：`RELEASE_LOCK_STATUS=free`、`RELEASE_RECOVERY_STATUS=clear`。
- 仍需用户在 47 人工检查：仓库/业务/客服/财务页面在同一账号范围切换后的首屏、弹窗、导出和表单表现；本轮不改变权限或业务数据。
