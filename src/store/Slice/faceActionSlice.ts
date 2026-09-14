import type { StateCreator } from "zustand";
import { faceVerifyService } from "@/services/faceVerify.service";
import type { EmployeeProfile, FaceVerifyResult } from "@/types/api";

export interface FaceActionSlice {
  faceVerifyResult: FaceVerifyResult | null;
  faceActionBusy: boolean;
  faceActionError: string;
  profileImageBusy: boolean;
  profileImageLoadFailed: boolean;
  lookupEmployeeFaceProfile: (employeeCode: string) => Promise<EmployeeProfile>;
  verifyEmployeeFace: (
    employeeCode: string,
    imageDataUrl: string,
  ) => Promise<FaceVerifyResult>;
  enrollEmployeeFace: (
    employeeCode: string,
    imageDataUrl: string,
    createdBy?: string | null,
  ) => Promise<void>;
  getEmployeeProfileImage: (employeeCode: string) => Promise<Blob | null>;
  resetFaceActionState: () => void;
}

export const createFaceActionSlice: StateCreator<
  FaceActionSlice,
  [],
  [],
  FaceActionSlice
> = (set) => ({
  faceVerifyResult: null,
  faceActionBusy: false,
  faceActionError: "",
  profileImageBusy: false,
  profileImageLoadFailed: false,

  lookupEmployeeFaceProfile: async (employeeCode) => {
    set({ faceActionBusy: true, faceActionError: "" });
    try {
      const profile = await faceVerifyService.lookupEmployee(employeeCode);
      set({ faceActionBusy: false, faceActionError: "" });
      return profile;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ไม่พบข้อมูลพนักงาน";
      set({ faceActionBusy: false, faceActionError: message });
      throw error;
    }
  },

  verifyEmployeeFace: async (employeeCode, imageDataUrl) => {
    set({ faceActionBusy: true, faceActionError: "", faceVerifyResult: null });
    const result = await faceVerifyService.verify({
      employee_code: employeeCode,
      image_data_url: imageDataUrl,
    });
    set({
      faceVerifyResult: result,
      faceActionBusy: false,
      faceActionError:
        result.success && result.is_match
          ? ""
          : result.message || "ใบหน้าไม่ตรงกับข้อมูลพนักงาน กรุณาลองใหม่",
    });
    return result;
  },

  enrollEmployeeFace: async (employeeCode, imageDataUrl, createdBy) => {
    set({ faceActionBusy: true, faceActionError: "" });
    try {
      await faceVerifyService.enroll({
        employee_code: employeeCode,
        image_data_url: imageDataUrl,
        created_by: createdBy,
      });
      set({
        faceActionBusy: false,
        faceActionError: "",
        profileImageLoadFailed: false,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ลงทะเบียนใบหน้าไม่สำเร็จ";
      set({ faceActionBusy: false, faceActionError: message });
      throw error;
    }
  },

  getEmployeeProfileImage: async (employeeCode) => {
    set({ profileImageBusy: true, profileImageLoadFailed: false });
    try {
      const blob = await faceVerifyService.getProfileImage(employeeCode);
      set({ profileImageBusy: false });
      return blob;
    } catch (error) {
      set({ profileImageBusy: false, profileImageLoadFailed: true });
      throw error;
    }
  },

  resetFaceActionState: () => {
    set({ faceVerifyResult: null, faceActionBusy: false, faceActionError: "" });
  },
});
