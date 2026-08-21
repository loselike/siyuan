# 运单发票模板继承可见范围

- 状态：`in_progress`
- 会话标题：`Sunny｜运单发票模板继承可见范围｜01`
- 续接自：无
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`无（当前会话明确请求）`
- 会话 slug：`shipment-invoice-download-inherits-access-20260821`
- 分支：`codex/shipment-invoice-download-inherits-access-20260821`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/shipment-invoice-download-inherits-access-20260821`
- 认领时间：`2026-08-21 Asia/Shanghai`

## 输入摘要

- 目标：业务员只要能在运单管理看到本人运单，就能下载该运单对应的代理发票模板，不再依赖上传发票权限或代理字段可见权限。
- 不做：不放宽运单数据范围，不改变模板适用状态、业务发票上传/下载权限，不修改数据库结构或模板维护流程。

## 允许修改

- `apps/api/src/modules/shipment/invoice/**`
- `apps/api/src/modules/global-field-mask.interceptor.ts`
- `apps/api/src/modules/shipment/overview/**`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `apps/web/src/App.tsx`
- `packages/shared/src/index.ts`
- `config/architecture/governance-baseline.json`
- 与本需求直接相关的定向测试和本状态文件

## 当前进度

- 模板下载入口已改为继承运单管理读取与既有销售数据范围，不再依赖 `business:order-entry:invoice-upload`。
- Prisma/InMemory 下载均复用本人/团队 `CUSTOMER_OR_ENTRY` 运单范围；无代理读取权限时模板列表仅返回 opaque id，多模板由前端显示“模板 N”。
- 上传业务发票及下载已上传业务发票仍保留原权限，不在本次变更范围。

## 验证

- API 定向 15/15：业务员本人允许、他人运单 404、客户/财务拒绝、上传仍拒绝、团队范围一致、代理/模板身份裁剪、下载审计留痕。
- Web 运单管理定向 6/6：无发票上传权限的业务员仍可点击本人运单“下载发票模板”。
- Shared/API/Web 类型检查通过；448 路由架构治理、无新增 lint 债务、Mojia 安全契约 3/3、`git diff --check` 通过。
- 独立权限风险审查完成，未发现剩余 P0/P1；团队读取扩展未进入任何单票写路径。

## 交接

- 阻塞：无
- 剩余风险：等待主干 CI/47 真实角色线上证据。
- 用户验收目标：业务员在运单管理自己的已排货及之后运单行中可直接看到并使用“下载发票模板”，无需单独分配上传发票权限。
- 效果证据：本地 API 生命周期及 Web 运单管理测试均通过。
- 安全证据：对象范围、团队范围、拒绝路径、模板名裁剪、上传权限隔离及审计断言通过。
- 未验证项：47 生产 API、容器、静态产物和日志待验证。
- 发布状态：`未发布`
- 稳定附件：用户截图位于会话附件。
- 准确下一步：完成独立复核后提交并走 PR/CI，合并 main 后按不可变 digest 发布 Web+API 到 47。
- 建议新标题：`Sunny｜运单发票模板继承可见范围｜02`
- 建议新状态文件：`docs/dev-now/shipment-invoice-download-inherits-access-20260821-02.md`
- 接手要求：状态改为 `handed_off` 后，新的唯一写会话才能继续。
