"use client";

import { Download, FileJson, Printer } from "lucide-react";

export function ReportActions() {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/92 focus:outline-none focus:ring-2 focus:ring-ring"
        onClick={() => window.print()}
        type="button"
      >
        <Printer aria-hidden="true" className="h-4 w-4" />
        Print
      </button>
      <button
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
        disabled
        type="button"
      >
        <Download aria-hidden="true" className="h-4 w-4" />
        PDF ถัดไป
      </button>
      <button
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
        disabled
        type="button"
      >
        <FileJson aria-hidden="true" className="h-4 w-4" />
        JSON ถัดไป
      </button>
    </div>
  );
}
