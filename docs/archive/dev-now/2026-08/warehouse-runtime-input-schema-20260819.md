# 底层优化第三阶段：仓库写接口运行时契约

- 状态：`complete`
- 会话标题：`Sunny｜底层架构优化｜03`
- 会话 slug：`warehouse-runtime-input-schema-20260819`
- 实施分支：`codex/runtime-input-schema-20260819`
- 发布分支：`codex/release/runtime-input-schema-20260819`
- 发布 worktree：`/Users/j1ng/Tools/sunny-release-runtime-input-schema-20260819`
- 起始提交：`e2aaf3b8c63491780b375e6452554cf2f1adac90`
- 最终提交：`40d5d89e534c5001f1614eb362b83451ead6fce8`
- 最终发布：`git-40d5d89e534c_web-f539642cf388_api-606c2c7e3574`
- 认领时间：`2026-08-19 Asia/Shanghai`

## 用户可观察目标

- `POST /api/warehouse/packages/:id/same-spec-replenish` 在进入 Service/Repository 前拒绝非法请求体，并继续接受当前 Web 使用的合法请求。
- 无登录仍先返回 401、无权限仍先返回 403；合法数量与请求标识继续进入既有权限、对象范围、状态、事务、幂等和审计链路。

## 固定样本与边界

- 合法样本：`{ supplementCount: 2, requestId: "phase3-request" }`；现有 in-memory E2E 继续完成补录并保留后续生命周期效果。
- 非法样本：缺失/布尔/非整数/越界 `supplementCount`，以及缺失、非字符串或超过 100 字符的 `requestId`，均为 400 且不进入 Repository。
- 47 只读探针：非法请求体对不存在包裹仍为 400；合法请求体对不存在包裹为 404；不创建或修改生产业务数据。
- 实际修改：Shared runtime schema 基础类型、仓库补录 schema 与测试、API Pipe 错误映射与测试、仓库包裹 Controller/E2E。
- 未修改：Prisma schema/migrations、Repository、Service、权限、状态机、幂等/审计、Web、其他写接口和生产业务数据。

## 当前证据

- 修改前 Controller 的 `@Body()` 仅使用由 Service 参数反推的 TypeScript 类型，运行时不会执行校验。
- 生产 Prisma adapter 会把 `supplementCount` 转为 Number、要求 1–500 整数，并 trim/校验 `requestId`；本轮把相同有效范围提前到 Controller 边界，并额外拒绝布尔值、数组和 null 等非数字输入。
- 项目已有窄 `RuntimeInputPipe`，本轮让它同时接受 Shared schema，并只把 `RuntimeInputValidationError` 映射为稳定的 Nest 400；既有 API parser 抛出的异常不变。

## 成熟参考与取舍

- [NestJS Pipes](https://docs.nestjs.com/pipes)：Pipe 在 Controller handler 前完成校验/转换，返回值作为 handler 的实际参数。Sunny 复用现有路由级 Pipe，保持 Guard 先于 Pipe 的 401/403 语义。
- [NestJS Validation](https://docs.nestjs.com/techniques/validation)：官方建议对所有外部输入做运行时校验，也明确 TypeScript interface 在运行时被擦除。Sunny 本切片不启用全局 `ValidationPipe`，避免一次改变数百条既有路由；不引入 decorator DTO 或新依赖，而是通过 `@siyuan/shared/warehouse-input` 暴露窄 schema。
- NestJS 为 MIT；仅借鉴边界和错误映射，不复制业务规则。

## 验收结果

- 本地：Shared schema 13/13、API Pipe 2/2、仓库生命周期 E2E 3/3；Shared/API typecheck 与 `git diff --check` 通过。
- 行为保护：E2E 证明未登录 401、无权限 403、非法输入 400、合法不存在样本 404，原合法补录及后续更新/备注/异常/拆分/手工收货链路继续通过。
- 47：布尔数量为 400“补录箱数必须为 1 至 500 的正整数”；缺失 requestId 为 400“页面已更新，请刷新后重新发起补录”；合法数字字符串与 requestId 对不存在包裹为 404“仓库包裹不存在”。固定目标审计计数为 0，未写生产业务数据。
- 47 安全：provenance `traceable`，Web/API 镜像及 API release ID 匹配；源码 543/543 一致，公网 health/Web 200，生产 CORS 仍默认拒绝不可信 Origin，锁 free、recovery clear，近 10 分钟无 fatal/unhandled/uncaught/panic。
- 非阻断旧债：全局 `architecture:check` 仍因当前 47 基线相对旧 architecture baseline 的既有路由/热点差异失败；本切片没有新增或删除路由、没有改变 permission metadata，定向 E2E 已覆盖目标路由。

## 阶段完成重评

- 安全/数据正确性：代表写接口已形成 Shared schema → API Pipe → Service/Repository 的可复用链路；同一包裹生命周期 Controller 仍有创建、手工收货、拆分、更新、备注、异常六条未接入写接口。
- 高频业务流与前端数据流：`App.tsx` 与总 `apiClient` 仍是高频维护热点，但本轮线上数据与 UI 无回归证据，优先级暂低于补齐同一安全边界。
- 后端架构与改造效率：领域 Controller/Service/Repository port 已存在，当前更高收益是补契约保护而不是继续拆文件。
- 结论：`继续`运行时契约，但仍按一条代表接口一个切片推进。下一切片优先手工收货的嵌套 `cartonSpecs`，先锁定当前有效输入、错误文案和客户范围，再接 Shared schema；不同时修改业务状态、权限或数据库。
