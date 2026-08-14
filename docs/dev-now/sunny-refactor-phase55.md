# Sunny 深度重构 Phase 55

- 状态：`in_progress`
- 分支：`codex/sunny-refactor-phase55`
- 基线提交：`86ec0f4`
- 47 基线：`git-729a72a65dc2_web-1739a7265128_api-e2a4d26250b5`
- 用户验收目标：每个切片完成后重新审查并参考成熟 GitHub 项目；整个系统业务逻辑不得改变。

## 本轮重评

- 安全/正确性：最初的密码 SHA-256、匿名上传目录、登录限流已分别由 scrypt 自动升级、受保护下载 Controller、双维度限流解决；全局运行时 DTO 校验仍缺失，但直接补 ValidationPipe 会改变 204 条残留路由的拒绝语义，不适合作为行为保持重构。
- 前端数据流：`apiClient.ts` 2,567 行、约 365 个公开方法、42 个生产调用文件，已有 7 个领域子客户端，证明可渐进拆分。
- 后端架构：`DataController` 仍 2,382 行/204 条路由，Prisma/InMemory Repository 分别 31,997/19,416 行；风险和回归面高于一个前端边界切片。
- 选择：继续前端 API 边界，先迁移 auth/profile/table-preference 这一组公共会话能力；保留 `ApiClient` 旧方法作为委托 facade，所有调用方、路径、方法、body、401 和错误文案不变。
- 固定样本：验证码/登录保持匿名请求；当前会话、资料更新、改密和表格偏好保持鉴权请求；三条表格偏好路径与 key 编码不变。

## 成熟参考与取舍

- Medusa JS SDK：https://github.com/medusajs/medusa/tree/develop/packages/core/js-sdk （MIT）。借鉴一个共享 transport 统一注入认证头、响应解析和错误传播，领域 SDK 只声明路径；不引入 SDK、不改变 Sunny REST 契约。
- Vendure Dashboard：https://github.com/vendurehq/vendure/tree/master/packages/dashboard （GPL-3.0）。借鉴 dashboard 内聚的数据访问模块和 typed query/mutation 边界；不复制 GraphQL、缓存键或业务模型。
- TanStack Query：https://github.com/TanStack/query （MIT）。记录其缓存、取消和失效原则作为后续页面数据所有权目标；本切片不引入依赖，避免一次改变请求时序。

## 风险与行为保护

- 主要风险：匿名/鉴权标志丢失、401 回调次数变化、表格 key 未编码、请求 body 漂移。
- 保护方式：先新增子客户端请求契约测试，再由 facade 原方法逐一委托；不改任何调用方和 React 状态流。

## 本地验证

- `AuthAccountClient`、`ApiClient` transport facade、current-session refresh：9/9。
- Web typecheck：通过。
- `governance:check`：通过；434 条路由架构门与 API 安全契约 3/3。
- `git diff --check`：通过。
- 结果：`apiClient.ts` 从 2,567 行降至 2,566 行；新增 47 行领域客户端，9 个既有 facade 方法保留签名与调用位置不变。

## 发布后复审

- 状态：`completed`
- 提交：`96a01be61dfbec06d07e1293648a4a3e262f98e9`，已推送 `origin/codex/sunny-refactor-phase55`。
- 47 发布：`git-96a01be61dfb_web-7fd6e14600c5_api-e2a4d26250b5`；标准 Git bundle provenance 为 `traceable/ok`。
- 线上证据：源码 503/503 一致；Web/API image 与 API release ID 匹配；公网 Web/API health 200；锁 free、recovery clear；最近日志无新增 fatal/exception/panic（路由名中的 `exception` 为正常映射日志）。
- 副作用审查：路由、调用方、请求时序、鉴权头、匿名标志、401 回调和错误文案均保持；无 schema、权限、业务状态或数据写入变化。
- 发布观察：标准发布 scope 正确识别为 Web；Compose 因新 release ID 对 API 使用不可变同指纹镜像，先尝试拉取失败后由本地缓存重标并重建，最终 API 指纹保持 `e2a4d26250b5` 且验证通过。
- 新的最高优先级：转向后端 `DataController` 残留 204 路由或 Prisma/InMemory 巨型仓储，优先选择一组已有 characterization 的低风险查询/命令边界；不继续机械拆 `apiClient`。全局 ValidationPipe 继续作为独立产品行为变更候选，不纳入行为保持重构。
