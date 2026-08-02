import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';
import * as xlsx from '@e965/xlsx';
import { resolveUploadDirectory } from '../configure-app.js';
import type { DubaiPriceSheetMode } from '@siyuan/shared';
import { visiblePriceWorkbookSheetNames } from './pricing-workbook-visibility.js';

const execFileAsync = promisify(execFile);
export const DEFAULT_DUBAI_SEA_MARKUP_PER_CBM = 20;

const DUBAI_SEA_RATE_TEMPLATE = [
  { categoryCell: 'B5', category: '普货类', priceCells: ['C5', 'G5'] },
  { categoryCell: 'B7', category: '牌子类', priceCells: ['C7', 'G7'] },
  { categoryCell: 'B9', category: '电池类', priceCells: ['C9', 'G9'] },
  { categoryCell: 'B11', category: '敏感货', priceCells: ['C11', 'G11'] }
] as const;

export type RenderedDubaiPricePage = {
  mode: Exclude<DubaiPriceSheetMode, 'UNASSIGNED'>;
  sheetName: string;
  pageNo: number;
  fileName: string;
  sizeBytes: number;
};

export type DubaiSheetInspection = { sheetName: string; mode: DubaiPriceSheetMode };

export type DubaiSeaMarkupCell = {
  address: string;
  originalValue: number;
  displayValue: number;
};

export function inspectDubaiWorkbookSheets(buffer: Buffer): DubaiSheetInspection[] {
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  return visiblePriceWorkbookSheetNames(workbook).map((sheetName) => ({ sheetName, mode: inferDubaiSheetMode(sheetName) }));
}

export async function renderDubaiWorkbookSheets(input: {
  buffer: Buffer;
  versionId: string;
  fileName?: string;
  seaMarkupPerCbm?: number;
  modes?: Array<Exclude<DubaiPriceSheetMode, 'UNASSIGNED'>>;
}): Promise<{ pages: RenderedDubaiPricePage[]; unassignedSheets: string[]; seaMarkupCellCount: number }> {
  const workbook = xlsx.read(input.buffer, { type: 'buffer', cellDates: true });
  const inspection = visiblePriceWorkbookSheetNames(workbook).map((sheetName) => ({ sheetName, mode: inferDubaiSheetMode(sheetName) }));
  const seaMarkupPerCbm = normalizeDubaiSeaMarkup(input.seaMarkupPerCbm ?? DEFAULT_DUBAI_SEA_MARKUP_PER_CBM);
  const requestedModes = new Set(input.modes ?? ['AIR', 'SEA']);
  // Business images are generated only after the confidential sea markup is
  // applied. Keep them in a separate authenticated tree so neither source
  // workbooks nor generated price images are reachable as public uploads.
  const target = resolveUploadDirectory(`pricing-dubai-business/${input.versionId}`);
  await mkdir(target.dir, { recursive: true });
  const workDir = join(tmpdir(), `siyuan-dubai-${randomUUID()}`);
  await mkdir(workDir, { recursive: true });
  const pages: RenderedDubaiPricePage[] = [];
  let seaMarkupCellCount = 0;
  try {
    const originalWorkbookPath = join(workDir, `original${input.fileName?.toLowerCase().endsWith('.xls') && !input.fileName.toLowerCase().endsWith('.xlsx') ? '.xls' : '.xlsx'}`);
    await writeFile(originalWorkbookPath, input.buffer);
    for (const item of inspection.filter((sheet): sheet is DubaiSheetInspection & { mode: Exclude<DubaiPriceSheetMode, 'UNASSIGNED'> } => sheet.mode !== 'UNASSIGNED' && requestedModes.has(sheet.mode))) {
      const stem = safeFileStem(item.sheetName);
      const workbookPath = join(workDir, `${stem}.xlsx`);
      const selectedSheet = workbook.Sheets[item.sheetName];
      if (!selectedSheet) throw new Error(`未找到工作表：${item.sheetName}`);
      const seaMarkupCells = item.mode === 'SEA' ? inspectDubaiSeaMarkupCells(selectedSheet, seaMarkupPerCbm) : [];
      if (originalWorkbookPath.endsWith('.xlsx')) {
        await writeXlsxWithOnlyVisibleSheet(originalWorkbookPath, workbookPath, item.sheetName, seaMarkupCells, seaMarkupPerCbm);
      } else {
        // 老式 XLS 无法无损调整工作表可见性，保留数据后交由 LibreOffice 转图。
        const singleWorkbook = xlsx.utils.book_new();
        if (item.mode === 'SEA') applyDubaiSeaMarkupToWorksheet(selectedSheet, seaMarkupPerCbm);
        xlsx.utils.book_append_sheet(singleWorkbook, selectedSheet, item.sheetName);
        await writeFile(workbookPath, xlsx.write(singleWorkbook, { type: 'buffer', bookType: 'xlsx', bookSST: false }));
      }
      seaMarkupCellCount += seaMarkupCells.length;
      await execFileAsync('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', workDir, workbookPath], {
        timeout: 60_000,
        env: { ...process.env, HOME: workDir }
      });
      const pdfPath = join(workDir, `${stem}.pdf`);
      const outputPrefix = join(workDir, `${stem}-page`);
      await execFileAsync('pdftoppm', ['-png', '-r', '144', pdfPath, outputPrefix], { timeout: 60_000 });
      const generatedFiles = (await readdir(workDir))
        .filter((name) => name.startsWith(`${stem}-page-`) && name.endsWith('.png'))
        .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
      if (!generatedFiles.length) throw new Error(`${item.sheetName} 未生成可展示图片`);
      const generatedPaths = generatedFiles.map((generatedFile) => join(workDir, generatedFile));
      await Promise.all(generatedPaths.map((generatedPath) => cropDubaiPageToContent(generatedPath)));
      const combinedPaths = await combineDubaiPages(generatedPaths, join(workDir, `${stem}-complete`));
      for (const [index, combinedPath] of combinedPaths.entries()) {
        const fileName = `${item.mode.toLowerCase()}-${stem}-${String(index + 1).padStart(3, '0')}.png`;
        const content = await readFile(combinedPath);
        await writeFile(join(target.dir, fileName), content);
        pages.push({ mode: item.mode, sheetName: item.sheetName, pageNo: index + 1, fileName, sizeBytes: content.length });
      }
    }
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
  return {
    pages,
    unassignedSheets: inspection.filter((item) => item.mode === 'UNASSIGNED').map((item) => item.sheetName),
    seaMarkupCellCount
  };
}

