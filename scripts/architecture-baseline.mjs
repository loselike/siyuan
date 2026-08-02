import { access, readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import ts from 'typescript';

const repositoryRoot = process.cwd();
const apiSourceRoot = path.join(repositoryRoot, 'apps/api/src');
const webSourceRoot = path.join(repositoryRoot, 'apps/web/src');
const sharedSourceRoot = path.join(repositoryRoot, 'packages/shared/src');
const prismaSchemaPath = path.join(repositoryRoot, 'apps/api/prisma/schema.prisma');

async function listFiles(directory, predicate = () => true) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'dist' || entry.name === 'node_modules') continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(target, predicate));
    else if (predicate(target)) files.push(target);
  }
  return files.sort();
}

function repositoryPath(filePath) {
  return path.relative(repositoryRoot, filePath).split(path.sep).join('/');
}

function lineNumber(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function decoratorsOf(node) {
  return ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : [];
}

function decoratorCall(decorator) {
  if (!ts.isCallExpression(decorator.expression)) {
    return { name: decorator.expression.getText(), arguments: [], nonCall: true };
  }
  const callee = decorator.expression.expression;
  const name = ts.isIdentifier(callee) ? callee.text : callee.getText();
  return { name, arguments: [...decorator.expression.arguments], nonCall: false };
}

function stringValue(expression) {
  if (!expression) return '';
  if (ts.isStringLiteralLike(expression)) return expression.text;
  return expression.getText();
}

function stringValues(expression) {
  if (!expression) return [];
  if (ts.isArrayLiteralExpression(expression)) return expression.elements.map(stringValue);
  return [stringValue(expression)];
}

function joinRoute(controllerPath, methodPath) {
  const parts = [controllerPath, methodPath]
    .flatMap((part) => part.split('/'))
    .map((part) => part.trim())
    .filter(Boolean);
  return `/${parts.join('/')}` || '/';
}

async function scanApiRoutes() {
  const files = await listFiles(apiSourceRoot, (file) => {
    return file.endsWith('.ts')
      && !file.endsWith('.d.ts')
      && !file.endsWith('.test.ts')
      && !file.includes(`${path.sep}test-support${path.sep}`);
  });
  const sources = [];
  for (const file of files) {
    const sourceText = await readFile(file, 'utf8');
    sources.push({ file, sourceText });
  }
  const registeredControllers = new Set();
  for (const { file, sourceText } of sources) {
    for (const name of scanRegisteredControllerNames(file, sourceText)) registeredControllers.add(name);
  }
  const routes = [];
  const recognizedControllers = new Set();
  for (const { file, sourceText } of sources) {
    const result = scanControllerSource(file, sourceText, registeredControllers);
    routes.push(...result.routes);
    for (const name of result.recognizedControllers) recognizedControllers.add(name);
  }
  for (const name of registeredControllers) {
    if (!recognizedControllers.has(name)) throw new Error(`registered Nest controller is missing a standard @Controller(...) decorator: ${name}`);
  }
  return routes.sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line);
}

function scanRegisteredControllerNames(file, sourceText) {
  const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const names = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isClassDeclaration(statement)) continue;
    const moduleDecorator = decoratorsOf(statement).map(decoratorCall).find((item) => item.name === 'Module');
    if (!moduleDecorator) continue;
    const metadata = moduleDecorator?.arguments[0];
    if (!metadata || !ts.isObjectLiteralExpression(metadata)) {
      throw new Error(`unsupported @Module metadata in ${repositoryPath(file)}:${lineNumber(sourceFile, statement)}; use an inline object literal`);
    }
    const controllersProperty = metadata.properties.find((property) => {
      return property.name?.getText(sourceFile).replaceAll(/["']/g, '') === 'controllers';
    });
    if (!controllersProperty) continue;
    if (!ts.isPropertyAssignment(controllersProperty) || !ts.isArrayLiteralExpression(controllersProperty.initializer)) {
      throw new Error(`unsupported @Module controllers registration in ${repositoryPath(file)}:${lineNumber(sourceFile, controllersProperty)}; use an inline array literal`);
    }
    for (const element of controllersProperty.initializer.elements) {
      if (!ts.isIdentifier(element)) throw new Error(`unsupported Nest controllers registration in ${repositoryPath(file)}:${lineNumber(sourceFile, element)}`);
      names.push(element.text);
    }
  }
  return names;
}

