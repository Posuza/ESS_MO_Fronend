import { Plus, ChevronRight, MapPinX, MapPinCheck } from "lucide-react";
import { useState } from "react";
import MoNewForm from "../../components/dev.Mo/MoNewForm";
import MoDetailForm from "../../components/dev.Mo/MoDetailForm";
import MoPdfViewerForm from "../../components/dev.Mo/MoPdfViewerForm";
import styles from "./MoAddNewPage.module.css";
import { useStore } from "../../store/store";
import type { SectorReport } from "../../store/store";

type ReportListItem = SectorReport & {
  location?: string;
  create_at?: string;
  user_id?: string | number;
  wear_pants_count?: number | string;
  wear_shoes_count?: number | string;
};

type Props = {
  empCode?: string;
  onCancel: () => void;
  onStartNew: (location: string) => void;
};

export default function MoAddNewPage({ empCode, onCancel, onStartNew }: Props) {
  // View state: "list" | "new" | "detail" | "pdf"
  const [view, setView] = useState<"list" | "new" | "detail" | "pdf">("list");
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const reports = useStore((state) => state.reports);
  const currentEmployee = useStore((state) => state.authEmployee);

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
    if (status === "APPROVED") return <span className="svg">✓</span>;
    if (status === "REJECT") return <span className="svg">✕</span>;
    return <span className="svg">…</span>;
  }

  // Get today's date in YYYY-MM-DD format
  const todayDate = new Date().toISOString().split("T")[0];

  const mappedReports: ReportListItem[] = reports.map((r: SectorReport) => ({
    ...r,
    location:
      r.department_id === currentEmployee?.department_id &&
      currentEmployee?.department_name
        ? currentEmployee.department_name
        : `Department ${r.department_id}`,
    create_at: r.created_at,
    user_id: r.created_by,
  }));

  
  // const employeeLocations = currentEmployee?.department_name
  //   ? [currentEmployee.department_name]
  //   : [];
  // For demo/testing: use default locations
  // Locations with consistent structure and random sub-location selection
  const employeeLocations = [
    {
      location: "สภาบันฝึกอบรม",
      sub_locations: ["เขต 1.1", "เขต 1.2", "เขต 1.3"],
    },
    {
      location: "ฝ่ายปฎิบัติการภาค 1",
      sub_locations: ["เขต 1.1", "เขต 1.2", "เขต 1.3"],
    },
    {
      location: "ฝ่ายปฎิบัติการภาค 2",
      sub_locations: ["เขต 2.1", "เขต 2.2"],
    },
    {
      location: "ฝ่ายปฎิบัติการภาค 3",
      sub_locations: ["เขต 3.1", "เขต 3.2", "เขต 3.3"],
    },
    {
      location: "ฝ่ายปฎิบัติการภาค 4",
      sub_locations: [],
    },
    {
      location: "ฝ่ายปฎิบัติการภาค 5",
      sub_locations: ["เขต 3.1"],
    },
    {
      location: "ฝ่ายปฎิบัติการภาค 9 (ทดสอบ)",
      sub_locations: ["เขต 9.1", "เขต 9.2"],
    },
  ];

  // Flatten locations, picking a random sub-location if present
  function getFlatLocations() {
    return employeeLocations.map((loc) => {
      if (loc.sub_locations && loc.sub_locations.length > 0) {
        const idx = Math.floor(Math.random() * loc.sub_locations.length);
        return loc.location + " - " + loc.sub_locations[idx];
      }
      return loc.location;
    });
  }
  const flatEmployeeLocations = getFlatLocations();

  const todayReports = mappedReports.filter((r) =>
    r.create_at?.startsWith(todayDate),
  );

  const locationsWithCases = todayReports.filter((r) =>
    flatEmployeeLocations.includes(r.location),
  );

  const locationsWithoutCases = flatEmployeeLocations.filter(
    (loc: string) =>
      !locationsWithCases.some(
        (r) =>
          r.location === loc &&
          String(r.user_id) === String(currentEmployee?.employee_code),
      ),
  );

  // View switching logic
  if (view === "new") {
    return (
      <MoNewForm
        empCode={empCode}
        selectedLocation={selectedLocation ?? undefined}
        onCancel={() => {
          setView("list");
          setSelectedLocation(null);
        }}
      />
    );
  }
  if (view === "detail") {
    return (
      <MoDetailForm
        item={selectedReport}
        onCancel={() => {
          setView("list");
          setSelectedReport(null);
        }}
        onShare={() => setView("pdf")}
      />
    );
  }
  if (view === "pdf") {
    return (
      <MoPdfViewerForm
        item={selectedReport}
        sectorName={selectedReport?.location || ""}
        onCancel={() => setView("detail")}
      />
    );
  }

  // Default: list view (view === "list")
  return (
  <>
    <div className={styles["location-list"]}>
      <div className={styles["location-header"]}>บันทึก</div>
      {/* for locations without case yet */}
      {locationsWithoutCases.map((location: string, idx: number) => {
        return (
          <div
            className={styles["location-item"]}
            key={`${empCode}-${location}-${idx}`}
          >
            <div className={styles["location-avatar"]}>
              <MapPinX />
            </div>
            <div className={styles["location-body-col"]}>
              <div className={styles["location-top-row"]}>
                <div className={styles["item-title-wrap"]}>
                  <div className={styles["location-title"]}>
                    {location ?? "-"}
                  </div>
                </div>

                {/* this starts new MO form */}
                <button
                  className={styles["mo-item-open"]}
                  aria-label="Open item"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedLocation(location);
                    setView("new");
                  }}
                >
                  <Plus />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* for locations with existing cases */}
      {locationsWithCases.map((r, idx: number) => {
        const leaveTotal =
          (Number(r.leave_sick_count) || 0) +
          (Number(r.leave_business_count) || 0) +
          (Number(r.leave_other_count) || 0) +
          (Number(r.absent_count) || 0);
        const workTotal =
          (Number(r.shift_18_count) || 0) +
          (Number(r.shift_24_count) || 0) +
          (Number(r.shift_36_count) || 0);
        const wearTotal =
          (Number(r.wear_hat_count) || 0) +
          (Number(r.wear_shirt_count) || 0) +
          (Number(r.wear_pants_count ?? r.wear_pant_count) || 0) +
          (Number(r.wear_shoes_count ?? r.wear_shoe_count) || 0);
        const key = r.id ?? r.user_id ?? idx;
        return (
          <div className={styles["location-check-item"]} key={String(key)}>
            <div className={styles["location-check-avatar"]}>
              <MapPinCheck />
            </div>
            <div className={styles["location-check-body-col"]}>
              <div className={styles["location-check-top-row"]}>
                <div className={styles["item-title-wrap"]}>
                  <div className={styles["location-check-title"]}>
                    {r.location ?? "-"} | {r.created_by}
                  </div>
                  <span
                    className={[
                      styles["item-status-badge"],
                      approvalStatusClass(r.approved_status),
                    ].join(" ")}
                  >
                    <ApprovalStatusIcon value={r.approved_status} />
                    {approvalStatusLabel(r.approved_status)}
                  </span>
                </div>
                <p className={styles["location-check-date"]}>
                  {r.create_at
                    ? new Date(r.create_at).toLocaleDateString("th-TH")
                    : "วันนี้"}
                </p>
              </div>
              <div className={styles["location-check-bottom-row"]}>
                <div className={styles["location-check-lines"]}>
                  <div className={styles["location-check-sub"]}>
                    ลา: {leaveTotal} คน &nbsp; กำลังพล: {workTotal} คน
                  </div>
                  <div className={styles["location-check-sub"]}>
                    เครื่องแต่งกาย: {wearTotal} คน
                  </div>
                  {r.other_job
                    ? (() => {
                        const otherJob = String(r.other_job || "");
                        const otherShort =
                          otherJob.length > 20
                            ? otherJob.slice(0, 40) + "…"
                            : otherJob;
                        return (
                          <div
                            className={styles["location-check-sub"]}
                            title={otherJob}
                          >
                            อื่น: {otherShort}
                          </div>
                        );
                      })()
                    : null}
                </div>
                <button
                  className={styles["mo-item-open"]}
                  aria-label="Open item"
                  onClick={() => {
                    setSelectedReport(r);
                    setView("detail");
                  }}
                >
                  <ChevronRight />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>

    <div className={styles["guts-back-outer"]}>
      <button
        type="button"
        className={[styles["guts-btn"], styles["guts-back-btn"]].join(" ")}
        onClick={onCancel}
      >
        Back
      </button>
    </div>
  </>
);
}
