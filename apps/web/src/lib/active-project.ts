export const activeProjectStorageKey = "thai-energy-planner.active-project.v1";
export const activeProjectChangedEvent =
  "thai-energy-planner:active-project-changed";

export type ActiveProject = {
  id: string;
  name: string;
  updatedAt: string;
};

type ProjectStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readActiveProject(
  storage: Pick<Storage, "getItem">,
): ActiveProject | null {
  try {
    const raw = storage.getItem(activeProjectStorageKey);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<ActiveProject>;
    return typeof value.id === "string" &&
      value.id.length >= 8 &&
      typeof value.name === "string" &&
      value.name.trim().length > 0 &&
      typeof value.updatedAt === "string" &&
      Number.isFinite(Date.parse(value.updatedAt))
      ? { id: value.id, name: value.name.trim(), updatedAt: value.updatedAt }
      : null;
  } catch {
    return null;
  }
}

export function setActiveProject(
  storage: ProjectStorage,
  project: ActiveProject,
) {
  storage.setItem(activeProjectStorageKey, JSON.stringify(project));
  announceActiveProjectChanged();
}

export function clearActiveProject(storage: ProjectStorage) {
  storage.removeItem(activeProjectStorageKey);
  announceActiveProjectChanged();
}

export function announceActiveProjectChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(activeProjectChangedEvent));
}
