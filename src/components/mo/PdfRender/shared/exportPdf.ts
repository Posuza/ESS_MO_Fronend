// ─────────────────────────────────────────────────────────────
// exportPdf.ts
//
// ⚠️ LEGACY FILE — Will be replaced by exportPdfNew/
// ═══════════════════════════════════════════════════════════════
//
// Native jsPDF export for MO Reports (Sector & Summaries).
// Renders tables using jspdf-autotable so text is selectable.
//
// DESIGN LIMITATION: autoTable SPLITS TABLES BY ROW.
//   When a table doesn't fit on the current page, autoTable
//   continues it on the next page — including the header row.
//   This means: a table CAN be broken mid-content, with the
//   header appearing at the bottom of page N and 1-2 rows,
//   then the rest on page N+1.
//
//   The hardcoded row-height estimation (ROW_H_MM = 5.5) is
//   unreliable because autoTable's actual row height varies
//   (~6.8mm with font ascender/descender). This causes
//   pre-checks to think tables will fit when they don't.
//
// REPLACEMENT: exportPdfNew/ (DOM-based measurement)
//   Uses actual DOM rendering + offsetHeight measurement to
//   determine exact section heights. Tables are NEVER split:
//   - Sector/summary tables: whole table = one unit
//   - Detail items: 4-row block = one unit (never split within)
//     (See exportPdfNew/ for the new approach.)
//
// ═══════════════════════════════════════════════════════════════
//
// Designed to match the visual output of HTML-based PDF components:
//   SectorPdf, SummeriesPdf, SectorTableContent, SummaryTableContent, SectorDetailContent
//
// - buildSectorPdf() / buildSummariesPdf()  → returns jsPDF document
// - exportSectorPdf() / exportSummariesPdf() → saves + downloads
//
// Single source of truth — used by PdfViewer for both
// preview (data URI) and download (doc.save).
// ─────────────────────────────────────────────────────────────

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  groupDefs,
  buildGroup2Disciplines,
  buildGroup3Projects,
  // buildGroup4GuardMovements as buildSectorGroup4, // DISABLED — will use later
} from "../division/DivisionGroups";
import {
  group1,
  buildGroup2ForSummary,
  group3Static,
  // buildGroup4ForSummary, // DISABLED — will use later
  // buildGroup4GuardMovements as buildSummaryGroup4, // DISABLED — will use later
} from "../summaries/summaryGroups";
import {
  getCols,
  chunkCols,
  itemValueFn,
  projectStatusCount,
  guardMovementStatusCount,
} from "../summaries/summaryHelpers";
import type { SummaryColumn } from "../summaries/summaryHelpers";
import logoUrl from "../../../../assets/logo/logo_guts.png";

// ─── Types ──────────────────────────────────────────────────

// Local types (copied from PaginationSystem to keep exportPdf self-contained)
export interface PdfGroupItem {
  key: string;
  label: string;
  unit?: string;
  status?: string;
  detail?: string;
  note?: string;
  value?: string | number;
}

export interface PdfGroup {
  key: string;
  title: string;
  items: PdfGroupItem[];
  _itemOffset?: number;
}

export type ExportMoReportPdfOptions = {
  item: any;
  sectorName: string;
  isSector: boolean;
  reports?: any[];
  fileName?: string;
};

/**
 * How many tables fit per grid row based on sub-location column count.
 * More columns = wider table = fewer per row.
 */
function getTablesPerRow(colCount: number): number {
  const span = colCount >= 8 ? 6 : colCount >= 6 ? 3 : 2;
  return 6 / span;
}

// ─── Constants ──────────────────────────────────────────────

const FONT_NAME = "Sarabun";
const FONT_REGULAR_FILE = "Sarabun-Regular.ttf";
const FONT_SEMIBOLD_FILE = "Sarabun-SemiBold.ttf";

// ─── Page dimensions ───────────────────────────────────────
// jsPDF uses mm: A4 landscape = 297×210mm.
// pxToMm converts px values to mm at 72 DPI for convenience.

const PX_PER_MM = 72 / 25.4; // ~2.835 px/mm (72 DPI)

function pxToMm(px: number): number {
  return px / PX_PER_MM;
}

const PAGE_ORIENTATION = "landscape" as const;
const PAGE_UNIT = "mm" as const;
const PAGE_FORMAT = "a4" as const;
const MARGIN_X = 10;
const MARGIN_BOTTOM = 6;

// Header height: logo (~18mm) + title (~4mm) + meta row (~3mm) + gap.
// Content starts at y=33mm.
const HEADER_HEIGHT = 33;

// Gap between tables (6px at 72 DPI ≈ 2.1mm)
const GAP_MM = pxToMm(6);

// Tables per row in grid layout (matches CSS grid-column: span 2 in 6-col grid)
const TABLES_PER_ROW = 3;

// ─── Row height constants for jsPDF autoTable ─────────────
// Sector tables: 7pt font + 1.5mm padding + 0.2mm border ≈ 6.8mm per row (conservative).
// Summary tables: 7pt font + 1.8mm body padding + 0.2mm border ≈ 7.4mm per row,
//                 7pt font + 1.2mm header padding + 0.2mm border ≈ 6.2mm per header row.

/** autoTable row height in mm for sector tables (7pt font + 1.5mm padding + border) */
const ROW_H_MM = 6.8;

/**
 * Estimate total table height in mm for GROUP tables (renderGroupTable).
 * 1 header row + N body rows, each ~6.8mm.
 */
function tableHeightMm(itemCount: number): number {
  if (itemCount <= 0) return 2 * ROW_H_MM;
  return (itemCount + 1) * ROW_H_MM;
}

/**
 * Estimate total table height in mm for SUMMARY tables (renderSummaryTable).
 * 2 header rows (~6.2mm each) + N body rows (~7.4mm each).
 */
function summaryTableHeightMm(itemCount: number): number {
  // 2 header rows ~6.2mm each + N body rows ~7.4mm each
  if (itemCount <= 0) return 12.4;
  return 12.4 + itemCount * 7.4;
}

// Colors matching HTML/CSS components
const COLOR_PRIMARY_LIGHT: [number, number, number] = [217, 217, 217]; // #d9d9d9
const COLOR_TEXT: [number, number, number] = [0, 0, 0]; // #000000
const COLOR_GRID_LINE: [number, number, number] = [208, 208, 208]; // #d0d0d0

// Status colors (no bold). Group 6 only uses warning/danger.
const STATUS_COLORS: Record<string, [number, number, number]> = {
  warning: [255, 152, 0], // #ff9800
  danger: [183, 28, 28], // #b71c1c
};
const STATUS_LABELS: Record<string, string> = {
  warning: "ผิดปกติ",
  danger: "ฉุกเฉิน",
};

// ─── Font Sizes (named constants like backend ReportLab service) ──
const FONT_SIZE_TITLE = 13; // page header title
const FONT_SIZE_META = 9; // header meta row (sector, date)
const FONT_SIZE_PAGE_NUM = 7; // page number in footer, matches meta
const FONT_SIZE_TABLE_HEADER = 7; // table column headers
const FONT_SIZE_TABLE_CELL = 7; // table body cells
const FONT_SIZE_DETAIL = 7; // project detail labels & text
const FONT_SIZE_EMPTY = 7; // empty state message
const FONT_SIZE_GAP = 3; // gap row between projects

// ─── Font Cache ─────────────────────────────────────────────

