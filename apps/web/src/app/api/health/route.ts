import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "thai-energy-planner-web",
    timezone: "Asia/Bangkok"
  });
}
