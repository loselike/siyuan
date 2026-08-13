# Sunny 深度重构 Phase 63

- 状态：`completed`
- 分支：`codex/sunny-refactor-phase56`
- 基线提交：`cdf6f44`
- 47 基线：`git-0be4c7b3faf7_web-8d5e542235da_api-5e1c513e1d3d`
- 用户验收目标：每个切片后重新审查和排序；整个系统业务逻辑不得改变。

## 本轮重评与选择

- 安全/数据正确性：抽查确认密码已采用 scrypt + 盐并兼容旧 SHA-256 登录后升级，上传目录已改为受保护下载，水单关键路径已有事务/锁；没有发现应在本轮优先于其他工作的新增 P0。
- 高频业务流/前端数据流：`WarehousePage.tsx` 仍为 4,856 行，但继续整体提取今日收货工作区需要约 30 项显式依赖，且现有宽测试与矩阵视图契约落后，继续硬拆的边际收益下降。
- 后端架构：`prisma.repository.ts` / `in-memory.repository.ts` 仍为长期高耦合债务；当前抽样未出现可用小切片安全关闭的新增资金或权限问题。
- UI：`MiscFeesPage.tsx` 约 4,042 行，但直接承载财务费用状态和缺少页面级行为保护，结构迁移风险高于收益。
- 选择：从仓库方向转向 `App.tsx` 的个人中心边界。它同时承载全局页面编排、个人资料表单和改密表单，但已有完整页面行为测试，可用最小改动建立受控组件边界。
- 固定样本：管理员打开个人中心，看到账号与角色；不出现登录日志/账号事件；修改姓名调用原资料更新；修改密码调用原改密并退出当前会话。

## 成熟参考与取舍

- [Vendure DetailPage](https://github.com/vendurehq/vendure/blob/master/packages/dashboard/src/lib/framework/page/detail-page.tsx) 与 [useDetailPage](https://github.com/vendurehq/vendure/blob/master/packages/dashboard/src/lib/framework/page/use-detail-page.ts)（MIT）：借鉴“可见表单边界聚合，查询、mutation、刷新和路由副作用由 owner/hook 管理”的职责划分；Sunny 不引入 Vendure dashboard framework，不复制代码。
- [Medusa ProductListTable](https://github.com/medusajs/medusa/blob/develop/packages/admin/dashboard/src/routes/products/product-list/components/product-list-table/product-list-table.tsx)（MIT）：借鉴 route owner 管数据请求与查询状态、展示组件只接收聚焦契约的组织方式；Sunny 不在本轮引入 React Query、路由改造或其表格抽象。
- Sunny 取舍：`App` 继续唯一拥有 `/auth/me`、资料更新、改密、session 合并/清理、通知和未授权处理；新组件只承接原有个人中心 Modal、字段、校验、文案和事件入口。

## 风险与保护

- 必须保持 Modal 标题、980px 宽度、销毁策略、关闭行为、账号/角色展示、资料四字段、密码三字段、校验文案和按钮不变。
- 不移动或改写 API、会话持久化、改密后退出、权限、路由、通知或首次登录强制改密流程。
- 迁移前后使用同一页面固定样本；新组件增加独立可见契约测试，Web typecheck 和 diff 检查作为安全门。

## 实施、验证与审查

- 新增受控 `PersonalCenterModal`，原样承接 980px Modal、账号与角色只读展示、资料四字段、密码三字段、校验文案和关闭/保存事件；`App` 继续唯一拥有资料读取/更新、改密、session 合并/清理、通知和未授权处理。
- `App.tsx` 从 3,362 行降至 3,278 行；没有新增 API、状态、权限、依赖、样式或数据请求。
- 迁移前后页面固定样本 1/1 通过；新组件契约 1/1 通过，覆盖账号与角色、隐藏登录日志/账号事件、资料保存、密码保存和关闭；Web typecheck 与 `git diff --check` 通过。
- Open Code Review 确定性预览准确选中 2 个运行时文件并排除测试文件；其 LLM 端点未配置，按工具规则未注入或索取密钥。人工逐项对照原 JSX 与新组件未发现字段、初始值、校验、文案、事件、样式类或副作用漂移。
- Sunny UI 规则影响：保留内部运营界面的字段密度、角色状态和原操作路径，没有借结构迁移顺手美化或删减业务字段。

## 发布与复审

- 功能分支提交 `6d31bb8`、发布协调提交 `eb8a3a5`，均已推送；47 标准 Git 发布范围为 `web`，未运行 migration，发布 ID 为 `git-eb8a3a59cfa9_web-42257849cc56_api-5e1c513e1d3d`。
- 线上 `App.tsx` 与新组件源码 checksum 均与候选一致，Web 容器 running，构建产物包含 `personal-center-readonly-grid`，公网/容器 health 返回当前 release ID，最近 5 分钟 Web/API 关键错误为 0；provenance `traceable/ok`，镜像与 API release ID 匹配，锁 free、recovery clear。没有写业务数据。
- 副作用：用户可见字段、布局、表单校验、资料保存和改密退出逻辑未改；按项目规则未做浏览器视觉验收。
- 新一轮比较：`sessionStore` 对损坏 JSON 启动失败已有明确 characterization，不能在结构重构中擅自改变；`MiscFeesPage` 直接承载财务状态且保护网不足；后端巨型 Repository 仍需更小边界。当前最高收益的安全小切片是继续收口 `App` 内首次登录强制改密 Modal：现有页面测试已经验证阻断工作区、改密请求与成功后进入系统，可在不移动认证/会话逻辑的前提下提取完整可见边界。
