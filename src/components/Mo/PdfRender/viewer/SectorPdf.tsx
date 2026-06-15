import { useMemo } from "react";
import {
  PDF,
  tableHeight,
  paginateWithGroupSplit,
  type PdfGroup,
  type PdfGroupItem,
} from "../utils/PaginationSystem";
import SectorContent, {
  PdfPageHeader,
  groupDefs,
  buildGroup2Disciplines,
  buildGroup3Projects,
} from "../contents/sectorContent";
import SecotorDetialContent from "../contents/secotorDetailContent";
import "./SectorPdf.css";

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

  // ─── Build groups from shared content definitions ────────
  const group2Disciplines = useMemo(() => buildGroup2Disciplines(data), [data]);
  const group3Projects = useMemo(() => buildGroup3Projects(data), [data]);

  // ─── Paginated Tables (page=1) ──────────────────────────
  const renderPaginatedTables = (startPageNum: number) => {
    const pages: JSX.Element[] = [];
    let pageNum = startPageNum;

    const allGroups: PdfGroup[] = [
      ...groupDefs,
      ...group2Disciplines,
      ...(group3Projects.length > 0 ? [group3Projects[0]] : []),
    ];

    // SectorContent always uses grid-column: span 2 → 3 tables per row
    const TABLES_PER_GRID_ROW = 3;

    // ─── Group tables into grid rows ──────────────────────────
    // In the CSS grid (repeat(6,1fr), each table spans 2), all tables
    // in a row share the row height of the tallest table.
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
          <SectorContent item={data} groups={pageGroups} />
        </div>,
      );
      pageNum++;
      pageGroups = [];
      usedHeight = 0;
    };

    // ─── Paginate by grid rows ─────────────────────────────
    for (const gridRow of gridRows) {
      const maxItemsInRow = Math.max(...gridRow.map((g) => g.items.length));
      const gridRowHeight = tableHeight(maxItemsInRow) + PDF.GAP;

      if (
        usedHeight + gridRowHeight > DETAILED_AVAILABLE_H &&
        pageGroups.length > 0
      ) {
        flushPage();
      }

      for (const group of gridRow) {
        pageGroups.push(group);
      }
      usedHeight += gridRowHeight;
    }

    flushPage();
    return { pages, nextPageNum: pageNum };
  };

  // ─── Paginated Project Details (page=2) ─────────────────
  const renderPaginatedProjects = (startPageNum: number) => {
    const pages: JSX.Element[] = [];
    let pageNum = startPageNum;

    const projects: PdfGroupItem[] =
      group3Projects.length > 0 ? group3Projects[0].items : [];

    if (projects.length === 0) {
      // Render page with empty-state table
      pages.push(
        <div key={`sector-project-page-${pageNum}`} className="pdf-page">
          <PdfPageHeader
            pageNo={pageNum}
            sectorName={sectorName}
            title="รายงานประจำวันฝ่ายปฏิบัติการ (รายละเอียดภาค)"
            data={data}
          />
          <SecotorDetialContent item={{ ...data, projects: [] }} />
        </div>,
      );
      pageNum++;
    } else {
      // Split projects across pages using paginateWithGroupSplit
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
            <SecotorDetialContent item={{ ...data, projects: chunkItems }} />
          </div>,
        );
        pageNum++;
      });
    }

    return pages;
  };

  // ─── Render all pages ───────────────────────────────────
  const { pages: tablePages, nextPageNum } =
    renderPaginatedTables(pageNumStart);
  const projectPages = renderPaginatedProjects(nextPageNum);

  return (
    <>
      {tablePages}
      {projectPages}
    </>
  );
}
