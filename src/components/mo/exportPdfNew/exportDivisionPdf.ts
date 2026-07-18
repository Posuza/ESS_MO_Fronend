// ─── exportDivisionPdf ──────────────────────────────────────
// Native jsPDF export for a single Division (ภาค) report page.
// Uses jspdf-autotable for selectable-text tables in A4 portrait.
//
// ═══════════════════════════════════════════════════════════
// ARCHITECTURE
// ═══════════════════════════════════════════════════════════
//
//   item ──► buildGroup*() ──► PdfGroup[] ──► autoTable render
//
//   Step 1: Build groups from item data
//     • groupDefs (static groups 1-4)
//     • buildGroup2Disciplines(item) → dynamic group 5 (discipline)
//     • buildGroup3Projects(item)   → group 6 (projects)
//     • buildGroup4GuardMovements(item) → group 7 (guard movements)
//
//   Step 2: Render sector tables in 3-per-row grid
//     • Each table = one PdfGroup via autoTable
//     • Row height = max of 3 tables; whole row moves together
//
//   Step 3: Render project detail section (group 6)
//     • 4-row atomic blocks per project
//
//   Step 4: Render guard movement detail section (group 7)
//     • Same structure, plain status text
//
// ═══════════════════════════════════════════════════════════
// GROUP INDEX MAPPING
// ═══════════════════════════════════════════════════════════
//
//   1: หน่วยงานที่รับผิดชอบ      (groupDefs[0])
//   2: การลา                     (groupDefs[1])
//   3: การบริหารการครองเวร       (groupDefs[2])
//   4: อบรมและควบคุมหน้างาน     (groupDefs[3])
//   5: วินัยและการลงโทษ         (buildGroup2Disciplines)
//   6: เข้าพบผู้ว่าจ้าง           (buildGroup3Projects)
//   7: การเปลี่ยนแปลงจุดรักษาการณ์ (buildGroup4GuardMovements)
//
// ═══════════════════════════════════════════════════════════

import { jsPDF } from "jspdf";
import {
  groupDefs,
  buildGroup2Disciplines,
  buildGroup3Projects,
  buildGroup4GuardMovements,
} from "../PdfRender/division/DivisionGroups";
import type { PdfGroup, PdfGroupItem } from "./types";
import {
  MARGIN_MM,
  HEADER_HEIGHT_MM,
  GAP_MM,
  TABLES_PER_ROW,
} from "./pdfStyles";
import {
  tableHeightMm,
  registerSarabunFonts,
  drawPageHeader,
  drawPageFooter,
  startNewPage,
} from "./pdfHelpers";
import { renderGroupTable, preCalcGroupTableHeight } from "./divisionTableContent";
import { renderProjectAndMovementDetails } from "./divisionDetailContent";

// ── Public API ─────────────────────────────────────────────

const REPORT_TITLE = "รายงานประจำวันฝ่ายปฏิบัติการ (รายละเอียดภาค)";

/**
 * Build and return a jsPDF document for a single Division report.
 *
 * Flow:
 *   1. Create A4 portrait doc
 *   2. Register Sarabun fonts
 *   3. Build all groups from item data
 *   4. Render sector tables in 3-per-row grid
 *   5. Render project detail section (group 6)
 *   6. Render guard movement detail section (group 7)
 *   7. Add page numbers to all pages
 *   8. Return the doc
 */
