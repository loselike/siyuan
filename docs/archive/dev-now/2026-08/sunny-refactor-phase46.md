# Sunny 深度重构 Phase 46

- 状态：`completed`
- 分支：`codex/sunny-refactor-phase46`
- 基线提交：`fce8067`
- 47 基线：`git-67ed4db97995_web-09d4fa0bebb1_api-2faf02ea46af`
- 重评选择：前端路由数据所有权第二个样本——系统管理。该页面只接收 `apiClient`、权限和导航回调，账号、用户组、站点、部门、审计均由页面自行请求；但进入该路由仍触发 App 全局运单、财务、基础资料等请求。
- 竞争候选：JWT 撤销/运行时 DTO 校验会改变现有请求或会话行为，退出行为保持型重构；双 Repository 仍是最大结构债务，但单个等价切片的即时用户收益低于本轮请求削减。

## 成熟参考与取舍

- TanStack Query：https://github.com/TanStack/query 。借鉴 server state 按消费方拥有、缓存/同步/后台更新与页面解耦的原则；本轮不引入依赖、不一次性替换 Sunny 数据层。
- React Router：https://github.com/remix-run/react-router 。借鉴路由作为页面数据边界、可渐进采用的原则；本轮不替换既有手工 history 路由，避免同时改变导航与数据语义。
- 许可证：两者均为 MIT；本轮不复制源码。

## 固定样本与行为保护

- 固定样本：管理员从运营工作台进入“系统管理”。页面仍加载角色权限和员工账号，URL/菜单/页面内容不变；导航前后 `/api/shipments`、财务审核、`/api/master-data` 等全局请求计数不增加。
- 反向样本：紧接进入“业务管理”仍触发一次 legacy 全局刷新，证明只隔离系统管理，不扩大到未审计页面。
- 禁止：不改 API、权限、表单、账号状态、审计、页面 UI 或 5 分钟全局刷新行为。

## 当前进度

- 已完成代码/props/请求追踪与迁移前 characterization：进入系统管理时页面自身角色/账号请求与 App 全局运单/财务/基础资料请求同时增加。已将 `settings` 加入现有 route-owned 策略，未改页面或请求实现；待迁移后验证与 47 发布。

## 验证与审查

- 迁移前/后同一测试证明：系统管理的 `/api/system/roles`、`/api/system/staff-accounts` 页面请求继续发生；全局 `/api/shipments`、`/api/finance/business-cost-audits`、`/api/master-data` 从各新增 1 轮降为 0；紧接进入业务管理仍各新增 1 轮。
- Web 定向测试 6/6、Web typecheck、434 路由治理与 API 安全契约 3/3 通过。
- 对抗式审查：策略只影响用户导航触发的 15 秒全局刷新时钟；登录/session 初始化与既有 5 分钟 focus/visibility 刷新未改。系统管理无 App 业务数据 props，账号、角色、站点、部门、审计均由页面 API 自持；其他页面继续 legacy-global。
- 既有测试 runner 已自动追加单 worker/超时参数；首次人工重复传参被 Vitest 拒绝，改用安全 runner 唯一参数后通过，未修改测试脚本。

## 发布

- 标准 baseline 门拒绝了“实现后才捕获 receipt”的功能 worktree；未绕过。另建干净发布协调 worktree，从 `fce8067` 捕获线上 receipt，再 fast-forward 到 `28c0fcc` 后发布。
- 47 发布 `git-28c0fccbd19a_web-79d1db7936c1_api-2faf02ea46af`：Web 指纹 `79d1db7936c1...`，API/migration 指纹未变；provenance traceable、image/API release ID 全匹配、源码 488/488、API/Web 公网 200、锁 free、recovery clear。
- 既有 10 个 AppleDouble 元数据文件仍作为非运行时 stale artifact 告警保留；本轮未删除。