function scanControllerSource(file, sourceText, registeredControllers = new Set()) {
  const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const routes = [];
  const recognizedControllers = [];
  const httpDecoratorNames = ['Get', 'Post', 'Put', 'Patch', 'Delete', 'Options', 'Head', 'All', 'Sse'];
  for (const statement of sourceFile.statements) {
    if (!ts.isClassDeclaration(statement) || !statement.name) continue;
    const classDecorators = decoratorsOf(statement).map(decoratorCall).filter(Boolean);
    const controller = classDecorators.find((item) => item.name === 'Controller');
    if (!controller) {
      if (registeredControllers.has(statement.name.text)) {
        throw new Error(`registered Nest controller must use a standard @Controller(...) decorator: ${repositoryPath(file)} ${statement.name.text}`);
      }
      continue;
    }
    recognizedControllers.push(statement.name.text);
    const controllerPath = stringValue(controller.arguments[0]);
    const classPermission = classDecorators.find((item) => item.name === 'RequirePermission');
    const classAuth = classDecorators.some((item) => item.name === 'RequireAuth');
    for (const member of statement.members) {
      if (!ts.isMethodDeclaration(member) || !member.name) continue;
      const methodDecorators = decoratorsOf(member).map(decoratorCall).filter(Boolean);
      const http = methodDecorators.find((item) => httpDecoratorNames.includes(item.name));
      if (!http) {
        if (methodDecorators.length) {
          throw new Error(`unrecognized decorated controller method: ${repositoryPath(file)}:${lineNumber(sourceFile, member)} ${statement.name.text}.${member.name.getText(sourceFile)} decorators=${methodDecorators.map((item) => item.name).join(',')}`);
        }
        continue;
      }
      const permission = methodDecorators.find((item) => item.name === 'RequirePermission') ?? classPermission;
      const requireAuth = classAuth || methodDecorators.some((item) => item.name === 'RequireAuth');
      routes.push({
        controller: statement.name.text,
        handler: member.name.getText(sourceFile),
        method: http.name.toUpperCase(),
        route: joinRoute(controllerPath, stringValue(http.arguments[0])),
        auth: permission ? 'permission' : requireAuth ? 'auth' : 'none',
        permissions: permission ? stringValues(permission.arguments[0]) : [],
        file: repositoryPath(file),
        line: lineNumber(sourceFile, member)
      });
    }
  }
  return { routes, recognizedControllers };
}

function domainForRoute(route) {
  const value = route.replace(/^\//, '');
  if (/^(auth|me|profile|login-logs|account-events|change-password)/.test(value)) return 'identity-access';
  if (/^(notifications|announcements|notification-operations)/.test(value)) return 'notifications';
  if (/^(finance|receivables|water-receipts|payment|payments|payable|business-cost|customer-accounts)/.test(value)) return 'finance';
  if (/^(warehouse|integrations\/mojia)/.test(value)) return 'warehouse';
  if (/^(pricing|price|legacy-pricing|agent-markup|south-africa|dubai)/.test(value)) return 'pricing';
  if (/^(master-data|customers|agents|channels|carriers|sites|departments|roles|staff)/.test(value)) return 'master-data';
  if (/^(problem-tickets|common-tags)/.test(value)) return 'customer-service';
  if (/^(tracking|carrier-tasks)/.test(value)) return 'tracking';
  if (/^(shipments|business|operations|customer-service)/.test(value)) return 'shipment-flow';
  if (/^(health|system|audit|lineage|client-errors)/.test(value)) return 'platform';
  if (/^ai/.test(value)) return 'ai';
  return 'unclassified';
}

async function scanPrismaModels() {
  const sourceText = await readFile(prismaSchemaPath, 'utf8');
  const lines = sourceText.split(/\r?\n/);
  const modelNames = lines.flatMap((line) => {
    const match = line.match(/^model\s+(\w+)\s*\{/);
    return match ? [match[1]] : [];
  });
  const modelNameSet = new Set(modelNames);
  const models = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^model\s+(\w+)\s*\{/);
    if (!match) continue;
    const start = index;
    const body = [];
    for (index += 1; index < lines.length && !/^}\s*$/.test(lines[index]); index += 1) body.push(lines[index]);
    const relations = new Set();
    for (const line of body) {
      const field = line.trim().match(/^\w+\s+([A-Z]\w+)(?:\[\])?\??(?:\s|$)/);
      if (field && modelNameSet.has(field[1]) && field[1] !== match[1]) relations.add(field[1]);
    }
    models.push({ name: match[1], line: start + 1, relations: [...relations].sort() });
  }
  return models;
}