export async function buildDivisionPdf(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any,
  sectorName: string,
): Promise<jsPDF> {
  // ── Create document: A4 portrait ──
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  await registerSarabunFonts(doc);

  const pageH = doc.internal.pageSize.getHeight();

  // ── Build groups from item data ──
  const group2Disciplines = buildGroup2Disciplines(item);
  const group3Projects = buildGroup3Projects(item);
  const group4GuardMovements = buildGroup4GuardMovements(item);

  // Combine into ordered array matching group index mapping
  const allGroups: PdfGroup[] = [
    ...groupDefs,
    ...group2Disciplines,
    ...(group3Projects.length > 0 ? [group3Projects[0]] : []),
    ...group4GuardMovements,
  ];

  // Track which keys belong to which dynamic group
  const group2Keys = group2Disciplines.map((g) => g.key);
  const group3Keys = group3Projects.map((g) => g.key);

  let pageNo = 1;

  // ── Render Table Pages (3 tables per row — CSS grid layout) ──
  const pageW = doc.internal.pageSize.getWidth();
  const availW = pageW - MARGIN_MM * 2;
  const tableW = (availW - (TABLES_PER_ROW - 1) * GAP_MM) / TABLES_PER_ROW;
  let y = HEADER_HEIGHT_MM;

  for (
    let rowStart = 0;
    rowStart < allGroups.length;
    rowStart += TABLES_PER_ROW
  ) {
    const rowGroups = allGroups.slice(rowStart, rowStart + TABLES_PER_ROW);

    // Estimate row height (tallest table in the row + gap)
    const rowEstHeight = Math.max(
      ...rowGroups.map((g) =>
        g.items.length > 0 ? tableHeightMm(g.items.length) + GAP_MM : 20,
      ),
    );

    // Page break if row won't fit
    if (y + rowEstHeight > pageH - MARGIN_MM && y > HEADER_HEIGHT_MM + 5) {
      doc.addPage();
      pageNo = doc.getNumberOfPages();
      y = HEADER_HEIGHT_MM;
    }

    // Draw header on first page or new page
    if (y === HEADER_HEIGHT_MM) {
      pageNo = doc.getNumberOfPages();
      await drawPageHeader(doc, sectorName, REPORT_TITLE, pageNo);
    }

    // Render all tables in this row side by side
    let rowMaxY = y;
    for (let col = 0; col < rowGroups.length; col++) {
      const group = rowGroups[col];
      const isDiscipline = group2Keys.includes(group.key);
      const isGroup3 = group3Keys.includes(group.key);
      const groupIdx = rowStart + col + 1;
      const marginLeft = MARGIN_MM + col * (tableW + GAP_MM);

      // Per-table page break check (accurate height with text wrapping)
      const tableEst =
        group.items.length > 0
          ? preCalcGroupTableHeight(doc, group, tableW, isDiscipline, isGroup3, item) + GAP_MM + 20
          : 28;
      if (y + tableEst > pageH - MARGIN_MM && y > HEADER_HEIGHT_MM + 5) {
        doc.addPage();
        pageNo = doc.getNumberOfPages();
        y = HEADER_HEIGHT_MM;
        rowMaxY = y;
      }
      if (y === HEADER_HEIGHT_MM) {
        pageNo = doc.getNumberOfPages();
        await drawPageHeader(doc, sectorName, REPORT_TITLE, pageNo);
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
        { sectorName, title: REPORT_TITLE },
        marginLeft,
        tableW,
      );
      rowMaxY = Math.max(rowMaxY, finalY);
    }
    y = rowMaxY;
  }

  // ── Render Project + Guard Movement Detail Pages (groups 6 & 7) ──
  // Rendered as ONE continuous flow — both sections on the same page(s)
  const projectItems: PdfGroupItem[] =
    group3Projects.length > 0 ? group3Projects[0].items : [];
  const guardItems: PdfGroupItem[] =
    group4GuardMovements.length > 0 ? group4GuardMovements[0].items : [];

  // Start on a fresh page for the detail section
  y = await startNewPage(doc, sectorName, REPORT_TITLE);
  y += 2;

  const result = await renderProjectAndMovementDetails(
    doc,
    projectItems,
    guardItems,
    y,
    { sectorName, title: REPORT_TITLE },
  );
  y = result.finalY;

  // ── Finalize: add page numbers to all pages ──
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawPageFooter(doc, p, totalPages);
  }

  return doc;
}

/** Build and immediately save/download a Division PDF */
export async function exportDivisionPdf(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any,
  sectorName: string,
  fileName: string = `Sector_Report_${item.id || "report"}.pdf`,
): Promise<void> {
  const doc = await buildDivisionPdf(item, sectorName);
  doc.save(fileName);
}
