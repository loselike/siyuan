# 底层优化第六阶段：仓库拆票输入契约

- 状态：`completed`
- 会话标题：`Sunny｜底层架构优化｜06`
- 会话 slug：`warehouse-package-split-input-20260819`
- 发布分支：`codex/release/warehouse-package-split-input-20260819`
- 发布 worktree：`/Users/j1ng/Tools/sunny-release-warehouse-package-split-input-20260819`
- 起始提交：`f34c58ad2563555aa0eea340b9f1c5af0f49d5be`
- 47 捕获基线：`whitelist-17d7eaae635abd674911af55`
- v3 冻结清单：`docs/release-manifests/47/20260819-111109-whitelist-17d7eaae635abd674911af55`
- 认领时间：`2026-08-19 Asia/Shanghai`

## 用户可观察目标

- `POST /api/warehouse/packages/:id/split` 在 Guard 后安全解析拆票请求体，非法顶层结构、逐票件数、拆分票数和备注类型稳定返回 400，不再下沉为隐式类型转换或 `.trim()` 异常。
- 当前数字字符串、非整数 `splitCount` 向下取整、非空 `pieces` 优先于 `splitCount`、仅传票数时每票默认 1 件、201 返回、权限/对象范围、状态、事务、审计和 lineage 保持不变。

## 固定样本与边界

- 合法 characterization A：原包裹 1 件，`pieces=["10", "20"]` 且 `splitCount="not-used"`；继续按 `pieces` 优先创建 10/20 两票，备注继续 trim，源票转为 `CONSOLIDATED`。
- 合法 characterization B：仅传 `splitCount="2.8"`；继续向下取整为 2，并创建两票、每票 1 件。
- 非法样本：顶层非对象、`pieces` 非数组或包含布尔/数组/对象/非数字/非正整数、缺失或错误 `splitCount`、非字符串备注，返回现有语义的稳定 400。
- 47 无写入探针：未登录、无权限由本地 E2E 覆盖；线上使用不存在包裹 ID 的非法 body 验证 400，使用合法数字字符串验证 404，目标包裹与拆票审计增量必须为 0。
- 允许修改：`packages/shared/src/warehouse-input.ts` 及测试、仓库包裹生命周期 Controller/E2E、本状态文件与本次 47 冻结清单。
- 禁止修改：Prisma schema/migrations、Repository、Service、权限/数据范围、拆票算法、状态机、事务、持久化、审计/lineage、Web 和生产业务数据。

## 当前事实基线

- Controller 当前仅用 TypeScript interface 接收拆票 body；interface 在运行时被擦除。Prisma adapter 在查包裹前读取 `input.pieces`，非对象可能触发 500；非字符串备注可能在事务内 `.trim()` 异常。
- 两套 Repository 都接受逐票件数数字字符串；非空 `pieces` 的长度决定拆票数并忽略 `splitCount`。未传逐票件数时，`splitCount` 经 `Number` 和 `Math.floor`，每票件数默认为 1。
- Prisma 继续负责客户锁、包裹行锁、根组合号 advisory lock、状态 CAS、子票事务写入和审计；Service/port 只是委托。本切片不移动或修改这些规则。
- 前端当前总是提交 number `pieces` 和可选字符串 remark；Shared schema 仍保留历史数字字符串兼容，不要求 Web 同步改动。
- 阶段开始时发现另一会话把 47 release state 推进为白名单版本，但 543/543 运行时源码与本分支逐字节一致、锁 free、recovery clear。标准 baseline 因 provenance fail-closed；已捕获并提交 v3 清单，最终发布须走 current-baseline cutover 并在锁内再次拒绝任何漂移。

## 成熟参考与取舍

- [NestJS Pipes](https://docs.nestjs.com/pipes)：Pipe 在 Controller handler 前转换/校验外部输入，异常时 handler 不执行；本阶段继续使用参数级 `RuntimeInputPipe`。
- [NestJS Validation](https://docs.nestjs.com/techniques/validation)：网络 payload 是无运行时类型信息的普通对象，可在校验边界转换并剥离未声明属性。
- Sunny 不启用全局 `ValidationPipe`、不引入 decorator DTO/新依赖，也不把拆票事务或业务状态校验搬进 schema；NestJS 为 MIT，仅借鉴边界设计。

## 完成结果

- Shared 新增 `warehousePackageSplitInputSchema`，Controller 在 Guard 后通过参数级 `RuntimeInputPipe` 解析拆票 body；未修改 Repository、Service、权限、状态机、事务、审计、lineage、Web 或数据库。
- 合法兼容契约保持：数字字符串、非空 `pieces` 优先、`splitCount="2.8"` 向下取整为 2、仅传票数时每票默认 1 件；未知字段被剥离。
- 非法顶层结构、逐票件数、拆分票数和备注类型在进入 handler 前返回 400；401/403/404、201、数据范围与拆票持久化行为由定向 E2E 保护。
- 提交：`a6306516d77d7d97c146f977037815af15622885`；分支已推送 `origin/codex/release/warehouse-package-split-input-20260819`。

## 验证证据

- 迁移前 characterization：数字字符串、`pieces` 优先与默认单票件数 `1/1` 通过。
- Shared schema 定向测试 `68/68` 通过；API 拆票生命周期与 RuntimeInputPipe 定向测试 `10/10` 通过；补充断言后的拆票生命周期 `8/8` 通过。
- Shared/API typecheck、`git diff --check` 通过。
- 两个历史宽 E2E 在改动前后均复现既有权限夹具漂移：仓库查询旧期望 403、实际 200；lineage 创建旧期望 201、实际 403。本阶段未借机改变权限语义。
- 47 current-baseline cutover 发布 `git-a6306516d77d_web-6950c236390f_api-5758ff610aef` 成功；当时 Git bundle provenance、镜像/state、API release ID、内外 health、日志、锁与 recovery 均通过。
- 47 无业务写入探针：未登录 401；三类非法 body 均 400；合法数字字符串 + 不存在包裹 404；包裹增量 0、`warehouse.package.split` 业务审计增量 0。四次鉴权后失败写请求按既有规则新增 4 条 `warehouse.request.write.failed` 请求失败审计。

## 并发发布说明

- 本阶段发布完成后，“权限3.0”会话于 `2026-08-19 19:23 Asia/Shanghai` 精确替换 3 个权限 Web 文件和 3 个权限 API 文件，并重新构建 API/Web；拆票源码仍保留在线，线上拆票探针已通过。
- 当前该会话仍在处理自己的发布状态，47 暂时出现 `running-image-does-not-match-release-state`。这不是拆票代码回归；为避免覆盖并发权限改动，本阶段不回滚、不收养、不重建其文件，后续发布须等待该会话形成新的稳定基线。

## 阶段重评

- 安全/数据正确性候选：`PATCH /api/warehouse/packages/:id` 仍直接接收 interface，字符串字段可触发 `.trim()` 异常，数值字段存在宽松隐式转换；风险和输入面最高。
- 高频业务流候选：备注、异常两个独立接口同样缺运行时校验，但只覆盖单一可选文本字段，收益低于完整包裹编辑。
- 后端架构候选：继续拆 Repository 或迁移更多路由；当前输入边界还有可直接触发 500 的确定缺口，架构拆分优先级下调。
- 决定：下一阶段继续仓库输入控制面，选择完整包裹编辑输入契约；仍只在 Controller/Shared schema 边界收口，不改变现有更新算法、权限、状态、事务和审计。
