# 系统岗位与权限写接口运行时输入保护

- 状态：`in_progress`
- 会话标题：`Sunny｜架构控制面快速落地｜07`
- 续接自：`docs/archive/dev-now/2026-08/warehouse-package-runtime-input-phase6-20260821.md`
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`用户持续目标；Phase6 完成重评`
- 会话 slug：`system-role-runtime-input-phase7-20260821`
- 分支：`codex/system-role-runtime-input-phase7-20260821`
- worktree：`/Users/j1ng/Tools/sunny-system-role-runtime-input-phase7-20260821`

## 用户可见目标

- 系统管理的岗位、权限、员工和站点界面、功能、路由、成功响应、权限结果及持久化行为不变；先让岗位与权限代表写接口不再依赖 TypeScript 假定请求体可信。

## 阶段完成重评

- 安全 / 数据正确性：全仓裸 `@Body()` 为 225；`SystemIdentityAdminController` 独占 13 条，岗位与权限写入能直接改变全系统授权边界，优先级最高。
- 高频业务流 / 前端数据流：`App.tsx` 3,521 行、`apiClient.ts` 2,426 行，route-owned 仍仅 pricing/settings；继续推广需保护全局刷新与 legacy 回退，当前不是最低风险快切片。
- 后端架构 / 效率：`PrismaRepository` 33,720 行、`DataController` 1,990 行/118 个裸 body；模块化仍是长期主线，但岗位/权限 Controller 已独立，先完成输入契约可用更小改动封住高风险边界。
- 结论：选择系统岗位/权限写输入，不批量处理员工、站点或其余 225 条。

## GitHub 借鉴边界

- NestJS 官方 `ValidationPipe` 在 handler 前校验/转换输入、默认 400 失败，并剥离 prototype-pollution 相关键。
- Sunny 继续复用 `RuntimeInputPipe` 和共享 runtime schema；不启用全局 transform/whitelist，不引入 class-validator，不改变现有 RBAC、岗位继承、数据范围或错误文案。

## 首批范围

- `POST /api/system/roles`
- `PUT /api/system/roles/:role`
- `PUT /api/system/roles/:role/enabled`
- `PUT /api/system/roles/:role/permissions`
- `PUT /api/system/roles/:role/permissions/copy`

## 允许修改

- `packages/shared/src/` 中直接相关的 system identity runtime schema 与测试
- `apps/api/src/modules/system/identity/system-identity-admin.controller.ts`
- 五条路由的迁移前/后 characterization、权限与架构门禁
- 本状态文件与 `.codex-state.md`

## 禁止范围

- 不改 UI、URL、HTTP 方法、权限码、岗位继承、数据范围、成功响应、状态、审计、Prisma schema/migrations 或生产业务数据。
- 不修改 Service/Repository 业务规则；不顺带迁移员工/站点八条输入；不批量提高架构基线。

## 验证计划

- 先冻结五条合法管理员路径、无权限 403、未登录 401、空 body、非对象、错误类型、未知字段和失败后权限/岗位无变化。
- 任何现有 500 -> 400、默认值或错误优先级变化先记录并请求授权；只有等价部分可直接接 schema。
- Shared schema 定向测试、身份/权限 E2E、API/Shared/Web typecheck、448 路由、架构/governance/context/security 与 `git diff --check`。
- 47 不创建或修改真实岗位；只做 401/403、可安全的畸形输入 400、源码/provenance/镜像/health/日志/锁/recovery 验收。

## 交接

- 阻塞：需要用户确认只针对畸形输入的错误契约修正；合法 UI 请求与业务流程不受影响。
- 迁移前证据：五条路由均保持未登录 401、财务岗位 403；管理员合法创建、修改、启停、保存权限、复制权限和未知字段忽略全部通过，最终岗位/权限状态可恢复。
- 已确认的既有危险行为：`label` 数字、`permissions` 数字、`sourceRoleKey` 数字分别触发未控制 500；根数组或空 body 可让启停接口以 200 把岗位停用，并可让权限保存接口以 200 清空权限；字符串 `enabled: "true"` 同样会以 200 把岗位停用。原始非法 JSON 已由 body parser 稳定拒绝为 400。
- 准确下一步：取得授权后把上述字段类型错误、根数组、缺少 `enabled/permissions` 和字符串布尔值统一改为稳定 400；保留合法字段、未知字段忽略、权限先行、成功响应、审计与持久化语义，再接共享 schema 和精确门禁。
