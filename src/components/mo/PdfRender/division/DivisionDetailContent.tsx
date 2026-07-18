// ─────────────────────────────────────────────────────────────
// Division PDF — Combined Detail Content
//
// Renders per-item detail tables (projects + guard movements)
// as one continuous flow.
// ─────────────────────────────────────────────────────────────

import { Fragment } from "react";
import { type PdfGroupItem } from "../shared/PaginationSystem";
import "./DivisionDetailContent.module.css";

type Props = {
  item: any;
  projects?: PdfGroupItem[];
  movements?: PdfGroupItem[];
  projectOffset?: number;
  movementOffset?: number;
  /** Which sections to render — mirrors jsPDF behavior where
   *  once a section finishes, its header is not re-shown on later pages. */
  renderProjects?: boolean;
  renderMovements?: boolean;
};

const statusBg = (s: string) =>
  s === "danger" ? "#b71c1c" : "#ff9800";
const statusLabel = (s: string) =>
  ({ warning: "ผิดปกติ", danger: "ฉุกเฉิน" })[s] ?? "ผิดปกติ";

const cellStyle: React.CSSProperties = {
  fontWeight: 400,
  padding: "3px 4px",
  textAlign: "center",
  fontSize: 7,
  color: "#000000",
  background: "transparent",
};

export default function DivisionDetailContent({
  item,
  projects,
  movements,
  projectOffset = 0,
  movementOffset = 0,
  renderProjects = true,
  renderMovements = true,
}: Props) {
  const data = item;

  // Process projects
  const processedProjects: PdfGroupItem[] = (projects || ((data as any).projects || [])).map(
    (p: any, i: number) => ({
      key: p.id ?? p.key ?? `proj-${i}`,
      label: p.project_name ?? p.name ?? p.label ?? "-",
      detail: p.detail ?? "",
      status: p.status ?? "warning",
      note: p.note ?? "",
    }),
  );

  // Process guard movements
  const processedMovements: PdfGroupItem[] = (movements || ((data as any).guard_post_movements || [])).map(
    (p: any, i: number) => ({
      key: p.id ?? p.key ?? `mov-${i}`,
      label: p.label ?? p.name ?? "-",
      detail: p.detail ?? "",
      status: p.status,
      note: p.note ?? "",
    }),
  );

  const renderDetailTable = (
    items: PdfGroupItem[],
    groupIndex: number,
    title: string,
    emptyMsg: string,
    isProject: boolean,
    itemOffset: number = 0,
  ) => (
    <div style={{ marginBottom: 4 }}>
      <table
        style={{
          width: "100%",
          tableLayout: "fixed",
          borderCollapse: "collapse",
          borderTop: "0.005px solid #d0d0d0",
        }}
      >
        <colgroup>
          <col style={{ width: 52 }} />
          <col />
          <col />
          <col />
          <col />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th
              style={{
                width: "5%",
                backgroundColor: "#d9d9d9",
                color: "#000000",
                fontWeight: 700,
                fontSize: 7,
                textAlign: "center",
                padding: "3px 3px",
              }}
            >
              {groupIndex}
            </th>
            <th
              colSpan={5}
              style={{
                backgroundColor: "#d9d9d9",
                color: "#000000",
                fontWeight: 700,
                fontSize: 7,
                padding: "3px 3px",
                textAlign: "left",
                overflowWrap: "anywhere",
                wordBreak: "break-word",
              }}
            >
              <p style={{ margin: 0, color: "#000000" }}>{title}</p>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                style={{
                  textAlign: "center",
                  padding: "10px",
                  color: "#000000",
                  fontSize: 7,
                  fontWeight: 500,
                }}
              >
                {emptyMsg}
              </td>
            </tr>
          ) : (
            items.map((it, i) => (
              <Fragment key={it.key}>
                <tr>
                  <td
                    style={{
                      fontWeight: 400,
                      textAlign: "center",
                      fontSize: 7,
                      padding: "3px 2px",
                      color: "#000000",
                      borderTop: "0.005px solid #d0d0d0",
                    }}
                  >
                    {groupIndex}.{itemOffset + i + 1}
                  </td>
                  <td
                    colSpan={5}
                    style={{
                      fontWeight: 400,
                      fontSize: 7,
                      padding: "3px 4px",
                      textAlign: "left",
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                      color: "#000000",
                      borderTop: "0.005px solid #d0d0d0",
                    }}
                  >
                    {it.label}
                  </td>
                </tr>
                <tr>
                  <td style={cellStyle}>รายละเอียด</td>
                  <td
                    colSpan={5}
                    style={{
                      padding: "3px 4px",
                      fontSize: 7,
                      color: "#000000",
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                    }}
                  >
                    {it.detail || "-"}
                  </td>
                </tr>
                <tr>
                  <td style={cellStyle}>สถานะ</td>
                  <td
                    colSpan={5}
                    style={{
                      color: isProject ? statusBg(it.status) : "#000000",
                      textAlign: "left",
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                      padding: "3px 4px",
                      fontSize: 7,
                    }}
                  >
                    {isProject ? statusLabel(it.status) : (it.status || "-")}
                  </td>
                </tr>
                <tr>
                  <td style={cellStyle}>หมายเหตุ</td>
                  <td
                    colSpan={5}
                    style={{
                      padding: "3px 4px",
                      fontSize: 7,
                      color: "#000000",
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                    }}
                  >
                    {it.note || "-"}
                  </td>
                </tr>
                {i < items.length - 1 && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        height: 4,
                        padding: 0,
                        border: "none",
                      }}
                    />
                  </tr>
                )}
              </Fragment>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      {renderProjects && (
        <>
          {renderDetailTable(
            processedProjects,
            6,
            "เข้าพบผู้ว่าจ้าง (รายละเอียด)",
            "ยังไม่มีข้อมูลโครงการ",
            true,
            projectOffset,
          )}
        </>
      )}
      {renderMovements && (
        <>
          {renderDetailTable(
            processedMovements,
            7,
            "การเปลี่ยนแปลงจุดรักษาการณ์ (รายละเอียด)",
            "ยังไม่มีข้อมูลการเปลี่ยนแปลงจุดรักษาการณ์",
            false,
            movementOffset,
          )}
        </>
      )}
    </div>
  );
}