function domainForModel(modelName) {
  const domains = [
    ['identity-access', /^(User|UserModuleReadState|Role|Permission|Department|LoginLog)$/],
    ['master-data', /^(Customer|CustomerContact|CustomerAccount|Agent|AgentChannel|Carrier|Channel|ChannelCategory|Site|FinanceCatalogItem|PayerBankAccount)$/],
    ['shipment-flow', /^(Shipment|ShipmentLabel|ShipmentPackage|ShipmentEvent)$/],
    ['customer-service', /^(ProblemTicket|CommonTag|ProblemReply)$/],
    ['tracking', /^(CarrierTask|TrackingEvent)$/],
    ['pricing', /^(Price|Pricing|AgentPriceBook|AgentMarkup|AgentChannelCustomRemark|Dubai|LegacyPricing|SouthAfrica)/],
    ['warehouse', /^(Warehouse|MojiaRequestSample)/],
    ['finance', /^(Surcharge|FuelRate|ExchangeRate|Receivable|Payable|ShipmentFinanceItem|AgentBankAccount|PayeeBankAccount|Payment|Finance|PayerBankAccount|CustomerStatement|AgentStatement|Settlement|AccountLedger|WaterReceipt)/],
    ['notifications', /^(Announcement|Notification)/],
    ['platform', /^(ImportJob|ExportJob|AuditLog)$/]
  ];
  return domains.find(([, pattern]) => pattern.test(modelName))?.[0] ?? 'unclassified';
}

