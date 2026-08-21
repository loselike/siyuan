# 系统岗位与权限写接口运行时输入保护

- 状态：`completed`
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

## 阶段开始重评

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

- 授权：用户已明确授权把已确认的畸形岗位/权限请求改为稳定 400；合法 UI 请求与业务流程不受影响。
- 迁移前证据：五条路由均保持未登录 401、财务岗位 403；管理员合法创建、修改、启停、保存权限、复制权限和未知字段忽略全部通过，最终岗位/权限状态可恢复。
- 已确认的既有危险行为：`label` 数字、`permissions` 数字、`sourceRoleKey` 数字分别触发未控制 500；根数组或空 body 可让启停接口以 200 把岗位停用，并可让权限保存接口以 200 清空权限；字符串 `enabled: "true"` 同样会以 200 把岗位停用。原始非法 JSON 已由 body parser 稳定拒绝为 400。
- 调用方证据：仓内运行时调用均经过 Web 强类型 client/AntD 校验；启停传真布尔值，权限保存始终传数组，复制权限始终传经验证的来源岗位。未发现依赖空 body、字符串布尔值或数字权限的仓内调用方；第三方调用方在仓内无法证明。
- 已实施：五条路由接入共享 runtime schema，根数组、缺少必填字段、字符串布尔值和字段类型错误均稳定 400；合法数字/数字字符串排序、未知字段忽略、权限先行、成功响应、审计与持久化语义已由定向样本保护；裸 `@Body()` 门禁从 225 降至 220。
- 已验证：Shared schema 13/13，五路由 characterization 1/1，System Identity E2E/Controller/Service 7/7，Shared/API/Web typecheck、448 路由架构门禁、governance/context/security 定向门与 `git diff --check` 通过。
- 独立高风险审查：无 P0/P1；非阻断 P2 为仓外调用方无法证明是否依赖非契约 `null`。决策是保留 `description/site:null` 的清空语义，并将 `sortOrder/enabled/permissions:null` 作为用户已授权的非契约畸形输入稳定拒绝为 400；已补精确 schema 决策测试。
- Git/CI：功能 PR #25、并发 Web 修复 PR #26、cutover 清单 PR #27 均已合并；最终运行 commit 为 `8e496c2906ea9b44b69f33fd857c6edac5981961`，主干 CI run `32441987431` 通过。
- 47 发布：从 `whitelist-15f82718aa129e659251de53` 完成 `WHITELIST_CAS -> GIT_SOURCE_BUILD/GIT_BUNDLE/GHCR_DIGESTS` cutover，发布 ID 为 `git-8e496c2906ea_web-9207c71f39a1_api-fc6617486b48`；API/Web 使用不可变镜像重建，未运行 migration 或 seed，并保留并发 `OrderFeePanel.tsx` 修复。
- 47 效果证据：五条路由未登录均为 401；真实 `UG_FINANCE` 账号短期 JWT 均为 403；真实管理员短期 JWT 对五类畸形输入均为 400 且命中预期中文错误，全部在 Pipe 前失败，没有创建/修改岗位或权限数据。
- 47 安全证据：Shared、Controller 与并发 Web 修复源码 SHA 分别为 `642324db…174a6`、`b2aae499…dc9f`、`e93e07cf…446c2`；provenance traceable，Web/API image 与 API release ID 匹配，四容器运行，内外 health 通过，锁 free、recovery clear、韧性服务正常；验收后 2 分钟 API/Web 新增错误为 0。

## 阶段完成重评

- 安全 / 数据正确性：裸 `@Body()` 已降至 220，System Identity 仍有站点/员工 8 条；仍值得做，但继续前要先冻结 `null`、空 body、字符串布尔值与对象归属的现有语义。
- 高频业务流 / 前端数据流：本次真实 cutover 观察到旧页面动态加载已删除 `FinancePage` chunk，以及 API 重启窗口的 Nginx upstream refused；当前健康已恢复，但活跃用户在发布瞬间会看到失败，证据强于继续凭数量清理输入债务。
- 后端架构 / 改造效率：`DataController` 1,990 行/180 路由、`PrismaRepository` 33,720 行仍是长期债务；单次拆分收益低于修复已发生的发布可用性问题，且行为保护成本更高。
- GitHub 借鉴：Vite 官方 build 文档明确把新发布删除旧 chunk 作为 `vite:preloadError` 场景，并建议在 HTML `no-cache` 前提下处理该事件；Sunny 只借鉴“识别旧 chunk 并安全刷新/保留旧静态资产”的原则，不引入新前端框架，也不改变页面与业务流。
- 结论：下一切片转向发布期间静态 chunk 兼容与 API 切换可用性；代表样本为“用户停留在财务录单页，发布后再进入懒加载财务页面”，验收为不再出现动态 import 崩溃且 API 切换窗口不向活跃页面暴露连接拒绝。System Identity 剩余 8 条降为其后安全切片。
