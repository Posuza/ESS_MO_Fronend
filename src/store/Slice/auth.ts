import type { StateCreator } from "zustand";
import { authService } from "@/services/auth.Service";

export interface AuthEmployee {
  employee_code: string;
  email: string | null;
  first_name: string;
  last_name: string;
  role_id: number;
  is_active: boolean;
}

export interface AuthSlice {
  // State
  authEmployee: AuthEmployee | null;
  authLoading: boolean;
  authError: string | null;

  // Actions
  login: (employee_code: string, password: string) => Promise<boolean>;
  logout: (employee_code: string) => Promise<void>;
  clearAuthError: () => void;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  authEmployee: null,
  authLoading: false,
  authError: null,

  login: async (employee_code, password) => {
    set({ authLoading: true, authError: null });
    try {
      const result = await authService.login(employee_code, password);

      if (result.success && result.data) {
        const emp: AuthEmployee = result.data.employee;
        const displayName = `${emp.first_name} ${emp.last_name}`.trim() || emp.employee_code;

        localStorage.setItem("emp_code", emp.employee_code);
        localStorage.setItem("display_name", displayName);

        set({ authEmployee: emp, authLoading: false, authError: null });
        return true;
      }

      set({ authLoading: false, authError: result.message || "เข้าสู่ระบบไม่สำเร็จ" });
      return false;
    } catch {
      set({ authLoading: false, authError: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์" });
      return false;
    }
  },

  logout: async (employee_code) => {
    try {
      await fetch(
        `${(await import("@/config/api.config")).API_URL}/auth/logout?employee_code=${employee_code}`,
        { method: "POST" }
      );
    } catch {
      // fire-and-forget — clear local state regardless
    }
    localStorage.removeItem("emp_code");
    localStorage.removeItem("display_name");
    set({ authEmployee: null, authError: null });
  },

  clearAuthError: () => set({ authError: null }),
});
