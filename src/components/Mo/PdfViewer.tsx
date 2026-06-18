import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import html2pdf from "html2pdf.js";
import { useStore } from "../../store/store";
import SectorPdf from "./PdfRender/viewer/SectorPdf";
import SummeriesPdf from "./PdfRender/viewer/SummeriesPdf";
import MoLoadingPopup from "./popup/MoLoadingPopup";
import "./PdfViewer.css";
import "./PdfRender/viewer/SectorPdf.css";
import "./PdfRender/viewer/SummeriesPdf.css";
import "./PdfRender/contents/sectorContent.css";
import "./PdfRender/contents/secotorDetailContent.css";

type Props = {
  item: any;
  sectorName: string;
  onCancel?: () => void;
  isSector?: boolean;
  loading?: boolean;
};

export type PdfViewerHandle = {
  downloadPdf: () => Promise<void>;
  sharePdf: () => Promise<void>;
  printPdf: () => void;
};

const PDF_WIDTH = 800;
const PDF_HEIGHT = 1100;

const PdfViewer = forwardRef<PdfViewerHandle, Props>(function PdfViewer(
  { item, sectorName, isSector, loading }: Props,
  ref,
) {
  const reports = useStore((state) => (state as any).reports);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(0.3);
  const [renderKey, setRenderKey] = useState(0);

  // Force re-render after mount to ensure content is ready
  useEffect(() => {
    const timer = setTimeout(() => setRenderKey((k) => k + 1), 100);
    return () => clearTimeout(timer);
  }, []);

  // Fit to screen
  useEffect(() => {
    const fit = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (containerRef.current) {
            const w = containerRef.current.clientWidth;
            if (w > 0) {
              const f = w / PDF_WIDTH;
              setMinScale(f);
              setScale(f);
            }
          }
        });
      });
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => Math.min(3, Math.max(minScale, s - e.deltaY * 0.002)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [minScale]);

  // Touch zoom
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
      if (lastDist > 0)
        setScale((s) => Math.min(3, Math.max(minScale, s * (dist / lastDist))));
      lastDist = dist;
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, [minScale]);

  const generatePdfBlob = async () => {
    const pdfElement = document.getElementById("guts-pdf-content");
    if (!pdfElement) return null;

    const originalTransform = (pdfElement as HTMLElement).style.transform;
    const originalPosition = (pdfElement as HTMLElement).style.position;
    (pdfElement as HTMLElement).style.transform = "none";
    (pdfElement as HTMLElement).style.position = "static";

    await new Promise((res) => setTimeout(res, 300));
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
      return null;
    } finally {
      (pdfElement as HTMLElement).style.transform = originalTransform;
      (pdfElement as HTMLElement).style.position = originalPosition;
    }
  };

  const handleDownloadPdf = async () => {
    const pdfElement = document.getElementById("guts-pdf-content");
    if (!pdfElement) return;
    const originalTransform = (pdfElement as HTMLElement).style.transform;
    const originalPosition = (pdfElement as HTMLElement).style.position;
    (pdfElement as HTMLElement).style.transform = "none";
    (pdfElement as HTMLElement).style.position = "static";

    await new Promise((res) => setTimeout(res, 300));
    try {
      const opt = {
        margin: 0,
        filename: `MO_Report_${item.id || "report"}.pdf`,
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
    } finally {
      (pdfElement as HTMLElement).style.transform = originalTransform;
      (pdfElement as HTMLElement).style.position = originalPosition;
    }
  };

  const handleSharePdf = async () => {
    const pdfBlob = await generatePdfBlob();
    if (!pdfBlob) return;
    // Share functionality - pdfBlob is ready for consumers
    // Open share modal or trigger native share here
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, "_blank");
  };

  useImperativeHandle(ref, () => ({
    downloadPdf: handleDownloadPdf,
    sharePdf: handleSharePdf,
    printPdf: () => window.print(),
  }));

  const scaledWidth = PDF_WIDTH * scale;
  const scaledHeight = PDF_HEIGHT * scale;

  return (
    <>
      <MoLoadingPopup open={loading} message="กำลังสร้าง PDF..." />
      <div className="pdf-viewer-wrapper">
        <div className="pdf-container" ref={containerRef}>
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
              {isSector ? (
                <SectorPdf
                  key={`sector-${renderKey}`}
                  item={item}
                  sectorName={sectorName}
                />
              ) : (
                <SummeriesPdf
                  key={`summeries-${renderKey}`}
                  item={item}
                  sectorName={sectorName}
                  reports={reports}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

export default PdfViewer;
