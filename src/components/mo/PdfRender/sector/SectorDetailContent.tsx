// ─────────────────────────────────────────────────────────────
// Sector PDF — Project Detail Content
// (renamed from secotorDetailContent.tsx — fixed typo: secotor → sector)
//
// Renders the per-project detail table (project name, detail, status, note).
// ─────────────────────────────────────────────────────────────

import { Fragment } from "react";
import { type PdfGroupItem } from "../shared/PaginationSystem";
import "./SectorDetailContent.module.css";

type Props = {
  item: any;
};

const statusBg = (s: string) =>
  s === "warning" ? "#ff9800" : s === "danger" ? "#b71c1c" : "#4caf50";
const statusLabel = (s: string) =>
  ({ normal: "ปกติ", warning: "ผิดปกติ", danger: "ฉุกเฉิน" })[s] ?? "ปกติ";

const cellStyle: React.CSSProperties = {
  fontWeight: 400,
  padding: "6px 6px",
  textAlign: "center",
  fontSize: 8,
  background: "transparent",
};

export default function SectorDetailContent({ item }: Props) {
  const data = item;
  let keyCounter = 0;
  const projects: PdfGroupItem[] = ((data as any).projects || []).map(
    (p: any) => ({
      key: p.id ?? p.key ?? `detail-${keyCounter++}`,
      label: p.project_name ?? p.name ?? p.label ?? "-",
      detail: p.detail ?? "",
      status: p.status ?? "normal",
      note: p.note ?? "",
    }),
  );

  return (
    <div>
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
                width: "5%",
                backgroundColor: "#d9d9d9",
                color: "#000000",
                fontWeight: 700,
                fontSize: 8,
                textAlign: "center",
                padding: "6px 4px",
              }}
            >
              6
            </th>
            <th
              colSpan={5}
              style={{
                backgroundColor: "#d9d9d9",
                color: "#000000",
                fontWeight: 700,
                fontSize: 8,
                padding: "6px 4px",
                textAlign: "left",
              }}
            >
              <p style={{ margin: 0, color: "#000000" }}>
                เข้าพบผู้ว่าจ้าง (รายละเอียด)
              </p>
            </th>
          </tr>
        </thead>
        <tbody>
          {projects.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                style={{
                  textAlign: "center",
                  padding: "16px",
                  color: "#000000",
                  fontSize: 8,
                  fontWeight: 500,
                }}
              >
                ยังไม่มีข้อมูลโครงการ
              </td>
            </tr>
          ) : (
            projects.map((it, i) => (
              <Fragment key={it.key}>
                <tr>
                  <td
                    style={{
                      fontWeight: 400,
                      textAlign: "center",
                      fontSize: 8,
                      padding: "6px 3px",
                    }}
                  >
                    6.{i + 1}
                  </td>
                  <td
                    colSpan={5}
                    style={{
                      fontWeight: 400,
                      fontSize: 8,
                      padding: "6px 6px",
                      textAlign: "left",
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
                      padding: "6px 6px",
                      fontSize: 8,
                      color: "#000000",
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
                      color: statusBg(it.status),
                      fontWeight: 700,
                      textAlign: "left",
                      padding: "6px 6px",
                      fontSize: 8,
                    }}
                  >
                    {statusLabel(it.status)}
                  </td>
                </tr>
                <tr>
                  <td style={cellStyle}>หมายเหตุ</td>
                  <td
                    colSpan={5}
                    style={{
                      padding: "6px 6px",
                      fontSize: 8,
                      color: "#000000",
                    }}
                  >
                    {it.note || "-"}
                  </td>
                </tr>
                {i < projects.length - 1 && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        height: 8,
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
}
