# Sunny 深度重构 Phase 65

- 状态：`completed`
- 分支：`codex/sunny-refactor-phase56`
- 基线提交：`0f5ecd8`
- 47 基线：`git-6028fff23b3c_web-9f0fb6ab21df_api-5e1c513e1d3d`
- 用户验收目标：每个切片后重新审查和排序；整个系统业务逻辑不得改变。

## 本轮重评与选择

- 安全/数据正确性：首次登录强制改密是认证门禁，但旧页面测试的登录响应与随后 `/api/auth/session` 返回了两个不同账号，无法证明改密前不加载业务数据。
- 高频业务流/前端数据流：仓库宽测试仍断言旧“单件方数”、裸 CBM 数值、旧单位大小写和单一 DOM 命中，已经不能保护当前矩阵/台账双视图与多箱规收货链路。
- 后端架构：`prisma.repository.ts` 31,983 行、`in-memory.repository.ts` 19,416 行仍是长期债务；本轮没有在保护网失真时继续迁移业务实现。
- UI：`WarehousePage.tsx` 4,856 行、`MiscFeesPage.tsx` 4,042 行、`App.tsx` 3,229 行；仓库页面已有复杂双视图，先恢复可重复保护比继续拆组件价值更高。
- 选择：转向测试保护网校准；只修 fixture 和当前行为断言，不修改运行时文件、API、权限、状态、数据或 UI。
- 固定样本：首次登录账号在保存新密码前不请求 `/api/master-data`，保存后才进入工作区；管理员在仓库今日收货完成筛选、切换精密台账、添加异常、编辑备注和两条箱规手动收货。

## 成熟参考与取舍

- [Keycloak UpdatePassword required action](https://github.com/keycloak/keycloak/blob/master/services/src/main/java/org/keycloak/authentication/requiredactions/UpdatePassword.java) 与 [UserResource required-actions 管理](https://github.com/keycloak/keycloak/blob/main/services/src/main/java/org/keycloak/services/resources/admin/UserResource.java)（Apache-2.0）：借鉴“强制改密是同一账号持续存在的 required action，完成后只清除该账号门禁状态”；不复制 Keycloak 状态机、协议或存储模型。
- [MSW](https://github.com/mswjs/msw)（MIT）：借鉴“测试在真实请求边界模拟服务端状态，响应之间保持一致身份与生命周期，并在测试间重置状态”；Sunny 继续使用现有 fetch harness，不引入新依赖或改写全部测试。
- 取舍：首次登录账号作为专用 fixture，不加入员工管理列表，避免改变其他系统设置测试的账号集合；仓库重复文本按精确两条箱规断言，不用宽泛 `> 0` 掩盖缺行。

## 根因、实施与行为保护

- 首次登录旧 fixture 返回 `firstlogin` 登录用户，但 access token 只编码 `ADMIN`；紧随其后的 `/api/auth/session` 因 token 映射回 `admin` 且 `mustChangePassword=false`，错误触发工作区加载。
- 新 fixture 为 `firstlogin` 保留独立账号状态；登录 token 可解析到同一身份，改密接口只把该 fixture 的 `mustChangePassword` 置为 false，且每个测试前恢复为 true。
- 仓库断言改为当前矩阵标签 `单件体积 CBM`，再显式切换精密台账验证 `0.300288 CBM`、重量和计费重；继续从对应台账行执行原添加异常链路。
- AutoComplete 按可访问角色定位真实输入；箱规单位保持当前 `KG`；两条箱规创建后精确断言两处异常和扫描时间，同时继续核对 POST payload 的时间、件数、重量和尺寸。
- 未修改任何运行时源码、共享契约、权限、后端接口、数据库或样式。

## 验证与审查

- 首次登录固定样本：1/1 通过。
- 仓库今日收货/手工收货固定样本：1/1 通过。
- Web typecheck、`git diff --check` 通过。
- Open Code Review 确定性预览识别 fixture 变更；仓库测试按默认规则排除。LLM 端点未配置，未读取或请求凭据；人工审查将重复文本从宽泛存在性收紧为两条箱规精确数量，未发现放宽业务断言或改变运行时行为。

## 复审与下一轮候选

- 当前测试 harness 已达 6,473 行，账号身份通过 role token 字符串推断；本轮首次登录冲突说明“同角色多账号”仍可能产生 fixture 身份歧义。下一轮应优先评估把 mock token 显式映射到 username 的最小测试基础设施切片，并用现有多角色场景保护。
- 后端两个 Repository 巨型文件仍是最高结构债务，但应只在找到有真实 characterization 的小领域端口后实施。
- Warehouse/MiscFees 的 UI 与数据 owner 仍需治理；不得因仓库宽测试恢复就重新做高 props 的机械组件拆分。
- 下一步选择暂定：继续重评，不沿 App 或 Warehouse 单一路径推进；比较测试身份基础设施、可保护的 Repository 小切片和高频 UI 数据 owner 后再定 Phase66。

## 发布结果

- 功能分支提交 `a58ee5a` 已推送；发布协调分支提交 `5424c2e` 已推送。
- 标准 Git 发布仅同步两份 Web 测试文件；发布工具按保守规则重建 Web，未修改 API、migration 或生产业务数据。
- 47 发布 ID：`git-5424c2eb4664_web-dc928f06c904_api-5e1c513e1d3d`。provenance `traceable/ok`，Web/API image 与 state 匹配，API release ID 匹配，发布锁 free、recovery clear；公网 API health 与 Web 均为 200。
- 副作用：运行时业务逻辑和页面产物未发生源码语义修改；Web 镜像仅因测试文件进入源码 manifest 而重建。
