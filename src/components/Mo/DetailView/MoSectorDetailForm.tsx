import React, { useEffect, useMemo } from "react";
import styles from "./MoSummariesForm.module.css";
import { useStore } from "../../../store/store";

type Props = {
  onCancel?: () => void;
  selectedTransactionId?: number | null;
};

interface GroupItem {
  key: string;
  label: string;
  unit?: string;
}

interface Group {
  key: string;
  title: string;
  items: GroupItem[];
}

export default function MoSectorDetailForm(props: Props) {
  const { fetchReportById, currentReport, reports } = useStore();

  useEffect(() => {
    if (props.selectedTransactionId) {
      fetchReportById(props.selectedTransactionId);
    }
  }, [props.selectedTransactionId, fetchReportById]);

  const reportData =
    currentReport?.id === props.selectedTransactionId
      ? currentReport
      : ((reports ?? []).find((r) => r.id === props.selectedTransactionId) ??
        null);

  const rd = reportData as unknown as Record<string, unknown> | null;

  // ── Static group definitions (same keys as MoSummariesForm) ─────────────
  const group1: Group[] = [
    {
      key: "1",
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
      key: "2",
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
      key: "3",
      title: "การบริหารการควงเวร",
      items: [
        { key: "shift_18_count", label: "18 ชั่วโมง :", unit: "คน" },
        { key: "shift_24_count", label: "24 ชั่วโมง :", unit: "คน" },
        { key: "shift_36_count", label: "36 ชั่วโมง :", unit: "คน" },
      ],
    },
    {
      key: "4",
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

  // ── Dynamic group2: disciplines ──────────────────────────────────────────
  const group2: Group[] = useMemo(() => {
    if (!reportData) return [];
    const disciplines = (reportData as any).disciplines || [];
    const items: GroupItem[] =
      disciplines.length > 0
        ? disciplines.map((d: any) => ({
            key: `disc_${d.key}`,
            label: d.label + " :",
            unit: "คน",
          }))
        : [
            {
              key: "disc_discipline_phone_count",
              label: "เล่นโทรศัพท์มือถือ :",
              unit: "คน",
            },
            {
              key: "disc_discipline_belt_count",
              label: "ไม่มีเข็มขัด :",
              unit: "คน",
            },
            {
              key: "disc_discipline_badge_count",
              label: "ไม่แขวนบัตร :",
              unit: "คน",
            },
            {
              key: "disc_discipline_uniform_count",
              label: "ชุดชำรุดเก่า :",
              unit: "คน",
            },
          ];
    return [{ key: "5", title: "วินัยและการลงโทษ", items }];
  }, [reportData]);

  // ── Dynamic group3: projects ─────────────────────────────────────────────
  const group3: Group[] = useMemo(() => {
    if (!reportData) return [];
    const projects = (reportData as any).projects || [];
    const items: GroupItem[] = projects.map((p: any) => ({
      key: `proj_${p.id}`,
      label: p.project_name ?? p.name ?? "-",
      unit: "หน่วยงาน",
    }));
    return [{ key: "6", title: "เข้าพบผู้ว่าจ้าง", items }];
  }, [reportData]);

  // ── Value resolver ───────────────────────────────────────────────────────
  const getVal = (fieldKey: string): string => {
    if (!rd) return "0";
    if (fieldKey.startsWith("disc_")) {
      const discKey = fieldKey.replace("disc_", "");
      const disc = ((rd.disciplines as any[]) || []).find(
        (d) => d.key === discKey,
      );
      return String(disc ? Number(disc.value) || 0 : 0);
    }
    if (fieldKey.startsWith("proj_")) {
      const projId = fieldKey.replace("proj_", "");
      const proj = ((rd.projects as any[]) || []).find((p) => p.id === projId);
      return proj ? "1" : "0";
    }
    return String(Number(rd[fieldKey]) || 0);
  };

  // ── Render one group table ───────────────────────────────────────────────
  const renderGroupTable = (
    g: Group,
    groupIdx: number,
    headerClass: string,
    cellClass: string,
  ) => (
    <div className={styles["mo-table-wrapper"]} key={g.key}>
      <table className={styles["mo-table"]}>
        <thead>
          <tr>
            <th
              colSpan={1}
              className={`${styles["first-column-cell"]} ${styles["no-border"]} ${headerClass}`}
            >
              {groupIdx + 1}.
            </th>
            <th
              colSpan={3}
              className={`${styles["mo-table-header"]} ${headerClass} ${styles["no-border"]}`}
            >
              <div className={styles["mo-header"]}>
                <p>{g.title}</p>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {g.items.map((item, itemIdx) => (
            <tr key={item.key}>
              <td className={styles["first-column-cell"]}>
                {groupIdx + 1}.{itemIdx + 1}
              </td>
              <td className={styles["second-column-cell"]}>{item.label}</td>
              <td className={styles["third-column-cell"]}>
                <div className={styles["third-column-text"]}>
                  {getVal(item.key)}
                </div>
              </td>
              <td className={`${styles["fourth-column-cell"]} ${cellClass}`}>
                {item.unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ── Project group: show status label instead of count ───────────────────
  const renderProjectTable = (
    g: Group,
    groupIdx: number,
    headerClass: string,
  ) => {
    if (!rd) return null;
    const projects = (rd.projects as any[]) || [];

    const statusLabel = (s: string) => {
      if (s === "normal") return "ปกติ";
      if (s === "warning") return "ผิดปกติ";
      if (s === "danger") return "ฉุกเฉิน";
      return s;
    };

    return (
      <div className={styles["mo-table-wrapper"]} key={g.key}>
        <table className={styles["mo-table"]}>
          <thead>
            <tr>
              <th
                colSpan={1}
                className={`${styles["first-column-cell"]} ${styles["no-border"]} ${headerClass}`}
              >
                {groupIdx + 1}.
              </th>
              <th
                colSpan={3}
                className={`${styles["mo-table-header"]} ${headerClass} ${styles["no-border"]}`}
              >
                <div className={styles["mo-header"]}>
                  <p>{g.title}</p>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className={styles["second-column-cell"]}
                  style={{
                    textAlign: "center",
                    color: "#9ca3af",
                    fontStyle: "italic",
                  }}
                >
                  ไม่มีข้อมูลโครงการ
                </td>
              </tr>
            ) : (
              projects.map((p: any, idx: number) => (
                <tr key={p.id}>
                  <td className={styles["first-column-cell"]}>
                    {groupIdx + 1}.{idx + 1}
                  </td>
                  <td className={styles["second-column-cell"]}>
                    {p.project_name ?? p.name ?? "-"}
                  </td>
                  <td
                    className={`${styles["group3-third-column-cell"]} ${styles[`status-${p.status || "normal"}`]}`}
                  >
                    {statusLabel(p.status || "normal")}
                  </td>
                  <td
                    className={`${styles["fourth-column-cell"]} ${styles["fourth-column-cell-success"]}`}
                  >
                    หน่วยงาน
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  // ── Loading / no data ────────────────────────────────────────────────────
  if (!reportData) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
        กำลังโหลดข้อมูล...
      </div>
    );
  }

  // ── Meta info row (division + date + status) ─────────────────────────────
  const sub = (() => {
    const val = String(rd?.division_name ?? "");
    const m = val.match(/เขต\s+[\d.]+/);
    return m ? m[0] : val || "-";
  })();
  const reportDate =
    (rd?.report_date as string) ||
    ((rd?.created_at as string)?.slice(0, 10) ?? "-");
  const status = (rd?.approved_status as string) || "PENDING";

  const statusBg: Record<string, string> = {
    approved: "#0277bd",
    pending: "#ff9800",
    rejected: "#b71c1c",
    reject: "#b71c1c",
  };
  const statusTh: Record<string, string> = {
    approved: "ดำเนินการแล้ว",
    pending: "รอการดำเนินการ",
    rejected: "ถูกปฏิเสธ",
    reject: "ถูกปฏิเสธ",
  };
  const statusKey = status.toLowerCase();

  return (
    <div className={styles["guts-Mo-layout"]}>
      <div className={styles["mo-tables-wrapper"]}>
        {/* ── Data groups ── */}
        {group1.map((g, idx) => renderGroupTable(g, idx, "", ""))}

        {group2.map((g, idx) =>
          renderGroupTable(
            g,
            group1.length + idx,
            styles["mo-table-header-red"],
            styles["fourth-column-cell-danger"],
          ),
        )}

        {group3.map((g, idx) =>
          renderProjectTable(
            g,
            group1.length + group2.length + idx,
            styles["mo-table-header-green"],
          ),
        )}
      </div>
    </div>
  );
}
