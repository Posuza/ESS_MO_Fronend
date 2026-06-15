import { useCallback } from "react";
import { useStore } from "../store/store";
import { buildReportFilters } from "../utils/positionAccess";
import type { SectorReport } from "../services/moReporTransaction.Service";

/**
 * Hook that wraps fetchReports with position-based access control.
 *
 * Automatically derives the correct filters (created_by, division_id, etc.)
 * from the authenticated employee's position_id.
 */
export function usePositionReports() {
  const employee = useStore((state) => state.authEmployee);
  const reports = useStore((state) => state.reports);
  const isLoading = useStore((state) => state.isLoading);
  const fetchReports = useStore((state) => state.fetchReports);

  const fetchWithPosition = useCallback(() => {
    if (!employee?.department_id) return Promise.resolve<SectorReport[]>([]);
    const filters = buildReportFilters(employee);
    return fetchReports(filters);
  }, [employee, fetchReports]);

  return { reports, isLoading, fetchWithPosition };
}
