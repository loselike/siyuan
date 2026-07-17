import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';
import * as xlsx from '@e965/xlsx';
import { resolveUploadDirectory } from '../configure-app.js';
import type { DubaiPriceSheetMode } from '@siyuan/shared';

const execFileAsync = promisify(execFile);

export type RenderedDubaiPricePage = {
  mode: Exclude<DubaiPriceSheetMode, 'UNASSIGNED'>;
  sheetName: string;
  pageNo: number;
  fileName: string;
  sizeBytes: number;
};

export type DubaiSheetInspection = { sheetName: string; mode: DubaiPriceSheetMode };

export function inspectDubaiWorkbookSheets(buffer: Buffer): DubaiSheetInspection[] {
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  return workbook.SheetNames.map((sheetName) => ({ sheetName, mode: inferDubaiSheetMode(sheetName) }));
}

export async function renderDubaiWorkbookSheets(input: { buffer: Buffer; versionId: string; fileName?: string }): Promise<{ pages: RenderedDubaiPricePage[]; unassignedSheets: string[] }> {
  const workbook = xlsx.read(input.buffer, { type: 'buffer', cellDates: true });
  const inspection = workbook.SheetNames.map((sheetName) => ({ sheetName, mode: inferDubaiSheetMode(sheetName) }));
  const target = resolveUploadDirectory(`pricing-dubai/${input.versionId}`);
  await mkdir(target.dir, { recursive: true });
  const workDir = join(tmpdir(), `siyuan-dubai-${randomUUID()}`);
  await mkdir(workDir, { recursive: true });
  const pages: RenderedDubaiPricePage[] = [];
  try {
    const originalWorkbookPath = join(workDir, `original${input.fileName?.toLowerCase().endsWith('.xls') && !input.fileName.toLowerCase().endsWith('.xlsx') ? '.xls' : '.xlsx'}`);
    await writeFile(originalWorkbookPath, input.buffer);
    for (const item of inspection.filter((sheet): sheet is DubaiSheetInspection & { mode: Exclude<DubaiPriceSheetMode, 'UNASSIGNED'> } => sheet.mode !== 'UNASSIGNED')) {
      const stem = safeFileStem(item.sheetName);
      const workbookPath = join(workDir, `${stem}.xlsx`);
      if (originalWorkbookPath.endsWith('.xlsx')) {
        await writeXlsxWithOnlyVisibleSheet(originalWorkbookPath, workbookPath, item.sheetName);
      } else {
        // 老式 XLS 无法无损调整工作表可见性，保留数据后交由 LibreOffice 转图。
        const singleWorkbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(singleWorkbook, workbook.Sheets[item.sheetName], item.sheetName);
        await writeFile(workbookPath, xlsx.write(singleWorkbook, { type: 'buffer', bookType: 'xlsx', bookSST: false }));
      }
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
      for (const [index, generatedFile] of generatedFiles.entries()) {
        const fileName = `${item.mode.toLowerCase()}-${stem}-${String(index + 1).padStart(3, '0')}.png`;
        const generatedPath = join(workDir, generatedFile);
        await cropDubaiPageToContent(generatedPath);
        const content = await readFile(generatedPath);
        await writeFile(join(target.dir, fileName), content);
        pages.push({ mode: item.mode, sheetName: item.sheetName, pageNo: index + 1, fileName, sizeBytes: content.length });
      }
    }
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
  return { pages, unassignedSheets: inspection.filter((item) => item.mode === 'UNASSIGNED').map((item) => item.sheetName) };
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

async function writeXlsxWithOnlyVisibleSheet(sourcePath: string, targetPath: string, sheetName: string) {
  const script = String.raw`
import shutil, sys, tempfile, zipfile
from xml.etree import ElementTree as ET

source, target, selected = sys.argv[1:4]
with tempfile.TemporaryDirectory() as directory:
    with zipfile.ZipFile(source, 'r') as archive:
        archive.extractall(directory)
    workbook_path = directory + '/xl/workbook.xml'
    tree = ET.parse(workbook_path)
    root = tree.getroot()
    namespace = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    for sheet in root.findall('.//main:sheets/main:sheet', namespace):
        if sheet.attrib.get('name') == selected:
            sheet.attrib.pop('state', None)
        else:
            sheet.set('state', 'hidden')
    tree.write(workbook_path, encoding='utf-8', xml_declaration=True)
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
        import os
        for root_dir, _, files in os.walk(directory):
            for file_name in files:
                full_path = os.path.join(root_dir, file_name)
                archive.write(full_path, os.path.relpath(full_path, directory))
`;
  await execFileAsync('python3', ['-c', script, sourcePath, targetPath, sheetName], { timeout: 30_000 });
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