const fontCache = new Map<string, Promise<string>>();

function arrayBufferToBinaryString(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let result = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(
      offset,
      Math.min(offset + chunkSize, bytes.length),
    );
    for (let i = 0; i < chunk.length; i++) {
      result += String.fromCharCode(chunk[i]);
    }
  }
  return result;
}

async function loadFontBinary(fontFileName: string): Promise<string> {
  const cached = fontCache.get(fontFileName);
  if (cached) return cached;

  const promise = (async () => {
    const fontUrl = `${import.meta.env.BASE_URL}fonts/${fontFileName}`;
    const response = await fetch(fontUrl);
    if (!response.ok) {
      throw new Error(`Font not found: ${fontFileName}`);
    }
    const buffer = await response.arrayBuffer();
    return arrayBufferToBinaryString(buffer);
  })();

  fontCache.set(fontFileName, promise);
  try {
    return await promise;
  } catch (error) {
    fontCache.delete(fontFileName);
    throw error;
  }
}

async function registerSarabunFonts(doc: jsPDF): Promise<void> {
  const [regular, semiBold] = await Promise.all([
    loadFontBinary(FONT_REGULAR_FILE),
    loadFontBinary(FONT_SEMIBOLD_FILE),
  ]);
  doc.addFileToVFS(FONT_REGULAR_FILE, regular);
  doc.addFont(FONT_REGULAR_FILE, FONT_NAME, "normal");
  doc.addFileToVFS(FONT_SEMIBOLD_FILE, semiBold);
  doc.addFont(FONT_SEMIBOLD_FILE, FONT_NAME, "bold");
  doc.setFont(FONT_NAME, "normal");
}

// ─── Date Formatting ────────────────────────────────────────

const THAI_SHORT_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

function formatExportDate(): string {
  const now = new Date();
  const d = `${now.getDate()} ${THAI_SHORT_MONTHS[now.getMonth()]} ${now.getFullYear() + 543}`;
  const t = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return `เวลาที่ดึงข้อมูล: ${d} ${t} น.`;
}

// ─── Logo Loading ───────────────────────────────────────────

let logoDataUrlPromise: Promise<string> | null = null;

async function getLogoDataUrl(): Promise<string> {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = (async () => {
      const resp = await fetch(logoUrl);
      const blob = await resp.blob();
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    })();
  }
  return logoDataUrlPromise;
}

// ─── Header / Footer ────────────────────────────────────────

/** Synchronous version of header drawing — used in autoTable didDrawPage hooks */
function drawPageHeaderSync(
  doc: jsPDF,
  sectorName: string,
  title: string,
  pageNo: number,
  division: string | undefined,
  logoData: string | null,
): void {
  const pageW = doc.internal.pageSize.getWidth();

  // Logo — centered at top (matches PdfPageHeader, 60px ≈ 21mm)
  if (logoData) {
    const logoH = 18;
    const logoW = (logoH * 2340) / 1190;
    const logoX = (pageW - logoW) / 2;
    try {
      doc.addImage(logoData, "PNG", logoX, 3, logoW, logoH);
    } catch {
      // Logo loading failed — skip silently
    }
  }

  // Title — centered below logo (matches pdfTitleBar: 16px, black, 600 weight)
  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(FONT_SIZE_TITLE);
  doc.setTextColor(0, 0, 0);
  doc.text(title, pageW / 2, 25, { align: "center" });

  // Meta row: location centered, date right-aligned (matches pdfMetaRow)
  doc.setFont(FONT_NAME, "normal");
  doc.setFontSize(FONT_SIZE_META);
  doc.setTextColor(0, 0, 0);
  const formattedSector = sectorName.replace(
    /([ก-๙0-9]+)\s+([A-Za-z]+)/,
    "$1 | $2",
  );
  let metaText = formattedSector;
  if (division) metaText += ` | ${division}`;

  // Location — centered
  doc.text(metaText, pageW / 2, 30, { align: "center" });

  // Date — right-aligned on same line (same size as sector name)
  doc.setFontSize(FONT_SIZE_PAGE_NUM);
  doc.text(formatExportDate(), pageW - MARGIN_X, 30, { align: "right" });
}

async function drawPageHeader(
  doc: jsPDF,
  sectorName: string,
  title: string,
  pageNo: number,
  division?: string,
): Promise<void> {
  const logoData = await getLogoDataUrl().catch(() => null);
  drawPageHeaderSync(doc, sectorName, title, pageNo, division, logoData);
}

function drawPageFooter(doc: jsPDF, pageNo: number, totalPages: number): void {
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFont(FONT_NAME, "normal");
  doc.setFontSize(FONT_SIZE_PAGE_NUM);
  doc.setTextColor(0, 0, 0);
  doc.text(`${pageNo} / ${totalPages}`, pageW - MARGIN_X, pageH - 5, {
    align: "right",
  });
}

/**
 * After a render function calls autoTable, check if new pages were created
 * internally and draw page headers on them. Also updates page header/footer
 * margins for those pages so content doesn't overlap the header.
 */
async function drawHeadersIfNewPages(
  doc: jsPDF,
  sectorName: string,
  title: string,
  startPages: number,
  division?: string,
): Promise<void> {
  const endPages = doc.getNumberOfPages();
  if (endPages > startPages) {
    for (let p = startPages + 1; p <= endPages; p++) {
      doc.setPage(p);
      await drawPageHeader(doc, sectorName, title, p, division);
    }
    // Return to the last page where finalY lives
    doc.setPage(endPages);
  }
}

// ─── Group Table Rendering ──────────────────────────────────

/**
 * Render one PdfGroup as an autoTable.
 * Matches SectorTableContent.tsx visual output.
 * Columns: [No., Label, Value, Unit] — adapted per group type.
 * Status labels are NOT bold (matches CSS: font-weight 400).
 *
 * @param overrideMarginLeft - optional X position for side-by-side layout
 * @param constrainWidth - optional constrained table width (for grid layout)
 */
