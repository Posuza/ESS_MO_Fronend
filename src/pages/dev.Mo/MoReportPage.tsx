import { useState } from "react";
import {
  ChevronRight,
  Home,
  Search,
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";
import styles from "./MoHome.module.css";
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
  onOpenDetail: (item: SectorReport) => void;
};

export default function MoReportPage({
  empCode,
  onCancel,
  onOpenDetail,
}: Props) {
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    location: "",
    date: "",
  });

  const reports = useStore((state) => state.reports);
  const currentEmployee = useStore((state) => state.authEmployee);
  const fetchReports = useStore((state) => state.fetchReports);

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

  function ApprovalStatusIcon({
    value,
  }: {
    value?: "PENDING" | "APPROVED" | "REJECT" | string;
  }) {
    const status = toApprovalStatus(value);
    if (status === "APPROVED") {
      return <CheckCircle2 size={12} strokeWidth={2.2} />;
    }
    if (status === "REJECT") {
      return <XCircle size={12} strokeWidth={2.2} />;
    }
    return <Clock3 size={12} strokeWidth={2.2} />;
  }

  function submitSearch() {
    setSearchSubmitted(true);
    setSearchFilters({ location: selectedLocation, date: selectedDate });

    if (selectedDate) {
      const targetSectorId = selectedLocation
        ? currentEmployee?.department_id
        : undefined;

      fetchReports({
        department_id: targetSectorId ?? undefined,
        start_date: selectedDate,
        end_date: selectedDate,
      });
    }
  }

  const employeeLocations = currentEmployee?.department_name
    ? [currentEmployee.department_name]
    : [];

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

  const allSectorRecords = mappedReports;

  const uniqueLocations = Array.from(
    new Set(allSectorRecords.map((r) => r.location).filter(Boolean)),
  ).sort() as string[];

  const filteredData = !searchSubmitted
    ? []
    : allSectorRecords.filter((r) => {
        const locationMatch =
          !searchFilters.location || r.location === searchFilters.location;
        const dateMatch =
          !searchFilters.date || r.create_at?.startsWith(searchFilters.date);
        return locationMatch && dateMatch;
      });

  return (
    <>
      <div className={styles["mo-search"]}>
        <select
          value={selectedLocation}
          onChange={(e) => {
            setSelectedLocation(e.target.value);
            setSearchSubmitted(false);
          }}
          className={styles["guts-mo-search-input"]}
        >
          <option value="">ทั้งหมด (ภาค)</option>
          {(empCode ? employeeLocations : uniqueLocations).map(
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
            setSearchSubmitted(false);
          }}
          className={styles["guts-mo-search-input"]}
          max={new Date().toISOString().split("T")[0]}
        />
        <button
          className={styles["mo-search-clear"]}
          aria-label="Search"
          onClick={submitSearch}
          type="button"
          disabled={!selectedLocation || !selectedDate}
        >
          <Search />
        </button>
      </div>

      <div className={styles["location-list"]}>
        <div className={styles["location-header"]}>
          บันทึก ({Math.min(5, filteredData.length)} รายการ)
        </div>
        {filteredData.slice(0, 4).map((r, idx: number) => {
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
            <div
              className={styles["search-result"]}
              key={String(key) + "-search"}
              onClick={() => onOpenDetail(r)}
            >
              <div className={styles["result-avatar"]}>
                <Home />
              </div>
              <div className={styles["result-body-col"]}>
                <div className={styles["result-top-row"]}>
                  <div className={styles["item-title-wrap"]}>
                    <div className={styles["result-title"]}>
                      {r.location ?? "-"}
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
                  <p className={styles["result-date"]}>
                    {r.create_at
                      ? new Date(r.create_at).toLocaleDateString("th-TH")
                      : "วันนี้"}
                  </p>
                </div>
                <div className={styles["result-bottom-row"]}>
                  <div className={styles["result-lines"]}>
                    <div className={styles["result-sub"]}>
                      ลา: {leaveTotal} คน &nbsp; กำลังพล: {workTotal} คน
                    </div>
                    <div className={styles["result-sub"]}>
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
                              className={styles["result-sub"]}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDetail(r);
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
