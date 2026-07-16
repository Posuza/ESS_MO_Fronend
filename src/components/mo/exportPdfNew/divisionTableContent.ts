// ─── Division Table Content ────────────────────────────────
// Renders ONE division/sector group table using jspdf-autotable.
// Used in both exportDivisionPdf.ts and exportSummarPdf.ts (per-division detail).
//
// Replaces the old React DivisionTableContent.tsx (HTML-only, never used).
//
// RENDER VARIANTS (based on group type):
//   A) EMPTY STATE (items.length === 0):
//      ┌──────┬──────────────────────────────┐
//      │  1   │  Group Title (colspan=3)      │
//      ├──────┴──────────────────────────────┤
//      │        - / ไม่มีข้อมูล (colspan=4)    │
//      └─────────────────────────────────────┘
//
//   B) GUARD MOVEMENTS (group.key === "guard_movements"):
//      Aggregated status counts.
//
//   C) GROUP 3 — PROJECTS (isGroup3 === true):
//      Each item: [No. | Project Name (colspan=2) | Colored Status]
//
//   D) REGULAR GROUPS (default):
//      [No. | Label | Value | Unit]
//
// ═══════════════════════════════════════════════════════════

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { PdfGroup, PdfGroupItem } from "./types";
import {
  FONT_NAME,
  MARGIN_MM,
  HEADER_HEIGHT_MM,
  GAP_MM,
  FONT_SIZE_TABLE_HEADER,
  FONT_SIZE_TABLE_CELL,
  FONT_SIZE_EMPTY,
  COLOR_PRIMARY_LIGHT,
  COLOR_TEXT,
  COLOR_GRID_LINE,
  STATUS_COLORS,
  STATUS_LABELS,
} from "./pdfStyles";
import { preCalcTableHeight, drawHeadersIfNewPages, drawPageHeader } from "./pdfHelpers";

// ── Shared Pre-Calculation ────────────────────────────────────

/**
 * Pre-calculate division group table height using splitTextToSize.
 * Mirrors the column width and render variant logic of renderGroupTable.
 * Used both internally and by exportSummarPdf.ts for page-break decisions.
 */
export function preCalcGroupTableHeight(
  doc: jsPDF,
  group: PdfGroup,
  width: number,
  isDiscipline: boolean,
  isGroup3: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
): number {
  const INDEX_W = Math.min(10, width * 0.12);
  const VALUE_W = Math.min(11, width * 0.18);
  const UNIT_W = Math.min(9, width * 0.16);
  const STATUS_W = Math.min(18, width * 0.3);

  doc.setFont(FONT_NAME, "normal");
  doc.setFontSize(FONT_SIZE_TABLE_CELL);

  // Empty state: 1 header row + 1 empty row
  if (group.items.length === 0) {
    const ptToMm = 0.352778;
    const lh = FONT_SIZE_TABLE_CELL * ptToMm * 1.2;
    const pad = 1.5;
    const border = 0.1;
    return 2 * (lh + pad * 2 + border);
  }

  // Guard movements: aggregate by status first
  // DISABLED — will use later
  // if (group.key === "guard_movements") {
  //   const statusMap = new Map<string, number>();
  //   for (const item of group.items) {
  //     const s = item.status || "-";
  //     statusMap.set(s, (statusMap.get(s) || 0) + 1);
  //   }
  //   const aggItems: PdfGroupItem[] = Array.from(statusMap.entries()).map(
  //     ([status, count]) => ({
  //       key: status,
  //       label: status,
  //       value: count,
  //       unit: "\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E07\u0E32\u0E19",
  //     }),
  //   );
  //   return preCalcTableHeight(
  //     doc, aggItems,
  //     [
  //       { width: INDEX_W, getText: () => "" },
  //       { width: width - INDEX_W - VALUE_W - UNIT_W, getText: (it) => it.label },
  //       { width: VALUE_W, getText: (it) => String(it.value ?? 0) },
  //       { width: UNIT_W, getText: (it) => it.unit ?? "" },
  //     ],
  //     FONT_SIZE_TABLE_CELL,
  //     { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 },
  //     true,
  //   );
  // }

  // Group 3 — projects: [No., Project Name (colspan=2), Status]
  if (isGroup3) {
    return preCalcTableHeight(
      doc, group.items,
      [
        { width: INDEX_W, getText: () => "" },
        { width: width - INDEX_W - STATUS_W, getText: (it) => it.label },
        { width: STATUS_W, getText: (it) => it.status || "warning" },
      ],
      FONT_SIZE_TABLE_CELL,
      { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 },
      true,
    );
  }

  // Regular groups: [No., Label, Value, Unit]
  return preCalcTableHeight(
    doc, group.items,
    [
      { width: INDEX_W, getText: () => "" },
      { width: width - INDEX_W - VALUE_W - UNIT_W, getText: (it) => it.label },
      { width: VALUE_W, getText: (it) => String(isDiscipline ? it.value ?? 0 : data[it.key] ?? 0) },
      { width: UNIT_W, getText: (it) => it.unit ?? "" },
    ],
    FONT_SIZE_TABLE_CELL,
    { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 },
    true,
  );
}