async function renderGroupTable(
  doc: jsPDF,
  group: PdfGroup,
  groupIndex: number,
  data: any,
  startY: number,
  isDiscipline: boolean,
  isGroup3: boolean,
  itemOffset: number,
  headerInfo: { sectorName: string; title: string; division?: string } | null,
  overrideMarginLeft?: number,
  constrainWidth?: number,
): Promise<number> {
  const pageW = doc.internal.pageSize.getWidth();
  const marginLeft = overrideMarginLeft ?? MARGIN_X;
  const width = constrainWidth ?? pageW - MARGIN_X * 2;
  const marginRight = pageW - marginLeft - width;
  const availW = width;

  // ── Page break: push entire table to next page if it won't fit ──
  const pageH = doc.internal.pageSize.getHeight();
  const availH = pageH - startY - MARGIN_BOTTOM - 5;
  const estH = tableHeightMm(group.items.length);
  if (estH > availH && startY > HEADER_HEIGHT + 3) {
    doc.addPage();
    if (headerInfo) {
      const newPageNo = doc.getNumberOfPages();
      await drawPageHeader(
        doc,
        headerInfo.sectorName,
        headerInfo.title,
        newPageNo,
        headerInfo.division,
      );
    }
    startY = HEADER_HEIGHT;
  }

  // Column widths proportional to available width (side-by-side = ~63mm)
  const INDEX_W = Math.min(7, availW * 0.12);
  const VALUE_W = Math.min(11, availW * 0.18);
  const UNIT_W = Math.min(9, availW * 0.16);
  const STATUS_W = Math.min(18, availW * 0.3);

  // Shared header styles (matches CSS: bg #d9d9d9, text black, bold, 8px)
  const headStyles = {
    fillColor: COLOR_PRIMARY_LIGHT,
    textColor: COLOR_TEXT,
    fontStyle: "bold" as const,
    fontSize: FONT_SIZE_TABLE_HEADER,
  };

  // Shared base cell styles (matches CSS: #d0d0d0 borders, 8px, black, no zebra)
  const tableStyles = {
    font: FONT_NAME,
    fontSize: FONT_SIZE_TABLE_CELL,
    cellPadding: { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 } as const,
    textColor: COLOR_TEXT,
    lineColor: COLOR_GRID_LINE,
    lineWidth: 0.1,
    fillColor: [255, 255, 255],
  };

  if (group.items.length === 0) {
    const startPages = doc.getNumberOfPages();
    autoTable(doc, {
      startY,
      margin: { left: marginLeft, right: marginRight, top: HEADER_HEIGHT },
      tableWidth: width,
      theme: "grid",
      head: [
        [
          {
            content: String(groupIndex),
            styles: { ...headStyles, cellWidth: INDEX_W },
          },
          {
            content: group.title,
            colSpan: 3,
            styles: { ...headStyles },
          },
        ],
      ],
      body: [
        [
          {
            content:
              isDiscipline || isGroup3 || group.key === "guard_movements"
                ? "ไม่มีข้อมูล"
                : "-",
            colSpan: 4,
            styles: {
              halign: "center",
              fontSize: FONT_SIZE_EMPTY,
              textColor: COLOR_TEXT,
            },
          },
        ],
      ] as any[],
      styles: tableStyles as any,
      bodyStyles: { fillColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [255, 255, 255] },
    });
    if (headerInfo) {
      await drawHeadersIfNewPages(
        doc,
        headerInfo.sectorName,
        headerInfo.title,
        startPages,
        headerInfo.division,
      );
    }
    return (doc as any).lastAutoTable.finalY + GAP_MM;
  }

  if (group.key === "guard_movements") {
    // Group 4 — guard movements: aggregate by status
    // Matches SectorTableContent aggregateGuardStatuses() logic
    // Status is dynamic text — no color coding
    const statusMap = new Map<string, number>();
    for (const item of group.items) {
      const s = item.status || "-";
      statusMap.set(s, (statusMap.get(s) || 0) + 1);
    }
    const aggregatedItems = Array.from(statusMap.entries());

    const bodyRows = aggregatedItems.map(([status, count], i) => {
      const itemNum = itemOffset + i + 1;
      return [
        {
          content: `${groupIndex}.${itemNum}`,
          styles: { fontSize: FONT_SIZE_TABLE_CELL, halign: "center" },
        },
        {
          content: status,
          styles: { halign: "left", fontSize: FONT_SIZE_TABLE_CELL },
        },
        {
          content: String(count),
          styles: { fontSize: FONT_SIZE_TABLE_CELL, halign: "center" },
        },
        {
          content: "หน่วยงาน",
          styles: { fontSize: FONT_SIZE_TABLE_CELL, halign: "center" },
        },
      ];
    });

    const startPages2 = doc.getNumberOfPages();
    autoTable(doc, {
      startY,
      margin: { left: marginLeft, right: marginRight, top: HEADER_HEIGHT },
      tableWidth: width,
      theme: "grid",
      head: [
        [
          {
            content: String(groupIndex),
            styles: { ...headStyles, cellWidth: INDEX_W },
          },
          {
            content: group.title,
            colSpan: 3,
            styles: { ...headStyles },
          },
        ],
      ],
      body: bodyRows as any[],
      styles: tableStyles as any,
      bodyStyles: { fillColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: INDEX_W, halign: "center" },
        1: { halign: "left" },
        2: { halign: "center", cellWidth: VALUE_W },
        3: { halign: "center", cellWidth: UNIT_W },
      },
    });
    if (headerInfo) {
      await drawHeadersIfNewPages(
        doc,
        headerInfo.sectorName,
        headerInfo.title,
        startPages2,
        headerInfo.division,
      );
    }
  } else if (isGroup3) {
    // Group 3 — projects: [No., Project Name (colspan=2), Status]
    // Matches SectorTableContent group3 rendering
    const bodyRows = group.items.map((it: PdfGroupItem, i: number) => {
      const itemNum = itemOffset + i + 1;
      const st = it.status || "warning";
      return [
        {
          content: `${groupIndex}.${itemNum}`,
          styles: { fontSize: FONT_SIZE_TABLE_CELL, halign: "center" },
        },
        {
          content: it.label,
          colSpan: 2,
          styles: { halign: "left", fontSize: FONT_SIZE_TABLE_CELL },
        },
        {
          content: STATUS_LABELS[st] || st,
          styles: {
            textColor: STATUS_COLORS[st] || COLOR_TEXT,
            // NO bold — matches CSS status text weight.
            fontStyle: "normal" as const,
            fontSize: FONT_SIZE_TABLE_CELL,
            halign: "center",
          },
        },
      ];
    });

    const startPages3 = doc.getNumberOfPages();
    autoTable(doc, {
      startY,
      margin: { left: marginLeft, right: marginRight, top: HEADER_HEIGHT },
      tableWidth: width,
      theme: "grid",
      head: [
        [
          {
            content: String(groupIndex),
            styles: { ...headStyles, cellWidth: INDEX_W },
          },
          {
            content: group.title,
            colSpan: 3,
            styles: { ...headStyles },
          },
        ],
      ],
      body: bodyRows as any[],
      styles: tableStyles as any,
      bodyStyles: { fillColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: INDEX_W, halign: "center" },
        1: { halign: "left" },
        3: { halign: "center", cellWidth: STATUS_W },
      },
    });
    if (headerInfo) {
      await drawHeadersIfNewPages(
        doc,
        headerInfo.sectorName,
        headerInfo.title,
        startPages3,
        headerInfo.division,
      );
    }
  } else {
    // Regular groups: [No., Label, Value, Unit]
    const bodyRows = group.items.map((r: PdfGroupItem, i: number) => {
      const itemNum = itemOffset + i + 1;
      const value = isDiscipline
        ? String((r as any).value ?? 0)
        : String((data as any)[r.key] ?? 0);
      return [
        {
          content: `${groupIndex}.${itemNum}`,
          styles: { fontSize: FONT_SIZE_TABLE_CELL, halign: "center" },
        },
        {
          content: r.label,
          styles: { halign: "left", fontSize: FONT_SIZE_TABLE_CELL },
        },
        {
          content: value,
          styles: { fontSize: FONT_SIZE_TABLE_CELL, halign: "center" },
        },
        {
          content: r.unit || "",
          styles: { fontSize: FONT_SIZE_TABLE_CELL, halign: "center" },
        },
      ];
    });

    const startPages4 = doc.getNumberOfPages();
    autoTable(doc, {
      startY,
      margin: { left: marginLeft, right: marginRight, top: HEADER_HEIGHT },
      tableWidth: width,
      theme: "grid",
      head: [
        [
          {
            content: String(groupIndex),
            styles: { ...headStyles, cellWidth: INDEX_W },
          },
          {
            content: group.title,
            colSpan: 3,
            styles: { ...headStyles },
          },
        ],
      ],
      body: bodyRows as any[],
      styles: tableStyles as any,
      bodyStyles: { fillColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: INDEX_W, halign: "center" },
        1: { halign: "left" },
        2: { halign: "center", cellWidth: VALUE_W },
        3: { halign: "center", cellWidth: UNIT_W },
      },
    });
    if (headerInfo) {
      await drawHeadersIfNewPages(
        doc,
        headerInfo.sectorName,
        headerInfo.title,
        startPages4,
        headerInfo.division,
      );
    }
  }

  return (doc as any).lastAutoTable.finalY + GAP_MM;
}

