import styles from "./MoHome.module.css";
import { useState, useEffect, useMemo } from "react";

import { useStore } from "../../store/store";
import { type SectorReport } from "../../services.dev/moDailyTransaction.Service";
// Remove direct import of newCase.json
import MoReportPage from "./MoReportPage";
import MoListPage from "./MoListPage";
import MoAddNewPage from "./MoAddNewPage";
import MoConfigPage from "./MoConfigPage";
import MoDetailPage from "./MoDetailPage";
import { ChevronRight, HomeIcon } from "lucide-react";

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
  const [reportInitialDeptId, setReportInitialDeptId] = useState<number | undefined>();
  const [reportInitialDate, setReportInitialDate] = useState<string | undefined>();

  const currentEmployee = useStore((state) => state.authEmployee);
  const reports = useStore((state) => state.reports);
  const fetchReports = useStore((state) => state.fetchReports);
  const isLoading = useStore((state) => state.isLoading);

  // Helper to get the date string.
  // Switch '2026-06-02' to todayStr for production.
  const getTargetDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  // Main Fetch Effect: Fetch today's reports for this department on mount or department change
  useEffect(() => {
    if (currentEmployee?.department_id) {
      const todayStr = getTargetDate();
      fetchReports({
        department_id: currentEmployee.department_id,
        start_date: todayStr,
        end_date: todayStr,
      })
        .then((data) => {
          console.log("MoHome: Freshly fetched reports data:", data);
        })
        .catch((err) => {
          console.error("MoHome: Failed to fetch initial reports:", err);
        });
    }
  }, [fetchReports, currentEmployee?.department_id]);

  const deptName = currentEmployee?.department_name;

  const locationTable = useMemo(() => {
    if (!currentEmployee?.department_id) return [];

    return (reports || []).map((report) => {
      const id = report.id || (report as any).mo_daily_transaction_id;
      return {
        id,
        department_id: report.department_id,
        sub_location: report.sub_location,
        approved_status: report.approved_status,
        created_by: report.created_by,
      };
    });
  }, [reports, currentEmployee?.department_id]);

  // status
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

  const getStatusClass = (status: string) => {
    const statusLabel = statusLabels.find((item) => item.status === status);
    return statusLabel ? statusLabel.cssClass : styles["status-undone"]; // default to undone if not found
  };

  function openList() {
    setSubView("list");
  }

  function openNew() {
    // open the Add New page
    setSubView("add");
  }

  function goBack() {
    if (subView === "add" || subView === "list") {
      setSubView("main");
      return;
    }
    // If on main view, and not in search/list, call parent navigation if provided
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
          if (currentEmployee?.department_id) {
            const todayStr = getTargetDate();
            fetchReports({
              department_id: currentEmployee.department_id,
              start_date: todayStr,
              end_date: todayStr,
            });
          }
        }}
        onOpenDetail={(item) => {
          setSelectedItem(item);
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
          if (currentEmployee?.department_id) {
            const todayStr = getTargetDate();
            fetchReports({
              department_id: currentEmployee.department_id,
              start_date: todayStr,
              end_date: todayStr,
            });
          }
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
          setSubView("main");
          if (currentEmployee?.department_id) {
            const todayStr = getTargetDate();
            fetchReports({
              department_id: currentEmployee.department_id,
              start_date: todayStr,
              end_date: todayStr,
            });
          }
        }}
        onOpenDetail={(item) => {
          setSelectedItem(item);
          setSubView("detail");
        }}
      />
    );
  }

  if (subView === "detail" && selectedItem) {
    return (
      <MoDetailPage item={selectedItem} onCancel={() => setSubView("main")} />
    );
  }

  if (subView === "config") {
    return (
      <MoConfigPage
        onCancel={() => {
          setSubView("main");
          if (currentEmployee?.department_id) {
            const todayStr = getTargetDate();
            fetchReports({
              department_id: currentEmployee.department_id,
              start_date: todayStr,
              end_date: todayStr,
            });
          }
        }}
      />
    );
  }

  // Check if the current employee has permission to view the dashboard
  if (
    subView === "dashboard" &&
    currentEmployee?.position_name !== "สายตรวจและประสานงาน"
  ) {
    // Since MoDashboard.tsx is empty, we'll redirect to main view
    // Or we could render a placeholder message
    return (
      <div className={styles["mo-table-wrapper"]}>
        <h2>Dashboard View</h2>
        <p>Dashboard functionality coming soon...</p>
        <button onClick={() => setSubView("main")}>Go Back</button>
      </div>
    );
  }

  // Get data from the store instead of the direct JSON import

  return (
    <div className={styles["mo-home-page"]}>
      {/* Right: big dashboard grid */}

      <div className={styles["mo-table-wrapper"]}>
        <table className={styles["mo-table"]}>
          <thead>
            <tr>
              <th className={styles["mo-table-header-cell"]} colSpan={2}>
                <div className={styles["mo-table-header"]}>
                  <HomeIcon /> {deptName || "Loading..."}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={2} className={styles["no-data-cell"]}>
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            ) : locationTable.length > 0 ? (
              locationTable.map((r) => {
                return (
                  <tr
                    key={`${r.id}-${r.sub_location}`}
                    onClick={() => {
                      // Explicitly allow clicking on daily MO transaction records
                      // that have department ID matching the current user's department
                      // This implements the "autoslice" functionality
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
                        setSelectedItem(found);
                        setSubView("detail");
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <td className={styles["first-column-cell"]}>
                      {r.sub_location}
                    </td>
                    <td
                      className={`${styles["second-column-cell"]} ${styles["status-pill"]} ${getStatusClass(r.approved_status)}`}
                    >
                      <div className={styles["second-column-inner"]}>
                        {(() => {
                          const statusLabel = statusLabels.find(
                            (item) => item.status === r.approved_status,
                          );
                          return statusLabel
                            ? statusLabel.label
                            : r.approved_status || "รอ";
                        })()}
                        <ChevronRight />
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={2} className={styles["no-data-cell"]}>
                  <div className={styles["no-data-message"]}>
                    <p>ไม่พบข้อมูลรายงานในแผนกของคุณในวันนี้</p>
                    {!currentEmployee?.department_id && (
                      <p>กรุณาเข้าสู่ระบบเพื่อดูข้อมูลแผนกของคุณ</p>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/*openAddNew*/}
      <div className={styles["guts-mo-btn"]}>
        <button
          type="button"
          className={styles["mo-home-addnew"]}
          onClick={() => {
            openNew();
          }}
        >
          บันทึกรายงานประจำวันวันนี้
        </button>
      </div>
      {/*openList*/}
      <div className={styles["guts-mo-btn"]}>
        <button
          type="button"
          className={styles["mo-home-search"]}
          onClick={openList}
        >
          รายงานสถิติ
        </button>
      </div>

      <div
        className={[styles["guts-back-outer"], styles["mo-back-home"]].join(
          " ",
        )}
      >
        <button
          type="button"
          className={[styles["guts-btn"], styles["mo-back-home-btn"]].join(" ")}
          onClick={goBack}
        >
          <HomeIcon className={styles.home} />
          ย้อนกลับ
        </button>
      </div>
    </div>
  );
}
