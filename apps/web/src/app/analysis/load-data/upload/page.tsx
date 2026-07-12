import { redirect } from "next/navigation";

/** Retains the documented upload URL while using the shared import workflow. */
export default function LoadDataUploadPage() {
  redirect("/analysis/load-data/import");
}
