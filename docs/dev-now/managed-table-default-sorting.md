# 标准业务表格默认排序

- 状态：已完成本地实现；未发布 47，未提交 Git。
- 输入来源：无（当前会话明确请求）。
- 范围：为统一 `ManagedTable` 自动补齐基于原始数据字段的本地排序；已有服务端排序、明确禁用排序、操作列与选择列保持不变。
- 盘点：74 个主业务列表使用 `ManagedTable`，已一次覆盖；41 处原生 `Table` 为详情、录入/选择或含汇总的嵌入表，不迁移以避免改变录单顺序、汇总与弹窗交互。
- 验证：`npm test -w @siyuan/web -- --run src/modules/shared/ui-table.test.tsx`（9/9）、`npm run typecheck -w @siyuan/web`、`git diff --check` 已通过。
- 风险：默认排序在未配置服务端排序的列表中只针对当前已加载数据；已有服务端排序页仍保持服务端全量排序。
