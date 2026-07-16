import { describe, expect, it } from "vitest";
import {
  activeProjectStorageKey,
  clearActiveProject,
  readActiveProject,
  setActiveProject,
} from "./active-project";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("active project storage", () => {
  it("stores, reads and clears the selected project", () => {
    const storage = createStorage();
    const project = {
      id: "project-123",
      name: "บ้านของฉัน",
      updatedAt: "2026-07-16T12:00:00.000Z",
    };
    setActiveProject(storage, project);
    expect(readActiveProject(storage)).toEqual(project);
    clearActiveProject(storage);
    expect(readActiveProject(storage)).toBeNull();
  });

  it("ignores malformed or incomplete values", () => {
    const storage = createStorage();
    storage.setItem(activeProjectStorageKey, "not-json");
    expect(readActiveProject(storage)).toBeNull();
    storage.setItem(
      activeProjectStorageKey,
      JSON.stringify({ id: "short", name: "บ้าน" }),
    );
    expect(readActiveProject(storage)).toBeNull();
  });
});
