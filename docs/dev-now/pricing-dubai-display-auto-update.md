# 2026-07-14 报价查价迪拜价格表导入后图片自动更新

- 状态：completed
- 输入来源：用户任务卡 `2026-07-14-报价查价-迪拜价格表导入后图片自动更新`。
- 会话 slug：pricing-dubai-display-auto-update

## 输入摘要

- 目标：迪拜空运、海运图片在新导入且转换成功后按运输方式自动切到最新版本，失败继续保留对应旧版本。
- 不做：不恢复结构化迪拜查价，不改其他模块，不发布 47。

## 允许修改

- `apps/web/src/modules/pricing/`、`apps/web/src/apiClient.ts`
- `packages/shared/src/index.ts`
- `apps/api/src/modules/data.controller.ts`、两套仓储、Prisma schema 与最小迁移、报价测试。

## 当前进度

- 已将迪拜展示版本从单一全局当前标记扩展为 `isActiveAir`、`isActiveSea` 两个独立标记。
- 新导入转换成功后按本次包含的运输方式原子切换当前版本；仅导入空运不会替换海运，转换失败不动已有当前版本。
- 2026-07-14 补齐版本先后保护：自动导入/重新转换只可替换创建时间更早的当前版本；旧文件晚完成或重新转换时，不得覆盖更新导入的空运/海运展示。管理端为已完成但未激活的版本补充“设为当前展示”二次确认入口，作为自动切换异常的人工兜底。
- 图片地址增加版本更新时间参数；查价页每次进入迪拜模块重新读取当前版本。
- 管理端展示空/海运当前状态；失败版本可通过原始导入文件重新生成图片。

## 验证

- 通过：`npm run build -w @siyuan/shared`。
- 通过：`npm run typecheck -w @siyuan/api`、`npm run typecheck -w @siyuan/web`。
- 通过：`npm test -w @siyuan/web -- --run src/modules/pricing/pricing.test.tsx -t "迪拜|图片|版本|转换|缓存|空运|海运"`（8/8）。
- 通过：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.pricing.e2e.test.ts -t "dubai|image|version|render|fallback|cache"`（3/3），覆盖双表自动切换和仅空运导入时海运保留。
- 通过：`git diff --check`。

## 交接

- 阻塞：无；未发布 47（任务卡明确不发布）。

## 2026-07-15 47 展示版本人工切换

- 已按用户授权，仅调用 47 现有“设为当前展示”接口，将 `迪拜专线 7.13（生效）大客户.xlsx`（版本 `cmrk2kt8z04fkl901bqquuozl`）切为当前空运、海运展示版本。
- 未重新导入文件、未修改价格表行、未执行 migration 或代码发布；原 `6.29` 版本已自动取消当前标记。
- 已验证：目标版本 `isActive / isActiveAir / isActiveSea` 均为 true；展示接口解析到目标版本的空运 5 页、海运 2 页；发布审计记录已生成，Docker 服务正常运行。
