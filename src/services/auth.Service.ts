// src/services/auth.Service.ts
import { API_URL, API_CONFIG } from "@/config/api.config";

const API_BASE_URL = API_URL;

/** Build headers that include geo/device info from localStorage (optional). */
function _geoHeaders(): Record<string, string> {
  const lat = localStorage.getItem("geo_lat");
  const lng = localStorage.getItem("geo_lng");
  const geoStatus = localStorage.getItem("geo_status");
  if (lat && lng) return { "X-Latitude": lat, "X-Longitude": lng };
  if (geoStatus) return { "X-Geo-Status": geoStatus };
  return {};
}

export interface ForgotPasswordRequest {
  employee_code: string;
  send_plain_password: boolean;
}

export interface ForgotPasswordResponse {
  message: string;
}

export const authService = {
  /**
   * Send forgot password request - sends password to employee's registered email
   */
  async forgotPassword(
    employee_code: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ..._geoHeaders(),
          },
          body: JSON.stringify({
            employee_code,
            send_plain_password: true,
          } as ForgotPasswordRequest),
        }
      );

      if (response.ok) {
        const data: ForgotPasswordResponse = await response.json();
        return {
          success: true,
          message: data.message || "ส่งรหัสผ่านไปยังอีเมลเรียบร้อยแล้ว",
        };
      }

      // Handle error responses
      const status = response.status;
      
      if (status === 404 || status === 400) {
        return {
          success: false,
          message: "ไม่พบรหัสพนักงานในระบบ กรุณาติดต่อฝ่ายบุคคล",
        };
      } else if (status === 500) {
        return {
          success: false,
          message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง",
        };
      }

      return {
        success: false,
        message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
      };
    } catch (error: any) {
      // Network or other errors
      console.error("Forgot password error:", error);
      return {
        success: false,
        message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ กรุณาตรวจสอบอินเทอร์เน็ต",
      };
    }
  },

  /**
   * Login with employee code and PIN
   */
  async login(
    employee_code: string,
    password: string
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ..._geoHeaders(),
        },
        body: JSON.stringify({
          employee_code,
          password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          data,
        };
      }

      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData?.detail || "เข้าสู่ระบบไม่สำเร็จ",
      };
    } catch (error: any) {
      console.error("Login error:", error);
      return {
        success: false,
        message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์",
      };
    }
  },
};
