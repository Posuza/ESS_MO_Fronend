// ─────────────────────────────────────────────────────────────
// PdfPagesViewer.tsx
//
// Renders PDF pages as crisp canvases using pdfjs-dist.
// No browser PDF toolbar — just clean page display.
// Zoom is applied directly to page dimensions so layout matches visual size.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Set up the PDF.js worker.
// Use Vite's ?url import to get the worker file URL (bundled as asset).
// Fallback to jsdelivr CDN in case the import fails.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const RENDER_SCALE = 1.5; // Render at 1.5x for crisp text on HiDPI screens

type PdfPagesViewerProps = {
  dataUri: string | null;
  /** Zoom scale factor (1 = default size) */
  scale?: number;
};

/**
 * Convert a data: URI (e.g. "data:application/pdf;base64,...") to a Uint8Array.
 * pdfjs-dist v6 needs binary data, not a data URI string.
 */
function dataUriToUint8Array(dataUri: string): Uint8Array {
  const commaIndex = dataUri.indexOf(",");
  if (commaIndex === -1) throw new Error("Invalid data URI");
  const base64 = dataUri.slice(commaIndex + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export default function PdfPagesViewer({
  dataUri,
  scale = 1,
}: PdfPagesViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<
    { canvas: HTMLCanvasElement; width: number; height: number }[]
  >([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!dataUri) return;

    let cancelled = false;

    const renderPdf = async () => {
      try {
        // Step 1: decode data URI to binary
        let pdfData: Uint8Array;
        try {
          pdfData = dataUriToUint8Array(dataUri);
        } catch (decodeErr) {
          console.error("PDF data URI decode failed:", decodeErr);
          if (!cancelled) {
            setErrorMsg("ข้อมูล PDF เสียหาย");
            setStatus("error");
          }
          return;
        }

        if (cancelled) return;

        // Step 2: load the PDF document
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        if (cancelled) return;

        // Step 3: render each page
        const pageCount = pdf.numPages;
        const rendered: typeof pages = [];

        for (let i = 1; i <= pageCount; i++) {
          if (cancelled) return;

          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: RENDER_SCALE });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);

          const ctx = canvas.getContext("2d")!;
          // White background (PDF pages are transparent by default)
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          await page.render({ canvas, viewport }).promise;

          rendered.push({
            canvas,
            width: viewport.width / RENDER_SCALE, // "point" width (1pt = 1/72 inch)
            height: viewport.height / RENDER_SCALE, // "point" height
          });
        }

        if (!cancelled) {
          setPages(rendered);
          setStatus("ready");
        }
      } catch (err: unknown) {
        if (!cancelled) {
          console.error("PDF page render failed:", err);
          setErrorMsg(
            err instanceof Error ? err.message : "ไม่สามารถแสดงตัวอย่าง PDF",
          );
          setStatus("error");
        }
      }
    };

    renderPdf();

    return () => {
      cancelled = true;
    };
  }, [dataUri]);

  // ─── Status display ─────────────────────────────────────
  if (status === "loading") {
    return <Placeholder text="กำลังสร้างเอกสาร..." />;
  }

  if (status === "error") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#b71c1c",
          fontSize: 14,
          padding: 40,
          textAlign: "center",
          gap: 8,
        }}
      >
        <div>ไม่สามารถแสดงตัวอย่าง PDF</div>
        <div style={{ fontSize: 11, color: "#888", maxWidth: 400 }}>
          {errorMsg}
        </div>
      </div>
    );
  }

  // ─── Render pages as canvases with page styling ─────────
  return (
    <div
      ref={containerRef}
      style={{
        padding: "10px 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
      }}
    >
      {pages.map((p, i) => {
        // Parent div at visual scaled size so layout matches what user sees
        const displayWidth = p.width * scale;
        const displayHeight = p.height * scale;
        // Canvas keeps native HiDPI resolution for crisp rendering

        return (
          <div
            key={i}
            style={{
              width: displayWidth,
              height: displayHeight,
              flexShrink: 0,
              background: "white",
              border: "1px solid #c2ccda",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <canvas
              ref={(el) => {
                if (el) {
                  const ctx = el.getContext("2d");
                  if (ctx && p.canvas) {
                    // Draw HiDPI canvas at native resolution
                    ctx.drawImage(
                      p.canvas,
                      0,
                      0,
                      p.canvas.width,
                      p.canvas.height,
                    );
                  }
                }
              }}
              width={p.canvas.width}
              height={p.canvas.height}
              style={{ display: "block", width: "100%", height: "100%" }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Placeholder ────────────────────────────────────────────
function Placeholder({
  text,
  color = "#888",
}: {
  text: string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color,
        fontSize: 14,
        padding: 40,
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}
