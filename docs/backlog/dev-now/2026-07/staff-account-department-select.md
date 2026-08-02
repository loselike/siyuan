# 员工账户部门下拉

- 已将员工账号新增、编辑、筛选、列表和批量导入中的“业务员”字段统一为“部门”。
- 部门选项复用既有 `/api/system/departments`，保存使用 `departmentId`，保留旧昵称字段兼容历史数据。
- 已完成 Web TypeScript 校验；未发布到 47。
