# 底层优化第五阶段：仓库单箱创建输入契约

- 状态：`complete`
- 会话标题：`Sunny｜底层架构优化｜05`
- 会话 slug：`warehouse-package-create-input-20260819`
- 发布分支：`codex/release/warehouse-package-create-input-20260819`
- 发布 worktree：`/Users/j1ng/Tools/sunny-release-warehouse-package-create-input-20260819`
- 起始提交：`983f7cf13256965aa5615391da99ac4a4584e9df`
- 运行时提交：`3e0d3d9b4a2403cf443e78ed45aa5213ecc7fe3b`
- 47 起始基线：`git-5aacdafb6e72_web-5ef59573c336_api-e31e9dc91dba`
- 47 最终发布：`git-3e0d3d9b4a24_web-68924b4a8ce3_api-b582bffc3e47`
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

## 实施结果

- 新增 `warehousePackageCreateInputSchema`：只返回已声明字段；计数和测量继续接受有限数字与数字字符串，计数继续向下取整、至少为 1，箱序号继续限制到总箱数；缺失计数继续默认为 1，缺失测量继续默认为 0。
- 布尔、数组、对象和非数字字符串不再下沉到 Service/Repository，而是按字段返回稳定 400；已声明文本字段拒绝非字符串值，未知字段被剥离。
- `POST /api/warehouse/packages` 在既有 Guard 后通过复用的 `RuntimeInputPipe` 接入 Shared schema；Controller 路径、权限 metadata、Service、Repository、事务、客户范围、审计和 lineage 未改，墨家设备入口仍直接调用 Repository。

## 验收结果

- 修改前 characterization 连续两次通过，证明数字字符串、缺失默认和夹取行为来自既有运行链路；修改后 Shared schema 48/48，API Pipe/生命周期 E2E 8/8，墨家设备固定样本 1/1。
- Shared/API typecheck 与 `git diff --check` 通过；API E2E 证明 401、403、400、合法数字字符串、默认值、Repository 两位小数落库、201 生命周期和审计链路未回归。
- 47：未登录为 401“缺少登录凭证”；布尔重量为 400“重量格式不正确”；非数字总箱数为 400“预计总箱数格式不正确”；合法数字字符串继续进入领域层并由超长客户编号返回 400“客户编号最长 8 位”。固定快递单号的包裹与审计增量均为 0，未写生产业务数据。
- 47 安全：发布范围 `web+api`、无 migration；provenance `traceable/ORIGIN_BRANCH`，Web/API 镜像及 API release ID 匹配；源码 543/543 一致，公网 API/Web health 与容器启动通过，锁 free、recovery clear，近 10 分钟 critical 日志 0。
- 已知非阻断项：依赖审计仍报告本地 9 个、API production image 4 个既有漏洞；47 源码目录仍有 22 个被运行时清单排除的历史临时/AppleDouble 类文件，共 3,586 bytes，本轮未清理。

## 阶段完成重评

- 安全/数据正确性：直接创建输入边界已闭环；同一生命周期 Controller 还剩拆票、更新、备注、异常四条裸 `@Body()`。其中拆票会读取 `pieces` 数组、把元素与 `splitCount` 隐式转 Number，并触发包裹状态变更、事务、审计和 lineage；错误对象或 `null` 仍可能在进入领域保护前产生不稳定异常。
- 高频业务流与前端数据流：`App.tsx` 3,491 行、总 `apiClient.ts` 2,617 行仍是维护热点；本轮 Web 生产构建和线上 health 没有新的可观察故障证据，转向前端会扩大行为保护面。
- 后端架构与改造效率：Prisma/InMemory Repository 仍分别 33,476/20,433 行，`DataController` 2,670 行；当前独立 Package Controller/Service/port 已可承载后续契约切片，继续拆巨型 Repository 的即时安全收益较低。
- 参考复核：NestJS Pipe/Validation 官方设计继续支持在 Controller handler 前做窄范围运行时转换与校验；Sunny 仍不采用全局 `ValidationPipe`，避免同时改变数百条路由，也不复制外部业务规则。
- 结论：`继续`同一安全边界，但下一阶段切换到 `POST /api/warehouse/packages/:id/split`。先锁定数字字符串、`pieces` 优先于 `splitCount`、默认每票 1 件、权限/对象范围、状态、事务和审计的现状，再只接入 Shared schema；不同时修改拆票算法、状态机、Repository 或 Web。
