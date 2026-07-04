// CSV exporter with injection protection
export function sanitizeCsvCell(cell: string | number | null | undefined): string {
  if (cell === null || cell === undefined) return "";
  const str = String(cell);
  // Prevent CSV injection by prefixing with a single quote if starting with =, +, -, or @
  if (/^[=+\-@]/.test(str)) {
    return `'"${str}"`;
  }
  // Escape double quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exportToCsv(data: Record<string, any>[]): string {
  if (!data || data.length === 0 || !data[0]) return "";
  
  const headers = Object.keys(data[0]);
  const csvRows = [];
  
  // Add headers
  csvRows.push(headers.map(sanitizeCsvCell).join(","));
  
  // Add rows
  for (const row of data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const values = headers.map(header => sanitizeCsvCell(row[header] as any));
    csvRows.push(values.join(","));
  }
  
  return csvRows.join("\n");
}
