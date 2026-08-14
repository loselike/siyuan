# Sunny 深度重构 Phase 37

- 状态：completed
- 分支：`codex/sunny-refactor-phase37`
- 基线提交：`77e5039`
- 47 基线发布：`whitelist-b05d7bb207d69df556ef4f44`
- 用户验收目标：继续缩小 `App.tsx`，把员工侧栏变成独立展示边界，同时确保视觉 DOM、菜单权限、链接、展开状态、未读提示和全部点击行为完全不变。
- 固定样本：管理员登录后仍看到相同品牌区、主导航和 AI 助手卡；客服管理未展开时显示 3 条未读提示，展开后待排货显示 1 条，价格表链接、修饰键和品牌返回保持 Phase 36 契约。
- 本轮范围：抽取 `StaffSidebar` 展示组件和侧栏专属格式化/映射；不改 CSS、文案、菜单配置、权限、URL、交互、API、业务状态或数据请求。
- 重构准则：只移动结构，不改变现有业务逻辑；所有修改先以当前可观察行为建立特征测试，保持路由、字段、权限、状态、金额、事务、审计和前端操作链路一致。
- 完成：新增 `StaffSidebar`，迁移侧栏品牌、菜单 DOM、稳定 href、active/expanded/aria 状态、模块与二级未读格式化、箭头及 AI 助手卡；`App.tsx` 只传入可见菜单、导航状态和既有回调，本阶段净减少 81 行。
- 特征基线：迁移前新增的未读测试首次准确发现“未加载模块没有 `aria-expanded` 属性”这一当前行为，修正测试预期后在改运行时代码前 4/4 通过；没有为了测试方便改变现有 DOM。
- 行为保护：迁移后 `StaffSidebar` 组件 1/1、sidebar navigation hook 3/3、App characterization 4/4，共 8/8；覆盖品牌、稳定链接、active/current、展开收起、修饰键、未读 999+、普通/二级点击、品牌返回、popstate 和无权限回退。
- 安全门：Web typecheck、`git diff --check`、432 路由治理、lint no-new-debt 和 API 安全契约 3/3 通过。
- 提交：`5ecf5aa`（`refactor(web): isolate staff sidebar view`），已推送 `origin/codex/sunny-refactor-phase37`。
- 47 发布：`whitelist-a94cd9e2411ad11bdce6d36c`；Web 指纹 `ac046cee89617a8d19251f90792af59fe7fd90f6ded76eb60ff5c3591b873900`。线上 `App.tsx` 与新组件 checksum、Web 镜像/容器、内外 health、最近关键错误、发布锁和 recovery 均通过。
- 未改：CSS、菜单内容、权限、URL、交互、API、业务状态、数据请求和线上业务数据均未改变。
- 既有风险：47 仍为 `SOURCE_MODE=WHITELIST_CAS`，API health release ID 仍为 `unknown`；两条旧 `workspace.test.tsx` 宽页面测试仍保留迁移前测试债务。
- 后续：抽取员工顶部栏展示组件，继续收敛 app-shell；然后基于现有侧栏与路由测试评估 React Router 兼容适配，不一次性替换全部路由。
