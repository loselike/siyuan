# Sunny 深度重构 Phase 47

- 状态：`in_progress`
- 分支：`codex/sunny-refactor-phase47`
- 基线提交：`b87cf12`
- 47 基线：`git-28c0fccbd19a_web-79d1db7936c1_api-2faf02ea46af`
- 用户验收目标：每个切片后重新扫描并按收益、风险和行为保护重排，不沿单一路线机械推进；所有业务逻辑保持不变。

## 本轮重评

- 停止候选：标准 Web-only 发布改为 `docker compose up --no-deps web`。Docker Compose 官方生产指南与 `docker/compose`（Apache-2.0）推荐单服务重发使用 `--no-deps`；但 Sunny 当前把一个全局 `RELEASE_ID` 同时绑定 Web、API、不可变回执、运行镜像和 API health。只重建 Web 会造成 API release ID 与发布状态不一致，必须先重构服务级发布身份，当前收益不足以覆盖证据链风险，故不实施。
- 安全/正确性候选：密码已迁移为 scrypt 并兼容登录后升级；财务凭证下载已有鉴权路由；这两项旧扫描结论已失效，降级。JWT 即时撤销与全局运行时 DTO 会改变会话或非法输入行为，不属于行为保持型重构。
- 后端架构候选：`DataController` 2,377 行、Prisma/InMemory Repository 31,937/19,399 行，仍是最大结构债务；但单个只读边界切片的即时用户收益低于本轮线上已证实的重复请求。
- 选择候选：route-owned 页面周期性全局刷新。47 Web 日志证明系统管理进入时只加载自己的 roles/accounts/sites/departments，但停留 5 分钟后又请求 shipments、三类财务审核、客户账本、承运商任务和 master-data。

## 成熟参考与取舍

- TanStack Query：https://github.com/TanStack/query （MIT）。借鉴 server state 由消费方拥有、按 stale/focus 策略刷新，不由根组件无差别刷新所有领域数据；本轮不引入依赖、不替换现有 API client。
- React Router：https://github.com/remix-run/react-router （MIT）。借鉴路由作为数据加载边界；本轮不切换路由库，只复用 Sunny 已有 `workspaceRefreshPolicy`。
- Docker Compose：https://github.com/docker/compose （Apache-2.0）。仅用于发布方向审查，未复制代码；因 Sunny 发布身份模型差异，不采用单纯 `--no-deps` 改法。

## 固定样本与行为保护

- 固定样本：管理员停留在 `/app/settings` 超过 5 分钟并触发 focus/visibility 检查。系统管理页面自身请求和会话刷新保持，App 全局 shipments/finance/master-data 请求不增加。
- 反向样本：随后进入业务管理时仍立即执行一次 legacy 全局刷新；1 分钟内再次 focus 不重复刷新，5 分钟后 focus 仍刷新一次。
- 禁止：不改 API、权限、页面字段、操作、表单、5 分钟阈值、阻塞工作/未保存工作保护或任何业务数据内容。
