# Sunny 深度重构 Phase 36

- 状态：completed
- 分支：`codex/sunny-refactor-phase36`
- 基线提交：`ba5de6a`
- 47 基线发布：`whitelist-5e3d9e8e8318cec867d42f2c`
- 用户验收目标：继续降低 `App.tsx` 的侧栏导航耦合，同时确保主菜单、二级菜单、展开收起、修饰键新开页、品牌返回、URL、权限和数据刷新行为完全不变。
- 固定样本：管理员从运营工作台进入报价查价，价格表二级入口保持稳定 URL；当前目录可展开/收起，Ctrl 点击不被应用拦截，品牌按钮仍返回运营工作台运单池。
- 本轮范围：抽取主/次菜单点击与 sidebar sub-nav 注册、解析、上下文和展开状态；不引入路由库，不改菜单、权限、页面 UI、API、业务状态或数据请求。
- 重构准则：只移动结构，不改变现有业务逻辑；所有修改先以当前可观察行为建立特征测试，保持路由、字段、权限、状态、金额、事务、审计和前端交互一致。
- 完成：新增 `staffSidebarNavigation`，迁移主菜单点击、活动目录展开/收起、二级菜单点击、sidebar sub-nav 注册/去重/清理/别名解析、ModuleSubNav context 和品牌返回；`App.tsx` 只消费状态与回调，本阶段净减少 47 行。
- 行为保护：迁移前新增 App characterization 并通过 3/3；迁移后 sidebar hook 3/3、既有 route hook 3/3、App characterization 3/3，总计 9/9。覆盖稳定 href、普通点击、修饰键不拦截、活动目录展开/收起、二级 URL、品牌返回、alias、owner clear、popstate 与无权限回退。
- 安全门：Web typecheck、`git diff --check`、432 路由治理、lint no-new-debt 和 API 安全契约 3/3 通过。
- 提交：`fa4a75d`（`refactor(web): isolate staff sidebar navigation`），已推送 `origin/codex/sunny-refactor-phase36`。
- 47 发布：`whitelist-b05d7bb207d69df556ef4f44`；Web 指纹 `812a98bfa304dc40168ca62cb1c22ff75c2b9625b9e6c15d99a0a2f1859d3963`。线上 `App.tsx` 与新 hook checksum、Web 镜像/容器、内外 health、最近关键错误、发布锁和 recovery 均通过。
- 未改：现有 `window.history`、路由配置、菜单内容、UI、权限、API、业务状态、数据请求和线上业务数据均未改变。
- 既有风险：47 仍为 `SOURCE_MODE=WHITELIST_CAS`，API health release ID 仍为 `unknown`；两条旧 `workspace.test.tsx` 宽页面测试仍保留迁移前测试债务。
- 后续：抽取侧栏渲染组件，让 `App.tsx` 只负责装配；随后以现有 9 条导航契约评估 React Router 兼容适配，不一次性替换全部路由。
