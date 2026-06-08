import { useState, useMemo, useEffect } from "react";
import { Search, ChevronRight, ArrowLeft, HomeIcon } from "lucide-react";
import styles from "./MoListPage.module.css";
import { useStore } from "../../store/store";
import type { SectorReport } from "../../store/store";

const DEPARTMENT_NAMES: Record<number, string> = {
  4: "ฝ่ายปฎิบัติการภาค 1",
  6: "ฝ่ายปฎิบัติการภาค 3",
  9: "ฝ่ายปฎิบัติการภาค 9 (ทดสอบ)",
};

type ReportListItem = SectorReport & {
  location?: string;
  create_at?: string;
  user_id?: string | number;
  wear_pants_count?: number | string;
  wear_shoes_count?: number | string;
};

type Props = {
  onCancel: () => void;
  onOpenDetail: (item: SectorReport) => void;
  onOpenReport?: (deptId: number, date: string) => void;
};

export default function MoListPage({
  onCancel,
  onOpenDetail,
  onOpenReport,
}: Props) {
  const authEmployee = useStore((s) => s.authEmployee);
  const empCode = authEmployee?.employee_code;
  const [selectedDate, setSelectedDate] = useState("");

  const currentDept = useMemo<{ id: number; name: string } | null>(() => {
    if (authEmployee?.department_id && authEmployee?.department_name) {
      return {
        id: Number(authEmployee.department_id),
        name: authEmployee.department_name,
      };
    }
    return null;
  }, [authEmployee]);

  const [selectedLocation, setSelectedLocation] = useState<string>(
    currentDept?.name ?? "",
  );

  const reports = useStore((state) => state.reports);
  const currentEmployee = useStore((state) => state.authEmployee);
  const fetchReports = useStore((state) => state.fetchReports);

  function submitSearch() {
    if (!selectedLocation && !selectedDate) return;

    // Determine department id from selectedLocation (handles "Dept | sub" and numeric dept names)
    let targetSectorId: number | undefined = undefined;
    if (selectedLocation) {
      // If user selected their own department name
      if (
        currentEmployee &&
        selectedLocation === currentEmployee.department_name
      ) {
        targetSectorId = currentEmployee.department_id as number;
      } else {
        // Try to parse a department number from the location string (e.g. "ฝ่ายปฏิบัติการภาค 4" or "Name | sub")
        const deptPart = selectedLocation.split("|")[0].trim();
        const match = deptPart.match(/(\d+)/);
        if (match) targetSectorId = Number(match[1]);
      }
    }

    const payload: Record<string, any> = {};
    if (targetSectorId) payload.department_id = targetSectorId;
    if (selectedDate) {
      payload.start_date = selectedDate;
      payload.end_date = selectedDate;
    }

    fetchReports(payload);
  }

  function goBack() {
    if (onCancel) {
      onCancel();
    } else {
      window.history.back();
    }
  }

  // --- Approval status helpers ---

  function toApprovalStatus(value?: string): "PENDING" | "APPROVED" | "REJECT" {
    if (value === "APPROVED" || value === "REJECT" || value === "PENDING") {
      return value;
    }
    return "PENDING";
  }

  function approvalStatusLabel(value?: string): string {
    const status = toApprovalStatus(value);
    if (status === "APPROVED") return "อนุมัติ";
    if (status === "REJECT") return "ไม่อนุมัติ";
    return "รออนุมัติ";
  }

  function approvalStatusClass(value?: string): string {
    const status = toApprovalStatus(value);
    if (status === "APPROVED") return styles["item-status-approved"];
    if (status === "REJECT") return styles["item-status-reject"];
    return styles["item-status-pending"];
  }

  function ApprovalStatusIcon({ value }: { value?: string }) {
    const status = toApprovalStatus(value);
    if (status === "APPROVED") return <span>✓</span>;
    if (status === "REJECT") return <span>✕</span>;
    return <span>…</span>;
  }

  function getDepartmentName(deptId: number): string {
    return DEPARTMENT_NAMES[deptId] ?? `ฝ่ายปฏิบัติการภาค ${deptId}`;
  }

  // --- Derived data ---

  const employeeLocations = useMemo(
    () =>
      currentEmployee?.department_name ? [currentEmployee.department_name] : [],
    [currentEmployee?.department_name],
  );

  /* derive department -> location mapping from NewCase fixture */
  const derivedLocations = useMemo(() => {
    try {
      const rows = reports;
      const map: Record<string, Set<string>> = {};
      rows.forEach((r: any) => {
        const id = Number(r.department_id) || 0;
        const sub = (r.sub_location ? String(r.sub_location) : "").trim();
        if (!map[id]) map[id] = new Set();
        if (sub) map[id].add(sub);
      });
      return Object.keys(map).map((k) => ({
        id: Number(k),
        location: getDepartmentName(Number(k)),
        sub_locations: Array.from(map[k]),
      }));
    } catch (_e) {
      return [] as any;
    }
  }, [reports]);

  const mappedReports: ReportListItem[] = reports.map((r: SectorReport) => ({
    ...r,
    location:
      r.department_id === currentEmployee?.department_id &&
      currentEmployee?.department_name
        ? currentEmployee.department_name
        : getDepartmentName(r.department_id),
    create_at: r.created_at,
    user_id: r.created_by,
  }));

  const allSectorRecords = mappedReports;

  const uniqueLocations = Array.from(
    new Set(allSectorRecords.map((r) => r.location).filter(Boolean)),
  ).sort() as string[];

  // Only show department-level options (no sub-locations) in the select dropdown
  const locationOptions = useMemo(() => {
    const deptOnly = derivedLocations.map((d) => d.location);

    if (empCode) {
      if (employeeLocations.length > 0) return employeeLocations;
      return deptOnly.length > 0 ? deptOnly : uniqueLocations;
    }

    return deptOnly.length > 0 ? deptOnly : uniqueLocations;
  }, [empCode, employeeLocations, derivedLocations, uniqueLocations]);

  const selectedSectorName =
    selectedLocation || currentEmployee?.department_name || "";

  const statusLabels = [
    { status: "done", label: "ดำเนินการแล้ว", cssClass: styles["status-done"] },
    {
      status: "undergo",
      label: "อยู่ระหว่างดำเนินการ",
      cssClass: styles["status-undergo"],
    },
    {
      status: "waited",
      label: "รอการดำเนินการ",
      cssClass: styles["status-waited"],
    },
    {
      status: "rejected",
      label: "ถูกปฏิเสธ",
      cssClass: styles["status-rejected"],
    },
    {
      status: "undone",
      label: "ยังไม่ได้ดำเนินการ",
      cssClass: styles["status-undone"],
    },
  ];
  /*
   * Main data source for the list.
   * Uses store reports when available (from API/search), otherwise falls back
   * to NewCase table1 data with enriched display fields.
   */
  const filteredData = useMemo(() => {
    if (selectedSectorName) {
      return allSectorRecords.filter((r) => r.location === selectedSectorName);
    }
    return allSectorRecords;
  }, [allSectorRecords, selectedSectorName]);

  // Auto-initialize with today's date on mount
  useEffect(() => {
    if (!currentDept?.id) return;
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
    fetchReports({
      department_id: currentDept.id,
      start_date: today,
      end_date: today,
    });
  }, [currentDept]);

  return (
    <>
      <div className={styles["mo-back-outer"]}>
        <button
          type="button"
          className={styles["mo-back-btn"]}
          onClick={goBack}
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      <div className={styles["mo-search"]}>
        <select
          value={selectedLocation}
          onChange={(e) => {
            setSelectedLocation(e.target.value);
          }}
          className={styles["guts-mo-search-input"]}
        >
          {(empCode ? employeeLocations : locationOptions).map(
            (location: string) => (
              <option key={location} value={location}>
                {location}
              </option>
            ),
          )}
        </select>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
          }}
          className={styles["guts-mo-search-input"]}
          max={new Date().toISOString().split("T")[0]}
        />
        <button
          className={styles["mo-search-clear"]}
          aria-label="Search"
          onClick={submitSearch}
          type="button"
          disabled={!selectedLocation && !selectedDate}
        >
          <Search />
        </button>
      </div>

      <div className={styles["location-list"]}>
        <div className={styles["location-header"]}>
          บันทึก ({Math.min(5, filteredData.length)} รายการ)
          {selectedDate ? (
            <p className={styles["result-date"]}>
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("th-TH")}
            </p>
          ) : null}
        </div>

        {(() => {
          // Group by department (like MoHome.tsx groupedByDepartment pattern)
          const groupMap: Record<string, any[]> = {};
          filteredData.slice(0, 4).forEach((r: any) => {
            const deptName =
              r.departmentName ?? getDepartmentName(Number(r.department_id));
            if (!groupMap[deptName]) groupMap[deptName] = [];
            groupMap[deptName].push(r);
          });
          return Object.entries(groupMap).map(([deptName, items]) => {
            // Aggregate stats for the department
            const deptId = Number(items[0]?.department_id);

            return (
              <div key={deptName}>
                {/* Department header row (distinct classes to avoid style collision) */}
                <div className={styles["department"]}>
                  <div className={styles["dept-avatar"]}>
                    <div className={styles["header-icon"]}>
                      <HomeIcon />
                    </div>
                  </div>
                  <div className={styles["dept-body"]}>
                    <div>
                      <div className={styles["dept-title"]}>{deptName}</div>
                      <div className={styles["dept-bottom-row"]}>
                        <div className={styles["dept-lines"]}>
                          {statusLabels
                            .filter((s) =>
                              items.some(
                                (it) => it.approved_status === s.status,
                              ),
                            )
                            .map((s) => {
                              const cnt = items.filter(
                                (it) => it.approved_status === s.status,
                              ).length;
                              return (
                                <div
                                  key={s.status}
                                  className={styles["dept-sub"]}
                                >
                                  {s.label}: {cnt}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                    <div className={styles["right"]}>
                      <button
                        className={styles["mo-item-open"]}
                        aria-label="Open department"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenReport?.(deptId, selectedDate);
                        }}
                      >
                        <ChevronRight />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sub-location rows (one per item in this department) */}
                {items.map((r: any, idx: number) => {
                  const key = r.id ?? r.user_id ?? idx;
                  const subZone = r.subLocationLabel ?? r.sub_location ?? "";
                  const sumByPrefix = (prefix: string) =>
                    Object.keys(r)
                      .filter((k) => k.startsWith(prefix))
                      .reduce((acc, k) => acc + (Number(r[k]) || 0), 0);
                  const itemLeaveTotal = sumByPrefix("leave_");
                  const itemWorkTotal = sumByPrefix("shift_");
                  const itemWearTotal = sumByPrefix("wear_");

                  const statusClass = statusLabels.find(
                    (s) => s.status === r.approved_status,
                  )
                    ? statusLabels.find((s) => s.status === r.approved_status)!
                        .cssClass
                    : styles["status-undone"];

                  return (
                    <div
                      key={String(key) + "-sub"}
                      className={styles["search-result"]}
                    >
                      <div className={styles["result-title"]}>
                        {subZone || "-"}
                      </div>

                      <div
                        className={`${styles["result-body-col"]} ${styles["status-pill"]} ${statusClass}`}
                      >
                        <div className={styles["result-bottom-row"]}>
                          <div className={styles["result-lines"]}>
                            <div className={styles["result-sub"]}>
                              ลา: {itemLeaveTotal} คน &nbsp; กำลังพล:{" "}
                              {itemWorkTotal} คน
                            </div>
                            <div className={styles["result-sub"]}>
                              เครื่องแต่งกาย: {itemWearTotal} คน
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          });
        })()}
      </div>
    </>
  );
}
