// ─────────────────────────────────────────────────────────────
// Summaries PDF — Page Assembler
//
// WHAT BELONGS HERE:
//   - Grid layout configuration & pagination logic for summaries
//   - Assembling <div className="pdf-page"> elements
//
// WHAT DOES NOT BELONG HERE:
//   - Table data/config → see summaryGroups.ts
//   - Helpers & value functions → see summaryHelpers.ts
//   - Table rendering JSX → see SummaryTableContent.tsx
// ─────────────────────────────────────────────────────────────

import { useMemo, type JSX } from "react";
import {
  PDF,
  divisionBodyRowCapacity,
  divisionTableFitHeight,
  summaryTableBodyRowCapacity,
  summaryGridHeight,
  groupGridHeight,
  paginateDetailSections,
  projectBlockHeight,
  getTablesPerRow,
  splitDivisionGroupItems,
  splitGroupItems,
  type PdfGroup,
  type PdfGroupItem,
  type DetailSection,
} from "../shared/PaginationSystem";
import {
  group1,
  buildGroup2ForSummary,
  group3Static,
  buildGroup4ForSummary,
  buildGroup4GuardMovements,
} from "./summaryGroups";
import { buildGroup2Disciplines } from "../division/DivisionGroups";
import {
  projectStatusCount,
  guardMovementStatusCount,
  itemValueFn,
  getCols,
  chunkCols,
  SUMMARY_STYLES,
} from "./summaryHelpers";
import { renderSingleGroup } from "./SummaryTableContent";
import {
  PdfPageHeader,
  PdfPageFooter,
  TotalPagesContext,
} from "../shared/PdfPageLayout";
import SectorTableContent from "../division/DivisionTableContent";
import DivisionDetailContent from "../division/DivisionDetailContent";
import "./SummeriesPdf.module.css";

type Props = {
  item: any;
  sectorName: string;
  reports?: any[];
  pageNumStart?: number;
};

