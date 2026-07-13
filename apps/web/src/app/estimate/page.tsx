import { redirect } from "next/navigation";

/** Legacy solar estimate entry. The guided flow now starts with the user's goal. */
export default function EstimatePage() {
  redirect("/analysis/new");
}
