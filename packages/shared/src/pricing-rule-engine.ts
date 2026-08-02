/**
 * Pure pricing-domain rules shared by workbook import and quote rendering.
 * Raw price-book cells remain unchanged; these functions only derive safe,
 * deterministic values used for matching and customer-facing presentation.
 */

export type CanadaAddressType = 'PRIVATE' | 'AMAZON';

export interface WarehouseCodeRuleParseResult {
  exactCodes: string[];
  prefixRules: string[];
  invalidSegments: string[];
}

export function normalizeWarehouseCodeRule(value?: string | null): string {
  return String(value ?? '').replace(/\s+/g, '').toUpperCase();
}

export function parseWarehouseCodeRules(value?: string | null): WarehouseCodeRuleParseResult {
  const normalized = normalizeWarehouseCodeRule(value)
    .replace(/[（）()【】\[\]]/g, '')
    .replace(/[\u3400-\u9FFF]+/g, ' ')
    .replace(/[，、,;；/|+\n\r]+/g, ' ')
    .trim();
  const exactCodes = new Set<string>();
  const prefixRules = new Set<string>();
  const invalidSegments: string[] = [];
  if (!normalized) return { exactCodes: [], prefixRules: [], invalidSegments: [] };

  for (const segment of normalized.split(/\s+/).filter(Boolean)) {
    const range = segment.match(/^([A-Z]+)(\d+)-([A-Z]+)(\d+)$/);
    if (range) {
      const [, startPrefix, startText, endPrefix, endText] = range;
      const start = Number(startText);
      const end = Number(endText);
      if (startPrefix !== endPrefix || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end < start || end - start > 999) {
        invalidSegments.push(segment);
        continue;
      }
      for (let index = start; index <= end; index += 1) exactCodes.add(`${startPrefix}${index}`);
      continue;
    }
    if (segment.includes('-')) {
      invalidSegments.push(segment);
    } else if (/^[A-Z]{2,8}$/.test(segment)) {
      prefixRules.add(segment);
    } else if (/^[A-Z]{2,8}\d[A-Z0-9]*$/.test(segment) || /^(?:[IX]US[A-Z]|IUTE)$/.test(segment)) {
      exactCodes.add(segment);
    } else {
      invalidSegments.push(segment);
    }
  }
  return { exactCodes: [...exactCodes], prefixRules: [...prefixRules], invalidSegments };
}

export function expandWarehouseCodeRules(value?: string | null): string[] {
  const parsed = parseWarehouseCodeRules(value);
  return [...parsed.exactCodes, ...parsed.prefixRules];
}

const invalidWarehouseCodeRulePrefix = '__INVALID_WAREHOUSE_RULE__:';
export const CANADA_PRIVATE_ADDRESS_WAREHOUSE_CODE = '__CANADA_PRIVATE_ADDRESS__';
export const CANADA_AMAZON_UNMAPPED_WAREHOUSE_CODE = '__CANADA_AMAZON_UNMAPPED__';
export const CANADA_ADDRESS_SCOPE_UNSPECIFIED_WAREHOUSE_CODE = '__CANADA_ADDRESS_SCOPE_UNSPECIFIED__';

export function normalizeCanadaAddressType(value?: string | null): CanadaAddressType {
  return String(value ?? '').trim().toUpperCase() === 'AMAZON' ? 'AMAZON' : 'PRIVATE';
}

export function normalizeCanadaAmazonWarehouseCode(value?: string | null): string | undefined {
  const normalized = String(value ?? '').trim().replace(/\s+/g, '').toUpperCase();
  return /^[A-Z]{3}[A-Z0-9]*$/.test(normalized) ? normalized : undefined;
}

export function normalizeCanadaAmazonWarehousePrefix(value?: string | null): string | undefined {
  return normalizeCanadaAmazonWarehouseCode(value)?.slice(0, 3);
}

export function isCanadaAddressScopeWarehouseCode(value?: string | null): boolean {
  const normalized = normalizeWarehouseCodeRule(value);
  return normalized === CANADA_PRIVATE_ADDRESS_WAREHOUSE_CODE
    || normalized === CANADA_AMAZON_UNMAPPED_WAREHOUSE_CODE
    || normalized === CANADA_ADDRESS_SCOPE_UNSPECIFIED_WAREHOUSE_CODE;
}

export function warehouseCodeRulesForImport(value?: string | null): string[] {
  const parsed = parseWarehouseCodeRules(value);
  return [...parsed.exactCodes, ...parsed.prefixRules, ...parsed.invalidSegments.map((segment) => `${invalidWarehouseCodeRulePrefix}${segment}`)];
}