async function scanWebClient() {
  const file = path.join(webSourceRoot, 'apiClient.ts');
  const sourceText = await readFile(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const methods = [];
  function requestCalls(node, result) {
    if (
      ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && node.expression.expression.kind === ts.SyntaxKind.ThisKeyword
      && node.expression.name.text === 'request'
    ) {
      result.push(node.arguments[0]?.getText(sourceFile) ?? 'unknown');
    }
    ts.forEachChild(node, (child) => requestCalls(child, result));
  }
  for (const statement of sourceFile.statements) {
    if (!ts.isClassDeclaration(statement) || statement.name?.text !== 'ApiClient') continue;
    for (const member of statement.members) {
      if (!ts.isMethodDeclaration(member) || !member.name || !member.body) continue;
      const requests = [];
      requestCalls(member.body, requests);
      methods.push({
        method: member.name.getText(sourceFile),
        requests,
        line: lineNumber(sourceFile, member)
      });
    }
  }
  return methods;
}

async function lineMetrics() {
  const roots = [apiSourceRoot, webSourceRoot, sharedSourceRoot];
  const files = (await Promise.all(roots.map((root) => listFiles(root, (file) => /\.(ts|tsx|css)$/.test(file))))).flat();
  const rows = [];
  let asAny = 0;
  let processEnv = 0;
  const sharedConsumers = [];
  for (const file of files) {
    const sourceText = await readFile(file, 'utf8');
    const lines = sourceText === '' ? 0 : sourceText.split(/\r?\n/).length;
    const test = /\.test\.(ts|tsx)$/.test(file)
      || /(?:^|[\\/])testSupport(?:[\\/])/.test(file)
      || /(?:^|[\\/])test-support(?:[\\/])/.test(file)
      || /(?:^|[\\/])test-setup\.(ts|tsx)$/.test(file);
    rows.push({ file: repositoryPath(file), lines, test });
    if (!test) {
      asAny += (sourceText.match(/\bas\s+any\b/g) ?? []).length;
      processEnv += (sourceText.match(/\bprocess\.env\b/g) ?? []).length;
      if (sourceText.includes("from '@siyuan/shared'") || sourceText.includes('from "@siyuan/shared"')) sharedConsumers.push(repositoryPath(file));
    }
  }
  return {
    files: rows,
    asAny,
    processEnv,
    sharedConsumers: sharedConsumers.sort()
  };
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveSourceImport(fromFile, specifier) {
  let base;
  if (specifier === '@siyuan/shared') base = path.join(sharedSourceRoot, 'index');
  else if (specifier.startsWith('@siyuan/shared/')) base = path.join(sharedSourceRoot, specifier.slice('@siyuan/shared/'.length));
  else if (specifier.startsWith('@/')) base = path.join(webSourceRoot, specifier.slice(2));
  else if (specifier.startsWith('.')) base = path.resolve(path.dirname(fromFile), specifier.replace(/\.js$/, ''));
  else return undefined;

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx')
  ];
  for (const candidate of candidates) {
    if (await pathExists(candidate)) return candidate;
  }
  return undefined;
}

async function scanDependencies() {
  const roots = [apiSourceRoot, webSourceRoot, sharedSourceRoot];
  const files = (await Promise.all(roots.map((root) => listFiles(root, (file) => {
    return /\.(ts|tsx)$/.test(file)
      && !/\.test\.(ts|tsx)$/.test(file)
      && !/(?:^|[\\/])testSupport(?:[\\/])/.test(file)
      && !/(?:^|[\\/])test-support(?:[\\/])/.test(file)
      && !/(?:^|[\\/])test-setup\.(ts|tsx)$/.test(file);
  })))).flat();
  const fileSet = new Set(files);
  const graph = new Map(files.map((file) => [file, new Set()]));
  const hashes = new Map();

  for (const file of files) {
    const sourceText = await readFile(file, 'utf8');
    const sourceFile = ts.createSourceFile(
      file,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    const specifiers = [];
    function visit(node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
        specifiers.push(node.moduleSpecifier.text);
      } else if (
        ts.isCallExpression(node)
        && node.expression.kind === ts.SyntaxKind.ImportKeyword
        && node.arguments[0]
        && ts.isStringLiteralLike(node.arguments[0])
      ) {
        specifiers.push(node.arguments[0].text);
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
    for (const specifier of specifiers) {
      const target = await resolveSourceImport(file, specifier);
      if (target && fileSet.has(target)) graph.get(file).add(target);
    }
    const hash = createHash('sha256').update(sourceText).digest('hex');
    const group = hashes.get(hash) ?? [];
    group.push(file);
    hashes.set(hash, group);
  }

  let index = 0;
  const indices = new Map();
  const lowLinks = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];
  function strongConnect(file) {
    indices.set(file, index);
    lowLinks.set(file, index);
    index += 1;
    stack.push(file);
    onStack.add(file);
    for (const target of graph.get(file)) {
      if (!indices.has(target)) {
        strongConnect(target);
        lowLinks.set(file, Math.min(lowLinks.get(file), lowLinks.get(target)));
      } else if (onStack.has(target)) {
        lowLinks.set(file, Math.min(lowLinks.get(file), indices.get(target)));
      }
    }
    if (lowLinks.get(file) !== indices.get(file)) return;
    const component = [];
    let target;
    do {
      target = stack.pop();
      onStack.delete(target);
      component.push(target);
    } while (target !== file);
    if (component.length > 1 || graph.get(file).has(file)) components.push(component.sort());
  }
  for (const file of files) if (!indices.has(file)) strongConnect(file);

  const inDegree = new Map(files.map((file) => [file, 0]));
  for (const targets of graph.values()) {
    for (const target of targets) inDegree.set(target, inDegree.get(target) + 1);
  }
  const entryPoints = new Set([
    path.join(apiSourceRoot, 'main.ts'),
    path.join(webSourceRoot, 'main.tsx'),
    path.join(sharedSourceRoot, 'index.ts')
  ]);
  const orphanCandidates = files
    .filter((file) => inDegree.get(file) === 0 && !entryPoints.has(file) && !file.endsWith('.d.ts'))
    .sort();
  const exactDuplicates = [...hashes.values()].filter((group) => group.length > 1);
  const edges = [...graph.entries()].flatMap(([source, targets]) => [...targets].map((target) => ({ source, target })));
  const crossWorkspaceEdges = edges.filter(({ source, target }) => repositoryPath(source).split('/src/')[0] !== repositoryPath(target).split('/src/')[0]);
  return {
    nodeCount: files.length,
    edgeCount: edges.length,
    cycles: components.map((component) => component.map(repositoryPath)),
    orphanCandidates: orphanCandidates.map(repositoryPath),
    exactDuplicates: exactDuplicates.map((group) => group.map(repositoryPath)),
    crossWorkspaceEdges: crossWorkspaceEdges.map(({ source, target }) => ({ source: repositoryPath(source), target: repositoryPath(target) }))
  };
}

async function repositoryParity() {
  const targets = [
    ['PrismaRepository', path.join(apiSourceRoot, 'modules/prisma.repository.ts')],
    ['InMemoryRepository', path.join(apiSourceRoot, 'modules/in-memory.repository.ts')]
  ];
  const methodsByClass = new Map();
  for (const [className, file] of targets) {
    const sourceText = await readFile(file, 'utf8');
    const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const methods = [];
    for (const statement of sourceFile.statements) {
      if (!ts.isClassDeclaration(statement) || statement.name?.text !== className) continue;
      for (const member of statement.members) {
        if (ts.isMethodDeclaration(member) && member.name) methods.push(member.name.getText(sourceFile));
      }
    }
    methodsByClass.set(className, [...new Set(methods)].sort());
  }
  const prisma = methodsByClass.get('PrismaRepository');
  const memory = methodsByClass.get('InMemoryRepository');
  const prismaSet = new Set(prisma);
  const memorySet = new Set(memory);
  return {
    prisma,
    memory,
    shared: prisma.filter((method) => memorySet.has(method)),
    prismaOnly: prisma.filter((method) => !memorySet.has(method)),
    memoryOnly: memory.filter((method) => !prismaSet.has(method))
  };
}

function printApiRoutes(routes) {
  console.log('# API 路由与权限元数据基线');
  console.log('');
  console.log('> 此表只记录源码装饰器元数据，不等同于越权结论。`none` 还可能由设备令牌等路由内逻辑保护。');
  console.log('');
  console.log('| 候选领域 | Method | Route | Controller.handler | 鉴权元数据 | 权限 | 证据 |');
  console.log('| --- | --- | --- | --- | --- | --- | --- |');
  for (const route of routes) {
    const permissions = route.permissions.length ? route.permissions.map((item) => `\`${item}\``).join('<br>') : '—';
    console.log(`| ${domainForRoute(route.route)} | ${route.method} | \`${route.route}\` | \`${route.controller}.${route.handler}\` | ${route.auth} | ${permissions} | \`${route.file}:${route.line}\` |`);
  }
}

function printPrismaModels(models) {
  console.log('# Prisma 模型目录基线');
  console.log('');
  console.log('> “候选领域”是按模型名称形成的治理假设，必须在后续领域访谈中确认；关系只记录 Prisma 类型引用。');
  console.log('');
  console.log('| 模型 | 候选领域 | 关联模型 | 证据 |');
  console.log('| --- | --- | --- | --- |');
  for (const model of models) {
    console.log(`| \`${model.name}\` | ${domainForModel(model.name)} | ${model.relations.map((item) => `\`${item}\``).join(', ') || '—'} | \`apps/api/prisma/schema.prisma:${model.line}\` |`);
  }
}

