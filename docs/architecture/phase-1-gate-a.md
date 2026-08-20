# 阶段 1 Gate A：增量架构治理门

## 1. 目标

Gate A 不一次性修完历史债务，也不改变运行时业务行为。它把阶段 0 的高风险事实转换为“旧债可下降、新债不能静默增加”的机器门，避免治理期间 `DataController`、总 Repository、根 `ApiClient`、Shared 根桶、全局 CSS、巨型页面、全局测试桩和 lint 债务继续膨胀。

统一入口：

```bash
npm run architecture:check
```

快速结构检查（跳过 ESLint 扫描）：

```bash
npm run architecture:check:fast
```

门自身的失败分支自检：

```bash
npm run architecture:check:self-test
```

`npm run governance:check` 已串联完整 `architecture:check`，因此修改治理规则、测试入口或发布脚本时也会执行本门。

## 2. 路由鉴权契约

[`config/architecture/governance-baseline.json`](../../config/architecture/governance-baseline.json) 固化当前 432 个 Controller/handler 路由契约（对应当前全部 HTTP method + path）的：

- Controller/handler owner。
- `auth` / `permission` / `none` 策略。
- 完整 `RequirePermission` 权限键集合。

扫描器遍历全部 API 生产 `.ts`，不依赖 `.controller.ts` 文件名；覆盖 Nest `Get/Post/Put/Patch/Delete/Options/Head/All/Sse`。Controller 中出现无法识别、无括号或组合 decorated method 会直接失败；Nest `@Module` 注册的 Controller 如果没有标准 `@Controller(...)` 也会失败。为避免动态注册静默漏扫，`@Module` metadata 和 `controllers` 目前必须分别使用内联对象、内联数组，常量、shorthand 或动态表达式会 fail-closed。自检固定覆盖普通 `admin.ts` 中的 `@All`、无括号方法装饰器、组合 Controller 装饰器及三种间接 Module 注册拒绝路径。

以下 4 个无标准鉴权元数据路由被显式分类：

| Route | 策略 | 额外约束 |
| --- | --- | --- |
| `GET /auth/captcha` | `public-captcha` | 登录前公开能力 |
| `POST /auth/login` | `public-login` | 登录前公开能力 |
| `GET /health` | `public-health` | 公开健康探针 |
| `POST /integrations/mojia/measurements` | `device-token-in-handler` | 检查器额外验证 handler 仍调用 `ensureMojiaDeviceToken` |

新增、删除、重命名路由，修改 owner、鉴权类型或权限键都会失败。更新 baseline 不是普通格式化动作：必须逐项检查公开性、角色、对象归属、字段裁剪、允许路径和拒绝路径。

Mojia 检查使用 AST 验证设备 token validator 是 handler 第一条有效语句，并固定 validator 仍读取 `MOJIA_DEVICE_TOKEN`、抛出 `UnauthorizedException`。`architecture:check` 会强制通过 safe runner 执行 API 定向测试，覆盖无 token、错误 header token、错误 query token；三种情况都必须在任何 Repository 写入前返回 401。

本门没有把 `RbacGuard` 改为默认拒绝。当前 4 个无 metadata 路由依赖既有行为；未来切换默认拒绝需要单独的兼容设计和 47 鉴权验收。

### 2026-08-12 运行基线复核

本次以 47 当前运行源码快照 `0323ac6` 为权威基线，逐条复核并冻结此前已上线但未进入治理 baseline 的 3 个新路由和 5 组权限集合变化；这次只更新保护网，不修改运行时代码或业务语义：

- `warehouse/in-stock-page` 继续使用 `warehouse:in-stock:view`；Prisma 查询对业务岗位执行本人客户范围并裁剪站点，对仓库岗位保留全仓读取，查询会写入 `warehouse.in_stock.view` 审计。
- 理货开始与取消已完成分别使用 `warehouse:tally-pending:task-process`、`warehouse:tally-completed:reverse-review`；开始处理继续校验屏蔽权限、任务状态与并发占用，取消已完成另行校验原因、包裹数据范围和下游占用，两条路径均写审计。
- 水单修改入口增加 `finance:water-receipt:arrived-update`，但 Repository 仍按水单状态二次判权；已到账修改继续要求原因、禁止存在已落账或待审核匹配，并在事务内同步账户、账本和审计。
- 单票费用详情和增删改入口增加录单/待排货权限，但 Repository 仍按运单归属、状态、费用类型、字段裁剪、锁定/审核/水单关联及事务内二次检查控制实际能力。

复核证据由现有仓库查询 Repository 定向测试、订单财务详情允许/拒绝与字段裁剪 E2E、财务水单/单票费用 E2E，以及 `architecture:check` 的完整路由元数据对比共同提供。未被测试覆盖的既有实现差异不在本次治理更新中修正，需单独建立行为任务。

### 2026-08-20 生产组合版本归并复核

47 在多次白名单发布后形成了一个尚未进入 `main` 的生产组合版本。本次 current-baseline cutover 先在全局发布锁内捕获 v3 manifest，再逐文件拉取并复算 550 个运行时文件；候选与线上快照逐字节一致。治理 baseline 的更新仅承认并冻结这份已经运行的事实，不改变运行时代码、权限语义或生产数据，也不把新增债务视为合理额度。

相对旧 baseline 的路由审计结果为：434 条 handler 契约变为 481 条，新增 50、删除 3、变化 53。51 项变化仍为 `permission -> permission`；轨迹批量导入从 `auth` 收紧为 `tracking:external:import`；代理银行账户写入口从静态 permission 变为 `auth`，但 Controller 首段和 Prisma/InMemory Repository 都继续要求创建/修改或财务银行管理权限，并执行全局字段裁剪。新增路由除既有公开 health/auth 与 Mojia 设备 token 入口外均有 auth/permission 元数据，Mojia handler 首语句 token 检查继续由 AST 门和 401 定向测试保护。

