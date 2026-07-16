// ─── Division Detail Content ──────────────────────────────
// Renders project detail and guard movement detail blocks using
// jspdf-autotable. Used in both exportDivisionPdf.ts and
// exportSummarPdf.ts (per-division detail section).
//
// TABLE STRUCTURE (6 columns):
//   Per item (4-row atomic block — rendered as ONE autoTable):
//     Row 1: "N.n" | item label (colspan=5)
//     Row 2: "รายละเอียด" | detail text (colspan=5)
//     Row 3: "สถานะ" | status text (colspan=5)
//     Row 4: "หมายเหตุ" | note text (colspan=5, thicker bottom border)
//
// PAGINATION:
//   Each item is rendered as its OWN autoTable call (never split).
//   The section head ("6 | ...") is a separate autoTable drawn once
//   per page before the first item.
//
//   Pre-check uses accurate `doc.splitTextToSize()` height so items
//   fill each page fully. Head height is included when checking
//   whether the first item on a page fits.
//
//   Item autoTables use `top: 0` margin so they stack directly
//   below the head / previous item with only GAP_MM spacing.
//
// ═══════════════════════════════════════════════════════════

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { PdfGroupItem } from "./types";
import {
  FONT_NAME,
  MARGIN_MM,
  HEADER_HEIGHT_MM,
  GAP_MM,
  FONT_SIZE_TABLE_HEADER,
  FONT_SIZE_DETAIL,
  FONT_SIZE_EMPTY,
  COLOR_PRIMARY_LIGHT,
  COLOR_TEXT,
  COLOR_GRID_LINE,
  STATUS_COLORS,
  STATUS_LABELS,
} from "./pdfStyles";
import { drawHeadersIfNewPages, startNewPage } from "./pdfHelpers";

// ── Constants ──────────────────────────────────────────────

const LABEL_CELL_W = 18;
const PT_TO_MM = 0.352778;
const _ROW_BASE = 1.5 + 1.5 + 0.1; // padT + padB + borderWidth = 3.1mm

/**
 * autoTable margin configs — two variants:
 *   HEAD:  top=5mm  — only the section head row needs top space
 *   ITEM:  top=0    — items stack directly after head/previous item
 */
const TABLE_MARGIN = {
  left: MARGIN_MM,
  right: MARGIN_MM,
  top: 5,
  bottom: MARGIN_MM,
};
const ITEM_MARGIN = {
  left: MARGIN_MM,
  right: MARGIN_MM,
  top: 0,
  bottom: MARGIN_MM,
};

// ── Helpers ────────────────────────────────────────────────

function _baseStyles() {
  return {
    font: FONT_NAME,
    fontSize: FONT_SIZE_DETAIL,
    cellPadding: { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 } as const,
    textColor: COLOR_TEXT,
    lineColor: COLOR_GRID_LINE,
    lineWidth: 0.1,
    fillColor: [255, 255, 255],
  };
}

function _labelCellStyle() {
  return {
    fontSize: FONT_SIZE_DETAIL,
    halign: "center" as const,
    cellWidth: LABEL_CELL_W,
  };
}

function _noteBorder(): { top: number; bottom: number; left: number; right: number } {
  return { top: 0.1, bottom: 0.2, left: 0.1, right: 0.1 };
}

// ── Height Estimation ─────────────────────────────────────

/**
 * Calculate the exact height of one 4-row item block.
 * Uses doc.splitTextToSize() for accurate text wrapping.
 */
function _calcItemBlockHeight(
  doc: jsPDF,
  item: PdfGroupItem,
  contentTextWidth: number,
  statusText: string,
  lineHeightMm: number,
): number {
  const rowH = (lineCount: number) =>
    lineCount * lineHeightMm + _ROW_BASE;

  return (
    rowH(Math.max(1, doc.splitTextToSize(item.label, contentTextWidth).length)) +
    rowH(Math.max(1, doc.splitTextToSize(item.detail || "-", contentTextWidth).length)) +
    rowH(Math.max(1, doc.splitTextToSize(statusText, contentTextWidth).length)) +
    rowH(Math.max(1, doc.splitTextToSize(item.note || "-", contentTextWidth).length))
  );
}

/**
 * Head row height (always 1 line, uses same font size as detail = 7pt).
 */
function _calcHeaderRowHeight(lineHeightMm: number): number {
  return lineHeightMm + _ROW_BASE;
}

