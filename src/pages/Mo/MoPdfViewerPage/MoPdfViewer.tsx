import { useEffect, useRef, useState } from "react";
import html2pdf from "html2pdf.js";
import {
  MapPin,
  ArrowLeft,
  Share2,
} from "lucide-react";
import LeaveIcon from "../../../assets/mo_icon/leave.png";
import TimeIcon from "../../../assets/mo_icon/time.png";
import ClothIcon from "../../../assets/mo_icon/cloth1.png";
import WarningIcon from "../../../assets/mo_icon/warinig1.png";
import styles from "./MoPdfView.module.css";
import type { SectorReport } from "../../../store/store";
import SharePdfModal from "../../../components/Mo/SharePdfModal";

type Props = {
  item: SectorReport;
  sectorName: string;
  onCancel?: () => void;
};

export default function MoPdfViewer({ item, sectorName, onCancel }: Props) {
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

  // Calculated Totals
  const leaveTotal =
    (Number(data.leave_sick_count) || 0) +
    (Number(data.leave_business_count) || 0) +
    (Number(data.leave_other_count) || 0);

  const shiftTotal =
    (Number(data.shift_18_count) || 0) +
    (Number(data.shift_24_count) || 0) +
    (Number(data.shift_36_count) || 0);

  const uniformTotal =
    (Number(data.wear_hat_count) || 0) +
    (Number(data.wear_shirt_count) || 0) +
    (Number(data.wear_pant_count) || 0) +
    (Number(data.wear_shoe_count) || 0);

  const ruleTotal =
    (Number(data.rule_sleep_count) || 0) +
    (Number(data.rule_use_phone_count) || 0) +
    (Number(data.rule_no_card_count) || 0);

  const PDF_WIDTH = 800;
  const PDF_HEIGHT = 1100;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(0.3);
  const [shareOpen, setShareOpen] = useState(false);
  // PDF generation loading state
  const [pdfLoading, setPdfLoading] = useState(false);
  // Share modal state
  const [sharePdfBlob, setSharePdfBlob] = useState<Blob|null>(null);

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
    (pdfElement as HTMLElement).style.transform = 'none';
    (pdfElement as HTMLElement).style.position = 'static';
    
    // Wait for DOM to update
    await new Promise(res => setTimeout(res, 150));
    try {
      const opt = {
        margin: 0,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "px" as const, format: [PDF_WIDTH, PDF_HEIGHT] as [number, number], orientation: "portrait" as const },
      };
      const worker = html2pdf().set(opt).from(pdfElement);
      const pdfBlob = await worker.outputPdf('blob');
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
    (pdfElement as HTMLElement).style.transform = 'none';
    (pdfElement as HTMLElement).style.position = 'static';
    
    await new Promise(res => setTimeout(res, 150));
    try {
      const opt = {
        margin: 0,
        filename: `MO_Report_${data.id || "report"}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "px" as const, format: [PDF_WIDTH, PDF_HEIGHT] as [number, number], orientation: "portrait" as const },
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
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
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
        <div style={{ width: scaledWidth, height: scaledHeight, minHeight: '100%', position: 'relative', flexShrink: 0 }}>
          <div
            className={styles["pdf-page"]}
            id="guts-pdf-content"
            style={{
              position: 'absolute',
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
              <div className={styles["header-text-th"]}>ระบบบริการตนเอง</div>
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

          {/* Two Columns Grid */}
          <div className={styles["pdf-grid-body"]}>
            {/* LEFT COLUMN */}
            <div className={styles["pdf-grid-col"]}>
              {/* ລາ (Leave) */}
              <div className={styles["pdf-section-block"]}>
                <div className={styles["pdf-block-header"]}>
                    <img src={LeaveIcon} alt="Leave" className={styles["block-icon"]} style={{width: 40, height: 40, objectFit: 'cover', transform: 'scale(1.5)'}} />
                  <div>
                    <span className={styles["block-title"]}>ลา:</span>
                    <span className={styles["block-total"]}>
                      {" "}
                      {leaveTotal} คน
                    </span>
                  </div>
                </div>
                <div className={styles["pdf-list"]}>
                  <div className={styles["pdf-list-item"]}>
                    <span>ลาป่วย:</span>
                    <span>{data.leave_sick_count || 0} คน</span>
                  </div>
                  <div className={styles["pdf-list-item"]}>
                    <span>ลากิจ :</span>
                    <span>{data.leave_business_count || 0} คน</span>
                  </div>
                  <div className={styles["pdf-list-item"]}>
                    <span>ลาอื่น ๆ:</span>
                    <span>{data.leave_other_count || 0} คน</span>
                  </div>
                </div>
              </div>

              {/* กำลังพล (Manpower) */}
              <div className={styles["pdf-section-block"]}>
                <div className={styles["pdf-block-header"]}>
                    <img src={TimeIcon} alt="Time" className={styles["block-icon"]} style={{width: 40, height: 40, objectFit: 'cover', transform: 'scale(1.5)'}} />
                  <div>
                    <span className={styles["block-title"]}>กำลังพล:</span>
                    <span className={styles["block-total"]}>
                      {" "}
                      {shiftTotal} คน
                    </span>
                  </div>
                </div>
                <div className={styles["pdf-list"]}>
                  <div className={styles["pdf-list-item"]}>
                    <span>
                      จัด <span className={styles["text-danger"]}>18</span>{" "}
                      ชั่วโมง:
                    </span>
                    <span>{data.shift_18_count || 0} คน</span>
                  </div>
                  <div className={styles["pdf-list-item"]}>
                    <span>
                      จัด <span className={styles["text-danger"]}>24</span>{" "}
                      ชั่วโมง:
                    </span>
                    <span>{data.shift_24_count || 0} คน</span>
                  </div>
                  <div className={styles["pdf-list-item"]}>
                    <span>
                      จัด <span className={styles["text-danger"]}>36</span>{" "}
                      ชั่วโมง:
                    </span>
                    <span>{data.shift_36_count || 0} คน</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className={styles["pdf-col-divider"]} />

            {/* RIGHT COLUMN */}
            <div className={styles["pdf-grid-col"]}>
              {/* เครื่องแต่งกาย (Uniform) */}
              <div className={styles["pdf-section-block"]}>
                <div className={styles["pdf-block-header"]}>
                    <img src={ClothIcon} alt="Cloth" className={styles["block-icon"]} style={{width: 40, height: 40, objectFit: 'cover', transform: 'scale(1.5)'}} />
                  <div>
                    <span className={styles["block-title"]}>
                      เครื่องแต่งกาย:
                    </span>
                    <span className={styles["block-total"]}>
                      {" "}
                      {uniformTotal} คน
                    </span>
                  </div>
                </div>
                <div className={styles["pdf-list"]}>
                  <div className={styles["pdf-list-item"]}>
                    <span>หมวก เก่า:</span>
                    <span>{data.wear_hat_count || 0} คน</span>
                  </div>
                  <div className={styles["pdf-list-item"]}>
                    <span>เสื้อ เก่า:</span>
                    <span>{data.wear_shirt_count || 0} คน</span>
                  </div>
                  <div className={styles["pdf-list-item"]}>
                    <span>กางเกง เก่า:</span>
                    <span>{data.wear_pant_count || 0} คน</span>
                  </div>
                  <div className={styles["pdf-list-item"]}>
                    <span>รองเท้า เก่า:</span>
                    <span>{data.wear_shoe_count || 0} คน</span>
                  </div>
                </div>
              </div>

              {/* ผิดข้อปฏิบัติ (Discipline) */}
              <div className={styles["pdf-section-block"]}>
                <div className={styles["pdf-block-header"]}>
                    <img src={WarningIcon} alt="Warning" className={styles["block-icon-danger"]} style={{width: 40, height: 40, objectFit: 'cover', transform: 'scale(1.5)'}} />
                  <div>
                    <span className={styles["block-title"]}>
                      ผิดข้อปฏิบัติ:
                    </span>
                    <span className={styles["block-total"]}>
                      {" "}
                      {ruleTotal} คน
                    </span>
                  </div>
                </div>
                <div className={styles["pdf-list"]}>
                  <div className={styles["pdf-list-item"]}>
                    <span>หลับเวร:</span>
                    <span>{data.rule_sleep_count || 0} คน</span>
                  </div>
                  <div className={styles["pdf-list-item"]}>
                    <span>เล่นโทรศัพท์:</span>
                    <span>{data.rule_use_phone_count || 0} คน</span>
                  </div>
                  <div className={styles["pdf-list-item"]}>
                    <span>ไม่แขวนบัตร:</span>
                    <span>{data.rule_no_card_count || 0} คน</span>
                  </div>
                </div>
              </div>

              {/* การตักเตือน (Warning Box) */}
              <div className={styles["pdf-blue-box"]}>
                <div className={styles["pdf-blue-heading"]}>การตักเตือน</div>
                <div className={styles["pdf-blue-content"]}>
                  {data.warning ? (
                    <p>• {data.warning}</p>
                  ) : (
                    <p className={styles["empty-text"]}>
                      - ไม่มีบันทึกการตักเตือน -
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION (Others) */}
          <div className={styles["pdf-blue-box-full"]}>
            <div className={styles["pdf-blue-heading"]}>อื่น ๆ</div>

            <div className={styles["pdf-other-content"]}>
              <div className={styles["other-subsection"]}>
                <div className={styles["subsection-title"]}>
                  พบผู้ว่าจ้าง: <span>{data.other_Job_count || 0} จุด</span>
                </div>
                <p className={styles["subsection-desc"]}>
                  {data.other_Job ? `• ${data.other_Job}` : "-"}
                </p>
              </div>

              <div className={styles["other-subsection"]}>
                <div className={styles["subsection-title"]}>
                  อบรม: <span>{data.other_training_count || 0} จุด</span>
                </div>
                <p className={styles["subsection-desc"]}>
                  {data.other_training ? `• ${data.other_training}` : "-"}
                </p>
              </div>

              <div className={styles["other-subsection"]}>
                <div className={styles["subsection-title"]}>เพิ่มเติม:</div>
                <p className={styles["subsection-desc"]}>
                  {data.other_extral ? `• ${data.other_extral}` : "-"}
                </p>
              </div>
            </div>
          </div>

          {/* APPROVAL REMARK SECTION */}
          <div className={styles["approval-divider"]}>
            <div className={styles["approval-divider-line"]}></div>
            <div className={styles["approval-divider-text"]}>การอนุมัติ</div>
            <div className={styles["approval-divider-line"]}></div>
          </div>

          <div className={styles["approval-content"]}>
            <p className={styles["approval-text"]}>
              {data.approved_remark ? `• ${data.approved_remark}` : "• วันที่ 5 เดือน"}
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
        onClose={() => { setShareOpen(false); setSharePdfBlob(null); }}
        shareUrl={''}
        pdfBlob={sharePdfBlob}
      />
    </>
  );
}
