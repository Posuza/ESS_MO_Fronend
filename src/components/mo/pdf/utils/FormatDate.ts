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

export function formatDate(): string {
  const now = new Date();
  const dateText = `${now.getDate()} ${THAI_SHORT_MONTHS[now.getMonth()]} ${now.getFullYear() + 543}`;
  const timeText = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")} น.`;
  return `เวลาที่ดึงข้อมูล: ${dateText} ${timeText}`;
}
