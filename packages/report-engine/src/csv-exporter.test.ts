import { describe, it, expect } from "vitest";
import { exportToCsv, sanitizeCsvCell } from "./csv-exporter.js";

describe("CSV Exporter", () => {
  it("escapes formula injection", () => {
    expect(sanitizeCsvCell("=1+1")).toBe("'=1+1");
    expect(sanitizeCsvCell("+cmd|' /C calc'!A1")).toBe("'+cmd|' /C calc'!A1");
    expect(sanitizeCsvCell("-100")).toBe("'-100");
    expect(sanitizeCsvCell("@SUM(A1:A10)")).toBe("'@SUM(A1:A10)");
    expect(sanitizeCsvCell(" =1+1")).toBe("' =1+1");
    expect(sanitizeCsvCell("=SUM(1,2)")).toBe(`"'=SUM(1,2)"`);
  });

  it("handles normal strings correctly", () => {
    expect(sanitizeCsvCell("Normal String")).toBe("Normal String");
    expect(sanitizeCsvCell("String with, comma")).toBe(`"String with, comma"`);
    expect(sanitizeCsvCell(`String with "quote"`)).toBe(
      `"String with ""quote"""`,
    );
  });

  it("generates csv rows correctly", () => {
    const data = [{ id: 1, name: "Test", formula: "=1+1" }];
    const csv = exportToCsv(data);
    const rows = csv.split("\n");
    expect(rows.length).toBe(2);
    expect(rows[0]).toBe("id,name,formula");
    expect(rows[1]).toBe("1,Test,'=1+1");
  });
});
