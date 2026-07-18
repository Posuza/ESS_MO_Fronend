// ─────────────────────────────────────────────────────────────
// Sector PDF — Page Assembler
//
// WHAT BELONGS HERE:
//   - Pagination logic (how many tables fit per page)
//   - Assembling <div className="pdf-page"> elements
//
// WHAT DOES NOT BELONG HERE:
//   - Table data/config → see sectorGroups.ts
//   - Table rendering JSX → see SectorTableContent.tsx
//   - Project detail rendering → see SectorDetailContent.tsx
// ─────────────────────────────────────────────────────────────

import { useMemo, type JSX } from "react";
import {
  PDF,
  divisionBodyRowCapacity,
  divisionTableFitHeight,
  groupGridHeight,
  paginateDetailSections,
  projectBlockHeight,
  splitDivisionGroupItems,
  type PdfGroup,
  type PdfGroupItem,
  type DetailSection,
} from "../shared/PaginationSystem";
import {
  PdfPageHeader,
  PdfPageFooter,
  TotalPagesContext,
} from "../shared/PdfPageLayout";
import DivisionTableContent from "./DivisionTableContent";
import DivisionDetailContent from "./DivisionDetailContent";
import {
  groupDefs,
  buildGroup2Disciplines,
  buildGroup3Projects,
  buildGroup4GuardMovements,
} from "./DivisionGroups";
import "./DivisionPdf.module.css";

type Props = {
  item: any;
  sectorName: string;
  pageNumStart?: number;
};