export function isInvalidWarehouseCodeRule(value?: string | null): boolean {
  return normalizeWarehouseCodeRule(value).startsWith(invalidWarehouseCodeRulePrefix);
}

/** Lower rank means a more specific warehouse rule. */
export function matchWarehouseCodeRule(ruleValue: string | undefined | null, inputValue: string | undefined | null): 0 | 1 | undefined {
  const rule = normalizeWarehouseCodeRule(ruleValue);
  const input = normalizeWarehouseCodeRule(inputValue);
  if (!rule || !input) return undefined;
  if (rule === input) return 0;
  const parsed = parseWarehouseCodeRules(rule);
  if (parsed.exactCodes.includes(input)) return 0;
  return parsed.prefixRules.some((prefix) => input.startsWith(prefix) && /^\d/.test(input.slice(prefix.length))) ? 1 : undefined;
}

/** Private rows are exclusive; Amazon rows match exact codes unless the source explicitly defines a bare prefix. */
export function canadaAddressTypeMatchesWarehouseCode(
  rowWarehouseCode: string | undefined | null,
  addressType?: CanadaAddressType | string | null,
  amazonCode?: string | null
): boolean {
  const rowCode = normalizeWarehouseCodeRule(rowWarehouseCode);
  if (normalizeCanadaAddressType(addressType) === 'PRIVATE') {
    return !rowCode || rowCode === CANADA_PRIVATE_ADDRESS_WAREHOUSE_CODE;
  }
  const warehouseCode = normalizeCanadaAmazonWarehouseCode(amazonCode);
  if (!warehouseCode || !rowCode || isCanadaAddressScopeWarehouseCode(rowCode)) return false;
  // A mixed source cell such as `YVR+YXX2` means exactly what it says: YVR is
  // an explicit prefix rule, while YXX2 is an exact warehouse. Never collapse
  // the entered code to three letters, otherwise YXX1 would incorrectly use
  // the YXX2 price.
  const parsed = parseWarehouseCodeRules(rowCode);
  return parsed.prefixRules.includes(warehouseCode)
    || matchWarehouseCodeRule(rowCode, warehouseCode) !== undefined;
}

export function warehouseCodePrefixCandidates(value?: string | null): string[] {
  const prefix = normalizeWarehouseCodeRule(value).match(/^[A-Z]+/)?.[0] ?? '';
  return Array.from({ length: Math.max(0, prefix.length - 1) }, (_, index) => prefix.slice(0, index + 2));
}