export default function SummeriesPdf({
  item,
  sectorName,
  reports = [],
  pageNumStart = 1,
}: Props) {
  const data = item;
  const selectedSector = (data as any).department_id ?? 1;
  const selectedReportDate =
    data.report_date ?? (data.created_at ? data.created_at.slice(0, 10) : "");

  const summaryReports = useMemo(() => {
    const byDepartment = (reports || []).filter(
      (r: any) => Number(r.department_id) === Number(selectedSector),
    );
    const byDateAndStatus = byDepartment.filter((r: any) => {
      const rd =
        r.report_date ?? (r.created_at ? r.created_at.slice(0, 10) : "");
      const dateMatch = !selectedReportDate || rd === selectedReportDate;
      const statusMatch = r.approved_status === "APPROVED";
      return dateMatch && statusMatch;
    });
    return byDateAndStatus;
  }, [reports, selectedSector, selectedReportDate]);

  // ─── Summary Pages with Intelligent Grid ────────────────
  const renderSummaryPages = (startPageNum: number) => {
    const allCols = getCols(summaryReports, data);
    const colChunks = chunkCols(allCols);
    const pages: JSX.Element[] = [];
    let pageNum = startPageNum;

    type GroupInfo = {
      g: PdfGroup;
      index: number;
      isRed: boolean;
      isGroup3: boolean;
    };

    const dynamicGroup2 = buildGroup2ForSummary(summaryReports);
    const dynamicGroup4 = buildGroup4ForSummary(summaryReports);
    const allGroups: GroupInfo[] = [
      ...group1.map((g, i) => ({
        g,
        index: i + 1,
        isRed: false,
        isGroup3: false,
      })),
      ...dynamicGroup2.map((g, i) => ({
        g,
        index: group1.length + i + 1,
        isRed: false,
        isGroup3: false,
      })),
      ...group3Static.map((g) => ({
        g,
        index: 6,
        isRed: false,
        isGroup3: true,
      })),
      {
        g: dynamicGroup4,
        index: 7,
        isRed: false,
        isGroup3: false,
      },
    ];

    for (const cols of colChunks) {
      const workQueue: GroupInfo[] = allGroups.map((g) => ({
        ...g,
        g: { ...g.g },
      }));

      // ─── Group tables into grid rows ──────────────────────────
      // In the CSS grid, tables in the same row share the row height
      // (determined by the tallest table). So we must paginate by
      // complete grid rows, not individual tables.
      const tablesPerRow = getTablesPerRow(cols.length);
      const gridRows: GroupInfo[][] = [];
      for (let i = 0; i < workQueue.length; i += tablesPerRow) {
        gridRows.push(workQueue.slice(i, i + tablesPerRow));
      }

      let pageGroups: GroupInfo[] = [];
      let usedHeight = 0;
      const maxSummaryBodyRowsPerPage = summaryTableBodyRowCapacity(
        PDF.AVAILABLE_H,
      );

      const flushPage = () => {
        if (pageGroups.length === 0) return;
        pages.push(
          <div key={`summary-page-${pageNum}`} className="pdf-page">
            <PdfPageHeader
              pageNo={pageNum}
              sectorName={sectorName}
              title="รายงานประจำวันฝ่ายปฏิบัติการ"
              data={data}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: "6px",
                width: "100%",
                boxSizing: "border-box",
                alignItems: "start",
              }}
            >
              {pageGroups.map((slot) =>
                renderSingleGroup(
                  slot.g,
                  cols,
                  slot.index,
                  slot.isRed,
                  slot.isGroup3,
                  SUMMARY_STYLES,
                  projectStatusCount,
                  itemValueFn,
                  guardMovementStatusCount,
                  slot.g._itemOffset ?? 0,
                ),
              )}
            </div>
            <PdfPageFooter pageNo={pageNum} />
          </div>,
        );
        pageNum++;
        pageGroups = [];
        usedHeight = 0;
      };

      const splitOversizedSummaryRow = (gridRow: GroupInfo[]): GroupInfo[][] => {
        const rows: GroupInfo[][] = [];
        let remaining = gridRow;

        while (remaining.length > 0) {
          const currentRow: GroupInfo[] = [];
          const nextRow: GroupInfo[] = [];

          for (const slot of remaining) {
            if (
              summaryGridHeight(slot.g, cols.length) <= PDF.AVAILABLE_H ||
              slot.g.items.length === 0
            ) {
              currentRow.push(slot);
              continue;
            }

            const { rendered, overflow } = splitGroupItems(
              slot.g,
              maxSummaryBodyRowsPerPage,
            );
            currentRow.push({ ...slot, g: rendered });
            if (overflow) nextRow.push({ ...slot, g: overflow });
          }

          rows.push(currentRow);
          remaining = nextRow;
        }

        return rows;
      };

      // ─── Paginate by grid rows ─────────────────────────────
      for (const gridRow of gridRows.flatMap(splitOversizedSummaryRow)) {
        // Grid row height is determined by the tallest table in the row
        // (CSS grid forces all items in a row to share the same row height)
        const gridRowHeight =
          Math.max(...gridRow.map((item) => summaryGridHeight(item.g, cols.length))) +
          PDF.GAP;

        // If this grid row doesn't fit on the current page, flush to a new page
        if (
          usedHeight + gridRowHeight > PDF.AVAILABLE_H &&
          pageGroups.length > 0
        ) {
          flushPage();
        }

        // Add all tables in this grid row to the current page
        for (const item of gridRow) {
          pageGroups.push(item);
        }
        usedHeight += gridRowHeight;
      }

      flushPage();
    }

    return { pages, nextPageNum: pageNum };
  };

  // ─── Detailed Report Pages ──────────────────────────────
  const renderDetailedReportPages = (startPageNum: number) => {
    const allCols = getCols(summaryReports, data);
    const detailPages: JSX.Element[] = [];
    let pageNum = startPageNum;

    allCols.forEach((col) => {
      // ── Build dynamic group3 from this column's actual projects ──
      const employerItems = [
        {
          key: "employer_number_count",
          label: "เข้าพบผู้ว่าจ้าง",
          unit: "หน่วยงาน",
        },
        {
          key: "employer_problem_count",
          label: "พบปัญหา",
          unit: "หน่วยงาน",
        },
      ];
      const projectItems = (col.report.projects || []).map((p: any) => ({
        key: p.id ?? p.name ?? String(Math.random()),
        label: p.project_name ?? p.name ?? "-",
        status: p.status ?? "warning",
        unit: "หน่วยงาน",
      }));
      const dynamicGroup3: PdfGroup = {
        key: "meeting",
        title: "เข้าพบผู้ว่าจ้าง",
        items: [...employerItems, ...projectItems],
      };
      const dynamicGroup4 = buildGroup4GuardMovements(col.report);
      const dynamicGroup2 = buildGroup2Disciplines(col.report);
      const colDetailPdfGroups: PdfGroup[] = [
        ...group1,
        ...dynamicGroup2,
        dynamicGroup3,
        dynamicGroup4,
      ];

      // Page type 1: tables (grid-row-aware: SectorTableContent uses 3 per row)
      const TABLES_PER_GRID_ROW = 3;
      const detailGridRows: PdfGroup[][] = [];
      for (let i = 0; i < colDetailPdfGroups.length; i += TABLES_PER_GRID_ROW) {
        detailGridRows.push(
          colDetailPdfGroups.slice(i, i + TABLES_PER_GRID_ROW),
        );
      }

      let detailPageGroups: PdfGroup[] = [];
      let detailUsedHeight = 0;
      const detailTableFitHeight = divisionTableFitHeight(PDF.AVAILABLE_H);
      const maxDetailBodyRowsPerPage =
        divisionBodyRowCapacity(PDF.AVAILABLE_H);

      const flushDetailPage = () => {
        if (detailPageGroups.length === 0) return;
        detailPages.push(
          <div key={`detail-v-page-${col.id}-${pageNum}`} className="pdf-page">
            <PdfPageHeader
              pageNo={pageNum}
              sectorName={sectorName}
              title="รายงานประจำวันฝ่ายปฏิบัติการ"
              data={data}
              division={col.division}
            />
            <SectorTableContent item={col.report} groups={detailPageGroups} />
            <PdfPageFooter pageNo={pageNum} />
          </div>,
        );
        pageNum++;
        detailPageGroups = [];
        detailUsedHeight = 0;
      };

      const splitOversizedDetailRow = (gridRow: PdfGroup[]): PdfGroup[][] => {
        const rows: PdfGroup[][] = [];
        let remaining = gridRow;

        while (remaining.length > 0) {
          const currentRow: PdfGroup[] = [];
          const nextRow: PdfGroup[] = [];

          for (const group of remaining) {
            if (groupGridHeight(group) <= detailTableFitHeight || group.items.length === 0) {
              currentRow.push(group);
              continue;
            }

            let rowsToRender = maxDetailBodyRowsPerPage;
            let split = splitDivisionGroupItems(group, rowsToRender);
            while (
              groupGridHeight(split.rendered) > detailTableFitHeight &&
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

      for (const gridRow of detailGridRows.flatMap(splitOversizedDetailRow)) {
        const gridRowHeight =
          Math.max(...gridRow.map((g) => groupGridHeight(g))) + PDF.GAP;

        if (
          detailUsedHeight + gridRowHeight > detailTableFitHeight &&
          detailPageGroups.length > 0
        ) {
          flushDetailPage();
        }

        for (const group of gridRow) {
          detailPageGroups.push(group);
        }
        detailUsedHeight += gridRowHeight;
      }

      flushDetailPage();

      // Detail pages: Projects (group 6) + Guard movements (group 7)
      // Paginate using section-aware logic (mirrors _renderCombinedSections)
      const projects: PdfGroupItem[] = (col.report.projects || []).map(
        (p: any) => ({
          key: p.id ?? p.key ?? String(Math.random()),
          label: p.project_name ?? p.name ?? "-",
          detail: p.detail ?? "",
          status: p.status ?? "warning",
          note: p.note ?? "",
        }),
      );
      const guardMovementItems = buildGroup4GuardMovements(col.report).items;

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
          items: guardMovementItems,
        },
      ];

      const detailChunks = paginateDetailSections(
        sections,
        PDF.AVAILABLE_H,
        projectBlockHeight,
      );

      if (detailChunks.length === 0) {
        detailPages.push(
          <div key={`detail-page-${col.id}-${pageNum}`} className="pdf-page">
            <PdfPageHeader
              pageNo={pageNum}
              sectorName={sectorName}
              title="รายงานประจำวันฝ่ายปฏิบัติการ"
              data={data}
              division={col.division}
            />
            <DivisionDetailContent item={col.report} projects={[]} movements={[]} />
            <PdfPageFooter pageNo={pageNum} />
          </div>,
        );
        pageNum++;
      } else {
        detailChunks.forEach((chunk) => {
          detailPages.push(
            <div key={`detail-page-${col.id}-${pageNum}`} className="pdf-page">
              <PdfPageHeader
                pageNo={pageNum}
                sectorName={sectorName}
                title="รายงานประจำวันฝ่ายปฏิบัติการ"
                data={data}
                division={col.division}
              />
              <DivisionDetailContent
                item={col.report}
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
    });

    return detailPages;
  };

  // ─── Assemble ────────────────────────────────────────────
  const { pages: summaryPages, nextPageNum } = renderSummaryPages(pageNumStart);
  const detailedPages = renderDetailedReportPages(nextPageNum);

  const totalPages = summaryPages.length + detailedPages.length;

  return (
    <TotalPagesContext.Provider value={totalPages}>
      {summaryPages}
      {detailedPages}
    </TotalPagesContext.Provider>
  );
}
