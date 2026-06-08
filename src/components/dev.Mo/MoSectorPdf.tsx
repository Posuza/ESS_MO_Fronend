import { useEffect, useRef, useState } from "react";
import html2pdf from "html2pdf.js";
import { MapPin, ArrowLeft, Share2, FlagTriangleLeftIcon } from "lucide-react";
import styles from "./MoSectorPdf.module.css";

import type { SectorReport } from "../../store/store";
import newCaseData from "../../temp_data/NewCase/newCase.json";
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
  if (data.created_at) {
    const d = new Date(data.created_at);
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

  // ─── Table layout data (mirrors MoSectorDetailForm) ────────────────────
  const selectedSector = (data as any).department_id ?? 1;

  interface PdfGroupItem {
    key: string;
    label: string;
    unit?: string;
    detail?: string;
    status?: string;
    note?: string;
  }
  interface PdfGroup {
    key: string;
    title: string;
    items: PdfGroupItem[];
  }

  const group1: PdfGroup[] = [
    {
      key: "1",
      title: "หน่วยงานที่รับผิดชอบ",
      items: [
        { key: "1.1", label: "จุดรักษาการณ์ :", unit: "หน่วยงาน" },
        { key: "1.2", label: "กำลังพลปัจจุบัน :", unit: "คน" },
        { key: "1.3", label: "ขาดตัวประจำ :", unit: "หน่วยงาน" },
        { key: "1.4", label: "ขาดกำลังพล :", unit: "คน" },
        { key: "1.5", label: "จัดกำลังพลเสริมพิเศษ :", unit: "คน" },
        { key: "1.6", label: "สรรหาผู้สมัครงานใหม่ :", unit: "คน" },
        { key: "1.7", label: "จำนวนหน่วยงานสำรองเวร :", unit: "หน่วย" },
        { key: "1.8", label: "จำนวนกำลังพลสำรองเวร :", unit: "นาย" },
      ],
    },
    {
      key: "2",
      title: "การลา",
      items: [
        { key: "2.1", label: "ลากิจ :", unit: "คน" },
        { key: "2.2", label: "ลาป่วย :", unit: "คน" },
        { key: "2.3", label: "ขาดงาน :", unit: "คน" },
        { key: "2.4", label: "หนีหาย :", unit: "คน" },
        { key: "2.5", label: "ลาออก :", unit: "คน" },
        { key: "2.6", label: "ไล่ออก :", unit: "คน" },
      ],
    },
    {
      key: "3",
      title: "การบริหารการควงเวร",
      items: [
        { key: "3.1", label: "18 ชั่วโมง :", unit: "คน" },
        { key: "3.2", label: "24 ชั่วโมง :", unit: "คน" },
        { key: "3.3", label: "36 ชั่วโมง :", unit: "คน" },
      ],
    },
    {
      key: "4",
      title: "อบรมและควบคุมหน้าที่งาน",
      items: [
        { key: "4.1", label: "อบรมเปลี่ยนผลัด :", unit: "หน่วยงาน" },
        { key: "4.2", label: "อบรมตามแผนงานที่กำหนด :", unit: "หน่วยงาน" },
        { key: "4.3", label: "ควบคุมหน้าที่งาน :", unit: "หน่วยงาน" },
      ],
    },
  ];

  const debugLog = (label: string, obj: any) => {
    try {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.debug("MoSectorPdf DEBUG:", label, obj);
      }
    } catch (_) {
      // ignore
    }
  };

  const getCols = () => {
    const table1Rows = (newCaseData as any)?.table1 ?? [];
    // Prefer filtering by transaction id when available (more specific),
    // otherwise fall back to department_id.
    const txId = (data as any)?.mo_daily_transaction_id ?? null;
    if (txId) {
      const colsByTx = table1Rows.filter(
        (row: any) => Number(row.mo_daily_transaction_id) === Number(txId),
      );
      if (colsByTx.length > 0) return colsByTx;
    }
    return table1Rows.filter(
      (row: any) => Number(row.department_id) === Number(selectedSector),
    );
  };

  const dynamicGroup2: PdfGroup[] = [
    {
      key: "5",
      title: "วินัยและการลงโทษ",
      items: [
        { key: "5.1", label: "เล่นโทรศัพท์มือถือ :", unit: "คน" },
        { key: "5.2", label: "ไม่มีเข็มขัด :", unit: "คน" },
        { key: "5.3", label: "ไม่แขวนบัตร :", unit: "คน" },
        { key: "5.4", label: "ชุดชำรุดเก่า :", unit: "คน" },
      ],
    },
  ];

  const statusOptions = [
    { label: "ปกติ", key: "normal" },
    { label: "ผิดปกติ", key: "warning" },
    { label: "จุดเด่น", key: "danger" },
  ];

  const rowStatus: Record<string, number> = {};

  const group3Static: PdfGroup[] = [
    {
      key: "6",
      title: "เข้าพบผู้ว่าจ้าง",
      items: [
        { key: "6.1", label: "" },
        { key: "6.2", label: "" },
        { key: "6.3", label: "" },
      ],
    },
  ];

  const group3Data: PdfGroup[] = (() => {
    try {
      const table4 = (newCaseData as any)?.table4 ?? [];
      const txId = (data as any).mo_daily_transaction_id ?? null;
      const filtered =
        Array.isArray(table4) && txId
          ? table4.filter((it: any) => it.mo_daily_transaction_id === txId)
          : [];
      if (filtered.length > 0) {
        return [
          {
            key: "6",
            title: "เข้าพบผู้ว่าจ้าง",
            items: filtered.map((it: any) => ({
              key: it.key,
              label: it.label ?? `รายการ ${it.key}`,
              detail: it.detail ?? "",
              status: it.status ?? "normal",
              note: it.note ?? "",
            })),
          },
        ] as PdfGroup[];
      }
    } catch (_) {
      /* ignore */
    }
    return group3Static;
  })();

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
          MO-รายงานประจำวันฝ่ายปฏิบัติการ (รายละเอียดภาค)
        </div>

        {/* Meta Data Row */}
        <div className={styles["pdf-meta-row"]}>
          <div className={styles["meta-location"]}>
            <FlagTriangleLeftIcon size={18} strokeWidth={2.5} />
            <span>{sectorName || "-"}</span>
          </div>
          <div className={styles["meta-date"]}>{displayDate}</div>
        </div>

        <div className={styles["mo-tables-wrapper"]}>
          {/* ── group1 ── */}
          {group1.map((g, idx) => {
            const cols = getCols();
            debugLog("group1 cols", { selectedSector, cols, colsLength: cols.length });
            const headerColSpan = cols.length + 3;
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


                    {g.items.map((r) => {
                      const perLocVals = cols.map((c: any) => {
                        const t2rows = (newCaseData as any)?.table2 ?? [];
                        const match = (t2rows as any[]).find(
                          (t) =>
                            Number(t.mo_daily_transaction_id) ===
                            Number(c.mo_daily_transaction_id),
                        );
                        // Add existence check to prevent undefined values
                        return match && match[r.key] !== undefined ? String(match[r.key]) : "0";
                      });
                      const total = perLocVals.reduce(
                        (acc, v) => acc + (Number(v) || 0),
                        0,
                      );
                      return (
                        <tr key={r.key}>
                          <td className={styles["first-column-cell"]}>
                            {r.key}
                          </td>
                          <td className={styles["second-column-cell"]}>
                            {r.label}
                          </td>

                          <td className={styles["third-column-cell"]}>
                            <div className={styles["third-column-text"]}>
                              {String(total)}
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

          {/* ── group2 ── */}
          {dynamicGroup2.map((g, idx) => {
            const cols = getCols();
            debugLog("dynamicGroup2 cols", { selectedSector, cols, colsLength: cols.length });
            const headerColSpan = cols.length + 3;
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
                        {idx + 1}.
                      </th>
                      <th
                        colSpan={headerColSpan}
                        className={`${styles["mo-table-header"]} ${styles["mo-table-header-red"]} ${styles["no-border"]}`}
                      >
                        <div className={styles["mo-header"]}>
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

                    {g.items.map((r) => {
                      let perLocVals = cols.map((c: any) => {
                        const t3rows = (newCaseData as any)?.table3 ?? [];
                        const match = (t3rows as any[]).find(
                          (t) =>
                            Number(t.mo_daily_transaction_id) ===
                            Number(c.mo_daily_transaction_id) &&
                            String(t.key) === String(r.key),
                        );
                        // Add existence check to prevent undefined values
                        return match && match.value !== undefined ? String(match.value) : "0";
                      });

                      if (cols.length === 0) {
                        const mapKeyToField: Record<string, keyof typeof data | undefined> = {
                          "2.1": "leave_business_count",
                          "2.2": "leave_sick_count",
                          "2.3": "absent_count",
                          "2.4": "leave_other_count",
                          "2.5": undefined,
                          "2.6": undefined,
                        };
                        const field = mapKeyToField[r.key];
                        const fallback = field ? String((data as any)[field] ?? "0") : "0";
                        perLocVals = [fallback];
                      }

                      const totalFromTable = perLocVals.reduce(
                        (acc, v) => acc + (Number(v) || 0),
                        0,
                      );
                      return (
                        <tr key={r.key}>
                          <td className={styles["first-column-cell"]}>
                            {r.key}
                          </td>
                          <td className={styles["second-column-cell"]}>
                            {r.label}
                          </td>

                          <td className={styles["third-column-cell"]}>
                            <div className={styles["third-column-text"]}>
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

          {/* ── group3 ── */}
          {group3Data.map((g) => {
            const cols = getCols();
            debugLog("group3Data cols", { selectedSector, cols, colsLength: cols.length });
            const headerColSpan = cols.length + 1;
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
                        {g.key}.
                      </th>
                      <th
                        colSpan={headerColSpan}
                        className={`${styles["mo-table-header"]} ${styles["no-border"]}`}
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
                    {g.items.map((it, ii) => {
                      const rowKey = it.key;
                      const table4Rows = (newCaseData as any)?.table4 ?? [];
                      const perLocVals = cols.map((c: any) => {
                        const match = (table4Rows as any[]).find(
                          (t) =>
                            Number(t.mo_daily_transaction_id) ===
                            Number(c.mo_daily_transaction_id) &&
                            String(t.key) === String(it.key)
                        );
                        return match ? "1" : "0";
                      });

                      const totalForStatus = perLocVals.reduce((acc, v) => acc + (Number(v) || 0), 0);
                      return (
                        <tr key={rowKey}>
                          <td className={styles["first-column-cell"]}>
                            {rowKey}
                          </td>
                          <td
                            className={`${styles["group3-second-column-cell"]} ${styles[`status-${it.status || "normal"}`]}`}
                          >
                            {it.label}
                          </td>
                          {perLocVals.map((val, i) => (
                            <td
                              key={i}
                              className={`${styles["third-column-cell"]} ${String(val).length > 4
                                ? styles["third-column-wrap-cell"]
                                : ""
                                }`}
                            >
                              <div className={styles["third-column-text"]}>
                                {val}
                              </div>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* ── group3 Detail Items ── */}
        {group3Data.map((g) => {
          const cols = getCols();
          const deptTxIds = Array.isArray(cols)
            ? Array.from(new Set(cols.map((r: any) => r.mo_daily_transaction_id))).filter(Boolean)
            : [];
          debugLog("group3 detail deptTxIds", { gKey: g.key, deptTxIds });

          const table4 = (newCaseData as any)?.table4 ?? [];
          const detailItems: any[] =
            Array.isArray(table4) && deptTxIds.length > 0
              ? table4.filter(
                (it: any) =>
                  deptTxIds.includes(it.mo_daily_transaction_id) &&
                  String(it.key).startsWith(g.key + "."),
              )
              : [];

          if (detailItems.length === 0) return null;

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
                      {g.key}.
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
                  {detailItems.map((it: any) => (
                    <tr key={it.key}>
                      <td className={styles["first-column-cell"]}>{it.key}</td>
                      <td className={styles["group3-second-column-cell"]}>
                        {it.label ?? it.detail ?? `รายการ ${it.key}`}
                      </td>
                      <td
                        className={styles["third-column-cell"]}
                        style={{
                          minWidth: "120px",
                          width: "auto",
                          textAlign: "left",
                          padding: "4px 6px",
                        }}
                      >
                        {it.detail || "-"}
                      </td>
                      <td
                        className={`${styles["group3-second-column-cell"]} ${styles["status-" + (it.status || "normal")]}`}
                        style={{
                          color: "#fff",
                          fontWeight: 700,
                          textAlign: "center",
                        }}
                      >
                        {{
                          normal: "ปกติ",
                          warning: "ผิดปกติ",
                          danger: "จุดเด่น",
                        }[it.status || "normal"] || "ปกติ"}
                      </td>
                      <td
                        className={styles["third-column-cell"]}
                        style={{
                          minWidth: "120px",
                          width: "auto",
                          textAlign: "left",
                          padding: "4px 6px",
                        }}
                      >
                        {it.note || "-"}
                      </td>
                      <td className={styles["fourth-column-cell"]}>หน่วยงาน</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

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

              {/* Tables Section — mirrors MoSectorDetailForm layout */}
              <div className={styles["mo-tables-wrapper"]}>
                {/* ── group1 ── */}
                {group1.map((g, idx) => {
                  const cols = getCols();
                  debugLog("group1 cols (main)", { selectedSector, colsLength: cols.length });
                  const headerColSpan = cols.length + 3;
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
                          {/* location header row */}
                          <tr key={`loc-header-${g.key}`}>
                            <td
                              colSpan={2}
                              className={` ${styles["second-column-header-cell"]} `}
                            >
                              <strong>หัวข้อ</strong>
                            </td>
                            {cols.map((c: any) => (
                              <td
                                key={String(c.mo_daily_transaction_id)}
                                className={`${styles["third-column-header1-cell"]}`}
                              >
                                <strong>{c.sub_location}</strong>
                              </td>
                            ))}
                            <td
                              className={`${styles["third-column-header2-cell"]}`}
                            >
                              <strong>รวม</strong>
                            </td>
                            <td
                              className={`${styles["fourth-column-header-cell"]}`}
                            ></td>
                          </tr>
                          {g.items.map((r) => {
                            const perLocVals = cols.map((c: any) => {
                              const t2rows = (newCaseData as any)?.table2 ?? [];
                              const match = (t2rows as any[]).find(
                                (t) =>
                                  Number(t.mo_daily_transaction_id) ===
                                  Number(c.mo_daily_transaction_id),
                              );
                              return match ? String(match[r.key] ?? "0") : "0";
                            });
                            const total = perLocVals.reduce(
                              (acc, v) => acc + (Number(v) || 0),
                              0,
                            );
                            return (
                              <tr key={r.key}>
                                <td className={styles["first-column-cell"]}>
                                  {r.key}
                                </td>
                                <td className={styles["second-column-cell"]}>
                                  {r.label}
                                </td>
                                {perLocVals.map((val, i) => (
                                  <td
                                    key={i}
                                    className={`${styles["third-column-cell"]} ${String(val).length > 4
                                      ? styles["third-column-wrap-cell"]
                                      : ""
                                      }`}
                                  >
                                    <div
                                      className={styles["third-column-text"]}
                                    >
                                      {val}
                                    </div>
                                  </td>
                                ))}
                                <td className={styles["third-column-cell"]}>
                                  <div className={styles["third-column-text"]}>
                                    {String(total)}
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

                {/* ── group2 ── */}
                {dynamicGroup2.map((g, idx) => {
                  const cols = getCols();
                  debugLog("dynamicGroup2 cols", { selectedSector, cols, colsLength: cols.length });
                  const headerColSpan = cols.length + 3;
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
                              {idx + 1}.
                            </th>
                            <th
                              colSpan={headerColSpan}
                              className={`${styles["mo-table-header"]} ${styles["mo-table-header-red"]} ${styles["no-border"]}`}
                            >
                              <div className={styles["mo-header"]}>
                                <p
                                  className={
                                    g.key === "5"
                                      ? styles["mo-header-red-text"]
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
                          {/* location header row */}
                          <tr key={`loc-header-${g.key}`}>
                            <td
                              colSpan={2}
                              className={` ${styles["second-column-header-cell"]} `}
                            >
                              <strong>หัวข้อ</strong>
                            </td>
                            {cols.map((c: any) => (
                              <td
                                key={String(c.mo_daily_transaction_id)}
                                className={`${styles["third-column-header1-cell"]}`}
                              >
                                <strong>{c.sub_location}</strong>
                              </td>
                            ))}
                            <td
                              className={`${styles["third-column-header2-cell"]}`}
                            >
                              <strong>รวม</strong>
                            </td>
                            <td
                              className={`${styles["fourth-column-header-cell"]}`}
                            ></td>
                          </tr>
                          {g.items.map((r) => {
                            const perLocVals = cols.map((c: any) => {
                              const t3rows = (newCaseData as any)?.table3 ?? [];
                              const match = (t3rows as any[]).find(
                                (t) =>
                                  Number(t.mo_daily_transaction_id) ===
                                  Number(c.mo_daily_transaction_id) &&
                                  String(t.key) === String(r.key),
                              );
                              return match ? String(match.value ?? "0") : "0";
                            });
                            const totalFromTable = perLocVals.reduce(
                              (acc, v) => acc + (Number(v) || 0),
                              0,
                            );
                            return (
                              <tr key={r.key}>
                                <td className={styles["first-column-cell"]}>
                                  {r.key}
                                </td>
                                <td className={styles["second-column-cell"]}>
                                  {r.label}
                                </td>
                                {perLocVals.map((val, i) => (
                                  <td
                                    key={i}
                                    className={`${styles["third-column-cell"]} ${String(val).length > 4
                                      ? styles["third-column-wrap-cell"]
                                      : ""
                                      }`}
                                  >
                                    <div
                                      className={styles["third-column-text"]}
                                    >
                                      {val}
                                    </div>
                                  </td>
                                ))}
                                <td className={styles["third-column-cell"]}>
                                  <div className={styles["third-column-text"]}>
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

                {/* ── group3 ── */}
                {group3Data.map((g) => {
                  const cols = getCols();
                  debugLog("group3Data cols", { selectedSector, cols, colsLength: cols.length });
                  const headerColSpan = cols.length + 1;
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
                              {g.key}.
                            </th>
                            <th
                              colSpan={headerColSpan}
                              className={`${styles["mo-table-header"]} ${styles["no-border"]}`}
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
                          {statusOptions.map((s, si) => {
                            const rowKey = `${g.key}.${si + 1}`;
                            const table4Rows =
                              (newCaseData as any)?.table4 ?? [];
                            const perLocVals = cols.map((c: any) => {
                              const matches = (table4Rows as any[]).filter(
                                (t) =>
                                  Number(t.mo_daily_transaction_id) ===
                                  Number(c.mo_daily_transaction_id) &&
                                  String(t.key).startsWith(`${g.key}.`) &&
                                  (t.status ??
                                    statusOptions[rowStatus[t.key] ?? 0]
                                      .key) === s.key,
                              );
                              return String(matches.length ?? 0);
                            });
                            const totalForStatus = perLocVals.reduce(
                              (acc, v) => acc + (Number(v) || 0),
                              0,
                            );
                            return (
                              <tr key={rowKey}>
                                <td className={styles["first-column-cell"]}>
                                  {rowKey}
                                </td>
                                <td
                                  className={`${styles["group3-second-column-cell"]} ${styles[`status-${s.key}`]}`}
                                >
                                  {s.label}
                                </td>
                                {perLocVals.map((val, i) => (
                                  <td
                                    key={i}
                                    className={`${styles["third-column-cell"]} ${
                                      String(val).length > 4
                                        ? styles["third-column-wrap-cell"]
                                        : ""
                                    }`}
                                  >
                                    <div
                                      className={styles["third-column-text"]}
                                    >
                                      {val} proejfdt lable 
                                    </div>
                                  </td>
                                ))}
                               
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}


              </div>

              {/* ── group3 Detail Items ── */}
              {group3Data.map((g) => {
                // Derive transaction IDs from the resolved cols (prefer txId)
                const cols = getCols();
                const deptTxIds = Array.isArray(cols)
                  ? Array.from(new Set(cols.map((r: any) => r.mo_daily_transaction_id))).filter(Boolean)
                  : [];
                debugLog("group3 detail deptTxIds (main)", { gKey: g.key, deptTxIds });

                const table4 = (newCaseData as any)?.table4 ?? [];
                const detailItems: any[] =
                  Array.isArray(table4) && deptTxIds.length > 0
                    ? table4.filter(
                      (it: any) =>
                        deptTxIds.includes(it.mo_daily_transaction_id) &&
                        String(it.key).startsWith(g.key + "."),
                    )
                    : [];

                if (detailItems.length === 0) return null;

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
                            {g.key}.
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

                        {/* {detailItems.map((it: any) => (
                          <tr key={it.key} className={styles["no-border"]}>
                            <td className={styles["first-column-cell"]}>
                              {it.key}
                            </td>
                            <td className={styles["group3-second-column-cell"]}>
                              {it.label ?? it.detail ?? `รายการ ${it.key}`}
                            </td>
                            <td
                              className={styles["third-column-cell"]}
                              style={{
                                minWidth: "120px",
                                width: "auto",
                                textAlign: "left",
                                padding: "4px 6px",
                              }}
                            >
                              {it.detail || "-"}
                            </td>
                            <td
                              className={`${styles["group3-second-column-cell"]} ${styles["status-" + (it.status || "normal")]}`}
                              style={{
                                color: "#fff",
                                fontWeight: 700,
                                textAlign: "center",
                              }}
                            >
                              {{
                                normal: "ปกติ",
                                warning: "ผิดปกติ",
                                danger: "จุดเด่น",
                              }[it.status || "normal"] || "ปกติ"}
                            </td>
                            <td
                              className={styles["third-column-cell"]}
                              style={{
                                minWidth: "120px",
                                width: "auto",
                                textAlign: "left",
                                padding: "4px 6px",
                              }}
                            >
                              {it.note || "-"}
                            </td>
                            <td className={styles["fourth-column-cell"]}>
                              หน่วยงาน
                            </td>
                          </tr>
                        ))} */}
                      </tbody>
                    </table>
                  </div>
                );
              })}

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
