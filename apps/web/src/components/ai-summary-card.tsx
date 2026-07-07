"use client";

import { useEffect, useState, useRef } from "react";
import { Sparkles, Loader2, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type ColorScheme = "purple" | "blue" | "teal";

const colorMap: Record<ColorScheme, { border: string; bg: string; iconBg: string; iconText: string; title: string; text: string; skeleton: string }> = {
  purple: { border: "border-purple-200 dark:border-purple-900", bg: "bg-gradient-to-r from-purple-50 to-indigo-50/50 dark:from-purple-950/30 dark:to-indigo-900/20", iconBg: "bg-purple-100 dark:bg-purple-900/50", iconText: "text-purple-600 dark:text-purple-300", title: "text-purple-900 dark:text-purple-100", text: "text-purple-800/90 dark:text-purple-200/90", skeleton: "bg-purple-200/50 dark:bg-purple-800/50" },
  blue:   { border: "border-blue-200 dark:border-blue-900",   bg: "bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-900/20",  iconBg: "bg-blue-100 dark:bg-blue-900/50",   iconText: "text-blue-600 dark:text-blue-300",   title: "text-blue-900 dark:text-blue-100",   text: "text-blue-800/90 dark:text-blue-200/90",   skeleton: "bg-blue-200/50 dark:bg-blue-800/50" },
  teal:   { border: "border-teal-200 dark:border-teal-900",   bg: "bg-gradient-to-r from-teal-50 to-emerald-50/50 dark:from-teal-950/30 dark:to-emerald-900/20", iconBg: "bg-teal-100 dark:bg-teal-900/50",   iconText: "text-teal-600 dark:text-teal-300",   title: "text-teal-900 dark:text-teal-100",   text: "text-teal-800/90 dark:text-teal-200/90",   skeleton: "bg-teal-200/50 dark:bg-teal-800/50" },
};

interface AiSummaryCardProps {
  apiEndpoint: string;
  colorScheme: ColorScheme;
  payload: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: any[];
}

export function AiSummaryCard({ apiEndpoint, colorScheme, payload, deps }: AiSummaryCardProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Abort previous request if still running
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    async function fetchSummary() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch summary");
        }

        const data = await response.json();
        if (!controller.signal.aborted) {
          setSummary(data.summary);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error(err);
        if (!controller.signal.aborted) {
          setError("ไม่สามารถโหลดบทสรุป AI ได้ในขณะนี้");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchSummary();
    return () => controller.abort();
  }, deps); // deps is intentionally passed through from props

  const c = colorMap[colorScheme];

  if (error) {
    return (
      <Card className="mt-6 border-destructive/20 bg-destructive/5">
        <CardContent className="flex items-center gap-3 p-4">
          <Info className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`mt-6 ${c.border} ${c.bg} shadow-sm`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${c.iconBg} ${c.iconText}`}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold ${c.title} flex items-center gap-2`}>
              AI Executive Summary
            </h3>
            <div className={`mt-2 text-sm leading-relaxed ${c.text}`}>
              {isLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className={`h-4 w-full rounded ${c.skeleton}`}></div>
                  <div className={`h-4 w-5/6 rounded ${c.skeleton}`}></div>
                  <div className={`h-4 w-4/6 rounded ${c.skeleton}`}></div>
                </div>
              ) : (
                <p>{summary}</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
