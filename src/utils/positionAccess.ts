import type { AuthEmployee } from "../store/Slice/auth";
import type { SectorReport } from "../services/moReporTransaction.Service";
import type { SectorReportFilters } from "../store/Slice/moDailyTransactionSlice";

/** Access levels for report data scope. */
export const AccessLevel = {
  /** position 1,5: see ALL reports in their department + can approve */
  ALL_DEPT: "ALL_DEPT",
  /** position 2,6: see reports in their division only, no approval */
  DIVISION_ONLY: "DIVISION_ONLY",
  /** position 3,4: see only their own reports, no approval */
  OWN_ONLY: "OWN_ONLY",
} as const;

export type AccessLevel = (typeof AccessLevel)[keyof typeof AccessLevel];

export const WorkflowState = {
  WAITING: "WAITING",
  EDITING: "EDITING",
  RETURNED_TO: "RETURNED_TO",
  APPROVED: "APPROVED",
} as const;

const workflowRanks = ["MANAGER", "DIRECTOR"];

function normalizePositionId(positionId?: number | string | null): number | null {
  if (positionId == null || positionId === "") return null;
  const parsed = Number(positionId);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getWorkflowRank(positionId?: number | string | null): string | null {
  switch (normalizePositionId(positionId)) {
    case 1:
    case 5:
      return "DIRECTOR";
    case 2:
    case 6:
      return "MANAGER";
    default:
      return null;
  }
}

export function makeWorkflowStatus(
  rankCode: string,
  state: string,
): string {
  const rank = rankCode.toUpperCase();
  const normalizedState = state.toUpperCase();
  if (normalizedState === WorkflowState.WAITING) return `WAITING_${rank}`;
  if (normalizedState === WorkflowState.EDITING) return `EDITING_${rank}`;
  if (normalizedState === WorkflowState.RETURNED_TO) return `RETURNED_TO_${rank}`;
  if (normalizedState === WorkflowState.APPROVED) return `APPROVED_${rank}`;
  return `${normalizedState}_${rank}`;
}

function splitWorkflowStatus(
  workflowStatus?: string | null,
): { rank: string; state: string } {
  const value = String(workflowStatus ?? "").toUpperCase();
  const prefixes: Array<[string, string]> = [
    ["RETURNED_TO_", WorkflowState.RETURNED_TO],
    ["WAITING_", WorkflowState.WAITING],
    ["EDITING_", WorkflowState.EDITING],
    ["APPROVED_", WorkflowState.APPROVED],
  ];

  for (const [prefix, state] of prefixes) {
    if (value.startsWith(prefix)) {
      return { rank: value.slice(prefix.length), state };
    }
  }

  const index = value.lastIndexOf("_");
  if (index < 0) return { rank: "", state: "" };
  const legacyRank = value.slice(0, index);
  const legacyState = value.slice(index + 1);
  if (legacyState === "PENDING") {
    return { rank: legacyRank, state: WorkflowState.WAITING };
  }
  if (legacyState === "REJECTED") {
    return {
      rank: getPreviousWorkflowRank(legacyRank) || legacyRank,
      state: WorkflowState.RETURNED_TO,
    };
  }
  return { rank: legacyRank, state: legacyState };
}

function getPreviousWorkflowRank(rank: string): string | null {
  const index = workflowRanks.indexOf(rank);
  if (index <= 0) return null;
  return workflowRanks[index - 1];
}

function getNextWorkflowRank(rank: string): string | null {
  const index = workflowRanks.indexOf(rank);
  if (index < 0 || index >= workflowRanks.length - 1) return null;
  return workflowRanks[index + 1];
}

export function canApproveWorkflow(
  employee: AuthEmployee | null,
  report?: Partial<SectorReport> | null,
): boolean {
  const rank = getWorkflowRank(employee?.position_id);
  if (!rank) return false;
  const workflowStatus = String(report?.workflow_status ?? "").trim();
  if (!workflowStatus || workflowStatus.toUpperCase() === "PENDING") {
    return rank === "DIRECTOR" && report?.approved_status === "PENDING";
  }
  const { rank: workflowRank, state } = splitWorkflowStatus(workflowStatus);
  return workflowRank === rank && state === WorkflowState.WAITING;
}

export function canSendBackWorkflow(
  employee: AuthEmployee | null,
  report?: Partial<SectorReport> | null,
): boolean {
  const rank = getWorkflowRank(employee?.position_id);
  if (!rank) return false;
  const workflowStatus = String(report?.workflow_status ?? "").trim();
  if (!workflowStatus) {
    return rank === "DIRECTOR" && report?.approved_status === "APPROVED";
  }
  const { rank: workflowRank, state } = splitWorkflowStatus(workflowStatus);
  return (
    workflowRank === rank &&
    (state === WorkflowState.WAITING || state === WorkflowState.APPROVED)
  );
}

export function canEditWorkflow(
  employee: AuthEmployee | null,
  report?: Partial<SectorReport> | null,
): boolean {
  const rank = getWorkflowRank(employee?.position_id);
  if (!rank) return false;
  const { rank: workflowRank, state } = splitWorkflowStatus(
    report?.workflow_status,
  );
  if (state === WorkflowState.RETURNED_TO) {
    return (
      workflowRank === rank || report?.approved_by === employee?.employee_code
    );
  }
  if (
    state === WorkflowState.WAITING &&
    report?.created_by === employee?.employee_code
  ) {
    return true;
  }
  if (workflowRank !== rank) return false;
  return (
    state === WorkflowState.EDITING &&
    report?.updated_by === employee?.employee_code
  );
}

export function isWorkflowLockedByOther(
  employee: AuthEmployee | null,
  report?: Partial<SectorReport> | null,
): boolean {
  const { state } = splitWorkflowStatus(report?.workflow_status);
  return (
    state === WorkflowState.EDITING &&
    !!report?.updated_by &&
    report.updated_by !== employee?.employee_code
  );
}

export function getWorkflowRankLabel(workflowStatus?: string | null): string {
  const { rank } = splitWorkflowStatus(workflowStatus);
  switch (rank) {
    case "DIRECTOR":
      return "ผู้อำนวยการ";
    case "MANAGER":
      return "ผู้จัดการ";
    case "GM":
      return "GM";
    case "CEO":
      return "CEO";
    default:
      return "ผู้ใช้อื่น";
  }
}

export function getRestoreWorkflowStatus(
  employee: AuthEmployee | null,
  report?: Partial<SectorReport> | null,
): string | null {
  const actorRank = getWorkflowRank(employee?.position_id);
  if (!actorRank) return null;

  const { rank: workflowRank, state } = splitWorkflowStatus(
    report?.workflow_status,
  );
  if (state !== WorkflowState.EDITING) {
    return report?.workflow_status ?? null;
  }

  if (report?.approved_status === "REJECTED") {
    if (report.approved_by === employee?.employee_code) {
      const returnedRank = getPreviousWorkflowRank(actorRank) || actorRank;
      return makeWorkflowStatus(returnedRank, WorkflowState.RETURNED_TO);
    }
    return makeWorkflowStatus(actorRank, WorkflowState.RETURNED_TO);
  }

  if (report?.approved_status === "APPROVED") {
    return makeWorkflowStatus(workflowRank || actorRank, WorkflowState.APPROVED);
  }

  const waitingRank = getNextWorkflowRank(actorRank) || workflowRank || actorRank;
  return makeWorkflowStatus(waitingRank, WorkflowState.WAITING);
}

export function getLocalTodayYYYYMMDD() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/** Determine access level from position_id. */
export function getAccessLevel(positionId?: number | string | null): AccessLevel {
  switch (normalizePositionId(positionId)) {
    case 1:
    case 5:
      return AccessLevel.ALL_DEPT;
    case 2:
    case 6:
      return AccessLevel.DIVISION_ONLY;
    case 3:
    case 4:
      return AccessLevel.OWN_ONLY;
    default:
      return AccessLevel.OWN_ONLY;
  }
}

/** Whether this position can approve/reject reports. */
export function canApprove(
  positionId?: number | string | null,
  positionIsActive?: boolean,
): boolean {
  // Deactivated positions cannot approve
  if (positionIsActive === false) return false;
  const normalizedPositionId = normalizePositionId(positionId);
  return normalizedPositionId === 1 || normalizedPositionId === 5;
}

/**
 * Whether this position is read-only (can only VIEW reports, never create/edit/delete).
 *
 * Read-only positions: 3, 4, any unknown position, OR deactivated positions.
 */
export function isReadOnly(
  positionId?: number | null,
  positionIsActive?: boolean,
): boolean {
  // Deactivated positions are always read-only
  if (positionIsActive === false) return true;
  const level = getAccessLevel(positionId);
  return level === AccessLevel.OWN_ONLY;
}

/**
 * Get division scoping filter based on employee role.
 * Director (position 1 or 5) sees all divisions — returns empty filter.
 * Everyone else sees only their own division.
 * If the employee has no division_id, returns -1 to ensure no results.
 */
export function getDivisionScope(employee: AuthEmployee | null): {
  division_id?: number;
} {
  if (!employee) return {};
  const level = getAccessLevel(employee.position_id);
  if (level === AccessLevel.ALL_DEPT) return {};
  if (employee.division_id != null) {
    return { division_id: employee.division_id };
  }
  // No division assigned — return invalid ID so API returns nothing
  return { division_id: -1 };
}

/**
 * Build fetch filters based on employee's position and data.
 *
 * @param employee - The authenticated employee object
 * @param dateRange - Optional start/end date overrides (defaults to today)
 * @returns Filters to pass to fetchReports
 */
export function buildReportFilters(
  employee: AuthEmployee | null,
  dateRange?: { start_date?: string; end_date?: string },
): SectorReportFilters {
  if (!employee?.department_id) return {};

  const base: SectorReportFilters = {
    department_id: employee.department_id,
    start_date: dateRange?.start_date ?? getLocalTodayYYYYMMDD(),
    end_date: dateRange?.end_date ?? getLocalTodayYYYYMMDD(),
  };

  const level = getAccessLevel(employee.position_id);

  switch (level) {
    case AccessLevel.ALL_DEPT:
      // See all reports in the department – no extra filters
      return base;

    case AccessLevel.DIVISION_ONLY:
      // See only their division's reports.
      return {
        ...base,
        division_id: employee.division_id != null ? employee.division_id : -1,
      };

    case AccessLevel.OWN_ONLY:
      // See only their division's reports.
      return {
        ...base,
        division_id: employee.division_id != null ? employee.division_id : -1,
      };

    default:
      return base;
  }
}
