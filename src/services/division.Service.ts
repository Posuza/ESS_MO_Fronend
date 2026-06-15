// ── Types ──────────────────────────────────────────────────────────────────

export interface Division {
  division_id: number;
  division_name: string;
  department_id: number;
}

// ── API client ─────────────────────────────────────────────────────────────

import { API_URL, API_CONFIG } from "../config/api.config";

async function request<T>(path: string): Promise<T> {
  const url = `${API_URL}/divisions${path}`;
  const res = await fetch(url, {
    ...API_CONFIG,
    headers: {
      ...API_CONFIG.headers,
      ...API_CONFIG.getAuthHeader(),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json();
}

// ── Service ────────────────────────────────────────────────────────────────

export const divisionService = {
  async getByDepartment(departmentId: number): Promise<Division[]> {
    return request<Division[]>(`/?department_id=${departmentId}`);
  },
};