function _buildHeadRows(groupIndex: number, title: string): unknown[][] {
  const headStyles = {
    fillColor: COLOR_PRIMARY_LIGHT,
    textColor: COLOR_TEXT,
    fontStyle: "bold" as const,
    fontSize: FONT_SIZE_TABLE_HEADER,
  };
  return [
    [
      {
        content: String(groupIndex),
        styles: { ...headStyles, cellWidth: LABEL_CELL_W, halign: "center" },
      },
      {
        content: title,
        colSpan: 5,
        styles: { ...headStyles, halign: "left" as const },
      },
    ],
  ];
}

function _buildItemRows(
  item: PdfGroupItem,
  num: string,
  statusText: string,
  statusColor: [number, number, number],
): unknown[][] {
  return [
    [
      { content: num, styles: { ..._labelCellStyle() } },
      {
        content: item.label,
        colSpan: 5,
        styles: { halign: "left" as const, fontSize: FONT_SIZE_DETAIL },
      },
    ],
    [
      { content: "\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14", styles: { ..._labelCellStyle() } },
      {
        content: item.detail || "-",
        colSpan: 5,
        styles: { halign: "left" as const, fontSize: FONT_SIZE_DETAIL },
      },
    ],
    [
      { content: "\u0E2A\u0E16\u0E32\u0E19\u0E30", styles: { ..._labelCellStyle() } },
      {
        content: statusText,
        colSpan: 5,
        styles: {
          halign: "left" as const,
          fontSize: FONT_SIZE_DETAIL,
          textColor: statusColor,
          fontStyle: "normal" as const,
        },
      },
    ],
    [
      {
        content: "\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38",
        styles: {
          ..._labelCellStyle(),
          lineWidth: _noteBorder(),
          lineColor: COLOR_GRID_LINE,
        },
      },
      {
        content: item.note || "-",
        colSpan: 5,
        styles: {
          halign: "left" as const,
          fontSize: FONT_SIZE_DETAIL,
          lineWidth: _noteBorder(),
          lineColor: COLOR_GRID_LINE,
        },
      },
    ],
  ];
}

function _commonProps(availW: number): Record<string, unknown> {
  return {
    margin: TABLE_MARGIN,
    tableWidth: availW,
    theme: "grid" as const,
    tableLineWidth: 0,
    styles: _baseStyles() as Record<string, unknown>,
    bodyStyles: { fillColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: LABEL_CELL_W, halign: "center" as const },
    },
  };
}

/**
 * Props for section head — top margin 5mm so it doesn't touch the page header.
 */
function _headProps(availW: number): Record<string, unknown> {
  return {
    margin: TABLE_MARGIN,
    tableWidth: availW,
    theme: "grid" as const,
    tableLineWidth: 0,
    styles: _baseStyles() as Record<string, unknown>,
    columnStyles: {
      0: { cellWidth: LABEL_CELL_W, halign: "center" as const },
    },
  };
}

/**
 * Props for individual item — NO top margin so items stack
 * directly below the head / previous item with only GAP_MM spacing.
 */
function _itemProps(availW: number): Record<string, unknown> {
  return {
    margin: ITEM_MARGIN,
    tableWidth: availW,
    theme: "grid" as const,
    tableLineWidth: 0,
    styles: _baseStyles() as Record<string, unknown>,
    bodyStyles: { fillColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: LABEL_CELL_W, halign: "center" as const },
    },
  };
}

