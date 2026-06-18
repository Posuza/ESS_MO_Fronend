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
import { ChevronRight, RefreshCw } from "lucide-react";
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
  const [showLoading, setShowLoading] = useState(false);
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

  // Robust mapping layout normalizes incoming backend text tags down to uniform Thai copy outputs
  const statusLabels = [
    {
      keys: ["approved", "ดำเนินการแล้ว"],
      label: "ดำเนินการแล้ว",
      cssClass: styles["status-approved"],
    },
    {
      keys: ["PENDING", "pending", "waited", "รอการดำเนินการ", "รอ"],
      label: "รอการดำเนินการ",
      cssClass: styles["status-pending"],
    },
    {
      keys: ["REJECTED", "rejected", "reject", "ถูกปฏิเสธ"],
      label: "รอการดำเนินการแก้ไข",
      cssClass: styles["status-rejected"],
    },
  ];

  // Helper matching lookups accurately regardless of white spacing or casing variations
  const getStatusConfig = (status: string) => {
    const cleaned = String(status ?? "")
      .trim()
      .toLowerCase();
    return statusLabels.find((item) =>
      item.keys.some((k) => k.toLowerCase() === cleaned),
    );
  };

  const getStatusClass = (status: string) => {
    const config = getStatusConfig(status);
    return config ? config.cssClass : "";
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
        onOpenDetail={(item) => {
          setSelectedItem(item);
          setDetailSource("report");
          setSubView("detail");
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
      <div className={styles["mo-table-wrapper"]}>
        <table className={styles["mo-table"]}>
          <thead>
            <tr>
              <th className={styles["mo-table-header-cell"]} colSpan={2}>
                <div className={styles["mo-table-header"]}>
                  <span className={styles["mo-table-header-left"]}>
                    <LuLandmark size="1.5em" /> {deptName || "Loading..."}
                  </span>
                  <button
                    type="button"
                    className={styles["mo-reload-btn"]}
                    onClick={() => refreshMainView()}
                    title="รีเฟรชข้อมูล"
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {showLoading ? null : locationTable.length > 0 ? (
              locationTable.map((r) => {
                return (
                  <tr
                    key={`${r.id}-${r.division_name}`}
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
                        // Verify report still exists before navigating
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
                    style={{ cursor: "pointer" }}
                  >
                    <td className={styles["first-column-cell"]}>
                      {(() => {
                        const name = String(r.division_name ?? "");
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
                    <td
                      className={`${styles["second-column-cell"]} ${styles["status-pill"]} ${getStatusClass(r.approved_status)}`}
                    >
                      <div className={styles["second-column-inner"]}>
                        {(() => {
                          const config = getStatusConfig(r.approved_status);
                          return config
                            ? config.label
                            : r.approved_status || "รอ";
                        })()}
                        <ChevronRight />
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr className={styles["no-data-row"]}>
                <td colSpan={2} className={styles["no-data-cell"]}>
                  <div className={styles["no-data-message"]}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.75rem 1rem",
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
                          <rect
                            x="18"
                            y="26"
                            width="28"
                            height="3"
                            rx="1.5"
                            fill="#6b7280"
                          />
                          <rect
                            x="18"
                            y="34"
                            width="22"
                            height="3"
                            rx="1.5"
                            fill="#6b7280"
                          />
                          <rect
                            x="18"
                            y="42"
                            width="16"
                            height="3"
                            rx="1.5"
                            fill="#6b7280"
                          />
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
                          }}
                        >
                          ไม่พบข้อมูลรายงาน
                        </p>
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: 12,
                            color: "#64748b",
                          }}
                        >
                          ในแผนกของคุณในวันนี้
                        </p>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

      <div className={styles["mo-back-home-outer"]}>
        <button
          type="button"
          className={styles["mo-back-home"]}
          onClick={goBack}
        >
          <FaHouse className={styles.home} />
        </button>
      </div>
    </div>
  );
}
