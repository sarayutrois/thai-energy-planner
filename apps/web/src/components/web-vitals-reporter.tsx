"use client";

import { useReportWebVitals } from "next/web-vitals";

const SOLAR_PATH = "/analysis/solar";

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (!window.location.pathname.startsWith(SOLAR_PATH)) return;

    const payload = JSON.stringify({
      path: SOLAR_PATH,
      name: metric.name,
      value: metric.value,
      startTime: metric.startTime,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/observability/web-vitals",
        new Blob([payload], { type: "application/json" }),
      );
      return;
    }

    void fetch("/api/observability/web-vitals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    });
  });

  return null;
}
