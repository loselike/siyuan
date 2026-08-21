# 仓库包裹写接口运行时输入保护

- 状态：`complete`
- 会话标题：`Sunny｜架构控制面快速落地｜06`
- 续接自：`docs/archive/dev-now/2026-08/role-permission-reader-phase5-20260821.md`
- 上下文状态：`yellow`（第 3 次压缩后结束本阶段原子发布动作，不在本会话扩大下一切片）
- 已观察压缩：`3`
- 输入来源：`用户于 2026-08-21 明确授权畸形输入 500 -> 400`
- 会话 slug：`warehouse-package-runtime-input-phase6-20260821`
- 分支：`codex/warehouse-package-runtime-input-phase6-20260821`
- worktree：`/Users/j1ng/Tools/sunny-warehouse-package-runtime-input-phase6-20260821`
- 认领时间：`2026-08-21 Asia/Shanghai`

## 用户可见目标

- 仓库包裹编辑、备注、异常和删除功能、界面、权限、成功结果及既有错误语义不变；服务端不再依赖 TypeScript 假定请求体可信。

## 阶段选型

- 安全 / 数据正确性：精确裸 `@Body()` 仍为 230；仓库包裹 schema 模块已覆盖创建、手工收货、同规格补录和拆分，但同一生命周期的编辑/备注/异常以及两个删除入口仍为裸输入，边界清楚且已有 E2E/Service/Prisma/InMemory 行为可保护。
- 高频业务流 / 前端数据流：`App.tsx` 仍为 3,521 行且 route-owned 仅 pricing/settings；继续推广需要逐页证明缓存、新鲜度和 legacy 回退，当前风险高于完成同一仓库输入边界。
- 后端架构 / 效率：`PrismaRepository` 约 33.7K 行、`DataController` 1,990 行；继续拆新领域仍有价值，但刚完成运单查询与权限控制面，连续沿同一方向的边际收益低于修补运行时输入缺口。
- 结论：`转向`安全/数据正确性，先完成仓库包裹 5 条代表写接口，不做全局 230 条批量迁移。
- 价值：复用已有 `@siyuan/shared/warehouse-input` 与 `RuntimeInputPipe`，让同一包裹生命周期的请求体在 Controller 边界有真实运行时契约，裸输入从 230 降至 225。
- 风险：数字/字符串兼容、空值默认、未知字段、既有 400 文案、权限先后顺序和更新/删除持久化结果任一变化都会影响仓库高频操作。
- 行为保护：先用固定样本记录合法与非法输入的当前状态码、消息和 Repository 入参；schema 只做等价解析，不启用全局 transform/whitelist，不改变 Service/Repository、权限码或响应。
- 固定样本：一个本地在仓包裹；分别验证编辑、备注、异常和两类删除的允许路径、无权限拒绝、非法数字/数组/字符串、未知字段以及失败后无持久化副作用。

## 阶段完成重评

- 安全 / 数据正确性：本阶段把裸 `@Body()` 从 230 降至 225；余量中 `SystemIdentityAdminController` 仍有 13 条裸写输入，直接覆盖岗位、权限、员工和站点，是当前独立 Controller 中风险最高且边界最清楚的一组。
- 高频业务流 / 前端数据流：`App.tsx` 仍为 3,521 行、`apiClient.ts` 为 2,426 行，route-owned 仍只覆盖 pricing/settings；继续迁移页面需要保护全局新鲜度、legacy 返回刷新和错误回退，当前验证成本明显高于输入控制面。
- 后端架构 / 效率：`PrismaRepository` 33,720 行、`DataController` 1,990 行且其中 118 个裸 `@Body()`；继续拆总 Controller 价值高，但一次代表路由迁移的收益低于先封住身份/权限写入口的畸形输入。
- 结论：下一阶段继续安全/契约控制面，但转向 `SystemIdentityAdminController`；先冻结岗位与权限写接口的合法/非法行为，再接共享运行时 schema，不批量迁移全部 13 条，更不触碰权限模型。
- GitHub 依据：NestJS 官方 `ValidationPipe` 源码在 handler 前转换/校验输入、默认以 400 失败，并显式清除 prototype-pollution 相关键；Sunny 继续复用现有 `RuntimeInputPipe` 和共享 schema，只借鉴边界与失败关闭原则，不引入全局 transform/class-validator。

## GitHub 借鉴边界

- NestJS 官方 `ValidationPipe` 把校验置于参数进入 handler 前，并允许自定义 exception factory；Medusa 官方 API 约定 schema 与 HTTP 类型一致并从 validated body/query 取值。
- Sunny 只采用“Controller 边界运行时校验”和“schema/类型同源”原则；继续使用现有轻量 `RuntimeInputPipe`，不引入 class-validator、Zod、全局转换、全局白名单或 Medusa 路由体系。

