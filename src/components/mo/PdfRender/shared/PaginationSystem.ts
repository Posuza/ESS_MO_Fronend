// ─────────────────────────────────────────────────────────────
// Shared PDF Pagination System
// Single source of truth for constants, height estimation,
// and generic pagination utilities across all PDF components.
// ─────────────────────────────────────────────────────────────

// ─── Shared PDF Page Constants ────────────────────────────
// Calibrated to match jsPDF autoTable rendering (exportPdf.ts):
//   - Header: 33mm ≈ 94px
//   - Group table rows: 5.5mm ≈ 16px each (1 header + N body)
//   - Summary table: 2 headers ≈ 25px + body rows at 13px each
//   - Available page: 596 - 94 = 502px (vs export's 171mm ≈ 485px)
export const PDF = {
  PAGE_WIDTH: 842, // A4 landscape in points
  PAGE_HEIGHT: 596, // matches CSS .pdf-page height
  CSS_V_PADDING: 30, // 10px top + 20px bottom padding in .pdf-page
  PAGE_HEADER_H: 100, // matches actual CSS header (logo 68px + title + meta ≈ 100px)
  TABLE_HEADER_H: 16, // group table header row in CSS (fontSize 7 + padding 4px×2)
  ROW_HEIGHT: 14, // group table body row in CSS (fontSize 7 line-height 8.4 + padding 3×2)
  ROW_PADDING: 0, // merged into ROW_HEIGHT
  GAP: 6, // grid gap in CSS
  FOOTER_H: 18, // footer area height in CSS (7pt text + 8px padding-top)
  /** Available content area per page (CSS content box minus header and footer) */
  get AVAILABLE_H() {
    return this.PAGE_HEIGHT - this.CSS_V_PADDING - this.PAGE_HEADER_H - this.FOOTER_H;
  },
} as const;

const A4_LANDSCAPE_WIDTH_MM = 297;
const EXPORT_MARGIN_MM = 10;
const EXPORT_GAP_MM = 2;
const FONT_SIZE_PT = 7;
const PT_TO_MM = 0.352778;
const LINE_HEIGHT_MM = FONT_SIZE_PT * PT_TO_MM * 1.2;
const MM_TO_PX = PDF.PAGE_WIDTH / A4_LANDSCAPE_WIDTH_MM;
const EXPORT_TABLE_BODY_WIDTH_MM = A4_LANDSCAPE_WIDTH_MM - EXPORT_MARGIN_MM * 2;
const EXPORT_SUMMARY_TABLE_BREAK_BUFFER_MM = 20;
const EXPORT_DIVISION_TABLE_BREAK_BUFFER_MM = 4;

function mmToPx(mm: number): number {
  return mm * MM_TO_PX;
}

function estimateTextUnits(value: string | number | undefined): number {
  const text = String(value ?? "-");
  let units = 0;

  for (const ch of text) {
    if (/\s/.test(ch)) units += 0.35;
    else if (/[\u0E00-\u0E7F]/.test(ch)) units += 0.92;
    else if (/[A-Z0-9]/i.test(ch)) units += 0.58;
    else units += 0.45;
  }

  return Math.max(1, units);
}

function estimateWrappedLines(
  value: string | number | undefined,
  contentWidthMm: number,
): number {
  const avgUnitMm = FONT_SIZE_PT * PT_TO_MM * 0.5;
  return Math.max(1, Math.ceil((estimateTextUnits(value) * avgUnitMm) / Math.max(contentWidthMm, 1)));
}

function exportTableRowHeightPx(
  lineCount: number,
  paddingTopMm: number = 1.5,
  paddingBottomMm: number = 1.5,
): number {
  return mmToPx(lineCount * LINE_HEIGHT_MM + paddingTopMm + paddingBottomMm + 0.1);
}

function exportGridTableWidthMm(tablesPerRow: number): number {
  return (
    EXPORT_TABLE_BODY_WIDTH_MM -
    (tablesPerRow - 1) * EXPORT_GAP_MM
  ) / tablesPerRow;
}

