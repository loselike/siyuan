# Sunny 深度重构 Phase 51

- 状态：`complete`
- 分支：`codex/sunny-refactor-phase51`
- 基线提交：`af9d8f5`
- 用户验收目标：每个切片完成后重新审查、参考成熟 GitHub 项目，并保持整个系统业务逻辑不变。

## 本轮重评

- 选择：冻结 JWT/RBAC 当前真实行为，提取可测试的 session validation boundary；不启用即时撤销、不改变 8 小时有效期。
- 固定样本：有效 token 继续允许；缺失、伪造、过期 token 继续 401；强制改密账号除现有 bootstrap 路径外继续 403；角色权限仍以数据库当前权限为准。
- 禁止：不改 token payload、数据库结构、账号状态口径、角色/权限语义、站点/租户/对象范围或前端 session 存储。

## 成熟参考与取舍

- Keycloak：https://github.com/keycloak/keycloak （Apache-2.0）。借鉴服务端会话/账号状态是独立决策点；不引入其会话数据库或协议栈。
- Cerbos：https://github.com/cerbos/cerbos （Apache-2.0）。借鉴认证与授权决策分层、后端统一 decision point；不复制策略语法或替换 Sunny RBAC。
- 本阶段只建立边界和 characterization，保持 Sunny 现状；任何即时撤销或 token version 都属于行为增强，必须退出等价重构单独实施。

## 完成结果

- 新增 `AuthSessionService` 与最小 repository port，把 Guard 对“数据库当前账号/角色/权限”的 hydration 和拒绝审计从巨型 Repository 依赖中隔离；Guard 的 JWT 验签、异常映射、强制改密与权限判断顺序未变。
- 新增 7 条定向测试：有效 token 使用数据库当前账号/权限，缺失/伪造/过期 token 为 401，停用账号仍映射为既有 401，强制改密仅放行原 bootstrap 路径，权限拒绝与审计保持不变，service 原样透传 principal mutation、权限和异常。
- API typecheck、434 路由治理、lint no-new-debt、安全契约 3/3、`git diff --check` 通过。
- 已发布 47：`git-7e1e38a21980_web-fa6197b29198_api-488505214fcf`。仅 API 重建，Web 保持上一镜像；Git bundle provenance、API release ID/image/state 一致，公网 health/Web 200，最近 API 日志无新增关键错误，锁 free、recovery clear。

## 切片后重审与重新排序

- 重新审查纠正了旧判断：Guard 本来就在每次受保护请求调用 `hydratePrincipalDepartmentScope`，因此账号停用、角色停用、角色/权限/站点/归属变化已经即时生效；并不存在“停用账号仍可使用 8 小时”的当前漏洞。本轮将这项事实固定为边界与测试，避免以后误建重复会话系统。
- 真实剩余缺口只限“改密后旧 token 仍有效”和没有用户主动登出撤销；其风险低于此前估计，且启用 token version 会改变会话语义，不再列为下一最高优先级。
- 当前重新排序后的最高价值问题是 API 缺少统一运行时输入契约：TypeScript body/query 类型不会在运行时校验，434 条路由主要依赖各 Repository 零散处理。下一阶段应先选一个低风险、无财务/状态写入的代表接口，记录当前有效输入响应，并参考 NestJS ValidationPipe/Medusa runtime schema 建立可逐路由迁移的 DTO parser；不得全局一次开启或改变有效业务请求。