function printWebClient(methods) {
  console.log('# Web ApiClient 方法基线');
  console.log('');
  console.log('> Route 表达式保持源码形式；没有直接调用 `this.request` 的方法可能只是组合或兼容入口。');
  console.log('');
  console.log('| 方法 | 直接请求表达式 | 证据 |');
  console.log('| --- | --- | --- |');
  for (const method of methods) {
    const requests = method.requests.length ? method.requests.map((item) => `\`${item.replaceAll('|', '\\|')}\``).join('<br>') : '—';
    console.log(`| \`${method.method}\` | ${requests} | \`apps/web/src/apiClient.ts:${method.line}\` |`);
  }
}

function printDependencies(dependencies, parity) {
  console.log('# 源码依赖、孤儿候选与重复实现基线');
  console.log('');
  console.log('> 只分析生产 TypeScript/TSX 的静态 import/export/dynamic import。孤儿项是复核候选，不等于可删除；运行时注册、脚本、CSS 和字符串路径不在图内。');
  console.log('');
  console.log('| 指标 | 数值 |');
  console.log('| --- | ---: |');
  console.log(`| 依赖图节点 | ${dependencies.nodeCount} |`);
  console.log(`| 内部依赖边 | ${dependencies.edgeCount} |`);
  console.log(`| 跨 workspace 依赖边 | ${dependencies.crossWorkspaceEdges.length} |`);
  console.log(`| 强连通循环组 | ${dependencies.cycles.length} |`);
  console.log(`| 入度为 0 的孤儿候选 | ${dependencies.orphanCandidates.length} |`);
  console.log(`| 完全相同源码文件组 | ${dependencies.exactDuplicates.length} |`);
  console.log(`| PrismaRepository 方法 | ${parity.prisma.length} |`);
  console.log(`| InMemoryRepository 方法 | ${parity.memory.length} |`);
  console.log(`| 两个 Repository 同名方法 | ${parity.shared.length} |`);
  console.log(`| 仅 PrismaRepository | ${parity.prismaOnly.length} |`);
  console.log(`| 仅 InMemoryRepository | ${parity.memoryOnly.length} |`);
  console.log('');
  console.log('## 循环依赖组');
  console.log('');
  if (!dependencies.cycles.length) console.log('静态 TypeScript 依赖图未发现强连通循环。');
  for (const [cycleIndex, cycle] of dependencies.cycles.entries()) {
    console.log(`${cycleIndex + 1}. ${cycle.map((file) => `\`${file}\``).join(' ↔ ')}`);
  }
  console.log('');
  console.log('## 孤儿候选');
  console.log('');
  for (const file of dependencies.orphanCandidates) console.log(`- \`${file}\``);
  console.log('');
  console.log('## 完全相同源码文件组');
  console.log('');
  if (!dependencies.exactDuplicates.length) console.log('未发现内容完全相同的生产 TypeScript/TSX 文件。');
  for (const group of dependencies.exactDuplicates) console.log(`- ${group.map((file) => `\`${file}\``).join(' = ')}`);
  console.log('');
  console.log('## 双 Repository 同名方法');
  console.log('');
  console.log('> 同名只证明需要双维护，不证明实现语义相同。');
  console.log('');
  const sharedPreview = parity.shared.slice(0, 40).map((method) => `\`${method}\``).join(', ');
  console.log(`- 同名 ${parity.shared.length}；前 40 个：${sharedPreview}${parity.shared.length > 40 ? `；其余 ${parity.shared.length - 40} 个可通过 \`json\` 命令复核` : ''}`);
  console.log(`- 仅 Prisma ${parity.prismaOnly.length}：${parity.prismaOnly.map((method) => `\`${method}\``).join(', ') || '—'}`);
  console.log(`- 仅内存 ${parity.memoryOnly.length}：${parity.memoryOnly.map((method) => `\`${method}\``).join(', ') || '—'}`);
}

function printSummary({ routes, models, webClient, metrics, dependencies, parity }) {
  const production = metrics.files.filter((file) => !file.test);
  const tests = metrics.files.filter((file) => file.test);
  const byRoot = ['apps/api/src', 'apps/web/src', 'packages/shared/src'].map((root) => ({
    root,
    productionFiles: production.filter((file) => file.file.startsWith(root)).length,
    productionLines: production.filter((file) => file.file.startsWith(root)).reduce((sum, file) => sum + file.lines, 0),
    testFiles: tests.filter((file) => file.file.startsWith(root)).length,
    testLines: tests.filter((file) => file.file.startsWith(root)).reduce((sum, file) => sum + file.lines, 0)
  }));
  const topFiles = [...production].sort((left, right) => right.lines - left.lines).slice(0, 30);
  console.log('# 架构扫描机器基线');
  console.log('');
  console.log('| 指标 | 数值 |');
  console.log('| --- | ---: |');
  console.log(`| API 路由 | ${routes.length} |`);
  console.log(`| Prisma 模型 | ${models.length} |`);
  console.log(`| Web ApiClient 方法 | ${webClient.length} |`);
  console.log(`| Web ApiClient 直接请求表达式 | ${webClient.reduce((sum, item) => sum + item.requests.length, 0)} |`);
  console.log(`| 生产源码 \`as any\` | ${metrics.asAny} |`);
  console.log(`| 生产源码 \`process.env\` | ${metrics.processEnv} |`);
  console.log(`| 直接导入 \`@siyuan/shared\` 的生产文件 | ${metrics.sharedConsumers.length} |`);
  console.log(`| TypeScript 内部依赖边 | ${dependencies.edgeCount} |`);
  console.log(`| TypeScript 强连通循环组 | ${dependencies.cycles.length} |`);
  console.log(`| TypeScript 孤儿候选 | ${dependencies.orphanCandidates.length} |`);
  console.log(`| 双 Repository 同名方法 | ${parity.shared.length} |`);
  console.log('');
  console.log('## 源码规模');
  console.log('');
  console.log('| 范围 | 生产文件 | 生产行数 | 测试/测试工具文件 | 测试/测试工具行数 |');
  console.log('| --- | ---: | ---: | ---: | ---: |');
  for (const row of byRoot) console.log(`| \`${row.root}\` | ${row.productionFiles} | ${row.productionLines} | ${row.testFiles} | ${row.testLines} |`);
  console.log('');
  console.log('## 最大生产文件');
  console.log('');
  console.log('| 文件 | 行数 |');
  console.log('| --- | ---: |');
  for (const file of topFiles) console.log(`| \`${file.file}\` | ${file.lines} |`);
}