// ─── Project Detail Rendering ──────────────────────────────

/**
 * Render project details using autoTable.
 * Matches SectorDetailContent.tsx visual output exactly.
 *
 * Table structure (6 columns):
 *   Head: "6" | "เข้าพบผู้ว่าจ้าง (รายละเอียด)" (colspan=5)
 *   Per project:
 *     "6.1" | Project Name (colspan=5)
 *     "รายละเอียด" | detail text (colspan=5)
 *     "สถานะ" | status text (colspan=5, colored, NO bold)
 *     "หมายเหตุ" | note text (colspan=5)
 *     (gap row between projects)
 */
function renderProjectDetails(
  doc: jsPDF,
  projects: PdfGroupItem[],
  groupIndex: number,
  startY: number,
): { finalY: number; overflow: PdfGroupItem[] | null } {
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const availW = pageW - MARGIN_X * 2;
  const maxY = pageH - MARGIN_BOTTOM - 8;

  // Estimate how many projects fit on current page to prevent autoTable from splitting
  if (startY + 10 > maxY) {
    return { finalY: startY, overflow: projects.length > 0 ? projects : null };
  }
  const estItemH = 4 * ROW_H_MM + 2; // ~24mm per project (4 content rows + gap)
  const availH = maxY - startY - 10; // available space for body rows after ~10mm header
  const canFit = availH > 0 ? Math.floor(availH / estItemH) : 0;
  // If nothing fits, return all as overflow (outer loop will start a new page with header)
  if (canFit === 0 && projects.length > 0) {
    return { finalY: startY, overflow: projects };
  }
  const itemsToRender = projects.slice(0, canFit);
  const overflowItems = projects.length > canFit ? projects.slice(canFit) : null;

  const labelCellW = 18; // mm for label column ("รายละเอียด", "สถานะ", "หมายเหตุ")

  const headStyles = {
    fillColor: COLOR_PRIMARY_LIGHT,
    textColor: COLOR_TEXT,
    fontStyle: "bold" as const,
    fontSize: FONT_SIZE_TABLE_HEADER,
  };

  const baseStyles = {
    font: FONT_NAME,
    fontSize: FONT_SIZE_DETAIL,
    cellPadding: { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 } as const,
    textColor: COLOR_TEXT,
    lineColor: COLOR_GRID_LINE,
    lineWidth: 0.1,
    fillColor: [255, 255, 255],
  };

  const labelCellStyle = {
    fontSize: FONT_SIZE_DETAIL,
    halign: "center" as const,
    cellWidth: labelCellW,
  };

  // Build head
  const headRows: any[] = [
    [
      {
        content: String(groupIndex),
        styles: { ...headStyles, cellWidth: labelCellW, halign: "center" },
      },
      {
        content: "เข้าพบผู้ว่าจ้าง (รายละเอียด)",
        colSpan: 5,
        styles: { ...headStyles, halign: "left" as const },
      },
    ],
  ];

  // Build body rows
  const bodyRows: any[] = [];

  if (itemsToRender.length === 0) {
    bodyRows.push([
      {
        content: "ยังไม่มีข้อมูลโครงการ",
        colSpan: 6,
        styles: {
          halign: "center",
          fontSize: FONT_SIZE_EMPTY,
          textColor: COLOR_TEXT,
        },
      },
    ]);
  } else {
    for (let i = 0; i < itemsToRender.length; i++) {
      const p = itemsToRender[i];
      const num = `${groupIndex}.${i + 1}`;
      const st = p.status || "warning";

      // Row 1: index + project name
      bodyRows.push([
        { content: num, styles: { ...labelCellStyle } },
        {
          content: p.label,
          colSpan: 5,
          styles: { halign: "left", fontSize: FONT_SIZE_DETAIL },
        },
      ]);

      // Row 2: detail
      bodyRows.push([
        { content: "รายละเอียด", styles: { ...labelCellStyle } },
        {
          content: p.detail || "-",
          colSpan: 5,
          styles: { halign: "left", fontSize: FONT_SIZE_DETAIL },
        },
      ]);

      // Row 3: status (colored text, NO bold)
      bodyRows.push([
        { content: "สถานะ", styles: { ...labelCellStyle } },
        {
          content: STATUS_LABELS[st] || st,
          colSpan: 5,
          styles: {
            halign: "left",
            fontSize: FONT_SIZE_DETAIL,
            textColor: STATUS_COLORS[st] || COLOR_TEXT,
            // NO bold — matches CSS
            fontStyle: "normal" as const,
          },
        },
      ]);

      // Row 4: note (bottom border 0.5mm for visible project separation)
      const noteBorder = { top: 0.1, bottom: 0.2, left: 0.1, right: 0.1 };
      bodyRows.push([
        {
          content: "หมายเหตุ",
          styles: {
            ...labelCellStyle,
            lineWidth: noteBorder,
            lineColor: COLOR_GRID_LINE,
          },
        },
        {
          content: p.note || "-",
          colSpan: 5,
          styles: {
            halign: "left",
            fontSize: FONT_SIZE_DETAIL,
            lineWidth: noteBorder,
            lineColor: COLOR_GRID_LINE,
          },
        },
      ]);

      // Gap row — just spacing between projects
      if (i < itemsToRender.length - 1) {
        bodyRows.push([
          {
            content: "",
            colSpan: 6,
            styles: {
              cellPadding: { top: 1.5, right: 0, bottom: 1.5, left: 0 },
              lineWidth: 0,
              fontSize: FONT_SIZE_GAP,
            },
          },
        ]);
      }
    }
  }

  // Render the table
  autoTable(doc, {
    startY,
    margin: { left: MARGIN_X, right: MARGIN_X },
    tableWidth: availW,
    theme: "grid",
    tableLineWidth: 0,
    head: headRows,
    body: bodyRows,
    styles: baseStyles as any,
    bodyStyles: { fillColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: labelCellW, halign: "center" },
    },
    didParseCell: (data: any) => {},
  });

  const finalY = (doc as any).lastAutoTable.finalY;
  return { finalY: finalY + GAP_MM, overflow: overflowItems };
}

// ─── Guard Movement Detail Rendering ──────────────────────────

/**
 * Render a guard movement detail table (label, detail, status, note).
 * Mirrors SectorGuardPostContent.tsx — status is dynamic plain text, NO color.
 */
