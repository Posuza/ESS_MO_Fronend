// ─── Summaries Content ──────────────────────────────────────
// Group definitions, helper functions, and data shaping
// used by the SummeriesPdf viewer.

import { type PdfGroup, type PdfGroupItem } from "../utils/PaginationSystem";
import type { SummaryColumn } from "../utils/InteligentGridSystem";

// ─── Shared formatDate ────────────────────────────────────────
export function formatDate(data: any): string {
  const rawDate = data.report_date || data.created_at;
  if (!rawDate) return "";
  const d = new Date(
    String(rawDate).includes("T") ? String(rawDate) : `${rawDate}T00:00:00`,
  );
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
  return `วันที่ ${d.getDate()} เดือน ${months[d.getMonth()]} พ.ศ. ${d.getFullYear() + 543} เวลา ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} น.`;
}

// ─── Group 1: Static Department/Leave/Shift/Training ────────
export const group1: PdfGroup[] = [
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

// ─── Group 2: Dynamic Discipline ────────────────────────────
export const dynamicGroup2: PdfGroup[] = [
  {
    key: "discipline",
    title: "วินัยและการลงโทษ",
    items: [
      {
        key: "discipline_phone_count",
        label: "เล่นโทรศัพท์มือถือ :",
        unit: "คน",
      },
      { key: "discipline_belt_count", label: "ไม่มีเข็มขัด :", unit: "คน" },
      { key: "discipline_badge_count", label: "ไม่แขวนบัตร :", unit: "คน" },
      { key: "discipline_uniform_count", label: "ชุดชำรุดเก่า :", unit: "คน" },
    ],
  },
];

// ─── Group 3: Static Project Status ─────────────────────────
export const group3Static: PdfGroup[] = [
  {
    key: "meeting",
    title: "เข้าพบผู้ว่าจ้าง",
    items: [
      { key: "normal", label: "ปกติ", status: "normal" },
      { key: "warning", label: "ผิดปกติ", status: "warning" },
      { key: "danger", label: "จุดเด่น", status: "danger" },
    ],
  },
];

// ─── Value Helpers ──────────────────────────────────────────
export function disciplineValue(report: any, key: string): number {
  const fromArray = report.disciplines?.find((it: any) => it.key === key);
  if (fromArray) return Number(fromArray.value) || 0;
  return Number((report as any)[key]) || 0;
}

export function projectStatusCount(report: any, status: string): number {
  return (report.projects || []).filter(
    (p: any) => (p.status || "normal") === status,
  ).length;
}

export function itemValueFn(
  report: any,
  groupKey: string,
  key: string,
): number {
  if (groupKey === "discipline") return disciplineValue(report, key);
  return Number((report as any)[key]) || 0;
}

// ─── Column Shaping ─────────────────────────────────────────
export function getCols(summaryReports: any[], data: any): SummaryColumn[] {
  const source = summaryReports.length > 0 ? summaryReports : [data];
  return source.map((report: any) => {
    const fullName = report.division_name || report.sub_location || "";
    const m = String(fullName).match(/เขต\s+[\d.]+/);
    return {
      id: report.id || (report as any).mo_daily_transaction_id,
      sub_location: m ? m[0] : fullName || "-",
      report,
    };
  });
}

export const MAX_COLS_PER_PAGE = 6;

export function chunkCols(cols: SummaryColumn[]): SummaryColumn[][] {
  const chunks: SummaryColumn[][] = [];
  for (let i = 0; i < cols.length; i += MAX_COLS_PER_PAGE) {
    chunks.push(cols.slice(i, i + MAX_COLS_PER_PAGE));
  }
  return chunks.length ? chunks : [[]];
}
