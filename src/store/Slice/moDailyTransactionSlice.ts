import type { StateCreator } from "zustand";
import {
  sectorReportService,
  type SectorReport,
  type EmployeeTodayReport,
  type DistinctDiscipline,
} from "../../services.dev/moDailyTransaction.Service";
// import {
//   sectorReportService,
//   type SectorReport,
// } from "../../services/moReporTransaction.Service";

export interface SectorReportFilters {
  department_id?: number;
  start_date?: string;
  end_date?: string;
  status?: string;
}

export interface SectorReportSlice {
  reports: SectorReport[];
  currentReport: SectorReport | null;
  isLoading: boolean;
  error: string | null;

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
   * Fetch today's unique sub_location values for a department + employee.
   * Returns sorted array of sub_location strings from today's reports.
   */
  fetchEmployeeTodayReportSubLocations: (
    departmentId: number,
    empCode: string,
  ) => Promise<string[]>;
}

export const createSectorReportSlice: StateCreator<SectorReportSlice> = (
  set,
) => ({
  reports: [],
  currentReport: null,
  isLoading: false,
  error: null,

  fetchReports: async (filters?: SectorReportFilters) => {
    set({ isLoading: true, error: null });
    console.log("SectorReportSlice: Fetching with filters:", filters);
    try {
      const reports = await sectorReportService.getAll(filters);
      set({ reports, isLoading: false });
      return reports;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchReportById: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
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

  fetchEmployeeTodayReportSubLocations: async (departmentId, empCode) => {
    set({ isLoading: true, error: null });
    try {
      const result =
        await sectorReportService.getEmployeeTodayReportSubLocations(
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

  fetchDistinctDisciplineTypes: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await sectorReportService.getDistinctDisciplineTypes();
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
});
