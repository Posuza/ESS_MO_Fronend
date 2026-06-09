import { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  PinIcon,
  ArrowLeft,
  HomeIcon,
  FlagTriangleRightIcon,
  Table2Icon,
  Share2,
  FileDown,
} from "lucide-react";
import { BsFillFileEarmarkPdfFill } from "react-icons/bs";
import styles from "./MoReportPage.module.css";
import { useStore } from "../../store/store";
import type { SectorReport } from "../../store/store";
import MoSectorGroupDetailForm from "../../components/dev.Mo/MoSummariesForm";
import MoSectorDetailForm from "../../components/dev.Mo/MoSectorDetailForm";
import MoPdfViewer, {
  type MoPdfViewerHandle,
} from "../../components/dev.Mo/MoPdfViewer";

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
  initialDeptId?: number;
  initialDate?: string;
};

export default function MoReportPage({
  onCancel,
  initialDeptId,
  initialDate,
}: Props) {
  const authEmployee = useStore((s) => s.authEmployee);
  const empCode = authEmployee?.employee_code;
  const [selectedDate, setSelectedDate] = useState(initialDate ?? "");

  // currentDept holds a simple id/name object for the currently selected department
  const [currentDept, setCurrentDept] = useState<{
    id: number;
    name: string;
  } | null>(() => {
    if (initialDeptId) {
      return {
        id: initialDeptId,
        name: (authEmployee && Number(authEmployee.department_id) === initialDeptId)
          ? authEmployee.department_name
          : `ฝ่ายปฏิบัติการภาค ${initialDeptId}`,
      };
    }
    return { id: 9, name: "ฝ่ายปฏิบัติการภาค 9" };
  });

  // selectedLocation is a string (matches select option values). Initialize from currentDept if available.
  const [selectedLocation, setSelectedLocation] = useState<string>(
    currentDept?.name ?? "",
  );

  const reports = useStore((state) => state.reports);
  const currentEmployee = useStore((state) => state.authEmployee);
  const fetchReports = useStore((state) => state.fetchReports);

  useEffect(() => {
    if (initialDate !== undefined) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  // Sync department name from reports slice when data loads
  useEffect(() => {
    if (reports.length > 0 && currentDept && currentDept.name.includes(String(currentDept.id))) {
      const match = reports.find(r => Number(r.department_id) === currentDept.id);
      const deptName = (match as any)?.department_name || (match as any)?.departmentName;
      if (deptName) {
        setCurrentDept(prev => prev ? { ...prev, name: deptName } : null);
      }
    }
  }, [reports, currentDept]);

  const [viewMode, setViewMode] = useState<"table" | "pdf">("table");
  const [pdfLoading, setPdfLoading] = useState(false);
  const pdfViewerRef = useRef<MoPdfViewerHandle>(null);

  function submitSearch() {
    if (selectedDate) {
      const targetSectorId = selectedSectorId ?? undefined;

      fetchReports({
        department_id: targetSectorId ?? undefined,
        start_date: selectedDate,
        end_date: selectedDate,
      });
    }
  }

  const employeeLocations = useMemo(
    () =>
      currentEmployee?.department_name ? [currentEmployee.department_name] : [],
    [currentEmployee?.department_name],
  );

  /* derive department -> location mapping from fixture (matches component logic) */
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
        location: `Department ${k}`,
        sub_locations: Array.from(map[k]),
      }));
    } catch (e) {
      return [] as any;
    }
  }, [reports]);

  const mappedReports: ReportListItem[] = reports.map((r: SectorReport) => ({
    ...r,
    location:
      r.department_id === currentEmployee?.department_id &&
        currentEmployee?.department_name
        ? currentEmployee.department_name
        : (r as any).department_name ||
        (r as any).departmentName ||
        `ภาค ${r.department_id}`,
    create_at: r.created_at,
    user_id: r.created_by,
  }));

  const allSectorRecords = mappedReports;

  const uniqueLocations = Array.from(
    new Set(allSectorRecords.map((r) => r.location).filter(Boolean)),
  ).sort() as string[];

  /* Decide which location options to show in the top select:
     - If empCode is true, prefer the employee's locations; if none, fall back to derivedLocations.
     - Otherwise, use uniqueLocations from reports. */
  const locationOptions = useMemo(() => {
    // Build combined options: department-only and department + sub_location entries
    const derivedCombined = derivedLocations.flatMap(
      (d) =>
        [
          d.location,
          ...d.sub_locations.map((s) => `${d.location} | ${s}`),
        ] as string[],
    );

    if (empCode) {
      if (employeeLocations.length > 0) return employeeLocations;
      return derivedCombined.length > 0 ? derivedCombined : uniqueLocations;
    }

    // Default: prefer derivedCombined if available, otherwise fall back to uniqueLocations
    return derivedCombined.length > 0 ? derivedCombined : uniqueLocations;
  }, [empCode, employeeLocations, derivedLocations, uniqueLocations]);

  const selectedSectorName =
    selectedLocation || currentEmployee?.department_name || "";

  /* find selected department id (if any) so we can compute transactionIds */
  const selectedSectorId = useMemo(() => {
    const found = derivedLocations.find(
      (d) => d.location === selectedSectorName,
    );
    if (found) return found.id;
    return currentDept?.id ?? currentEmployee?.department_id ?? null;
  }, [derivedLocations, selectedSectorName, currentDept, currentEmployee]);

  const selectedReportDate = selectedDate || initialDate || "";

  const visibleReports = useMemo(() => {
    const byDept = selectedSectorId
      ? reports.filter(
        (r) => Number(r.department_id) === Number(selectedSectorId),
      )
      : reports;

    if (!selectedReportDate) return byDept;

    return byDept.filter((r) => {
      const reportDate =
        r.report_date ??
        (r.created_at ? r.created_at.slice(0, 10) : "");
      return reportDate === selectedReportDate;
    });
  }, [reports, selectedSectorId, selectedReportDate]);

  const transactionIds = useMemo(() => {
    const rows = visibleReports;
    if (!Array.isArray(rows) || !selectedSectorId) return [] as number[];
    const filtered = rows.filter(
      (r: any) => Number(r.department_id) === Number(selectedSectorId),
    );
    const ids = Array.from(
      new Set(filtered.map((r: any) => r.id || r.mo_daily_transaction_id)),
    ).filter(Boolean);
    return ids as number[];
  }, [selectedSectorId, visibleReports]);

  const [selectedTransactionId, setSelectedTransactionId] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (transactionIds.length > 0) {
      setSelectedTransactionId((prev) =>
        prev && transactionIds.includes(prev) ? prev : transactionIds[0],
      );
    } else {
      setSelectedTransactionId(null);
    }
  }, [transactionIds]);

  /* build a simple table like MoHome for department->transaction mapping */
  const locationTable = useMemo(() => {
    return visibleReports.map((t: any) => ({
      id: t.id || t.mo_daily_transaction_id,
      department_id: t.department_id,
      sub_location: t.sub_location,
      approved_status: t.approved_status,
      report_date: t.report_date,
      created_at: t.created_at,
    }));
  }, [visibleReports]);

  const selectedTransactionRow = useMemo(() => {
    if (!selectedTransactionId) return null;
    return (
      locationTable.find(
        (r) => String(r.id) === String(selectedTransactionId),
      ) || null
    );
  }, [locationTable, selectedTransactionId]);

  const currentReport = useMemo(() => {
    if (selectedTransactionId) {
      const matched = visibleReports.find(
        (r) =>
          (r as any).mo_daily_transaction_id === selectedTransactionId ||
          r.id === selectedTransactionId ||
          r.department_id === selectedTransactionRow?.department_id,
      );
      if (matched) return matched;
    }
    if (selectedSectorId) {
      const matched = visibleReports.find(
        (r) => r.department_id === selectedSectorId,
      );
      if (matched) return matched;
    }
    return (
      visibleReports[0] ||
      ({
        id: selectedTransactionId ?? 1,
        mo_daily_transaction_id: selectedTransactionId ?? 1,
        department_id: selectedSectorId ?? 1,
        created_at: new Date().toISOString(),
        created_by: currentEmployee?.employee_code || "ADMIN",
      } as SectorReport)
    );
  }, [
    reports,
    selectedTransactionId,
    selectedTransactionRow,
    selectedSectorId,
    currentEmployee,
    visibleReports,
  ]);

  const sectorNameForPdf = useMemo(() => {
    if (selectedTransactionRow) {
      return `ฝ่ายปฏิบัติการภาค ${selectedTransactionRow.department_id} ${selectedTransactionRow.sub_location}`;
    }
    return selectedSectorName || "ฝ่ายปฏิบัติการภาค 9";
  }, [selectedTransactionRow, selectedSectorName]);

  return (
    <>
      <div className={styles["mo-back-outer"]}>
        <button
          type="button"
          className={styles["mo-back-btn"]}
          onClick={onCancel}
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      {/* หน่วยงาน / Sector row */}

      <div className={styles["sector-table-wrapper"]}>
        <table className={styles["mo-table"]}>
          <thead>
            <tr>
              <th
                colSpan={4}
                className={`${styles["location-table-header"]} ${styles["no-border"]}`}
              >
                <div className={styles["sector-header-fullwidth"]}>
                  <HomeIcon />

                  <select
                    className={styles["sector-cell-select"]}
                    value={selectedTransactionId ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") setSelectedTransactionId(null);
                      else setSelectedTransactionId(Number(v));
                    }}
                  >
                    {/* Department-only option: selecting this shows the group form */}
                    {selectedSectorId ? (
                      <option value="">{String(selectedSectorId)}</option>
                    ) : (
                      <option value="">{currentDept?.name ?? "ทั้งหมด"}</option>
                    )}

                    {/* Show each transaction as "department_id sub_location" */}
                    {locationTable.map((row) => (
                      <option key={String(row.id)} value={String(row.id)}>
                        {`${currentDept?.name ?? ""} ${row.sub_location}`}
                      </option>
                    ))}
                  </select>
                </div>
              </th>
            </tr>
          </thead>
          {selectedTransactionRow && (
            <tbody>
              <tr>
                <td colSpan={1} className={`${styles["first-column-cell"]}`}>
                  {/*<PinIcon className={styles["pin-icon"]} />*/}
                  <FlagTriangleRightIcon className={styles["pin-icon"]} />
                </td>
                <td colSpan={3} className={styles["sector-cell-bodytext"]}>
                  {currentDept?.name ||
                    (selectedTransactionRow.department_id
                      ? `ฝ่ายปฏิบัติการภาค ${selectedTransactionRow.department_id}`
                      : "")}{" "}
                  {selectedTransactionRow.sub_location}
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>
      <div className={styles["toolbar"]}>
        <div className={styles["toolbar-left"]}>
          <div
            className={`${styles["toggle-btn"]} ${viewMode === "table" ? styles["active"] : ""}`}
            onClick={() => setViewMode("table")}
            title="ดูตารางรายการ"
          >
            <Table2Icon size={26} />
          </div>
          <div
            className={`${styles["pdf-icon-container"]} ${styles["toggle-btn"]} ${viewMode === "pdf" ? styles["active"] : ""}`}
            onClick={() => setViewMode("pdf")}
            title="ดูรายงาน PDF"
          >
            <BsFillFileEarmarkPdfFill className={styles["pdf-icon"]} />
            {selectedTransactionRow && (
              <FlagTriangleRightIcon className={styles["pin-icon-on-pdf"]} />
            )}
          </div>
        </div>
        {viewMode === "pdf" && (
          <div className={styles["toolbar-right"]}>
            <button
              type="button"
              className={styles["toolbar-action-btn"]}
              onClick={async () => {
                setPdfLoading(true);
                try {
                  await pdfViewerRef.current?.downloadPdf();
                } finally {
                  setPdfLoading(false);
                }
              }}
              disabled={pdfLoading}
              title="ดาวน์โหลด PDF"
            >
              {pdfLoading ? "..." : <FileDown size={23} />}
            </button>
            <button
              type="button"
              className={styles["toolbar-action-btn"]}
              onClick={async () => {
                setPdfLoading(true);
                try {
                  await pdfViewerRef.current?.sharePdf();
                } finally {
                  setPdfLoading(false);
                }
              }}
              disabled={pdfLoading}
              title="แชร์ PDF"
            >
              <Share2 size={22} />
            </button>
          </div>
        )}
      </div>

      {viewMode === "table" ? (
        selectedTransactionId ? (
          <MoSectorDetailForm selectedTransactionId={selectedTransactionId} />
        ) : (
          <MoSectorGroupDetailForm />
        )
      ) : (
        <MoPdfViewer
          ref={pdfViewerRef}
          item={currentReport}
          sectorName={sectorNameForPdf}
          onCancel={() => setViewMode("table")}
          isSector={!!selectedTransactionId}
        />
      )}
    </>
  );
}
