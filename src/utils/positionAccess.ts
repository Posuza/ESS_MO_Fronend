import type { AuthEmployee } from "../store/Slice/auth";
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

export function getLocalTodayYYYYMMDD() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/** Determine access level from position_id. */
export function getAccessLevel(positionId?: number | null): AccessLevel {
  switch (positionId) {
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
  positionId?: number | null,
  positionIsActive?: boolean,
): boolean {
  // Deactivated positions cannot approve
  if (positionIsActive === false) return false;
  return positionId === 1 || positionId === 5;
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
      // See only their division's reports
      // If division_id is available, filter by it; otherwise return all dept reports
      if (employee.division_id != null) {
        return { ...base, division_id: employee.division_id };
      }
      return base;

    case AccessLevel.OWN_ONLY:
      // See their division's reports
      if (employee.division_id != null) {
        return { ...base, division_id: employee.division_id };
      }
      return base;

    default:
      return base;
  }
}
