export function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const nextChar = csv[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      currentCell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  rows.push(currentRow);
  return rows;
}

export function parseBillCsv(csv: string) {
  const rows = parseCsvRows(csv).filter((row) =>
    row.some((cell) => cell.trim() !== ""),
  );
  const [headers, ...dataRows] = rows;
  if (!headers) return [];

  const normalizedHeaders = headers.map((header) => header.trim());
  const columnIndex = (name: string) =>
    normalizedHeaders.findIndex((header) => header === name);
  const monthIndex = columnIndex("month");
  const energyIndex = columnIndex("energyKwh");
  const costIndex = columnIndex("totalCostThb");
  const authorityIndex = columnIndex("authority");
  const meterModeIndex = columnIndex("meterMode");

  if (monthIndex < 0 || energyIndex < 0 || costIndex < 0) return [];

  return dataRows.map((row) => {
    const authority = row[authorityIndex]?.trim();
    const meterMode = row[meterModeIndex]?.trim();
    return {
      id: crypto.randomUUID(),
      authority: authority === "MEA" ? "MEA" : ("PEA" as "PEA" | "MEA"),
      energyKwh: row[energyIndex]?.trim() ?? "",
      meterMode: meterMode === "tou" ? "tou" : ("normal" as "normal" | "tou"),
      month: row[monthIndex]?.trim() ?? "",
      totalCostThb: row[costIndex]?.trim() ?? "",
    };
  });
}