function renderGuardMovementDetails(
  doc: jsPDF,
  movements: PdfGroupItem[],
  groupIndex: number,
  startY: number,
): { finalY: number; overflow: PdfGroupItem[] | null } {
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const availW = pageW - MARGIN_X * 2;
  const maxY = pageH - MARGIN_BOTTOM - 8;

  // Estimate how many movements fit on current page to prevent autoTable from splitting
  if (startY + 10 > maxY) {
    return { finalY: startY, overflow: movements.length > 0 ? movements : null };
  }
  const estItemH = 4 * ROW_H_MM + 2; // ~24mm per movement (4 content rows + gap)
  const availH = maxY - startY - 10; // available space for body rows
  const canFit = availH > 0 ? Math.floor(availH / estItemH) : 0;
  // If nothing fits, return all as overflow (outer loop will start a new page with header)
  if (canFit === 0 && movements.length > 0) {
    return { finalY: startY, overflow: movements };
  }
  const itemsToRender = movements.slice(0, canFit);
  const overflowItems = movements.length > canFit ? movements.slice(canFit) : null;

  const labelCellW = 18;

  const headStyles = {
    fillColor: COLOR_PRIMARY_LIGHT,
    textColor: COLOR_TEXT,
    fontStyle: "bold" as const,
    fontSize: FONT_SIZE_TABLE_HEADER,
  };

  const baseStyles = {
    font: FONT_NAME,
    fontSize: FONT_SIZE_DETAIL,
    cellPadding: { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 } as const,
    textColor: COLOR_TEXT,
    lineColor: COLOR_GRID_LINE,
    lineWidth: 0.1,
    fillColor: [255, 255, 255],
  };

  const labelCellStyle = {
    fontSize: FONT_SIZE_DETAIL,
    halign: "center" as const,
    cellWidth: labelCellW,
  };

  const headRows: any[] = [
    [
      {
        content: String(groupIndex),
        styles: { ...headStyles, cellWidth: labelCellW, halign: "center" },
      },
      {
        content: "การเปลี่ยนแปลงจุดรักษาการณ์ (รายละเอียด)",
        colSpan: 5,
        styles: { ...headStyles, halign: "left" as const },
      },
    ],
  ];

  const bodyRows: any[] = [];

  if (itemsToRender.length === 0) {
    bodyRows.push([
      {
        content: "ยังไม่มีข้อมูลการเปลี่ยนแปลงจุดรักษาการณ์",
        colSpan: 6,
        styles: {
          halign: "center",
          fontSize: FONT_SIZE_EMPTY,
          textColor: COLOR_TEXT,
        },
      },
    ]);
  } else {
    for (let i = 0; i < itemsToRender.length; i++) {
      const m = itemsToRender[i];
      const num = `${groupIndex}.${i + 1}`;

      // Row 1: index + movement name
      bodyRows.push([
        { content: num, styles: { ...labelCellStyle } },
        {
          content: m.label,
          colSpan: 5,
          styles: { halign: "left", fontSize: FONT_SIZE_DETAIL },
        },
      ]);

      // Row 2: detail
      bodyRows.push([
        { content: "รายละเอียด", styles: { ...labelCellStyle } },
        {
          content: m.detail || "-",
          colSpan: 5,
          styles: { halign: "left", fontSize: FONT_SIZE_DETAIL },
        },
      ]);

      // Row 3: status (plain text — dynamic, no color)
      bodyRows.push([
        { content: "สถานะ", styles: { ...labelCellStyle } },
        {
          content: m.status || "-",
          colSpan: 5,
          styles: {
            halign: "left",
            fontSize: FONT_SIZE_DETAIL,
            textColor: COLOR_TEXT,
            fontStyle: "normal" as const,
          },
        },
      ]);

      // Row 4: note
      const noteBorder = { top: 0.1, bottom: 0.2, left: 0.1, right: 0.1 };
      bodyRows.push([
        {
          content: "หมายเหตุ",
          styles: {
            ...labelCellStyle,
            lineWidth: noteBorder,
            lineColor: COLOR_GRID_LINE,
          },
        },
        {
          content: m.note || "-",
          colSpan: 5,
          styles: {
            halign: "left",
            fontSize: FONT_SIZE_DETAIL,
            lineWidth: noteBorder,
            lineColor: COLOR_GRID_LINE,
          },
        },
      ]);

      // Gap row
      if (i < itemsToRender.length - 1) {
        bodyRows.push([
          {
            content: "",
            colSpan: 6,
            styles: {
              cellPadding: { top: 1.5, right: 0, bottom: 1.5, left: 0 },
              lineWidth: 0,
              fontSize: FONT_SIZE_GAP,
            },
          },
        ]);
      }
    }
  }

  autoTable(doc, {
    startY,
    margin: { left: MARGIN_X, right: MARGIN_X },
    tableWidth: availW,
    theme: "grid",
    tableLineWidth: 0,
    head: headRows,
    body: bodyRows,
    styles: baseStyles as any,
    bodyStyles: { fillColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: labelCellW, halign: "center" },
    },
    didParseCell: (data: any) => {},
  });

  const finalY = (doc as any).lastAutoTable.finalY;
  return { finalY: finalY + GAP_MM, overflow: overflowItems };
}

// ─── Summary Table Rendering ────────────────────────────────

/**
 * Render a summary group as a table with dynamic columns per sub-location.
 * Matches SummaryTableContent.tsx visual output.
 * Column widths are tight (CSS: third-column=30px≈10.6mm, fourth-column=28px≈10mm).
 */
