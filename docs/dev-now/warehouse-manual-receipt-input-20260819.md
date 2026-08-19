# 底层优化第四阶段：手工收货嵌套输入契约

- 状态：`in_progress`
- 会话标题：`Sunny｜底层架构优化｜04`
- 会话 slug：`warehouse-manual-receipt-input-20260819`
- 发布分支：`codex/release/manual-receipt-input-20260819`
- 发布 worktree：`/Users/j1ng/Tools/sunny-release-manual-receipt-input-20260819`
- 起始提交：`933fdfa8`
- 47 起始基线：`git-40d5d89e534c_web-f539642cf388_api-606c2c7e3574`
- 认领时间：`2026-08-19 Asia/Shanghai`

## 用户可观察目标

- `POST /api/warehouse/packages/manual-receipt` 在进入 Service/Repository 前安全解析顶层字段和嵌套 `cartonSpecs`，非法结构稳定返回 400，不再因 `null`、数组或错误字段类型触发 500。
- 无登录仍先返回 401、无权限仍先返回 403；合法请求继续进入既有客户范围、重复校验、事务、审计和 lineage 链路。

## 固定样本与边界

- 合法样本：客户 `9409`、两条箱规；继续接受当前 Web 数字值和历史数字字符串，并保持每条箱规一行、总件数求和的结果。
- 非法样本：非对象请求体、空箱规、非对象箱规、重量/长宽高非正数、件数非正整数，以及已声明字符串字段的非字符串值；均返回确定的 400 文案。
- 47 只读探针：未登录/无权限、非法请求体，以及语法合法但客户编号超过 8 位的请求；不使用会通过业务校验的生产写样本。
- 允许修改：`packages/shared/src/warehouse-input.ts` 及测试、仓库包裹生命周期 Controller/E2E、本状态文件。
- 禁止修改：Prisma schema/migrations、Repository、Service、权限、客户范围、状态机、重复/事务/审计/lineage 语义、Web 和生产业务数据。

## 当前事实基线

- Controller 当前仅用 TypeScript 参数类型接收请求体；interface 在运行时不存在。
- `buildWarehouseManualReceiptPackageInputs` 当前接受数字字符串，将重量/尺寸转为 Number，将件数 `Math.floor(Number(...))` 后校验；现有错误文案为“请至少填写一条箱规”“第 N 条箱规重量必须大于 0”“第 N 条箱规长宽高必须大于 0”“第 N 条箱规件数必须为正整数”。
- Service 先调用 `assertWarehouseManualReceiptCustomer`；Repository 继续负责权限、重复、事务、持久化、审计和 lineage。本切片只在 Guard 之后、Service 之前建立请求边界。
- 47 baseline receipt 已在干净独立 worktree 成功绑定，provenance 为 traceable，Web/API 镜像与 API release ID 匹配。

## 成熟参考与取舍

- [NestJS Pipes](https://docs.nestjs.com/pipes)：官方将 Pipe 定义为 Controller handler 前的转换/校验边界；Sunny 继续复用现有路由级 `RuntimeInputPipe`，保证 Guard 的 401/403 优先级。
- [NestJS Validation](https://docs.nestjs.com/techniques/validation)：官方说明外部输入需要运行时校验，且 TypeScript interface 在运行时会被擦除。Sunny 不启用全局 `ValidationPipe`，不在同一切片改变其他路由，也不引入 decorator DTO 或新依赖。
- NestJS 为 MIT；只借鉴边界设计，不复制业务规则。

## 验收计划

- Shared schema 定向测试覆盖合法规范化、未知字段剥离、嵌套逐行错误和错误类型。
- API E2E 覆盖 401、403、400；现有合法完整生命周期测试继续证明 201、持久化结果与审计动作不变。
- Shared/API typecheck、`git diff --check`；发布后用 47 容器内短期身份做无生产写入探针，并核对 provenance、源码、容器、health、日志、锁和 recovery。
