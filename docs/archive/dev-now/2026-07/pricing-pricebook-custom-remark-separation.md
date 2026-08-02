# 价格表自定义备注与渠道要求分离

- 状态：已完成并发布 47
- 目标：价格表管理中的人工备注作为独立“自定义备注”展示；不再并入查价结果的“渠道要求”。
- 改动：价格表列表的“已填写”可打开全文；编辑入口和接口新增 `customRemark` 兼容字段；查价结果新增“自定义备注”列、详情弹窗和复制报价字段。原表解析出的 `remark`、`specialRemark`、`productSurchargeRemark` 仍只属于渠道要求。
- 验证：Shared build、Web typecheck、价格表 API E2E（内存仓储）和 `git diff --check` 通过。API 全量 typecheck 仍受既有 `pricing-excel.ts` 1171/1179 的 `string | undefined` 报错阻塞，非本轮文件。2026-07-17 已精确同步 API/Web/Shared 运行时代码到 47，未执行迁移；API/Web 容器已重建重启，容器内与公网 `/api/health`、首页均返回 200，线上静态资源包含“编辑自定义备注”。
