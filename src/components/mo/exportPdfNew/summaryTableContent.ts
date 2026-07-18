// ─── Summary Table Content ─────────────────────────────────
// Renders ONE summary grid table using jspdf-autotable.
// Used only in exportSummarPdf.ts.
//
// Replaces the old React SummaryTableContent.tsx (HTML-only, never used).
//
// TABLE STRUCTURE (variable columns):
//   Head row 1: groupIndex | Group Title (colspan = cols.length + 3)
//   Head row 2: "หัวข้อ" (colspan=2) | per-location short names | "รวม" | ""
//   Body rows:  [No. | Label | per-location values... | Total | Unit]
//
//   - For guard_movements: values = count by status
//   - For group3 (isGroup3): values = count by project status, colored label
//   - For regular groups: values = itemValueFn(report, group.key, item.key)
//
// ═══════════════════════════════════════════════════════════

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { PdfGroup } from "./types";
import type { SummaryColumn } from "../PdfRender/summaries/summaryHelpers";
import {
  guardMovementStatusCount,
  projectStatusCount,
  itemValueFn,
} from "../PdfRender/summaries/summaryHelpers";
import {
  MARGIN_MM,
  HEADER_HEIGHT_MM,
  GAP_MM,
  FONT_NAME,
  FONT_SIZE_TABLE_HEADER,
  FONT_SIZE_TABLE_CELL,
  COLOR_PRIMARY_LIGHT,
  COLOR_TEXT,
  COLOR_GRID_LINE,
  STATUS_COLORS,
} from "./pdfStyles";
import { drawHeadersIfNewPages, drawPageHeader } from "./pdfHelpers";

/** Estimate total summary table height in mm (2 header rows + N body rows) */
export function summaryTableHeightMm(itemCount: number): number {
  if (itemCount <= 0) return 12.4;
  return 12.4 + itemCount * 7.4;
}

/**
 * Render one group as a summary autoTable with per-location columns.
 *
 * @param overrideMarginLeft - X position for side-by-side grid layout
 * @param constrainWidth - constrained table width for grid
 * @returns Y position after the table
 */
export async function renderSummaryTable(
  doc: jsPDF,
  group: PdfGroup,
  cols: SummaryColumn[],
  groupIndex: number,
  isGroup3: boolean,
  startY: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
  itemOffset: number,
  headerInfo: { sectorName: string; title: string; division?: string } | null,
  overrideMarginLeft?: number,
  constrainWidth?: number,
): Promise<number> {
  const pageW = doc.internal.pageSize.getWidth();
  const marginLeft = overrideMarginLeft ?? MARGIN_MM;
  const width = constrainWidth ?? pageW - MARGIN_MM * 2;
  const marginRight = pageW - marginLeft - width;

  // Page break check
  {
    const pageH = doc.internal.pageSize.getHeight();
    const availH = pageH - startY - MARGIN_MM - 5;
    const estH = summaryTableHeightMm(group.items.length);
    if (estH > availH && startY > HEADER_HEIGHT_MM + 3) {
      doc.addPage();
      if (headerInfo) {
        const newPageNo = doc.getNumberOfPages();
        await drawPageHeader(doc, headerInfo.sectorName, headerInfo.title, newPageNo, headerInfo.division);
      }
      startY = HEADER_HEIGHT_MM;
    }
  }

  // Column widths
  const NO_W = 7;
  const LOC_W = 8;
  const TOTAL_W = 9;
  const UNIT_W = 8;

  // First header row: group number + title
  const firstHeaderRow = [
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
      content: group.title,
      colSpan: cols.length + 3,
      styles: {
        fontStyle: "bold" as const,
        fillColor: COLOR_PRIMARY_LIGHT,
        textColor: COLOR_TEXT,
        fontSize: FONT_SIZE_TABLE_HEADER,
        cellPadding: { top: 1.5, bottom: 1.5 },
        halign: "left" as const,
      },
    },
  ];

  // Second header row: "หัวข้อ" + per-location + "รวม" + unit
  const secondHeaderRow: Record<string, unknown>[] = [
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
        ? words.slice(0, 2).map((w) => w.charAt(0)).join("")
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

  // Body rows
  const bodyRows: Record<string, unknown>[][] = group.items.map((r, i) => {
    const itemNum = itemOffset + i + 1;
    const perLocVals = cols.map((c) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const report = (c as any).report;
      if (!report) return "0";
      if (group.key === "guard_movements") {
        return String(guardMovementStatusCount(report, r.status || r.key));
      }
      if (isGroup3) {
        return String(projectStatusCount(report, r.status || r.key));
      }
      return String(itemValueFn(report, group.key, r.key));
    });
    const total = perLocVals.reduce((acc, v) => acc + (Number(v) || 0), 0);

    const row: Record<string, unknown>[] = [
      {
        content: `${groupIndex}.${itemNum}`,
        styles: { fontSize: FONT_SIZE_TABLE_CELL, halign: "center" },
      },
      {
        content: r.label,
        styles: {
          fontSize: FONT_SIZE_TABLE_CELL,
          halign: "left",
          ...(isGroup3 ? { textColor: STATUS_COLORS[r.status || "warning"] || COLOR_TEXT } : {}),
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

  const startPages = doc.getNumberOfPages();

  autoTable(doc, {
    startY,
    margin: { left: marginLeft, right: marginRight, top: HEADER_HEIGHT_MM },
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
    columnStyles: { 0: { cellWidth: NO_W, halign: "center" } },
  });

  if (headerInfo) {
    await drawHeadersIfNewPages(doc, headerInfo.sectorName, headerInfo.title, startPages, headerInfo.division);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).lastAutoTable.finalY + GAP_MM;
}
