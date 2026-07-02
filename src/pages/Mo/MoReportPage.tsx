import { useState, useMemo, useEffect, useRef } from "react";
import {
  ArrowLeft,
  MapPin,
  Table2Icon,
  FileDown,
  Share2,
  Trash2,
  Pencil,
} from "lucide-react";
import { BsFillFileEarmarkPdfFill } from "react-icons/bs";
import { LuLandmark } from "react-icons/lu";
import styles from "./MoReportPage.module.css";
import { useStore } from "../../store/store";
import type { SectorReport } from "../../services/moReporTransaction.Service";
import DetailViewer from "../../components/mo/DetailViewer";
import MoUpdateForm from "../../components/mo/MoUpdateForm";
import PdfViewer, { type PdfViewerHandle } from "../../components/mo/PdfViewer";
import {
  ConfirmDeleteDialog,
  InfoModel,
  MoLoadingPopup,
} from "../../components/mo/popup";
import {
  clearMoReportState,
  persistMoReportState,
  readSavedMoReportState,
} from "./moPersistence";

type ReportListItem = SectorReport & {
  location?: string;
  create_at?: string;
  user_id?: string | number;
  wear_pants_count?: number | string;
  wear_shoes_count?: number | string;
};

type Props = {
  onCancel: () => void;
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
  const savedState = useMemo(() => readSavedMoReportState(), []);
  const [selectedDate, setSelectedDate] = useState(
    savedState?.selectedDate ?? initialDate ?? "",
  );

  // viewMode and PDF controls — lifted up from DetailViewer so MoReportPage is the orchestrator
  const [viewMode, setViewMode] = useState<"table" | "pdf">(
    savedState?.viewMode ?? "table",
  );
  const [pdfLoading, setPdfLoading] = useState(false);
  const pdfViewerRef = useRef<PdfViewerHandle>(null);

  const reports = useStore((state) => state.reports);
  const currentEmployee = useStore((state) => state.authEmployee);
  const fetchReports = useStore((state) => state.fetchReports);
  const deleteReport = useStore((state) => state.deleteReport);
  const storeLoading = useStore((state) => state.isLoading);

  // Page loading popup — same concept as MoHome
  // Shows until: min 1.5s passed AND store is no longer loading
  const [showLoading, setShowLoading] = useState(true);
  const pageLoadStartRef = useRef(0);
  const pageLoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MIN_PAGE_LOAD_MS = 1500;

  useEffect(() => {
    pageLoadStartRef.current = Date.now();
    return () => {
      if (pageLoadTimerRef.current) clearTimeout(pageLoadTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!storeLoading && showLoading) {
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
    return () => {
      if (pageLoadTimerRef.current) clearTimeout(pageLoadTimerRef.current);
    };
  }, [storeLoading, showLoading]);

  const handleDownload = async () => {
    setPdfLoading(true);
    // Let React commit the loading state before starting heavy PDF work
    await new Promise((resolve) => setTimeout(resolve, 50));
    try {
      await pdfViewerRef.current?.downloadPdf();
    } finally {
      setPdfLoading(false);
    }
  };

  const handleShare = async () => {
    setPdfLoading(true);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    try {
      await pdfViewerRef.current?.sharePdf();
    } finally {
      setPdfLoading(false);
    }
  };

  // currentDept holds a simple id/name object for the currently selected department
  const [currentDept, setCurrentDept] = useState<{
    id: number;
    name: string;
  } | null>(() => {
    if (initialDeptId) {
      return {
        id: initialDeptId,
        name:
          authEmployee && Number(authEmployee.department_id) === initialDeptId
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

  useEffect(() => {
    if (savedState?.selectedDate != null) return;
    if (initialDate !== undefined) {
      setSelectedDate(initialDate);
    }
  }, [initialDate, savedState?.selectedDate]);

  // Sync department name from reports slice when data loads
  useEffect(() => {
    if (
      reports.length > 0 &&
      currentDept &&
      currentDept.name.includes(String(currentDept.id))
    ) {
      const match = reports.find(
        (r) => Number(r.department_id) === currentDept.id,
      );
      const deptName =
        (match as any)?.department_name || (match as any)?.departmentName;
      if (deptName && deptName !== currentDept.name) {
        setCurrentDept((prev) => (prev ? { ...prev, name: deptName } : null));
      }
    }
  }, [reports, currentDept]);

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
    let byDept = selectedSectorId
      ? reports.filter(
          (r) => Number(r.department_id) === Number(selectedSectorId),
        )
      : reports;

    // Filter to only include reports with approved_status equal to APPROVED
    byDept = byDept.filter((r) => r.approved_status === "APPROVED");

    if (!selectedReportDate) return byDept;

    return byDept.filter((r) => {
      const reportDate =
        r.report_date ?? (r.created_at ? r.created_at.slice(0, 10) : "");
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
  >(savedState?.selectedTransactionId ?? null);

  // Edit mode state — threaded through to MoUpdateForm in MoSectorDetailForm
  const [isEditing, setIsEditing] = useState(savedState?.isEditing ?? false);
  const [isDirty, setIsDirty] = useState(false);
  const submitRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    persistMoReportState({
      selectedTransactionId,
      isEditing,
      viewMode,
      selectedDate,
    });
  }, [selectedTransactionId, isEditing, viewMode, selectedDate]);

  // Delete / success dialog state
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTitle, setSuccessTitle] = useState("ลบรายการสำเร็จ!");
  const [successDescription, setSuccessDescription] = useState(
    "ระบบได้ลบรายการนี้ออกจากระบบเรียบร้อยแล้ว",
  );

  useEffect(() => {
    setSelectedTransactionId((prev) => {
      if (prev == null) return null; // was on department view → stay there
      if (transactionIds.includes(prev)) return prev; // still valid → keep it
      return null; // their selection disappeared → fall back to department
    });
  }, [transactionIds]);

  // ── Selected transaction row
  const selectedTransactionRow = useMemo(() => {
    if (!selectedTransactionId) return null;
    return (
      visibleReports.find(
        (r: any) =>
          String(r.mo_daily_transaction_id) === String(selectedTransactionId) ||
          String(r.id) === String(selectedTransactionId),
      ) || null
    );
  }, [visibleReports, selectedTransactionId]);

  // ── Permission logic
  const currentReport = useMemo(() => {
    if (selectedTransactionId) {
      const matched = visibleReports.find(
        (r) =>
          String((r as any).mo_daily_transaction_id) ===
            String(selectedTransactionId) ||
          String(r.id) === String(selectedTransactionId),
      );
      if (matched) return matched;
    }
    if (selectedSectorId) {
      const matched = visibleReports.find(
        (r) => String(r.department_id) === String(selectedSectorId),
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
      } as unknown as SectorReport)
    );
  }, [
    selectedTransactionId,
    selectedSectorId,
    currentEmployee,
    visibleReports,
  ]);

  // ── Permission logic (same as MoDetailPage) ──
  const itemCreatedBy = (currentReport as any)?.created_by;
  const isDirector = currentEmployee
    ? (currentEmployee as any).position_name?.includes("หัวหน้า") ||
      (currentEmployee as any).position_name?.includes("manager") ||
      (currentEmployee as any).role_name === "admin"
    : false;
  const canEditData =
    !!currentEmployee &&
    (isDirector ||
      (itemCreatedBy &&
        itemCreatedBy !== "" &&
        currentEmployee.employee_code &&
        currentEmployee.employee_code !== "" &&
        itemCreatedBy === currentEmployee.employee_code));

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirmDelete(true);
  }

  function confirmDelete() {
    const idToDelete =
      (currentReport as any)?.id ||
      (currentReport as any)?.mo_daily_transaction_id ||
      selectedTransactionId;
    if (!idToDelete) return;
    setShowConfirmDelete(false);
    deleteReport(Number(idToDelete))
      .then(() => {
        setSuccessTitle("ลบรายการสำเร็จ!");
        setSuccessDescription("ระบบได้ลบรายการนี้ออกจากระบบเรียบร้อยแล้ว");
        setShowSuccess(true);
      })
      .catch((err: unknown) => {
        alert(`เกิดข้อผิดพลาดในการลบ: ${err}`);
      });
  }

  const sectorNameForPdf = useMemo(() => {
    if (selectedTransactionRow) {
      const nm = String(selectedTransactionRow.division_name ?? "");
      const m = nm.match(/เขต\s+[\d.]+/);
      const short = m ? m[0] : nm;
      return `ฝ่ายปฏิบัติการภาค ${selectedTransactionRow.department_id} ${short}`;
    }
    return selectedSectorName || "ฝ่ายปฏิบัติการภาค 9";
  }, [selectedTransactionRow, selectedSectorName]);

  return (
    <div className={styles["reportPage"]}>
      <MoLoadingPopup open={showLoading} />

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
                  <LuLandmark size="1.5em" />

                  <select
                    className={styles["sector-cell-select"]}
                    value={selectedTransactionId ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelectedTransactionId(v === "" ? null : Number(v));
                    }}
                  >
                    {/* value="" = department-level / summary view */}
                    <option value="">{currentDept?.name}</option>

                    {visibleReports.map((row: any) => {
                      const nm = String(row.division_name ?? "");
                      const m = nm.match(/เขต\s+[\d.]+/);
                      const short = m ? m[0] : nm;
                      return (
                        <option
                          key={row.id || row.mo_daily_transaction_id}
                          value={String(row.id || row.mo_daily_transaction_id)}
                        >
                          {short || row.division_name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </th>
            </tr>
          </thead>
          {selectedTransactionRow && (
            <tbody>
              <tr>
                <td colSpan={1} className={`${styles["first-column-cell"]}`}>
                  <MapPin className={styles["pin-icon"]} />
                </td>
                <td colSpan={3} className={styles["sector-cell-bodytext"]}>
                  {(() => {
                    const nm = String(
                      selectedTransactionRow.division_name ?? "",
                    );
                    const m = nm.match(/เขต\s+[\d.]+/);
                    return m ? m[0] : nm;
                  })()}
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>
      {/* Toolbar — table/pdf toggle + PDF actions */}
      <div className={styles["toolbar"]}>
        <div className={styles["toolbar-left"]}>
          <div
            className={`${styles["toggle-btn"]} ${viewMode === "table" ? styles["active"] : ""}`}
            onClick={() => setViewMode("table")}
            title="ดูตารางรายการ"
          >
            {/*<Table2Icon size={20} />*/}
            <span>ตารางรายการ</span>
          </div>
          <div
            className={`${styles["pdf-icon-container"]} ${styles["toggle-btn"]} ${viewMode === "pdf" ? styles["active"] : ""} ${transactionIds.length < 1 ? styles["disabled"] : ""}`}
            onClick={() => {
              if (transactionIds.length > 0) setViewMode("pdf");
            }}
            title={
              transactionIds.length < 1
                ? "ไม่มีรายงานให้ดู PDF"
                : "ดูรายงาน PDF"
            }
          >
            {/*<BsFillFileEarmarkPdfFill className={styles["pdf-icon"]} />*/}
            <span>รายงาน PDF</span>
            {viewMode === "pdf" && selectedTransactionId && (
              <MapPin className={styles["pin-icon-on-pdf"]} />
            )}
          </div>
        </div>

        {viewMode === "pdf" && (
          <div className={styles["toolbar-right"]}>
            <button
              type="button"
              className={`${styles["toolbar-action-btn"]} ${styles["pdf-download-btn"]}`}
              onClick={handleDownload}
              disabled={pdfLoading}
              title="ดาวน์โหลด PDF"
            >
              <BsFillFileEarmarkPdfFill size={18} />
              ดาวน์โหลด PDF
            </button>
            {/* <button
              type="button"
              className={styles["toolbar-action-btn"]}
              onClick={handleShare}
              disabled={pdfLoading}
              title="แชร์ PDF"
            >
              <Share2 size={22} />
            </button> */}
          </div>
        )}
      </div>

      {/* Toolbar — for detialPae edit+ delte bnt  for talbe viwemode*/}

      {/* Confirm delete dialog */}
      <ConfirmDeleteDialog
        open={showConfirmDelete}
        title="ยืนยันลบรายการนี้?"
        description="รายการนี้จะถูกลบออกจากระบบ ไม่สามารถกู้คืนได้"
        onCancel={() => setShowConfirmDelete(false)}
        onConfirm={confirmDelete}
      />

      {/* Success info dialog */}
      <InfoModel
        open={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          onCancel();
        }}
        variant="success"
        title={successTitle}
        description={successDescription}
      />

      {/* Content — only mount after initial loading is done */}
      {!showLoading && (
        <>
          {/* Content — MoReportPage decides what to show */}
          {viewMode === "table" ? (
            isEditing ? (
              <MoUpdateForm
                reportData={currentReport as unknown as Record<string, unknown>}
                onCancel={() => {
                  setIsEditing(false);
                  setIsDirty(false);
                }}
                isDirty={isDirty}
                onDirtyChange={setIsDirty}
                submitRef={submitRef}
              />
            ) : selectedTransactionId ? (
              <DetailViewer
                view="sector"
                selectedTransactionId={selectedTransactionId}
                departmentId={selectedSectorId}
                selectedDate={selectedDate}
              />
            ) : (
              <DetailViewer
                view="summary"
                departmentId={selectedSectorId}
                selectedDate={selectedDate}
              />
            )
          ) : (
            <PdfViewer
              ref={pdfViewerRef}
              item={currentReport}
              sectorName={sectorNameForPdf}
              isSector={!!selectedTransactionId}
              loading={pdfLoading}
            />
          )}
        </>
      )}

      <div className={styles["mo-back-outer"]}>
        <button
          type="button"
          className={styles["mo-back-btn"]}
          onClick={onCancel}
        >
          ย้อนกลับ
        </button>
      </div>
    </div>
  );
}
