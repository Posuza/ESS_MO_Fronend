import { useCallback } from "react";
import { useStore } from "../store/store";
import { getDivisionScope } from "../utils/positionAccess";
import type { SectorReport } from "../services/moReporTransaction.Service";

/**
 * Hook that wraps fetchReports with position-based access control.
 *
 * Director sees all reports in the department.
 * Others see only reports in their division.
 */
export function usePositionReports() {
  const employee = useStore((state) => state.authEmployee);
  const reports = useStore((state) => state.reports);
  const isLoading = useStore((state) => state.isLoading);
  const fetchReports = useStore((state) => state.fetchReports);

  const fetchWithPosition = useCallback(() => {
    if (!employee?.department_id) return Promise.resolve<SectorReport[]>([]);
    const today = new Date().toISOString().split("T")[0];
    const scope = getDivisionScope(employee);
    const filters = {
      department_id: employee.department_id,
      start_date: today,
      end_date: today,
      ...scope,
    };
    return fetchReports(filters);
  }, [employee, fetchReports]);

  return { reports, isLoading, fetchWithPosition };
}
