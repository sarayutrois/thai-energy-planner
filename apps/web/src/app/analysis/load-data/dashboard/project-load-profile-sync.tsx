"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  CloudDownload,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { CanonicalLoadProfileSchema } from "@thai-energy-planner/shared-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authenticatedFetch } from "@/lib/auth-fetch";
import {
  activeProjectChangedEvent,
  readActiveProject,
  type ActiveProject,
} from "@/lib/active-project";
import {
  hydrateLocalLoadProfileSnapshot,
  readLocalLoadProfileSnapshot,
} from "@/lib/local-load-profile";

type RemoteProfile = {
  id: string;
  name: string;
  source: string;
  intervalMinutes: number;
  qualityScore: number | null;
  updatedAt: string;
  intervalCount: number;
};

type Status = "idle" | "loading" | "restoring" | "success" | "error";

export function ProjectLoadProfileSync() {
  const [project, setProject] = useState<ActiveProject | null>(null);
  const [profiles, setProfiles] = useState<RemoteProfile[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const loadProfiles = useCallback(async (activeProject: ActiveProject) => {
    setStatus("loading");
    setMessage("");
    try {
      const response = await authenticatedFetch(
        `/api/load-profiles?projectId=${encodeURIComponent(activeProject.id)}`,
      );
      if (!response.ok) throw new Error("load_failed");
      const payload = (await response.json()) as { profiles?: RemoteProfile[] };
      const nextProfiles = payload.profiles ?? [];
      setProfiles(nextProfiles);
      setSelectedId((current) =>
        nextProfiles.some((item) => item.id === current)
          ? current
          : (nextProfiles[0]?.id ?? ""),
      );
      setStatus("idle");
    } catch {
      setProfiles([]);
      setSelectedId("");
      setStatus("error");
      setMessage("ยังดึงรายการ Load Profile ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
  }, []);

  useEffect(() => {
    const refreshProject = () => {
      const activeProject = readActiveProject(window.localStorage);
      setProject(activeProject);
      setProfiles([]);
      setSelectedId("");
      setMessage("");
      if (activeProject) void loadProfiles(activeProject);
      else setStatus("idle");
    };
    refreshProject();
    window.addEventListener(activeProjectChangedEvent, refreshProject);
    return () =>
      window.removeEventListener(activeProjectChangedEvent, refreshProject);
  }, [loadProfiles]);

  async function restoreSelected() {
    if (!selectedId) return;
    const current = readLocalLoadProfileSnapshot();
    if (
      current &&
      current.serverLoadProfileId !== selectedId &&
      !window.confirm(
        `ต้องการเปลี่ยนจาก “${current.sourceName}” เป็น Load Profile ที่เลือกหรือไม่? ชุดเดิมจะยังอยู่ในประวัติบนอุปกรณ์นี้`,
      )
    ) {
      return;
    }
    setStatus("restoring");
    setMessage("");
    try {
      const response = await authenticatedFetch(
        `/api/load-profiles/${selectedId}`,
      );
      if (!response.ok) throw new Error("restore_failed");
      const payload = (await response.json()) as {
        profile?: { id?: string; canonicalProfile?: unknown };
      };
      const parsed = CanonicalLoadProfileSchema.safeParse(
        payload.profile?.canonicalProfile,
      );
      const serverId = payload.profile?.id;
      if (!parsed.success || !serverId) throw new Error("invalid_profile");
      hydrateLocalLoadProfileSnapshot(parsed.data, serverId);
      setStatus("success");
      setMessage(
        "นำ Load Profile มาใช้แล้ว ผลวิเคราะห์และรายงานจะอ้างอิงข้อมูลชุดนี้",
      );
    } catch {
      setStatus("error");
      setMessage("นำ Load Profile มาใช้ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
  }

  if (!project) return null;

  return (
    <Card className="mt-6 border-primary/30 bg-primary/[0.04]">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CloudDownload className="h-5 w-5 text-primary" />
              Load Profile ของโปรเจกต์
            </CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              โปรเจกต์ “{project.name}” เก็บ Load Profile ไว้ในบัญชี
              คุณจึงดึงกลับมาใช้บนอุปกรณ์นี้ได้
            </p>
          </div>
          <Badge variant="outline">เชื่อมกับโปรเจกต์</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {status === "loading" ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" />{" "}
            กำลังตรวจข้อมูลที่บันทึกไว้…
          </p>
        ) : profiles.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="grid gap-1.5 text-sm font-medium">
              เลือก Load Profile ที่ต้องการใช้
              <select
                className="h-11 min-w-0 rounded-md border border-input bg-background px-3"
                value={selectedId}
                onChange={(event) => {
                  setSelectedId(event.target.value);
                  setStatus("idle");
                  setMessage("");
                }}
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name} ·{" "}
                    {profile.intervalCount.toLocaleString("th-TH")} ช่วง ·
                    อัปเดต {formatDate(profile.updatedAt)}
                  </option>
                ))}
              </select>
            </label>
            <Button
              className="h-11 gap-2"
              disabled={!selectedId || status === "restoring"}
              onClick={() => void restoreSelected()}
              type="button"
            >
              {status === "restoring" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <CloudDownload className="h-4 w-4" />
              )}
              นำมาใช้ในอุปกรณ์นี้
            </Button>
          </div>
        ) : status !== "error" ? (
          <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>โปรเจกต์นี้ยังไม่มี Load Profile ที่บันทึกไว้ในบัญชี</p>
            <a
              className="font-medium text-primary hover:underline"
              href="/analysis/load-data"
            >
              เพิ่ม Load Profile
            </a>
          </div>
        ) : null}
        {message ? (
          <p
            className={`mt-4 flex items-start gap-2 rounded-md border p-3 text-sm ${status === "success" ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/5 text-destructive"}`}
            role="status"
          >
            {status === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : null}
            {message}
          </p>
        ) : null}
        {status === "error" ? (
          <button
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            onClick={() => project && void loadProfiles(project)}
            type="button"
          >
            <RefreshCw className="h-4 w-4" /> ลองใหม่
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("th-TH-u-ca-gregory", { dateStyle: "medium" })
    : "ไม่ทราบวันที่";
}
