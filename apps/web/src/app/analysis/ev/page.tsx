import { redirect } from "next/navigation";

export default function EvOverviewPage() {
  redirect("/analysis/unavailable?module=ev");
}
