# Sunny 深度重构 Phase 61

- 状态：`in_progress`
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
