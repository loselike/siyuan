# Sunny 深度重构 Phase 62

- 状态：`in_progress`
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