// ─── Shared Types ─────────────────────────────────────────
export interface PdfGroupItem {
  key: string;
  label: string;
  unit?: string;
  status?: string;
  detail?: string;
  note?: string;
  value?: string | number;
}

export interface PdfGroup {
  key: string;
  title: string;
  items: PdfGroupItem[];
  /** Optional: if this group is a continuation of a split, track original item offset for numbering */
  _itemOffset?: number;
}

// ─── Height Estimators ────────────────────────────────────

/**
 * Estimate height of a GROUP table using raw item count.
 * 1 header row + N body rows.
 */
export function tableHeight(itemCount: number): number {
  if (itemCount <= 0) return PDF.TABLE_HEADER_H + 2;
  return (itemCount + 1) * PDF.ROW_HEIGHT;
}

function divisionBodyRows(group: PdfGroup): PdfGroupItem[] {
  if (group.key !== "guard_movements") return group.items;

  const counts = new Map<string, number>();
  for (const item of group.items) {
    const status = item.status || "-";
    counts.set(status, (counts.get(status) || 0) + Number(item.value ?? 1));
  }

  const rows: PdfGroupItem[] = [];
  for (const item of group.items) {
    const status = item.status || "-";
    if (rows.some((row) => row.status === status)) continue;
    rows.push({
      key: status,
      label: status,
      unit: "หน่วยงาน",
      status,
      value: counts.get(status) || 0,
    });
  }
  return rows;
}

function divisionRowHeight(group: PdfGroup, item: PdfGroupItem): number {
  const tableWidthMm = exportGridTableWidthMm(3);
  const indexW = 8;
  const valueW = 9;
  const unitW = 8;
  const statusW = 16;
  const contentW =
    group.key === "meeting"
      ? tableWidthMm - indexW - statusW - 4
      : tableWidthMm - indexW - valueW - unitW - 4;
  const sideW = group.key === "meeting" ? statusW : unitW;
  const lines = Math.max(
    estimateWrappedLines(item.label, contentW),
    estimateWrappedLines(item.status || "", sideW),
    group.key === "meeting" ? estimateWrappedLines(item.unit || "", sideW) : 1,
  );
  return mmToPx(Math.max(7.4, lines * LINE_HEIGHT_MM + 3.7));
}

/**
 * Estimate height of a single group's table in the CSS grid.
 * Accounts for guard movement aggregation (unique statuses) and
 * empty-state rendering. Matches DivisionTableContent's actual CSS output.
 */
export function groupGridHeight(group: PdfGroup): number {
  const headerH = mmToPx(5.8);
  const rows = divisionBodyRows(group);
  if (rows.length === 0) return headerH + mmToPx(7.4);

  return (
    headerH +
    rows.reduce((sum, item) => sum + divisionRowHeight(group, item), 0)
  );
}

/**
 * Estimate height of a SUMMARY table (renderSummaryTable in exportPdf.ts).
 * 2 header rows + N body rows, each ~16px (same as group tables now).
 * Matches export's summaryTableHeightMm: (N+2) × 5.5mm ≈ (N+2) × 16px
 */
export function summaryTableHeight(itemCount: number): number {
  if (itemCount <= 0) return mmToPx(12.4);
  return mmToPx(12.4 + itemCount * 7.4);
}

export function divisionBodyRowCapacity(availableHeight: number): number {
  // Keep division table chunks in step with summary table pagination.
  // In the preview, footer/header spacing leaves room for about the same
  // number of body rows that summary tables fit before continuing.
  return computeTableBodyRowCapacity(
    divisionTableFitHeight(availableHeight),
    2,
  );
}

export function divisionTableFitHeight(availableHeight: number): number {
  return Math.max(0, availableHeight - mmToPx(EXPORT_DIVISION_TABLE_BREAK_BUFFER_MM));
}

export function summaryTableBodyRowCapacity(availableHeight: number): number {
  return computeTableBodyRowCapacity(
    Math.max(0, availableHeight - mmToPx(EXPORT_SUMMARY_TABLE_BREAK_BUFFER_MM)),
    2,
  );
}

