# Sunny 深度重构 Phase 64

- 状态：`completed`
- 分支：`codex/sunny-refactor-phase56`
- 基线提交：`2588e33`
- 47 基线：`git-eb8a3a59cfa9_web-42257849cc56_api-5e1c513e1d3d`
- 用户验收目标：每个切片后重新审查和排序；整个系统业务逻辑不得改变。

## 本轮重评与选择

- 安全/数据正确性：首次登录强制改密属于认证门禁，`App` 当前仍直接承载其完整 JSX，但 API、错误、loading、session 合并与工作区刷新边界已经清楚。
- 高频业务流/前端数据流：`App.tsx` 经 Phase63 已降至 3,278 行；强制改密 Modal 是下一个完整、低 props 扇入且高行为价值的可见边界。
- 后端架构：两个巨型 Repository 仍是长期债务，但本轮未发现比认证门禁边界更小且保护证据同等充足的后端候选。
- UI：`MiscFeesPage.tsx` 4,042 行且涉及财务状态，缺少足够页面保护；不在本轮冒险迁移。
- 选择：继续 App 壳层方向，但切换到首次登录强制改密 Modal；只移动 JSX，不移动认证或 session 副作用。
- 固定样本：首次登录用户看到不可关闭的改密对话框、警告和三项密码字段；提交匹配的新密码仍调用原处理器，错误与 loading 原样显示。

## 成熟参考与取舍

- [Keycloak UpdatePassword required action](https://github.com/keycloak/keycloak/blob/master/services/src/main/java/org/keycloak/authentication/requiredactions/UpdatePassword.java) 与 [登录表单 required-action 映射](https://github.com/keycloak/keycloak/blob/main/services/src/main/java/org/keycloak/forms/login/freemarker/FreeMarkerLoginFormsProvider.java)（Apache-2.0）：借鉴“UPDATE_PASSWORD 是登录流程中的阻断 required action，完成前不能把它当普通设置页”的边界；不复制 Keycloak 状态机、模板或认证协议。
- 延续 Phase63 的 Vendure owner/controlled-view 原则：`App` 保留所有 API、session 和刷新副作用，新组件只拥有可见表单契约。
- Sunny 取舍：保留当前 560px、无关闭/遮罩/键盘退出、无 footer、现有密码规则、错误提示和提交文案；不改变当前工作区请求时序。

## 风险与保护

- 必须保持 `closable=false`、`maskClosable=false`、`keyboard=false`、`destroyOnHidden`、`footer=null`，避免首次登录门禁可绕过。
- 不移动 `submitForcedPasswordChange`，不改 `/auth/change-password`、`mustChangePassword` session 更新、错误/loading 或刷新逻辑。
- 历史页面测试仍要求改密前不请求 `/api/master-data`，但当前代码已通过 `mustChangePassword` gate；定向运行仍发现请求，说明测试 fixture/时序与现状冲突。不得在结构重构中为旧断言改变当前请求行为，本轮以独立可见契约测试和源码等价审查保护。

## 实施、验证与审查

- 新增受控 `ForcedPasswordChangeModal`，原样承接 560px、不可关闭/遮罩/键盘退出、无 footer、警告、错误、三项密码字段、校验、loading 和提交事件；`App` 继续唯一拥有 API、session 更新、错误处理及工作区刷新。
- `App.tsx` 从 3,278 行降至 3,229 行；没有新增 API、状态、权限、依赖、样式或数据请求。
- 新组件契约 1/1 通过，覆盖警告、错误、不可见关闭按钮、三项密码和提交；Web typecheck 与 `git diff --check` 通过。
- Open Code Review 确定性预览准确选中 2 个运行时文件；LLM 端点仍未配置，未进行不安全凭据操作。人工逐项对照原 JSX 未发现关闭策略、字段、校验、文案、事件或状态漂移。
- 原页面固定样本在本轮修改前即因 `/api/master-data` 请求时序旧断言失败；当前源码仍以 `mustChangePassword` gate 阻断 workspace refresh。本轮没有修改该时序，也没有把旧测试预期改成通过证据。

## 发布与复审

- 功能分支提交 `2f878c6`、发布协调提交 `6028fff`，均已推送；47 标准 Git 发布范围为 `web`，未运行 migration，发布 ID 为 `git-6028fff23b3c_web-9f0fb6ab21df_api-5e1c513e1d3d`。
- 线上 `App.tsx` 与新组件源码 checksum 均与候选一致，Web 容器 running，构建产物包含“保存新密码并进入系统”，health 返回当前 release ID，最近 5 分钟 Web/API 关键错误为 0；provenance `traceable/ok`，镜像与 API release ID 匹配，锁 free、recovery clear。没有写业务数据。
- 副作用：首次登录门禁、密码字段、校验、错误/loading、提交及成功后的既有 session 行为未改；按项目规则未做浏览器视觉验收。
- 新一轮比较：`App` 剩余全局 overlay 中，发票模板选择是只读小边界但收益较低；人工修改轨迹直接改变状态且高风险；`MiscFeesPage` 涉及财务状态且保护不足。当前最高优先级不再是继续机械拆 Modal，而是先修复/重建首次登录与仓库宽测试的现状保护，再决定前端数据 owner 或后端 Repository 切片，避免在保护网落后时沿 App 一路拆到底。
