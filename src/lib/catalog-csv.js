// Spreadsheet-safe text export. Strings are preserved as text, not executable formulas.
export function csvCell(value) {
  let text = value == null ? '' : String(value);
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function catalogCsv(headers, rows) {
  return '\uFEFF' + [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
export function downloadCatalogCsv(name, headers, rows) {
  const url = URL.createObjectURL(new Blob([catalogCsv(headers, rows)], {type:'text/csv;charset=utf-8'}));
  const link = document.createElement('a'); link.href = url; link.download = name;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
