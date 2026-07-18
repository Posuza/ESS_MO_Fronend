// ─── Shared PDF Style Constants ─────────────────────────────
// Single source of truth for all jsPDF autoTable export files.
// Used by: exportDivisionPdf.ts, exportSummarPdf.ts, autoTableRenderers.ts
//
// A4 Portrait: 210mm × 297mm
// Margins: 10mm all sides
// Header: ~21mm (logo 60px + title 15px + meta 10px + gaps)
// Footer: ~8mm  (page number "1 / N" right-aligned)
// Body:   248mm tall, 190mm wide
// ═══════════════════════════════════════════════════════════

// ── Font ────────────────────────────────────────────────────
const FONT_NAME = "Sarabun";
const FONT_REGULAR_FILE = "Sarabun-Regular.ttf";
const FONT_SEMIBOLD_FILE = "Sarabun-SemiBold.ttf";

// ── Layout ──────────────────────────────────────────────────
const MARGIN_MM = 10;
const HEADER_HEIGHT_MM = 33;
const GAP_MM = 2;
const TABLES_PER_ROW = 3;
const BODY_WIDTH_MM = 190; // 210 - 10*2

/** Width of each table in the 3-column grid (≈62mm) */
const TABLE_WIDTH_MM = (BODY_WIDTH_MM - (TABLES_PER_ROW - 1) * GAP_MM) / TABLES_PER_ROW;

/** Estimated row height: 7pt font + 1.5mm padding + border ≈ 6.8mm */
const ROW_H_MM = 6.8;

// ── Font Sizes ──────────────────────────────────────────────
const FONT_SIZE_TITLE = 13;
const FONT_SIZE_META = 9;
const FONT_SIZE_PAGE_NUM = 7;
const FONT_SIZE_TABLE_HEADER = 7;
const FONT_SIZE_TABLE_CELL = 7;
const FONT_SIZE_DETAIL = 7;
const FONT_SIZE_EMPTY = 7;
const FONT_SIZE_GAP = 3;

// ── Colors ──────────────────────────────────────────────────
const COLOR_PRIMARY_LIGHT: [number, number, number] = [217, 217, 217]; // #d9d9d9
const COLOR_TEXT: [number, number, number] = [0, 0, 0];
const COLOR_GRID_LINE: [number, number, number] = [208, 208, 208]; // #d0d0d0

const STATUS_COLORS: Record<string, [number, number, number]> = {
  // normal: [76, 175, 80],   // #4caf50 green temporarily disabled
  warning: [255, 152, 0],  // #ff9800 orange
  danger: [183, 28, 28],   // #b71c1c red
};

const STATUS_LABELS: Record<string, string> = {
  // normal: "ปกติ", // temporarily disabled
  warning: "ผิดปกติ",
  danger: "ฉุกเฉิน",
};

export {
  FONT_NAME,
  FONT_REGULAR_FILE,
  FONT_SEMIBOLD_FILE,
  MARGIN_MM,
  HEADER_HEIGHT_MM,
  GAP_MM,
  TABLES_PER_ROW,
  BODY_WIDTH_MM,
  TABLE_WIDTH_MM,
  ROW_H_MM,
  FONT_SIZE_TITLE,
  FONT_SIZE_META,
  FONT_SIZE_PAGE_NUM,
  FONT_SIZE_TABLE_HEADER,
  FONT_SIZE_TABLE_CELL,
  FONT_SIZE_DETAIL,
  FONT_SIZE_EMPTY,
  FONT_SIZE_GAP,
  COLOR_PRIMARY_LIGHT,
  COLOR_TEXT,
  COLOR_GRID_LINE,
  STATUS_COLORS,
  STATUS_LABELS,
};