async function renderSummaryTable(
  doc: jsPDF,
  g: PdfGroup,
  cols: SummaryColumn[],
  groupIndex: number,
  isGroup3: boolean,
  startY: number,
  data: any,
  itemOffset: number,
  headerInfo: { sectorName: string; title: string; division?: string } | null,
  overrideMarginLeft?: number,
  constrainWidth?: number,
): Promise<number> {
  const pageW = doc.internal.pageSize.getWidth();
  const marginLeft = overrideMarginLeft ?? MARGIN_X;
  const width = constrainWidth ?? pageW - MARGIN_X * 2;
  const marginRight = pageW - marginLeft - width;

  // ── Page break: push entire summary table to next page if it won't fit ──
  {
    const pageH = doc.internal.pageSize.getHeight();
    const availH = pageH - startY - MARGIN_BOTTOM - 5;
    const estH = summaryTableHeightMm(g.items.length);
    if (estH > availH && startY > HEADER_HEIGHT + 3) {
      doc.addPage();
      if (headerInfo) {
        const newPageNo = doc.getNumberOfPages();
        await drawPageHeader(
          doc,
          headerInfo.sectorName,
          headerInfo.title,
          newPageNo,
          headerInfo.division,
        );
      }
      startY = HEADER_HEIGHT;
    }
  }

  // Tight column widths matching CSS:
  //   third-column: 30px ≈ 10.6mm
  //   fourth-column (unit): 28px ≈ 10mm
  //   total column: 32px ≈ 11.3mm
  const NO_W = 7;
  const LOC_W = 8; // per-location column (was 11mm / 30px, reduced ~1/4)
  const TOTAL_W = 9; // total (was 12mm, reduced ~1/4)
  const UNIT_W = 8; // unit column

  // Build first header row: group number + title (matches SummaryTableContent.tsx)
  const firstHeaderRow: any[] = [
    {
      content: String(groupIndex),
      styles: {
        fontStyle: "bold" as const,
        fillColor: COLOR_PRIMARY_LIGHT,
        textColor: COLOR_TEXT,
        fontSize: FONT_SIZE_TABLE_HEADER,
        cellWidth: NO_W,
        cellPadding: { top: 1.5, bottom: 1.5 },
      },
    },
    {
      content: g.title,
      colSpan: cols.length + 3,
      styles: {
        fontStyle: "bold" as const,
        fillColor: COLOR_PRIMARY_LIGHT,
        textColor: COLOR_TEXT,
        fontSize: FONT_SIZE_TABLE_HEADER,
        cellPadding: { top: 1.5, bottom: 1.5 },
        halign: "left",
      },
    },
  ];

  // Build second header row: "หัวข้อ" + per-location + "รวม" + unit
  // (matches SummaryTableContent.tsx second header row)
  const secondHeaderRow: any[] = [
    {
      content: "หัวข้อ",
      colSpan: 2,
      styles: {
        fontStyle: "bold" as const,
        fillColor: [255, 255, 255],
        textColor: COLOR_TEXT,
        fontSize: FONT_SIZE_TABLE_HEADER,
      },
    },
  ];

  for (const c of cols) {
    const shortName = (() => {
      const nm = String(c.division ?? "");
      const m = nm.match(/เขต\s+[\d.]+/);
      if (m) return m[0];
      const words = nm.trim().split(/\s+/);
      return words.length >= 2
        ? words
            .slice(0, 2)
            .map((w) => w.charAt(0))
            .join("")
        : nm;
    })();
    secondHeaderRow.push({
      content: shortName,
      styles: {
        fontStyle: "bold" as const,
        fillColor: [255, 255, 255],
        textColor: COLOR_TEXT,
        fontSize: FONT_SIZE_TABLE_HEADER,
        cellWidth: LOC_W,
      },
    });
  }

  secondHeaderRow.push({
    content: "รวม",
    styles: {
      fontStyle: "bold" as const,
      fillColor: [255, 255, 255],
      textColor: COLOR_TEXT,
      fontSize: FONT_SIZE_TABLE_HEADER,
      cellWidth: TOTAL_W,
    },
  });
  secondHeaderRow.push({
    content: "",
    styles: {
      fontStyle: "bold" as const,
      fillColor: [255, 255, 255],
      textColor: COLOR_TEXT,
      fontSize: FONT_SIZE_TABLE_HEADER,
      cellWidth: UNIT_W,
    },
  });

  // Build body rows with object syntax for cell styles
  const bodyRows: any[] = g.items.length === 0
    ? [[
        {
          content: "ไม่มีข้อมูล",
          colSpan: cols.length + 4,
          styles: {
            fontSize: FONT_SIZE_EMPTY,
            halign: "center",
            textColor: COLOR_TEXT,
          },
        },
      ]]
    : g.items.map((r, i) => {
    const itemNum = itemOffset + i + 1;
    const perLocVals = cols.map((c) => {
      if (g.key === "guard_movements")
        return String(guardMovementStatusCount(c.report, r.status || r.key));
      if (isGroup3)
        return String(projectStatusCount(c.report, r.status || r.key));
      return String(itemValueFn(c.report, g.key, r.key));
    });
    const total = perLocVals.reduce((acc, v) => acc + (Number(v) || 0), 0);

    const row: any[] = [
      {
        content: `${groupIndex}.${itemNum}`,
        styles: { fontSize: FONT_SIZE_TABLE_CELL, halign: "center" },
      },
      {
        content: r.label,
        styles: {
          fontSize: FONT_SIZE_TABLE_CELL,
          halign: "left",
          // For group3, apply status color to label column (matches CSS .status-*)
          ...(isGroup3
            ? { textColor: STATUS_COLORS[r.status || "warning"] || COLOR_TEXT }
            : {}),
        },
      },
    ];

    for (let j = 0; j < cols.length; j++) {
      row.push({
        content: perLocVals[j],
        styles: { fontSize: FONT_SIZE_TABLE_CELL, halign: "center" },
      });
    }

    row.push({
      content: String(total),
      styles: { fontSize: FONT_SIZE_TABLE_CELL, halign: "center" },
    });
    row.push({
      content: r.unit || "",
      styles: { fontSize: FONT_SIZE_TABLE_CELL, halign: "center" },
    });

    return row;
    });

  // Build columns array for autoTable
  const columns: any[] = [
    { header: "", dataKey: "0" },
    { header: "หัวข้อ", dataKey: "1" },
  ];
  for (let j = 0; j < cols.length; j++) {
    columns.push({ header: "", dataKey: String(j + 2) });
  }
  columns.push({ header: "รวม", dataKey: String(cols.length + 2) });
  const startPages = doc.getNumberOfPages();

  autoTable(doc, {
    startY,
    margin: { left: marginLeft, right: marginRight, top: HEADER_HEIGHT },
    theme: "grid",
    tableWidth: width,
    head: [firstHeaderRow, secondHeaderRow],
    body: bodyRows,
    styles: {
      font: FONT_NAME,
      fontSize: FONT_SIZE_TABLE_CELL,
      cellPadding: { top: 1.8, right: 1, bottom: 1.8, left: 1 } as const,
      textColor: COLOR_TEXT,
      lineColor: COLOR_GRID_LINE,
      lineWidth: 0.1,
      fillColor: [255, 255, 255],
    },
    headStyles: {
      fillColor: COLOR_PRIMARY_LIGHT,
      textColor: COLOR_TEXT,
      fontStyle: "bold" as const,
      fontSize: FONT_SIZE_TABLE_HEADER,
      halign: "center",
      valign: "middle",
      cellPadding: { top: 1.2, right: 1, bottom: 1.2, left: 1 } as const,
    },
    bodyStyles: { fillColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: NO_W, halign: "center" },
    },
    didParseCell: (data: any) => {
      // Hide borders on header cells that are empty (e.g. unit header is "")
      if (data.section === "head" && data.cell.raw === "") {
        data.cell.styles.lineColor = COLOR_GRID_LINE;
      }
    },
  });

  // If autoTable created new pages internally, draw headers on them
  if (headerInfo) {
    await drawHeadersIfNewPages(
      doc,
      headerInfo.sectorName,
      headerInfo.title,
      startPages,
      headerInfo.division,
    );
  }

  return (doc as any).lastAutoTable.finalY + GAP_MM;
}

// ─── Sector PDF Build (returns doc, no save) ────────────────