export default function DivisionPdf({
  item,
  sectorName,
  pageNumStart = 1,
}: Props) {
  const data = item;
  // Detail pages: section headers are already accounted for
  // inside paginateDetailSections, so use AVAILABLE_H directly.

  // ─── Build groups from data ──────────────────────────────
  const group2Disciplines = useMemo(() => buildGroup2Disciplines(data), [data]);
  const group3Projects = useMemo(() => buildGroup3Projects(data), [data]);
  const group4GuardMovements = useMemo(
    () => buildGroup4GuardMovements(data),
    [data],
  );

  // ─── Page type 1: Table grids ───────────────────────────
  const renderPaginatedTables = (startPageNum: number) => {
    const pages: JSX.Element[] = [];
    let pageNum = startPageNum;

    const allGroups: PdfGroup[] = [
      ...groupDefs,
      ...group2Disciplines,
      ...(group3Projects.length > 0 ? [group3Projects[0]] : []),
      ...group4GuardMovements,
    ];

    // SectorTableContent always uses grid-column: span 2 → 3 tables per row
    const TABLES_PER_GRID_ROW = 3;
    const gridRows: PdfGroup[][] = [];
    for (let i = 0; i < allGroups.length; i += TABLES_PER_GRID_ROW) {
      gridRows.push(allGroups.slice(i, i + TABLES_PER_GRID_ROW));
    }

    let pageGroups: PdfGroup[] = [];
    let usedHeight = 0;
    const tableFitHeight = divisionTableFitHeight(PDF.AVAILABLE_H);
    const maxDivisionBodyRowsPerPage = divisionBodyRowCapacity(PDF.AVAILABLE_H);

    const flushPage = () => {
      if (pageGroups.length === 0) return;
      pages.push(
        <div key={`sector-table-page-${pageNum}`} className="pdf-page">
          <PdfPageHeader
            pageNo={pageNum}
            sectorName={sectorName}
            title="รายงานประจำวันฝ่ายปฏิบัติการ (รายละเอียดภาค)"
            data={data}
          />
          <DivisionTableContent item={data} groups={pageGroups} />
          <PdfPageFooter pageNo={pageNum} />
        </div>,
      );
      pageNum++;
      pageGroups = [];
      usedHeight = 0;
    };

    const splitOversizedDivisionRow = (gridRow: PdfGroup[]): PdfGroup[][] => {
      const rows: PdfGroup[][] = [];
      let remaining = gridRow;

      while (remaining.length > 0) {
        const currentRow: PdfGroup[] = [];
        const nextRow: PdfGroup[] = [];

        for (const group of remaining) {
          if (
            groupGridHeight(group) <= tableFitHeight ||
            group.items.length === 0
          ) {
            currentRow.push(group);
            continue;
          }

          let rowsToRender = maxDivisionBodyRowsPerPage;
          let split = splitDivisionGroupItems(group, rowsToRender);
          while (
            groupGridHeight(split.rendered) > tableFitHeight &&
            rowsToRender > 1
          ) {
            rowsToRender--;
            split = splitDivisionGroupItems(group, rowsToRender);
          }
          const { rendered, overflow } = split;
          currentRow.push(rendered);
          if (overflow) nextRow.push(overflow);
        }

        rows.push(currentRow);
        remaining = nextRow;
      }

      return rows;
    };

    for (const gridRow of gridRows.flatMap(splitOversizedDivisionRow)) {
      // Use groupGridHeight for accurate height per group (handles aggregation)
      const gridRowHeight =
        Math.max(...gridRow.map((g) => groupGridHeight(g))) + PDF.GAP;

      if (
        usedHeight + gridRowHeight > tableFitHeight &&
        pageGroups.length > 0
      ) {
        flushPage();
      }
      for (const group of gridRow) pageGroups.push(group);
      usedHeight += gridRowHeight;
    }

    flushPage();
    return { pages, nextPageNum: pageNum };
  };

  // ─── Detail pages: Projects (group 6) + Guard movements (group 7) ──
  // Mirrors exportPdfNew's _renderCombinedSections:
  //   - Sections flow sequentially on same page
  //   - Section headers drawn on page transitions
  //   - Items are atomic (never split across pages)
  const renderPaginatedDetails = (startPageNum: number) => {
    const pages: JSX.Element[] = [];
    let pageNum = startPageNum;

    const projects: PdfGroupItem[] =
      group3Projects.length > 0 ? group3Projects[0].items : [];
    const movements: PdfGroupItem[] =
      group4GuardMovements.length > 0 ? group4GuardMovements[0].items : [];

    // Build sections in order: project (6) first, then guard movements (7)
    const sections: DetailSection[] = [
      {
        groupIndex: 6,
        title: "เข้าพบผู้ว่าจ้าง",
        emptyText: "ยังไม่มีข้อมูลโครงการ",
        items: projects,
      },
      {
        groupIndex: 7,
        title: "การเปลี่ยนแปลงจุดรักษาการณ์",
        emptyText: "ยังไม่มีข้อมูลการเปลี่ยนแปลงจุดรักษาการณ์",
        items: movements,
      },
    ];

    // Paginate — section headers are accounted for in the paginator
    const detailChunks = paginateDetailSections(
      sections,
      PDF.AVAILABLE_H,
      projectBlockHeight,
    );

    if (detailChunks.length === 0) {
      // Both empty — show empty state page
      pages.push(
        <div key={`sector-detail-page-${pageNum}`} className="pdf-page">
          <PdfPageHeader
            pageNo={pageNum}
            sectorName={sectorName}
            title="รายงานประจำวันฝ่ายปฏิบัติการ (รายละเอียดภาค)"
            data={data}
          />
          <DivisionDetailContent item={data} projects={[]} movements={[]} renderProjects renderMovements />
          <PdfPageFooter pageNo={pageNum} />
        </div>,
      );
      pageNum++;
    } else {
      detailChunks.forEach((chunk) => {
        pages.push(
          <div key={`sector-detail-page-${pageNum}`} className="pdf-page">
            <PdfPageHeader
              pageNo={pageNum}
              sectorName={sectorName}
              title="รายงานประจำวันฝ่ายปฏิบัติการ (รายละเอียดภาค)"
              data={data}
            />
            <DivisionDetailContent
              item={data}
              projects={chunk.projects}
              movements={chunk.movements}
              projectOffset={chunk.projectOffset}
              movementOffset={chunk.movementOffset}
              renderProjects={chunk.renderProjects}
              renderMovements={chunk.renderMovements}
            />
            <PdfPageFooter pageNo={pageNum} />
          </div>,
        );
        pageNum++;
      });
    }

    return { pages, nextPageNum: pageNum };
  };

  // ─── Assemble all pages ──────────────────────────────────
  const { pages: tablePages, nextPageNum: afterTable } =
    renderPaginatedTables(pageNumStart);
  const { pages: detailPages } = renderPaginatedDetails(afterTable);
  const totalPages = tablePages.length + detailPages.length;

  return (
    <TotalPagesContext.Provider value={totalPages}>
      {tablePages}
      {detailPages}
    </TotalPagesContext.Provider>
  );
}
