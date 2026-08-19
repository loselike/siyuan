# 底层优化第三阶段：仓库写接口运行时契约

- 状态：`in_progress`
- 会话标题：`Sunny｜底层架构优化｜03`
- 会话 slug：`warehouse-runtime-input-schema-20260819`
- 分支：`codex/runtime-input-schema-20260819`
- worktree：`/Users/j1ng/Tools/sunny-runtime-input-schema-20260819`
- 起始提交：`ca856881`
- 认领时间：`2026-08-19 Asia/Shanghai`

## 用户可观察目标

- `POST /api/warehouse/packages/:id/same-spec-replenish` 在进入 Service/Repository 前拒绝非法请求体，并继续接受当前 Web 使用的合法请求。
- 无登录仍先返回 401、无权限仍先返回 403；合法数量与请求标识继续进入既有权限、对象范围、状态、事务、幂等和审计链路。

## 固定样本与边界

- 合法样本：`{ supplementCount: 2, requestId: "phase3-request" }`；现有 in-memory E2E 继续完成补录并保留后续生命周期效果。
- 非法样本：缺失/布尔/非整数/越界 `supplementCount`，以及缺失、非字符串或超过 100 字符的 `requestId`，均为 400 且不进入 Repository。
- 47 只读探针：非法请求体对不存在包裹仍为 400；合法请求体对不存在包裹为 404；不创建或修改生产业务数据。
- 允许修改：`packages/shared/src/runtime-schema.ts`、`packages/shared/src/warehouse.ts`、Shared exports/tests、API `runtime-input.pipe.ts`、仓库包裹 Controller/E2E、本状态文件。
- 禁止修改：Prisma schema/migrations、Repository、Service、权限、状态机、幂等/审计、Web、其他写接口和生产业务数据。

## 当前证据

- 当前 Controller 的 `@Body()` 仅使用由 Service 参数反推的 TypeScript 类型，运行时不会执行校验。
- 生产 Prisma adapter 会把 `supplementCount` 转为 Number、要求 1–500 整数，并 trim/校验 `requestId`；输入无效时才在 Repository 内返回 400。
- 项目已有窄 `RuntimeInputPipe`，财务水单切片已证明可逐接口接入；当前 parser 仍依赖 Nest `BadRequestException`，尚未形成可由 Shared 和多端复用的运行时契约。

## 成熟参考与取舍

- [NestJS Pipes](https://docs.nestjs.com/pipes)：Pipe 在 Controller handler 前完成校验/转换，返回值作为 handler 的实际参数。Sunny 复用现有路由级 Pipe，保持 Guard 先于 Pipe 的 401/403 语义。
- [NestJS Validation](https://docs.nestjs.com/techniques/validation)：官方建议对所有外部输入做运行时校验，也明确 TypeScript interface 在运行时被擦除。Sunny 本切片不启用全局 `ValidationPipe`，避免一次改变数百条既有路由；不引入 decorator DTO 或新依赖，而是在 `@siyuan/shared/warehouse` 暴露一个窄 schema。
- NestJS 为 MIT；仅借鉴边界和错误映射，不复制业务规则。

## 验收

- Shared schema 单测覆盖合法转换、字段裁剪和所有非法分支。
- API Pipe 单测证明 Shared 校验错误稳定映射为既有 400 文案，其他异常不被吞掉。
- 仓库生命周期 E2E 同时覆盖 401、403、400、404 和合法补录效果。
- Shared/API typecheck、定向安全测试、`git diff --check`。
- 47 provenance/source-drift/health/锁正常；非法/合法不存在样本分别为 400/404，近端错误日志无新增异常。
