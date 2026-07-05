export function exportToPdf(data: unknown): Uint8Array {
  const lines = buildReportLines(data);
  const content = [
    "BT",
    "/F1 11 Tf",
    "50 790 Td",
    "14 TL",
    ...lines.flatMap((line, index) => (index === 0 ? [`(${escapePdfText(line)}) Tj`] : ["T*", `(${escapePdfText(line)}) Tj`])),
    "ET"
  ].join("\n");

  return createPdfDocument(content);
}

function buildReportLines(data: unknown) {
  const payload = normalizePayload(data);
  return [
    payload.reportTitle,
    `Generated at: ${new Date().toISOString()}`,
    "",
    `Title: ${payload.title}`,
    `Module: ${payload.moduleLabel}`,
    ...(payload.disclaimer ? ["", "Disclaimer:", payload.disclaimer] : []),
    "",
    "Executive summary:",
    `Summary: ${payload.summary}`,
    "",
    "Metrics:",
    ...payload.metrics.map((metric) => `- ${metric.label}: ${metric.value}`),
    ...payload.sections.flatMap((section) => [
      "",
      section.title,
      ...section.paragraphs.map((paragraph) => `- ${paragraph}`),
      ...section.items.map((item) => `- ${item.label}: ${item.value}`)
    ]),
    "",
    "Assumptions:",
    ...payload.assumptions.map((item) => `- ${item.label}: ${item.value}`),
    "",
    "References:",
    ...payload.references.map((item) => `- ${item.label}: ${item.value}`),
    "",
    "Recommendations:",
    ...payload.recommendations.map((recommendation) => `- ${recommendation.title}: ${recommendation.description}`),
    "",
    "Limitations & Next Steps:",
    ...payload.limitations.map((item) => `- ${item.title}: ${item.description}${item.nextAction ? ` Next: ${item.nextAction}` : ""}`),
    "",
    "Note: This PDF is generated from the same report snapshot used for JSON/CSV export."
  ].flatMap(wrapLine);
}

function normalizePayload(data: unknown) {
  if (!data || typeof data !== "object") {
    return {
      title: "Thai Energy Planner Report",
      moduleLabel: "Analysis",
      summary: JSON.stringify(data),
      metrics: [] as Array<{ label: string; value: string }>,
      recommendations: [] as Array<{ title: string; description: string; nextAction?: string | undefined }>,
      assumptions: [] as Array<{ label: string; value: string }>,
      disclaimer: "",
      limitations: [] as Array<{ title: string; description: string; nextAction?: string | undefined }>,
      references: [] as Array<{ label: string; value: string }>,
      reportTitle: "Thai Energy Planner Report",
      sections: [] as Array<{
        title: string;
        items: Array<{ label: string; value: string }>;
        paragraphs: string[];
      }>
    };
  }

  const source = data as {
    assumptions?: unknown;
    disclaimer?: unknown;
    limitations?: unknown;
    title?: unknown;
    moduleLabel?: unknown;
    references?: unknown;
    reportTitle?: unknown;
    sections?: unknown;
    summary?: unknown;
    metrics?: unknown;
    recommendations?: unknown;
  };

  return {
    title: typeof source.title === "string" ? source.title : "Thai Energy Planner Report",
    reportTitle: typeof source.reportTitle === "string" ? source.reportTitle : "Thai Energy Planner Report",
    moduleLabel: typeof source.moduleLabel === "string" ? source.moduleLabel : "Analysis",
    disclaimer: typeof source.disclaimer === "string" ? source.disclaimer : "",
    summary: typeof source.summary === "string" ? source.summary : "No summary provided.",
    metrics: Array.isArray(source.metrics)
      ? normalizeMetricList(source.metrics, 12)
      : [],
    assumptions: Array.isArray(source.assumptions) ? normalizeMetricList(source.assumptions, 20) : [],
    references: Array.isArray(source.references) ? normalizeMetricList(source.references, 12) : [],
    sections: Array.isArray(source.sections)
      ? source.sections
          .map((section) => {
            const item = section as { title?: unknown; items?: unknown; paragraphs?: unknown };
            return {
              title: String(item.title ?? "Section"),
              items: Array.isArray(item.items) ? normalizeMetricList(item.items, 12) : [],
              paragraphs: Array.isArray(item.paragraphs) ? item.paragraphs.map((paragraph) => String(paragraph)).slice(0, 8) : []
            };
          })
          .slice(0, 8)
      : [],
    recommendations: Array.isArray(source.recommendations)
      ? normalizeRecommendationList(source.recommendations, 10)
      : [],
    limitations: Array.isArray(source.limitations) ? normalizeRecommendationList(source.limitations, 8) : []
  };
}

function normalizeMetricList(source: unknown[], limit: number) {
  return source
    .map((metric) => {
      const item = metric as { label?: unknown; value?: unknown };
      return {
        label: String(item.label ?? "Metric"),
        value: String(item.value ?? "-")
      };
    })
    .slice(0, limit);
}

function normalizeRecommendationList(source: unknown[], limit: number) {
  return source
    .map((recommendation) => {
      const item = recommendation as { title?: unknown; description?: unknown; nextAction?: unknown };
      return {
        title: String(item.title ?? "Recommendation"),
        description: String(item.description ?? ""),
        nextAction: item.nextAction === undefined ? undefined : String(item.nextAction)
      };
    })
    .slice(0, limit);
}

function createPdfDocument(streamContent: string) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${byteLength(streamContent)} >>\nstream\n${streamContent}\nendstream`
  ];
  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];

  for (const [index, object] of objects.entries()) {
    offsets.push(byteLength(chunks.join("")));
    chunks.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  }

  const xrefOffset = byteLength(chunks.join(""));
  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push("0000000000 65535 f \n");
  for (const offset of offsets.slice(1)) {
    chunks.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
  }
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new TextEncoder().encode(chunks.join(""));
}

function wrapLine(line: string) {
  const normalized = line.replace(/[^\x20-\x7E]/g, "?");
  const result: string[] = [];
  for (let index = 0; index < normalized.length || index === 0; index += 82) {
    result.push(normalized.slice(index, index + 82));
  }
  return result;
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}
