// ─────────────────────────────────────────────────────────────
// Summaries PDF — Table Renderer Component
//
// WHAT BELONGS HERE:
//   - JSX rendering for the main summaries grid tables
//
// WHAT DOES NOT BELONG HERE:
//   - Value calculation helpers → see summaryHelpers.ts
//   - Group configurations → see summaryGroups.ts
//   - Page pagination → see SummeriesPdf.tsx
// ─────────────────────────────────────────────────────────────

import { type JSX } from "react";
import { type PdfGroup } from "../shared/PaginationSystem";
import { type SummaryColumn, SUMMARY_STYLES } from "./summaryHelpers";

const fieldLabel = (label: string) => `${label} :`;
const shouldFormatFieldLabel = (groupKey: string) =>
  ["dept", "leave", "shift", "training", "discipline"].includes(groupKey);

// ─── Dynamic grid-span helper ────────────────────────────────
export function getWrapperClass(
  colCount: number,
  styles: Record<string, string> = SUMMARY_STYLES,
): string {
  // 8+ columns → 1 per row, 6-7 → 2 per row, 1-5 → 3 per row
  if (colCount >= 8)
    return `${styles["mo-table-wrapper"]} ${styles["span-full"]}`;
  if (colCount >= 6)
    return `${styles["mo-table-wrapper"]} ${styles["span-half"]}`;
  return `${styles["mo-table-wrapper"]} ${styles["span-third"]}`;
}

// ─── Single-table renderer for summary grid ──────────────────
export function renderSingleGroup(
  g: PdfGroup,
  cols: SummaryColumn[],
  groupIndex: number,
  isRed: boolean,
  isGroup3: boolean,
  formStyles: Record<string, string> = SUMMARY_STYLES,
  projectStatusCountFn: (report: any, status: string) => number,
  itemValue: (report: any, groupKey: string, key: string) => number,
  guardMovementStatusCountFn?: (report: any, status: string) => number,
  itemOffset: number = 0,
  wrapperClassOverride?: string,
): JSX.Element {
  // headerColSpan = index col(1) + label col(1) + per-loc cols + total col(1) + unit col(1)
  const headerColSpan = cols.length + 3;
  const noDataText =
    g.key === "discipline"
      ? "ไม่มีข้อมูลวินัยและการลงโทษ"
      : isGroup3
        ? "ไม่มีข้อมูลโครงการ"
        : g.key === "guard_movements"
          ? "ไม่มีข้อมูลการเปลี่ยนแปลงจุดรักษาการณ์"
          : "ไม่มีข้อมูล";
  const rowData = g.items.map((r, i) => {
    const perLocVals = cols.map((c) => {
      if (isGroup3 && r.status)
        return String(projectStatusCountFn(c.report, r.status || r.key));
      if (g.key === "guard_movements" && guardMovementStatusCountFn)
        return String(guardMovementStatusCountFn(c.report, r.status || r.key));
      return String(itemValue(c.report, g.key, r.key));
    });
    const total = perLocVals.reduce((acc, v) => acc + (Number(v) || 0), 0);
    return { r, originalIndex: i, perLocVals, total };
  });
  const displayRows =
    isGroup3
      ? rowData.filter((row) => !row.r.status || row.total > 0)
      : g.key === "guard_movements"
        ? rowData.filter((row) => row.total > 0)
      : rowData;
  const shouldShowNoData =
    displayRows.length === 0 ||
    (g.key === "discipline" && rowData.every((row) => row.total <= 0));

  return (
    <div
      key={`${g.key}-chunk-${itemOffset}`}
      className={
        wrapperClassOverride || getWrapperClass(cols.length, formStyles)
      }
      style={{ width: "100%" }}
    >
      <table className={formStyles["mo-table"]}>
        <colgroup>
          <col style={{ width: 26 }} />
          <col />
          {cols.map((c) => (
            <col key={String(c.id)} style={{ width: 22 }} />
          ))}
          <col style={{ width: 22 }} />
          <col style={{ width: 26 }} />
        </colgroup>
        <thead>
          <tr>
            <th
              colSpan={1}
              className={`${formStyles["first-column-cell"]} ${isRed ? formStyles["mo-table-header-red"] : ""}`}
            >
              {groupIndex}
            </th>
            <th
              colSpan={headerColSpan}
              className={`${formStyles["mo-table-header"]} ${isRed ? formStyles["mo-table-header-red"] : ""}`}
            >
              <div className={formStyles["mo-header"]}>
                <p
                  className={
                    isRed || isGroup3 ? formStyles["mo-header-red-text"] : ""
                  }
                >
                  {g.title}
                  {itemOffset > 0 ? " (ต่อ)" : ""}
                </p>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={2} className={formStyles["second-column-header-cell"]}>
              <strong>หัวข้อ</strong>
            </td>
            {cols.map((c) => (
              <td
                key={String(c.id)}
                className={formStyles["third-column-header1-cell"]}
              >
                <strong>
                  {(() => {
                    const name = String(c.division ?? "");
                    const m = name.match(/เขต\s+[\d.]+/);
                    if (m) return m[0];
                    const words = name.trim().split(/\s+/);
                    return words.length >= 2
                      ? words
                          .slice(0, 2)
                          .map((w) => w.charAt(0))
                          .join("")
                      : name;
                  })()}
                </strong>
              </td>
            ))}
            <td className={formStyles["third-column-header2-cell"]}>
              <strong>รวม</strong>
            </td>
            <td className={formStyles["fourth-column-header-cell"]} />
          </tr>

          {shouldShowNoData ? (
            <tr>
              <td
                colSpan={headerColSpan + 1}
                style={{
                  textAlign: "center",
                  color: "#000000",
                  padding: "6px",
                  border: "0.8px solid #ccc",
                }}
              >
                {noDataText}
              </td>
            </tr>
          ) : (
            displayRows.map(({ r, originalIndex, perLocVals, total }, i) => {
            const zebraClass = i % 2 !== 0 ? formStyles["row-zebra"] : "";
            const itemNumber = itemOffset + originalIndex + 1;
            return (
              <tr key={`${r.key}-${itemNumber}`} className={zebraClass}>
                <td
                  className={`${formStyles["first-column-cell"]} ${zebraClass}`}
                >{`${groupIndex}.${itemNumber}`}</td>
                <td
                  className={
                    isGroup3 && r.status
                      ? `${formStyles["group3-second-column-cell"]} ${formStyles[`status-${r.status || "warning"}`]} ${zebraClass}`
                      : `${formStyles["second-column-cell"]} ${zebraClass}`
                  }
                >
                  {shouldFormatFieldLabel(g.key) ? fieldLabel(r.label) : r.label}
                </td>
                {perLocVals.map((val, j) => (
                  <td
                    key={j}
                    className={`${formStyles["third-column-cell"]} ${String(val).length > 4 ? formStyles["third-column-wrap-cell"] : ""}`}
                  >
                    <div className={formStyles["third-column-text"]}>{val}</div>
                  </td>
                ))}
                <td
                  className={`${formStyles["third-column-cell"]} ${zebraClass}`}
                >
                  <div className={formStyles["third-column-text"]}>
                    {String(total)}
                  </div>
                </td>
                <td
                  className={`${formStyles["fourth-column-cell"]} ${isRed ? formStyles["fourth-column-cell-danger"] : ""} ${zebraClass}`}
                >
                  {r.unit || ""}
                </td>
              </tr>
            );
          }))}
        </tbody>
      </table>
    </div>
  );
}
