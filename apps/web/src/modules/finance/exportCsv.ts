function escapeCsvCell(value: unknown) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function downloadCsv(filename: string, headers: Array<{ key: string; label: string }>, rows: Array<Record<string, unknown>>) {
  const csvRows = [
    headers.map((header) => escapeCsvCell(header.label)).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header.key])).join(','))
  ];
  const blob = new Blob([`\uFEFF${csvRows.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
