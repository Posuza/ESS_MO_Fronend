import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Search,
  ChevronRight,
  ArrowLeft,
  Home,
  MapPin,
  Landmark,
  Check,
  Clock3,
  X,
  Users,
  CalendarDays,
} from "lucide-react";
import styles from "./MoListPage.module.css";
import { useStore } from "../../store/store";
import type { SectorReport } from "../../services/moReporTransaction.Service";
import { buildReportFilters } from "../../utils/positionAccess";
import { FaHourglassHalf } from "react-icons/fa";
import { MoLoadingPopup, InfoModel } from "../../components/mo/popup";

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

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const [selectedLocation, setSelectedLocation] = useState<string>(
    currentDept?.name ?? "",
  );

  const [showNotFoundError, setShowNotFoundError] = useState(false);
  const [notFoundErrorMessage, setNotFoundErrorMessage] = useState("");

  const reports = useStore((state) => state.reports);
  const currentEmployee = useStore((state) => state.authEmployee);
  const fetchReports = useStore((state) => state.fetchReports);
  const fetchReportById = useStore((state) => state.fetchReportById);
  const storeLoading = useStore((state) => state.isLoading);

  // Track last searched values — to highlight Search btn when values change
  const [lastSearchedLocation, setLastSearchedLocation] =
    useState(selectedLocation);
  const [lastSearchedDate, setLastSearchedDate] = useState(selectedDate);
  const hasSearchChanged =
    selectedLocation !== lastSearchedLocation ||
    selectedDate !== lastSearchedDate;

  // Position check: only position_id 1 or 5 can see the Department Group
  const canSeeDeptGroup = [1, 5].includes(Number(currentEmployee?.position_id));

  // Loading popup — shows on mount and during search (min 2s)
  const [showLoading, setShowLoading] = useState(true);
  const pageLoadStartRef = useRef(0);
  const pageLoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MIN_PAGE_LOAD_MS = 2000;

  // Cleanup timer on unmount
  useEffect(() => {
    pageLoadStartRef.current = Date.now();
    return () => {
      if (pageLoadTimerRef.current) clearTimeout(pageLoadTimerRef.current);
    };
  }, []);

  // Track store loading — show popup while loading, hide after min 2s
  useEffect(() => {
    if (storeLoading) {
      if (pageLoadTimerRef.current) clearTimeout(pageLoadTimerRef.current);
      pageLoadStartRef.current = Date.now();
      setShowLoading(true);
    } else if (showLoading) {
      const elapsed = Date.now() - pageLoadStartRef.current;
      const remaining = MIN_PAGE_LOAD_MS - elapsed;
      if (remaining > 0) {
        pageLoadTimerRef.current = setTimeout(() => {
          setShowLoading(false);
        }, remaining);
      } else {
        setShowLoading(false);
      }
    }
  }, [storeLoading, showLoading]);

  function submitSearch() {
    if (!selectedLocation && !selectedDate) return;

    let targetSectorId: number | undefined = undefined;
    if (selectedLocation) {
      if (
        currentEmployee &&
        selectedLocation === currentEmployee.department_name
      ) {
        targetSectorId = currentEmployee.department_id as number;
      } else {
        const deptPart = selectedLocation.split("|")[0].trim();
        const match = deptPart.match(/(\d+)/);
        if (match) targetSectorId = Number(match[1]);
      }
    }

    const payload: Record<string, any> = {};

    if (currentEmployee) {
      const dateRange = selectedDate
        ? { start_date: selectedDate, end_date: selectedDate }
        : undefined;
      let employeeWithSelectedDept = currentEmployee;

      if (targetSectorId && targetSectorId !== currentEmployee.department_id) {
        employeeWithSelectedDept = {
          ...currentEmployee,
          department_id: targetSectorId,
        };
      }

      const filters = buildReportFilters(employeeWithSelectedDept, dateRange);
      Object.assign(payload, filters);
    }

    fetchReports(payload);
    setLastSearchedLocation(selectedLocation);
    setLastSearchedDate(selectedDate);
  }

  function goBack() {
    if (onCancel) {
      onCancel();
    } else {
      window.history.back();
    }
  }

  function getDepartmentName(deptId: number): string {
    return DEPARTMENT_NAMES[deptId] ?? `ฝ่ายปฏิบัติการภาค ${deptId}`;
  }

  const employeeLocations = useMemo(
    () =>
      currentEmployee?.department_name ? [currentEmployee.department_name] : [],
    [currentEmployee?.department_name],
  );

  const derivedLocations = useMemo(() => {
    try {
      const rows = reports;
      const map: Record<string, Set<string>> = {};
      rows.forEach((r: any) => {
        const id = Number(r.department_id) || 0;
        const sub = (r.division_name ? String(r.division_name) : "").trim();
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

  const locationOptions = useMemo(() => {
    const deptOnly = derivedLocations.map((d: any) => d.location);
    if (empCode) {
      if (employeeLocations.length > 0) return employeeLocations;
      return deptOnly.length > 0 ? deptOnly : uniqueLocations;
    }
    return deptOnly.length > 0 ? deptOnly : uniqueLocations;
  }, [empCode, employeeLocations, derivedLocations, uniqueLocations]);

  const selectedSectorName =
    selectedLocation || currentEmployee?.department_name || "";

  const filteredData = useMemo(() => {
    if (selectedSectorName) {
      return allSectorRecords.filter((r) => r.location === selectedSectorName);
    }
    return allSectorRecords;
  }, [allSectorRecords, selectedSectorName]);

  const displayRecords = filteredData;

  useEffect(() => {
    if (!currentDept?.id) return;
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
    if (currentEmployee) {
      const filters = buildReportFilters(currentEmployee, {
        start_date: today,
        end_date: today,
      });
      fetchReports(filters);
      setLastSearchedLocation(currentDept.name);
      setLastSearchedDate(today);
    }
  }, [currentDept]);

  function getStatusMeta(statusRaw?: string) {
    const s = String(statusRaw ?? "").toLowerCase();
    if (s === "approved")
      return {
        dotClass: styles["dot-approved"],
        icon: <Check size={15} />,
        label: "ดำเนินการแล้ว",
        badgeClass: styles["badge-approved"],
      };
    if (s === "rejected" || s === "reject")
      return {
        dotClass: styles["dot-rejected"],
        icon: <X size={15} />,
        label: "ถูกปฏิเสธ",
        badgeClass: styles["badge-rejected"],
      };
    return {
      dotClass: styles["dot-pending"],
      icon: <FaHourglassHalf size={15} />,
      label: "รอดำเนินการ",
      badgeClass: styles["badge-pending"],
    };
  }

  function renderNoData(message: string, subMessage: string) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.5rem",
          padding: "1.5rem 1rem",
          background: "#e2e8f0",
          borderRadius: "4px 4px 8px 8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ width: 48, height: 48 }}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 72 72"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="10"
              y="8"
              width="44"
              height="54"
              rx="7"
              fill="#9ca3af"
              stroke="#6b7280"
              strokeWidth="1.5"
            />
            <rect
              x="26"
              y="4"
              width="20"
              height="9"
              rx="4"
              fill="#9ca3af"
              stroke="#6b7280"
              strokeWidth="1.5"
            />
            <rect x="18" y="26" width="28" height="3" rx="1.5" fill="#6b7280" />
            <rect x="18" y="34" width="22" height="3" rx="1.5" fill="#6b7280" />
            <rect x="18" y="42" width="16" height="3" rx="1.5" fill="#6b7280" />
            <circle
              cx="56"
              cy="56"
              r="13"
              fill="#d1d5db"
              stroke="#9ca3af"
              strokeWidth="1"
            />
            <circle cx="56" cy="56" r="11" fill="#9ca3af" />
            <line
              x1="51"
              y1="51"
              x2="61"
              y2="61"
              stroke="#6b7280"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <line
              x1="61"
              y1="51"
              x2="51"
              y2="61"
              stroke="#6b7280"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontWeight: 600,
              fontSize: 14,
              color: "#334155",
              fontStyle: "italic",
            }}
          >
            {message}
          </p>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 12,
              color: "#64748b",
              fontStyle: "italic",
            }}
          >
            {subMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <MoLoadingPopup open={showLoading} />

      <InfoModel
        open={showNotFoundError}
        onClose={() => {
          setShowNotFoundError(false);
          // Re-fetch search results since the data is stale
          if (lastSearchedLocation || lastSearchedDate) {
            submitSearch();
          }
        }}
        variant="error"
        title="ไม่พบรายงาน"
        description={notFoundErrorMessage}
      />

      {/* Back button */}
      <div className={styles["mo-back-outer"]}>
        <button
          type="button"
          className={styles["mo-back-btn"]}
          onClick={goBack}
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      {/* Search bar — always visible */}
      <div className={styles["mo-search"]}>
        <div className={styles["search-field-group"]}>
          <label className={styles["search-label"]}>ภาค</label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
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
        </div>

        <div className={styles["search-field-group"]}>
          <label className={styles["search-label"]}>จากวันที่</label>
          <div className={styles["date-input-wrapper"]}>
            <CalendarDays size={18} className={styles["date-icon"]} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={styles["guts-mo-search-input"]}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>

        <button
          className={styles["mo-search-clear"]}
          aria-label="Search"
          onClick={submitSearch}
          type="button"
          disabled={!selectedLocation && !selectedDate}
          style={
            hasSearchChanged && !storeLoading
              ? { background: "#014f86", color: "#fff" }
              : {}
          }
        >
          <Search />
        </button>
      </div>

      {!showLoading && (
        <>
          {/* ========== DEPARTMENT GROUP — position 1 & 5 only ========== */}
          {canSeeDeptGroup && (
            <div className={styles["section-group"]}>
              <div className={styles["section-header"]}>
                <div className={styles["section-header-left"]}>
                  <Landmark size={16} className={styles["section-icon"]} />
                  <span>ภาคบันทึก</span>
                </div>
                {selectedDate && (
                  <span className={styles["section-date"]}>
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                      "th-TH",
                    )}
                  </span>
                )}
              </div>

              {(() => {
                const groupMap: Record<string, any[]> = {};
                filteredData.slice(0, 4).forEach((r: any) => {
                  const deptName =
                    r.departmentName ??
                    getDepartmentName(Number(r.department_id));
                  if (!groupMap[deptName]) groupMap[deptName] = [];
                  groupMap[deptName].push(r);
                });

                const entries = Object.entries(groupMap);
                if (entries.length === 0) {
                  return renderNoData(
                    "ไม่พบข้อมูลรายงาน",
                    "ไม่มีรายงานในวันที่เลือก",
                  );
                }

                return entries.map(([deptName, items], deptIdx) => {
                  const deptId = Number(items[0]?.department_id);
                  const totalItems = items.length;
                  const approvedCnt = items.filter(
                    (it) => it.approved_status?.toLowerCase() === "approved",
                  ).length;
                  const pendingCnt = items.filter(
                    (it) => it.approved_status?.toLowerCase() === "pending",
                  ).length;
                  const rejectedCnt = items.filter(
                    (it) =>
                      it.approved_status?.toLowerCase() === "rejected" ||
                      it.approved_status?.toLowerCase() === "reject",
                  ).length;

                  return (
                    <div key={deptName} className={styles["dept-group-card"]}>
                      <div
                        className={`${styles["dept-card"]} ${expandedItems.has("dept-" + deptName) ? styles["dept-card-expanded"] : ""}`}
                        onClick={() => toggleExpand("dept-" + deptName)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ")
                            toggleExpand("dept-" + deptName);
                        }}
                      >
                        <div className={styles["dept-card-header-body"]}>
                          <div className={styles["dept-card-title"]}>
                            {deptIdx + 1}. {deptName}
                          </div>

                          {!expandedItems.has("dept-" + deptName) && (
                            <div className={styles["dept-card-chips"]}>
                              <span className={styles["header-chip"]}>
                                <span
                                  className={`${styles["chip-dot"]} ${styles["chip-dot-approved"]}`}
                                >
                                  <Check size={12} />
                                </span>
                                {approvedCnt}
                              </span>
                              <span className={styles["header-chip"]}>
                                <span
                                  className={`${styles["chip-dot"]} ${styles["chip-dot-pending"]}`}
                                >
                                  <FaHourglassHalf size={12} />
                                </span>
                                {pendingCnt}
                              </span>
                              {/*<span className={styles["header-chip"]}>
                                <span
                                  className={`${styles["chip-dot"]} ${styles["chip-dot-rejected"]}`}
                                >
                                  <X size={12} />
                                </span>
                                {rejectedCnt}
                              </span>*/}
                            </div>
                          )}
                        </div>
                        <button
                          className={styles["dept-card-btn"]}
                          aria-label="Open department"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenReport?.(deptId, selectedDate);
                          }}
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                      {expandedItems.has("dept-" + deptName) && (
                        <div className={styles["dept-card-body"]}>
                          {[
                            {
                              key: "approved",
                              label: "ดำเนินการแล้ว",
                              count: approvedCnt,
                              cls: styles["chip-approved"],
                            },
                            {
                              key: "pending",
                              label: "รอดำเนินการ",
                              count: pendingCnt,
                              cls: styles["chip-pending"],
                            },
                            {
                              key: "rejected",
                              label: "ถูกปฏิเสธ",
                              count: rejectedCnt,
                              cls: styles["chip-rejected"],
                            },
                          ].map((s) => (
                            <div
                              key={s.key}
                              className={styles["dept-item-row"]}
                            >
                              <span
                                className={`${styles["dept-item-name"]} ${s.cls}`}
                              >
                                {s.label}
                              </span>
                              <span className={styles["detail-value"]}>
                                {s.count} รายการ
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* ========== DIVISION GROUP ========== */}
          <div className={styles["section-group"]}>
            <div className={styles["section-header"]}>
              <div className={styles["section-header-left"]}>
                <MapPin size={20} className={styles["section-icon"]} />
                <span>เขตบันทึก</span>
                <span className={styles["section-count"]}>
                  {Math.min(5, filteredData.length)} รายการ
                </span>
              </div>
              {selectedDate && (
                <span className={styles["section-date"]}>
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                    "th-TH",
                  )}
                </span>
              )}
            </div>

            {displayRecords.length === 0
              ? renderNoData("ไม่พบข้อมูลรายงาน", "ไม่มีรายงานในวันที่เลือก")
              : displayRecords.map((r: any, idx: number) => {
                  const key = r.id ?? r.user_id ?? idx;
                  const subZone = r.subLocationLabel ?? r.division_name ?? "";
                  const itemKey = String(key) + "-sub";
                  const isExpanded = expandedItems.has(itemKey);

                  const sumByPrefix = (prefix: string) =>
                    Object.keys(r)
                      .filter((k) => k.startsWith(prefix))
                      .reduce((acc, k) => acc + (Number(r[k]) || 0), 0);
                  const itemLeaveTotal = sumByPrefix("leave_");
                  const itemShiftTotal = sumByPrefix("shift_");
                  const itemDeptTotal = sumByPrefix("dept_");
                  const itemTrainingTotal = sumByPrefix("training_");
                  const itemProjectCount = (r.projects || []).length;
                  const itemDisciplineCount = (r.disciplines || []).filter(
                    (d: any) => Number(d.value) > 0,
                  ).length;

                  const { dotClass, icon, badgeClass, label } = getStatusMeta(
                    r.approved_status,
                  );

                  return (
                    <div key={itemKey} className={styles["report-card"]}>
                      <div
                        className={`${styles["card-header"]} ${isExpanded ? styles["card-header-expanded"] : ""}`}
                        onClick={() => toggleExpand(itemKey)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className={`${styles["status-dot"]} ${dotClass}`}>
                          {icon}
                        </div>
                        <div className={styles["card-body"]}>
                          <div className={styles["card-key"]}>{idx + 1}.</div>
                          <div className={styles["card-title"]}>
                            {subZone || "-"}
                          </div>
                        </div>
                        <div className={styles["card-actions"]}>
                          <button
                            type="button"
                            className={styles["card-detail-btn"]}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Verify report still exists before navigating
                              fetchReportById(r.id)
                                .then(() => {
                                  onOpenDetail(r);
                                })
                                .catch((err: unknown) => {
                                  const msg =
                                    err instanceof Error
                                      ? err.message
                                      : String(err);
                                  setNotFoundErrorMessage(msg);
                                  // Close loading popup first, then show error
                                  if (pageLoadTimerRef.current)
                                    clearTimeout(pageLoadTimerRef.current);
                                  setShowLoading(false);
                                  setTimeout(() => {
                                    setShowNotFoundError(true);
                                  }, 150);
                                });
                            }}
                            aria-label="ดูรายละเอียด"
                            title="ดูรายละเอียด"
                          >
                            <ChevronRight size={20} />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className={styles["card-details"]}>
                          <div className={styles["detail-row"]}>
                            <span className={styles["detail-label"]}>ลา</span>
                            <span className={styles["detail-value"]}>
                              {itemLeaveTotal} คน
                            </span>
                          </div>
                          <div className={styles["detail-row"]}>
                            <span className={styles["detail-label"]}>เวร</span>
                            <span className={styles["detail-value"]}>
                              {itemShiftTotal} คน
                            </span>
                          </div>
                          <div className={styles["detail-row"]}>
                            <span className={styles["detail-label"]}>
                              กำลังพล
                            </span>
                            <span className={styles["detail-value"]}>
                              {itemDeptTotal} คน
                            </span>
                          </div>
                          <div className={styles["detail-row"]}>
                            <span className={styles["detail-label"]}>อบรม</span>
                            <span className={styles["detail-value"]}>
                              {itemTrainingTotal} คน
                            </span>
                          </div>
                          <div className={styles["detail-row"]}>
                            <span className={styles["detail-label"]}>
                              โครงการ
                            </span>
                            <span className={styles["detail-value"]}>
                              {itemProjectCount} โครงการ
                            </span>
                          </div>
                          <div className={styles["detail-row"]}>
                            <span className={styles["detail-label"]}>
                              วินัย
                            </span>
                            <span className={styles["detail-value"]}>
                              {itemDisciplineCount} รายการ
                            </span>
                          </div>
                          <div className={styles["detail-row"]}>
                            <span className={styles["detail-label"]}>
                              สถานะ
                            </span>
                            <span
                              className={`${styles["status-badge"]} ${badgeClass}`}
                            >
                              {label}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
          </div>
        </>
      )}
    </>
  );
}
