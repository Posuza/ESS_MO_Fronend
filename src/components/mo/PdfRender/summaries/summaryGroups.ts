// ─────────────────────────────────────────────────────────────
// Summaries PDF — Group Definitions
//
// WHAT BELONGS HERE:
//   - Static group/item arrays (group1, group2, group3)
//   - No JSX, no rendering, no helpers
//
// WHAT DOES NOT BELONG HERE:
//   - Value calculation helpers → see summaryHelpers.ts
//   - Table rendering JSX → see SummaryTableContent.tsx
//   - Pagination logic → see shared/PaginationSystem.ts
// ─────────────────────────────────────────────────────────────

import { type PdfGroup } from "../shared/PaginationSystem";

// ─── Group 1 — Department / Leave / Shift / Training ─────────
// Cross-location summary: values per sub-location shown as columns.
export const group1: PdfGroup[] = [
  {
    key: "dept",
    title: "หน่วยงานที่รับผิดชอบ",
    items: [
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
        key: "dept_recruitment_count",
        label: "สรรหาผู้สมัครงานใหม่",
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
        unit: "นาย",
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
      { key: "leave_terminated_count", label: "ไล่ออก", unit: "คน" },
    ],
  },
  {
    key: "shift",
    title: "การบริหารการควงเวร",
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
        key: "training_duty_control_count",
        label: "ควบคุมหน้าที่งาน",
        unit: "หน่วยงาน",
      },
    ],
  },
];

// ─── Group 2 — Discipline (static structure, dynamic values) ─
export const dynamicGroup2: PdfGroup[] = [
  {
    key: "discipline",
    title: "วินัยและการลงโทษ",
    items: [
      {
        key: "discipline_phone_count",
        label: "เล่นโทรศัพท์มือถือ",
        unit: "คน",
      },
      { key: "discipline_belt_count", label: "ไม่มีเข็มขัด", unit: "คน" },
      { key: "discipline_badge_count", label: "ไม่แขวนบัตร", unit: "คน" },
      { key: "discipline_uniform_count", label: "ชุดชำรุดเก่า", unit: "คน" },
    ],
  },
];

// ─── Group 3 — Project status summary (static structure) ─────
// Uses `status` field instead of a data key; values come from
// counting projects by status via projectStatusCount() helper.
export const group3Static: PdfGroup[] = [
  {
    key: "meeting",
    title: "เข้าพบผู้ว่าจ้าง",
    items: [
      { key: "normal", label: "ปกติ", status: "normal" },
      { key: "warning", label: "ผิดปกติ", status: "warning" },
      { key: "danger", label: "ฉุกเฉิน", status: "danger" },
    ],
  },
];
