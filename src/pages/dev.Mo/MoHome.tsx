import styles from "./MoHome.module.css";
import { useState, useEffect } from "react";

import { useStore } from "../../store/store";
import type { SectorReport } from "../../store/store";

import MoNewForm from "../../components/dev.Mo/MoNewForm";
import MoDetailForm from "../../components/dev.Mo/MoDetailForm";
import MoUpdateForm from "../../components/dev.Mo/MoUpdateForm";
import MoDashboard from "../Mo/MoDashboard/MoDashborad";
import MoReportPage from "./MoReportPage";
import MoAddNewPage from "./MoAddNewPage";
import MoConfigPage from "./MoConfigPage";

type SubView =
  | "main"
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
  empCode?: string;
  initialView?: "main" | "search"; // Initial section of the main view
  displayName?: string;
};

export default function MoHome(props: Props) {
  const [subView, setSubView] = useState<SubView>(
    props.initialView === "search" ? "report" : "main",
  );
  const [selectedItem, setSelectedItem] = useState<SectorReport | null>(null);
  const [selectedLocationForNew, setSelectedLocationForNew] = useState("");

  const currentEmployee = useStore((state) => state.authEmployee);
  const fetchReports = useStore((state) => state.fetchReports);

  useEffect(() => {
    console.log(
      "MoHome: currentEmployee changed! department_id =",
      currentEmployee?.department_id,
    );
    if (!currentEmployee?.department_id) return;

    // Fetch reports for this sector specifically for TODAY
    const todayStr = new Date().toISOString().split("T")[0];
    fetchReports({
      department_id: currentEmployee.department_id,
      start_date: todayStr,
      end_date: todayStr,
    });
  }, [fetchReports, currentEmployee?.department_id]);

  function openSearch() {
    setSubView("report");
  }

  function openList() {
    // open the Add New page
    setSubView("add");
  }

  function goBack() {
    if (subView === "add") {
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

  if (subView === "new") {
    return (
      <MoNewForm
        empCode={props.empCode}
        selectedLocation={selectedLocationForNew}
        onCancel={() => setSubView("main")}
      />
    );
  }

  if (subView === "detail" && selectedItem) {
    return (
      <MoDetailForm
        item={selectedItem}
        onCancel={() => setSubView("main")}
        onShare={() => setSubView("pdfviewer")}
      />
    );
  }

  if (subView === "update" && selectedItem) {
    return (
      <MoUpdateForm
        item={selectedItem}
        onCancel={() => setSubView("main")}
        onShare={() => setSubView("pdfviewer")}
      />
    );
  }

  if (
    subView === "dashboard" &&
    currentEmployee?.position_name !== "สายตรวจและประสานงาน"
  ) {
    return (
      <MoDashboard
        empCode={props.empCode || ""}
        displayName={props.displayName}
        onCancel={() => setSubView("main")}
      />
    );
  }

  if (subView === "report") {
    return (
      <MoReportPage
        empCode={props.empCode}
        onCancel={() => {
          setSubView("main");
          if (currentEmployee?.department_id) {
            const todayStr = new Date().toISOString().split("T")[0];
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

  if (subView === "config") {
    return (
      <MoConfigPage
        empCode={props.empCode}
        onCancel={() => {
          setSubView("main");
          if (currentEmployee?.department_id) {
            const todayStr = new Date().toISOString().split("T")[0];
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

  if (subView === "add") {
    return (
      <MoAddNewPage
        empCode={props.empCode}
        onCancel={() => {
          setSubView("main");
          if (currentEmployee?.department_id) {
            const todayStr = new Date().toISOString().split("T")[0];
            fetchReports({
              department_id: currentEmployee.department_id,
              start_date: todayStr,
              end_date: todayStr,
            });
          }
        }}
        onStartNew={(location) => {
          setSelectedLocationForNew(location);
          setSubView("new");
        }}
      />
    );
  }

  return (
    <>
      <>
        {/* Home two buttons */}
        <div className={styles["guts-mo-btn"]}>
          <button
            type="button"
            className={styles["mo-home-addnew"]}
            onClick={() => {
              openList();
            }}
          >
            เพิ่มใหม่
          </button>
        </div>
        <div className={styles["guts-mo-btn"]}>
          <button
            type="button"
            className={styles["mo-home-search"]}
            onClick={openSearch}
          >
            รายการค้นหา
          </button>
        </div>
        {currentEmployee?.position_name !== "สายตรวจและประสานงาน" && (
          <>
            <div className={styles["guts-mo-btn"]}>
              <button
                type="button"
                className={styles["mo-home-addnew"]}
                onClick={() => {
                  setSubView("config");
                }}
              >
                ตั้งค่า
              </button>
            </div>
            <div className={styles["guts-mo-btn"]}>
              <button
                type="button"
                className={styles["mo-home-addnew"]}
                onClick={() => {
                  setSubView("dashboard");
                }}
              >
                แดชบอร์ด
              </button>
            </div>
          </>
        )}
        {/* Back button - visible only on home */}
        <div
          className={[styles["guts-back-outer"], styles["mo-back-home"]].join(
            " ",
          )}
        >
          <button
            type="button"
            className={[styles["guts-btn"], styles["mo-back-home-btn"]].join(
              " ",
            )}
            onClick={goBack}
          >
            ย้อนกลับ
          </button>
        </div>
      </>
    </>
    //any select page redner child page here
  );
}
