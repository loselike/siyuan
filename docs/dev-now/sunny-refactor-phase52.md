# Sunny 深度重构 Phase 52

- 状态：`in_progress`
- 分支：`codex/sunny-refactor-phase52`
- 基线提交：`3998e1a`
- 用户验收目标：每个切片后重新审查和排序；系统业务逻辑不得改变。

## 本轮重评

- 候选：运行时输入契约、巨型 Repository、前端数据流、发布基线稳定性；当前选择运行时输入契约。
- 固定样本：`PUT /api/user-table-preferences/:key`。合法对象、缺失 value、数组、超限对象、循环对象必须保持现有结果与错误文案；无权限/未登录行为不变。
- 禁止：不全局开启 ValidationPipe，不新增依赖，不改数据库、路由、权限、偏好 key/value 口径、上限或前端请求格式。

## 成熟参考与取舍

- NestJS validation：https://github.com/nestjs/nest/tree/master/packages/common/pipes （MIT）。借鉴 Controller 边界显式 pipe/parser；不全局启用转换或白名单，避免历史请求契约变化。
- Medusa core-flows / validators：https://github.com/medusajs/medusa （MIT）。借鉴运行时 schema 与应用服务类型保持同源、逐模块接入；不引入其工作流和 schema 依赖。
- Sunny 当前已有稳定 Service 校验，采用“导出单一 parser，Controller 与 Service 共用”的最小方案，不形成第二套规则。