## 允许修改

- `packages/shared/src/warehouse-input.ts`
- `packages/shared/src/warehouse.test.ts` 或直接相关 schema 测试
- `apps/api/src/modules/warehouse/package/warehouse-package-lifecycle.controller.ts`
- `apps/api/src/modules/warehouse/inventory/warehouse-inventory-query.controller.ts`
- 直接相关的定向 characterization/E2E/架构门禁
- 本状态文件与 `.codex-state.md`

## 禁止范围

- 不改 UI、路由、HTTP 方法、权限码、数据范围、成功响应、状态流转、审计、Prisma schema/migrations 或生产数据。
- 不修改 Service/Repository 业务逻辑；发现既有错误只能记录并另立 bug，不在重构切片修正。

## 当前进度

- 已完成阶段重评并选定 5 条仓库包裹写接口；已检查 NestJS/Medusa 官方输入校验边界，尚未开始运行时代码修改。
- 已从最新 `main@59f5d13d` 创建独立 worktree，开始补迁移前非法输入 characterization。
- 迁移前 characterization 已通过 3/3：五条接口均先执行鉴权/权限（未登录 401、客户角色 403）；数字型 `customerCode`、`remark`、`manualException` 和两个删除入口的字符串型 `ids` 当前都会在 Repository 抛出 `TypeError` 并返回 500；空 `ids`、空删除原因和超长删除原因分别保持既有精确 400 文案；所有失败请求后固定包裹未发生持久化变化。
- 两个删除入口的合法管理员路径已冻结：均返回既有 201 与 `{ deletedIds, deletedCount }`，随后列表中对应包裹不存在；原有生命周期 E2E 已覆盖编辑、备注、异常的合法响应、持久化与审计。
- 迁移前确认标准 `RuntimeInputSchema` 会把上述四类畸形请求从非受控 500 改为稳定 400；该可观察错误契约变化已单独暂停并取得用户明确授权。
- 用户已明确授权错误契约优化；现已在 Shared 增加编辑、备注、异常、删除四类 schema，并接入五条 Controller 路由。合法数字/数字字符串的既有转换、空值/未知字段、删除业务校验文案和路由级鉴权均保留；非对象请求体、错误字段类型、`NaN` 与无限数值改为稳定 400。
- 独立风险审查发现数值字段曾继续接受布尔/数组/对象并可能静默改写重量尺寸（P1），已修复为仅接受有限 number、有限数字字符串及明确保留的 null/空字符串旧语义，并补 HTTP 失败后不落库证据。审查 P2 确认：畸形 body 会在路由 Guard 后、Repository 对象权限/存在性检查前统一返回 400；合法请求的 403/404 与权限不变，主线程接受这一已授权错误契约结果。裸计数门禁不足以绑定指定 schema 的 P2 也已通过五条精确 AST 断言关闭。
- 当前本地证据：Shared schema 15/15、迁移后固定样本 4/4、既有生命周期 E2E 2/2、安全契约 3/3、Shared/API/Web typecheck、448 路由、18 类架构自测、完整治理与 `git diff --check` 均通过；裸 `@Body()` 从 230 降为 225。
- PR #23 已合并为 `3d813679453a2597843f6b7ece763921ba40f515`；主干 CI、API/Web/migrate 镜像和 release manifest 全部通过。

## 验证计划

- 迁移前后固定样本 characterization；Shared schema 定向测试；仓库包裹 Service/E2E；Shared/API typecheck；448 路由、治理、上下文、安全门禁与 `git diff --check`。
- 47 不写真实仓库数据：验证五条未登录 401、无权限 403、源码/provenance/镜像/health/日志/锁/recovery；合法写路径由本地固定样本证明。

## 交接

- 阻塞：无；用户已授权畸形输入错误契约优化。
- 发布状态：`已发布：git-3d813679453a_web-3c01740cc54b_api-2c60cb0792e8`
- 47 验收：五条未登录均 401；管理员畸形输入均为精确 400/既定文案；财务岗位无权限请求为 403；没有使用真实包裹、没有落仓库业务数据。四个候选源码 checksum 一致，公网 API/Web、容器、provenance、镜像/state、最近日志、发布锁、recovery 与运行时韧性均正常。
- 剩余风险：Pipe 在 Guard 后、Repository 对象归属/存在性检查前运行，因此畸形 body 对“有路由权限但无对象权限”的请求优先返回 400；这是用户已授权的畸形输入契约变化，合法请求的 403/404 不变。生产没有启用客户账号，拒绝探针改用无仓库写权限的财务岗位。
- 准确下一步：由新阶段先冻结岗位创建/修改、启停、权限保存/复制的合法成功、无权限和畸形输入行为；若任何 500 -> 400、默认值或未知字段行为变化，继续单独请求授权后才接 schema。
