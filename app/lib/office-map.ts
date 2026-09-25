// Pure office helpers (P005 / S10-A, Agent A — OpenCode; trimmed in SIM-VIS-01).
//
// SIM-VIS-01 moved the visual floor-plan geometry to `floor-plan.ts` and the
// device wording to `equipment.ts`. The policy/summary/selection helpers below
// are unchanged and still used by the map panel and the room inspector. No
// React imports so they can be exercised outside a browser. Contract v1.0.1.

import type { Inventory } from "./inventory";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function graceSeconds(
  rules: Record<string, unknown>,
): number | null {
  const v = rules.vacancy_grace_seconds;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function officeHoursSummary(inv: Inventory): string | null {
  const policy = inv.policies.find((p) => p.kind === "office_hours") ?? null;
  if (!policy) return null;
  const days = policy.rules.working_days_iso;
  const open = policy.rules.open_local;
  const close = policy.rules.close_local;
  if (
    !Array.isArray(days) ||
    !days.every((d) => typeof d === "number") ||
    typeof open !== "string" ||
    typeof close !== "string"
  ) {
    return `${policy.policy_id} v${policy.version}`;
  }
  const names = (days as number[])
    .filter((d) => d >= 1 && d <= 7)
    .map((d) => WEEKDAYS[d - 1])
    .join(", ");
  return `${names} ${open}–${close} (${policy.policy_id} v${policy.version})`;
}

/**
 * Selection resolution across refresh: preserve the previous room when it
 * still exists, otherwise fall back to the first room, else null.
 */
export function resolveSelection(
  roomIds: string[],
  prevId: string | null,
): string | null {
  if (prevId && roomIds.includes(prevId)) return prevId;
  return roomIds[0] ?? null;
}
