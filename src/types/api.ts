export type FaceMode = "register" | "verify";

export interface FaceVerifyRequest {
  employee_code: string;
  image_data_url: string;
}

export interface FaceEnrollRequest {
  employee_code: string;
  image_data_url: string;
  created_by?: string | null;
}

export interface FaceVerifyResult {
  success: boolean;
  is_match: boolean;
  message: string;
  score?: number;
  threshold?: number;
  password?: string | null;
}

export interface EmployeeProfile {
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string | null;
  role_name: string;
  name_prefix: string;
  field_id: number | null;
  field_name: string | null;
  position_id: number | null;
  position_name: string;
  department_id: number | null;
  department_name: string | null;
  division_id: number | null;
  division_name: string | null;
  route_id: number | null;
  route_name: string | null;
  has_face_profile: boolean;
}

export type FrontendModel = {
  model_key: string;
  active: boolean;
  model_role: string;
  settings_values: Record<string, { value: number }>;
};
