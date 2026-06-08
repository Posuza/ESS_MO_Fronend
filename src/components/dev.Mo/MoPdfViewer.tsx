import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import html2pdf from "html2pdf.js";
import styles from "./MoPdfViewer.module.css";
import type { SectorReport } from "../../store/store";
import SharePdfModal from "../Mo/SharePdfModal";
import MoSectorPdfViewer from "../../components/dev.Mo/MoSectorPdf";
import MoSummeriesPdfViewer from "../../components/dev.Mo/MoSummeriesPdf";

type Props = {
  item: SectorReport;
  sectorName: string;
  onCancel?: () => void;
  isSector?: boolean;
};

export type MoPdfViewerHandle = {
  downloadPdf: () => Promise<void>;
  sharePdf: () => Promise<void>;
};

const MoPdfViewer = forwardRef<MoPdfViewerHandle, Props>(function MoPdfViewer(
  { item, sectorName, onCancel, isSector }: Props,
  ref,
) {
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

  useImperativeHandle(ref, () => ({
    downloadPdf: handleDownloadPdf,
    sharePdf: handleSharePdf,
  }));

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
              {isSector ? (
                <MoSectorPdfViewer
                  item={item}
                  sectorName={sectorName}
                  contentOnly
                />
              ) : (
                <MoSummeriesPdfViewer
                  item={item}
                  sectorName={sectorName}
                  contentOnly
                />
              )}
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
});

export default MoPdfViewer;
