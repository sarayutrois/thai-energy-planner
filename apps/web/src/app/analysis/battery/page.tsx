import { redirect } from "next/navigation";

export default function BatteryOverviewPage() {
  redirect("/analysis/unavailable?module=battery");
}
