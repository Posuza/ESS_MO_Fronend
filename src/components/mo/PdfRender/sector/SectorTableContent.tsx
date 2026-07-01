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
} from "./sectorGroups";
import "./SectorTableContent.module.css";

type Props = {
  item: any;
  groups?: (string | PdfGroup)[];
};

// ─── Helpers ─────────────────────────────────────────────────
const statusBg = (s: string) =>
  s === "warning" ? "#ff9800" : s === "danger" ? "#b71c1c" : "#4caf50";
const statusLabel = (s: string) =>
  ({ normal: "ปกติ", warning: "ผิดปกติ", danger: "ฉุกเฉิน" })[s] ?? "ปกติ";

// ─── Component ──────────────────────────────────────────────
export default function SectorTableContent({ item, groups }: Props) {
  const data = item;

  const group2Disciplines = buildGroup2Disciplines(data);
  const group3Projects = buildGroup3Projects(data);

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
  ];

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
        const headerBg = "#d9d9d9";
        const headerColor = "#000000";

        return (
          <div
            key={g.key}
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
                borderCollapse: "collapse",
                borderTop: "0.005px solid #d0d0d0",
              }}
            >
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
                      padding: "6px 6px",
                      textAlign: "left",
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
                      padding: "6px 4px",
                      textAlign: "left",
                    }}
                  >
                    <p style={{ margin: 0 }}>{g.title}</p>
                  </th>
                </tr>
              </thead>
              <tbody>
                {g.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        textAlign: "center",
                        padding: "10px",
                        color: "#000000",
                        fontSize: 7,
                        fontWeight: 500,
                      }}
                    >
                      {isGroup3 ? "ไม่มีข้อมูล" : "-"}
                    </td>
                  </tr>
                ) : isGroup3 ? (
                  g.items.map((it: any, i: number) => {
                    const itemNum = (g._itemOffset || 0) + i + 1;
                    return (
                      <tr key={it.key || i}>
                        <td
                          style={{
                            fontSize: 7,
                            padding: "6px 2px",
                            width: 26,
                            minWidth: 26,
                            maxWidth: 26,
                            verticalAlign: "middle",
                            textAlign: "center",
                            color: "#000000",
                          }}
                        >
                          {idx + 1}.{itemNum}
                        </td>
                        <td
                          colSpan={2}
                          style={{
                            fontSize: 7,
                            padding: "6px 6px",
                            textAlign: "left",
                            color: "#000000",
                          }}
                        >
                          {it.label}
                        </td>
                        <td
                          style={{
                            color: statusBg(it.status),
                            textAlign: "center",
                            padding: "6px 4px",
                            fontSize: 7,
                            width: 50,
                            minWidth: 50,
                            maxWidth: 50,
                          }}
                        >
                          {statusLabel(it.status)}
                        </td>
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
                            padding: "6px 2px",
                            width: 26,
                            minWidth: 26,
                            maxWidth: 26,
                            textAlign: "center",
                            color: "#000000",
                          }}
                        >
                          {idx + 1}.{itemNum}
                        </td>
                        <td
                          style={{
                            textAlign: "left",
                            fontSize: 7,
                            padding: "6px 6px",
                            color: "#000000",
                          }}
                        >
                          {r.label}
                        </td>
                        <td
                          style={{
                            textAlign: "center",
                            fontSize: 7,
                            padding: "6px 2px",
                            width: 30,
                            minWidth: 30,
                            maxWidth: 30,
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
                            padding: "6px 2px",
                            width: 28,
                            minWidth: 28,
                            maxWidth: 28,
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
