import styles from "./MoHome.module.css";
import { useState, useEffect, useMemo, useRef } from "react";

import { useStore } from "../../store/store";
import { type SectorReport } from "../../services/moReporTransaction.Service";
import {
  getAccessLevel,
  AccessLevel,
  canApprove,
} from "../../utils/positionAccess";
import MoReportPage from "./MoReportPage";
import MoListPage from "./MoListPage";
import MoAddNewPage from "./MoAddNewPage";
import MoConfigPage from "./MoConfigPage";
import MoDetailPage from "./MoDetailPage";
import { MoLoadingPopup, InfoModel } from "../../components/mo/popup";
import { ChevronRight, RefreshCw, Check, X } from "lucide-react";
import { FaHourglassHalf } from "react-icons/fa";
import NoDataMessage from "../../components/NoDataMessage";
import { FaHouse } from "react-icons/fa6";
import { LuLandmark } from "react-icons/lu";
import { usePositionReports } from "../../hooks/usePositionReports";

type SubView =
  | "main"
  | "list"
  | "new"
  | "detail"
  | "update"
  | "dashboard"
  | "pdfviewer"
  | "report"
  | "config"
  | "add";

type Props = {
  onBackHome?: () => void;
  initialView?: "main" | "search"; // Initial section of the main view
};