function runScannerSelfTest() {
  const nonStandardControllerFile = path.join(apiSourceRoot, 'admin.ts');
  const { routes } = scanControllerSource(nonStandardControllerFile, `
    @Controller('fixture')
    class FixtureController {
      @All('open')
      open() {}
    }
  `);
  if (routes.length !== 1 || routes[0].method !== 'ALL' || routes[0].route !== '/fixture/open' || routes[0].auth !== 'none') {
    throw new Error(`controller scanner self-test failed: ${JSON.stringify(routes)}`);
  }
  let rejectedUnknownDecorator = false;
  try {
    scanControllerSource(nonStandardControllerFile, `
      @Controller('fixture')
      class FixtureController {
        @CustomHttpRoute
        open() {}
      }
    `);
  } catch (error) {
    rejectedUnknownDecorator = error instanceof Error && error.message.includes('unrecognized decorated controller method');
  }
  if (!rejectedUnknownDecorator) throw new Error('controller scanner must reject an unknown decorated controller method');
  let rejectedControllerAlias = false;
  try {
    scanControllerSource(nonStandardControllerFile, `
      @ApiController
      class FixtureController {
        @Get('open')
        open() {}
      }
    `, new Set(['FixtureController']));
  } catch (error) {
    rejectedControllerAlias = error instanceof Error && error.message.includes('must use a standard @Controller');
  }
  if (!rejectedControllerAlias) throw new Error('controller scanner must reject a registered controller alias');
  for (const fixture of [
    `const appControllers = [FixtureController]; @Module({ controllers: appControllers }) class FixtureModule {}`,
    `const controllers = [FixtureController]; @Module({ controllers }) class FixtureModule {}`,
    `const moduleMetadata = { controllers: [FixtureController] }; @Module(moduleMetadata) class FixtureModule {}`
  ]) {
    let rejectedIndirectRegistration = false;
    try {
      scanRegisteredControllerNames(nonStandardControllerFile, fixture);
    } catch (error) {
      rejectedIndirectRegistration = error instanceof Error && error.message.includes('unsupported @Module');
    }
    if (!rejectedIndirectRegistration) throw new Error(`controller scanner must reject indirect module metadata: ${fixture}`);
  }
  console.log('[architecture-baseline] SELF-TEST PASS (non-standard filename, @All, decorator alias and indirect module registration rejection)');
}

const command = process.argv[2] ?? 'summary';
if (command === 'self-test') {
  runScannerSelfTest();
  process.exit(0);
}
const [routes, models, webClient, metrics, dependencies, parity] = await Promise.all([
  scanApiRoutes(),
  scanPrismaModels(),
  scanWebClient(),
  lineMetrics(),
  scanDependencies(),
  repositoryParity()
]);

if (command === 'summary') printSummary({ routes, models, webClient, metrics, dependencies, parity });
else if (command === 'api-routes') printApiRoutes(routes);
else if (command === 'prisma-models') printPrismaModels(models);
else if (command === 'web-client') printWebClient(webClient);
else if (command === 'dependencies') printDependencies(dependencies, parity);
else if (command === 'json') console.log(JSON.stringify({ routes, models, webClient, metrics, dependencies, parity }, null, 2));
else {
  console.error(`Unknown command: ${command}`);
  process.exitCode = 1;
}
