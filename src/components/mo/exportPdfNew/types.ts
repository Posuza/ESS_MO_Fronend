// ─── Shared Types for jsPDF autoTable Export ─────────────────
// Used by: divisionTableContent.ts, divisionDetailContent.ts,
// summaryTableContent.ts, exportDivisionPdf.ts, exportSummarPdf.ts
// ═══════════════════════════════════════════════════════════

// ─── A single row/item inside a group table ─────────────────

export interface PdfGroupItem {
  key: string;
  label: string;
  unit?: string;
  status?: string;
  detail?: string;
  note?: string;
  value?: string | number;
}

// ─── One group = one table ──────────────────────────────────

export interface PdfGroup {
  key: string;
  title: string;
  items: PdfGroupItem[];
  _itemOffset?: number;
}