export function sanitizePricingTransitLabel(value?: string | number | null): string | undefined {
  const source = cellToText(value).replace(/[：:]/g, ':').replace(/[－—–]/g, '-').replace(/[～]/g, '~').replace(/\s+/g, ' ').trim();
  if (!source) return undefined;
  const mainTransit = source.match(/(?:开船|发车|起飞|交货|提取)[^；;。\n]{0,28}?(\d+(?:\.\d+)?(?:[-~至到]\d+(?:\.\d+)?)?)(?:个)?(?:自然|工作)?(?:天|日)/i);
  const addressTransit = source.match(/(?:私人|商业|住宅|偏远|地址)[^；;。\n]{0,36}?(?:派送|时效|提取)?[^；;。\n]{0,16}?(\d+(?:\.\d+)?(?:[-~至到]\d+(?:\.\d+)?)?)(?:个)?(?:自然|工作)?(?:天|日)/i);
  if (mainTransit && addressTransit) {
    const values = [mainTransit[1], addressTransit[1]].flatMap((range) => range.split(/[-~至到]/).map(Number)).filter(Number.isFinite);
    if (values.length) return Math.min(...values) === Math.max(...values) ? `${Math.min(...values)}天` : `${Math.min(...values)}-${Math.max(...values)}天`;
  }
  const naturalDayPickup = source.match(/(?:交货(?:次日|后)?\s*)?\d+(?:\.\d+)?(?:[-~至到]\d+(?:\.\d+)?)?个自然日(?:内)?提取/i);
  if (naturalDayPickup) return naturalDayPickup[0].replace(/\s+/g, '');
  const trailingPickup = source.match(/\d+(?:\.\d+)?(?:[-~至到]\d+(?:\.\d+)?)?个?(?:自然|工作)?(?:天|日)(?:左右|内)?(?:提取|派送|交付|签收)/i);
  if (trailingPickup) return trailingPickup[0].replace(/\s+/g, '');
  const conciseTransit = source.match(/(?:开船|发车|航程|全程|派送|提取|起飞|交付|签收|时效)\s*(?:后|约|预计|至)?\s*\d+(?:\.\d+)?(?:[-~至到]\d+(?:\.\d+)?)?(?:个)?(?:自然|工作)?(?:天|日)(?:左右|提取|派送)?/i);
  if (conciseTransit) return conciseTransit[0].replace(/\s+/g, '');

  const segments = source.split(/[\n；;]/).map((segment) => segment
    .replace(/[（(][^）)]*(?:赔偿|赔付|理赔|封顶|金额|元\s*\/?\s*(?:kg|票)|附加费|加收|报关费|单询费)[^）)]*[）)]/gi, '')
    .replace(/[^，,。]*?(?:赔偿|赔付|理赔|封顶|附加费|加收|报关费|单询费)[^，,。]*/gi, '')
    .replace(/[^，,。]*?(?:地址|偏远|附加|费用|报关|单询)\s*(?:加|\+)?\s*\d+(?:\.\d+)?\s*元\s*\/?\s*(?:kg|票)[^，,。]*/gi, '')
    .replace(/(?:加|\+)\s*\d+(?:\.\d+)?\s*元\s*\/?\s*(?:kg|票)/gi, '')
    .replace(/最低\s*\d+(?:\.\d+)?\s*元\s*\/?\s*票/gi, '').trim())
    .flatMap((segment) => segment.split(/[。]/)).map((segment) => segment.trim()).filter(Boolean)
    .filter((segment) => !/(?:赔偿|赔付|理赔|封顶|附加费|加收|报关费|单询费|最低\s*\d|\+?\s*\d+(?:\.\d+)?\s*元\s*\/?\s*(?:kg|票))/i.test(segment))
    .filter((segment) => /\d+(?:\.\d+)?(?:[-~至到]\d+(?:\.\d+)?)?(?:个)?(?:自然|工作)?(?:天|日|days?)/i.test(segment.replace(/\s+/g, ''))
      && (/参考时效|全程时效|派送时效|运输时效|航程时效|船期|开船|发车|提取|起飞|飞|派送|交付|签收|时效/i.test(segment)
        || /^\d+(?:\.\d+)?(?:[-~至到]\d+(?:\.\d+)?)?(?:自然)?(?:天|日)(?:左右)?$/i.test(segment.replace(/\s+/g, ''))));
  const uniqueSegments = Array.from(new Set(segments));
  return uniqueSegments.length ? uniqueSegments.join('；').slice(0, 300) : undefined;
}

export function sanitizePricingChannelRequirement(value?: string | number | null, agentNames: Array<string | null | undefined> = []): string | undefined {
  let text = cellToText(value);
  if (!text) return undefined;
  Array.from(new Set(agentNames.map((name) => String(name ?? '').trim()).filter((name) => name.length >= 2)))
    .sort((left, right) => right.length - left.length)
    .forEach((name) => { text = text.replace(new RegExp(escapeRegExp(name), 'gi'), ''); });
  text = text
    .replace(/(^|[\n,，;；:：])\s*[\u3400-\u9fff（）()·]{2,40}(?:有限责任公司|股份有限公司|有限公司)/gmu, '$1')
    .replace(/\b[A-Z][A-Z0-9 .,&'()\-]{1,80}?(?:\bCO\.?\s*,?\s*(?:LTD\.?|LIMITED)\b|\bLIMITED\b|\bINC\.?\b|\bLLC\b)/gi, '');
  const sensitiveRequirementLine = /(?:操作中心|(?:提货|收货|入库|发货|仓库)(?:地址|上班时间|工作时间)|(?:地址|联系人|联系(?:人|方式)?|电话|手机|微信|whats\s*app|qq|tel|联系电话)|(?:广东省|浙江省|深圳市|广州市|义乌市|东莞市|佛山市|金华市).{0,32}(?:路|街|道|巷|号|栋|楼|园|区)|(?<!\d)1[3-9]\d{9}(?!\d))/i;
  const lines = text.split(/\r?\n/).map((line) => line.replace(/^[\s,，;；/|｜]+|[\s,，;；/|｜]+$/g, '').trim())
    .filter((line) => line && !/^(?:代理(?:公司)?|服务商|承运商)\s*[:：]?$/.test(line))
    .filter((line) => !sensitiveRequirementLine.test(line));
  return lines.length ? lines.join('\n') : undefined;
}

function cellToText(value?: string | number | null): string {
  return String(value ?? '').trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
