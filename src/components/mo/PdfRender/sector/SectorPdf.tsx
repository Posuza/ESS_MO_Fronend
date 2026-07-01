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
  tableHeight,
  paginateWithGroupSplit,
  type PdfGroup,
  type PdfGroupItem,
} from "../shared/PaginationSystem";
import {
  PdfPageHeader,
  PdfPageFooter,
  TotalPagesContext,
} from "../shared/PdfPageLayout";
import SectorTableContent from "./SectorTableContent";
import SectorDetailContent from "./SectorDetailContent";
import {
  groupDefs,
  buildGroup2Disciplines,
  buildGroup3Projects,
} from "./sectorGroups";
import "./SectorPdf.module.css";

type Props = {
  item: any;
  sectorName: string;
  pageNumStart?: number;
};

export default function SectorPdf({
  item,
  sectorName,
  pageNumStart = 1,
}: Props) {
  const data = item;
  const DETAILED_AVAILABLE_H = PDF.AVAILABLE_H - 35;

  // ─── Build groups from data ──────────────────────────────
  const group2Disciplines = useMemo(() => buildGroup2Disciplines(data), [data]);
  const group3Projects = useMemo(() => buildGroup3Projects(data), [data]);

  // ─── Page type 1: Table grids ───────────────────────────
  const renderPaginatedTables = (startPageNum: number) => {
    const pages: JSX.Element[] = [];
    let pageNum = startPageNum;

    const allGroups: PdfGroup[] = [
      ...groupDefs,
      ...group2Disciplines,
      ...(group3Projects.length > 0 ? [group3Projects[0]] : []),
    ];

    // SectorTableContent always uses grid-column: span 2 → 3 tables per row
    const TABLES_PER_GRID_ROW = 3;
    const gridRows: PdfGroup[][] = [];
    for (let i = 0; i < allGroups.length; i += TABLES_PER_GRID_ROW) {
      gridRows.push(allGroups.slice(i, i + TABLES_PER_GRID_ROW));
    }

    let pageGroups: PdfGroup[] = [];
    let usedHeight = 0;

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
          <SectorTableContent item={data} groups={pageGroups} />
          <PdfPageFooter pageNo={pageNum} />
        </div>,
      );
      pageNum++;
      pageGroups = [];
      usedHeight = 0;
    };

    for (const gridRow of gridRows) {
      const maxItemsInRow = Math.max(...gridRow.map((g) => g.items.length));
      const gridRowHeight = tableHeight(maxItemsInRow) + PDF.GAP;

      if (
        usedHeight + gridRowHeight > DETAILED_AVAILABLE_H &&
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

  // ─── Page type 2: Project detail blocks ─────────────────
  const renderPaginatedProjects = (startPageNum: number) => {
    const pages: JSX.Element[] = [];
    let pageNum = startPageNum;

    const projects: PdfGroupItem[] =
      group3Projects.length > 0 ? group3Projects[0].items : [];

    if (projects.length === 0) {
      pages.push(
        <div key={`sector-project-page-${pageNum}`} className="pdf-page">
          <PdfPageHeader
            pageNo={pageNum}
            sectorName={sectorName}
            title="รายงานประจำวันฝ่ายปฏิบัติการ (รายละเอียดภาค)"
            data={data}
          />
          <SectorDetailContent item={{ ...data, projects: [] }} />
          <PdfPageFooter pageNo={pageNum} />
        </div>,
      );
      pageNum++;
    } else {
      const projectGroup: PdfGroup = {
        key: "meeting",
        title: "เข้าพบผู้ว่าจ้าง",
        items: projects,
      };
      const chunks = paginateWithGroupSplit(
        [projectGroup],
        DETAILED_AVAILABLE_H,
        10,
      );
      chunks.forEach((chunk) => {
        const chunkItems = chunk.flatMap((g) => g.items);
        pages.push(
          <div key={`sector-project-page-${pageNum}`} className="pdf-page">
            <PdfPageHeader
              pageNo={pageNum}
              sectorName={sectorName}
              title="รายงานประจำวันฝ่ายปฏิบัติการ (รายละเอียดภาค)"
              data={data}
            />
            <SectorDetailContent item={{ ...data, projects: chunkItems }} />
            <PdfPageFooter pageNo={pageNum} />
          </div>,
        );
        pageNum++;
      });
    }

    return pages;
  };

  // ─── Assemble all pages ──────────────────────────────────
  const { pages: tablePages, nextPageNum } =
    renderPaginatedTables(pageNumStart);
  const projectPages = renderPaginatedProjects(nextPageNum);
  const totalPages = tablePages.length + projectPages.length;

  return (
    <TotalPagesContext.Provider value={totalPages}>
      {tablePages}
      {projectPages}
    </TotalPagesContext.Provider>
  );
}