export function inspectDubaiSeaMarkupCells(sheet: xlsx.WorkSheet, markupPerCbm: number): DubaiSeaMarkupCell[] {
  const markup = normalizeDubaiSeaMarkup(markupPerCbm);
  const serviceHeader = normalizeTemplateText(sheet.B4?.v);
  const firstTierHeader = normalizeTemplateText(sheet.C4?.v);
  const secondTierHeader = normalizeTemplateText(sheet.G4?.v);
  if (serviceHeader !== '服务内容'
    || !firstTierHeader.includes('0.5-5CBM价格RMB/方')
    || !secondTierHeader.includes('5CBM以上价格RMB/方')) {
    throw new Error('迪拜海运模板不匹配：未识别到服务内容及两档 RMB/方主运费表头');
  }
  return DUBAI_SEA_RATE_TEMPLATE.flatMap((row) => {
    if (normalizeTemplateText(sheet[row.categoryCell]?.v) !== row.category) {
      throw new Error(`迪拜海运模板不匹配：${row.categoryCell} 应为“${row.category}”`);
    }
    return row.priceCells.map((address) => {
      const cell = sheet[address];
      const originalValue = Number(cell?.v);
      if (!cell || cell.f || cell.t !== 'n' || !Number.isFinite(originalValue) || originalValue <= 0) {
        throw new Error(`迪拜海运模板不匹配：${address} 必须是正数主运费`);
      }
      return { address, originalValue, displayValue: roundDubaiPrice(originalValue + markup) };
    });
  });
}

export function applyDubaiSeaMarkupToWorksheet(sheet: xlsx.WorkSheet, markupPerCbm: number): DubaiSeaMarkupCell[] {
  const cells = inspectDubaiSeaMarkupCells(sheet, markupPerCbm);
  cells.forEach(({ address, displayValue }) => {
    const cell = sheet[address];
    cell.v = displayValue;
    cell.t = 'n';
    delete cell.w;
  });
  return cells;
}

