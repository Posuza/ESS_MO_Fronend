import { useEffect, useRef, useState, Fragment } from "react";
import html2pdf from "html2pdf.js";
import { ArrowLeft, Share2, MapPin } from "lucide-react";
import styles from "./MoSectorPdf.module.css";
import logoPng from "@/assets/logo/logo_guts.png"; // Direct import of PNG image

import type { SectorReport } from "../../store/store";
import SharePdfModal from "../Mo/SharePdfModal";

type Props = {
  item: SectorReport;
  sectorName: string;
  onCancel?: () => void;
  contentOnly?: boolean;
};

export default function MoSectorPdf({
  item,
  sectorName,
  onCancel,
  contentOnly,
}: Props) {
  const data = item;

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

  // No need for logoBase64 state or useEffect for SVG conversion anymore

  const PDF_WIDTH = 800;
  const PDF_HEIGHT = 1100;
  const containerRef = useRef<HTMLDivElement>(null);
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

  // ─── Table data: read directly from SectorReport fields (like MoUpdatePage) ──
  const selectedSector = (data as any).department_id ?? 1;

  interface PdfGroupItem {
    key: string;
    label: string;
    unit?: string;
    detail?: string;
    status?: string;
    note?: string;
    value?: string | number;
  }
  interface PdfGroup {
    key: string;
    title: string;
    items: PdfGroupItem[];
  }

  const group1: PdfGroup[] = [
    {
      key: "dept",
      title: "หน่วยงานที่รับผิดชอบ",
      items: [
        {
          key: "dept_guard_post_count",
          label: "จุดรักษาการณ์ :",
          unit: "หน่วยงาน",
        },
        {
          key: "dept_current_personnel_count",
          label: "กำลังพลปัจจุบัน :",
          unit: "คน",
        },
        {
          key: "dept_missing_regular_count",
          label: "ขาดตัวประจำ :",
          unit: "หน่วยงาน",
        },
        {
          key: "dept_missing_personnel_count",
          label: "ขาดกำลังพล :",
          unit: "คน",
        },
        {
          key: "dept_supplement_count",
          label: "จัดกำลังพลเสริมพิเศษ :",
          unit: "คน",
        },
        {
          key: "dept_recruitment_count",
          label: "สรรหาผู้สมัครงานใหม่ :",
          unit: "คน",
        },
        {
          key: "dept_reserve_units_count",
          label: "จำนวนหน่วยงานสำรองเวร :",
          unit: "หน่วย",
        },
        {
          key: "dept_reserve_personnel_count",
          label: "จำนวนกำลังพลสำรองเวร :",
          unit: "นาย",
        },
      ],
    },
    {
      key: "leave",
      title: "การลา",
      items: [
        { key: "leave_personal_count", label: "ลากิจ :", unit: "คน" },
        { key: "leave_sick_count", label: "ลาป่วย :", unit: "คน" },
        { key: "leave_absent_count", label: "ขาดงาน :", unit: "คน" },
        { key: "leave_deserted_count", label: "หนีหาย :", unit: "คน" },
        { key: "leave_resigned_count", label: "ลาออก :", unit: "คน" },
        { key: "leave_terminated_count", label: "ไล่ออก :", unit: "คน" },
      ],
    },
    {
      key: "shift",
      title: "การบริหารการควงเวร",
      items: [
        { key: "shift_18_count", label: "18 ชั่วโมง :", unit: "คน" },
        { key: "shift_24_count", label: "24 ชั่วโมง :", unit: "คน" },
        { key: "shift_36_count", label: "36 ชั่วโมง :", unit: "คน" },
      ],
    },
    {
      key: "training",
      title: "อบรมและควบคุมหน้าที่งาน",
      items: [
        {
          key: "training_shift_change_count",
          label: "อบรมเปลี่ยนผลัด :",
          unit: "หน่วยงาน",
        },
        {
          key: "training_planned_count",
          label: "อบรมตามแผนงานที่กำหนด :",
          unit: "หน่วยงาน",
        },
        {
          key: "training_duty_control_count",
          label: "ควบคุมหน้าที่งาน :",
          unit: "หน่วยงาน",
        },
      ],
    },
  ];

  // Build group 2 (วินัยและการลงโทษ) from data.disciplines array (with static fallback)
  const group2Disciplines: PdfGroup[] = (() => {
    const items = (data as any).disciplines ?? [];
    const disciplineItems =
      Array.isArray(items) && items.length > 0
        ? items
        : [
          {
            key: "discipline_phone_count",
            label: "เล่นโทรศัพท์มือถือ :",
            value: 0,
          },
          { key: "discipline_belt_count", label: "ไม่มีเข็มขัด :", value: 0 },
          { key: "discipline_badge_count", label: "ไม่แขวนบัตร :", value: 0 },
          {
            key: "discipline_uniform_count",
            label: "ชุดชำรุดเก่า :",
            value: 0,
          },
        ];
    return [
      {
        key: "discipline",
        title: "วินัยและการลงโทษ",
        items: disciplineItems.map((d: any) => ({
          key: d.key ?? d.label,
          label: d.label ?? "-",
          unit: "คน",
          value: d.value ?? 0,
        })),
      },
    ];
  })();

  // Build group 3 (เข้าพบผู้ว่าจ้าง) from data.projects array
  const group3Projects: PdfGroup[] = (() => {
    const items = (data as any).projects ?? [];
    if (!Array.isArray(items) || items.length === 0) return [];
    return [
      {
        key: "meeting",
        title: "เข้าพบผู้ว่าจ้าง",
        items: items.map((p: any) => ({
          key: p.id ?? p.label,
          label: p.label ?? "-",
          detail: p.detail ?? "",
          status: p.status ?? "normal",
          note: p.note ?? "",
        })),
      },
    ];
  })();

  const renderPageHeader = (pageNo: number): JSX.Element => (
    <>
      <div className={styles["pdf-header-row"]}>
        <div className={styles["logo-section"]}>
          <img className={styles["pdf-logo"]} src={logoPng} alt="GUTS ESS" />
        </div>
        <div className={styles["header-divider"]} />
        <div className={styles["header-text-block"]}>
          <div className={styles["header-text-en"]}>
            <span className={styles["first-letter"]}>E</span>mployee{" "}
            <span className={styles["first-letter"]}>S</span>elf{" "}
            <span className={styles["first-letter"]}>S</span>ervice
          </div>
          <div className={styles["header-text-th"]}>ระบบบริการตนเอง</div>
          <div className={styles["header-text-sub"]}>
            สำหรับพนักงานสำนักงานและสายตรวจ
          </div>
        </div>
      </div>

      <div className={styles["pdf-title-bar"]}>
        รายงานประจำวันฝ่ายปฏิบัติการ (รายละเอียดภาค)
      </div>

      <div className={styles["pdf-meta-row"]}>
        <div className={styles["page-number-badge"]}>
          <span className={styles["page-num"]}>หน้าที่ {pageNo}</span>
        </div>
        <div className={styles["meta-location"]}>
          <span style={{ fontSize: "23px" }}>{sectorName || "-"}</span>
        </div>
        <div className={styles["meta-date"]}>{displayDate}</div>
      </div>
    </>
  );

  const pdfBody = (
    <>
      {/* pag1 */}
      <div className={styles["pdf-page"]}>
        {renderPageHeader(1)}

        <div className={styles["mo-tables-wrapper"]}>
          {/* ── group1 ── */}
          {group1.map((g, idx) => {
            const headerColSpan = 3;
            return (
              <div
                key={g.key}
                id={`mo-table-${g.key}`}
                data-section={g.key}
                aria-label={`MO table ${g.title}`}
                className={styles["mo-table-wrapper"]}
              >
                <table className={styles["mo-table"]}>
                  <thead>
                    <tr>
                      <th
                        colSpan={1}
                        className={`${styles["first-column-cell"]} ${styles["no-border"]}`}
                      >
                        {idx + 1}.
                      </th>
                      <th
                        colSpan={headerColSpan}
                        className={`${styles["mo-table-header"]} ${styles["no-border"]}`}
                      >
                        <div className={styles["mo-header"]}>
                          <p>{g.title}</p>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((r, itemIdx) => {
                      const val = String((data as any)[r.key] ?? "0");
                      return (
                        <tr key={r.key}>
                          <td className={styles["first-column-cell"]}>
                            {idx + 1}.{itemIdx + 1}
                          </td>
                          <td className={styles["second-column-cell"]}>
                            {r.label}
                          </td>
                          <td className={styles["third-column-cell"]}>
                            <div className={styles["third-column-text"]}>
                              {val}
                            </div>
                          </td>
                          <td className={styles["fourth-column-cell"]}>
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

          {/* ── group2 (วินัยและการลงโทษ) ── */}
          {group2Disciplines.map((g, idx) => {
            const headerColSpan = 3;
            return (
              <div
                key={g.key}
                id={`mo-table-${g.key}`}
                data-section={g.key}
                aria-label={`MO table ${g.title}`}
                className={styles["mo-table-wrapper"]}
              >
                <table className={styles["mo-table"]}>
                  <thead>
                    <tr>
                      <th
                        colSpan={1}
                        className={`${styles["first-column-cell"]} ${styles["no-border"]} ${styles["mo-table-header-red"]}`}
                      >
                        5
                      </th>
                      <th
                        colSpan={headerColSpan}
                        className={`${styles["mo-table-header"]} ${styles["mo-table-header-red"]} ${styles["no-border"]}`}
                      >
                        <div className={styles["mo-header"]}>
                          <p className={styles["mo-header-red-text"]}>
                            {g.title}
                          </p>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((r, itemIdx) => (
                      <tr key={r.key}>
                        <td className={styles["first-column-cell"]}>
                          5.{itemIdx + 1}
                        </td>
                        <td className={styles["second-column-cell"]}>
                          {r.label}
                        </td>
                        <td className={styles["third-column-cell"]}>
                          <div className={styles["third-column-text"]}>
                            {String(r.value ?? 0)}
                          </div>
                        </td>
                        <td className={styles["fourth-column-cell"]}>
                          {r.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
             {/* ── group3 (	เข้าพบผู้ว่าจ้าง) ── only show lable and  staus coumn wti status bgcolor like */} 

          })}

        </div>
      </div>

      {/* Page2 */}
      <div className={styles["pdf-page"]}>
        {renderPageHeader(2)}

        {/* ── group3 Detail Items ── */}
        {(() => {
          const g =
            group3Projects.length > 0
              ? group3Projects[0]
              : { key: "meeting", title: "เข้าพบผู้ว่าจ้าง", items: [] };
          const detailItems = g.items;

          return (
            <div
              key={g.key}
              id={`mo-table-${g.key}-details`}
              className={styles["mo-table-wrapper"]}
            >
              <table className={styles["mo-table"]}>
                <thead>
                  <tr>
                    <th
                      colSpan={1}
                      className={`${styles["first-column-cell"]} ${styles["no-border"]}`}
                    >
                      6
                    </th>
                    <th
                      colSpan={5}
                      className={`${styles["mo-table-header"]} ${styles["no-border"]}`}
                    >
                      <div className={`${styles["mo-header"]}`}>
                        <p className={styles["mo-header-red-text"]}>
                          {g.title} (รายละเอียด)
                        </p>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detailItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          textAlign: "center",
                          padding: "20px",
                          color: "#888",
                        }}
                      >
                        ยังไม่มีข้อมูลโครงการ
                      </td>
                    </tr>
                  ) : (
                    detailItems.map((it: any, itemIdx: number) => (
                      <Fragment key={it.key}>
                        {/* ── Item header: number + label (โครงการ) ── */}
                        <tr>
                          <td
                            className={styles["first-column-cell"]}
                            style={{ fontWeight: 700, verticalAlign: "middle" }}
                          >
                            6.{itemIdx + 1}
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontWeight: 700,
                              fontSize: "14px",
                              padding: "4px 6px",
                              textAlign: "left",
                            }}
                          >
                            {it.label ?? `รายการ ${it.key}`}
                          </td>
                        </tr>
                        {/* ── Detail (รายละเอียด) ── */}
                        <tr>
                          <td
                            style={{
                              fontWeight: 600,
                              background: "#f5f5f5",
                              padding: "4px 6px",
                              textAlign: "center",
                              fontSize: "12px",
                              borderRight: "1px solid #e5e7eb",
                            }}
                          >
                            รายละเอียด
                          </td>
                          <td
                            colSpan={5}
                            style={{ padding: "4px 6px", textAlign: "left" }}
                          >
                            {it.detail || "-"}
                          </td>
                        </tr>
                        {/* ── Status (สถานะ) ── */}
                        <tr>
                          <td
                            style={{
                              fontWeight: 600,
                              background: "#f5f5f5",
                              padding: "4px 6px",
                              textAlign: "center",
                              fontSize: "12px",
                              borderRight: "1px solid #e5e7eb",
                            }}
                          >
                            สถานะ
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              color: "#fff",
                              fontWeight: 700,
                              textAlign: "center",
                              padding: "4px 6px",
                              fontSize: "13px",
                              background:
                                it.status === "normal"
                                  ? "#4caf50"
                                  : it.status === "warning"
                                    ? "#ff9800"
                                    : it.status === "danger"
                                      ? "#b71c1c"
                                      : "#4caf50",
                            }}
                          >
                            {{
                              normal: "ปกติ",
                              warning: "ผิดปกติ",
                              danger: "ฉุกเฉิน",
                            }[it.status || "normal"] || "ปกติ"}
                          </td>
                        </tr>
                        {/* ── Note (หมายเหตุ) ── */}
                        <tr>
                          <td
                            style={{
                              fontWeight: 600,
                              background: "#f5f5f5",
                              padding: "4px 6px",
                              textAlign: "center",
                              fontSize: "12px",
                              borderRight: "1px solid #e5e7eb",
                            }}
                          >
                            หมายเหตุ
                          </td>
                          <td
                            colSpan={5}
                            style={{ padding: "4px 6px", textAlign: "left" }}
                          >
                            {it.note || "-"}
                          </td>
                        </tr>
                        {/* ── Separator between items ── */}
                        {itemIdx < detailItems.length - 1 && (
                          <tr>
                            <td
                              colSpan={6}
                              style={{
                                borderBottom: "1px dashed #ccc",
                                height: "4px",
                                padding: 0,
                              }}
                            ></td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

    </>
  );

  if (contentOnly) {
    return pdfBody;
  }

  return (
    <>
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

              id="guts-pdf-content"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              {pdfBody}
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
