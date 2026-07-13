// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exportToJson(data: any): string {
  // Returns formatted JSON suitable for debugging and reproducibility
  return JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      engineVersion: "0.1.0",
      data,
    },
    null,
    2,
  );
}
