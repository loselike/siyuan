# 底层优化第四阶段：手工收货嵌套输入契约

- 状态：`complete`
- 会话标题：`Sunny｜底层架构优化｜04`
- 会话 slug：`warehouse-manual-receipt-input-20260819`
- 发布分支：`codex/release/manual-receipt-input-20260819`
- 发布 worktree：`/Users/j1ng/Tools/sunny-release-manual-receipt-input-20260819`
- 起始提交：`933fdfa8`
- 运行时提交：`5aacdafb6e72d5d2f65d458defc300334779cf03`
- 47 起始基线：`git-40d5d89e534c_web-f539642cf388_api-606c2c7e3574`
- 47 最终发布：`git-5aacdafb6e72_web-5ef59573c336_api-e31e9dc91dba`
- 认领时间：`2026-08-19 Asia/Shanghai`

## 用户可观察目标

- `POST /api/warehouse/packages/manual-receipt` 在进入 Service/Repository 前安全解析顶层字段和嵌套 `cartonSpecs`，非法结构稳定返回 400，不再因 `null`、数组或错误字段类型触发 500。
- 无登录仍先返回 401、无权限仍先返回 403；合法请求继续进入既有客户范围、重复校验、事务、审计和 lineage 链路。

## 固定样本与边界

- 合法样本：客户 `9409`、两条箱规；继续接受当前 Web 数字值和历史数字字符串，并保持每条箱规一行、总件数求和的结果。
- 非法样本：非对象请求体、空箱规、非对象箱规、重量/长宽高非正数、件数非正整数，以及已声明字符串字段的非字符串值；均返回确定的 400 文案。
- 47 无写入探针：未登录、非法请求体，以及语法合法但客户编号超过 8 位的请求；无权限 403 由本地 E2E 覆盖，避免在线拒绝请求新增安全审计记录；不使用会通过业务校验的生产写样本。
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

## 实施结果

- `warehouseManualReceiptCreateInputSchema` 只返回声明字段；数字字符串规范化为 number，布尔、数组、null、非正数和非整数不会下沉到 Service/Repository。
- 顶层可选字符串统一做运行时类型检查，合法字符串保留原值，原有 trim、默认值、客户编号/快递单号限制继续由既有领域与 Repository 逻辑处理。
- 手工收货路由通过现有 `RuntimeInputPipe` 接入 Shared schema；Controller 路径、权限 metadata、Service、Repository、事务、审计和 lineage 未改。

## 验收结果

- 本地：Shared schema 35/35；API Pipe 与仓库生命周期 E2E 6/6；Shared/API typecheck、`git diff --check` 通过。
- 行为保护：E2E 证明未登录 401、无权限 403、非法嵌套输入 400、合法数字字符串继续通过 schema 并进入既有客户校验；原多箱规 201、总箱规/件数、全生命周期和审计动作继续通过。
- 47：未登录为 401“缺少登录凭证”；布尔重量为 400“第 1 条箱规重量必须大于 0”；空箱规为 400“请至少填写一条箱规”；合法数字字符串继续进入领域层并由超长客户编号返回 400“客户编号最长 8 位”。固定快递单号的包裹与审计增量均为 0，未写生产业务数据。
- 47 安全：发布范围 `web+api`、无 migration；provenance `traceable/ORIGIN_BRANCH`，Web/API 镜像及 API release ID 匹配；源码 543/543 一致，公网 API/Web health、容器启动通过，锁 free、recovery clear，近 10 分钟 critical 日志 0。
- 已知非阻断项：依赖审计仍报告本地 9 个、API production image 4 个既有漏洞；47 源码目录仍有 22 个被运行时清单排除的历史临时/AppleDouble 类文件，本轮未清理。

## 阶段完成重评

- 安全/数据正确性：本路由的嵌套输入边界已闭环；同一生命周期 Controller 仍有直接创建、拆票、更新、备注、异常五条 `@Body()` 路由未接运行时 schema，其中直接创建继续接收数值和字符串字段，风险最接近本轮。
- 高频业务流与前端数据流：`App.tsx` 3,491 行、总 `apiClient.ts` 2,617 行仍是维护热点；本轮 Web 生产构建和线上 health 无回归，当前没有用户可观察故障证据，立即转向会扩大行为保护面。
- 后端架构与改造效率：Prisma/InMemory Repository 仍分别 33,476/20,433 行，`DataController` 2,670 行；但手工收货已在独立 Warehouse Controller/Service/port 链路，继续拆文件对本轮安全收益有限。
- 参考复核：NestJS 官方 Pipe/Validation 继续支持“路由 handler 前做窄范围转换与校验”；Sunny 仍不采用全局 ValidationPipe，避免同时改变其他数百条路由。
- 结论：`继续`一条写接口一个切片。下一阶段优先 `POST /api/warehouse/packages` 的直接创建输入契约；先锁定当前数字字符串、默认值、客户范围和墨家设备旁路不经该 Controller 的事实，再接 schema，不同时修改 Repository 或 Web。
