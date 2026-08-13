# Sunny 深度重构 Phase 61

- 状态：`completed`
- 分支：`codex/sunny-refactor-phase56`
- 基线提交：`a56cd69`
- 47 基线：`git-32fa6a2c0309_web-3c24fed0279c_api-5e1c513e1d3d`
- 用户验收目标：每个切片后重新审查和排序；整个系统业务逻辑不得改变。

## 本轮重评与固定样本

- 安全/数据正确性：token 主动撤销和全局 DTO 校验仍会改变外部行为，不能混入结构重构。
- 高频业务流/前端数据流：`WarehousePage.tsx` 5,121 行，修改入仓包裹弹窗同时承载身份字段联动、件重尺、实时材积、同箱规补录资格、提交锁与重试提示；该链路直接关联今日收货与在仓数据。
- 后端架构：Phase59/60 已消除两条已量化的仓库全量汇总查询，继续沿 SQL 优化的边际收益下降。
- UI：弹窗字段、分组、文案与操作链路当前可运行，本阶段不重新设计，只建立可独立验证的组件边界。
- 选择：将修改入仓包裹弹窗提取为受控展示组件，页面继续唯一拥有权限、草稿、校验、API、幂等重试与列表刷新。
- 固定样本：管理员从今日收货打开 `1399-KY4001036478949`，将客户/快递号、件数、重量、尺寸、备注与人工异常修改后保存；组合号自动联动，实时显示 CBM/5000/6000 材积，保存结果继续刷新今日收货和在仓数据。同箱规待确认重试时输入与关闭继续锁定。

## 成熟参考与取舍

- [Ant Design ProComponents ModalForm](https://github.com/ant-design/pro-components/blob/master/src/form/layouts/ModalForm/index.tsx)（MIT）：借鉴受控 `open`、外部 `onOpenChange/onFinish`、提交 loading 期间阻止关闭，以及关闭后再销毁/重置的职责边界。
- Sunny 不引入 ProComponents 表单状态或新依赖，不改现有 AntD Modal、不迁移业务草稿进组件，也不复制外部代码；只采用“弹窗负责呈现和事件转交、页面负责业务状态和副作用”的边界。
- 按 Sunny UI 准则保留紧凑三组字段与实时材积提示作为该任务的可扫读记忆点；不增加装饰、营销式卡片或额外步骤。

## 风险与保护

- 必须逐项保留标题、宽度、字段 aria-label、禁用条件、同箱规可见性/资格提示、提交 loading、键盘/遮罩/关闭锁、实时材积精度与全部回调。
- 不移动 `saveWarehousePackageEdit`、`hasWarehousePackageEditChanges`、sessionStorage requestId、权限判断、API 调用或刷新逻辑。
- 当前宽页面 characterization 在进入本轮前已因表格展示从裸值变为带单位文本而失败，但请求、持久化结果和实际 DOM 数据正确；不得借重构改 UI 或恢复旧断言。本轮新增独立弹窗契约测试，并在迁移后重跑同一宽测试确认失败位置完全相同。

## 实施、验证与审查

- 新增受控 `WarehousePackageEditModal`，完整承接原弹窗 760px 布局、三组字段、实时体积/5000/6000 材积、同箱规资格提示、待确认警告与提交期间关闭锁；`WarehousePage` 继续持有全部权限、草稿联动、校验、API、requestId、刷新与结果提示。
- `WarehousePage.tsx` 从 5,121 行降至 5,000 行；没有新增 API、状态、权限、路由、依赖、样式或数据请求。
- 新组件定向测试 2/2 通过，覆盖字段事件、三种材积显示、同箱规数量、保存回调、待确认输入锁与保存期间取消/Escape 锁；Web typecheck 与 `git diff --check` 通过。
- 迁移前和迁移后同一宽页面测试均完成修改请求、保存提示与更新后 DOM 渲染，且都只在既有第 178 行裸文本 `2` 断言失败；失败签名、位置和 DOM 的 `2 件/0.120000 CBM/24.00/20.00/人工异常复核` 完全一致，证明本切片未制造该历史测试债务。
- 手工逐项对照原 JSX 与新组件未发现字段、文案、精度、禁用条件、回调或可见性漂移。Open Code Review CLI 已安装，但 LLM endpoint 未配置，未将其作为证据；本轮以定向契约测试、迁移前后相同 characterization 和逐项 diff 审查完成复核。

## 发布与复审

- 功能分支提交 `d682dcb`，发布协调提交 `9f33720`，均已推送；47 标准 Git 发布范围为 `web`，未运行 migration，发布 ID 为 `git-9f337207fa3b_web-29da972cdbb7_api-5e1c513e1d3d`。
- 发布中 Compose 因新 release ID 缺少本地 API tag，按现有脚本用缓存重新标记了未变化 API 镜像后同时重建容器；API 源码指纹保持 `5e1c513e1d3d`。最终 Web/API image 与 state/API release ID 匹配，provenance `traceable/ok`，公网 health 与首页 200，锁 free、recovery clear，最近关键日志为空。
- 线上 `WarehousePage.tsx` 与新弹窗源码 checksum 分别与候选一致，Web 容器产物包含待确认重试提示；没有写业务数据。
- 副作用：用户可见字段、样式、文案、操作顺序和保存结果未改；只将展示边界独立出来。视觉不应变化，按项目规则不做浏览器截图。
- 新一轮比较：安全类 token 撤销/全局 DTO 仍需产品决策；后端巨型 Repository 仍是长期债务，但最近仓库查询收益已兑现；前端 `WarehousePage` 仍为 5,000 行，且“今日收货”整段同时拥有筛选、统计、批量选择、删除/导入/手工收货入口与表格，是新的最高价值候选。下一步应先量化该段 props/请求/状态边界并与 `App.tsx` 3,362 行、`MiscFeesPage.tsx` 4,042 行比较，不自动继续拆弹窗。
