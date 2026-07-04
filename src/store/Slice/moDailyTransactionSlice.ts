import type { StateCreator } from "zustand";
import {
  sectorReportService,
  type SectorReport,
  type EmployeeTodayReport,
  type DistinctDiscipline,
} from "../../services/moReporTransaction.Service";
import type { AuthEmployee } from "./auth";

export interface SectorReportFilters {
  department_id?: number;
  division_id?: number;
  created_by?: string;
  start_date?: string;
  end_date?: string;
  approved_status?: string;
}

export interface SectorReportSlice {
  reports: SectorReport[];
  currentReport: SectorReport | null;
  isLoading: boolean;
  error: string | null;
  reportCache: Record<string, SectorReport[]>; // Add reportCache to the interface

  /** Fresh position-active check (refetched on MoHome mount). */
  positionActive: boolean;
  positionActiveLoading: boolean;

  fetchReports: (filters?: SectorReportFilters) => Promise<SectorReport[]>;
  fetchReportById: (id: number) => Promise<void>;
  createReport: (data: any) => Promise<void>;
  updateReport: (id: number, data: any) => Promise<void>;
  deleteReport: (id: number) => Promise<void>;

  /**
   * Fetch today's existing report for a department + employee.
   * Returns subLocation, disciplines array, and extra discipline-like
   * flat fields (e.g. discipline_other_count, other1_count, …) as
   * key/label/value items.
   */
  fetchEmployeeTodayReport: (
    departmentId: number,
    empCode: string,
  ) => Promise<EmployeeTodayReport>;

  /**
   * Fetch all distinct discipline types (key + label only) from across all reports.
   * Deduplicates by key — no values, no ids.
   */
  fetchDistinctDisciplineTypes: () => Promise<DistinctDiscipline[]>;

  /**
   * Fetch today's reports for a department.
   * Returns division id + name for each report submitted today in this department.
   */
  fetchTodayDepartmentReportDivisions: (
    departmentId: number,
  ) => Promise<{ division_id: number; division_name: string }[]>;

  /**
   * Fresh DB check of the current employee's position active status.
   * Returns ``true`` if the position is active.
   */
  checkPositionActive: () => Promise<boolean>;
}

type SectorReportSliceDependencies = {
  authEmployee: AuthEmployee | null;
};

export const createSectorReportSlice: StateCreator<
  SectorReportSlice & SectorReportSliceDependencies,
  [],
  [],
  SectorReportSlice
> = (
  set,
  get,
) => ({
  reports: [],
  currentReport: null,
  isLoading: false,
  error: null,
  reportCache: {},
  positionActive: true,
  positionActiveLoading: false,

  fetchReports: async (filters?: SectorReportFilters) => {
    const cacheKey = JSON.stringify(filters || {});
    // Bypass cache — always fetch fresh data
    set({ isLoading: true, error: null });
    console.log("SectorReportSlice: Fetching with filters:", filters);
    try {
      const positionActive = await get().checkPositionActive();
      if (!positionActive) {
        set({ reports: [], isLoading: false });
        return [];
      }
      const reports = await sectorReportService.getAll(filters);
      // Update cache and state
      set((state) => ({
        reports,
        isLoading: false,
        reportCache: { ...state.reportCache, [cacheKey]: reports },
      }));
      return reports;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchReportById: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const positionActive = await get().checkPositionActive();
      if (!positionActive) {
        set({ currentReport: null, isLoading: false });
        return;
      }
      const currentReport = await sectorReportService.getById(id);
      set({ currentReport, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  createReport: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const positionActive = await get().checkPositionActive();
      if (!positionActive) {
        throw new Error("ตำแหน่งนี้ถูกปิดใช้งาน ไม่สามารถดำเนินการได้");
      }
      const newReport = await sectorReportService.create(data);
      set((state) => ({
        reports: [newReport, ...state.reports],
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateReport: async (id: number, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const positionActive = await get().checkPositionActive();
      if (!positionActive) {
        throw new Error("ตำแหน่งนี้ถูกปิดใช้งาน ไม่สามารถดำเนินการได้");
      }
      const updatedReport = await sectorReportService.update(id, data);
      set((state) => ({
        reports: state.reports.map((r) => (r.id === id ? updatedReport : r)),
        currentReport:
          state.currentReport?.id === id ? updatedReport : state.currentReport,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteReport: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const positionActive = await get().checkPositionActive();
      if (!positionActive) {
        throw new Error("ตำแหน่งนี้ถูกปิดใช้งาน ไม่สามารถดำเนินการได้");
      }
      await sectorReportService.delete(id);
      set((state) => ({
        reports: state.reports.filter((r) => r.id !== id),
        currentReport:
          state.currentReport?.id === id ? null : state.currentReport,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchEmployeeTodayReport: async (departmentId, empCode) => {
    set({ isLoading: true, error: null });
    try {
      const positionActive = await get().checkPositionActive();
      if (!positionActive) {
        set({ isLoading: false });
        return {
          hasReport: false,
          divisionName: "",
          disciplines: [],
          disciplineExtraFields: [],
        };
      }
      const result = await sectorReportService.getEmployeeTodayReport(
        departmentId,
        empCode,
      );
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchTodayDepartmentReportDivisions: async (departmentId) => {
    set({ isLoading: true, error: null });
    try {
      const positionActive = await get().checkPositionActive();
      if (!positionActive) {
        set({ isLoading: false });
        return [];
      }
      const result =
        await sectorReportService.getTodayDepartmentReportDivisions(
          departmentId,
        );
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchDistinctDisciplineTypes: async () => {
    set({ isLoading: true, error: null });
    try {
      const positionActive = await get().checkPositionActive();
      if (!positionActive) {
        set({ isLoading: false });
        return [];
      }
      const result = await sectorReportService.getDistinctDisciplineTypes();
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  checkPositionActive: async () => {
    set({ positionActiveLoading: true });
    try {
      const result = await sectorReportService.checkPositionActive();
      set((state) => {
        let nextEmployee = state.authEmployee;

        if (state.authEmployee) {
          const mergedEmployee = {
            ...state.authEmployee,
            position_id: result.position_id,
            position_name: result.position_name ?? state.authEmployee.position_name,
            department_id: result.department_id,
            department_name:
              result.department_name ?? state.authEmployee.department_name,
            division_id: result.division_id,
            division_name: result.division_name ?? state.authEmployee.division_name,
          };
          const hasEmployeeChanged =
            mergedEmployee.position_id !== state.authEmployee.position_id ||
            mergedEmployee.position_name !== state.authEmployee.position_name ||
            mergedEmployee.department_id !== state.authEmployee.department_id ||
            mergedEmployee.department_name !== state.authEmployee.department_name ||
            mergedEmployee.division_id !== state.authEmployee.division_id ||
            mergedEmployee.division_name !== state.authEmployee.division_name;

          nextEmployee = hasEmployeeChanged
            ? mergedEmployee
            : state.authEmployee;
        }

        if (nextEmployee) {
          sessionStorage.setItem("auth_employee", JSON.stringify(nextEmployee));
        }

        return {
          authEmployee: nextEmployee,
          positionActive: result.position_is_active,
          positionActiveLoading: false,
        };
      });
      return result.position_is_active;
    } catch {
      set({ positionActive: false, positionActiveLoading: false });
      return false;
    }
  },
});
