import { type PdfGroup, type PdfGroupItem } from "../utils/PaginationSystem";
import "./sectorContent.css";
import logoGuts from "../../../../assets/logo/logo_guts.png";

type Props = {
  item: any;
  groups?: (string | PdfGroup)[];
};

type LocalPdfGroup = {
  key: string;
  title: string;
  items: PdfGroupItem[];
  _itemOffset?: number;
};

// ─── Shared formatDate ────────────────────────────────────────
export function formatDate(data: any): string {
  const rawDate = data.report_date || data.created_at;
  if (!rawDate) return "";
  const d = new Date(
    String(rawDate).includes("T") ? String(rawDate) : `${rawDate}T00:00:00`,
  );
  const months = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ];
  return `วันที่ ${d.getDate()} เดือน ${months[d.getMonth()]} พ.ศ. ${d.getFullYear() + 543} เวลา ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} น.`;
}

// ─── Shared Page Header ─────────────────────────────────────
export function PdfPageHeader({
  pageNo,
  sectorName,
  title,
  data,
  subLocation,
}: {
  pageNo: number;
  sectorName: string;
  title: string;
  data: any;
  subLocation?: string;
}) {
  return (
    <>
      <div className="pdf-header-row">
        <div className="logo-section">
          <img src={logoGuts} alt="GUTS ESS" style={{ height: 80 }} />
        </div>
        <div className="header-divider" />
        <div className="header-text-block">
          <div className="header-text-en">
            <span style={{ color: "#dc2626" }}>E</span>mployee{" "}
            <span style={{ color: "#dc2626" }}>S</span>elf{" "}
            <span style={{ color: "#dc2626" }}>S</span>ervice
          </div>
          <div className="header-text-th">ระบบบริการตนเอง</div>
        </div>
      </div>
      <div className="pdf-title-bar">{title}</div>
      <div className="pdf-meta-row">
        <div className="page-number-badge">
          <span className="page-num">หน้าที่ {pageNo}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="meta-location">
            <span style={{ fontSize: subLocation ? 16 : 23 }}>
              {sectorName || "-"}
            </span>
          </div>
          {subLocation && <span className="meta-location-divider">|</span>}
          {subLocation && (
            <span className="meta-location" style={{ fontSize: 16 }}>
              {subLocation}
            </span>
          )}
        </div>
        <div className="meta-date">{formatDate(data)}</div>
      </div>
    </>
  );
}

// ─── Static Group Definitions ─────────────────────────────────
export const groupDefs: LocalPdfGroup[] = [
  {
    key: "dept",
    title: "หน่วยงานที่รับผิดชอบ",
    items: [
      {
        key: "dept_guard_post_count",
        label: "จุดรักษาการณ์ :",
        unit: "หน่วยงาน",
      },
      {
        key: "dept_current_personnel_count",
        label: "กำลังพลปัจจุบัน :",
        unit: "คน",
      },
      {
        key: "dept_missing_regular_count",
        label: "ขาดตัวประจำ :",
        unit: "หน่วยงาน",
      },
      {
        key: "dept_missing_personnel_count",
        label: "ขาดกำลังพล :",
        unit: "คน",
      },
      {
        key: "dept_supplement_count",
        label: "จัดกำลังพลเสริมพิเศษ :",
        unit: "คน",
      },
      {
        key: "dept_recruitment_count",
        label: "สรรหาผู้สมัครงานใหม่ :",
        unit: "คน",
      },
      {
        key: "dept_reserve_units_count",
        label: "จำนวนหน่วยงานสำรองเวร :",
        unit: "หน่วย",
      },
      {
        key: "dept_reserve_personnel_count",
        label: "จำนวนกำลังพลสำรองเวร :",
        unit: "นาย",
      },
    ],
  },
  {
    key: "leave",
    title: "การลา",
    items: [
      { key: "leave_personal_count", label: "ลากิจ :", unit: "คน" },
      { key: "leave_sick_count", label: "ลาป่วย :", unit: "คน" },
      { key: "leave_absent_count", label: "ขาดงาน :", unit: "คน" },
      { key: "leave_deserted_count", label: "หนีหาย :", unit: "คน" },
      { key: "leave_resigned_count", label: "ลาออก :", unit: "คน" },
      { key: "leave_terminated_count", label: "ไล่ออก :", unit: "คน" },
    ],
  },
  {
    key: "shift",
    title: "การบริหารการครองเวร",
    items: [
      { key: "shift_18_count", label: "18 ชั่วโมง :", unit: "คน" },
      { key: "shift_24_count", label: "24 ชั่วโมง :", unit: "คน" },
      { key: "shift_36_count", label: "36 ชั่วโมง :", unit: "คน" },
    ],
  },
  {
    key: "training",
    title: "อบรมและควบคุมหน้าที่งาน",
    items: [
      {
        key: "training_shift_change_count",
        label: "อบรมเปลี่ยนผลัด :",
        unit: "หน่วยงาน",
      },
      {
        key: "training_planned_count",
        label: "อบรมตามแผนงานที่กำหนด :",
        unit: "หน่วยงาน",
      },
      {
        key: "training_duty_control_count",
        label: "ควบคุมหน้าที่งาน :",
        unit: "หน่วยงาน",
      },
    ],
  },
];

