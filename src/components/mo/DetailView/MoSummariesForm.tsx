import React, { useEffect, useMemo } from "react";
import styles from "./MoSummariesForm.module.css";
import { useStore } from "../../../store/store";

export type EmployeeLocation = {
  id: number;
  location: string;
  sub_locations: string[];
};

type Props = {
  onCancel?: () => void;
  selectedLocation?: string;
  empCode?: string;
  locations?: EmployeeLocation[];
  departmentId?: number | null;
  selectedDate?: string;
};

interface GroupItem {
  key: string;
  label: string;
  unit?: string;
  status?: string;
}

interface Group {
  key: string;
  title: string;
  items: GroupItem[];
}

interface StatusOption {
  label: string;
  key: string;
}

export default function MoSummariesForm(props: Props) {
  const { authEmployee, fetchReports, reports, isLoading } = useStore();

  // ── Fetch reports on mount / when filters change ─────────────────────────
  useEffect(() => {
    const filters: {
      department_id?: number;
      start_date?: string;
      end_date?: string;
    } = {};

    if (props.departmentId != null) {
      filters.department_id = props.departmentId;
    } else if (authEmployee?.department_id) {
      filters.department_id = authEmployee.department_id;
    }

    if (props.selectedDate) {
      filters.start_date = props.selectedDate;
      filters.end_date = props.selectedDate;
    }

    fetchReports(filters);
  }, [props.departmentId, props.selectedDate, authEmployee?.department_id]);

  // ── Derive locations from fetched reports ────────────────────────────────
  const derivedLocations: EmployeeLocation[] = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    (reports || []).forEach((r) => {
      const id = Number(r.department_id) || 0;
      const sub = (r.division_name || "").trim();
      if (!map[id]) map[id] = new Set();
      if (sub) map[id].add(sub);
    });
    return Object.keys(map).map((k) => ({
      id: Number(k),
      location: `Department ${k}`,
      sub_locations: Array.from(map[k]),
    }));
  }, [reports]);

  const locations =
    props.locations && props.locations.length > 0
      ? props.locations
      : derivedLocations;

  const selectedSector = useMemo(() => {
    return (
      props.departmentId ?? authEmployee?.department_id ?? locations[0]?.id ?? 1
    );
  }, [props.departmentId, authEmployee?.department_id, locations]);

  // ── Static group definitions ─────────────────────────────────────────────
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

  // ── Filter reports matching selected sector + date ───────────────────────
  // Each report = one division_name's submission for that day
  const sectorReports = useMemo(() => {
    return (reports || []).filter((r) => {
      const deptMatch = Number(r.department_id) === Number(selectedSector);
      const dateMatch = props.selectedDate
        ? r.report_date === props.selectedDate ||
          (r.created_at &&
            new Date(r.created_at).toISOString().slice(0, 10) ===
              props.selectedDate)
        : true;
      const approvalMatch = r.approved_status === "APPROVED";
      return deptMatch && dateMatch && approvalMatch;
    });
  }, [reports, selectedSector, props.selectedDate]);

  // ── Column list: one column per division_name report ─────────────────────
  const cols = useMemo(() => {
    // deduplicate by division_name, keeping first occurrence
    const seen = new Set<string>();
    return sectorReports.filter((r) => {
      if (seen.has(r.division_name)) return false;
      seen.add(r.division_name);
      return true;
    });
  }, [sectorReports]);

  // ── Helper: get numeric value for a field key from a specific report ─────
  const getVal = (
    report: (typeof sectorReports)[0],
    fieldKey: string,
  ): number => {
    // group5 disciplines (dynamic array)
    if (fieldKey.startsWith("disc_")) {
      const discKey = fieldKey.replace("disc_", "");
      const disc = report.disciplines?.find((d) => d.key === discKey);
      return disc ? Number(disc.value) || 0 : 0;
    }
    return Number((report as any)[fieldKey]) || 0;
  };

  // ── Derive dynamic group2 (วินัยและการลงโทษ) from disciplines in reports ─
  const group2: Group[] = useMemo(() => {
    const disciplineMap = new Map<string, { key: string; label: string }>();
    sectorReports.forEach((r) => {
      (r.disciplines || []).forEach((d) => {
        console.log("📌 DISCIPLINE found:", d.key, d.label, d.value);
        if (!disciplineMap.has(d.key)) {
          disciplineMap.set(d.key, { key: `disc_${d.key}`, label: d.label });
        }
      });
    });
    console.log(
      "📊 group2 disciplineMap size:",
      disciplineMap.size,
      "items:",
      Array.from(disciplineMap.keys()),
    );

    const items: GroupItem[] =
      disciplineMap.size > 0
        ? Array.from(disciplineMap.values()).map((d) => ({
            key: d.key,
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
  }, [sectorReports]);

  // ── Derive dynamic group3 (เข้าพบผู้ว่าจ้าง) from projects in reports ────
  const group3: Group[] = useMemo(() => {
    const projectMap = new Map<
      string,
      { id: string; label: string; status: string }
    >();
    sectorReports.forEach((r) => {
      (r.projects || []).forEach((p) => {
        console.log("📌 PROJECT found:", p.id, p.name, p.status, p.detail);
        if (!projectMap.has(p.id)) {
          projectMap.set(p.id, {
            id: p.id,
            label: p.project_name ?? p.name ?? "-",
            status: p.status || "normal",
          });
        }
      });
    });
    console.log(
      "📊 group3 projectMap size:",
      projectMap.size,
      "items:",
      Array.from(projectMap.keys()),
    );

    const items: GroupItem[] = Array.from(projectMap.values()).map((p) => ({
      key: `proj_${p.id}`,
      label: p.label,
      unit: "หน่วยงาน",
      status: p.status,
    }));

    return [{ key: "6", title: "เข้าพบผู้ว่าจ้าง", items }];
  }, [sectorReports]);

  // ── Helper: get project value for a column report ────────────────────────
  const getProjectVal = (
    report: (typeof sectorReports)[0],
    projId: string,
  ): { value: number; status: string } => {
    const proj = report.projects?.find((p) => p.id === projId);
    return {
      value: proj ? 1 : 0,
      status: proj?.status ?? "normal",
    };
  };

  // ── Render a single summary table section ────────────────────────────────
  const renderGroupTable = (
    g: Group,
    groupIdx: number,
    headerClass: string,
    cellClass: string,
  ) => {
    const headerColSpan = cols.length + 4;

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
                colSpan={headerColSpan}
                className={`${styles["mo-table-header"]} ${headerClass} ${styles["no-border"]}`}
              >
                <div className={styles["mo-header"]}>
                  <p>{g.title}</p>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Column headers */}
            <tr>
              <td colSpan={2} className={styles["second-column-header-cell"]}>
                หัวข้อ
              </td>
              {cols.map((c) => (
                <td
                  key={c.division_name}
                  className={styles["third-column-header1-cell"]}
                >
                  {(() => {
                    const name = String(c.division_name ?? "");
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
                </td>
              ))}
              <td className={styles["third-column-header2-cell"]}>รวม</td>
              <td className={styles["fourth-column-header-cell"]} />
            </tr>

            {/* Data rows */}
            {g.items.map((item, itemIdx) => {
              const isProject = item.key.startsWith("proj_");
              const projId = isProject ? item.key.replace("proj_", "") : "";

              const perLocVals = cols.map((c) => {
                const report = sectorReports.find(
                  (r) => r.division_name === c.division_name,
                );
                if (!report) return 0;
                if (isProject) return getProjectVal(report, projId).value;
                return getVal(report, item.key);
              });

              const total = perLocVals.reduce((a, v) => a + v, 0);

              return (
                <tr key={item.key}>
                  <td className={styles["first-column-cell"]}>
                    {groupIdx + 1}.{itemIdx + 1}
                  </td>
                  <td className={styles["second-column-cell"]}>{item.label}</td>

                  {perLocVals.map((val, i) => (
                    <td
                      key={i}
                      className={`${styles["third-column-cell"]} ${
                        String(val).length > 4
                          ? styles["third-column-wrap-cell"]
                          : ""
                      }`}
                    >
                      <div className={styles["third-column-text"]}>
                        {String(val)}
                      </div>
                    </td>
                  ))}

                  <td className={styles["third-column-cell"]}>
                    <div className={styles["third-column-text"]}>
                      {String(total)}
                    </div>
                  </td>

                  <td
                    className={`${styles["fourth-column-cell"]} ${cellClass}`}
                  >
                    {item.unit}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderPrjectTable = (
    g: Group,
    groupIdx: number,
    headerClass: string,
    cellClass: string,
  ) => {
    const headerColSpan = cols.length + 4;

    // ── Status helpers ─────────────────────────────────────────────────
    const statusClass = (s: string): string => {
      if (s === "normal") return styles["status-normal"];
      if (s === "warning") return styles["status-warning"];
      if (s === "danger") return styles["status-danger"];
      return styles["status-normal"];
    };

    const statusLabel = (s: string): string => {
      if (s === "normal") return "ปกติ";
      if (s === "warning") return "ผิดปกติ";
      if (s === "danger") return "ฉุกเฉิน";
      return s;
    };

    const statusTextColor = (s: string): string => {
      if (s === "normal") return "#4caf50";
      if (s === "warning") return "#ff9800";
      if (s === "danger") return "#b71c1c";
      return "#4caf50";
    };

    // Collect all unique status types from all projects across all reports
    const allStatuses = new Set<string>();
    sectorReports.forEach((r) => {
      (r.projects || []).forEach((p) => {
        allStatuses.add(p.status || "normal");
      });
    });
    const statusTypes =
      allStatuses.size > 0
        ? Array.from(allStatuses)
        : ["normal", "warning", "danger"];

    // For each division_name, count projects by status
    const perLocCounts: Record<string, number>[] = cols.map((c) => {
      const report = sectorReports.find(
        (r) => r.division_name === c.division_name,
      );
      const counts: Record<string, number> = {};
      statusTypes.forEach((s) => (counts[s] = 0));
      if (report) {
        (report.projects || []).forEach((p) => {
          const s = p.status || "normal";
          counts[s] = (counts[s] || 0) + 1;
        });
      }
      return counts;
    });

    // Total counts across all division_names
    const totalCounts = perLocCounts.reduce<Record<string, number>>(
      (acc, loc) => {
        Object.entries(loc).forEach(([s, c]) => {
          acc[s] = (acc[s] || 0) + c;
        });
        return acc;
      },
      {},
    );

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
                colSpan={headerColSpan}
                className={`${styles["mo-table-header"]} ${headerClass} ${styles["no-border"]}`}
              >
                <div className={styles["mo-header"]}>
                  <p>{g.title}</p>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Column headers */}
            <tr>
              <td colSpan={2} className={styles["second-column-header-cell"]}>
                <strong>หัวข้อ</strong>
              </td>
              {cols.map((c) => (
                <td
                  key={c.division_name}
                  className={styles["third-column-header1-cell"]}
                >
                  <strong>
                    {(() => {
                      const name = String(c.division_name ?? "");
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
              <td className={styles["third-column-header2-cell"]}>รวม</td>
              <td className={styles["fourth-column-header-cell"]} />
            </tr>

            {/* Data rows — one row per status type */}
            {statusTypes.map((status, idx) => (
              <tr key={status}>
                <td className={styles["first-column-cell"]}>
                  {groupIdx + 1}.{idx + 1}
                </td>
                <td
                  className={`${styles["second-column-cell"]} ${statusClass(
                    status,
                  )}`}
                >
                  {statusLabel(status)}
                </td>

                {perLocCounts.map((counts, i) => (
                  <td key={i} className={styles["group3-third-column-cell"]}>
                    <span
                      style={{
                        color: statusTextColor(status),
                        fontWeight: 800,
                      }}
                    >
                      {counts[status]}
                    </span>
                  </td>
                ))}

                <td className={styles["third-column-cell"]}>
                  <div className={styles["third-column-text"]}>
                    {totalCounts[status] || 0}
                  </div>
                </td>

                <td className={`${styles["fourth-column-cell"]} ${cellClass}`}>
                  หน่วยงาน
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={styles["guts-Mo-layout"]}>
        <p style={{ padding: "1rem" }}>กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={styles["guts-Mo-layout"]}>
      <div className={styles["mo-tables-wrapper"]}>
        {/* Group 1 — หน่วยงานที่รับผิดชอบ / การลา / ควงเวร / อบรม */}
        {group1.map((g, idx) => renderGroupTable(g, idx, "", ""))}

        {/* Group 2 — วินัยและการลงโทษ (red) */}
        {group2.map((g, idx) =>
          renderGroupTable(
            g,
            group1.length + idx,
            styles["mo-table-header-red"],
            styles["fourth-column-cell-danger"],
          ),
        )}

        {/* Group 3 — เข้าพบผู้ว่าจ้าง (status) */}
        {group3.map((g, idx) =>
          renderPrjectTable(
            g,
            group1.length + group2.length + idx,
            styles["mo-table-header-green"],
            styles["fourth-column-cell-success"],
          ),
        )}

        {/* Notes — read-only from last matching report */}
        {(() => {
          const lastReport = sectorReports[sectorReports.length - 1];
          return lastReport ? null : null; // extend here if notes are added to SectorReport type
        })()}
      </div>
    </div>
  );
}
