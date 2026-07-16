"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  FolderKanban,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { authenticatedFetch } from "@/lib/auth-fetch";
import {
  clearActiveProject,
  readActiveProject,
  setActiveProject,
  type ActiveProject,
} from "@/lib/active-project";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

type Project = ActiveProject & {
  province: string | null;
  customerSegment:
    "RESIDENTIAL" | "SMALL_BUSINESS" | "MEDIUM_BUSINESS" | "LARGE_BUSINESS";
  authority: "PEA" | "MEA" | null;
  timezone: string;
  createdAt: string;
  _count?: { meters: number; appliances: number; analysisRuns: number };
};

const segmentLabels: Record<Project["customerSegment"], string> = {
  RESIDENTIAL: "บ้านพักอาศัย",
  SMALL_BUSINESS: "ธุรกิจขนาดเล็ก",
  MEDIUM_BUSINESS: "ธุรกิจขนาดกลาง",
  LARGE_BUSINESS: "ธุรกิจขนาดใหญ่",
};

export function ProjectManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<ActiveProject | null>(
    null,
  );
  const [status, setStatus] = useState<
    "loading" | "ready" | "signed_out" | "error"
  >("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [province, setProvince] = useState("");
  const [segment, setSegment] =
    useState<Project["customerSegment"]>("RESIDENTIAL");
  const [authority, setAuthority] = useState<"" | "PEA" | "MEA">("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);

  const loadProjects = useCallback(async () => {
    setStatus("loading");
    const response = await authenticatedFetch("/api/projects").catch(
      () => null,
    );
    if (!response) {
      setStatus("error");
      return;
    }
    if (response.status === 401) {
      setProjects([]);
      setStatus("signed_out");
      return;
    }
    if (!response.ok) {
      setStatus("error");
      return;
    }
    const payload = (await response.json()) as { projects?: Project[] };
    setProjects(payload.projects ?? []);
    setActiveProjectState(readActiveProject(window.localStorage));
    setStatus("ready");
  }, []);

  useEffect(() => {
    void loadProjects();
    const refresh = () => void loadProjects();
    window.addEventListener("thai-energy-planner:auth-changed", refresh);
    return () =>
      window.removeEventListener("thai-energy-planner:auth-changed", refresh);
  }, [loadProjects]);

  const activeStillExists = useMemo(
    () =>
      !activeProject ||
      projects.some((project) => project.id === activeProject.id),
    [activeProject, projects],
  );

  useEffect(() => {
    if (status !== "ready" || activeStillExists) return;
    clearActiveProject(window.localStorage);
    setActiveProjectState(null);
  }, [activeStillExists, status]);

  async function createProject() {
    if (!name.trim()) return;
    setSaving(true);
    setMessage(null);
    const response = await authenticatedFetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        ...(province.trim() ? { province: province.trim() } : {}),
        customerSegment: segment,
        ...(authority ? { authority } : {}),
      }),
    }).catch(() => null);
    if (!response?.ok) {
      setMessage("สร้างโปรเจกต์ไม่สำเร็จ กรุณาลองใหม่");
      setSaving(false);
      return;
    }
    const payload = (await response.json()) as { project: Project };
    const project = payload.project;
    setProjects((current) => [project, ...current]);
    selectProject(project);
    setName("");
    setProvince("");
    setMessage("สร้างและเลือกโปรเจกต์แล้ว");
    setSaving(false);
  }

  function selectProject(project: Project) {
    const selected = {
      id: project.id,
      name: project.name,
      updatedAt: project.updatedAt,
    };
    setActiveProject(window.localStorage, selected);
    setActiveProjectState(selected);
    setMessage(`เลือก “${project.name}” สำหรับการบันทึกครั้งถัดไปแล้ว`);
  }

  async function saveName(project: Project) {
    const nextName = editingName.trim();
    if (!nextName || nextName === project.name) {
      setEditingId(null);
      return;
    }
    const response = await authenticatedFetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nextName }),
    }).catch(() => null);
    if (!response?.ok) {
      setMessage("เปลี่ยนชื่อโปรเจกต์ไม่สำเร็จ");
      return;
    }
    const payload = (await response.json()) as { project: Project };
    setProjects((current) =>
      current.map((item) =>
        item.id === payload.project.id ? { ...item, ...payload.project } : item,
      ),
    );
    if (activeProject?.id === project.id) selectProject(payload.project);
    setEditingId(null);
    setMessage("เปลี่ยนชื่อโปรเจกต์แล้ว");
  }

  async function confirmDelete() {
    if (!deleteProject) return;
    const project = deleteProject;
    const response = await authenticatedFetch(`/api/projects/${project.id}`, {
      method: "DELETE",
    }).catch(() => null);
    if (!response?.ok) {
      setMessage("ลบโปรเจกต์ไม่สำเร็จ");
      setDeleteProject(null);
      return;
    }
    setProjects((current) => current.filter((item) => item.id !== project.id));
    if (activeProject?.id === project.id) {
      clearActiveProject(window.localStorage);
      setActiveProjectState(null);
    }
    setDeleteProject(null);
    setMessage("ลบโปรเจกต์แล้ว ข้อมูลวิเคราะห์ในอุปกรณ์ยังไม่ถูกลบ");
  }

  if (status === "loading") {
    return (
      <Card className="mt-6 border-dashed">
        <CardContent className="flex items-center gap-3 pt-6 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          กำลังโหลดโปรเจกต์จากบัญชี...
        </CardContent>
      </Card>
    );
  }

  if (status === "signed_out") {
    return (
      <Card className="mt-6 border-primary/35 bg-primary/5">
        <CardHeader>
          <CardTitle>เข้าสู่ระบบก่อนสร้างหลายโปรเจกต์</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm leading-6 text-muted-foreground">
          <p>
            ใช้ปุ่ม “เข้าสู่ระบบ” ด้านบน ข้อมูลเดิมในอุปกรณ์จะยังอยู่เหมือนเดิม
            และจะผูกกับโปรเจกต์เมื่อคุณเลือกบันทึกลงบัญชี
          </p>
        </CardContent>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card className="mt-6 border-warning/50">
        <CardContent className="grid gap-3 pt-6">
          <p className="text-sm">โหลดโปรเจกต์ไม่สำเร็จ กรุณาลองใหม่</p>
          <Button className="w-fit" variant="outline" onClick={loadProjects}>
            ลองใหม่
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            สร้างโปรเจกต์ใหม่
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <label className="grid gap-1 text-sm font-medium">
            ชื่อโปรเจกต์
            <input
              className="h-10 rounded-md border border-input bg-background px-3"
              placeholder="เช่น บ้านของฉัน"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            จังหวัด (ไม่บังคับ)
            <input
              className="h-10 rounded-md border border-input bg-background px-3"
              placeholder="เช่น กรุงเทพมหานคร"
              value={province}
              onChange={(event) => setProvince(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            ประเภทผู้ใช้
            <select
              className="h-10 rounded-md border border-input bg-background px-3"
              value={segment}
              onChange={(event) =>
                setSegment(event.target.value as Project["customerSegment"])
              }
            >
              {Object.entries(segmentLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            การไฟฟ้า (ไม่บังคับ)
            <select
              className="h-10 rounded-md border border-input bg-background px-3"
              value={authority}
              onChange={(event) =>
                setAuthority(event.target.value as "" | "PEA" | "MEA")
              }
            >
              <option value="">เลือกภายหลัง</option>
              <option value="PEA">PEA</option>
              <option value="MEA">MEA</option>
            </select>
          </label>
          <Button disabled={saving || !name.trim()} onClick={createProject}>
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            สร้างโปรเจกต์
          </Button>
          {message ? (
            <p className="text-sm text-muted-foreground">{message}</p>
          ) : null}
        </CardContent>
      </Card>

      <section aria-labelledby="project-list-title">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold" id="project-list-title">
              โปรเจกต์ในบัญชี
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              โปรเจกต์ที่เลือกจะรับ Load Profile และรายงานที่บันทึกครั้งถัดไป
            </p>
          </div>
          <Badge variant="outline">{projects.length} โปรเจกต์</Badge>
        </div>
        <div className="mt-4 grid gap-3">
          {projects.length ? (
            projects.map((project) => {
              const active = activeProject?.id === project.id;
              return (
                <Card
                  className={active ? "border-2 border-primary/45" : ""}
                  key={project.id}
                >
                  <CardContent className="grid gap-4 pt-6 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                          {project.customerSegment === "RESIDENTIAL" ? (
                            <FolderKanban className="h-4 w-4 text-primary" />
                          ) : (
                            <Building2 className="h-4 w-4 text-primary" />
                          )}
                        </span>
                        {editingId === project.id ? (
                          <input
                            aria-label={`ชื่อโปรเจกต์ ${project.name}`}
                            className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 font-semibold"
                            value={editingName}
                            onChange={(event) =>
                              setEditingName(event.target.value)
                            }
                          />
                        ) : (
                          <p className="font-semibold">{project.name}</p>
                        )}
                        {active ? (
                          <Badge variant="success">กำลังใช้</Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {segmentLabels[project.customerSegment]}
                        {project.province ? ` · ${project.province}` : ""}
                        {project.authority ? ` · ${project.authority}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        รายงาน {project._count?.analysisRuns ?? 0} · Load
                        Profile {project._count?.meters ?? 0} มิเตอร์
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {editingId === project.id ? (
                        <Button
                          size="sm"
                          onClick={() => void saveName(project)}
                        >
                          <Check className="h-4 w-4" /> บันทึกชื่อ
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant={active ? "outline" : "default"}
                          disabled={active}
                          onClick={() => selectProject(project)}
                        >
                          {active ? "กำลังใช้โปรเจกต์นี้" : "เลือกใช้"}
                        </Button>
                      )}
                      <Button
                        aria-label={`เปลี่ยนชื่อ ${project.name}`}
                        className="h-9 w-9 px-0"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(project.id);
                          setEditingName(project.name);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        aria-label={`ลบ ${project.name}`}
                        className="h-9 w-9 px-0"
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteProject(project)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="border-dashed">
              <CardContent className="pt-6 text-sm leading-6 text-muted-foreground">
                ยังไม่มีโปรเจกต์
                สร้างโปรเจกต์แรกเพื่อแยกข้อมูลบ้านหรือธุรกิจออกจากกัน
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <ConfirmationDialog
        open={Boolean(deleteProject)}
        title={`ลบโปรเจกต์ “${deleteProject?.name ?? ""}”?`}
        description="มิเตอร์และข้อมูลที่ผูกกับโปรเจกต์ในบัญชีอาจถูกลบด้วย แต่ข้อมูลวิเคราะห์ที่ยังอยู่ในอุปกรณ์นี้จะไม่ถูกลบ"
        confirmLabel="ลบโปรเจกต์"
        onCancel={() => setDeleteProject(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
