# 英国独立查价模块

- 状态：published_47
- 分支：`codex/uk-pricing-module-20260821`
- 用户目标：新增“英国空海运铁路快递查询”，独立维护价格表、加价规则与查价权限；欧洲模块不再返回英国报价。
- 固定样本：现网 `7.8-驰汉.xlsx` 中英国线路迁入英国模块，欧洲模块排除这些线路。
- 边界：复用欧洲查询字段和运输方式口径；不新增第二套报价引擎；不改其他国家模块。
- 预期改动：Shared 模块契约、API/内存仓储查价边界、Excel 导入分流、RBAC、Web 查价与规则管理、Prisma 权限及现有英国价格行迁移、定向测试。
- 验收：英国入口可独立查价和维护价格表/加价；欧洲查询英国被拒绝；无英国权限不显示入口且接口拒绝；47 迁移后英国价格池有数据、欧洲池无英国行。
- 本地证据：Shared/API/Web 类型检查通过；API 解析分池、英国税务筛选、欧洲拒绝英国、独立权限、加价能力测试通过；Web 英国入口、固定目的地和独立接口测试通过；`git diff --check` 通过。
- 迁移证据：`20260821143000_add_uk_pricing_lookup` 已在 47 当前真实数据上以事务回滚方式演练通过，识别 1 个驰汉价格表、12 条 PriceBookRow、18 条 LegacyPricingRow、24 条角色授权。首次演练因本地替换命令未生效曾实际提交，已立即执行精确逆迁移并核对恢复为英国价格池 0、欧洲英国行 12/18、英国权限 0、迁移登记 0；随后重新以 `ROLLBACK` 演练通过，无残留。
- 审查结论：英国/欧洲导入和查价双向隔离；迁移显式事务、复制后计数、欧洲残留和原文件保留均 fail-closed；现有欧洲授权按对应能力平移，未扩大未授权角色。
- 发布状态：已合入 `origin/main`（PR #36，merge commit `5e678efc13f4d3c0ffd3e32978bea03b102ec16b`），并以迁移白名单发布到 47，release ID `whitelist-4c70370259c48dcf6a9f95cd`。API/Web/迁移容器健康，公网 health 返回该 release ID，发布锁 free、recovery clear。
- 线上数据证据：英国价格表 1 个、PriceBookRow 12 条、LegacyPricingRow 18 条、权限 3 个、角色授权 24 条、保留导入源 1 个；欧洲 PriceBookRow/LegacyPricingRow 的英国残留均为 0，迁移登记为已完成。
- 线上行为证据：英国接口返回 201、目的地固定为英国并命中 1 条真实报价；欧洲接口查询英国返回 400；无英国查价权限角色返回 403。
- 发布治理尾项：本次因新增迁移按规范使用 `WHITELIST_CAS`，运行镜像、state 与 API release ID 一致，但 provenance 为 `non-git-source`；后续需由独立发布治理任务执行 current-baseline cutover，恢复 `GIT_SOURCE_BUILD`，不影响本功能在线使用。
- 人工视觉检查点：47 的 `/app/pricing` 应显示“英国空海运铁路快递查询”，目的地固定为英国；价格表管理与代理加价规则应可按 `ukExpress` 独立维护。
