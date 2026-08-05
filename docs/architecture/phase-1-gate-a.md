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

[`config/architecture/governance-baseline.json`](../../config/architecture/governance-baseline.json) 固化当前 414 个 Controller/handler 路由契约（对应当前全部 HTTP method + path）的：

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

## 3. 增量债务预算

当前预算阻止以下指标增长：

- `DataController` 路由数：267。
- 根 `ApiClient` 方法/直接请求数：347/334。
- Shared 根导入生产文件：116。
- 生产源码 `as any`：865。
- 直接 `process.env`：33。
- 静态循环依赖：0。
- 总 Prisma/InMemory Repository 方法：660/550。

以下集中热点同时被冻结为逐文件行数上限；任何一个文件继续变长都会直接失败：

| 热点 | 行数上限 |
| --- | ---: |
| Prisma Repository | 29,429 |
| InMemory Repository | 17,674 |
| DataController | 2,878 |
| Shared 根入口 | 6,455 |
| 根 ApiClient | 2,448 |
| 全局 CSS | 12,291 |
| 全局测试桩 | 6,439 |
| WarehousePage | 4,584 |
| PricingPage | 3,628 |
| MasterDataPage | 3,222 |

同时保存 2 个已知孤儿候选、1 组完全重复源码和当前重复路由集合；出现新的孤儿候选、重复源码或重复路由会失败。已有债务可以直接下降；下降后应在独立治理变更中收紧 baseline，不能重新扩大。

预算不是架构 KPI。合理新增内部依赖边、文件和领域模块不受总量限制；被限制的都是阶段 0 已确认需要停止增长的集中点。新功能应进入领域 Controller、Service、Repository adapter、领域 API Client 或页面子模块，不能靠提高热点预算继续向巨型文件追加。

## 4. Lint no-new-debt

当前全量 lint 尚未清零，Gate A 按 workspace 和 rule 固化错误上限：

| Workspace | 当前错误 | 规则分布 |
| --- | ---: | --- |
| API | 89 | unused 42、no-undef 36、其余 11 |
| Web | 130 | unused 27、no-undef 94、hooks 7、其余 2 |

检查器重新运行 ESLint JSON 输出，并同时按 workspace/rule 与 file/rule 比较：任何既有 rule 总量增长、任一文件同规则增长、新文件产生错误，或出现新的错误 rule，都会失败；错误减少允许通过。这样既不能靠把错误从一个文件挪到另一个文件绕过，也可以逐批修复配置和源码问题。

ESLint 进程异常、空 stdout、空报告集或非法报告结构都会 fail-closed；exit 1 只有在返回合法且非空的 ESLint JSON 时才按“发现 lint 错误”处理。

## 5. Baseline 更新协议

确有合理架构变化时，先生成候选文件，不直接覆盖正式 baseline：

```bash
node scripts/check-architecture-governance.mjs --print-current --compact > /tmp/sunny-architecture-baseline.candidate.json
diff -u config/architecture/governance-baseline.json /tmp/sunny-architecture-baseline.candidate.json
```

评审必须说明每一项上升或鉴权变化。只有新增债务有明确例外、替代保护和退出条件时，才能更新正式 baseline；热点行数预算原则上只允许下降，不得用“让 CI 通过”为理由整体重采样。

2026-08-05 已从47当前运行源码建立独立干净集成分支，Web、API、迁移三类指纹逐字一致后重新冻结路由、结构、lint 与热点预算。该动作是可追溯治理快照，不代表对已有业务权限语义完成独立安全审计。

## 6. 已知边界

- 静态扫描不覆盖运行时 DI、外部网关、数据库行级策略或反向代理鉴权。
- 路由 metadata 不证明对象归属和字段裁剪正确。
- lint baseline 只阻止数量增加，不证明旧错误无风险。
- Baseline 的 route/debt/lint 结构和所有数值预算均先做 schema 校验，字段缺失、`null`、负数或非整数都会失败。
- 运行时迁移必须从 `codex/architecture-integration-baseline` 的干净提交继续，禁止从共享脏工作树复制或发布。
