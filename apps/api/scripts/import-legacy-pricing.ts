import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { PrismaClient } from '@prisma/client';

type LegacyModule = 'amazon' | 'inquiry' | 'europeExpress' | 'southAfrica';

type ImportPlanItem = {
  module: LegacyModule;
  files: string[];
};

const prisma = new PrismaClient();

const resolvedSourceRoot = getArg('--source') ?? process.env.LEGACY_QUOTE_APP_PATH;
const confirmed = hasFlag('--confirm') || process.env.LEGACY_PRICING_IMPORT_CONFIRM === 'true';
if (!resolvedSourceRoot) {
  throw new Error('pricing:legacy:import 需要显式传入 --source 或 LEGACY_QUOTE_APP_PATH，禁止默认读取 /opt/quote-app');
}
if (!confirmed) {
  throw new Error('pricing:legacy:import 会写入旧报价数据，必须显式传入 --confirm 或 LEGACY_PRICING_IMPORT_CONFIRM=true');
}
const sourceRoot = resolvedSourceRoot;

const importPlan: ImportPlanItem[] = [
  { module: 'amazon', files: ['data/quotes.json'] },
  { module: 'inquiry', files: ['inquiry_data/prices.json'] },
  { module: 'europeExpress', files: ['europe-express-data/prices.json', 'europe-truck-data/prices.json'] },
  { module: 'southAfrica', files: ['south-africa/prices.json', 'south-africa/data.json'] }
];

async function main() {
  const summary: Array<{ module: LegacyModule; fileName: string; rowCount: number; skipped?: true }> = [];
  for (const item of importPlan) {
    for (const relativePath of item.files) {
      const filePath = join(sourceRoot, relativePath);
      if (!existsSync(filePath)) {
        summary.push({ module: item.module, fileName: relativePath, rowCount: 0, skipped: true });
        continue;
      }
      const rowCount = await importPricingFile(item.module, relativePath, filePath);
      summary.push({ module: item.module, fileName: relativePath, rowCount });
    }

    const directoryFallback = item.files.find((file) => file.includes('/'))?.split('/')[0];
    if (directoryFallback) {
      await importExtraJsonFiles(item.module, directoryFallback, summary);
    }
  }
  console.table(summary);
}

async function importExtraJsonFiles(module: LegacyModule, directory: string, summary: Array<{ module: LegacyModule; fileName: string; rowCount: number; skipped?: true }>) {
  const directoryPath = join(sourceRoot, directory);
  if (!existsSync(directoryPath)) return;
  const planned = new Set(importPlan.flatMap((item) => item.files));
  for (const name of readdirSync(directoryPath)) {
    const relativePath = `${directory}/${name}`;
    const filePath = join(sourceRoot, relativePath);
    if (!name.endsWith('.json') || planned.has(relativePath)) continue;
    const rowCount = await importPricingFile(module, relativePath, filePath);
    if (!rowCount) continue;
    summary.push({ module, fileName: relativePath, rowCount });
  }
}

async function importPricingFile(module: LegacyModule, relativePath: string, filePath: string) {
  const rows = extractRows(JSON.parse(readFileSync(filePath, 'utf8'))).map((row) => normalizeRow(module, relativePath, row));
  if (!rows.length) return 0;
  await prisma.legacyPricingSource.updateMany({
    where: { module, fileName: relativePath, deletedAt: null },
    data: { deletedAt: new Date() }
  });
  const source = await prisma.legacyPricingSource.create({
    data: {
      module,
      fileName: relativePath,
      rowCount: rows.length
    }
  });
  for (const chunk of chunkRows(rows, 500)) {
    await prisma.legacyPricingRow.createMany({
      data: chunk.map((row) => ({ ...row, sourceId: source.id }))
    });
  }
  return rows.length;
}

function* chunkRows<T>(rows: T[], size: number) {
  for (let index = 0; index < rows.length; index += size) {
    yield rows.slice(index, index + size);
  }
}

function extractRows(value: unknown, context: Record<string, unknown> = {}): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.flatMap((item) => extractRows(item, context));
  }
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  const arrays = Object.entries(record).filter(([, child]) => Array.isArray(child));
  if (!arrays.length) return [{ ...context, ...record }];
  return arrays.flatMap(([key, child]) => {
    const nextContext = { ...context, [key.endsWith('s') ? key.slice(0, -1) : key]: key };
    return extractRows(child, { ...nextContext, ...Object.fromEntries(Object.entries(record).filter(([, nested]) => !Array.isArray(nested) && typeof nested !== 'object')) });
  });
}

function normalizeRow(module: LegacyModule, fileName: string, raw: Record<string, unknown>) {
  const costPerKg = numberValue(raw.costPerKg ?? raw.price ?? raw.rate ?? raw['单价'] ?? raw['价格'] ?? raw['12KG+'] ?? raw['51KG+'] ?? raw['100KG+']);
  const cbmPrice = numberValue(raw.cbmPrice ?? raw.cbm ?? raw['方数'] ?? raw['按方包税'] ?? raw['按方不包税'] ?? raw['按方未标注']);
  return {
    module,
    agentName: textValue(raw.agentName ?? raw.agent ?? raw['代理'] ?? raw['代理名称'] ?? raw.sourceAgent) ?? inferAgentName(fileName),
    origin: textValue(raw.origin ?? raw['出货仓'] ?? raw['报价组'] ?? raw.warehouseGroup),
    channelName: textValue(raw.channelName ?? raw.channel ?? raw.route ?? raw['渠道'] ?? raw['渠道名'] ?? raw['线路']) ?? basename(fileName, '.json'),
    serviceName: textValue(raw.serviceName ?? raw.service ?? raw['服务'] ?? raw['真实渠道']),
    warehouseCode: textValue(raw.warehouseCode ?? raw.code ?? raw.amazonCode ?? raw['仓库代码']),
    destinationCountry: textValue(raw.destinationCountry ?? raw.country ?? raw.region ?? raw['国家'] ?? raw['目的地']),
    postalRule: textValue(raw.postalRule ?? raw.postalCode ?? raw.zip ?? raw['邮编'] ?? raw['邮编规则']),
    minWeightKg: numberValue(raw.minWeightKg ?? raw.minKg ?? raw['最小重量']),
    maxWeightKg: numberValue(raw.maxWeightKg ?? raw.maxKg ?? raw['最大重量']),
    costPerKg,
    cbmPrice,
    tierLabel: textValue(raw.tierLabel ?? raw.tier ?? raw.label ?? raw['重量段'] ?? (costPerKg ? '按重量' : undefined)),
    transitLabel: textValue(raw.transitLabel ?? raw.transit ?? raw['参考时效'] ?? raw['时效']),
    productSurchargeRemark: textValue(raw.productSurchargeRemark ?? raw.productSurcharge ?? raw['产品附加']),
    specialRemark: textValue(raw.specialRemark ?? raw.specialNotes ?? raw.dimensionRule ?? raw['特别说明'] ?? raw['尺寸要求']),
    remark: textValue(raw.remark ?? raw.notes ?? raw.note ?? raw['备注']),
    raw: { ...raw, sourceFile: fileName }
  };
}

function getArg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function textValue(value: unknown) {
  const text = String(value ?? '').trim();
  return text || undefined;
}

function numberValue(value: unknown) {
  const number = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function inferAgentName(fileName: string) {
  if (/south/i.test(fileName) || fileName.includes('南非')) return '南非专线';
  if (/truck|express|europe/i.test(fileName) || fileName.includes('欧洲')) return '亮崽欧洲';
  return '亮崽';
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
