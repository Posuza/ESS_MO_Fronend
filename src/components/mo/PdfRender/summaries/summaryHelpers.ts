// ─────────────────────────────────────────────────────────────
// Summaries PDF — Value Helpers & Column Utilities
//
// WHAT BELONGS HERE:
//   - Functions that read values from a report object
//   - Column shaping utilities (getCols, chunkCols)
//   - SUMMARY_STYLES constant (CSS class names for the table renderer)
//
// WHAT DOES NOT BELONG HERE:
//   - Group data/config → see summaryGroups.ts
//   - Table rendering JSX → see SummaryTableContent.tsx
// ─────────────────────────────────────────────────────────────
import styles from "./SummeriesPdf.module.css";

// ─── Column type ─────────────────────────────────────────────
export type SummaryColumn = {
  id: number | string;
  sub_location: string;
  report: any;
};

// ─── Value readers ───────────────────────────────────────────

/** Read a discipline value from either the disciplines array or direct key on report */
export function disciplineValue(report: any, key: string): number {
  const fromArray = report.disciplines?.find((it: any) => it.key === key);
  if (fromArray) return Number(fromArray.value) || 0;
  return Number((report as any)[key]) || 0;
}

/** Count how many projects in a report have the given status */
export function projectStatusCount(report: any, status: string): number {
  return (report.projects || []).filter(
    (p: any) => (p.status || "normal") === status,
  ).length;
}

/** General item value reader — routes discipline keys through disciplineValue */
export function itemValueFn(report: any, groupKey: string, key: string): number {
  if (groupKey === "discipline") return disciplineValue(report, key);
  return Number((report as any)[key]) || 0;
}

// ─── Column helpers ──────────────────────────────────────────

/** Max sub-location columns shown per page before wrapping to a new column-chunk */
export const MAX_COLS_PER_PAGE = 6;

/** Build a SummaryColumn array from the list of reports for this date/sector */
export function getCols(summaryReports: any[], data: any): SummaryColumn[] {
  const source = summaryReports.length > 0 ? summaryReports : [data];
  return source.map((report: any) => {
    const fullName = report.division_name || report.sub_location || "";
    const m = String(fullName).match(/เขต\s+[\d.]+/);
    return {
      id: report.id || (report as any).mo_daily_transaction_id,
      sub_location: m ? m[0] : fullName || "-",
      report,
    };
  });
}

/** Split columns into chunks of MAX_COLS_PER_PAGE for multi-page layouts */
export function chunkCols(cols: SummaryColumn[]): SummaryColumn[][] {
  const chunks: SummaryColumn[][] = [];
  for (let i = 0; i < cols.length; i += MAX_COLS_PER_PAGE) {
    chunks.push(cols.slice(i, i + MAX_COLS_PER_PAGE));
  }
  return chunks.length ? chunks : [[]];
}

// ─── CSS class name map ───────────────────────────────────────
// Map class keys to the imported CSS modules styles object
export const SUMMARY_STYLES: Record<string, string> = styles;