export async function buildSectorPdf(
  item: any,
  sectorName: string,
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: PAGE_ORIENTATION,
    unit: PAGE_UNIT,
    format: PAGE_FORMAT,
    compress: true,
  });

  await registerSarabunFonts(doc);

  const pageH = doc.internal.pageSize.getHeight();

  // ── Build groups ─────────────────────────────────────────
  const group2Disciplines = buildGroup2Disciplines(item);
  const group3Projects = buildGroup3Projects(item);
  // const group4GuardMovements = buildSectorGroup4(item); // DISABLED — will use later

  const allGroups: PdfGroup[] = [
    ...groupDefs,
    ...group2Disciplines,
    ...(group3Projects.length > 0 ? [group3Projects[0]] : []),
    // ...group4GuardMovements, // DISABLED — will use later
  ];

  const group2Keys = group2Disciplines.map((g) => g.key);
  const group3Keys = group3Projects.map((g) => g.key);
  // const group4Keys = group4GuardMovements.map((g) => g.key); // DISABLED — will use later

  let pageNo = 1;

  // ── Render Table Pages (3 tables per row — matches CSS grid) ─
  const pageW = doc.internal.pageSize.getWidth();
  const availW = pageW - MARGIN_X * 2;
  const tableW = (availW - (TABLES_PER_ROW - 1) * GAP_MM) / TABLES_PER_ROW;
  let y = HEADER_HEIGHT;

  for (
    let rowStart = 0;
    rowStart < allGroups.length;
    rowStart += TABLES_PER_ROW
  ) {
    const rowGroups = allGroups.slice(rowStart, rowStart + TABLES_PER_ROW);

    // Estimate row height (tallest table height + gap)
    const rowEstHeight = Math.max(
      ...rowGroups.map((g) =>
        g.items.length > 0 ? tableHeightMm(g.items.length) + GAP_MM : 20,
      ),
    );

    if (y + rowEstHeight > pageH - MARGIN_BOTTOM && y > HEADER_HEIGHT + 5) {
      doc.addPage();
      pageNo = doc.getNumberOfPages();
      y = HEADER_HEIGHT;
    }

    // Draw header on first page or new page
    if (y === HEADER_HEIGHT) {
      pageNo = doc.getNumberOfPages();
      await drawPageHeader(
        doc,
        sectorName,
        "รายงานประจำวันฝ่ายปฏิบัติการ (รายละเอียดภาค)",
        pageNo,
      );
    }

    // Render all tables in this row side by side
    let rowMaxY = y;
    for (let col = 0; col < rowGroups.length; col++) {
      const group = rowGroups[col];
      const isDiscipline = group2Keys.includes(group.key);
      const isGroup3 = group3Keys.includes(group.key);
      const groupIdx = rowStart + col + 1;
      const marginLeft = MARGIN_X + col * (tableW + GAP_MM);

      // ── Per-table page break: prevent autoTable from splitting ──
      const tableEst = group.items.length > 0
        ? tableHeightMm(group.items.length) + GAP_MM + 20
        : 28;
      if (y + tableEst > pageH - MARGIN_BOTTOM && y > HEADER_HEIGHT + 5) {
        doc.addPage();
        pageNo = doc.getNumberOfPages();
        y = HEADER_HEIGHT;
        rowMaxY = y;
      }
      if (y === HEADER_HEIGHT) {
        pageNo = doc.getNumberOfPages();
        await drawPageHeader(
          doc,
          sectorName,
          "รายงานประจำวันฝ่ายปฏิบัติการ (รายละเอียดภาค)",
          pageNo,
        );
      }

      const finalY = await renderGroupTable(
        doc,
        group,
        groupIdx,
        item,
        y,
        isDiscipline,
        isGroup3,
        0,
        { sectorName, title: "รายงานประจำวันฝ่ายปฏิบัติการ (รายละเอียดภาค)" },
        marginLeft,
        tableW,
      );
      rowMaxY = Math.max(rowMaxY, finalY);
    }
    y = rowMaxY;
  }

  // ── Render Project Detail Pages ──────────────────────────
  // Group index is fixed (6 = เข้าพบผู้ว่าจ้าง) matching the React components
  const projectItems: PdfGroupItem[] =
    group3Projects.length > 0 ? group3Projects[0].items : [];

  const PROJECT_GROUP_IDX = 6;

  // Helper to start a new page (matches buildSummariesPdf pattern)
  const startNewPage = async () => {
    doc.addPage();
    pageNo = doc.getNumberOfPages();
    await drawPageHeader(
      doc,
      sectorName,
      "รายงานประจำวันฝ่ายปฏิบัติการ (รายละเอียดภาค)",
      pageNo,
    );
    return HEADER_HEIGHT;
  };

  // Always start a new page for project details section
  y = await startNewPage();
  y += 2;

  let remaining: PdfGroupItem[] | null = projectItems;
  while (remaining) {
    const result = renderProjectDetails(doc, remaining, PROJECT_GROUP_IDX, y);
    remaining = result.overflow;

    if (remaining) {
      y = await startNewPage();
      y += 2;
    } else {
      y = result.finalY;
    }
  }

  // ── Guard Movement Detail Pages (group 7) disabled — will use later ──

  // ── Finalize: add page numbers ──────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawPageFooter(doc, p, totalPages);
  }

  return doc;
}

// ─── Summaries PDF Build (returns doc, no save) ─────────────

