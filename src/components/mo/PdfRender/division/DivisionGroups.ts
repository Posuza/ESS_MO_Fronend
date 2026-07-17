// ─────────────────────────────────────────────────────────────
// Sector PDF — Group Definitions & Builders
//
// WHAT BELONGS HERE:
//   - Static group/item data arrays (no JSX, no rendering)
//   - Functions that build dynamic group arrays from report data
//
// WHAT DOES NOT BELONG HERE:
//   - JSX components → see SectorTableContent.tsx
//   - Pagination logic → see shared/PaginationSystem.ts
// ─────────────────────────────────────────────────────────────

import { type PdfGroupItem } from "../shared/PaginationSystem";

// ─── Shared types ─────────────────────────────────────────────
export type LocalPdfGroup = {
  key: string;
  title: string;
  items: PdfGroupItem[];
  _itemOffset?: number;
};

const defaultDisciplineItems = [
  { key: "discipline_sleeping_on_duty_count", label: "หลับเวร" },
  { key: "discipline_abandoning_post_count", label: "ทิ้งจุด" },
  { key: "discipline_absent_work_count", label: "ขาดงาน" },
  { key: "discipline_early_leaved_duty_count", label: "ออกเวรก่อนเวลา" },
  { key: "discipline_using_phone_on_duty_count", label: "เล่นโทรศัพท์" },
  { key: "discipline_client_complained_count", label: "ผู้ว่าจ้างตำหนิ" },
  { key: "discipline_improper_attire_count", label: "แต่งการไม่เรียบร้อย" },
  { key: "discipline_failed_write_report_count", label: "ไม่เขียนรายงาน" },
  { key: "discipline_early_write_report_count", label: "เขียนรายงานล่วงหน้า" },
  { key: "discipline_using_drugs_on_duty_count", label: "ดื่ม/มีกลิ่นสุรา ขณะทำงาน" },
];

// ─── Group 1 — Department / Leave / Shift / Training ─────────
// Static: same structure for every report, values are read from
// the report object by key at render time.
export const groupDefs: LocalPdfGroup[] = [
  {
    key: "dept",
    title: "หน่วยงานที่รับผิดชอบ",
    items: [
      {
        key: "dept_recruitment_count",
        label: "รับ รปภ. ใหม่",
        unit: "คน",
      },
      {
        key: "dept_guard_post_count",
        label: "จุดรักษาการณ์",
        unit: "หน่วยงาน",
      },
      {
        key: "dept_current_personnel_count",
        label: "กำลังพลปัจจุบัน",
        unit: "คน",
      },
      {
        key: "dept_missing_regular_count",
        label: "ขาดตัวประจำ",
        unit: "หน่วยงาน",
      },
      { key: "dept_missing_personnel_count", label: "ขาดกำลังพล", unit: "คน" },
      {
        key: "dept_supplement_count",
        label: "จัดกำลังพลเสริมพิเศษ",
        unit: "คน",
      },
      {
        key: "dept_reserve_units_count",
        label: "จำนวนหน่วยงานสำรองเวร",
        unit: "หน่วย",
      },
      {
        key: "dept_reserve_personnel_count",
        label: "จำนวนกำลังพลสำรองเวร",
        unit: "คน",
      },
    ],
  },
  {
    key: "leave",
    title: "การลา",
    items: [
      { key: "leave_personal_count", label: "ลากิจ", unit: "คน" },
      { key: "leave_sick_count", label: "ลาป่วย", unit: "คน" },
      { key: "leave_absent_count", label: "ขาดงาน", unit: "คน" },
      { key: "leave_deserted_count", label: "หนีหาย", unit: "คน" },
      { key: "leave_resigned_count", label: "ลาออก", unit: "คน" },
      {
        key: "leave_terminated_count",
        label: "ส่ง รปภ. คืนฝ่ายบริหารงานบุคคล",
        unit: "คน",
      },
    ],
  },
  {
    key: "shift",
    title: "การบริหารการครองเวร",
    items: [
      { key: "shift_18_count", label: "18 ชั่วโมง", unit: "คน" },
      { key: "shift_24_count", label: "24 ชั่วโมง", unit: "คน" },
      { key: "shift_36_count", label: "36 ชั่วโมง", unit: "คน" },
    ],
  },
  {
    key: "training",
    title: "อบรมและควบคุมหน้างาน",
    items: [
      {
        key: "training_shift_change_count",
        label: "อบรมเปลี่ยนผลัด",
        unit: "หน่วยงาน",
      },
      {
        key: "training_planned_count",
        label: "อบรมตามแผนงานที่กำหนด",
        unit: "หน่วยงาน",
      },
      {
        key: "training_supervise_onsite_count",
        label: "ควบคุมหน้างาน",
        unit: "หน่วยงาน",
      },
      {
        key: "training_supervise_virtual_simulation_count",
        label: "จำลองสถานการณ์เสมือนจริง",
        unit: "หน่วยงาน",
      },
    ],
  },
];

// ─── Group 2 — Discipline (dynamic from report.disciplines) ──
export function buildGroup2Disciplines(data: any): LocalPdfGroup[] {
  const raw = (data as any).disciplines ?? [];
  const items = Array.isArray(raw) && raw.length > 0 ? raw : defaultDisciplineItems;
  return [
    {
      key: "discipline",
      title: "วินัยและการลงโทษ",
      items: items.map((d: any) => ({
        key: d.key ?? d.label ?? d.name,
        label: d.label ?? d.name ?? "-",
        unit: "คน",
        value: d.value ?? 0,
      })),
    },
  ];
}

// ─── Group 3 — Projects (dynamic from report.projects) ───────
export function buildGroup3Projects(data: any): LocalPdfGroup[] {
  const raw = (data as any).projects ?? [];
  if (!Array.isArray(raw)) return [];
  return [
    {
      key: "meeting",
      title: "เข้าพบผู้ว่าจ้าง",
      items: raw.map((p: any) => ({
        key: p.id ?? p.name,
        label: p.project_name ?? p.name ?? "-",
        detail: p.detail ?? "",
        status: p.status ?? "warning",
        note: p.note ?? "",
      })),
    },
  ];
}

// ─── Group 4 — Guard Post Movements (dynamic) ────────────────
// Always returns a group (even with empty items) so the grid table
// shows "ไม่มีข้อมูล" when there are no guard movements.
export function buildGroup4GuardMovements(data: any): LocalPdfGroup[] {
  let raw = (data as any).guard_post_movements ?? [];
  if (!Array.isArray(raw)) raw = [];
  return [
    {
      key: "guard_movements",
      title: "การเปลี่ยนแปลงจุดรักษาการณ์",
      items: raw.map((m: any) => ({
        key: m.name ?? String(Math.random()),
        label: m.name ?? "-",
        detail: m.detail ?? "",
        status: m.status, // dynamic text — NO "normal" fallback
        note: m.note ?? "",
        unit: "หน่วยงาน",
      })),
    },
  ];
}
