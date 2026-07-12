import { ApplianceInputSchema, type ApplianceInput } from "@thai-energy-planner/shared-types";
import { z } from "zod";
import type { ApplianceWorkspaceMode } from "@/components/appliance-workspace-state";

export const applianceWorkspaceStorageKey = "thai-energy-planner.appliance-workspace.v3";
export const maxStoredAppliances = 100;

const applianceWorkspaceSchema = z.object({
  mode: z.enum(["empty", "sample", "user"]),
  appliances: z.array(ApplianceInputSchema).max(maxStoredAppliances),
  intervalMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type StoredApplianceWorkspace = {
  mode: ApplianceWorkspaceMode;
  appliances: ApplianceInput[];
  intervalMinutes: 15 | 30 | 60;
  startDate: string;
  endDate: string;
};

export function parseStoredApplianceWorkspace(value: unknown): StoredApplianceWorkspace | null {
  const parsed = applianceWorkspaceSchema.safeParse(value);
  if (!parsed.success) return null;
  if (parsed.data.mode === "empty" ? parsed.data.appliances.length > 0 : parsed.data.appliances.length === 0) return null;
  if (parsed.data.endDate < parsed.data.startDate) return null;
  return parsed.data;
}

export function readStoredApplianceWorkspace(): StoredApplianceWorkspace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(applianceWorkspaceStorageKey);
    return raw ? parseStoredApplianceWorkspace(JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}