export async function buildSummariesPdf(
  item: any,
  sectorName: string,
  reports: any[] = [],
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: PAGE_ORIENTATION,
    unit: PAGE_UNIT,
    format: PAGE_FORMAT,
    compress: true,
  });

  await registerSarabunFonts(doc);

  const pageH = doc.internal.pageSize.getHeight();

  // ── Filter reports ───────────────────────────────────────
  const selectedSector = item.department_id ?? 1;
  const selectedReportDate =
    item.report_date ?? (item.created_at ? item.created_at.slice(0, 10) : "");

  const summaryReports = (reports || []).filter((r: any) => {
    const deptMatch = Number(r.department_id) === Number(selectedSector);
    const rd = r.report_date ?? (r.created_at ? r.created_at.slice(0, 10) : "");
    const dateMatch = !selectedReportDate || rd === selectedReportDate;
    const statusMatch = r.approved_status === "APPROVED";
    return deptMatch && dateMatch && statusMatch;
  });

  const allCols = getCols(summaryReports, item);
  const colChunks = chunkCols(allCols);

  let pageNo = 1;

  // ── Helper to start a new page ──────────────────────────
  const startNewPage = async (title: string, division?: string) => {
    doc.addPage();
    pageNo = doc.getNumberOfPages();
    await drawPageHeader(doc, sectorName, title, pageNo, division);
    return HEADER_HEIGHT;
  };

  // ── Summary Grid Pages ──────────────────────────────────
  for (let chunkIdx = 0; chunkIdx < colChunks.length; chunkIdx++) {
    const cols = colChunks[chunkIdx];

    // Skip empty column chunks
    if (!cols || cols.length === 0) continue;

    // const group4Summary = buildGroup4ForSummary(summaryReports); // DISABLED — will use later
    const dynamicGroup2 = buildGroup2ForSummary(summaryReports);
    const allSummaryGroups: Array<{
      g: PdfGroup;
      index: number;
      isGroup3: boolean;
    }> = [
      ...group1.map((g, i) => ({ g, index: i + 1, isGroup3: false })),
      ...dynamicGroup2.map((g, i) => ({
        g,
        index: group1.length + i + 1,
        isGroup3: false,
      })),
      ...group3Static.map((g) => ({ g, index: 6, isGroup3: true })),
      // {
      //   g: group4Summary,
      //   index: 7,
      //   isGroup3: false,
      // }, // DISABLED — will use later
    ];

    let y = chunkIdx === 0 ? HEADER_HEIGHT : HEADER_HEIGHT;

    if (chunkIdx > 0) {
      y = await startNewPage("รายงานประจำวันฝ่ายปฏิบัติการ");
    } else {
      pageNo = doc.getNumberOfPages();
      await drawPageHeader(
        doc,
        sectorName,
        "รายงานประจำวันฝ่ายปฏิบัติการ",
        pageNo,
      );
      y = HEADER_HEIGHT;
    }

    // Render summary tables in grid layout (matches CSS grid via getTablesPerRow)
    const tablesPerRow = getTablesPerRow(cols.length);
    const sPageW = doc.internal.pageSize.getWidth();
    const sAvailW = sPageW - MARGIN_X * 2;
    const summaryTableW =
      (sAvailW - (tablesPerRow - 1) * GAP_MM) / tablesPerRow;

    for (
      let rowStart = 0;
      rowStart < allSummaryGroups.length;
      rowStart += tablesPerRow
    ) {
      const rowGroups = allSummaryGroups.slice(
        rowStart,
        rowStart + tablesPerRow,
      );

      const rowEstHeight = Math.max(
        ...rowGroups.map(({ g }) =>
          g.items.length > 0
            ? summaryTableHeightMm(g.items.length) + GAP_MM
            : 20,
        ),
      );

      if (y + rowEstHeight > pageH - MARGIN_BOTTOM) {
        y = await startNewPage("รายงานประจำวันฝ่ายปฏิบัติการ");
      }

      let rowMaxY = y;
      for (let col = 0; col < rowGroups.length; col++) {
        const { g, index, isGroup3 } = rowGroups[col];
        const marginLeft = MARGIN_X + col * (summaryTableW + GAP_MM);

        // ── Per-table page break: prevent autoTable from splitting this table ──
        const tableEst = g.items.length > 0
          ? summaryTableHeightMm(g.items.length) + GAP_MM + 20
          : 28;
        if (y + tableEst > pageH - MARGIN_BOTTOM && y > HEADER_HEIGHT + 5) {
          y = await startNewPage("รายงานประจำวันฝ่ายปฏิบัติการ");
          rowMaxY = y;
        }

        const finalY = await renderSummaryTable(
          doc,
          g,
          cols,
          index,
          isGroup3,
          y,
          item,
          0,
          { sectorName, title: "รายงานประจำวันฝ่ายปฏิบัติการ" },
          marginLeft,
          summaryTableW,
        );
        rowMaxY = Math.max(rowMaxY, finalY);
      }
      y = rowMaxY;
    }

    // ── Detailed Report Pages for this chunk ──────────────
    for (const col of cols) {
      const colReport = col.report;

      // ── Build groups for detailed sector tables ──────────
      const detailGroup2 = buildGroup2Disciplines(colReport);
      const detailGroup3 = buildGroup3Projects(colReport);
      // const detailGroup4 = buildSummaryGroup4(colReport); // DISABLED — will use later
      const detailGroups: PdfGroup[] = [
        ...group1,
        ...detailGroup2,
        ...(detailGroup3.length > 0 ? [detailGroup3[0]] : []),
        // detailGroup4, // DISABLED — will use later
      ];

      const group2Keys = detailGroup2.map((g) => g.key);
      const group3Keys = detailGroup3.map((g) => g.key);

      // ── Page type 1: Tables ──────────────────────────────
      if (y + 10 > pageH - MARGIN_BOTTOM) {
        y = await startNewPage("รายงานประจำวันฝ่ายปฏิบัติการ", col.division);
      } else {
        y = await startNewPage("รายงานประจำวันฝ่ายปฏิบัติการ", col.division);
      }

      // Render detail tables in grid (3 per row, matching CSS grid)
      const pageW = doc.internal.pageSize.getWidth();
      const detailAvailW = pageW - MARGIN_X * 2;
      const detailTableW =
        (detailAvailW - (TABLES_PER_ROW - 1) * GAP_MM) / TABLES_PER_ROW;

      for (
        let rowStart = 0;
        rowStart < detailGroups.length;
        rowStart += TABLES_PER_ROW
      ) {
        const rowGroups = detailGroups.slice(
          rowStart,
          rowStart + TABLES_PER_ROW,
        );

        const rowEstHeight = Math.max(
          ...rowGroups.map((g) =>
            g.items.length > 0 ? tableHeightMm(g.items.length) + GAP_MM : 20,
          ),
        );

        if (y + rowEstHeight > pageH - MARGIN_BOTTOM && y > HEADER_HEIGHT + 5) {
          y = await startNewPage("รายงานประจำวันฝ่ายปฏิบัติการ", col.division);
        }

        let rowMaxY = y;
        for (let colIdx = 0; colIdx < rowGroups.length; colIdx++) {
          const g = rowGroups[colIdx];
          const isDiscipline = group2Keys.includes(g.key);
          const isGroup3 = group3Keys.includes(g.key);
          const groupIdx = rowStart + colIdx + 1;
          const marginLeft = MARGIN_X + colIdx * (detailTableW + GAP_MM);

          // ── Per-table page break: prevent autoTable from splitting ──
          const tableEst = g.items.length > 0
            ? tableHeightMm(g.items.length) + GAP_MM + 20
            : 28;
          if (y + tableEst > pageH - MARGIN_BOTTOM && y > HEADER_HEIGHT + 5) {
            y = await startNewPage("รายงานประจำวันฝ่ายปฏิบัติการ", col.division);
            rowMaxY = y;
          }

          const finalY = await renderGroupTable(
            doc,
            g,
            groupIdx,
            colReport,
            y,
            isDiscipline,
            isGroup3,
            0,
            { sectorName, title: "รายงานประจำวันฝ่ายปฏิบัติการ", division: col.division },
            marginLeft,
            detailTableW,
          );
          rowMaxY = Math.max(rowMaxY, finalY);
        }
        y = rowMaxY;
      }

      // ── Page type 2: Project details ────────────────────
      const projectItems: PdfGroupItem[] = (colReport.projects || []).map(
        (p: any) => ({
          key: p.id ?? p.key ?? String(Math.random()),
          label: p.project_name ?? p.name ?? "-",
          detail: p.detail ?? "",
          status: p.status ?? "warning",
          note: p.note ?? "",
        }),
      );

      const GROUP_IDX_PROJECT = 6;

      if (y + 15 > pageH - MARGIN_BOTTOM) {
        y = await startNewPage("รายงานประจำวันฝ่ายปฏิบัติการ", col.division);
      } else {
        y = await startNewPage("รายงานประจำวันฝ่ายปฏิบัติการ", col.division);
      }

      let remaining: PdfGroupItem[] | null = projectItems;
      while (remaining) {
        const result = renderProjectDetails(
          doc,
          remaining,
          GROUP_IDX_PROJECT,
          y,
        );
        remaining = result.overflow;

        if (remaining) {
          y = await startNewPage("รายงานประจำวันฝ่ายปฏิบัติการ", col.division);
        } else {
          y = result.finalY;
        }
      }

      // ── Page type 3: Guard movement details disabled — will use later ──
    }
  }

  // ── Finalize: add footers ───────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawPageFooter(doc, p, totalPages);
  }

  return doc;
}

// ─── Sector PDF Export (saves + downloads) ──────────────────

export async function exportSectorPdf(
  item: any,
  sectorName: string,
  fileName: string = `Sector_Report_${item.id || "report"}.pdf`,
): Promise<void> {
  const doc = await buildSectorPdf(item, sectorName);
  doc.save(fileName);
}

// ─── Summaries PDF Export (saves + downloads) ───────────────

export async function exportSummariesPdf(
  item: any,
  sectorName: string,
  reports: any[] = [],
  fileName: string = `MO_Report_${item.id || "report"}.pdf`,
): Promise<void> {
  const doc = await buildSummariesPdf(item, sectorName, reports);
  doc.save(fileName);
}

// ─── Main Export Function ──────────────────────────────────

export async function exportMoReportPdf(
  options: ExportMoReportPdfOptions,
): Promise<void> {
  const { item, sectorName, isSector, reports, fileName } = options;

  if (isSector) {
    await exportSectorPdf(item, sectorName, fileName);
  } else {
    await exportSummariesPdf(item, sectorName, reports, fileName);
  }
}
