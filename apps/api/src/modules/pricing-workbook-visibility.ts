type WorkbookSheetVisibility = {
  name?: string;
  Hidden?: number;
};

type WorkbookWithSheetVisibility = {
  SheetNames: string[];
  Workbook?: {
    Sheets?: WorkbookSheetVisibility[];
  };
};

/**
 * Price imports use only worksheets visible to the operator. SheetJS records
 * visible/hidden/very-hidden as 0/1/2 in Workbook.Sheets.
 */
export function visiblePriceWorkbookSheetNames(workbook: WorkbookWithSheetVisibility): string[] {
  const sheetMetadata = workbook.Workbook?.Sheets ?? [];
  const metadataByName = new Map(
    sheetMetadata
      .filter((sheet): sheet is WorkbookSheetVisibility & { name: string } => Boolean(sheet.name))
      .map((sheet) => [sheet.name, sheet])
  );
  return workbook.SheetNames.filter((sheetName, index) => {
    const metadata = metadataByName.get(sheetName) ?? sheetMetadata[index];
    return Number(metadata?.Hidden ?? 0) === 0;
  });
}
