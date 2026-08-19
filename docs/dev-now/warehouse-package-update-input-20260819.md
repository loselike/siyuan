# 底层优化第七阶段：仓库包裹编辑输入契约

- 状态：`in_progress`
- 会话标题：`Sunny｜底层架构优化｜07`
- 会话 slug：`warehouse-package-update-input-20260819`
- 分支：`codex/release/warehouse-package-update-input-20260819`
- worktree：`/Users/j1ng/Tools/sunny-release-warehouse-package-update-input-20260819`
- 起始提交：`488e9fd1`
- 认领时间：`2026-08-19 Asia/Shanghai`

## 用户可观察目标

- `PATCH /api/warehouse/packages/:id` 在鉴权与 RBAC 通过后、进入 Repository 前解析请求体；非法顶层结构、文本、数量、重量和长宽高类型稳定返回 400，不再下沉为 `.trim()` 异常或隐式布尔/对象转换。
- 保持当前数字字符串、数量向下取整/最小值 1、`packageIndex` 由 Repository 按现有总箱数封顶、空白/`null` 数值默认、测量值与备注 trim、扫描时间语义、200 响应、权限/数据范围、状态、事务、并发校验、审计和 lineage 不变。

## 固定样本与边界

- characterization：创建一个未录单在仓包裹，再以数字字符串更新 `expectedTotalPackageCount="3.8"`、`packageIndex="9"`、`packageCount="2.8"`、`weightKg="12.345"`、尺寸字符串、带空格备注；继续得到总箱数 3、箱序号 3、件数 2、重量 12.35 和 trim 后备注。
- 默认样本：显式 `null`/空白数量继续归一为 1，显式 `null`/空白测量值继续归一为 0；未声明字段继续保留原值。
- 非法样本：顶层 `null`/数组、文本字段为非字符串、数值字段为布尔/数组/对象/非有限字符串，均在 Repository 查找前返回稳定 400。
- 47 只做无写入探针：未登录/无权限由本地 E2E 覆盖；线上对不存在包裹 ID 分别发送非法 body 验证 400、合法 numeric-string body 验证 404，并核对包裹与 `warehouse.package.update` 业务审计增量为 0。
- 允许修改：`packages/shared/src/warehouse-input.ts` 及测试、仓库包裹生命周期 Controller/E2E、本状态文件和必要的本阶段发布清单。
- 禁止修改：Shared 业务 DTO、Repository、Service、Prisma schema/migrations、权限/数据范围、包裹更新算法、状态机、事务、并发校验、审计/lineage、Web 和生产业务数据。

## 当前事实基线

- Controller 仅用 TypeScript interface 接收 body；interface 运行时擦除。两个 Repository 都会直接对多个文本字段 `.trim()`，非字符串可能触发 500。
- 数量字段使用 `Math.max(1, Math.floor(Number(value) || 1))`；测量字段使用 `roundMoney(Number(value) || 0)`。数字字符串受支持，数量小数向下取整，非法布尔/对象也可能被隐式接受或回退。
- Prisma 继续负责对象范围、状态、pending tally、客户锁、包裹行锁、`updatedAt` 并发校验、事务、审计与 lineage；本阶段不移动这些规则。
- 阶段开始时“权限3.0”会话正在 47 重建并收口自己的 API/Web 发布，当前 runtime/state provenance mismatch；本阶段在独立 worktree 本地实施，不触碰 47，等待该会话形成稳定基线后才允许进入发布队列。

## 成熟参考与取舍

- [NestJS Pipes](https://docs.nestjs.com/pipes)：参数级 pipe 在 Controller handler 前执行转换/校验，异常阻止 handler；沿用现有 `RuntimeInputPipe`。
- [NestJS Validation](https://docs.nestjs.com/techniques/validation)：网络 payload 不能依赖 TypeScript interface 提供运行时边界；输入转换应只输出声明字段。
- Sunny 不启用全局 `ValidationPipe`、不引入 decorator DTO/新依赖，不把数据库状态、对象范围或更新规则搬进 schema；NestJS 为 MIT，仅借鉴输入边界设计。

## 验收计划

- 接 schema 前先运行合法 numeric-string/default characterization；再新增 Shared schema 和非法输入测试。
- API E2E 覆盖 401/403/400、合法不存在 404，并保留完整包裹生命周期更新效果；Shared/API typecheck、`git diff --check`。
- 发布前重新取得稳定 47 baseline receipt；若并发发布仍未完成则保持队列等待，不覆盖远端。发布后执行无写入 API、源码、镜像/state、provenance、health、日志、锁与 recovery 验证。

## 当前进度

- 已先完成迁移前 characterization：合法 numeric-string、数量 flooring/clamping、显式 `null`/空白数值默认和 `scanTime=null` 既有行为 `1/1` 通过。
- 已新增 `warehousePackageUpdateInputSchema` 并接入更新路由的 `RuntimeInputPipe`；只输出声明字段，保留合法旧转换，将非法顶层/字段类型收口为 400。
- Shared schema 定向测试 `88/88` 通过；API 生命周期 + RuntimeInputPipe 定向测试 `12/12` 通过；最新 characterization `1/1` 复验通过。
- Shared/API typecheck、`git diff --check` 通过。首次 API typecheck 因新 worktree 尚未生成 Prisma Client 产生全局类型噪声；执行本地 `prisma generate` 后为 0，未修改 schema/migrations。
- 安全复核：Guard 仍先于参数 pipe；schema 不处理权限、对象范围、状态、事务、并发、审计或 lineage；Repository/Service/Web/数据库无改动。
- 发布阻塞：47 当前由活跃的“权限3.0”会话占用，其运行镜像与 release state 暂不一致。为避免覆盖该会话 6 个权限文件和后续代理变更，本阶段未执行任何远端同步、构建、重启或状态收养。
