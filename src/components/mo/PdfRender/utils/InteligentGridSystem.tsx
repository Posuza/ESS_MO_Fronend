import { type JSX } from "react";
import { type PdfGroup } from "./PaginationSystem";

// ─── Grid Utility Types ───────────────────────────────────
export type SummaryColumn = {
  id: number | string;
  sub_location: string;
  report: any;
};

// ─── Dynamic grid-span helper ────────────────────────────
export function getWrapperClass(
  colCount: number,
  styles: Record<string, string>,
): string {
  if (colCount >= 5)
    return `${styles["mo-table-wrapper"]} ${styles["span-full"]}`;
  if (colCount >= 3)
    return `${styles["mo-table-wrapper"]} ${styles["span-half"]}`;
  return `${styles["mo-table-wrapper"]} ${styles["span-third"]}`;
}

// ─── Single-table renderer for summary grid ──────────────
export function renderSingleGroup(
  g: PdfGroup,
  cols: SummaryColumn[],
  groupIndex: number,
  isRed: boolean,
  isGroup3: boolean,
  formStyles: Record<string, string>,
  projectStatusCount: (report: any, status: string) => number,
  itemValue: (report: any, groupKey: string, key: string) => number,
  itemOffset: number = 0,
  wrapperClassOverride?: string,
): JSX.Element {
  // headerColSpan = index col(1) + label col(1) + per-loc cols + total col(1) + unit col(1)
  const headerColSpan = cols.length + 3;
  return (
    <div
      key={`${g.key}-chunk-${itemOffset}`}
      className={
        wrapperClassOverride || getWrapperClass(cols.length, formStyles)
      }
      style={{ width: "100%" }}
    >
      <table className={formStyles["mo-table"]}>
        <thead>
          <tr>
            <th
              colSpan={1}
              className={`${formStyles["first-column-cell"]} ${formStyles["no-border"]} ${isRed ? formStyles["mo-table-header-red"] : ""}`}
            >
              {groupIndex}.
            </th>
            <th
              colSpan={headerColSpan}
              className={`${formStyles["mo-table-header"]} ${formStyles["no-border"]} ${isRed ? formStyles["mo-table-header-red"] : ""}`}
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
                    const name = String(c.sub_location ?? "");
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

          {g.items.map((r, i) => {
            const perLocVals = cols.map((c) =>
              isGroup3
                ? String(projectStatusCount(c.report, r.status || r.key))
                : String(itemValue(c.report, g.key, r.key)),
            );
            const total = perLocVals.reduce(
              (acc, v) => acc + (Number(v) || 0),
              0,
            );
            const zebraClass = i % 2 !== 0 ? formStyles["row-zebra"] : "";
            const itemNumber = itemOffset + i + 1;
            return (
              <tr key={`${r.key}-${itemNumber}`} className={zebraClass}>
                <td
                  className={`${formStyles["first-column-cell"]} ${zebraClass}`}
                >{`${groupIndex}.${itemNumber}`}</td>
                <td
                  className={
                    isGroup3
                      ? `${formStyles["group3-second-column-cell"]} ${formStyles[`status-${r.status || "normal"}`]} ${zebraClass}`
                      : `${formStyles["second-column-cell"]} ${zebraClass}`
                  }
                >
                  {r.label}
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
                  {isGroup3 ? "หน่วยงาน" : r.unit}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