export function summaryGridHeight(group: PdfGroup, colCount: number): number {
  const tablesPerRow = getTablesPerRow(colCount);
  const tableWidthMm = exportGridTableWidthMm(tablesPerRow);
  const noW = 7;
  const locW = 8;
  const totalW = 9;
  const unitW = 8;
  const labelW = tableWidthMm - noW - colCount * locW - totalW - unitW - 4;
  const headerH = mmToPx(12.4);

  if (group.items.length === 0) return headerH;

  return headerH + group.items.reduce((sum, item) => {
    const lines = Math.max(
      estimateWrappedLines(item.label, labelW),
      estimateWrappedLines(item.unit || "", unitW - 2),
    );
    return sum + mmToPx(Math.max(7.4, lines * LINE_HEIGHT_MM + 3.7));
  }, 0);
}

/**
 * Estimate height of one project detail block (page=2 of SectorContent).
 * Factors in text length for wrapping detail/note fields.
 */
export function projectBlockHeight(project: PdfGroupItem): number {
  const contentWidthMm = EXPORT_TABLE_BODY_WIDTH_MM - 18 - 4;
  const rowHeight = (value: string | number | undefined): number =>
    mmToPx(
      Math.max(
        6.8,
        estimateWrappedLines(value || "-", contentWidthMm) * LINE_HEIGHT_MM +
          3.1,
      ),
    );

  return (
    rowHeight(project.label) +
    rowHeight(project.detail || "-") +
    rowHeight(project.status || "warning") +
    rowHeight(project.note || "-") +
    4
  );
}

// ─── Generic Pagination ───────────────────────────────────

/**
 * Split items into page-sized chunks based on estimated heights.
 *
 * @param items - items to paginate
 * @param estimateH - function that returns estimated height for one item
 * @param availableH - total available height per page
 * @param gap - vertical gap between items (defaults to PDF.GAP)
 * @returns array of chunks, each chunk fits within availableH
 */
export function paginateItems<T>(
  items: T[],
  estimateH: (item: T) => number,
  availableH: number,
  gap: number = PDF.GAP,
): T[][] {
  const pages: T[][] = [];
  let current: T[] = [];
  let used = 0;

  for (const item of items) {
    const h = estimateH(item);
    if (used + h > availableH && current.length > 0) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(item);
    used += h + gap;
  }
  if (current.length > 0) pages.push(current);

  return pages;
}

/**
 * Get how many tables fit per grid row in the summary grid layout.
 * Based on column count — more columns = wider span = fewer per row.
 */
export function getTablesPerRow(colCount: number): number {
  const span = colCount >= 8 ? 6 : colCount >= 6 ? 3 : 2;
  return 6 / span;
}

// ─── Grid Mode ────────────────────────────────────────────
export type GridMode = 1 | 2 | 3;

export function getGridMode(colCount: number): GridMode {
  return getTablesPerRow(colCount) as GridMode;
}

// ─── Dynamic Row Capacity ────────────────────────────────

export function computeRowCapacity(remainingHeight: number): number {
  if (remainingHeight <= PDF.TABLE_HEADER_H + 2) return 0;
  const singleRowH = PDF.ROW_HEIGHT + PDF.ROW_PADDING;
  return Math.floor((remainingHeight - PDF.TABLE_HEADER_H - 2) / singleRowH);
}

export function computeTableBodyRowCapacity(
  availableHeight: number,
  headerRows: number = 1,
): number {
  const headerH = headerRows === 2 ? mmToPx(12.4) : exportTableRowHeightPx(1);
  const rowH = headerRows === 2 ? mmToPx(7.4) : exportTableRowHeightPx(1);
  const bodyH = Math.max(0, availableHeight - headerH - mmToPx(EXPORT_GAP_MM));
  return Math.max(1, Math.floor(bodyH / rowH));
}

// ─── Table Splitting ─────────────────────────────────────

export interface SplitGroupResult {
  rendered: PdfGroup;
  overflow: PdfGroup | null;
}

export function splitGroupItems(
  group: PdfGroup,
  maxRows: number,
): SplitGroupResult {
  if (group.items.length <= maxRows || maxRows <= 0) {
    return { rendered: group, overflow: null };
  }
  return {
    rendered: {
      ...group,
      items: group.items.slice(0, maxRows),
      _itemOffset: group._itemOffset ?? 0,
    },
    overflow: {
      ...group,
      items: group.items.slice(maxRows),
      _itemOffset: (group._itemOffset ?? 0) + maxRows,
    },
  };
}

