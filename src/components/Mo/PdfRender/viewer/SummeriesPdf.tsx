import { useMemo, type JSX } from "react";
import {
  PDF,
  tableHeight,
  paginateWithGroupSplit,
  getTablesPerRow,
  type PdfGroup,
  type PdfGroupItem,
} from "../utils/PaginationSystem";
import { renderSingleGroup } from "../utils/InteligentGridSystem";
import "./SummeriesPdf.css";
import SectorContent, { PdfPageHeader } from "../contents/sectorContent";
import SecotorDetialContent from "../contents/secotorDetailContent";
import {
  group1,
  dynamicGroup2,
  group3Static,
  projectStatusCount,
  itemValueFn,
  getCols,
  chunkCols,
} from "../contents/summariesContent";

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
        isRed: true,
        isGroup3: false,
      })),
      ...group3Static.map((g) => ({
        g,
        index: 6,
        isRed: false,
        isGroup3: true,
      })),
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

      const flushPage = () => {
        if (pageGroups.length === 0) return;
        pages.push(
          <div key={`summary-page-${pageNum}`} className="pdf-page">
            <PdfPageHeader
              pageNo={pageNum}
              sectorName={sectorName}
              title="MO-รายงานประจำวันฝ่ายปฏิบัติการ"
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
                  {
                    "mo-table-wrapper": "mo-table-wrapper",
                    "span-full": "span-full",
                    "span-half": "span-half",
                    "span-third": "span-third",
                    "mo-table": "mo-table",
                    "first-column-cell": "first-column-cell",
                    "no-border": "no-border",
                    "mo-table-header-red": "mo-table-header-red",
                    "mo-table-header": "mo-table-header",
                    "mo-header": "mo-header",
                    "mo-header-red-text": "mo-header-red-text",
                    "second-column-header-cell": "second-column-header-cell",
                    "third-column-header1-cell": "third-column-header1-cell",
                    "third-column-header2-cell": "third-column-header2-cell",
                    "fourth-column-header-cell": "fourth-column-header-cell",
                    "group3-second-column-cell": "group3-second-column-cell",
                    "second-column-cell": "second-column-cell",
                    "third-column-cell": "third-column-cell",
                    "third-column-wrap-cell": "third-column-wrap-cell",
                    "third-column-text": "third-column-text",
                    "fourth-column-cell": "fourth-column-cell",
                    "fourth-column-cell-danger": "fourth-column-cell-danger",
                    "row-zebra": "row-zebra",
                    "status-normal": "status-normal",
                    "status-warning": "status-warning",
                    "status-danger": "status-danger",
                  } as Record<string, string>,
                  projectStatusCount,
                  itemValueFn,
                  slot.g._itemOffset ?? 0,
                ),
              )}
            </div>
          </div>,
        );
        pageNum++;
        pageGroups = [];
        usedHeight = 0;
      };

      // ─── Paginate by grid rows ─────────────────────────────
      for (const gridRow of gridRows) {
        // Grid row height is determined by the tallest table in the row
        // (CSS grid forces all items in a row to share the same row height)
        const maxItemsInRow = Math.max(
          ...gridRow.map((item) => item.g.items.length),
        );
        const gridRowHeight = tableHeight(maxItemsInRow) + PDF.GAP;

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
    const DETAILED_AVAILABLE_H = PDF.AVAILABLE_H - 35;

    allCols.forEach((col) => {
      // ── Build dynamic group3 from this column's actual projects ──
      const projectItems = (col.report.projects || []).map((p: any) => ({
        key: p.id ?? p.name ?? String(Math.random()),
        label: p.project_name ?? p.name ?? "-",
        status: p.status ?? "normal",
        unit: "หน่วยงาน",
      }));
      const dynamicGroup3: PdfGroup = {
        key: "meeting",
        title: "เข้าพบผู้ว่าจ้าง",
        items: projectItems,
      };
      const colDetailPdfGroups: PdfGroup[] = [
        ...group1,
        ...dynamicGroup2.map((g) => g),
        dynamicGroup3,
      ];

      // Page type 1: tables (grid-row-aware: SectorContent uses 3 per row)
      const TABLES_PER_GRID_ROW = 3;
      const detailGridRows: PdfGroup[][] = [];
      for (let i = 0; i < colDetailPdfGroups.length; i += TABLES_PER_GRID_ROW) {
        detailGridRows.push(
          colDetailPdfGroups.slice(i, i + TABLES_PER_GRID_ROW),
        );
      }

      let detailPageGroups: PdfGroup[] = [];
      let detailUsedHeight = 0;

      const flushDetailPage = () => {
        if (detailPageGroups.length === 0) return;
        detailPages.push(
          <div key={`detail-v-page-${col.id}-${pageNum}`} className="pdf-page">
            <PdfPageHeader
              pageNo={pageNum}
              sectorName={sectorName}
              title="MO-รายงานประจำวันฝ่ายปฏิบัติการ"
              data={data}
              subLocation={col.sub_location}
            />
            <SectorContent item={col.report} groups={detailPageGroups} />
          </div>,
        );
        pageNum++;
        detailPageGroups = [];
        detailUsedHeight = 0;
      };

      for (const gridRow of detailGridRows) {
        const maxItemsInRow = Math.max(...gridRow.map((g) => g.items.length));
        const gridRowHeight = tableHeight(maxItemsInRow) + PDF.GAP;

        if (
          detailUsedHeight + gridRowHeight > DETAILED_AVAILABLE_H &&
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

      // Page type 2: project detail blocks
      const projects: PdfGroupItem[] = (col.report.projects || []).map(
        (p: any) => ({
          key: p.id ?? p.key ?? String(Math.random()),
          label: p.project_name ?? p.name ?? "-",
          detail: p.detail ?? "",
          status: p.status ?? "normal",
          note: p.note ?? "",
        }),
      );

      if (projects.length === 0) {
        detailPages.push(
          <div key={`detail-p-page-${col.id}-${pageNum}`} className="pdf-page">
            <PdfPageHeader
              pageNo={pageNum}
              sectorName={sectorName}
              title="MO-รายงานประจำวันฝ่ายปฏิบัติการ"
              data={data}
              subLocation={col.sub_location}
            />
            <SecotorDetialContent item={{ ...col.report, projects: [] }} />
          </div>,
        );
        pageNum++;
      } else {
        const projectGroup: PdfGroup = {
          key: "meeting",
          title: "เข้าพบผู้ว่าจ้าง",
          items: projects,
        };
        const projectChunks = paginateWithGroupSplit(
          [projectGroup],
          DETAILED_AVAILABLE_H,
          10,
        );
        projectChunks.forEach((chunk) => {
          const chunkItems = chunk.flatMap((g) => g.items);
          detailPages.push(
            <div
              key={`detail-p-page-${col.id}-${pageNum}`}
              className="pdf-page"
            >
              <PdfPageHeader
                pageNo={pageNum}
                sectorName={sectorName}
                title="MO-รายงานประจำวันฝ่ายปฏิบัติการ"
                data={data}
                subLocation={col.sub_location}
              />
              <SecotorDetialContent
                item={{ ...col.report, projects: chunkItems }}
              />
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

  return (
    <>
      {summaryPages}
      {detailedPages}
    </>
  );
}
