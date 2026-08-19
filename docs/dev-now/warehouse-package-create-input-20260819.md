# 底层优化第五阶段：仓库单箱创建输入契约

- 状态：`in_progress`
- 会话标题：`Sunny｜底层架构优化｜05`
- 会话 slug：`warehouse-package-create-input-20260819`
- 发布分支：`codex/release/warehouse-package-create-input-20260819`
- 发布 worktree：`/Users/j1ng/Tools/sunny-release-warehouse-package-create-input-20260819`
- 起始提交：`983f7cf13256965aa5615391da99ac4a4584e9df`
- 47 起始基线：`git-5aacdafb6e72_web-5ef59573c336_api-e31e9dc91dba`
- 认领时间：`2026-08-19 Asia/Shanghai`

## 用户可观察目标

- `POST /api/warehouse/packages` 在 Guard 后安全解析外部请求体，非对象、错误字符串/数值类型稳定返回 400，不再因 `.trim()` 或隐式 Number 转换异常产生 500。
- 当前数字字符串、缺失计数字段的默认值、计数取整/上下界、客户范围、201 返回、审计和 lineage 继续保持；墨家设备入口不经过该 Controller，不受本切片影响。

## 固定样本与边界

- 合法 characterization：客户 `9409`、数字字符串 `expectedTotalPackageCount="3.8"`、`packageIndex="9"`、缺失 `packageCount`、重量尺寸数字字符串；继续得到总箱数 3、箱序号 3、件数 1 和原测量结果。
- 默认 characterization：合法客户/快递单号，缺失计数和测量值时继续得到计数 1、测量 0；本切片不把既有零值行为改成业务校验。
- 非法样本：布尔/数组/对象数值字段、非数字字符串和非字符串文本字段，返回确定的 400。
- 47 无写入探针：未登录、错误类型、以及合法 schema 但客户编号超过 8 位；固定快递单号的包裹/审计增量必须为 0。无权限 403 由本地 E2E 覆盖，避免在线拒绝请求新增安全审计。
- 允许修改：`packages/shared/src/warehouse-input.ts` 及测试、仓库包裹生命周期 Controller/E2E、本状态文件。
- 禁止修改：Prisma schema/migrations、Repository、Service、权限/客户范围、状态机、持久化、审计/lineage、Web、墨家 Integration 和生产业务数据。

## 当前事实基线

- Controller 当前只有 TypeScript 参数类型；`WarehousePackageCreateInput` interface 运行时被擦除。
- Prisma/InMemory adapter 都会把总箱数、箱序号和件数转 Number、向下取整并至少归一为 1；箱序号还会限制到总箱数。重量和长宽高转 Number 后保留零值，Prisma 再按两位小数落库。
- Service 在 Repository 前执行 `assertWarehouseManualReceiptCustomer`；Repository 继续负责相同权限、客户范围、事务、设备幂等、持久化、审计和 lineage。
- 墨家新入口 `warehouse/integration/mojia-measurement.service.ts` 与 legacy `DataController` 都直接调用 Repository，并先构造强类型输入，因此 Controller 路由 schema 不会改变设备流。
- 47 baseline receipt 已在干净独立 worktree 绑定，provenance traceable，Web/API 镜像和 API release ID 匹配。

## 成熟参考与取舍

- [NestJS Pipes](https://docs.nestjs.com/pipes)：继续采用路由 handler 前的窄转换/校验边界。
- [NestJS Validation](https://docs.nestjs.com/techniques/validation)：外部输入需要运行时校验，TypeScript interface 不能提供运行时保护。
- Sunny 不启用全局 `ValidationPipe`，不引入 decorator DTO/新依赖，也不把墨家设备内部适配器改走 HTTP schema；NestJS 为 MIT，仅借鉴边界设计。

## 验收计划

- 先增加并运行合法数字字符串、默认/夹取行为 characterization，再接 Shared schema。
- Shared schema 定向测试覆盖规范化、默认值、未知字段剥离和错误类型；API E2E 覆盖 401/403/400，并继续运行原合法生命周期效果。
- Shared/API typecheck、`git diff --check`；发布后完成 47 无写入探针、provenance、源码、容器、health、日志、锁与 recovery 验证。