// ─── Discipline Group Builder ────────────────────────────────
export function buildGroup2Disciplines(data: any): LocalPdfGroup[] {
  const raw = (data as any).disciplines ?? [];
  const items =
    Array.isArray(raw) && raw.length > 0
      ? raw
      : [
          {
            key: "discipline_phone_count",
            label: "เล่นโทรศัพท์มือถือ :",
            value: 0,
          },
          { key: "discipline_belt_count", label: "ไม่มีเข็มขัด :", value: 0 },
          { key: "discipline_badge_count", label: "ไม่แขวนบัตร :", value: 0 },
          {
            key: "discipline_uniform_count",
            label: "ชุดชำรุดเก่า :",
            value: 0,
          },
        ];
  return [
    {
      key: "discipline",
      title: "วินัยและการลงโทษ",
      items: items.map((d: any) => ({
        key: d.key ?? d.label,
        label: d.label ?? "-",
        unit: "คน",
        value: d.value ?? 0,
      })),
    },
  ];
}

// ─── Projects Group Builder ─────────────────────────────────
export function buildGroup3Projects(data: any): LocalPdfGroup[] {
  const raw = (data as any).projects ?? [];
  if (!Array.isArray(raw)) return [];
  return [
    {
      key: "meeting",
      title: "เข้าพบผู้ว่าจ้าง",
      items: raw.map((p: any) => ({
        key: p.id ?? p.name,
        label: p.project_name ?? p.name ?? "-",
        detail: p.detail ?? "",
        status: p.status ?? "normal",
        note: p.note ?? "",
      })),
    },
  ];
}

// ─── Helpers ─────────────────────────────────────────────────
const statusBg = (s: string) =>
  s === "warning" ? "#ff9800" : s === "danger" ? "#b71c1c" : "#4caf50";
const statusLabel = (s: string) =>
  ({ normal: "ปกติ", warning: "ผิดปกติ", danger: "ฉุกเฉิน" })[s] ?? "ปกติ";

// ─── Component ──────────────────────────────────────────────
export default function SectorContent({ item, groups }: Props) {
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

  // All possible group definitions in display order (for index numbering)
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
        const headerBg = isDiscipline ? "#9b111e" : "#003366";

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
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th
                    style={{
                      width: "5%",
                      backgroundColor: headerBg,
                      color: "#fff",
                      fontWeight: 800,
                      padding: "2px 3px",
                      textAlign: "left",
                    }}
                  >
                    {idx + 1}.
                  </th>
                  <th
                    colSpan={3}
                    style={{
                      backgroundColor: headerBg,
                      color: "#fff",
                      fontWeight: 800,
                      padding: "2px 3px",
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
                        padding: "12px",
                        color: "#888",
                      }}
                    >
                      {isGroup3 ? "ไม่มีข้อมูล" : "-"}
                    </td>
                  </tr>
                ) : isGroup3 ? (
                  g.items.map((it: any, i: number) => {
                    const itemNum = (g._itemOffset || 0) + i + 1;
                    const rowStyle =
                      i % 2 !== 0
                        ? ({ background: "#eff1f3" } as React.CSSProperties)
                        : undefined;
                    return (
                      <tr key={it.key || i} style={rowStyle}>
                        <td
                          style={{
                            fontWeight: 800,
                            fontSize: 11,
                            padding: "4px 3px",
                            borderLeft: "1px solid #e5e7eb",
                            borderRight: "1px solid #e5e7eb",
                            verticalAlign: "middle",
                          }}
                        >
                          {idx + 1}.{itemNum}
                        </td>
                        <td
                          colSpan={2}
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            padding: "4px 6px",
                            textAlign: "left",
                          }}
                        >
                          {it.label}
                        </td>
                        <td
                          style={{
                            color: "#fff",
                            fontWeight: 700,
                            textAlign: "center",
                            padding: "4px 6px",
                            fontSize: 12,
                            background: statusBg(it.status),
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
                    const bg = i % 2 !== 0 ? "#eff1f3" : "";
                    const value = isDiscipline
                      ? String(r.value ?? 0)
                      : String((data as any)[r.key] ?? 0);
                    return (
                      <tr key={r.key} style={{ background: bg }}>
                        <td
                          style={{
                            fontWeight: 800,
                            fontSize: 11,
                            padding: "4px 3px",
                            borderLeft: "1px solid #e5e7eb",
                            borderRight: "1px solid #e5e7eb",
                          }}
                        >
                          {idx + 1}.{itemNum}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 600,
                            fontSize: 11,
                            padding: "4px 3px",
                          }}
                        >
                          {r.label}
                        </td>
                        <td
                          style={{
                            textAlign: "center",
                            fontWeight: 700,
                            fontSize: 11,
                            padding: "4px 2px",
                            minWidth: 32,
                          }}
                        >
                          {value}
                        </td>
                        <td
                          style={{
                            textAlign: "center",
                            fontSize: 10,
                            padding: "4px 3px",
                            minWidth: 30,
                            borderRight: "1px solid #e5e7eb",
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