function _renderHead(
  doc: jsPDF,
  groupIndex: number,
  title: string,
  startY: number,
  availW: number,
): number {
  autoTable(doc, {
    ..._headProps(availW),
    startY,
    head: _buildHeadRows(groupIndex, title),
    body: [] as unknown[][],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).lastAutoTable.finalY;
}

function _renderSingleItem(
  doc: jsPDF,
  item: PdfGroupItem,
  num: string,
  statusText: string,
  statusColor: [number, number, number],
  startY: number,
  availW: number,
): number {
  const body = _buildItemRows(item, num, statusText, statusColor);
  autoTable(doc, {
    ..._itemProps(availW),
    startY,
    body,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).lastAutoTable.finalY + GAP_MM;
}

// ── Shared detail renderer ────────────────────────────────

/**
 * Configuration for a single detail section (project or guard movement).
 */
interface _SectionConfig {
  groupIndex: number;
  title: string;
  emptyText: string;
  items: PdfGroupItem[];
  getStatusText: (item: PdfGroupItem) => string;
  getStatusColor: (item: PdfGroupItem) => [number, number, number];
}

/**
 * Render multiple detail sections in ONE continuous flow.
 *
 * Sections are rendered sequentially on the same page:
 *   - When transitioning between sections, draw the new section head
 *   - When a new page is needed for overflow, draw the CURRENT section's head
 *   - Empty sections render their head + "no data" body inline
 *
 * All items use accurate `doc.splitTextToSize()` height checks and
 * `top: 0` margin autoTables for tight vertical packing.
 */
async function _renderCombinedSections(
  doc: jsPDF,
  sections: _SectionConfig[],
  startY: number,
  headerInfo?: { sectorName: string; title: string; division?: string } | null,
): Promise<{ finalY: number }> {
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const availW = pageW - MARGIN_MM * 2;
  const contentTextWidth = availW - LABEL_CELL_W - 1.5 - 1.5;
  const bottomLimit = pageH - MARGIN_MM;

  doc.setFont(FONT_NAME, "normal");
  doc.setFontSize(FONT_SIZE_DETAIL);
  const lineHeightMm = FONT_SIZE_DETAIL * PT_TO_MM * 1.2;
  const headH = _calcHeaderRowHeight(lineHeightMm);

  let currentY = startY;
  // Tracks which section's head is currently rendered on this page.
  // -1 means no head has been drawn on this page yet.
  let activeSectionIdx = -1;

  for (let s = 0; s < sections.length; s++) {
    const section = sections[s];
    const hasItems = section.items.length > 0;

    // ── Empty section ──
    if (!hasItems) {
      // Estimate: head row + 1 body row + bottom padding
      const emptyEstH = headH + (_ROW_BASE + lineHeightMm);

      if (currentY + emptyEstH > bottomLimit) {
        if (headerInfo) {
          currentY = await startNewPage(doc, headerInfo.sectorName, headerInfo.title, headerInfo.division);
          currentY += 2;
        } else {
          doc.addPage();
          currentY = HEADER_HEIGHT_MM;
        }
      }

      const startPages = doc.getNumberOfPages();
      autoTable(doc, {
        ..._commonProps(availW),
        startY: currentY,
        head: _buildHeadRows(section.groupIndex, section.title),
        body: [
          [
            {
              content: section.emptyText,
              colSpan: 6,
              styles: {
                halign: "center",
                fontSize: FONT_SIZE_EMPTY,
                textColor: COLOR_TEXT,
              },
            },
          ],
        ],
      });
      if (headerInfo) {
        await drawHeadersIfNewPages(doc, headerInfo.sectorName, headerInfo.title, startPages, headerInfo.division);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentY = (doc as any).lastAutoTable.finalY + GAP_MM;
      activeSectionIdx = s;
      continue;
    }

    // ── Section with items ──
    for (let i = 0; i < section.items.length; i++) {
      const item = section.items[i];
      const num = `${section.groupIndex}.${i + 1}`;
      const stText = section.getStatusText(item);
      const stColor = section.getStatusColor(item);

      const itemH = _calcItemBlockHeight(doc, item, contentTextWidth, stText, lineHeightMm);

      // Determine if we need to draw a section head:
      //   - On a fresh page (activeSectionIdx === -1 or changed page)
      //   - Or when switching to a new section on the same page
      const needsSectionHead = s !== activeSectionIdx;
      const neededH = needsSectionHead ? headH + itemH : itemH;

      if (currentY + neededH > bottomLimit) {
        // Doesn't fit — start fresh page and draw current section's head
        if (headerInfo) {
          currentY = await startNewPage(doc, headerInfo.sectorName, headerInfo.title, headerInfo.division);
          currentY += 2;
        } else {
          doc.addPage();
          currentY = HEADER_HEIGHT_MM;
        }

        const pagesBefore = doc.getNumberOfPages();
        currentY = _renderHead(doc, section.groupIndex, section.title, currentY, availW);
        if (headerInfo) {
          await drawHeadersIfNewPages(doc, headerInfo.sectorName, headerInfo.title, pagesBefore, headerInfo.division);
        }
        activeSectionIdx = s;
      } else if (needsSectionHead) {
        // Section changed but fits — draw section head inline
        const pagesBefore = doc.getNumberOfPages();
        currentY = _renderHead(doc, section.groupIndex, section.title, currentY, availW);
        if (headerInfo) {
          await drawHeadersIfNewPages(doc, headerInfo.sectorName, headerInfo.title, pagesBefore, headerInfo.division);
        }
        activeSectionIdx = s;
      }

      // Render the item
      const pagesBefore = doc.getNumberOfPages();
      currentY = _renderSingleItem(doc, item, num, stText, stColor, currentY, availW);
      if (headerInfo) {
        await drawHeadersIfNewPages(doc, headerInfo.sectorName, headerInfo.title, pagesBefore, headerInfo.division);
      }
      // If autoTable created continuation pages, the section head is not on
      // those pages. Reset activeSectionIdx so the next item re-draws it.
      if (doc.getNumberOfPages() > pagesBefore) {
        activeSectionIdx = -1;
      }
    }
  }

  return { finalY: currentY };
}

// ── Public API ────────────────────────────────────────────

/**
 * Render project details (group 6) and guard movement details (group 7)
 * in ONE continuous flow on the same page(s).
 */
export async function renderProjectAndMovementDetails(
  doc: jsPDF,
  projects: PdfGroupItem[],
  movements: PdfGroupItem[],
  startY: number,
  headerInfo?: { sectorName: string; title: string; division?: string } | null,
): Promise<{ finalY: number }> {
  return _renderCombinedSections(doc, [
    {
      groupIndex: 6,
      title: "\u0E40\u0E02\u0E49\u0E32\u0E1E\u0E1A\u0E1C\u0E39\u0E49\u0E27\u0E48\u0E32\u0E08\u0E49\u0E32\u0E07 (\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14)",
      emptyText: "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23",
      items: projects,
      getStatusText: (p) => STATUS_LABELS[p.status || "warning"] || p.status || "-",
      getStatusColor: (p) => STATUS_COLORS[p.status || "warning"] || COLOR_TEXT,
    },
    // ── Movement section (group 7) — disabled for now, will use later ──
    // {
    //   groupIndex: 7,
    //   title: "\u0E01\u0E32\u0E23\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E41\u0E1B\u0E25\u0E07\u0E08\u0E38\u0E14\u0E23\u0E31\u0E01\u0E29\u0E32\u0E01\u0E32\u0E23\u0E13\u0E4C (\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14)",
    //   emptyText: "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E01\u0E32\u0E23\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E41\u0E1B\u0E25\u0E07\u0E08\u0E38\u0E14\u0E23\u0E31\u0E01\u0E29\u0E32\u0E01\u0E32\u0E23\u0E13\u0E4C",
    //   items: movements,
    //   getStatusText: (m) => m.status || "-",
    //   getStatusColor: () => COLOR_TEXT,
    // },
  ], startY, headerInfo);
}

/** @deprecated Use renderProjectAndMovementDetails instead */
export async function renderProjectDetails(
  doc: jsPDF,
  projects: PdfGroupItem[],
  groupIndex: number,
  startY: number,
  headerInfo?: { sectorName: string; title: string; division?: string } | null,
): Promise<{ finalY: number; overflow: PdfGroupItem[] | null }> {
  const result = await _renderCombinedSections(doc, [
    {
      groupIndex,
      title: "\u0E40\u0E02\u0E49\u0E32\u0E1E\u0E1A\u0E1C\u0E39\u0E49\u0E27\u0E48\u0E32\u0E08\u0E49\u0E32\u0E07 (\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14)",
      emptyText: "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23",
      items: projects,
      getStatusText: (p) => STATUS_LABELS[p.status || "warning"] || p.status || "-",
      getStatusColor: (p) => STATUS_COLORS[p.status || "warning"] || COLOR_TEXT,
    },
  ], startY, headerInfo);
  return { finalY: result.finalY, overflow: null };
}

/** @deprecated Use renderProjectAndMovementDetails instead */
export async function renderGuardMovementDetails(
  doc: jsPDF,
  movements: PdfGroupItem[],
  groupIndex: number,
  startY: number,
  headerInfo?: { sectorName: string; title: string; division?: string } | null,
): Promise<{ finalY: number; overflow: PdfGroupItem[] | null }> {
  const result = await _renderCombinedSections(doc, [
    {
      groupIndex,
      title: "\u0E01\u0E32\u0E23\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E41\u0E1B\u0E25\u0E07\u0E08\u0E38\u0E14\u0E23\u0E31\u0E01\u0E29\u0E32\u0E01\u0E32\u0E23\u0E13\u0E4C (\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14)",
      emptyText: "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E01\u0E32\u0E23\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E41\u0E1B\u0E25\u0E07\u0E08\u0E38\u0E14\u0E23\u0E31\u0E01\u0E29\u0E32\u0E01\u0E32\u0E23\u0E13\u0E4C",
      items: movements,
      getStatusText: (m) => m.status || "-",
      getStatusColor: () => COLOR_TEXT,
    },
  ], startY, headerInfo);
  return { finalY: result.finalY, overflow: null };
}
