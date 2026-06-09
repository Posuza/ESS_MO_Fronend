import { useEffect, useMemo, useRef, useState } from "react";
import html2pdf from "html2pdf.js";
import { MapPin, ArrowLeft, Share2, HomeIcon } from "lucide-react";
import styles from "./MoSummeriesPdf.module.css";
import { useStore } from "../../store/store";
import type { SectorReport } from "../../services.dev/moDailyTransaction.Service";
import SharePdfModal from "../Mo/SharePdfModal";

type Props = {
  item: SectorReport;
  sectorName: string;
  onCancel?: () => void;
  contentOnly?: boolean;
};

export default function MoSummeriesPdf({
  item,
  sectorName,
  onCancel,
  contentOnly,
}: Props) {
  const data = item;
  const reports = useStore((state) => state.reports);
  const formStyles = styles;

  // Date formatting
  let displayDate = "";
  const rawDate = data.report_date || data.created_at;
  if (rawDate) {
    const d = new Date(
      String(rawDate).includes("T") ? String(rawDate) : `${rawDate}T00:00:00`,
    );
    const day = d.getDate();
    const months = [
      "มกราคม",
      "กุมภาพันธ์",
      "มีนาคม",
      "เมษายน",
      "พฤษภาคม",
      "มิถุนายน",
      "กรกฎาคม",
      "สิงหาคม",
      "กันยายน",
      "ตุลาคม",
      "พฤศจิกายน",
      "ธันวาคม",
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear() + 543;
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    displayDate = `วันที่ ${day} เดือน ${month} พ.ศ. ${year} เวลา ${hours}:${mins} น.`;
  }

  const PDF_WIDTH = 800;
  const PDF_HEIGHT = 1100;
  const containerRef = useRef<HTMLDivElement>(null);
  // wrapperRef used when rendering repeated table wrappers (kept for parity with form components)
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(0.3);
  const [shareOpen, setShareOpen] = useState(false);
  // PDF generation loading state
  const [pdfLoading, setPdfLoading] = useState(false);
  // Share modal state
  const [sharePdfBlob, setSharePdfBlob] = useState<Blob | null>(null);

  // Generate PDF as Blob (for sharing)
  // Utility to close overlays and set scale to 1 for PDF generation
  const prepareForPdf = () => {
    // Close overlays/modals if any (e.g., share modal)
    setShareOpen(false);
    // Save current scale
    return scale;
  };

  // Utility to restore scale after PDF generation
  const restoreAfterPdf = (prevScale: number) => {
    setScale(prevScale);
  };

  const generatePdfBlob = async () => {
    const pdfElement = document.getElementById("guts-pdf-content");
    if (!pdfElement) return null;
    setPdfLoading(true);
    // Prepare: close overlays and set scale to 1
    const prevScale = prepareForPdf();

    // Temporarily remove transform and position styles for PDF generation
    const originalTransform = (pdfElement as HTMLElement).style.transform;
    const originalPosition = (pdfElement as HTMLElement).style.position;
    (pdfElement as HTMLElement).style.transform = "none";
    (pdfElement as HTMLElement).style.position = "static";

    // Wait for DOM to update
    await new Promise((res) => setTimeout(res, 150));
    try {
      const opt = {
        margin: 0,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: {
          unit: "px" as const,
          format: [PDF_WIDTH, PDF_HEIGHT] as [number, number],
          orientation: "portrait" as const,
        },
      };
      const worker = html2pdf().set(opt).from(pdfElement);
      const pdfBlob = await worker.outputPdf("blob");
      return pdfBlob;
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("PDF generation failed");
      return null;
    } finally {
      // Restore original styles
      (pdfElement as HTMLElement).style.transform = originalTransform;
      (pdfElement as HTMLElement).style.position = originalPosition;
      // Restore scale after PDF generation
      restoreAfterPdf(prevScale);
      setPdfLoading(false);
    }
  };

  // Download PDF (save as file)
  const handleDownloadPdf = async () => {
    const pdfElement = document.getElementById("guts-pdf-content");
    if (!pdfElement) return;
    setPdfLoading(true);
    // Prepare: close overlays and set scale to 1
    const prevScale = prepareForPdf();

    // Temporarily remove transform and position styles for PDF generation
    const originalTransform = (pdfElement as HTMLElement).style.transform;
    const originalPosition = (pdfElement as HTMLElement).style.position;
    (pdfElement as HTMLElement).style.transform = "none";
    (pdfElement as HTMLElement).style.position = "static";

    await new Promise((res) => setTimeout(res, 150));
    try {
      const opt = {
        margin: 0,
        filename: `MO_Report_${data.id || "report"}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: {
          unit: "px" as const,
          format: [PDF_WIDTH, PDF_HEIGHT] as [number, number],
          orientation: "portrait" as const,
        },
      };
      await html2pdf().set(opt).from(pdfElement).save();
    } catch (error) {
      console.error("PDF download failed:", error);
      alert("PDF download failed");
    } finally {
      // Restore original styles
      (pdfElement as HTMLElement).style.transform = originalTransform;
      (pdfElement as HTMLElement).style.position = originalPosition;
      // Restore scale after PDF generation
      restoreAfterPdf(prevScale);
      setPdfLoading(false);
    }
  };

  // Share PDF: generate blob and show modal with only PDF share
  // Share PDF: open custom share modal (no native Web Share)
  const handleSharePdf = async () => {
    const pdfBlob = await generatePdfBlob();
    if (!pdfBlob) return;
    setSharePdfBlob(pdfBlob);
    setShareOpen(true);
  };

  // Set initial scale to fit the full document on screen (after layout),
  // and re-fit whenever the screen is resized
  useEffect(() => {
    const fit = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (containerRef.current) {
            const w = containerRef.current.clientWidth;
            if (w > 0) {
              const f = w / PDF_WIDTH;
              setMinScale(f);
              setScale(f); // Always fit to width on mount/resize
            }
          }
        });
      });
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // Desktop: scroll over PDF to zoom in/out
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // stop page scroll
      setScale((s) => Math.min(3, Math.max(minScale, s - e.deltaY * 0.002)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [minScale]);

  // Mobile: pinch to zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let lastDist = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        lastDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      if (lastDist > 0) {
        setScale((s) => Math.min(3, Math.max(minScale, s * (dist / lastDist))));
      }
      lastDist = dist;
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, [minScale]);

  const scaledWidth = PDF_WIDTH * scale;
  const scaledHeight = PDF_HEIGHT * scale;

  // ─── Table layout data (mirrors MoSummariesForm) ──────────────────────
  const selectedSector = (data as any).department_id ?? 1;
  const selectedReportDate =
    data.report_date ?? (data.created_at ? data.created_at.slice(0, 10) : "");

  interface PdfGroupItem {
    key: string;
    displayKey?: string;
    label: string;
    unit?: string;
    status?: string;
  }
  interface PdfGroup {
    key: string;
    title: string;
    items: PdfGroupItem[];
  }

  type SummaryColumn = {
    id: number | string;
    sub_location: string;
    report: SectorReport;
  };

  const summaryReports = useMemo(() => {
    const byDepartment = (reports || []).filter(
      (report) =>
        Number(report.department_id) === Number(selectedSector),
    );

    if (!selectedReportDate) return byDepartment;

    return byDepartment.filter((report) => {
      const reportDate =
        report.report_date ??
        (report.created_at ? report.created_at.slice(0, 10) : "");
      return reportDate === selectedReportDate;
    });
  }, [reports, selectedSector, selectedReportDate]);

  const group1: PdfGroup[] = [
    {
      key: "1",
      title: "หน่วยงานที่รับผิดชอบ",
      items: [
        { key: "dept_guard_post_count", displayKey: "1.1", label: "จุดรักษาการณ์ :", unit: "หน่วยงาน" },
        { key: "dept_current_personnel_count", displayKey: "1.2", label: "กำลังพลปัจจุบัน :", unit: "คน" },
        { key: "dept_missing_regular_count", displayKey: "1.3", label: "ขาดตัวประจำ :", unit: "หน่วยงาน" },
        { key: "dept_missing_personnel_count", displayKey: "1.4", label: "ขาดกำลังพล :", unit: "คน" },
        { key: "dept_supplement_count", displayKey: "1.5", label: "จัดกำลังพลเสริมพิเศษ :", unit: "คน" },
        { key: "dept_recruitment_count", displayKey: "1.6", label: "สรรหาผู้สมัครงานใหม่ :", unit: "คน" },
        { key: "dept_reserve_units_count", displayKey: "1.7", label: "จำนวนหน่วยงานสำรองเวร :", unit: "หน่วย" },
        { key: "dept_reserve_personnel_count", displayKey: "1.8", label: "จำนวนกำลังพลสำรองเวร :", unit: "นาย" },
      ],
    },
    {
      key: "2",
      title: "การลา",
      items: [
        { key: "leave_personal_count", displayKey: "2.1", label: "ลากิจ :", unit: "คน" },
        { key: "leave_sick_count", displayKey: "2.2", label: "ลาป่วย :", unit: "คน" },
        { key: "leave_absent_count", displayKey: "2.3", label: "ขาดงาน :", unit: "คน" },
        { key: "leave_deserted_count", displayKey: "2.4", label: "หนีหาย :", unit: "คน" },
        { key: "leave_resigned_count", displayKey: "2.5", label: "ลาออก :", unit: "คน" },
        { key: "leave_terminated_count", displayKey: "2.6", label: "ไล่ออก :", unit: "คน" },
      ],
    },
    {
      key: "3",
      title: "การบริหารการควงเวร",
      items: [
        { key: "shift_18_count", displayKey: "3.1", label: "18 ชั่วโมง :", unit: "คน" },
        { key: "shift_24_count", displayKey: "3.2", label: "24 ชั่วโมง :", unit: "คน" },
        { key: "shift_36_count", displayKey: "3.3", label: "36 ชั่วโมง :", unit: "คน" },
      ],
    },
    {
      key: "4",
      title: "อบรมและควบคุมหน้าที่งาน",
      items: [
        { key: "training_shift_change_count", displayKey: "4.1", label: "อบรมเปลี่ยนผลัด :", unit: "หน่วยงาน" },
        { key: "training_planned_count", displayKey: "4.2", label: "อบรมตามแผนงานที่กำหนด :", unit: "หน่วยงาน" },
        { key: "training_duty_control_count", displayKey: "4.3", label: "ควบคุมหน้าที่งาน :", unit: "หน่วยงาน" },
      ],
    },
  ];

  const dynamicGroup2: PdfGroup[] = [
    {
      key: "5",
      title: "วินัยและการลงโทษ",
      items: [
        { key: "discipline_phone_count", displayKey: "5.1", label: "เล่นโทรศัพท์มือถือ :", unit: "คน" },
        { key: "discipline_belt_count", displayKey: "5.2", label: "ไม่มีเข็มขัด :", unit: "คน" },
        { key: "discipline_badge_count", displayKey: "5.3", label: "ไม่แขวนบัตร :", unit: "คน" },
        { key: "discipline_uniform_count", displayKey: "5.4", label: "ชุดชำรุดเก่า :", unit: "คน" },
      ],
    },
  ];

  const group3Static: PdfGroup[] = [
    {
      key: "6",
      title: "เข้าพบผู้ว่าจ้าง",
      items: [
        { key: "normal", displayKey: "6.1", label: "ปกติ", status: "normal" },
        { key: "warning", displayKey: "6.2", label: "ผิดปกติ", status: "warning" },
        { key: "danger", displayKey: "6.3", label: "จุดเด่น", status: "danger" },
      ],
    },
  ];

  const group3Data: PdfGroup[] = group3Static;

  const disciplineValue = (report: SectorReport, key: string) => {
    const fromArray = report.disciplines?.find((item) => item.key === key);
    if (fromArray) return Number(fromArray.value) || 0;
    return Number((report as any)[key]) || 0;
  };

  const projectStatusCount = (report: SectorReport, status: string) =>
    (report.projects || []).filter(
      (project) => (project.status || "normal") === status,
    ).length;

  const itemValue = (report: SectorReport, groupKey: string, key: string) => {
    if (groupKey === "5") return disciplineValue(report, key);
    return Number((report as any)[key]) || 0;
  };

  const debugLog = (label: string, obj: any) => {
    try {
      // eslint-disable-next-line no-console
      console.debug("MoSummariesPdf DEBUG:", label, obj);
    } catch (_) {
      // ignore
    }
  };

  const getCols = (): SummaryColumn[] => {
    const source = summaryReports.length > 0 ? summaryReports : [data];
    return source.map((report) => ({
      id: report.id || (report as any).mo_daily_transaction_id,
      sub_location: report.sub_location || "-",
      report,
    }));
  };
  // ──────────────────────────────────────────────────────────────────────

  if (contentOnly) {
    return (
      <>
        {/* Top Header Section */}
        <div className={styles["pdf-header-row"]}>
          <div className={styles["logo-section"]}>
            <span className={styles["logo-guts"]}>GUTS</span>
            <span className={styles["logo-ess"]}>ESS</span>
          </div>
          <div className={styles["header-divider"]} />
          <div className={styles["header-text-block"]}>
            <div className={styles["header-text-en"]}>
              Employee Self Service
            </div>
            <div className={styles["header-text-th"]}>ระบบบริการตนเอง</div>
            <div className={styles["header-text-sub"]}>
              สำหรับพนักงานสำนักงานและสายตรวจ
            </div>
          </div>
        </div>

        {/* Title Bar */}
        <div className={styles["pdf-title-bar"]}>
          MO-รายงานประจำวันฝ่ายปฏิบัติการ (สรุปภาพรวม)
        </div>

        {/* Meta Data Row */}
        <div className={styles["pdf-meta-row"]}>
          <div className={styles["meta-location"]}>
            <HomeIcon size={18} strokeWidth={2.5} />
            <span>{sectorName || "-"}</span>
          </div>
          <div className={styles["meta-date"]}>{displayDate}</div>
        </div>

        {/* Dynamic Multi-Column Tables Layout from MoSummariesForm */}
        <div className={`${styles["mo-tables-wrapper"]}`}>
          {/* dynamic sections rendered from group1 */}
          {group1.map((g, idx) => {
            // compute location columns once per group (used for header colspan and body)
            const cols = getCols();
            debugLog("group1 cols", { selectedSector, colsLength: cols.length });

            // total columns per row = 1 (index) + 1 (label) + cols.length + 1 (total) + 1 (unit)
            // group header should span all columns except the leading index column, so colspan = (totalCols - 1)
            // add 2 extra default columns as buffer so the header never appears shorter when tbody is collapsed
            const headerColSpan = cols.length + 3 + 2; // cols.length + 5

            return (
              <div
                key={g.key}
                ref={wrapperRef}
                className={styles["mo-table-wrapper"]}
              >
                {/* build columns from table1 (sub-locations) for the selected department */}
                <table className={styles["mo-table"]}>
                  <thead>
                    <tr>
                      <th
                        colSpan={1}
                        className={`${styles["first-column-cell"]} ${styles["no-border"]}`}
                      >
                        {idx + 1}.
                      </th>

                      {/* group title cell (expander) */}
                      <th
                        colSpan={headerColSpan}
                        className={`${styles["mo-table-header"]} ${styles["no-border"]}`}
                      >
                        <div className={`${styles["mo-header"]}`}>
                          <p>{g.title}</p>
                        </div>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {/* location header row inside tbody (moved from thead) */}
                    <tr key={`loc-header-${g.key}`}>
                      <td
                        colSpan={2}
                        className={` ${styles["second-column-header-cell"]} `}
                      >
                        <strong>หัวข้อ</strong>
                      </td>
                      {cols.map((c: any) => (
                        <td
                          key={String(c.id)}
                          className={`${styles["third-column-header1-cell"]}`}
                        >
                          <strong>{c.sub_location}</strong>
                        </td>
                      ))}
                      <td className={`${styles["third-column-header2-cell"]}`}>
                        <strong>รวม</strong>
                      </td>
                      <td
                        className={`${styles["fourth-column-header-cell"]}`}
                      ></td>
                    </tr>

                    {g.items.map((r) => {
                      const perLocVals = cols.map((c) =>
                        String(itemValue(c.report, g.key, r.key)),
                      );

                      const total = perLocVals.reduce((acc, v) => {
                        const n = Number(v) || 0;
                        return acc + n;
                      }, 0);

                      return (
                        <tr key={r.key}>
                          <td className={styles["first-column-cell"]}>
                            {r.displayKey ?? r.key}
                          </td>
                          <td className={styles["second-column-cell"]}>
                            {r.label}
                          </td>

                          {perLocVals.map((val, i) => (
                            <td
                              key={i}
                              className={`${styles["third-column-cell"]} ${String(val).length > 4 ? styles["third-column-wrap-cell"] : ""}`}
                            >
                              <div className={`${styles["third-column-text"]}`}>
                                {val}
                              </div>
                            </td>
                          ))}

                          <td className={`${styles["third-column-cell"]}`}>
                            <div className={`${styles["third-column-text"]}`}>
                              {String(total)}
                            </div>
                          </td>

                          <td className={`${styles["fourth-column-cell"]}`}>
                            {r.unit}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}

          {dynamicGroup2.map((g, idx) => {
            // compute location columns for dynamic group similar to group1
            const cols = getCols();
            debugLog("dynamicGroup2 cols", { selectedSector, colsLength: cols.length });

            const headerColSpan = cols.length + 3 + 2;

            return (
              <div
                key={g.key}
                ref={wrapperRef}
                className={styles["mo-table-wrapper"]}
              >
                <table className={styles["mo-table"]}>
                  <thead>
                    <tr>
                      <th
                        colSpan={1}
                        className={`${styles["first-column-cell"]} ${styles["no-border"]} ${styles["mo-table-header-red"]}`}
                      >
                        {idx + 1}.
                      </th>
                      <th
                        colSpan={headerColSpan}
                        className={`${styles["mo-table-header"]} ${styles["mo-table-header-red"]} ${styles["no-border"]}`}
                      >
                        <div className={`${styles["mo-header"]}`}>
                          <p
                            className={
                              g.key === "5" ? styles["mo-header-red-text"] : ""
                            }
                          >
                            {g.title}
                          </p>
                        </div>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {/* location header row inside tbody (moved from thead) */}
                    <tr key={`loc-header-${g.key}`}>
                      <td
                        colSpan={2}
                        className={` ${styles["second-column-header-cell"]} `}
                      >
                        <strong>หัวข้อ</strong>
                      </td>
                      {cols.map((c: any) => (
                        <td
                          key={String(c.id)}
                          className={`${styles["third-column-header1-cell"]}`}
                        >
                          <strong>{c.sub_location}</strong>
                        </td>
                      ))}
                      <td className={`${styles["third-column-header2-cell"]}`}>
                        <strong>รวม</strong>
                      </td>
                      <td
                        className={`${styles["fourth-column-header-cell"]}`}
                      ></td>
                    </tr>

                    {g.items.map((r) => {
                      const perLocVals = cols.map((c) =>
                        String(itemValue(c.report, g.key, r.key)),
                      );

                      // total is either existing count (editable) or sum of perLocVals if no count present
                      const totalFromTable = perLocVals.reduce(
                        (acc, v) => acc + (Number(v) || 0),
                        0,
                      );

                      return (
                        <tr key={r.key}>
                          <td className={styles["first-column-cell"]}>
                            {r.displayKey ?? r.key}
                          </td>
                          <td className={styles["second-column-cell"]}>
                            {r.label}
                          </td>

                          {perLocVals.map((val, i) => (
                            <td
                              key={i}
                              className={`${styles["third-column-cell"]} ${String(val).length > 4 ? styles["third-column-wrap-cell"] : ""}`}
                            >
                              <div className={`${styles["third-column-text"]}`}>
                                {val}
                              </div>
                            </td>
                          ))}

                          <td className={`${styles["third-column-cell"]}`}>
                            <div className={`${styles["third-column-text"]}`}>
                              {String(totalFromTable)}
                            </div>
                          </td>

                          <td
                            className={`${styles["fourth-column-cell"]} ${styles["fourth-column-cell-danger"]}`}
                          >
                            {r.unit}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}

          {/* dynamic sections rendered from group3 (use group3Data which is filtered by transaction id) */}
          {group3Data.map((g) => {
            const cols = getCols();
            debugLog("group3 cols", { selectedSector, colsLength: cols.length });

            const headerColSpan = cols.length + 3 + 2;

            return (
              <div
                key={g.key}
                ref={wrapperRef}
                className={styles["mo-table-wrapper"]}
              >
                <table className={styles["mo-table"]}>
                  <thead>
                    <tr>
                      <th
                        colSpan={1}
                        className={`${styles["first-column-cell"]} ${styles["no-border"]}`}
                      >
                        {g.key}.
                      </th>
                      <th
                        colSpan={headerColSpan}
                        className={`${styles["mo-table-header"]} ${styles["no-border"]}`}
                      >
                        <div className={`${styles["mo-header"]}`}>
                          <p className={styles["mo-header-red-text"]}>
                            {g.title}
                          </p>
                        </div>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {/* location header row inside tbody (moved from thead) */}
                    <tr key={`loc-header-${g.key}`}>
                      <td
                        colSpan={2}
                        className={` ${styles["second-column-header-cell"]} `}
                      >
                        <strong>หัวข้อ</strong>
                      </td>
                      {cols.map((c: any) => (
                        <td
                          key={String(c.id)}
                          className={`${styles["third-column-header1-cell"]}`}
                        >
                          <strong>{c.sub_location}</strong>
                        </td>
                      ))}
                      <td className={`${styles["third-column-header2-cell"]}`}>
                        <strong>รวม</strong>
                      </td>
                      <td
                        className={`${styles["fourth-column-header-cell"]}`}
                      ></td>
                    </tr>

                    {g.items.map((it) => {
                      const rowKey = it.key;
                      const perLocVals = cols.map((c) =>
                        String(projectStatusCount(c.report, it.status || it.key)),
                      );

                      const totalForStatus = perLocVals.reduce((acc, v) => acc + (Number(v) || 0), 0);

                      return (
                        <tr key={rowKey}>
                          <td className={styles["first-column-cell"]}>
                            {it.displayKey ?? rowKey}
                          </td>

                          <td
                            className={`${styles["group3-second-column-cell"]} ${styles[`status-${it.status || "normal"}`]}`}
                          >
                            {it.label}
                          </td>

                          {perLocVals.map((val, i) => (
                            <td
                              key={i}
                              className={`${styles["third-column-cell"]} ${String(val).length > 4 ? styles["third-column-wrap-cell"] : ""}`}
                            >
                              <div className={`${styles["third-column-text"]}`}>
                                {val}
                              </div>
                            </td>
                          ))}

                          <td className={`${styles["third-column-cell"]}`}>
                            <div className={`${styles["third-column-text"]}`}>
                              {String(totalForStatus)}
                            </div>
                          </td>

                          <td className={`${styles["fourth-column-cell"]}`}>
                            หน่วยงาน
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* APPROVAL REMARK SECTION */}
        <div className={styles["approval-divider"]}>
          <div className={styles["approval-divider-line"]}></div>
          <div className={styles["approval-divider-text"]}>การอนุมัติ</div>
          <div className={styles["approval-divider-line"]}></div>
        </div>

        <div className={styles["approval-content"]}>
          <p className={styles["approval-text"]}>
            {data.approved_remark
              ? `• ${data.approved_remark}`
              : "• วันที่ 5 เดือน"}
          </p>
        </div>

        {/* SIGNATURE SECTIONS */}
        <div className={styles["pdf-signatures"]}>
          <div className={styles["signature-slot"]}>
            <div className={styles["signature-title"]}>ผู้ บันทึก</div>
            <div className={styles["signature-line"]}>
              {data.created_by || "ADMIN"}
            </div>
          </div>
          <div className={styles["signature-slot"]}>
            <div className={styles["signature-title"]}>ผู้ อำนวยงาน</div>
            <div className={styles["signature-line"]}>
              {data.approved_by || "\u00A0"}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ACTION BAR - Outside wrapper to prevent overflow conflicts */}
      <div className={styles["btns-box"]}>
        <button
          className={styles["gut-back-icon"]}
          onClick={onCancel}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <div className={styles["guts-action-icons"]} aria-hidden={false}>
          <button
            type="button"
            className={styles["guts-icon-btn"]}
            title="Download PDF"
            aria-label="Download PDF"
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            style={{ marginRight: 8 }}
          >
            {pdfLoading ? "..." : "PDF"}
          </button>
          <button
            type="button"
            className={styles["guts-icon-btn"]}
            title="Share PDF"
            aria-label="Share PDF"
            onClick={handleSharePdf}
            disabled={pdfLoading}
          >
            {pdfLoading ? "..." : <Share2 size={18} />}
          </button>
        </div>
      </div>

      {/* PDF VIEWER WRAPPER */}
      <div className={styles["pdf-viewer-wrapper"]}>
        {/* CANVAS VIEWPORT */}
        <div className={styles["pdf-container"]} ref={containerRef}>
          {/* Sized wrapper so layout height tracks the scaled size */}
          <div
            style={{
              width: scaledWidth,
              height: scaledHeight,
              minHeight: "100%",
              position: "relative",
              flexShrink: 0,
            }}
          >
            <div
              className={styles["pdf-page"]}
              id="guts-pdf-content"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              {/* Top Header Section */}
              <div className={styles["pdf-header-row"]}>
                <div className={styles["logo-section"]}>
                  <span className={styles["logo-guts"]}>GUTS</span>
                  <span className={styles["logo-ess"]}>ESS</span>
                </div>
                <div className={styles["header-divider"]} />
                <div className={styles["header-text-block"]}>
                  <div className={styles["header-text-en"]}>
                    Employee Self Service
                  </div>
                  <div className={styles["header-text-th"]}>
                    ระบบบริการตนเอง
                  </div>
                  <div className={styles["header-text-sub"]}>
                    สำหรับพนักงานสำนักงานและสายตรวจ
                  </div>
                </div>
              </div>

              {/* Title Bar */}
              <div className={styles["pdf-title-bar"]}>
                MO-รายงานประจำวันฝ่ายปฏิบัติการ
              </div>

              {/* Meta Data Row */}
              <div className={styles["pdf-meta-row"]}>
                <div className={styles["meta-location"]}>
                  <MapPin size={18} strokeWidth={2.5} />
                  <span>{sectorName || "-"}</span>
                </div>
                <div className={styles["meta-date"]}>{displayDate}</div>
              </div>

              {/* Tables Section — mirrors MoSummariesForm layout */}
              <div className={formStyles["mo-tables-wrapper"]}>
                {/* ── group1 ── */}
                {group1.map((g, idx) => {
                  const cols = getCols();
                  debugLog("group1 cols (form)", { selectedSector, colsLength: cols.length });
                  const headerColSpan = cols.length + 3 + 2;
                  return (
                    <div key={g.key} className={formStyles["mo-table-wrapper"]}>
                      <table className={formStyles["mo-table"]}>
                        <thead>
                          <tr>
                            <th
                              colSpan={1}
                              className={`${formStyles["first-column-cell"]} ${formStyles["no-border"]}`}
                            >
                              {idx + 1}.
                            </th>
                            <th
                              colSpan={headerColSpan}
                              className={`${formStyles["mo-table-header"]} ${formStyles["no-border"]}`}
                            >
                              <div className={formStyles["mo-header"]}>
                                <p>{g.title}</p>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr key={`loc-header-${g.key}`}>
                            <td
                              colSpan={2}
                              className={
                                formStyles["second-column-header-cell"]
                              }
                            >
                              <strong>หัวข้อ</strong>
                            </td>
                            {cols.map((c: any) => (
                              <td
                                key={String(c.id)}
                                className={
                                  formStyles["third-column-header1-cell"]
                                }
                              >
                                <strong>{c.sub_location}</strong>
                              </td>
                            ))}
                            <td
                              className={
                                formStyles["third-column-header2-cell"]
                              }
                            >
                              <strong>รวม</strong>
                            </td>
                            <td
                              className={
                                formStyles["fourth-column-header-cell"]
                              }
                            />
                          </tr>

                          {g.items.map((r) => {
                            const perLocVals = cols.map((c) =>
                              String(itemValue(c.report, g.key, r.key)),
                            );
                            const total = perLocVals.reduce(
                              (acc, v) => acc + (Number(v) || 0),
                              0,
                            );
                            return (
                              <tr key={r.key}>
                                <td className={formStyles["first-column-cell"]}>
                                  {r.displayKey ?? r.key}
                                </td>
                                <td
                                  className={formStyles["second-column-cell"]}
                                >
                                  {r.label}
                                </td>
                                {perLocVals.map((val, i) => (
                                  <td
                                    key={i}
                                    className={`${formStyles["third-column-cell"]} ${
                                      String(val).length > 4
                                        ? formStyles["third-column-wrap-cell"]
                                        : ""
                                    }`}
                                  >
                                    <div
                                      className={
                                        formStyles["third-column-text"]
                                      }
                                    >
                                      {val}
                                    </div>
                                  </td>
                                ))}
                                <td className={formStyles["third-column-cell"]}>
                                  <div
                                    className={formStyles["third-column-text"]}
                                  >
                                    {String(total)}
                                  </div>
                                </td>
                                <td
                                  className={formStyles["fourth-column-cell"]}
                                >
                                  {r.unit}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}

                {/* ── group2 ── */}
                {dynamicGroup2.map((g, idx) => {
                  const cols = getCols();
                  const headerColSpan = cols.length + 3 + 2;
                  return (
                    <div key={g.key} className={formStyles["mo-table-wrapper"]}>
                      <table className={formStyles["mo-table"]}>
                        <thead>
                          <tr>
                            <th
                              colSpan={1}
                              className={`${formStyles["first-column-cell"]} ${formStyles["no-border"]} ${formStyles["mo-table-header-red"]}`}
                            >
                              {idx + 1}.
                            </th>
                            <th
                              colSpan={headerColSpan}
                              className={`${formStyles["mo-table-header"]} ${formStyles["mo-table-header-red"]} ${formStyles["no-border"]}`}
                            >
                              <div className={formStyles["mo-header"]}>
                                <p
                                  className={
                                    g.key === "5"
                                      ? formStyles["mo-header-red-text"]
                                      : ""
                                  }
                                >
                                  {g.title}
                                </p>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr key={`loc-header-${g.key}`}>
                            <td
                              colSpan={2}
                              className={
                                formStyles["second-column-header-cell"]
                              }
                            >
                              <strong>หัวข้อ</strong>
                            </td>
                            {cols.map((c: any) => (
                              <td
                                key={String(c.id)}
                                className={
                                  formStyles["third-column-header1-cell"]
                                }
                              >
                                <strong>{c.sub_location}</strong>
                              </td>
                            ))}
                            <td
                              className={
                                formStyles["third-column-header2-cell"]
                              }
                            >
                              <strong>รวม</strong>
                            </td>
                            <td
                              className={
                                formStyles["fourth-column-header-cell"]
                              }
                            />
                          </tr>

                          {g.items.map((r) => {
                            const perLocVals = cols.map((c) =>
                              String(itemValue(c.report, g.key, r.key)),
                            );
                            const totalFromTable = perLocVals.reduce(
                              (acc, v) => acc + (Number(v) || 0),
                              0,
                            );
                            return (
                              <tr key={r.key}>
                                <td className={formStyles["first-column-cell"]}>
                                  {r.displayKey ?? r.key}
                                </td>
                                <td
                                  className={formStyles["second-column-cell"]}
                                >
                                  {r.label}
                                </td>
                                {perLocVals.map((val, i) => (
                                  <td
                                    key={i}
                                    className={`${formStyles["third-column-cell"]} ${
                                      String(val).length > 4
                                        ? formStyles["third-column-wrap-cell"]
                                        : ""
                                    }`}
                                  >
                                    <div
                                      className={
                                        formStyles["third-column-text"]
                                      }
                                    >
                                      {val}
                                    </div>
                                  </td>
                                ))}
                                <td className={formStyles["third-column-cell"]}>
                                  <div
                                    className={formStyles["third-column-text"]}
                                  >
                                    {String(totalFromTable)}
                                  </div>
                                </td>
                                <td
                                  className={`${formStyles["fourth-column-cell"]} ${formStyles["fourth-column-cell-danger"]}`}
                                >
                                  {r.unit}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}

                {/* ── group3 ── */}
                {group3Data.map((g) => {
                  const cols = getCols();
                  const headerColSpan = cols.length + 3 + 2;
                  return (
                    <div key={g.key} className={formStyles["mo-table-wrapper"]}>
                      <table className={formStyles["mo-table"]}>
                        <thead>
                          <tr>
                            <th
                              colSpan={1}
                              className={`${formStyles["first-column-cell"]} ${formStyles["no-border"]}`}
                            >
                              {g.key}.
                            </th>
                            <th
                              colSpan={headerColSpan}
                              className={`${formStyles["mo-table-header"]} ${formStyles["no-border"]}`}
                            >
                              <div className={formStyles["mo-header"]}>
                                <p className={formStyles["mo-header-red-text"]}>
                                  {g.title}
                                </p>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr key={`loc-header-${g.key}`}>
                            <td
                              colSpan={2}
                              className={
                                formStyles["second-column-header-cell"]
                              }
                            >
                              <strong>หัวข้อ</strong>
                            </td>
                            {cols.map((c: any) => (
                              <td
                                key={String(c.id)}
                                className={
                                  formStyles["third-column-header1-cell"]
                                }
                              >
                                <strong>{c.sub_location}</strong>
                              </td>
                            ))}
                            <td
                              className={
                                formStyles["third-column-header2-cell"]
                              }
                            >
                              <strong>รวม</strong>
                            </td>
                            <td
                              className={
                                formStyles["fourth-column-header-cell"]
                              }
                            />
                          </tr>

                          {g.items.map((it) => {
                            const rowKey = it.key;
                            const perLocVals = cols.map((c) =>
                              String(projectStatusCount(c.report, it.status || it.key)),
                            );
                            const totalForStatus = perLocVals.reduce((acc, v) => acc + (Number(v) || 0), 0);
                            return (
                              <tr key={rowKey}>
                                <td className={formStyles["first-column-cell"]}>
                                  {it.displayKey ?? rowKey}
                                </td>
                                <td
                                  className={`${formStyles["group3-second-column-cell"]} ${formStyles[`status-${it.status || "normal"}`]}`}
                                >
                                  {it.label}
                                </td>
                                {perLocVals.map((val, i) => (
                                  <td
                                    key={i}
                                    className={`${formStyles["third-column-cell"]} ${
                                      String(val).length > 4
                                        ? formStyles["third-column-wrap-cell"]
                                        : ""
                                    }`}
                                  >
                                    <div
                                      className={
                                        formStyles["third-column-text"]
                                      }
                                    >
                                      {val}
                                    </div>
                                  </td>
                                ))}
                                <td className={formStyles["third-column-cell"]}>
                                  <div
                                    className={formStyles["third-column-text"]}
                                  >
                                    {String(totalForStatus)}
                                  </div>
                                </td>
                                <td
                                  className={formStyles["fourth-column-cell"]}
                                >
                                  หน่วยงาน
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>

              {/* APPROVAL REMARK SECTION */}
              <div className={styles["approval-divider"]}>
                <div className={styles["approval-divider-line"]}></div>
                <div className={styles["approval-divider-text"]}>
                  การอนุมัติ
                </div>
                <div className={styles["approval-divider-line"]}></div>
              </div>

              <div className={styles["approval-content"]}>
                <p className={styles["approval-text"]}>
                  {data.approved_remark
                    ? `• ${data.approved_remark}`
                    : "• วันที่ 5 เดือน"}
                </p>
              </div>

              {/* SIGNATURE SECTIONS */}
              <div className={styles["pdf-signatures"]}>
                <div className={styles["signature-slot"]}>
                  <div className={styles["signature-title"]}>ผู้ บันทึก</div>
                  <div className={styles["signature-line"]}>
                    {data.created_by || "ADMIN"}
                  </div>
                </div>
                <div className={styles["signature-slot"]}>
                  <div className={styles["signature-title"]}>ผู้ อำนวยงาน</div>
                  <div className={styles["signature-line"]}>
                    {data.approved_by || "\u00A0"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Show SharePdfModal with only PDF share if sharePdfBlob is set */}
      <SharePdfModal
        open={shareOpen}
        onClose={() => {
          setShareOpen(false);
          setSharePdfBlob(null);
        }}
        shareUrl={""}
        pdfBlob={sharePdfBlob}
      />
    </>
  );
}
