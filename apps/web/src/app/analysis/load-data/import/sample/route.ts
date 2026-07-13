export function GET() {
  const csv = [
    "timestamp,energy_kwh,power_kw,meter_id,voltage,power_factor",
    "2026-01-05 00:00,1.20,1.20,METER-1,230,0.98",
    "2026-01-05 01:00,0.90,0.90,METER-1,230,0.97",
    "2026-01-05 02:00,0.80,0.80,METER-1,229,0.96",
    "2026-01-05 03:00,0.75,0.75,METER-1,229,0.96",
  ].join("\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition":
        "attachment; filename=thai-energy-planner-load-profile-sample.csv",
    },
  });
}