export default function MoHome(props: Props) {
  const [subView, setSubView] = useState<SubView>(
    props.initialView === "search" ? "report" : "main",
  );
  const [selectedItem, setSelectedItem] = useState<SectorReport | null>(null);
  const [detailSource, setDetailSource] = useState<"main" | "list" | "report">(
    "main",
  );
  const [reportInitialDeptId, setReportInitialDeptId] = useState<
    number | undefined
  >();
  const [reportInitialDate, setReportInitialDate] = useState<
    string | undefined
  >();

  const [showNotFoundError, setShowNotFoundError] = useState(false);
  const [notFoundErrorMessage, setNotFoundErrorMessage] = useState("");

  const currentEmployee = useStore((state) => state.authEmployee);
  const { reports, isLoading, fetchWithPosition } = usePositionReports();
  const fetchReportById = useStore((s) => s.fetchReportById);
  const fetchDivisionsByDepartment = useStore(
    (s) => s.fetchDivisionsByDepartment,
  );
  const fetchTodayDepartmentReportDivisions = useStore(
    (s) => s.fetchTodayDepartmentReportDivisions,
  );

  // Local loading state with minimum 2-second display time
  const [showLoading, setShowLoading] = useState(true);
  const loadingStartRef = useRef(0);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MIN_LOADING_MS = 2000;

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    };
  }, []);

  // Ensure loading popup shows for at least 2 seconds
  useEffect(() => {
    if (isLoading) {
      // Clear any pending hide timer
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      loadingStartRef.current = Date.now();
      setShowLoading(true);
    } else if (loadingStartRef.current > 0) {
      const elapsed = Date.now() - loadingStartRef.current;
      const remaining = MIN_LOADING_MS - elapsed;
      if (remaining > 0) {
        loadingTimerRef.current = setTimeout(() => {
          setShowLoading(false);
          loadingTimerRef.current = null;
        }, remaining);
      } else {
        setShowLoading(false);
      }
      loadingStartRef.current = 0;
    }
  }, [isLoading]);

  // Main Fetch Effect: Fetch reports based on position-based access
  useEffect(() => {
    if (currentEmployee?.department_id) {
      fetchWithPosition()
        .then((data) => {
          console.log("MoHome: Freshly fetched reports data:", data);
        })
        .catch((err) => {
          console.error("MoHome: Failed to fetch initial reports:", err);
        });
    }
  }, [fetchWithPosition]);

  const deptName = currentEmployee?.department_name;

  // Track whether all divisions already have reports submitted today
  const [totalDivisionCount, setTotalDivisionCount] = useState(0);
  const [usedDivisionCount, setUsedDivisionCount] = useState(0);

  // Filter division data by position access level
  const filterByPosition = (
    divs: { division_id: number }[],
  ): { division_id: number }[] => {
    const level = getAccessLevel(currentEmployee?.position_id);
    if (level === AccessLevel.ALL_DEPT) return divs;
    const empDivId = (currentEmployee as { division_id?: number })?.division_id;
    if (empDivId != null) {
      return divs.filter((d) => d.division_id === empDivId);
    }
    return [];
  };

  // Fetch division counts (with position filtering)
  function fetchDivisionCounts() {
    if (!currentEmployee?.department_id) return;
    const deptId = currentEmployee.department_id;

    fetchDivisionsByDepartment(deptId).then((divs) => {
      const filtered = filterByPosition(divs);
      setTotalDivisionCount(filtered.length);
    });

    fetchTodayDepartmentReportDivisions(deptId).then((reported) => {
      const filtered = filterByPosition(reported);
      setUsedDivisionCount(filtered.length);
    });
  }

  useEffect(() => {
    fetchDivisionCounts();
  }, [
    currentEmployee?.department_id,
    fetchDivisionsByDepartment,
    fetchTodayDepartmentReportDivisions,
  ]);

  // Refresh all main-view data (reports + division counts)
  function refreshMainView() {
    if (!currentEmployee?.department_id) return;
    fetchWithPosition();
    fetchDivisionCounts();
  }

  const allDivisionsReported =
    totalDivisionCount > 0 && usedDivisionCount >= totalDivisionCount;

  const locationTable = useMemo(() => {
    if (!currentEmployee?.department_id) return [];

    return (reports || []).map((report) => {
      const id = report.id || (report as any).mo_daily_transaction_id;
      return {
        id,
        department_id: report.department_id,
        division_name: report.division_name,
        approved_status: report.approved_status,
        created_by: report.created_by,
      };
    });
  }, [reports, currentEmployee?.department_id]);

  const getStatusMeta = (statusRaw?: string) => {
    const s = String(statusRaw ?? "").toLowerCase();
    if (s === "approved" || s === "ดำเนินการแล้ว")
      return {
        dotClass: styles["dot-approved"],
        icon: <Check size={16} strokeWidth={3} />,
        label: "อนุมัติเรียบร้อยแล้ว",
        badgeClass: styles["badge-approved"],
      };
    if (s === "rejected" || s === "reject" || s === "ถูกปฏิเสธ")
      return {
        dotClass: styles["dot-rejected"],
        icon: <X size={16} strokeWidth={3} />,
        label: "รอการดำเนินการแก้ไข",
        badgeClass: styles["badge-rejected"],
      };
    return {
      dotClass: styles["dot-pending"],
      icon: <FaHourglassHalf size={14} />,
      label: "รอผู้อำนวยการอนุมัติ",
      badgeClass: styles["badge-pending"],
    };
  };

  function openList() {
    setSubView("list");
  }

  function openNew() {
    setSubView("add");
  }

  function goBack() {
    if (subView === "add" || subView === "list") {
      setSubView("main");
      refreshMainView();
      return;
    }
    if (props.onBackHome) {
      props.onBackHome();
    } else {
      window.history.back();
    }
  }

  if (subView === "list") {
    return (
      <MoListPage
        onCancel={() => {
          setSubView("main");
          refreshMainView();
        }}
        onOpenDetail={(item) => {
          setSelectedItem(item);
          setDetailSource("list");
          setSubView("detail");
        }}
        onOpenReport={(deptId, date) => {
          setReportInitialDeptId(deptId);
          setReportInitialDate(date);
          setSubView("report");
        }}
      />
    );
  }

  if (subView === "add") {
    return (
      <MoAddNewPage
        onCancel={() => {
          setSubView("main");
          refreshMainView();
        }}
      />
    );
  }

  if (subView === "report") {
    return (
      <MoReportPage
        initialDeptId={reportInitialDeptId}
        initialDate={reportInitialDate}
        onCancel={() => {
          setSubView("list");
        }}
      />
    );
  }

  if (subView === "detail" && selectedItem) {
    const backToView =
      detailSource === "list"
        ? "list"
        : detailSource === "report"
          ? "report"
          : "main";
    return (
      <MoDetailPage
        item={selectedItem}
        onCancel={() => {
          setSubView(backToView);
          if (backToView === "main" || backToView === "list") {
            refreshMainView();
          }
        }}
      />
    );
  }

  if (subView === "config") {
    return (
      <MoConfigPage
        onCancel={() => {
          setSubView("main");
          refreshMainView();
        }}
      />
    );
  }

  if (
    subView === "dashboard" &&
    currentEmployee?.position_name !== "สายตรวจและประสานงาน"
  ) {
    return (
      <div className={styles["mo-table-wrapper"]}>
        <h2>Dashboard View</h2>
        <p>Dashboard functionality coming soon...</p>
        <button onClick={() => setSubView("main")}>Go Back</button>
      </div>
    );
  }

  return (
    <div className={styles["mo-home-page"]}>
      <div className={styles["mo-reload-box"]}>
        <button
          type="button"
          className={styles["mo-reload-btn"]}
          onClick={() => refreshMainView()}
          title="รีเฟรชข้อมูล"
        >
          <RefreshCw size={15} className={styles["mo-reload-icon"]} />
        </button>
      </div>
      <div className={styles["mo-card-wrapper"]}>
        <div className={styles["mo-card-header"]}>
          <LuLandmark size={16} />
          <span>{deptName}</span>
        </div>

        {showLoading ? null : locationTable.length > 0 ? (
          <div className={styles["mo-card-list"]}>
            {locationTable.map((r) => {
              const { dotClass, icon, label, badgeClass } = getStatusMeta(
                r.approved_status,
              );

              return (
                <div
                  key={`${r.id}-${r.division_name}`}
                  className={styles["mo-card-item"]}
                  onClick={() => {
                    const found = reports.find(
                      (rep) =>
                        (rep.id || (rep as any).mo_daily_transaction_id) ===
                        r.id,
                    );

                    if (
                      found &&
                      Number(found.department_id) ===
                        Number(currentEmployee?.department_id)
                    ) {
                      fetchReportById(found.id)
                        .then(() => {
                          setSelectedItem(found);
                          setDetailSource("main");
                          setSubView("detail");
                        })
                        .catch((err: unknown) => {
                          const msg =
                            err instanceof Error ? err.message : String(err);
                          setNotFoundErrorMessage(msg);
                          setShowNotFoundError(true);
                        });
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className={`${styles["status-icon"]} ${dotClass}`}>
                    {icon}
                  </div>

                  <div className={styles["mo-card-body"]}>
                    <span className={styles["mo-card-name"]}>
                      {r.division_name || "-"}
                    </span>
                  </div>

                  <span className={`${styles["status-badge"]} ${badgeClass}`}>
                    {label}
                  </span>

                  <ChevronRight
                    size={16}
                    strokeWidth={2.8}
                    className={styles["mo-card-chevron"]}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <NoDataMessage />
        )}
      </div>

      <div className={styles["guts-mo-btn"]}>
        <button
          type="button"
          className={styles["mo-home-addnew"]}
          disabled={allDivisionsReported}
          onClick={() => {
            openNew();
          }}
        >
          {allDivisionsReported
            ? "บันทึกรายงานแล้วทุกพื้นที่"
            : "บันทึกรายงานประจำวันวันนี้"}
        </button>
      </div>
      <div className={styles["guts-mo-btn"]}>
        <button
          type="button"
          className={styles["mo-home-search"]}
          onClick={openList}
        >
          รายงานสถิติ
        </button>
      </div>

      <MoLoadingPopup open={showLoading} />

      <InfoModel
        open={showNotFoundError}
        onClose={() => {
          setShowNotFoundError(false);
          refreshMainView();
        }}
        variant="error"
        title="ไม่พบรายงาน"
        description={notFoundErrorMessage}
      />

      <hr className={styles["mo-divider"]} />

      <div className={styles["mo-back-home-outer"]}>
        <button
          type="button"
          className={styles["mo-back-home"]}
          onClick={goBack}
        >
          ย้อนกับ
        </button>
      </div>
    </div>
  );
}
