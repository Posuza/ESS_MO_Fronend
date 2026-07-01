// ─────────────────────────────────────────────────────────────
// Shared PDF Pagination System
// Single source of truth for constants, height estimation,
// and generic pagination utilities across all PDF components.
// ─────────────────────────────────────────────────────────────

// ─── Shared PDF Page Constants ────────────────────────────
export const PDF = {
  PAGE_WIDTH: 842,
  PAGE_HEIGHT: 720,
  PAGE_HEADER_H: 155,
  TABLE_HEADER_H: 40,
  ROW_HEIGHT: 24,
  ROW_PADDING: 8, // 4px top + 4px bottom
  GAP: 6,
  /** Available content area per page (total minus header) */
  get AVAILABLE_H() {
    return this.PAGE_HEIGHT - this.PAGE_HEADER_H;
  },
} as const;

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

/** Estimate the full height of a table group (header + rows with padding + borders) */
export function tableHeight(itemCount: number): number {
  return (
    PDF.TABLE_HEADER_H + itemCount * (PDF.ROW_HEIGHT + PDF.ROW_PADDING) + 2 // top/border fudge
  );
}

/**
 * Estimate height of one project detail block (page=2 of SectorContent).
 * Factors in text length for wrapping detail/note fields.
 */
export function projectBlockHeight(project: PdfGroupItem): number {
  const BASE = 90; // index row + detail label + status row + note label + borders
  const CHARS_PER_LINE = 50;
  const LINE_H = 20;

  const lines = (s: string | undefined): number =>
    Math.max(1, Math.ceil((s || "").length / CHARS_PER_LINE));

  return BASE + lines(project.detail) * LINE_H + lines(project.note) * LINE_H;
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
  const span = colCount >= 5 ? 6 : colCount >= 3 ? 3 : 2;
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

// ─── Vertical Group Split Paginator ──────────────────────

export function paginateWithGroupSplit(
  groups: PdfGroup[],
  availableH: number,
  gap: number = PDF.GAP,
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

  flushPage();
  return pages;
}
