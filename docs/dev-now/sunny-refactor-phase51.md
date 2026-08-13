# Sunny 深度重构 Phase 51

- 状态：`in_progress`
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