export function splitDivisionGroupItems(
  group: PdfGroup,
  maxRows: number,
): SplitGroupResult {
  if (group.key !== "guard_movements") {
    return splitGroupItems(group, maxRows);
  }

  const rows = divisionBodyRows(group);
  if (rows.length <= maxRows || maxRows <= 0) {
    return { rendered: { ...group, items: rows }, overflow: null };
  }

  return {
    rendered: {
      ...group,
      items: rows.slice(0, maxRows),
      _itemOffset: group._itemOffset ?? 0,
    },
    overflow: {
      ...group,
      items: rows.slice(maxRows),
      _itemOffset: (group._itemOffset ?? 0) + maxRows,
    },
  };
}

// ─── Detail Section Paginator (mirrors _renderCombinedSections) ───

/** Height of a section header row in the detail preview (CSS rendering). */
export const DETAIL_SECTION_HEADER_H = 20;

/** Height of the "no data" empty row in a section. */
export const DETAIL_EMPTY_ROW_H = 20;

/**
 * Configuration for a detail section (projects or guard movements).
 * Mirrors _SectionConfig in divisionDetailContent.ts.
 */
export interface DetailSection {
  groupIndex: number;
  title: string;
  emptyText: string;
  items: PdfGroupItem[];
}

/**
 * One page chunk of detail content — the items that fit on a single page.
 * DivisionDetailContent renders projects + movements from these arrays.
 */
export interface DetailPageChunk {
  projects: PdfGroupItem[];
  movements: PdfGroupItem[];
  projectOffset: number;
  movementOffset: number;
  /** Which sections should be rendered on this page.
   *  Mirrors jsPDF: once section 6 finishes, section 7 pages don't re-show section 6. */
  renderProjects: boolean;
  renderMovements: boolean;
}

/**
 * Paginate detail sections (projects + guard movements) into page-sized chunks.
 *
 * This function mirrors the logic of `_renderCombinedSections` in
 * divisionDetailContent.ts:
 *
 *   - Sections are iterated sequentially (projects first, then movements)
 *   - Each section has a header row that takes DETAIL_SECTION_HEADER_H
 *   - When switching sections on the same page, the new section's header
 *     is drawn inline (accounted for in height)
 *   - When a new page is needed, the current section's header is redrawn
 *   - Each item is atomic (never split across pages)
 *   - Empty sections render header + "no data" row inline
 *
 * @param sections - array of detail sections (typically [projects, movements])
 * @param availableH - available content height per page
 * @param itemHeightFn - function returning estimated height of one item block
 * @returns array of page chunks, each fitting within availableH
 */
