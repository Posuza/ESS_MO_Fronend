import { Fragment } from "react";
import { type PdfGroupItem } from "../utils/PaginationSystem";
import "./secotorDetailContent.css";

type Props = {
  item: any;
  groups?: (string | { key: string })[];
};

const statusBg = (s: string) =>
  s === "warning" ? "#ff9800" : s === "danger" ? "#b71c1c" : "#4caf50";
const statusLabel = (s: string) =>
  ({ normal: "ปกติ", warning: "ผิดปกติ", danger: "ฉุกเฉิน" })[s] ?? "ปกติ";

const cellStyle: React.CSSProperties = {
  fontWeight: 600,
  padding: "4px 6px",
  textAlign: "center",
  fontSize: 12,
  background: "transparent",
  borderRight: "1px solid #e5e7eb",
};

export default function SecotorDetialContent({ item }: Props) {
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
        style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}
      >
        <thead>
          <tr>
            <th
              style={{
                width: "5%",
                backgroundColor: "#003366",
                color: "#fff",
                fontWeight: 800,
                textAlign: "center",
                padding: "4px 6px",
              }}
            >
              6
            </th>
            <th
              colSpan={5}
              style={{
                backgroundColor: "#003366",
                color: "#fff",
                fontWeight: 800,
                padding: "4px 6px",
                textAlign: "left",
              }}
            >
              <p style={{ margin: 0, color: "#fff" }}>
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
                style={{ textAlign: "center", padding: "20px", color: "#888" }}
              >
                ยังไม่มีข้อมูลโครงการ
              </td>
            </tr>
          ) : (
            projects.map((it, i) => {
              const isOdd = i % 2 !== 0;
              const rowStyle = isOdd
                ? { background: "#eff1f3" as const }
                : undefined;
              return (
                <Fragment key={it.key}>
                  <tr style={rowStyle}>
                    <td
                      style={{
                        fontWeight: 600,
                        textAlign: "center",
                        fontSize: 13,
                        padding: "4px 3px",
                        borderLeft: "1px solid #e5e7eb",
                        borderRight: "1px solid #e5e7eb",
                      }}
                    >
                      6.{i + 1}
                    </td>
                    <td
                      colSpan={5}
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        padding: "4px 6px",
                        textAlign: "left",
                      }}
                    >
                      {it.label}
                    </td>
                  </tr>
                  <tr style={rowStyle}>
                    <td style={cellStyle}>รายละเอียด</td>
                    <td
                      colSpan={5}
                      style={{
                        padding: "4px 6px",
                        fontSize: 14,
                        color: "#1b2b4a",
                      }}
                    >
                      {it.detail || "-"}
                    </td>
                  </tr>
                  <tr style={rowStyle}>
                    <td style={cellStyle}>สถานะ</td>
                    <td
                      colSpan={5}
                      style={{
                        color: "#fff",
                        fontWeight: 700,
                        textAlign: "left",
                        padding: "4px 6px",
                        fontSize: 14,
                        background: statusBg(it.status),
                      }}
                    >
                      {statusLabel(it.status)}
                    </td>
                  </tr>
                  <tr style={rowStyle}>
                    <td style={cellStyle}>หมายเหตุ</td>
                    <td
                      colSpan={5}
                      style={{
                        padding: "4px 6px",
                        fontSize: 14,
                        color: "#1b2b4a",
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
                          borderBottom: "1px dashed #ccc",
                          height: 4,
                          padding: 0,
                        }}
                      />
                    </tr>
                  )}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