function normalizeDubaiSeaMarkup(value: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 1000) {
    throw new Error('迪拜海运加价必须是大于 0 且不超过 1000 的有效金额');
  }
  return roundDubaiPrice(value);
}

function normalizeTemplateText(value: unknown) {
  return String(value ?? '').replace(/\s+/g, '').trim();
}

function roundDubaiPrice(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function cropDubaiPageToContent(imagePath: string) {
  // LibreOffice 依照打印页拆图时会保留大块空白画布；裁掉纯白边缘以便单页浏览。
  const script = String.raw`
from PIL import Image, ImageChops
import sys

path = sys.argv[1]
image = Image.open(path).convert('RGB')
background = Image.new('RGB', image.size, (255, 255, 255))
diff = ImageChops.difference(image, background).convert('L')
mask = diff.point(lambda value: 255 if value > 8 else 0)
bounds = mask.getbbox()
if bounds:
    left, top, right, bottom = bounds
    padding = 12
    bounds = (max(0, left - padding), max(0, top - padding), min(image.width, right + padding), min(image.height, bottom + padding))
    image.crop(bounds).save(path, 'PNG')
`;
  await execFileAsync('python3', ['-c', script, imagePath], { timeout: 30_000 });
}

async function combineDubaiPages(imagePaths: string[], targetPrefix: string) {
  const script = String.raw`
from PIL import Image
import sys

target_prefix = sys.argv[1]
max_height = int(sys.argv[2])
paths = sys.argv[3:]
if not paths:
    raise RuntimeError('没有可合并的价格表页面')
images = [Image.open(path).convert('RGB') for path in paths]
total_height = sum(image.height for image in images)
if len(images) == 1 or total_height <= max_height:
    groups = [images]
else:
    split_at = min(
        range(1, len(images)),
        key=lambda index: abs(sum(image.height for image in images[:index]) - sum(image.height for image in images[index:]))
    )
    groups = [images[:split_at], images[split_at:]]
for group_index, group in enumerate(groups, 1):
    width = max(image.width for image in group)
    height = sum(image.height for image in group)
    canvas = Image.new('RGB', (width, height), (255, 255, 255))
    offset_y = 0
    for image in group:
        canvas.paste(image, (0, offset_y))
        offset_y += image.height
    canvas.save(f'{target_prefix}-{group_index}.png', 'PNG', optimize=True)
print(len(groups))
`;
  const { stdout } = await execFileAsync('python3', ['-c', script, targetPrefix, '1800', ...imagePaths], { timeout: 60_000 });
  const imageCount = Number(String(stdout).trim());
  if (!Number.isInteger(imageCount) || imageCount < 1 || imageCount > 2) {
    throw new Error('迪拜价格表分页合并结果无效');
  }
  return Array.from({ length: imageCount }, (_, index) => `${targetPrefix}-${index + 1}.png`);
}

async function writeXlsxWithOnlyVisibleSheet(
  sourcePath: string,
  targetPath: string,
  sheetName: string,
  seaMarkupCells: DubaiSeaMarkupCell[],
  seaMarkupPerCbm: number
) {
  const script = String.raw`
import json, os, posixpath, sys, tempfile, zipfile
from xml.etree import ElementTree as ET

source, target, selected, markup_text, target_cells_json = sys.argv[1:6]
markup = float(markup_text)
target_cells = json.loads(target_cells_json)
with tempfile.TemporaryDirectory() as directory:
    with zipfile.ZipFile(source, 'r') as archive:
        archive.extractall(directory)
    workbook_path = directory + '/xl/workbook.xml'
    tree = ET.parse(workbook_path)
    root = tree.getroot()
    namespace = {
        'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
        'officeRel': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
        'packageRel': 'http://schemas.openxmlformats.org/package/2006/relationships'
    }
    selected_relationship_id = None
    selected_sheet_index = None
    for sheet_index, sheet in enumerate(root.findall('.//main:sheets/main:sheet', namespace)):
        if sheet.attrib.get('name') == selected:
            sheet.attrib.pop('state', None)
            selected_relationship_id = sheet.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
            selected_sheet_index = sheet_index
        else:
            sheet.set('state', 'hidden')
    if selected_relationship_id is None:
        raise RuntimeError('未找到待转换工作表：' + selected)
    workbook_view = root.find('.//main:bookViews/main:workbookView', namespace)
    if workbook_view is not None:
        workbook_view.set('activeTab', str(selected_sheet_index))
    tree.write(workbook_path, encoding='utf-8', xml_declaration=True)
    if target_cells:
        relationships_path = directory + '/xl/_rels/workbook.xml.rels'
        relationships_tree = ET.parse(relationships_path)
        relationship = next((item for item in relationships_tree.getroot() if item.attrib.get('Id') == selected_relationship_id), None)
        if relationship is None:
            raise RuntimeError('未找到工作表关系：' + selected)
        relationship_target = relationship.attrib.get('Target', '')
        worksheet_relative_path = relationship_target.lstrip('/') if relationship_target.startswith('/xl/') else posixpath.join('xl', relationship_target)
        worksheet_path = os.path.normpath(os.path.join(directory, worksheet_relative_path))
        worksheet_tree = ET.parse(worksheet_path)
        worksheet_root = worksheet_tree.getroot()
        changed = 0
        for cell_ref in target_cells:
            cell = worksheet_root.find(".//main:c[@r='%s']" % cell_ref, namespace)
            if cell is None or cell.find('main:f', namespace) is not None:
                raise RuntimeError('海运主运费单元格不可修改：' + cell_ref)
            value_node = cell.find('main:v', namespace)
            if value_node is None:
                raise RuntimeError('海运主运费单元格缺少数值：' + cell_ref)
            original = float(value_node.text)
            display = round(original + markup, 2)
            value_node.text = ('%.2f' % display).rstrip('0').rstrip('.')
            cell.attrib.pop('t', None)
            changed += 1
        if changed != len(target_cells):
            raise RuntimeError('海运主运费修改数量不正确')
        worksheet_tree.write(worksheet_path, encoding='utf-8', xml_declaration=True)
    for worksheet_path in __import__('glob').glob(directory + '/xl/worksheets/*.xml'):
        worksheet_tree = ET.parse(worksheet_path)
        worksheet_root = worksheet_tree.getroot()
        sheet_pr = worksheet_root.find('main:sheetPr', namespace)
        if sheet_pr is None:
            sheet_pr = ET.Element('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheetPr')
            worksheet_root.insert(0, sheet_pr)
        page_setup_pr = sheet_pr.find('main:pageSetUpPr', namespace)
        if page_setup_pr is None:
            page_setup_pr = ET.SubElement(sheet_pr, '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}pageSetUpPr')
        page_setup_pr.set('fitToPage', '1')
        page_setup = worksheet_root.find('main:pageSetup', namespace)
        if page_setup is None:
            page_setup = ET.SubElement(worksheet_root, '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}pageSetup')
        page_setup.set('fitToWidth', '1')
        page_setup.set('fitToHeight', '0')
        page_setup.set('orientation', 'landscape')
        vertical_breaks = worksheet_root.find('main:verticalPageBreaks', namespace)
        if vertical_breaks is not None:
            worksheet_root.remove(vertical_breaks)
        worksheet_tree.write(worksheet_path, encoding='utf-8', xml_declaration=True)
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
        for root_dir, _, files in os.walk(directory):
            for file_name in files:
                full_path = os.path.join(root_dir, file_name)
                archive.write(full_path, os.path.relpath(full_path, directory))
`;
  await execFileAsync('python3', [
    '-c',
    script,
    sourcePath,
    targetPath,
    sheetName,
    String(seaMarkupPerCbm),
    JSON.stringify(seaMarkupCells.map((cell) => cell.address))
  ], { timeout: 30_000 });
}

function inferDubaiSheetMode(name: string): DubaiPriceSheetMode {
  const normalized = name.replace(/\s+/g, '').toLowerCase();
  if (/空运|空派|air/.test(normalized)) return 'AIR';
  if (/海运|海派|sea/.test(normalized)) return 'SEA';
  return 'UNASSIGNED';
}

function safeFileStem(name: string) {
  const normalized = basename(name).replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || 'sheet';
}
