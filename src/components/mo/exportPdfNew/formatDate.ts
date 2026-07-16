// ─── Shared Date Formatter ────────────────────────────────────
// Single source of truth. Used by PdfPageLayout (header) and any
// content file that needs to display a Thai Buddhist-era date string.

const THAI_SHORT_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatDate(data?: any): string {
  void data;
  const now = new Date();
  const dateStr = `${now.getDate()} ${THAI_SHORT_MONTHS[now.getMonth()]} ${now.getFullYear() + 543}`;
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} น.`;
  return `เวลาที่ดึงข้อมูล: ${dateStr} ${timeStr}`;
}
