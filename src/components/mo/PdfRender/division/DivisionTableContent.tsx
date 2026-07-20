// ─────────────────────────────────────────────────────────────
// Sector PDF — Table Content Component
//
// WHAT BELONGS HERE:
//   - JSX rendering of individual sector tables
//
// WHAT DOES NOT BELONG HERE:
//   - Group data/config → see sectorGroups.ts
//   - Pagination logic → see shared/PaginationSystem.ts
// ─────────────────────────────────────────────────────────────

import { type PdfGroup, type PdfGroupItem } from "../shared/PaginationSystem";
import {
  type LocalPdfGroup,
  groupDefs,
  buildGroup2Disciplines,
  buildGroup3Projects,
  buildGroup4GuardMovements,
} from "./DivisionGroups";
import "./DivisionTableContent.module.css";

type Props = {
  item: any;
  groups?: (string | PdfGroup)[];
};

// ─── Helpers ─────────────────────────────────────────────────
const statusBg = (s: string) =>
  s === "danger" ? "#b71c1c" : "#ff9800";
const statusLabel = (s: string) =>
  ({ warning: "ผิดปกติ", danger: "ฉุกเฉิน" })[s] ?? "ผิดปกติ";
const fieldLabel = (label: string) => `${label} :`;

// ─── Component ──────────────────────────────────────────────
export default function SectorTableContent({ item, groups }: Props) {
  const data = item;

  const group2Disciplines = buildGroup2Disciplines(data);
  const group3Projects = buildGroup3Projects(data);
  const group4GuardMovements = buildGroup4GuardMovements(data);

  const resolveGroup = (key: string): LocalPdfGroup | null => {
    const from1 = groupDefs.find((g) => g.key === key);
    if (from1) return from1;
    const from2 = group2Disciplines.find((g) => g.key === key);
    if (from2) return from2;
    if (key === "meeting")
      return (
        group3Projects[0] ?? {
          key: "meeting",
          title: "เข้าพบผู้ว่าจ้าง",
          items: [],
        }
      );
    if (key === "guard_movements")
      return (
        group4GuardMovements[0] ?? {
          key: "guard_movements",
          title: "การเปลี่ยนแปลงจุดรักษาการณ์",
          items: [],
        }
      );
    return null;
  };

  const effectiveGroups: LocalPdfGroup[] = (groups || [])
    .map((grp: string | PdfGroup) =>
      typeof grp === "string"
        ? resolveGroup(grp)
        : { ...grp, items: grp.items },
    )
    .filter(Boolean) as LocalPdfGroup[];

  // All possible group definitions in display order (used for index numbering)
  const allGroupDefs: LocalPdfGroup[] = [
    ...groupDefs,
    ...group2Disciplines,
    ...(group3Projects.length > 0 ? [group3Projects[0]] : []),
    ...(group4GuardMovements.length > 0 ? group4GuardMovements : []),
  ];

  // Helper: aggregate guard movement items by status (preserving order)
  // Status is dynamic text — no "normal" fallback.
  function aggregateGuardStatuses(items: PdfGroupItem[]) {
    const seen = new Set<string>();
    const result: { status: string; count: number }[] = [];
    for (const it of items) {
      const s = it.status || "-";
      if (!seen.has(s)) {
        seen.add(s);
        result.push({ status: s, count: 0 });
      }
    }
    for (const it of items) {
      const s = it.status || "-";
      const found = result.find((r) => r.status === s);
      if (found) found.count += Number(it.value ?? 1) || 1;
    }
    return result;
  }

  return (
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
      {effectiveGroups.map((g) => {
        const idx = allGroupDefs.findIndex((x) => x.key === g.key);
        if (idx < 0) return null;
        const isDiscipline = group2Disciplines.some((x) => x.key === g.key);
        const isGroup3 = g.key === "meeting";
        const isGroup4 = g.key === "guard_movements";
        const shouldShowNoData =
          g.items.length === 0 ||
          (isDiscipline &&
            g.items.every((item: any) => Number(item.value ?? 0) <= 0));
        const emptyText = isDiscipline
          ? "ไม่มีข้อมูลวินัยและการลงโทษ"
          : isGroup3 || isGroup4
            ? "ไม่มีข้อมูล"
            : "-";
        const headerBg = "#d9d9d9";
        const headerColor = "#000000";

        return (
          <div
            key={`${g.key}-${g._itemOffset ?? 0}`}
            style={{
              gridColumn: "span 2",
              width: "100%",
              minWidth: 0,
              boxSizing: "border-box",
            }}
          >
            <table
              style={{
                width: "100%",
                tableLayout: "fixed",
                borderCollapse: "collapse",
                borderTop: "0.005px solid #d0d0d0",
              }}
            >
              <colgroup>
                <col style={{ width: 22 }} />
                <col />
                <col style={{ width: 24 }} />
                <col style={{ width: 22 }} />
              </colgroup>
              <thead>
                <tr>
                  <th
                    style={{
                      width: "1%",
                      whiteSpace: "nowrap",
                      backgroundColor: headerBg,
                      color: headerColor,
                      fontWeight: 700,
                      fontSize: 7,
                      padding: "4px 4px",
                      textAlign: "left",
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                    }}
                  >
                    {idx + 1}
                  </th>
                  <th
                    colSpan={3}
                    style={{
                      backgroundColor: headerBg,
                      color: headerColor,
                      fontWeight: 700,
                      fontSize: 7,
                      padding: "4px 3px",
                      textAlign: "left",
                    }}
                  >
                    <p style={{ margin: 0 }}>{g.title}</p>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shouldShowNoData ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        textAlign: "center",
                        padding: "6px",
                        color: "#000000",
                        fontSize: 6,
                        fontWeight: 500,
                      }}
                    >
                      {emptyText}
                    </td>
                  </tr>
                ) : isGroup4 ? (
                  // Group 4 — guard movements: aggregate by status
                  aggregateGuardStatuses(g.items).map((st, i) => (
                    <tr key={st.status}>
                      <td
                        style={{
                          fontSize: 6,
                          padding: "3px 2px",
                          width: 22,
                          minWidth: 22,
                          maxWidth: 22,
                          verticalAlign: "middle",
                          textAlign: "center",
                          color: "#000000",
                        }}
                      >
                        {idx + 1}.{(g._itemOffset || 0) + i + 1}
                      </td>
                      <td
                        style={{
                          fontSize: 6,
                          padding: "3px 4px",
                          textAlign: "left",
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                          color: "#000000",
                        }}
                      >
                        {st.status}
                      </td>
                      <td
                        style={{
                          color: "#000000",
                          textAlign: "center",
                          padding: "3px 2px",
                          fontSize: 7,
                          width: 24,
                          minWidth: 24,
                          maxWidth: 24,
                        }}
                      >
                        {st.count}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          fontSize: 7,
                          padding: "3px 2px",
                          width: 22,
                          minWidth: 22,
                          maxWidth: 22,
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          color: "#000000",
                        }}
                      >
                        หน่วยงาน
                      </td>
                    </tr>
                  ))
                ) : isGroup3 ? (
                  g.items.map((it: any, i: number) => {
                    const itemNum = (g._itemOffset || 0) + i + 1;
                    const hasStatus = Boolean(it.status);
                    const value = String((data as any)[it.key] ?? 0);
                    return (
                      <tr key={it.key || i}>
                        <td
                          style={{
                            fontSize: 7,
                            padding: "3px 2px",
                            width: 22,
                            minWidth: 22,
                            maxWidth: 22,
                            verticalAlign: "middle",
                            textAlign: "center",
                            color: "#000000",
                          }}
                        >
                          {idx + 1}.{itemNum}
                        </td>
                        <td
                          style={{
                            fontSize: 7,
                            padding: "3px 4px",
                            textAlign: "left",
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                            color: "#000000",
                          }}
                        >
                          {it.label}
                        </td>
                        <td
                          colSpan={hasStatus ? 2 : undefined}
                          style={{
                            color: hasStatus ? statusBg(it.status) : "#000000",
                            textAlign: "center",
                            padding: "3px 2px",
                            fontSize: 7,
                            width: 44,
                            minWidth: 44,
                            maxWidth: 44,
                          }}
                        >
                          {hasStatus ? statusLabel(it.status) : value}
                        </td>
                        {!hasStatus && (
                          <td
                            style={{
                              textAlign: "center",
                              padding: "3px 2px",
                              fontSize: 7,
                              width: 44,
                              minWidth: 44,
                              maxWidth: 44,
                              color: "#000000",
                            }}
                          >
                            {it.unit ?? ""}
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  g.items.map((r, i) => {
                    const itemNum = (g._itemOffset || 0) + i + 1;
                    const value = isDiscipline
                      ? String(r.value ?? 0)
                      : String((data as any)[r.key] ?? 0);
                    return (
                      <tr key={r.key}>
                        <td
                          style={{
                            fontSize: 7,
                            padding: "3px 2px",
                            width: 22,
                            minWidth: 22,
                            maxWidth: 22,
                            textAlign: "center",
                            color: "#000000",
                          }}
                        >
                          {idx + 1}.{itemNum}
                        </td>
                        <td
                          style={{
                            textAlign: "left",
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                            fontSize: 7,
                            padding: "3px 4px",
                            color: "#000000",
                          }}
                        >
                          {isGroup3 ? r.label : fieldLabel(r.label)}
                        </td>
                        <td
                          style={{
                            textAlign: "center",
                            fontSize: 7,
                            padding: "3px 2px",
                            width: 24,
                            minWidth: 24,
                            maxWidth: 24,
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            color: "#000000",
                          }}
                        >
                          {value}
                        </td>
                        <td
                          style={{
                            textAlign: "center",
                            fontSize: 7,
                            padding: "3px 2px",
                            width: 22,
                            minWidth: 22,
                            maxWidth: 22,
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            color: "#000000",
                          }}
                        >
                          {r.unit}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
