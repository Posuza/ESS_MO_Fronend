import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import html2pdf from "html2pdf.js";
import { useStore } from "../../store/store";
import SectorPdf from "./PdfRender/sector/SectorPdf";
import SummeriesPdf from "./PdfRender/summaries/SummeriesPdf";
import MoLoadingPopup from "./popup/MoLoadingPopup";
import "./PdfViewer.css";

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

const PDF_WIDTH = 596;
const PDF_HEIGHT = 842;

const PdfViewer = forwardRef<PdfViewerHandle, Props>(function PdfViewer(
  { item, sectorName, isSector, loading }: Props,
  ref,
) {
  const reports = useStore((state) => (state as any).reports);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(0.3);
  const [renderKey, setRenderKey] = useState(0);

  // Force re-render after mount to ensure content is ready
  useEffect(() => {
    const timer = setTimeout(() => setRenderKey((k) => k + 1), 100);
    return () => clearTimeout(timer);
  }, []);

  // Fit to screen — responsive: fills container width
  // Uses ResizeObserver (not window.resize) so scrollbar
  // appearing/disappearing also triggers re-fit
  useEffect(() => {
    if (!containerRef.current) return;

    const fit = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      if (w > 0) {
        const f = w / PDF_WIDTH;
        setMinScale(Math.max(0.4, f - 0.3));
        setScale(f);
      }
    };

    // Initial fit
    fit();

    // Watch for any container size change (scrollbar, resize, etc.)
    const observer = new ResizeObserver(() => {
      // Debounce: avoid rapid re-fits during scrollbar toggle
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(fit);
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
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

    await document.fonts.ready;
    await new Promise((res) => setTimeout(res, 500));
    try {
      const opt = {
        margin: 0,
        image: { type: "png" as const },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: {
          unit: "pt" as const,
          format: "a4" as const,
          orientation: "portrait" as const,
        },
      };
      const worker = html2pdf().set(opt).from(pdfElement);
      const pdfBlob = await worker.outputPdf("blob");
      return pdfBlob;
    } catch (error) {
      console.error("PDF generation failed:", error);
      return null;
    }
  };

  const handleDownloadPdf = async () => {
    // Wait for fonts to settle
    await document.fonts.ready;
    await new Promise((res) => setTimeout(res, 300));

    // Use browser's native print-to-PDF engine
    // This produces selectable text, vector borders, and smaller file size
    // The @media print CSS hides all UI chrome and shows only the PDF content
    // User selects "Save as PDF" from the print dialog
    window.print();
  };

  const handleSharePdf = async () => {
    // Uses html2pdf (PNG-image based) for share/preview
    // Fallback for when print dialog isn't suitable
    const pdfBlob = await generatePdfBlob();
    if (!pdfBlob) return;
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
