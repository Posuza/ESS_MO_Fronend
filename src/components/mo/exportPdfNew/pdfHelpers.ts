// ─── Shared PDF Helpers ─────────────────────────────────────
// Font loading, logo, header/footer, and estimation utilities.
// Used by: exportDivisionPdf.ts, exportSummarPdf.ts, autoTableRenderers.ts
// ═══════════════════════════════════════════════════════════

import { jsPDF } from "jspdf";
import {
  FONT_NAME,
  FONT_REGULAR_FILE,
  FONT_SEMIBOLD_FILE,
  MARGIN_MM,
  HEADER_HEIGHT_MM,
  FONT_SIZE_TITLE,
  FONT_SIZE_META,
  FONT_SIZE_PAGE_NUM,
  ROW_H_MM,
} from "./pdfStyles";
import { formatDate } from "./formatDate";
import logoUrl from "../../../assets/logo/logo_guts.png";
import type { PdfGroupItem } from "./types";

// ── Height Estimation ──────────────────────────────────────

/** Estimate total group table height in mm (1 header row + N body rows) */
function tableHeightMm(itemCount: number): number {
  if (itemCount <= 0) return 2 * ROW_H_MM;
  return (itemCount + 1) * ROW_H_MM;
}

/** Column configuration for pre-calculating autoTable height */
interface TableColumnConfig {
  width: number;
  getText: (item: PdfGroupItem) => string;
}

/**
 * Pre-calculate autoTable height using doc.splitTextToSize() for accurate text wrapping.
 * Call after setting the correct font on the doc — the helper sets FONT_SIZE_TABLE_CELL.
 */
function preCalcTableHeight(
  doc: jsPDF,
  items: PdfGroupItem[],
  columnConfigs: TableColumnConfig[],
  fontSizePt: number,
  cellPadding: { top: number; bottom: number; left: number; right: number },
  hasHeaderRow: boolean,
): number {
  const ptToMm = 0.352778;
  const fontSizeMm = fontSizePt * ptToMm;
  const lineHeightMm = fontSizeMm * 1.2; // matches autoTable's internal line spacing
  const borderWidth = 0.1; // matches tableStyles.lineWidth

  // Ensure font is set for splitTextToSize
  doc.setFont(FONT_NAME, "normal");
  doc.setFontSize(fontSizePt);

  let total = 0;

  // Header row (1 row, title spans full width, single-line in practice)
  if (hasHeaderRow) {
    total += lineHeightMm + cellPadding.top + cellPadding.bottom + borderWidth;
  }

  // Body rows
  for (const item of items) {
    let maxRowHeight = 0;
    for (const col of columnConfigs) {
      const text = col.getText(item);
      const availWidth = Math.max(col.width - cellPadding.left - cellPadding.right, 1);
      const lines = doc.splitTextToSize(text, availWidth);
      const lineCount = Array.isArray(lines) ? lines.length : 1;
      const cellHeight =
        lineCount * lineHeightMm +
        cellPadding.top +
        cellPadding.bottom +
        borderWidth;
      maxRowHeight = Math.max(maxRowHeight, cellHeight);
    }
    total += maxRowHeight;
  }

  return total;
}

// ── Font Loading ────────────────────────────────────────────

const fontCache = new Map<string, Promise<string>>();

/** Convert an ArrayBuffer to a binary string for jsPDF's addFileToVFS */
function arrayBufferToBinaryString(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let result = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    for (let i = 0; i < chunk.length; i++) {
      result += String.fromCharCode(chunk[i]);
    }
  }
  return result;
}

/** Fetch a font file from the public directory and return as binary string */
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

/** Register Sarabun Regular + SemiBold fonts on a jsPDF document */
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

// ── Logo Loading ────────────────────────────────────────────

let logoDataUrlPromise: Promise<string> | null = null;

/** Load the logo PNG as a data URL (cached for reuse across pages) */
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

// ── Header / Footer ────────────────────────────────────────

/**
 * Draw page header synchronously (logo + title + meta row).
 * Used inside autoTable's didDrawPage hook for consistency.
 */
function drawPageHeaderSync(
  doc: jsPDF,
  sectorName: string,
  title: string,
  _pageNo: number,
  division: string | undefined,
  logoData: string | null,
): void {
  const pageW = doc.internal.pageSize.getWidth();

  // Logo — centered at top
  if (logoData) {
    const logoH = 16;
    const logoW = (logoH * 2340) / 1190; // preserve aspect ratio
    const logoX = (pageW - logoW) / 2;
    try {
      doc.addImage(logoData, "PNG", logoX, 2, logoW, logoH);
    } catch {
      // Logo loading failed — skip silently
    }
  }

  // Title — centered below logo (bold)
  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(FONT_SIZE_TITLE);
  doc.setTextColor(0, 0, 0);
  doc.text(title, pageW / 2, 22, { align: "center" });

  // Meta row: sector name centered, date right-aligned
  doc.setFont(FONT_NAME, "normal");
  doc.setFontSize(FONT_SIZE_META);
  doc.setTextColor(0, 0, 0);
  const formattedSector = sectorName.replace(
    /([ก-๙0-9]+)\s+([A-Za-z]+)/,
    "$1 | $2",
  );
  let metaText = formattedSector;
  if (division) metaText += ` | ${division}`;
  doc.text(metaText, pageW / 2, 27, { align: "center" });

  // Date — right-aligned on same line
  doc.setFontSize(FONT_SIZE_PAGE_NUM);
  doc.text(formatDate(), pageW - MARGIN_MM, 27, { align: "right" });
}

/** Draw page header asynchronously (loads logo if needed) */
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

/** Draw page footer: "N / total" right-aligned */
function drawPageFooter(doc: jsPDF, pageNo: number, totalPages: number): void {
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFont(FONT_NAME, "normal");
  doc.setFontSize(FONT_SIZE_PAGE_NUM);
  doc.setTextColor(0, 0, 0);
  doc.text(`${pageNo} / ${totalPages}`, pageW - MARGIN_MM, pageH - 5, {
    align: "right",
  });
}

/**
 * After an autoTable call, check if new pages were created and
 * draw page headers on them.
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

/** Start a new page with header, return the header Y position */
async function startNewPage(
  doc: jsPDF,
  sectorName: string,
  title: string,
  division?: string,
): Promise<number> {
  doc.addPage();
  const newPageNo = doc.getNumberOfPages();
  await drawPageHeader(doc, sectorName, title, newPageNo, division);
  return HEADER_HEIGHT_MM;
}

export {
  tableHeightMm,
  preCalcTableHeight,
  arrayBufferToBinaryString,
  loadFontBinary,
  registerSarabunFonts,
  getLogoDataUrl,
  drawPageHeaderSync,
  drawPageHeader,
  drawPageFooter,
  drawHeadersIfNewPages,
  startNewPage,
};
