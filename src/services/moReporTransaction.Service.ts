import { API_URL, API_CONFIG } from "../config/api.config";

// ── Types ──────────────────────────────────────────────────────────────────

export interface SectorReportDiscipline {
  id?: string | number;
  key: string;
  label: string;
  value: number;
}

export interface SectorReportProject {
  id: string;
  name: string;
  detail: string;
  status: string;
  note: string;
}

export interface SectorReport {
  id: number;
  department_id: number;
  department_name: string;
  division_id: number;
  division_name: string;
  report_date: string;
  status: string;
  approved_status?: string;
  approved_by?: string | null;
  approved_at?: string | null;
  approved_remark?: string | null;
  created_at?: string;
  created_by: string;
  updated_by?: string | null;
  updated_at?: string | null;

  // Group 1 — หน่วยงานที่รับผิดชอบ
  dept_guard_post_count: number;
  dept_current_personnel_count: number;
  dept_missing_regular_count: number;
  dept_missing_personnel_count: number;
  dept_supplement_count: number;
  dept_recruitment_count: number;
  dept_reserve_units_count: number;
  dept_reserve_personnel_count: number;

  // Group 2 — การลา
  leave_personal_count: number;
  leave_sick_count: number;
  leave_absent_count: number;
  leave_deserted_count: number;
  leave_resigned_count: number;
  leave_terminated_count: number;
  leave_other_count: number;

  // Group 3 — การบริหารการควงเวร
  shift_18_count: number;
  shift_24_count: number;
  shift_36_count: number;

  // Group 4 — อบรมและควบคุมหน้าที่งาน
  training_shift_change_count: number;
  training_planned_count: number;
  training_duty_control_count: number;

  // Group 5 — วินัยและการลงโทษ (dynamic array)
  disciplines: SectorReportDiscipline[];

  // Group 6 — เข้าพบผู้ว่าจ้าง (dynamic array)
  projects: SectorReportProject[];
}

export interface SectorReportFilters {
  department_id?: number;
  division_id?: number;
  created_by?: string;
  start_date?: string;
  end_date?: string;
  approved_status?: string;
}

/** Shape returned by getDistinctDisciplineTypes(). Only key + label, no value. */
export interface DistinctDiscipline {
  key: string;
  label: string;
}

/**
 * Shape returned by getEmployeeTodayReport().
 */
export interface EmployeeTodayReport {
  hasReport: boolean;
  divisionName: string;
  disciplines: SectorReportDiscipline[];
  disciplineExtraFields: Array<{
    key: string;
    label: string;
    value: number;
  }>;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Map frontend filter keys to backend query params. */
function toQuery(filters?: SectorReportFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.department_id != null)
    params.set("department_id", String(filters.department_id));
  if (filters.division_id != null)
    params.set("division_id", String(filters.division_id));
  if (filters.created_by) params.set("created_by", filters.created_by);
  if (filters.start_date) params.set("start_date", filters.start_date);
  if (filters.end_date) params.set("end_date", filters.end_date);
  if (filters.approved_status) params.set("status", filters.approved_status);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}/mo-daily-transactions${path}`;
  const res = await fetch(url, {
    ...API_CONFIG,
    headers: {
      ...API_CONFIG.headers,
      ...API_CONFIG.getAuthHeader(),
      ...((options?.headers as Record<string, string>) ?? {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      typeof data?.detail === "string"
        ? data.detail
        : data?.detail
          ? JSON.stringify(data.detail)
          : `API error ${res.status}`;
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;

  // Map mo_daily_transaction_id → id
  if (Array.isArray(data)) {
    return data.map((item: any) => ({
      ...item,
      id: item.mo_daily_transaction_id,
    })) as T;
  }
  return { ...data, id: data.mo_daily_transaction_id } as T;
}

// ── CRUD Service ───────────────────────────────────────────────────────────

export const sectorReportService = {
  async getAll(filters?: SectorReportFilters): Promise<SectorReport[]> {
    return request<SectorReport[]>(`/${toQuery(filters)}`);
  },

  async getById(id: number): Promise<SectorReport> {
    return request<SectorReport>(`/${id}`);
  },

  async create(data: any): Promise<SectorReport> {
    return request<SectorReport>("/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: any): Promise<SectorReport> {
    return request<SectorReport>(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<void> {
    await request<void>(`/${id}`, { method: "DELETE" });
  },

  // ── Derived / convenience methods ────────────────────────────────────────

  /**
   * Fetch ALL distinct discipline types (key + label) from across all reports.
   */
  async getDistinctDisciplineTypes(): Promise<DistinctDiscipline[]> {
    // Start with the 4 standard discipline types as baseline
    const standardMap = new Map<string, DistinctDiscipline>([
      [
        "discipline_phone_count",
        { key: "discipline_phone_count", label: "เล่นโทรศัพท์มือถือ :" },
      ],
      [
        "discipline_belt_count",
        { key: "discipline_belt_count", label: "ไม่มีเข็มขัด :" },
      ],
      [
        "discipline_badge_count",
        { key: "discipline_badge_count", label: "ไม่แขวนบัตร :" },
      ],
      [
        "discipline_uniform_count",
        { key: "discipline_uniform_count", label: "ชุดชำรุดเก่า :" },
      ],
    ]);

    // Merge with any additional types found in existing reports
    try {
      const allReports = await this.getAll();
      const customSeen = new Set<string>();
      const custom: { key: string; label: string }[] = [];

      for (const report of allReports) {
        for (const d of report.disciplines ?? []) {
          if (d.key === "discipline_other_count") {
            if (!customSeen.has(d.label)) {
              customSeen.add(d.label);
              custom.push({ key: "", label: d.label });
            }
          } else if (d.key && d.label) {
            // Update or add standard/custom types from reports
            standardMap.set(d.key, { key: d.key, label: d.label });
          }
        }
      }

      const result = Array.from(standardMap.values());
      custom.forEach((c, i) => {
        result.push({ key: `discipline_custom_${i + 1}`, label: c.label });
      });
      return result;
    } catch {
      // If fetching reports fails, return at least the standard types
      return Array.from(standardMap.values());
    }
  },

  /**
   * Fetch today's reports for a department.
   */
  async getTodayDepartmentReportDivisions(
    departmentId: number,
  ): Promise<{ division_id: number; division_name: string }[]> {
    const today = new Date().toISOString().slice(0, 10);
    const reports = await this.getAll({
      department_id: departmentId,
      start_date: today,
      end_date: today,
    });

    const seen = new Set<number>();
    const result: { division_id: number; division_name: string }[] = [];
    for (const r of reports) {
      if (r.division_id && !seen.has(r.division_id)) {
        seen.add(r.division_id);
        result.push({
          division_id: r.division_id,
          division_name: r.division_name,
        });
      }
    }
    return result;
  },

  /**
   * Fetch today's report for a specific employee in their department.
   */
  async getEmployeeTodayReport(
    departmentId: number,
    empCode: string,
  ): Promise<EmployeeTodayReport> {
    const today = new Date().toISOString().slice(0, 10);
    const reports = await this.getAll({
      department_id: departmentId,
      created_by: empCode,
      start_date: today,
      end_date: today,
    });

    if (reports.length === 0) {
      return {
        hasReport: false,
        divisionName: "",
        disciplines: [],
        disciplineExtraFields: [],
      };
    }

    const report = reports[0];

    return {
      hasReport: true,
      divisionName: report.division_name ?? "",
      disciplines: report.disciplines ?? [],
      disciplineExtraFields: [],
    };
  },
};
