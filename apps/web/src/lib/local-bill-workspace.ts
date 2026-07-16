import { z } from "zod";
import {
  billWorkspaceStorageKey,
  type StoredBillWorkspace,
} from "./local-analysis-snapshot";

const maxBillRows = 120;
const storedBillRowSchema = z.object({
  id: z.string().min(1).max(128),
  month: z.string().max(7),
  energyKwh: z.string().max(32),
  totalCostThb: z.string().max(32),
  authority: z.enum(["PEA", "MEA"]),
  meterMode: z.enum(["normal", "tou"]),
});

const storedBillWorkspaceSchema = z.object({
  audience: z.enum(["home", "shop", "business"]),
  mode: z.enum(["empty", "sample", "user"]),
  rows: z.array(storedBillRowSchema).max(maxBillRows),
  updatedAt: z.string().datetime(),
  projectId: z
    .string()
    .regex(/^[a-z0-9_-]{8,160}$/i)
    .optional(),
});

export function parseStoredBillWorkspace(
  value: unknown,
): StoredBillWorkspace | null {
  const parsed = storedBillWorkspaceSchema.safeParse(value);
  if (!parsed.success) return null;
  if (parsed.data.mode === "empty" && parsed.data.rows.length > 0) return null;
  if (parsed.data.mode !== "empty" && parsed.data.rows.length === 0)
    return null;
  const { projectId, ...workspace } = parsed.data;
  return {
    ...workspace,
    ...(projectId ? { projectId } : {}),
  };
}

export function readStoredBillWorkspace(): StoredBillWorkspace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(billWorkspaceStorageKey);
    return raw ? parseStoredBillWorkspace(JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

export function storedBillWorkspaceMatchesProject(
  workspace: StoredBillWorkspace | null,
  projectId?: string,
) {
  if (!workspace) return false;
  return projectId
    ? workspace.projectId === projectId
    : workspace.projectId === undefined;
}

export { maxBillRows };