export function paginateDetailSections(
  sections: DetailSection[],
  availableH: number,
  itemHeightFn: (item: PdfGroupItem) => number,
): DetailPageChunk[] {
  const pages: DetailPageChunk[] = [];
  let currentProjects: PdfGroupItem[] = [];
  let currentMovements: PdfGroupItem[] = [];
  let currentProjectOffset = 0;
  let currentMovementOffset = 0;
  let nextProjectOffset = 0;
  let nextMovementOffset = 0;
  let usedH = 0;
  // Tracks which section's header is currently rendered on this page.
  // -1 means no header drawn yet on this page.
  let activeSectionIdx = -1;
  // Tracks which sections have been drawn on the current page.
  let pageSections = new Set<number>();
  let hasRenderableContent = false;

  const flushPage = () => {
    if (hasRenderableContent) {
      pages.push({
        projects: currentProjects,
        movements: currentMovements,
        projectOffset: currentProjectOffset,
        movementOffset: currentMovementOffset,
        renderProjects: pageSections.has(0),
        renderMovements: pageSections.has(1),
      });
      currentProjects = [];
      currentMovements = [];
      currentProjectOffset = nextProjectOffset;
      currentMovementOffset = nextMovementOffset;
      usedH = 0;
      activeSectionIdx = -1;
      pageSections = new Set();
      hasRenderableContent = false;
    }
  };

  const addItemToPage = (
    sectionIdx: number,
    item: PdfGroupItem,
  ) => {
    if (sectionIdx === 0) {
      if (currentProjects.length === 0) {
        currentProjectOffset = nextProjectOffset;
      }
      currentProjects.push(item);
      nextProjectOffset++;
    } else {
      if (currentMovements.length === 0) {
        currentMovementOffset = nextMovementOffset;
      }
      currentMovements.push(item);
      nextMovementOffset++;
    }
  };

  for (let s = 0; s < sections.length; s++) {
    const section = sections[s];

    // ── Empty section ──
    if (section.items.length === 0) {
      const emptyH = DETAIL_SECTION_HEADER_H + DETAIL_EMPTY_ROW_H;

      if (usedH + emptyH > availableH && hasRenderableContent) {
        flushPage();
      }

      usedH += emptyH;
      activeSectionIdx = s;
      pageSections.add(s);
      hasRenderableContent = true;
      // Empty section has no items to add, but we mark the section as active
      continue;
    }

    // ── Section with items ──
    for (let i = 0; i < section.items.length; i++) {
      const item = section.items[i];
      const itemH = itemHeightFn(item);

      // Determine if we need a section header:
      //   - When switching to a new section on the same page
      //   - On a fresh page (activeSectionIdx === -1)
      const needsSectionHead = s !== activeSectionIdx;
      const neededH = needsSectionHead
        ? DETAIL_SECTION_HEADER_H + itemH
        : itemH;

      if (usedH + neededH > availableH && hasRenderableContent) {
        // Doesn't fit — flush current page and start fresh
        flushPage();
        // On new page, we need the section header
        usedH += DETAIL_SECTION_HEADER_H;
        activeSectionIdx = s;
      } else if (needsSectionHead) {
        // Section changed but fits — draw section header inline
        usedH += DETAIL_SECTION_HEADER_H;
        activeSectionIdx = s;
      }

      // Add item to the current page
      addItemToPage(s, item);
      pageSections.add(s);
      hasRenderableContent = true;
      usedH += itemH;
    }
  }

  flushPage();
  return pages;
}

// ─── Legacy paginator (kept for table grid pagination) ──────

export function paginateWithGroupSplit(
  groups: PdfGroup[],
  availableH: number,
  gap: number = PDF.GAP,
  itemHeightFn?: (item: PdfGroupItem) => number,
): PdfGroup[][] {
  const pages: PdfGroup[][] = [];
  let currentPage: PdfGroup[] = [];
  let usedH = 0;

  const flushPage = () => {
    if (currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      usedH = 0;
    }
  };

  for (const group of groups) {
    let remaining: PdfGroup | null = group;

    while (remaining) {
      let remainingH = availableH - usedH;

      if (remainingH <= PDF.TABLE_HEADER_H + 2) {
        if (currentPage.length > 0) {
          flushPage();
          remainingH = availableH;
        } else {
          break;
        }
      }

      if (itemHeightFn) {
        let itemCount = 0;
        let accumH = 0;
        for (const item of remaining.items) {
          const h = itemHeightFn(item);
          if (accumH + h > remainingH && itemCount > 0) break;
          accumH += h + gap;
          itemCount++;
        }
        if (itemCount <= 0) {
          if (currentPage.length > 0) {
            flushPage();
            continue;
          }
          break;
        }
        const { rendered, overflow } = splitGroupItems(remaining, itemCount);
        if (rendered.items.length > 0) {
          currentPage.push(rendered);
          usedH += accumH;
        }
        remaining = overflow;
      } else {
        const maxRows = computeRowCapacity(remainingH);
        if (maxRows <= 0) {
          if (currentPage.length > 0) {
            flushPage();
            continue;
          }
          break;
        }

        const { rendered, overflow } = splitGroupItems(remaining, maxRows);

        if (rendered.items.length > 0) {
          currentPage.push(rendered);
          usedH += tableHeight(rendered.items.length) + gap;
        }

        remaining = overflow;
      }
    }
  }

  flushPage();
  return pages;
}
