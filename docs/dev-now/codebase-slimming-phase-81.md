# 代码瘦身治理第八十一阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜81`
- 续接自：`docs/dev-now/codebase-slimming-phase-80.md`
- 上下文状态：`green`
- 输入来源：持续目标要求转回能消除真实请求或全量计算的高收益运行时切片
- 会话 slug：`codebase-slimming-phase-81`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-27 Asia/Shanghai`

## 输入摘要

- 目标：删除基础资料库客户页没有任何展示或业务消费者的客户审计请求，以及结果无人读取的运单与客户全量匹配。
- 固定样本：进入客户资料并自动选择第一条客户；客户列表、详情、编辑、联系人和现行系统审计看板保持不变。
- 硬边界：API 路径、HTTP 方法、参数、状态码、错误文案、返回字段、RBAC、字段裁剪、数据库、写入、状态流转、审计记录和页面入口不变。

## 修改

- `apps/web/src/App.tsx`
- `apps/web/src/modules/masterData/MasterDataPage.tsx`
- `docs/dev-now/codebase-slimming-phase-81.md`
- `.codex-state.md`

## 当前进度

- ESLint 直接证实 `customerAuditLogs` 只有写入、没有读取；对应 effect 在进入客户资料并选中客户后请求 `auditLogs({ target, pageSize: 3 })`，响应只写入这份死状态，页面没有任何渲染或业务消费者。
- 删除死状态和 effect 后，进入客户资料不再产生这次 GET；切换客户也不再重复产生同类请求。服务端审计路由、系统管理操作日志页面和所有审计写入均保持原位。
- ESLint 同时证实 `latestShipmentByCustomerId` 无消费者。删除前每次组件渲染都会遍历传入运单，并对每条运单线性查找客户；47 当前固定样本为8条运单、10个客户，最坏约80次无效匹配/次渲染。
- 删除该计算后，`MasterDataPage` 不再需要 `shipments` prop；App 只移除这一处死参数传递。客户表格、客户详情和联系人仍直接使用 `masterData`。
- 同步清理同文件四个无用导入。生产源码增加5行、删除38行，净减少33行；47源码减少1,455 bytes。
- 47运行主 index 由896,638 bytes / gzip 256,405 bytes 降至896,029 / gzip 256,180 bytes，减少609 bytes / gzip 225 bytes。

## 验证

- 两个目标文件 TypeScript 独立转译通过；目标 ESLint 在关闭文件既有 `Blob no-undef` 规则后0问题，原先四个 unused 告警已清零；`git diff --check` 通过。
- Web全量 typecheck仍只被既有财务响应夹具与仓库理货测试夹具6个错误阻断，两个目标文件没有错误。
- MasterData整页固定样本在安全runner运行30秒仍无测试结果，已按规则停止，不记为通过；首次调用因重复传入runner已自带的worker参数立即失败，未产生代码结论。
- 已基于47当前线上源码应用两文件白名单补丁，保留线上独有的 `initialSection` 等差异；远端相对备份净增5行、删除38行，目标符号和死 prop 均为0。
- 47 Web production build通过，3,392个模块完成转换；只重建/重启Web，无API构建、无迁移。
- 新镜像已运行，Web/API/Postgres/Redis均为running；公网首页与 `/api/health` 均为200，审计路由未登录仍返回401及原文案“缺少登录凭证”，最近实际 ERROR/FATAL/Unhandled 日志为0。
- 第80阶段新增遗留物门禁在本次补丁发布中立即发现 `patch` 自动生成的两份 `.orig`；它们与阶段备份逐字一致后已删除，最终远端遗留物数量和字节数均为0。内容漂移保持 `55 changed + 45 remote-only`。

## 交接

- 阻塞：无。
- 发布状态：`已发布47`；Web已重建/重启，无迁移。
- 恢复点：`/opt/siyuan/backups/codex-20260727-codebase-slimming-phase-81/`。
- 准确下一步：继续在现有高密度页面中扫描同类“只写不读状态 + 无消费者请求/计算”，优先处理 CustomerService、Pricing、Warehouse 已由 ESLint 直接标出的生产死代码，但单阶段仍限制为一个业务页面。
