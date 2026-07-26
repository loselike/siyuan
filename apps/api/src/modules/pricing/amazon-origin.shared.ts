const amazonOriginWarehouseNames = [
  '义乌仓',
  '华东',
  '华南',
  '厦门/泉州/福州',
  '天津/南昌/石家庄',
  '武汉/长沙/成都',
  '汕头',
  '济南/潍坊',
  '深圳/广州仓',
  '西安/沧州/保定',
  '重庆',
  '青岛/郑州/温州/台州/连云港/南京/合肥'
];

export function normalizeAmazonOriginWarehouseName(value: unknown): string | undefined {
  const text = String(value ?? '')
    .replace(/[／｜|、，,；;]/g, '/')
    .replace(/\s+/g, '')
    .replace(/^(?:出货仓|起运仓|发货仓|发货地|起运地|来源地|仓库区域|揽收区域|报价组)[:：]?/, '')
    .trim();
  if (!text) return undefined;
  const compact = text.replace(/[()（）]/g, '');
  if (/^(?:仓库编码|仓库代码|亚马逊代码|FBA仓库代码|仓库|编码)$/i.test(compact)) {
    return undefined;
  }
  const matched = amazonOriginWarehouseNames.find((name) => compact.includes(name.replace(/[()（）]/g, '')));
  if (matched) return matched;
  if (/深圳/.test(compact) && /广州/.test(compact)) {
    return '深圳/广州仓';
  }
  if (/欧洲|西班牙|英国|铁路|空派|快递|海运|专线|渠道|DHL|UPS|FEDEX|美西|美东|包税|双清|卡派|海卡/i.test(compact)) {
    return undefined;
  }
  if (/(仓|华东|华南|义乌|深圳|广州|汕头|厦门|泉州|福州|天津|南昌|石家庄|武汉|长沙|成都|济南|潍坊|西安|沧州|保定|重庆|青岛|郑州|温州|台州|连云港|南京|合肥)/.test(compact)) {
    return compact.slice(0, 30);
  }
  return undefined;
}

export function uniqueAmazonOriginWarehouseNames(values: Array<unknown>): string[] {
  const unique = new Set(values.map(normalizeAmazonOriginWarehouseName).filter((value): value is string => Boolean(value)));
  return [...unique].sort((left, right) => {
    const leftIndex = amazonOriginWarehouseNames.indexOf(left);
    const rightIndex = amazonOriginWarehouseNames.indexOf(right);
    if (leftIndex !== -1 || rightIndex !== -1) {
      return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex);
    }
    return left.localeCompare(right, 'zh-CN');
  });
}
