import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { createSectorReportSlice } from "./Slice/moReportTransactionSlice";
import type { SectorReportSlice } from "./Slice/moReportTransactionSlice";
import { createAuthSlice } from "./Slice/auth";
import type { AuthSlice } from "./Slice/auth";

// Centralize all exports for components to import from a single entry point
export * from "./Slice/moReportTransactionSlice";
export * from "./Slice/auth";

// set up connect all slice to store
export const useStore = create<SectorReportSlice & AuthSlice>()(
  devtools((...a) => ({
    ...createSectorReportSlice(...a),
    ...createAuthSlice(...a),
  })),
);
