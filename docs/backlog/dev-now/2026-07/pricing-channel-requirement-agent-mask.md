# 查价渠道要求代理公司名底层屏蔽

- 范围：常规查价、亚马逊、欧洲超大件、欧洲空海运铁路快递、南非、美国空海运、加拿大空海运，以及迪拜价格表的渠道要求展示。
- 实现：API 控制器在所有查价响应序列化前，从代理资料库读取全部代理的名称、简称和代码，统一清洗 `remark`、`productSurchargeRemark`、`specialRemark`；迪拜表格同步清洗 `channelRequirement`。原始价格表和内部管理接口不改写。
- 规则：删除任一已维护代理的名称、简称或代码，以及中国大陆法定公司全称和带 Co./Ltd/Inc./LLC 等后缀的英文公司全称，保留其余渠道限制文字。
- 验证：`npm test -w @siyuan/api -- --run src/modules/app.pricing.e2e.test.ts -t "agent company|渠道要求代理|Dubai air and sea price tables|standard quote response"`、`npm run typecheck -w @siyuan/api`、`git diff --check` 通过。
- 发布：未发布 47。
