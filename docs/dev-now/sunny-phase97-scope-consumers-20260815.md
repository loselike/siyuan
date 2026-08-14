# Sunny Phase97：非仓库运单消费者授权范围隔离

- 状态：ready_for_release
- 任务边界：在不修改业务数据、系统数据、权限定义、数据库结构、迁移或 API 业务语义的前提下，收紧 App 内工作区快照、表单、下载和异步副作用的授权范围边界。
- 用户验收目标：角色、团队、站点、客户归属或权限范围变化后，财务、客服、客户门户、轨迹导入、全局运单入口、表单和文件下载不能继续读取或写回上一范围的数据；同一固定业务功能的接口、权限、状态、金额、审计和持久化语义保持不变。

## 当前扫描与优先级

Phase96 已隔离 `WarehousePage`，但全局扫描发现 App 仍把未校验 `loadedWarehouseShipmentsScopeKey` 的 `localShipments` 直接传给两处 `FinancePage` 和 `CustomerPortal`，客服页的 `onShipmentUpdated` 也仍使用无范围校验的回调。进一步复核还发现工作区的财务/客服/主数据快照、父级异步写回、AI/批量轨迹结果、表单内容及文件下载存在跨范围首帧或晚到副作用。这是 P1 数据范围隔离风险，优先级高于继续拆分大文件或局部 UI 美化。

## GitHub 参考与取舍

- [Twenty CLAUDE.md](https://github.com/twentyhq/twenty/blob/main/CLAUDE.md)：借鉴按边界组织模块、让数据访问边界显式可审查；Sunny 继续保持现有 React/NestJS 模块化单体，不复制 Twenty 的数据模型。
- [Nx affected CI features](https://nx.dev/docs/features/ci-features/affected)：借鉴把“受影响范围”作为显式输入的工程原则；本切片把已加载授权 scope 作为渲染和写回的硬门，不引入 Nx 或改变构建流程。
- 取舍：不把 `localShipments` 重命名成新的领域模型，也不引入全局状态框架；只复用 Phase96 的 scope key/marker，补一层最小的通用判断和回归测试。

## 实施

- 新增 `isWorkspaceScopeCurrent`、`writeIfWorkspaceScopeCurrent` 与 `resolveScopedWorkspaceRows`，所有 staff 页面消费统一读取 scope-gated `businessShipments` 和快照。
- App 的父级 setter、工作区刷新 writer、子页面回调和操作日志均在异步写回前比较发起 scope；旧请求、旧客服/财务回调、客户门户回调、AI、批量轨迹、通知、费用目录和详情缓存 fail-closed。
- `FinancePage`、`CustomerServicePage`、`CustomerPortal`、全局专线计数、待通知运单详情和批量轨迹导入均不再直接读取未标记的 `localShipments`；范围变化会同步卸载页面边界并清理旧弹窗、表单和派生状态。
- `OrdersPage` 的新建出货单仅在当前工作区快照 ready 时打开；发票/单件货物导出先生成 Blob，再在触发下载前校验范围。
- 服务端 `createPrincipalScopeFingerprint` 将当前 `customerId` 纳入已有 HMAC 范围摘要，客户 A→B 变更会形成新的客户端缓存边界；密钥不下发客户端。
- 保留工作区首次加载、登出和 scope 变化时的原有清空逻辑；不改变后端查询、权限判断、状态流转、金额、审计或持久化行为。

## 本地验证

- `npm run test:web:safe -- --run src/modules/appShell/workspaceScope.test.ts src/modules/appShell/workspaceRefresh.test.ts src/modules/appShell/workspaceRefresh.characterization.test.tsx src/modules/warehouse/WarehousePage.loading.test.tsx`：18/18 通过。
- `npm run test:api:safe -- --run src/modules/rbac.test.ts src/modules/auth.controller.test.ts src/modules/rbac.guard.test.ts`：22/22 通过。
- Shared/API/Web typecheck、`architecture:check:fast`（434 route contracts）和 `git diff --check` 通过。
- 独立高风险审查：未发现 P0/P1，表单、刷新失败快照可用性和三类文件下载的跨 scope 风险已关闭；P2 为未挂载 AntD Form 警告、缺少 App 级 A→B 组件 characterization、同 scope 不同请求代际陈旧响应，均不改变本轮安全结论。

## 发布边界

- 发布范围为 `web` + `api`：API HMAC 摘要和 Web scope fencing 均需部署；无 Prisma schema/migration 变化，不运行 `db-migrate`，不得写入 47 业务数据或系统数据。
- 发布前需从干净集成 worktree 捕获 47 baseline、仅纳入本分支白名单文件并通过 release lock；发布后核对 Web/API 镜像与源码 provenance、health、锁/recovery，并使用只读页面相关接口或容器内身份确认允许/拒绝路径。
- 浏览器视觉与真实角色切换仍由用户在 47 人工检查。