/**
 * Render one PdfGroup as an autoTable.
 * Columns adapt per group type (see variants above).
 *
 * @param overrideMarginLeft - X position for side-by-side grid layout
 * @param constrainWidth - constrained table width for grid
 * @returns Y position after the table
 */
export async function renderGroupTable(
  doc: jsPDF,
  group: PdfGroup,
  groupIndex: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
  startY: number,
  isDiscipline: boolean,
  isGroup3: boolean,
  itemOffset: number,
  headerInfo: { sectorName: string; title: string; division?: string } | null,
  overrideMarginLeft?: number,
  constrainWidth?: number,
): Promise<number> {
  const pageW = doc.internal.pageSize.getWidth();
  const marginLeft = overrideMarginLeft ?? MARGIN_MM;
  const width = constrainWidth ?? pageW - MARGIN_MM * 2;
  const marginRight = pageW - marginLeft - width;

  // Column widths proportional to available width (computed first for pre-calc)
  const INDEX_W = Math.min(10, width * 0.12);
  const VALUE_W = Math.min(11, width * 0.18);
  const UNIT_W = Math.min(9, width * 0.16);
  const STATUS_W = Math.min(18, width * 0.3);

  // ── Page break: pre-calculate exact height and push to next page if needed ──
  const pageH = doc.internal.pageSize.getHeight();
  const availH = pageH - startY - MARGIN_MM - 5;
  const estH = preCalcGroupTableHeight(doc, group, width, isDiscipline, isGroup3, data);
  if (estH > availH && startY > HEADER_HEIGHT_MM + 3) {
    doc.addPage();
    if (headerInfo) {
      const newPageNo = doc.getNumberOfPages();
      await drawPageHeader(doc, headerInfo.sectorName, headerInfo.title, newPageNo, headerInfo.division);
    }
    startY = HEADER_HEIGHT_MM;
  }

  // Shared header styles (bg #d9d9d9, bold, 7pt)
  const headStyles = {
    fillColor: COLOR_PRIMARY_LIGHT,
    textColor: COLOR_TEXT,
    fontStyle: "bold" as const,
    fontSize: FONT_SIZE_TABLE_HEADER,
  };

  // Shared cell styles (#d0d0d0 borders, 7pt, white bg)
  const tableStyles = {
    font: FONT_NAME,
    fontSize: FONT_SIZE_TABLE_CELL,
    cellPadding: { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 } as const,
    textColor: COLOR_TEXT,
    lineColor: COLOR_GRID_LINE,
    lineWidth: 0.1,
    fillColor: [255, 255, 255],
  };

  // ── Empty state ──
  if (group.items.length === 0) {
    const startPages = doc.getNumberOfPages();
    autoTable(doc, {
      startY,
      margin: { left: marginLeft, right: marginRight, top: HEADER_HEIGHT_MM },
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
              isDiscipline || isGroup3 || group.key === "guard_movements" ? "ไม่มีข้อมูล" : "-",
            colSpan: 4,
            styles: {
              halign: "center",
              fontSize: FONT_SIZE_EMPTY,
              textColor: COLOR_TEXT,
            },
          },
        ],
      ],
      styles: tableStyles as Record<string, unknown>,
      bodyStyles: { fillColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [255, 255, 255] },
    });
    if (headerInfo) {
      await drawHeadersIfNewPages(doc, headerInfo.sectorName, headerInfo.title, startPages, headerInfo.division);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (doc as any).lastAutoTable.finalY + GAP_MM;
  }

  // ── Guard movements: aggregate by status ──
  // DISABLED — will use later
  // if (group.key === "guard_movements") {
  //   const statusMap = new Map<string, number>();
  //   for (const item of group.items) {
  //     const s = item.status || "-";
  //     statusMap.set(s, (statusMap.get(s) || 0) + 1);
  //   }
  //   const aggregatedItems = Array.from(statusMap.entries());
  //
  //   const bodyRows = aggregatedItems.map(([status, count], i) => {
  //     const itemNum = itemOffset + i + 1;
  //     return [
  //       {
  //         content: `${groupIndex}.${itemNum}`,
  //         styles: { fontSize: FONT_SIZE_TABLE_CELL, halign: "center" },
  //       },
  //       {
  //         content: status,
  //         styles: { halign: "left", fontSize: FONT_SIZE_TABLE_CELL },
  //       },
  //       {
  //         content: String(count),
  //         styles: { fontSize: FONT_SIZE_TABLE_CELL, halign: "center" },
  //       },
  //       {
  //         content: "\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E07\u0E32\u0E19",
  //         styles: { fontSize: FONT_SIZE_TABLE_CELL, halign: "center" },
  //       },
  //     ];
  //   });
  //
  //   const startPages2 = doc.getNumberOfPages();
  //   autoTable(doc, {
  //     startY,
  //     margin: { left: marginLeft, right: marginRight, top: HEADER_HEIGHT_MM },
  //     tableWidth: width,
  //     theme: "grid",
  //     head: [
  //       [
  //         {
  //           content: String(groupIndex),
  //           styles: { ...headStyles, cellWidth: INDEX_W },
  //         },
  //         {
  //           content: group.title,
  //           colSpan: 3,
  //           styles: { ...headStyles },
  //         },
  //       ],
  //     ],
  //     body: bodyRows as never[],
  //     styles: tableStyles as Record<string, unknown>,
  //     bodyStyles: { fillColor: [255, 255, 255] },
  //     alternateRowStyles: { fillColor: [255, 255, 255] },
  //     columnStyles: {
  //       0: { cellWidth: INDEX_W, halign: "center" },
  //       1: { halign: "left" },
  //       2: { halign: "center", cellWidth: VALUE_W },
  //       3: { halign: "center", cellWidth: UNIT_W },
  //     },
  //   });
  //   if (headerInfo) {
  //     await drawHeadersIfNewPages(doc, headerInfo.sectorName, headerInfo.title, startPages2, headerInfo.division);
  //   }
  if (isGroup3) {
    // ── Group 3 — projects: [No., Project Name (colspan=2), Status] ──
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
      margin: { left: marginLeft, right: marginRight, top: HEADER_HEIGHT_MM },
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
      body: bodyRows as never[],
      styles: tableStyles as Record<string, unknown>,
      bodyStyles: { fillColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: INDEX_W, halign: "center" },
        1: { halign: "left" },
        3: { halign: "center", cellWidth: STATUS_W },
      },
    });
    if (headerInfo) {
      await drawHeadersIfNewPages(doc, headerInfo.sectorName, headerInfo.title, startPages3, headerInfo.division);
    }
  } else {
    // ── Regular groups: [No., Label, Value, Unit] ──
    const bodyRows = group.items.map((r: PdfGroupItem, i: number) => {
      const itemNum = itemOffset + i + 1;
      const value = isDiscipline
        ? String(r.value ?? 0)
        : String(data[r.key] ?? 0);
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
      margin: { left: marginLeft, right: marginRight, top: HEADER_HEIGHT_MM },
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
      body: bodyRows as never[],
      styles: tableStyles as Record<string, unknown>,
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
      await drawHeadersIfNewPages(doc, headerInfo.sectorName, headerInfo.title, startPages4, headerInfo.division);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).lastAutoTable.finalY + GAP_MM;
}
