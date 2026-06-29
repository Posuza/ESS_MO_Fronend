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

// ─── Group 1 — Department / Leave / Shift / Training ─────────
// Static: same structure for every report, values are read from
// the report object by key at render time.
export const groupDefs: LocalPdfGroup[] = [
  {
    key: "dept",
    title: "หน่วยงานที่รับผิดชอบ",
    items: [
      { key: "dept_guard_post_count",        label: "จุดรักษาการณ์",          unit: "หน่วยงาน" },
      { key: "dept_current_personnel_count",  label: "กำลังพลปัจจุบัน",        unit: "คน" },
      { key: "dept_missing_regular_count",    label: "ขาดตัวประจำ",             unit: "หน่วยงาน" },
      { key: "dept_missing_personnel_count",  label: "ขาดกำลังพล",              unit: "คน" },
      { key: "dept_supplement_count",         label: "จัดกำลังพลเสริมพิเศษ",  unit: "คน" },
      { key: "dept_recruitment_count",        label: "สรรหาผู้สมัครงานใหม่",   unit: "คน" },
      { key: "dept_reserve_units_count",      label: "จำนวนหน่วยงานสำรองเวร", unit: "หน่วย" },
      { key: "dept_reserve_personnel_count",  label: "จำนวนกำลังพลสำรองเวร",  unit: "นาย" },
    ],
  },
  {
    key: "leave",
    title: "การลา",
    items: [
      { key: "leave_personal_count",   label: "ลากิจ",  unit: "คน" },
      { key: "leave_sick_count",       label: "ลาป่วย", unit: "คน" },
      { key: "leave_absent_count",     label: "ขาดงาน", unit: "คน" },
      { key: "leave_deserted_count",   label: "หนีหาย", unit: "คน" },
      { key: "leave_resigned_count",   label: "ลาออก",  unit: "คน" },
      { key: "leave_terminated_count", label: "ไล่ออก", unit: "คน" },
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
    title: "อบรมและควบคุมหน้าที่งาน",
    items: [
      { key: "training_shift_change_count",  label: "อบรมเปลี่ยนผลัด",           unit: "หน่วยงาน" },
      { key: "training_planned_count",       label: "อบรมตามแผนงานที่กำหนด",     unit: "หน่วยงาน" },
      { key: "training_duty_control_count",  label: "ควบคุมหน้าที่งาน",          unit: "หน่วยงาน" },
    ],
  },
];

// ─── Group 2 — Discipline (dynamic from report.disciplines) ──
// Falls back to default items if the report has no discipline array.
export function buildGroup2Disciplines(data: any): LocalPdfGroup[] {
  const raw = (data as any).disciplines ?? [];
  const items =
    Array.isArray(raw) && raw.length > 0
      ? raw
      : [
          { key: "discipline_phone_count",   label: "เล่นโทรศัพท์มือถือ", value: 0 },
          { key: "discipline_belt_count",    label: "ไม่มีเข็มขัด",        value: 0 },
          { key: "discipline_badge_count",   label: "ไม่แขวนบัตร",        value: 0 },
          { key: "discipline_uniform_count", label: "ชุดชำรุดเก่า",        value: 0 },
        ];
  return [
    {
      key: "discipline",
      title: "วินัยและการลงโทษ",
      items: items.map((d: any) => ({
        key:   d.key ?? d.label,
        label: d.label ?? "-",
        unit:  "คน",
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
        key:    p.id ?? p.name,
        label:  p.project_name ?? p.name ?? "-",
        detail: p.detail ?? "",
        status: p.status ?? "normal",
        note:   p.note ?? "",
      })),
    },
  ];
}
