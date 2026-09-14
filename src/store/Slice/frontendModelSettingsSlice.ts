import type { StateCreator } from "zustand";
import { frontendModelSettingsService } from "@/services/frontendModelSettings.service";
import type { FaceMode, FrontendModel } from "@/types/api";

let loadPromise: Promise<void> | null = null;
let loadPromiseMode: FaceMode | undefined;

const DEFAULT_FRONTEND_MODELS: FrontendModel[] = [
  {
    model_key: "face_landmarker",
    active: true,
    model_role: "face_landmarker",
    settings_values: {
      show_debug_markers: { value: 0 },
      require_feature_target_alignment: { value: 1 },
      require_eye_alignment: { value: 1 },
      require_nose_zone: { value: 1 },
      require_mouth_zone: { value: 1 },
      min_average_brightness: { value: 50 },
      max_average_brightness: { value: 214 },
      max_dark_pixel_ratio: { value: 0.48 },
      max_bright_pixel_ratio: { value: 0.42 },
    },
  },
  {
    model_key: "face_attrib_legacy",
    active: true,
    model_role: "face_compliance",
    settings_values: {
      glasses_threshold: { value: 0.05 },
      mask_threshold: { value: 0.35 },
      sunglasses_threshold: { value: 0.25 },
      minimum_eye_openness: { value: 0.25 },
    },
  },
  {
    model_key: "minifasnet_v2",
    active: true,
    model_role: "anti_spoof",
    settings_values: {
      required_samples: { value: 3 },
      real_score_threshold: { value: 0.55 },
    },
  },
];

function normalizeFrontendModels(frontendModels: FrontendModel[]) {
  const next = structuredClone(frontendModels);
  const landmarker = next.find((model) => model.model_key === "face_landmarker");

  if (landmarker) {
    landmarker.settings_values.show_debug_markers ??= { value: 0 };
    landmarker.settings_values.min_average_brightness ??= { value: 50 };
    landmarker.settings_values.max_average_brightness ??= { value: 214 };
    landmarker.settings_values.max_dark_pixel_ratio ??= { value: 0.48 };
    landmarker.settings_values.max_bright_pixel_ratio ??= { value: 0.42 };
  }

  return next;
}

export interface FrontendModelSettingsSlice {
  frontendModels: FrontendModel[];
  loadFrontendModelSettings: (mode: FaceMode) => Promise<void>;
  getFaceModelValue: (
    modelKey: string,
    settingKey: string,
    fallback: number,
  ) => number;
  isFaceModelActive: (modelKey: string, fallback?: boolean) => boolean;
  activeComplianceModel: () => string | undefined;
}

export const createFrontendModelSettingsSlice: StateCreator<
  FrontendModelSettingsSlice,
  [],
  [],
  FrontendModelSettingsSlice
> = (set, get) => ({
  frontendModels: [],

  loadFrontendModelSettings: (mode) => {
    if (!loadPromise || loadPromiseMode !== mode) {
      loadPromiseMode = mode;
      loadPromise = frontendModelSettingsService
        .list(mode)
        .then((frontendModels) => {
          set({ frontendModels: normalizeFrontendModels(frontendModels) });
        })
        .catch((error) => {
          console.warn("[FaceModels] Unable to load backend model settings:", error);
          set({ frontendModels: normalizeFrontendModels(DEFAULT_FRONTEND_MODELS) });
        })
        .finally(() => {
          loadPromise = null;
          loadPromiseMode = undefined;
        });
    }
    return loadPromise;
  },

  getFaceModelValue: (modelKey, settingKey, fallback) => {
    const value = get().frontendModels.find(
      (model) => model.model_key === modelKey,
    )?.settings_values?.[settingKey]?.value;
    return typeof value === "number" ? value : fallback;
  },

  isFaceModelActive: (modelKey, fallback = true) => {
    const active = get().frontendModels.find(
      (model) => model.model_key === modelKey,
    )?.active;
    return typeof active === "boolean" ? active : fallback;
  },

  activeComplianceModel: () =>
    get().frontendModels.find(
      (model) => model.model_role === "face_compliance" && model.active,
    )?.model_key,
});
