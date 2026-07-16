// ─── exportSummarPdf ────────────────────────────────────────
// Native jsPDF export for the Summaries (รวมทุกภาค) report page.
// Uses jspdf-autotable for selectable-text tables in A4 portrait.
//
// ═══════════════════════════════════════════════════════════
// ARCHITECTURE
// ═══════════════════════════════════════════════════════════
//
//   item + reports ──► filter ──► SummaryColumn[] ──► chunkCols()
//                                                          │
//        ┌─────────────────────────────────────────────────┤
//        │                                                 │
//   Summary Grid (col chunks)                    Per-Division Detail
//   ──────────────────────                    ────────────────────
//   Groups: group1 (1-4)                      For each column:
//           dynamicGroup2 (5)                   • Division header
//           group3Static (6)                    • Sector tables (3/row)
//           group4Summary (7 disabled)          • Projects (4-row blocks)
//                                              • Guard movements
//        │                                                 │
//        └──────────────────┬──────────────────────────────┘
//                           ▼
//                    autoTable render
//
// ═══════════════════════════════════════════════════════════
// SUMMARY GRID — TABLES PER ROW
// ═══════════════════════════════════════════════════════════
//   cols.length >= 8 → 1 table per row, tableWidth = 190mm
//   cols.length >= 6 → 2 tables per row, tableWidth = 94mm
//   cols.length < 6  → 3 tables per row, tableWidth = 62mm
//
// ═══════════════════════════════════════════════════════════
// GROUP INDEX MAPPING (Summary Grid)
// ═══════════════════════════════════════════════════════════
//   1: หน่วยงานที่รับผิดชอบ       (group1[0] — dept)
//   2: การลา                      (group1[1] — leave)
//   3: การบริหารการควงเวร        (group1[2] — shift)
//   4: อบรมและควบคุมหน้างาน      (group1[3] — training)
//   5: วินัยและการลงโทษ          (dynamicGroup2[0] — discipline)
//   6: เข้าพบผู้ว่าจ้าง            (group3Static[0] — meeting, isGroup3)
//   7: การเปลี่ยนแปลงจุดรักษาการณ์ (disabled — will use later)
//

import { jsPDF } from "jspdf";
import {
  groupDefs,
  buildGroup2Disciplines,
  buildGroup3Projects,
} from "../PdfRender/division/DivisionGroups";
import {
  group1,
  buildGroup2ForSummary,
  group3Static,
  // buildGroup4ForSummary, // DISABLED — will use later
  // buildGroup4GuardMovements as buildSummaryGroup4, // DISABLED — will use later
} from "../PdfRender/summaries/summaryGroups";
import {
  getCols,
  chunkCols,
} from "../PdfRender/summaries/summaryHelpers";
import type { PdfGroup, PdfGroupItem } from "./types";
import {
  MARGIN_MM,
  HEADER_HEIGHT_MM,
  GAP_MM,
  TABLES_PER_ROW,
} from "./pdfStyles";
import {
  registerSarabunFonts,
  drawPageHeader,
  drawPageFooter,
  startNewPage,
} from "./pdfHelpers";
import { renderGroupTable, preCalcGroupTableHeight } from "./divisionTableContent";
import { renderProjectAndMovementDetails } from "./divisionDetailContent";
import { renderSummaryTable, summaryTableHeightMm } from "./summaryTableContent";

// ── Summary-Specific Helpers ──────────────────────────────

/**
 * How many tables fit per grid row based on sub-location column count.
 * More columns = wider table = fewer per row.
 */
function getTablesPerRow(colCount: number): number {
  return colCount >= 8 ? 1 : colCount >= 6 ? 2 : 3;
}

// ─── Main Builder ───────────────────────────────────────────

