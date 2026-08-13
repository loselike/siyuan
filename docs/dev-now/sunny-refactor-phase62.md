# Sunny 深度重构 Phase 62

- 状态：`completed`
- 分支：`codex/sunny-refactor-phase56`
- 基线提交：`b771790`
- 47 基线：`git-9f337207fa3b_web-29da972cdbb7_api-5e1c513e1d3d`
- 用户验收目标：每个切片后重新审查和排序；整个系统业务逻辑不得改变。

## 本轮重评与选择

- 安全/数据正确性：JWT 主动撤销和全局运行时 DTO 校验会改变外部契约，继续独立决策，不混入结构重构。
- 高频业务流/前端数据流：今日收货可见工作区约 451 行；其中手动添加收货 Drawer 150 行，直接耦合客户匹配、组合号联动、多箱规编辑、实时合计与创建 API。
- 后端架构：Prisma/InMemory 巨型 Repository 仍是长期债务，但仓库最近两条已量化查询问题已关闭；本轮不继续沿同一后端路径扩张。
- UI：筛选、统计和双视图表格合计约 220 行，若整体提取需传递约 30 项数据/权限/回调；一次拆出会形成高 props 扇入和新的“巨型展示组件”，收益风险比不足。
- 选择：不把整个今日收货区硬搬出页面，改为提取边界更完整的“手动添加收货”受控 Drawer；页面继续拥有草稿、客户查询、校验、API、刷新和提示。
- 固定样本：管理员打开手动收货，选择客户 `9409`，输入快递号，编辑两条箱规及异常，看到箱规数/总件数/总体积/总实重，确认后请求 payload、保存提示和今日收货行保持一致。

## 成熟参考与取舍

- [Twenty RecordTable](https://github.com/twentyhq/twenty/blob/main/packages/twenty-front/src/modules/object-record/record-table/components/RecordTable.tsx) 与 [RecordTableContent](https://github.com/twentyhq/twenty/blob/main/packages/twenty-front/src/modules/object-record/record-table/components/RecordTableContent.tsx)（AGPL-3.0）：借鉴把权限/数据状态判断留在 owner，把完整可见内容与交互事件放入受控子组件的边界；不采用其 Jotai/context 状态体系，不复制代码。
- 延续 [Ant Design ProComponents ModalForm](https://github.com/ant-design/pro-components/blob/master/src/form/layouts/ModalForm/index.tsx)（MIT）的受控 overlay/外部副作用边界；Sunny 继续使用现有 AntD Drawer，不新增依赖。
- 不采用“整体工作台一口气组件化”，因为当前显式 props 会过多，反而掩盖所有权；本轮只迁移具有单一业务任务的 Drawer。

## 风险与保护

- 必须保留 Drawer `width=760`、`destroyOnHidden=false`、关闭行为、底部四项实时合计、确认按钮、客户 AutoComplete、组合号、箱规新增/删除及至少一条限制、数值精度、扫描时间、备注和异常。
- 不移动 `addTodayManualPackage`、草稿联动、客户加载、校验、API 或列表刷新；不改权限、路由、请求 payload、文案、样式类或业务数据。
- 迁移前现有固定样本测试覆盖手动添加多箱规 payload 与保存结果；先运行记录基线，再新增 Drawer 独立契约测试。

## 实施、验证与审查

- 新增受控 `WarehouseManualReceiptDrawer`，原样承接 760px Drawer、`destroyOnHidden=false`、客户匹配、多箱规编辑、四项实时合计、备注异常和确认/关闭事件；`WarehousePage` 继续唯一拥有客户加载、草稿联动、校验、API、刷新和提示。
- `WarehousePage.tsx` 从 5,000 行降至 4,856 行；没有新增 API、状态、权限、依赖、样式或数据请求。
- 新组件定向测试 2/2 通过，覆盖两箱规的 5 件、0.228 CBM、31.00 KG 合计，客户名称、快递号、件数、新增/删除箱规、确认、单箱规不可删除与关闭回调；Web typecheck 和 `git diff --check` 通过。
- 迁移前宽页面固定样本在进入 Drawer 前即因既有矩阵视图不再存在 `单件方数` columnheader 而失败（`warehouse.test.tsx:54`）；该失败发生在本轮代码边界之外，未把旧断言改成通过证据。Drawer 的完整可观察契约由独立组件测试保护。
- 手工逐项对照原 JSX 与新组件未发现宽度、销毁策略、字段、文案、精度、事件、禁用条件或样式类漂移；草稿和提交函数未移动，未发现 P0/P1/P2 副作用。

## 发布与复审

- 功能分支提交 `d9b685f`、发布协调提交 `0be4c7b`，均已推送；47 标准 Git 发布范围为 `web`，未运行 migration，发布 ID 为 `git-0be4c7b3faf7_web-8d5e542235da_api-5e1c513e1d3d`。
- 线上 `WarehousePage.tsx` 与新 Drawer 源码 checksum 均与候选一致，Web 构建产物包含箱规说明；provenance `traceable/ok`，Web/API image 与 API release ID 匹配，公网 health 200，锁 free、recovery clear，最近关键日志为空。没有写业务数据。
- 副作用：用户可见字段、布局、操作和保存逻辑未改；按项目规则未做浏览器视觉验收。
- 新一轮比较：安全类 token/DTO 仍需产品决策；Repository 长期债务不变；`WarehousePage` 已降至 4,856 行，但继续拆零散 overlay 的边际收益下降。下一步最高价值候选转为今日收货的筛选/统计/表格工作区“数据 owner 与展示边界”，但必须先解决现有宽测试与矩阵视图契约漂移并把 props 分组，否则应转向 `MiscFeesPage.tsx` 4,042 行或 `App.tsx` 3,362 行，不沿当前方向硬拆。