当前 34 组重复 HTTP route 中，32 组的权限集合一致。两组差异按动态联合授权保留：

- `GET /operations/line-shipments/:id/internal-flow-log` 的 DataController 入口允许运营内部日志或市场待排货/已排货日志能力，Repository 再做权限、角色、数据范围和站点校验；领域 Controller 的单一运营权限元数据不扩大先命中入口的实际能力。
- `GET /shipments` 的 DataController 按业务运单或市场看板/待排货/已排货/报表能力分流查询，Repository 继续执行岗位、客户归属、站点和字段裁剪；领域 Controller 的业务单权限路由不会覆盖前者的联合授权行为。

结构指标也按同一生产快照精确冻结：DataController 214，根 ApiClient 方法/直接请求 387/361，Shared 根导入 149，`as any` 954，`process.env` 38，Prisma/InMemory Repository 方法 756/640，孤儿候选 10，重复路由 34。热点上限只取本次快照的实际行数；全局 CSS 已从 13,222 降至 13,194，仍按更低值收紧。API/Web lint 错误按现状 107/155 冻结。退出条件是后续领域拆分或修复使任一指标下降时，在独立治理变更中同步收紧，禁止再次用整表重采样恢复额度。

这次例外的替代保护包括：完整 route owner/auth/permission 精确比较、无 metadata 路由显式白名单、Mojia 首语句 token 自检、Repository 二次授权、相关允许/拒绝 E2E，以及 PR CI 在镜像 job 前串联 `governance:check`。任何一项失败均不得生成生产 digest。

## 3. 增量债务预算

当前预算阻止以下指标增长：

- `DataController` 路由数：271。
- 根 `ApiClient` 方法/直接请求数：365/350。
- Shared 根导入生产文件：138。
- 生产源码 `as any`：924。
- 直接 `process.env`：36。
- 静态循环依赖：0。
- 总 Prisma/InMemory Repository 方法：713/599。

以下集中热点同时被冻结为逐文件行数上限；任何一个文件继续变长都会直接失败：

| 热点 | 行数上限 |
| --- | ---: |
| Prisma Repository | 32,134 |
| InMemory Repository | 19,600 |
| DataController | 3,021 |
| Shared 根入口 | 6,328 |
| 根 ApiClient | 2,614 |
| 全局 CSS | 13,162 |
| 全局测试桩 | 6,457 |
| WarehousePage | 4,938 |
| PricingPage | 3,720 |
| MasterDataPage | 3,281 |

同时保存 5 个已知孤儿候选、1 组完全重复源码和当前重复路由集合；出现新的孤儿候选、重复源码或重复路由会失败。已有债务可以直接下降；下降后应在独立治理变更中收紧 baseline，不能重新扩大。

预算不是架构 KPI。合理新增内部依赖边、文件和领域模块不受总量限制；被限制的都是阶段 0 已确认需要停止增长的集中点。新功能应进入领域 Controller、Service、Repository adapter、领域 API Client 或页面子模块，不能靠提高热点预算继续向巨型文件追加。

## 4. Lint no-new-debt

当前全量 lint 尚未清零，Gate A 按 workspace 和 rule 固化错误上限：

| Workspace | 当前错误 | 规则分布 |
| --- | ---: | --- |
| API | 100 | unused 51、no-undef 39、其余 10 |
| Web | 150 | unused 32、no-undef 109、hooks 7、其余 2 |

检查器重新运行 ESLint JSON 输出，并同时按 workspace/rule 与 file/rule 比较：任何既有 rule 总量增长、任一文件同规则增长、新文件产生错误，或出现新的错误 rule，都会失败；错误减少允许通过。这样既不能靠把错误从一个文件挪到另一个文件绕过，也可以逐批修复配置和源码问题。

ESLint 进程异常、空 stdout、空报告集或非法报告结构都会 fail-closed；exit 1 只有在返回合法且非空的 ESLint JSON 时才按“发现 lint 错误”处理。

## 5. Baseline 更新协议

确有合理架构变化时，先生成候选文件，不直接覆盖正式 baseline：

```bash
node scripts/check-architecture-governance.mjs --print-current --compact > /tmp/sunny-architecture-baseline.candidate.json
diff -u config/architecture/governance-baseline.json /tmp/sunny-architecture-baseline.candidate.json
```

评审必须说明每一项上升或鉴权变化。只有新增债务有明确例外、替代保护和退出条件时，才能更新正式 baseline；热点行数预算原则上只允许下降，不得用“让 CI 通过”为理由整体重采样。

2026-08-12 已从 47 当前运行源码快照 `0323ac6` 独立复核并冻结路由、结构与热点预算；完整 lint 上限沿用既有逐文件/逐规则 baseline，未通过整表重采样放大。新增债务不是目标额度：后续切片只能保持或下降，下降后应立即收紧。

## 6. 已知边界

- 静态扫描不覆盖运行时 DI、外部网关、数据库行级策略或反向代理鉴权。
- 路由 metadata 不证明对象归属和字段裁剪正确。
- lint baseline 只阻止数量增加，不证明旧错误无风险。
- Baseline 的 route/debt/lint 结构和所有数值预算均先做 schema 校验，字段缺失、`null`、负数或非整数都会失败。
- 运行时迁移必须从 `codex/architecture-integration-baseline` 的干净提交继续，禁止从共享脏工作树复制或发布。