/** Build and return a jsPDF document for the Summaries report */
export async function buildSummariesPdf(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any,
  sectorName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reports: any[] = [],
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  await registerSarabunFonts(doc);

  const pageH = doc.internal.pageSize.getHeight();
  const TITLE = "รายงานประจำวันฝ่ายปฏิบัติการ";

  // ── 1. Filter reports ────────────────────────────────────
  const selectedSector = item.department_id ?? 1;
  const selectedReportDate =
    item.report_date ?? (item.created_at ? item.created_at.slice(0, 10) : "");

  const summaryReports = (reports || []).filter((r: Record<string, unknown>) => {
    const deptMatch = Number(r.department_id) === Number(selectedSector);
    const rd = r.report_date
      ? String(r.report_date)
      : r.created_at
        ? String(r.created_at).slice(0, 10)
        : "";
    const dateMatch = !selectedReportDate || rd === selectedReportDate;
    const statusMatch = r.approved_status === "APPROVED";
    return deptMatch && dateMatch && statusMatch;
  });

  const allCols = getCols(summaryReports, item);
  const colChunks = chunkCols(allCols);

  // ── 2. Render summary grid + per-division details ────────
  for (let chunkIdx = 0; chunkIdx < colChunks.length; chunkIdx++) {
    const cols = colChunks[chunkIdx];
    if (!cols || cols.length === 0) continue;

    let y: number;

    // ── Start a new page for each chunk ────────────────────
    if (chunkIdx === 0) {
      const pageNo = doc.getNumberOfPages();
      await drawPageHeader(doc, sectorName, TITLE, pageNo);
      y = HEADER_HEIGHT_MM;
    } else {
      y = await startNewPage(doc, sectorName, TITLE);
    }

    // ── Summary Grid Tables ────────────────────────────────
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
      // { g: group4Summary, index: 7, isGroup3: false }, // DISABLED — will use later
    ];

    const tablesPerRow = getTablesPerRow(cols.length);
    const sAvailW = doc.internal.pageSize.getWidth() - MARGIN_MM * 2;
    const summaryTableW = (sAvailW - (tablesPerRow - 1) * GAP_MM) / tablesPerRow;

    for (
      let rowStart = 0;
      rowStart < allSummaryGroups.length;
      rowStart += tablesPerRow
    ) {
      const rowGroups = allSummaryGroups.slice(rowStart, rowStart + tablesPerRow);
      const rowEstHeight = Math.max(
        ...rowGroups.map(({ g }) =>
          g.items.length > 0 ? summaryTableHeightMm(g.items.length) + GAP_MM : 20,
        ),
      );

      if (y + rowEstHeight > pageH - MARGIN_MM) {
        y = await startNewPage(doc, sectorName, TITLE);
      }

      let rowMaxY = y;
      for (let col = 0; col < rowGroups.length; col++) {
        const { g, index, isGroup3 } = rowGroups[col];
        const marginLeft = MARGIN_MM + col * (summaryTableW + GAP_MM);

        const tableEst = g.items.length > 0
          ? summaryTableHeightMm(g.items.length) + GAP_MM + 20
          : 28;
        if (y + tableEst > pageH - MARGIN_MM && y > HEADER_HEIGHT_MM + 5) {
          y = await startNewPage(doc, sectorName, TITLE);
          rowMaxY = y;
        }

        const finalY = await renderSummaryTable(
          doc, g, cols, index, isGroup3, y, item, 0,
          { sectorName, title: TITLE },
          marginLeft, summaryTableW,
        );
        rowMaxY = Math.max(rowMaxY, finalY);
      }
      y = rowMaxY;
    }

    // ── Per-Division Detail Pages ─────────────────────────
    for (const col of cols) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const colReport = (col as any).report as Record<string, any>;

      const detailGroup2 = buildGroup2Disciplines(colReport);
      // const detailGroup4 = buildSummaryGroup4(colReport); // DISABLED — will use later

      const detailGroup3 = buildGroup3Projects(colReport);

      // NOTE: detailGroups includes compact grid-table groups for dept,
      // leave, shift, training, discipline, projects (group 6), and
      // guard movements (group 7). Projects and guard movements are also
      // rendered as detail items below (4-row blocks).
      const detailGroups: PdfGroup[] = [
        ...groupDefs,
        ...detailGroup2,
        ...detailGroup3,
        // detailGroup4, // DISABLED — will use later
      ];

      const group2Keys = detailGroup2.map((g) => g.key);
      const group3Keys = detailGroup3.map((g) => g.key);

      // Start new page for this division
      y = await startNewPage(doc, sectorName, TITLE, col.division);

      // Render detail tables in 3-per-row grid
      const detailAvailW = doc.internal.pageSize.getWidth() - MARGIN_MM * 2;
      const detailTableW = (detailAvailW - (TABLES_PER_ROW - 1) * GAP_MM) / TABLES_PER_ROW;

      for (
        let rowStart = 0;
        rowStart < detailGroups.length;
        rowStart += TABLES_PER_ROW
      ) {
        const rowGroups = detailGroups.slice(rowStart, rowStart + TABLES_PER_ROW);
        const rowEstHeight = Math.max(
          ...rowGroups.map((g) => {
            const isDisc = group2Keys.includes(g.key);
            const isG3 = group3Keys.includes(g.key);
            return g.items.length > 0
              ? preCalcGroupTableHeight(doc, g, detailTableW, isDisc, isG3, colReport) + GAP_MM
              : 20;
          }),
        );

        if (y + rowEstHeight > pageH - MARGIN_MM && y > HEADER_HEIGHT_MM + 5) {
          y = await startNewPage(doc, sectorName, TITLE, col.division);
        }

        let rowMaxY = y;
        for (let colIdx = 0; colIdx < rowGroups.length; colIdx++) {
          const g = rowGroups[colIdx];
          const isDiscipline = group2Keys.includes(g.key);
          const isGroup3 = group3Keys.includes(g.key);
          const groupIdx = rowStart + colIdx + 1;
          const marginLeft = MARGIN_MM + colIdx * (detailTableW + GAP_MM);

          const tableEst = g.items.length > 0
            ? preCalcGroupTableHeight(doc, g, detailTableW, isDiscipline, isGroup3, colReport) + GAP_MM + 20
            : 28;
          if (y + tableEst > pageH - MARGIN_MM && y > HEADER_HEIGHT_MM + 5) {
            y = await startNewPage(doc, sectorName, TITLE, col.division);
            rowMaxY = y;
          }

          const finalY = await renderGroupTable(
            doc, g, groupIdx, colReport, y, isDiscipline, isGroup3, 0,
            { sectorName, title: TITLE, division: col.division },
            marginLeft, detailTableW,
          );
          rowMaxY = Math.max(rowMaxY, finalY);
        }
        y = rowMaxY;
      }

      // ── Project + Guard Movement Details (combined flow) ──
      const rawProjectItems: PdfGroupItem[] = (colReport.projects || []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) => ({
          key: p.id ?? p.key ?? String(Math.random()),
          label: p.project_name ?? p.name ?? "-",
          detail: p.detail ?? "",
          status: p.status ?? "warning",
          note: p.note ?? "",
        }),
      );
      // const guardItems: PdfGroupItem[] = detailGroup4.items; // DISABLED — will use later

      // Start a new page for detail sections (keep separate from division tables)
      y = await startNewPage(doc, sectorName, TITLE, col.division);
      y += 2;

      // Render projects (6) and guard movements (7) in ONE continuous flow
      const result = await renderProjectAndMovementDetails(
        doc,
        rawProjectItems,
        [], // guardItems disabled — will use later
        y,
        { sectorName, title: TITLE, division: col.division },
      );
      y = result.finalY;
    }
  }

  // ── Finalize: add page footers to all pages ────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawPageFooter(doc, p, totalPages);
  }

  return doc;
}

/** Build and immediately save/download the Summaries PDF */
export async function exportSummariesPdf(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any,
  sectorName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reports: any[] = [],
  fileName: string = `MO_Report_${item.id || "report"}.pdf`,
): Promise<void> {
  const doc = await buildSummariesPdf(item, sectorName, reports);
  doc.save(fileName);
}
