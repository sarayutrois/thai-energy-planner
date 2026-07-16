"use client";

import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { useEffect, useState } from "react";
import {
  activeProjectChangedEvent,
  readActiveProject,
  type ActiveProject,
} from "@/lib/active-project";

export function ActiveProjectIndicator() {
  const [project, setProject] = useState<ActiveProject | null>(null);

  useEffect(() => {
    const refresh = () => setProject(readActiveProject(window.localStorage));
    refresh();
    window.addEventListener(activeProjectChangedEvent, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(activeProjectChangedEvent, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  if (!project) return null;
  return (
    <Link
      aria-label={`โปรเจกต์ที่เลือก ${project.name}`}
      className="hidden h-9 max-w-44 items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 text-sm font-medium text-primary transition hover:bg-primary/10 md:inline-flex"
      href="/analysis/projects"
      title={project.name}
    >
      <FolderKanban className="h-4 w-4 shrink-0" />
      <span className="truncate">{project.name}</span>
    </Link>
  );
}
