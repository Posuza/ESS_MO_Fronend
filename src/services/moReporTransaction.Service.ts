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
  label: string;
  detail: string;
  status: string;
  note: string;
}

export interface SectorReport {
  id: number;
  department_id: number;
  sub_location: string;
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
  start_date?: string;
  end_date?: string;
  status?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

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
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const qs = params.toString();
    return request<SectorReport[]>(`/${qs ? `?${qs}` : ""}`);
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
};
