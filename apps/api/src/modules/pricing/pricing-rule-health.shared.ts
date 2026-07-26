import {
  hasScopedUsPostalRuleOverlap,
  isCanadaAddressScopeWarehouseCode,
  isInvalidWarehouseCodeRule,
  isUsPostalRuleSyntax,
  parseWarehouseCodeRules,
  type PriceBookRowSummary
} from '@siyuan/shared';

export function getUsPostalRuleHealthIssues(rows: Array<Pick<PriceBookRowSummary, 'postalRule' | 'channelName' | 'businessRouteName' | 'realChannelName' | 'minWeightKg' | 'maxWeightKg'>>) {
  const issues: string[] = [];
  const postalRules = rows.map((row) => row.postalRule);
  const normalized = postalRules.map((rule) => String(rule ?? '').trim()).filter(Boolean);
  if (postalRules.some((rule) => !String(rule ?? '').trim())) issues.push('美国价格行未配置邮编范围');
  if (normalized.some((rule) => !isUsPostalRuleSyntax(rule))) issues.push('美国价格行邮编规则格式无法解析');
  if (hasScopedUsPostalRuleOverlap(rows)) issues.push('同一渠道、价格组和重量段存在邮编区间重叠');
  return issues;
}

export function getWarehouseCodeRuleHealthIssues(warehouseCodes: Array<string | undefined | null>) {
  const invalidSegments = warehouseCodes.flatMap((code) =>
    isCanadaAddressScopeWarehouseCode(code)
      ? []
      : isInvalidWarehouseCodeRule(code)
      ? [String(code).replace(/^__INVALID_WAREHOUSE_RULE__:/, '')]
      : parseWarehouseCodeRules(code).invalidSegments
  );
  return Array.from(new Set(invalidSegments.map((segment) => `仓库编码规则无效：${segment}，需修正或重新导入`)));
}
