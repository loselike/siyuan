# Sunny 深度重构 Phase 48

- 状态：`in_progress`
- 分支：`codex/sunny-refactor-phase48`
- 基线提交：`77044ee`
- 用户验收目标：每个切片完成后重新扫描、重新排序；所有业务逻辑保持不变。

## 本轮重评

- 原候选：为 `GET /api/master-data` 增加按权限裁剪的数据库查询下推，减少无权限角色的无效读取。
- 停止原因：实施前校验发现 47 当前运行源码相对 Phase 47 有 26 个内容差异、6 个远端独有运行时文件，且 `DataController`、Prisma/InMemory Repository 正在运行新的权限改造。继续原候选会覆盖生产权限语义，违反行为保持门禁。
- 当前选择：P0 恢复 47 当前真实组合源码的干净 Git 基线。固定样本是运行时源码集合达到本地/47 逐字节全等；本轮只读捕获和逐字节吸收，不编辑业务逻辑、不重建服务、不执行迁移、不写生产数据。

## 成熟参考与取舍

- Git `git bundle`：https://github.com/git/git/blob/master/Documentation/git-bundle.adoc （GPL-2.0）。借鉴完整 Git objects/refs 可验证传递和离线恢复的原则；本轮先建立准确 commit，后续标准发布再由 Sunny 现有 bundle/receipt 链路恢复可追溯性。
- Git repository layout：https://github.com/git/git/blob/master/Documentation/gitrepository-layout.adoc （GPL-2.0）。借鉴 object store、refs 与 worktree 分离，使用独立 worktree 隔离根脏工作树；不复制实现代码。
- SLSA：https://github.com/slsa-framework/slsa （Community Specification License 1.0）。借鉴构建来源应绑定不可变源码身份、构建步骤和产物证据；当前 47 为多批 `WHITELIST_CAS` 组合，不能冒充单一 Git 来源。本轮只恢复源码快照，不伪造历史或 provenance。
- Sunny 差异与取舍：47 源码目录不是 Git checkout，且组合来自多个已审核白名单任务；以当前运行时文件逐字节 checksum 作为唯一吸收事实，再提交为新的恢复基线。远端 `.env`、上传、备份、日志、数据库与 AppleDouble 元数据不进入候选。

## 行为保护与验收

- 行为保持：候选运行时文件必须与捕获时 47 逐字节一致；任何本地人工业务编辑均禁止。
- 并发保护：捕获前后必须校验 release ID 与完整远端 manifest 未变化；若变化，丢弃旧捕获并重来。
- 效果证据：`audit-47-source-drift.sh --summary --fail-on-drift` 返回 `CHANGED=0`、`LOCAL_ONLY=0`、`REMOTE_ONLY=0`。
- 安全证据：Shared/API/Web 类型检查、架构与安全契约、迁移清单只读核对、公网 health；不以 GitHub 项目替代 Sunny 本地与 47 证据。
