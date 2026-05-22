// src/components/dev.Mo/MoUpdateForm.tsx
import { useState, useEffect, useRef } from "react";
import AutoResizeTextarea from "./AutoResizeTextarea"; // Updated import path
import {
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Save,
  Trash2,
  CheckCircle2,
  Clock3,
  XCircle,
  Eye,
  MapPinCheck,
} from "lucide-react";
import ConfirmDeleteDialog from "../Mo/ConfirmDeleteDialog";
import InfoModel from "../Mo/InfoModel";
import styles from "./MoUpdateForm.module.css";
import { useStore } from "../../store/store";

import MoPdfViewer from "./MoPdfViewerForm";

type Props = {
  onCancel?: () => void;
  onShare?: () => void;
  item?: SectorReport;
};

type ApprovalStatus = "PENDING" | "APPROVED" | "REJECT";

export default function MoUpdatePage(props: Props) {
  const [showPdf, setShowPdf] = useState(false);
  console.log(props);
  const [date] = useState(() => new Date().toLocaleDateString("th-TH"));
  const [region, setRegion] = useState("");
  // ลา
  const [sickLeave, setSickLeave] = useState("");
  const [personalLeave, setPersonalLeave] = useState("");
  const [otherLeaveType, setOtherLeaveType] = useState("");

  // กำลังพล
  const [absentCount, setAbsentCount] = useState("");
  // breakdown for การควงกะ
  const [workShiftOpen, setWorkShiftOpen] = useState(false);
  const [shift18, setShift18] = useState("");
  const [shift24, setShift24] = useState("");
  const [shift36, setShift36] = useState("");
  // collapse state for "กำลังพล" box
  const [personnelOpen, setPersonnelOpen] = useState(false);
  // ผิดข้อปฏิบัติ / การตักเตือน
  const [disciplineNote, setDisciplineNote] = useState("");
  // collapse + numeric counts for ผิดข้อปฏิบัติ UI
  const [disciplineOpen, setDisciplineOpen] = useState(false);
  const [sleepCount, setSleepCount] = useState("");
  const [phoneCount, setPhoneCount] = useState("");
  const [badgeCount, setBadgeCount] = useState("");
  // เครื่องแต่งกาย
  // เครื่องแต่งกาย - counts
  const [hatCount, setHatCount] = useState("");
  const [shirtCount, setShirtCount] = useState("");
  const [pantsCount, setPantsCount] = useState("");
  const [shoesCount, setShoesCount] = useState("");
  // collapse state for เครื่องแต่งกาย
  const [uniformOpen, setUniformOpen] = useState(false);
  // อื่น ๆ
  const [otherNote, setOtherNote] = useState("");
  // "อื่น ๆ" detailed rows
  const [foundCount, setFoundCount] = useState("");
  const [foundNote, setFoundNote] = useState("");
  const [trainCount, setTrainCount] = useState("");
  const [trainNote, setTrainNote] = useState("");
  // collapse state for อื่น ๆ
  const [otherOpen, setOtherOpen] = useState(false);

  // new: collapse state for "ลา" card
  const [leaveOpen, setLeaveOpen] = useState(false);

  // show the small action icons (Save/Delete) instead of the bottom full actions
  // Note: `true` means the *form actions* (bottom) are visible — keep icons hidden on open
  const [showActionIcons, setShowActionIcons] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTitle, setSuccessTitle] = useState("อัปเดตรายงานสำเร็จ!");
  const [successDescription, setSuccessDescription] = useState(
    "ระบบได้ทำการอัปเดตข้อมูลของคุณเรียบร้อยแล้ว",
  );
  const [approvalStatus, setApprovalStatus] =
    useState<ApprovalStatus>("PENDING");
  const [approvalRemark, setApprovalRemark] = useState("");
  const initialValuesRef = useRef<Record<string, string | number> | null>(null);

  const currentEmployee = useStore((state) => state.authEmployee);
  // Only ผู้อำนวยการ can update status
  const isManager = currentEmployee?.position_name === "ผู้อำนวยการ";
  // Anyone who is not สายตรวจและประสานงาน can edit the report data, or the creator of the report
  const canEditData =
    currentEmployee?.position_name !== "สายตรวจและประสานงาน" ||
    (props.item?.created_by !== undefined &&
      currentEmployee?.employee_code !== undefined &&
      props.item.created_by === currentEmployee.employee_code);

  function toApprovalStatus(value?: string): ApprovalStatus {
    if (value === "APPROVED" || value === "REJECT" || value === "PENDING") {
      return value;
    }
    return "PENDING";
  }

  function approvalStatusLabel(value: ApprovalStatus): string {
    if (value === "APPROVED") return "อนุมัติแล้ว";
    if (value === "REJECT") return "ไม่อนุมัติ";
    return "รออนุมัติ";
  }

  function ApprovalStatusIcon({ value }: { value: ApprovalStatus }) {
    if (value === "APPROVED") {
      return <CheckCircle2 size={16} strokeWidth={2.2} />;
    }
    if (value === "REJECT") {
      return <XCircle size={16} strokeWidth={2.2} />;
    }
    return <Clock3 size={16} strokeWidth={2.2} />;
  }

  const normalizeNumber = (value: string | number | null | undefined) => {
    const num = Number(value);
    return Number.isNaN(num) ? 0 : num;
  };

  const normalizeText = (value: string | null | undefined) =>
    (value ?? "").trim();

  const buildInitialValues = (it: SectorReport) => {
    const base: Record<string, string | number> = {
      leave_sick_count: normalizeNumber(it.leave_sick_count),
      leave_business_count: normalizeNumber(it.leave_business_count),
      leave_other_count: normalizeNumber(it.leave_other_count),
      absent_count: normalizeNumber(it.absent_count),
      shift_18_count: normalizeNumber(it.shift_18_count),
      shift_24_count: normalizeNumber(it.shift_24_count),
      shift_36_count: normalizeNumber(it.shift_36_count),
      rule_sleep_count: normalizeNumber(it.rule_sleep_count),
      rule_use_phone_count: normalizeNumber(it.rule_use_phone_count),
      rule_no_card_count: normalizeNumber(it.rule_no_card_count),
      wear_hat_count: normalizeNumber(it.wear_hat_count),
      wear_shirt_count: normalizeNumber(it.wear_shirt_count),
      wear_pant_count: normalizeNumber(it.wear_pant_count),
      wear_shoe_count: normalizeNumber(it.wear_shoe_count),
      warning: normalizeText(it.warning),
      other_job: normalizeText(it.other_job),
      other_job_count: normalizeNumber(it.other_job_count),
      other_training: normalizeText(it.other_training),
      other_training_count: normalizeNumber(it.other_training_count),
      other_extral: normalizeText(it.other_extral),
    };

    if (isManager) {
      base.approved_status = toApprovalStatus(it.approved_status);
      base.approved_remark = normalizeText(it.approved_remark);
    }

    return base;
  };

  const currentValues = () => {
    const base: Record<string, string | number> = {
      leave_sick_count: normalizeNumber(sickLeave),
      leave_business_count: normalizeNumber(personalLeave),
      leave_other_count: normalizeNumber(otherLeaveType),
      absent_count: normalizeNumber(absentCount),
      shift_18_count: normalizeNumber(shift18),
      shift_24_count: normalizeNumber(shift24),
      shift_36_count: normalizeNumber(shift36),
      rule_sleep_count: normalizeNumber(sleepCount),
      rule_use_phone_count: normalizeNumber(phoneCount),
      rule_no_card_count: normalizeNumber(badgeCount),
      wear_hat_count: normalizeNumber(hatCount),
      wear_shirt_count: normalizeNumber(shirtCount),
      wear_pant_count: normalizeNumber(pantsCount),
      wear_shoe_count: normalizeNumber(shoesCount),
      warning: normalizeText(disciplineNote),
      other_job: normalizeText(foundNote),
      other_job_count: normalizeNumber(foundCount),
      other_training: normalizeText(trainNote),
      other_training_count: normalizeNumber(trainCount),
      other_extral: normalizeText(otherNote),
    };

    if (isManager) {
      base.approved_status = approvalStatus;
      base.approved_remark = normalizeText(approvalRemark);
    }

    return base;
  };

  const hasAnyData = () => {
    return (
      normalizeNumber(sickLeave) > 0 ||
      normalizeNumber(personalLeave) > 0 ||
      normalizeNumber(otherLeaveType) > 0 ||
      normalizeNumber(absentCount) > 0 ||
      normalizeNumber(shift18) > 0 ||
      normalizeNumber(shift24) > 0 ||
      normalizeNumber(shift36) > 0 ||
      normalizeNumber(sleepCount) > 0 ||
      normalizeNumber(phoneCount) > 0 ||
      normalizeNumber(badgeCount) > 0 ||
      normalizeNumber(hatCount) > 0 ||
      normalizeNumber(shirtCount) > 0 ||
      normalizeNumber(pantsCount) > 0 ||
      normalizeNumber(shoesCount) > 0 ||
      normalizeNumber(foundCount) > 0 ||
      normalizeNumber(trainCount) > 0 ||
      normalizeText(disciplineNote) !== "" ||
      normalizeText(foundNote) !== "" ||
      normalizeText(trainNote) !== "" ||
      normalizeText(otherNote) !== ""
    );
  };

  const isDirty = () => {
    const initial = initialValuesRef.current;
    if (!initial) return false;
    const current = currentValues();
    return Object.keys(current).some((key) => current[key] !== initial[key]);
  };

  useEffect(() => {
    const it = props.item;
    if (!it) return;

    // populate fields from the incoming case record
    setRegion(it.location ?? "");

    setSickLeave(
      it.leave_sick_count != null ? String(it.leave_sick_count) : "",
    );
    setPersonalLeave(
      it.leave_business_count != null ? String(it.leave_business_count) : "",
    );
    setOtherLeaveType(
      it.leave_other_count != null ? String(it.leave_other_count) : "",
    );

    setAbsentCount(it.absent_count != null ? String(it.absent_count) : "");

    setShift18(it.shift_18_count != null ? String(it.shift_18_count) : "");
    setShift24(it.shift_24_count != null ? String(it.shift_24_count) : "");
    setShift36(it.shift_36_count != null ? String(it.shift_36_count) : "");

    setSleepCount(
      it.rule_sleep_count != null ? String(it.rule_sleep_count) : "",
    );
    setPhoneCount(
      it.rule_use_phone_count != null ? String(it.rule_use_phone_count) : "",
    );
    setBadgeCount(
      it.rule_no_card_count != null ? String(it.rule_no_card_count) : "",
    );
    setDisciplineNote(it.warning ?? "");

    setHatCount(it.wear_hat_count != null ? String(it.wear_hat_count) : "");
    setShirtCount(
      it.wear_shirt_count != null ? String(it.wear_shirt_count) : "",
    );
    setPantsCount(it.wear_pant_count != null ? String(it.wear_pant_count) : "");
    setShoesCount(it.wear_shoe_count != null ? String(it.wear_shoe_count) : "");

    setFoundCount(it.other_job_count != null ? String(it.other_job_count) : "");
    setFoundNote(it.other_job ?? "");
    setTrainCount(
      it.other_training_count != null ? String(it.other_training_count) : "",
    );
    setTrainNote(it.other_training ?? "");
    setOtherNote(it.other_extral ?? "");
    setApprovalStatus(toApprovalStatus(it.approved_status));
    setApprovalRemark(it.approved_remark ?? "");
    initialValuesRef.current = buildInitialValues(it);
  }, [props.item]);

  const { updateReport, deleteReport } = useStore();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!props.item?.id) return;
    if (!hasAnyData() || !isDirty()) return;

    const payload = {
      leave_sick_count: Number(sickLeave) || 0,
      leave_business_count: Number(personalLeave) || 0,
      leave_other_count: Number(otherLeaveType) || 0,
      absent_count: Number(absentCount) || 0,
      shift_18_count: Number(shift18) || 0,
      shift_24_count: Number(shift24) || 0,
      shift_36_count: Number(shift36) || 0,
      rule_sleep_count: Number(sleepCount) || 0,
      rule_use_phone_count: Number(phoneCount) || 0,
      rule_no_card_count: Number(badgeCount) || 0,
      wear_hat_count: Number(hatCount) || 0,
      wear_shirt_count: Number(shirtCount) || 0,
      wear_pant_count: Number(pantsCount) || 0,
      wear_shoe_count: Number(shoesCount) || 0,
      warning: disciplineNote,
      other_job: foundNote,
      other_job_count: Number(foundCount) || 0,
      other_training: trainNote,
      other_training_count: Number(trainCount) || 0,
      other_extral: otherNote,
      ...(isManager
        ? {
            approved_status: approvalStatus,
            approved_remark: approvalRemark,
          }
        : {}),
    };

    updateReport(props.item.id, payload)
      .then(() => {
        setShowActionIcons(false);
        setSuccessTitle("อัปเดตรายงานสำเร็จ!");
        setSuccessDescription("ระบบได้ทำการอัปเดตข้อมูลของคุณเรียบร้อยแล้ว");
        setShowSuccess(true);
      })
      .catch((err) => {
        alert(`เกิดข้อผิดพลาดในการอัปเดต: ${err}`);
      });
  }

  // show modal first, perform delete only if confirmed
  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirmDelete(true);
  }

  function confirmDelete() {
    if (!props.item?.id) return;
    setShowConfirmDelete(false);

    deleteReport(props.item.id)
      .then(() => {
        setSuccessTitle("ลบรายการสำเร็จ!");
        setSuccessDescription("ระบบได้ลบรายการนี้ออกจากระบบเรียบร้อยแล้ว");
        setShowSuccess(true);
      })
      .catch((err) => {
        alert(`เกิดข้อผิดพลาดในการลบ: ${err}`);
      });
  }

  function cancelDelete() {
    setShowConfirmDelete(false);
  }

  if (showPdf && props.item) {
    return (
      <MoPdfViewer
        item={props.item}
        sectorName={props.item.location || ""}
        onCancel={() => setShowPdf(false)}
      />
    );
  }

  return (
    <>
      <div className={styles["gut-detail-btns-box"]} aria-hidden>
        <button
          type="button"
          className={styles["gut-back-icon"]}
          onClick={() => {
            if (props.onCancel) return props.onCancel();
            return window.history.back();
          }}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>

        {!showActionIcons ? (
          <div className={styles["guts-action-icons"]} aria-hidden={false}>
            <button
              type="button"
              className={styles["guts-icon-btn"]}
              title="Preview PDF"
              aria-label="Preview PDF"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowPdf(true);
              }}
            >
              <Eye size={18} />
            </button>

            {canEditData && (
              <>
                <button
                  type="button"
                  className={styles["guts-icon-btn"]}
                  title="Save"
                  aria-label="Save"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowActionIcons((v) => !v);
                  }}
                >
                  <Save size={18} />
                </button>

                <button
                  type="button"
                  className={`${styles["guts-icon-btn"]} ${styles["guts-icon-delete"]}`}
                  onClick={handleDelete}
                  title="Delete"
                  aria-label="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
      <ConfirmDeleteDialog
        open={showConfirmDelete}
        title="ยืนยันลบรายการนี้?"
        description={"รายการนี้จะถูกลบออกจากระบบ ไม่สามารถกู้คืนได้"}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
      <InfoModel
        open={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          if (props.onCancel) props.onCancel();
          else window.history.back();
        }}
        variant="success"
        title={successTitle}
        description={successDescription}
      />
      <form
        className={`${styles["guts-Mo-layout"]} ${showActionIcons ? styles["icons-visible"] : styles["icons-hidden"]}`}
        onSubmit={onSubmit}
      >
     
      <div className={styles["region-card-header"]}>
          <div className={styles["region-card-left"]}>
            <div className={styles["region-card-avatar"]}>
              <MapPinCheck size={20} />
            </div>
            <div className={styles["region-card-body"]}>
              <div className={styles["region-card-top-row"]}>
                <div className={styles["region-card-title-wrap"]}>
                  <div className={styles["region-card-title"]}>ภาค</div>
                  <span
                    className={[
                      styles["status-badge"],
                      approvalStatus === "APPROVED"
                        ? styles["status-approved"]
                        : approvalStatus === "REJECT"
                          ? styles["status-reject"]
                          : styles["status-pending"],
                    ].join(" ")}
                  >
                    <ApprovalStatusIcon value={approvalStatus} />
                    {approvalStatusLabel(approvalStatus)}
                  </span>
                </div>
              </div>

              <div className={styles["region-card-value"]}>{region || "-"}</div>
            </div>
          </div>

          <div className={styles["region-card-right"]}>
            <p className={styles["region-card-meta-id"]}>#{props.item?.id ?? ""}</p>
            <p className={styles["region-card-meta-date"]}>
              {props.item?.created_at
                ? new Date(props.item.created_at).toLocaleDateString("th-TH")
                : date}
            </p>
          </div>
        </div>
  
  

        <div
          className={[
            styles["guts-box"],
            styles["collapsible"],
            leaveOpen ? "" : styles["collapsed"],
          ].join(" ")}
        >
          <div
            className={`${styles["guts-box-title"]} ${styles["collapsible"]}`}
            role="button"
            aria-expanded={leaveOpen}
            onClick={() => setLeaveOpen((v) => !v)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setLeaveOpen((v) => !v);
            }}
          >
            ลา
            <button
              type="button"
              className={styles["guts-collapse-toggle"]}
              aria-label={leaveOpen ? "ย่อ ลา" : "ขยาย ลา"}
            >
              {leaveOpen ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
            </button>
          </div>
          <div
            className={`${styles["guts-box-body"]} ${leaveOpen ? "" : styles["collapsed"]}`}
          >
            <div
              className={[styles["guts-field-row"], styles["two-col"]].join(
                " ",
              )}
            >
              <label className={styles["guts-label"]}>ลาป่วย</label>
              <div className={styles["guts-input-group"]}>
                <input
                  className={`${styles["guts-input"]} ${styles["small"]}`}
                  type="number"
                  min={0}
                  step={1}
                  value={sickLeave}
                  disabled={!showActionIcons}
                  onChange={(e) =>
                    setSickLeave(e.target.value.replace(/\D/g, ""))
                  }
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
                <span className={styles["guts-suffix"]}>คน</span>
              </div>
            </div>

            <div
              className={[styles["guts-field-row"], styles["two-col"]].join(
                " ",
              )}
            >
              <label className={styles["guts-label"]}>ลากิจ</label>
              <div className={styles["guts-input-group"]}>
                <input
                  className={`${styles["guts-input"]} ${styles["small"]}`}
                  type="number"
                  min={0}
                  step={1}
                  value={personalLeave}
                  disabled={!showActionIcons}
                  onChange={(e) =>
                    setPersonalLeave(e.target.value.replace(/\D/g, ""))
                  }
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
                <span className={styles["guts-suffix"]}>คน</span>
              </div>
            </div>

            <div
              className={[styles["guts-field-row"], styles["two-col"]].join(
                " ",
              )}
            >
              <label className={styles["guts-label"]}>ลาอื่น ๆ</label>
              <div className={styles["guts-input-group"]}>
                <input
                  className={`${styles["guts-input"]} ${styles["small"]}`}
                  type="number"
                  min={0}
                  step={1}
                  value={otherLeaveType}
                  disabled={!showActionIcons}
                  onChange={(e) =>
                    setOtherLeaveType(e.target.value.replace(/\D/g, ""))
                  }
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
                <span className={styles["guts-suffix"]}>คน</span>
              </div>
            </div>
          </div>
        </div>

        <div
          className={[
            styles["guts-box"],
            styles["collapsible"],
            personnelOpen ? "" : styles["collapsed"],
          ].join(" ")}
        >
          <div
            className={styles["guts-box-title"]}
            role="button"
            aria-expanded={personnelOpen}
            onClick={() => setPersonnelOpen((v) => !v)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                setPersonnelOpen((v) => !v);
            }}
          >
            กำลังพล
            <button
              type="button"
              className={styles["guts-collapse-toggle"]}
              aria-label={personnelOpen ? "ย่อ กำลังพล" : "ขยาย กำลังพล"}
            >
              {personnelOpen ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
            </button>
          </div>

          <div
            className={`${styles["guts-box-body"]} ${personnelOpen ? "" : styles["collapsed"]}`}
          >
            <div
              className={[styles["guts-field-row"], styles["two-col"]].join(
                " ",
              )}
            >
              <label className={styles["guts-label"]}>ขาดงาน</label>
              <div className={styles["guts-input-group"]}>
                <input
                  className={`${styles["guts-input"]} ${styles["small"]}`}
                  type="number"
                  min={0}
                  step={1}
                  value={absentCount}
                  disabled={!showActionIcons}
                  onChange={(e) =>
                    setAbsentCount(e.target.value.replace(/\D/g, ""))
                  }
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  inputMode="numeric"
                />
                <span className={styles["guts-suffix"]}>คน</span>
              </div>
            </div>

            <div
              className={[
                styles["guts-subbox"],
                workShiftOpen ? "" : styles["collapsed"],
              ].join(" ")}
            >
              <div
                className={styles["guts-subbox-title"]}
                role="button"
                tabIndex={0}
                aria-expanded={workShiftOpen}
                onClick={() => setWorkShiftOpen((v) => !v)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    setWorkShiftOpen((v) => !v);
                }}
              >
                <label className={styles["guts-label"]}>การควงกะ</label>
                <div className={styles["guts-subbox-toggle"]} aria-hidden>
                  {workShiftOpen ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                </div>
              </div>

              <div
                className={`${styles["guts-subbox-body"]} ${workShiftOpen ? "" : styles["collapsed"]}`}
              >
                <div
                  className={[styles["guts-field-row"], styles["two-col"]].join(
                    " ",
                  )}
                >
                  <label className={styles["guts-label"]}>จัด 18 ชั่วโมง</label>
                  <div className={styles["guts-input-group"]}>
                    <input
                      className={`${styles["guts-input"]} ${styles["small"]}`}
                      type="number"
                      min={0}
                      step={1}
                      value={shift18}
                      disabled={!showActionIcons}
                      onChange={(e) =>
                        setShift18(e.target.value.replace(/\D/g, ""))
                      }
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="0"
                      inputMode="numeric"
                    />
                    <span className={styles["guts-suffix"]}>คน</span>
                  </div>
                </div>

                <div
                  className={[styles["guts-field-row"], styles["two-col"]].join(
                    " ",
                  )}
                >
                  <label className={styles["guts-label"]}>จัด 24 ชั่วโมง</label>
                  <div className={styles["guts-input-group"]}>
                    <input
                      className={`${styles["guts-input"]} ${styles["small"]}`}
                      type="number"
                      min={0}
                      step={1}
                      value={shift24}
                      disabled={!showActionIcons}
                      onChange={(e) =>
                        setShift24(e.target.value.replace(/\D/g, ""))
                      }
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="0"
                      inputMode="numeric"
                    />
                    <span className={styles["guts-suffix"]}>คน</span>
                  </div>
                </div>

                <div
                  className={[styles["guts-field-row"], styles["two-col"]].join(
                    " ",
                  )}
                >
                  <label className={styles["guts-label"]}>จัด 36 ชั่วโมง</label>
                  <div className={styles["guts-input-group"]}>
                    <input
                      className={`${styles["guts-input"]} ${styles["small"]}`}
                      type="number"
                      min={0}
                      step={1}
                      value={shift36}
                      disabled={!showActionIcons}
                      onChange={(e) =>
                        setShift36(e.target.value.replace(/\D/g, ""))
                      }
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="0"
                      inputMode="numeric"
                    />
                    <span className={styles["guts-suffix"]}>คน</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={[
            styles["guts-box"],
            styles["collapsible"],
            disciplineOpen ? "" : styles["collapsed"],
          ].join(" ")}
        >
          <div
            className={styles["guts-box-title"]}
            role="button"
            aria-expanded={disciplineOpen}
            onClick={() => setDisciplineOpen((v) => !v)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                setDisciplineOpen((v) => !v);
            }}
          >
            ผิดข้อปฏิบัติ / การตักเตือน
            <button
              type="button"
              className={styles["guts-collapse-toggle"]}
              aria-label={
                disciplineOpen ? "ย่อ ผิดข้อปฏิบัติ" : "ขยาย ผิดข้อปฏิบัติ"
              }
            >
              {disciplineOpen ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
            </button>
          </div>

          <div
            className={`${styles["guts-box-body"]} ${disciplineOpen ? "" : styles["collapsed"]}`}
          >
            <div
              className={[styles["guts-field-row"], styles["two-col"]].join(
                " ",
              )}
            >
              <label className={styles["guts-label"]}>หลับเวร</label>
              <div className={styles["guts-input-group"]}>
                <input
                  className={`${styles["guts-input"]} ${styles["small"]}`}
                  type="number"
                  min={0}
                  step={1}
                  value={sleepCount}
                  disabled={!showActionIcons}
                  onChange={(e) =>
                    setSleepCount(e.target.value.replace(/\D/g, ""))
                  }
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  inputMode="numeric"
                />
                <span className={styles["guts-suffix"]}>คน</span>
              </div>
            </div>

            <div
              className={[styles["guts-field-row"], styles["two-col"]].join(
                " ",
              )}
            >
              <label className={styles["guts-label"]}>เล่นโทรศัพท์</label>
              <div className={styles["guts-input-group"]}>
                <input
                  className={`${styles["guts-input"]} ${styles["small"]}`}
                  type="number"
                  min={0}
                  step={1}
                  value={phoneCount}
                  disabled={!showActionIcons}
                  onChange={(e) =>
                    setPhoneCount(e.target.value.replace(/\D/g, ""))
                  }
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  inputMode="numeric"
                />
                <span className={styles["guts-suffix"]}>คน</span>
              </div>
            </div>

            <div
              className={[styles["guts-field-row"], styles["two-col"]].join(
                " ",
              )}
            >
              <label className={styles["guts-label"]}>ไม่แขวนบัตร</label>
              <div className={styles["guts-input-group"]}>
                <input
                  className={`${styles["guts-input"]} ${styles["small"]}`}
                  type="number"
                  min={0}
                  step={1}
                  value={badgeCount}
                  disabled={!showActionIcons}
                  onChange={(e) =>
                    setBadgeCount(e.target.value.replace(/\D/g, ""))
                  }
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  inputMode="numeric"
                />
                <span className={styles["guts-suffix"]}>คน</span>
              </div>
            </div>
            <div className={styles["guts-field-row"]}>
              <label
                className={[styles["guts-label"], styles["section-label"]].join(
                  " ",
                )}
              >
                การตักเตือน
              </label>
            </div>

            <AutoResizeTextarea
              className={`${styles["guts-input-full"]} ${styles["guts-detail-textarea"]} ${styles["approval-textarea"]}`}
              rows={2}
              value={disciplineNote}
              disabled={!showActionIcons}
              onChange={(e) => setDisciplineNote(e.target.value)}
              placeholder="บันทึกการตักเตือน (สาเหตุ/คำสั่ง/ผู้รับผิดชอบ)"
            />
          </div>
        </div>

        <div
          className={[
            styles["guts-box"],
            styles["collapsible"],
            uniformOpen ? "" : styles["collapsed"],
          ].join(" ")}
        >
          <div
            className={styles["guts-box-title"]}
            role="button"
            aria-expanded={uniformOpen}
            onClick={() => setUniformOpen((v) => !v)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setUniformOpen((v) => !v);
            }}
          >
            เครื่องแต่งกาย
            <button
              type="button"
              className={styles["guts-collapse-toggle"]}
              aria-label={
                uniformOpen ? "ย่อ เครื่องแต่งกาย" : "ขยาย เครื่องแต่งกาย"
              }
            >
              {uniformOpen ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
            </button>
          </div>

          <div
            className={`${styles["guts-box-body"]} ${uniformOpen ? "" : styles["collapsed"]}`}
          >
            <div
              className={[styles["guts-field-row"], styles["two-col"]].join(
                " ",
              )}
            >
              <label className={styles["guts-label"]}>หมวก เก่า:</label>
              <div className={styles["guts-input-group"]}>
                <input
                  className={`${styles["guts-input"]} ${styles["small"]}`}
                  type="number"
                  min={0}
                  step={1}
                  value={hatCount}
                  disabled={!showActionIcons}
                  onChange={(e) =>
                    setHatCount(e.target.value.replace(/\D/g, ""))
                  }
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  inputMode="numeric"
                />
                <span className={styles["guts-suffix"]}>คน</span>
              </div>
            </div>

            <div
              className={[styles["guts-field-row"], styles["two-col"]].join(
                " ",
              )}
            >
              <label className={styles["guts-label"]}>เสื้อ เก่า:</label>
              <div className={styles["guts-input-group"]}>
                <input
                  className={`${styles["guts-input"]} ${styles["small"]}`}
                  type="number"
                  min={0}
                  step={1}
                  value={shirtCount}
                  disabled={!showActionIcons}
                  onChange={(e) =>
                    setShirtCount(e.target.value.replace(/\D/g, ""))
                  }
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  inputMode="numeric"
                />
                <span className={styles["guts-suffix"]}>คน</span>
              </div>
            </div>

            <div
              className={[styles["guts-field-row"], styles["two-col"]].join(
                " ",
              )}
            >
              <label className={styles["guts-label"]}>กางเกง เก่า:</label>
              <div className={styles["guts-input-group"]}>
                <input
                  className={`${styles["guts-input"]} ${styles["small"]}`}
                  type="number"
                  min={0}
                  step={1}
                  value={pantsCount}
                  disabled={!showActionIcons}
                  onChange={(e) =>
                    setPantsCount(e.target.value.replace(/\D/g, ""))
                  }
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  inputMode="numeric"
                />
                <span className={styles["guts-suffix"]}>คน</span>
              </div>
            </div>

            <div
              className={[styles["guts-field-row"], styles["two-col"]].join(
                " ",
              )}
            >
              <label className={styles["guts-label"]}>รองเท้า เก่า:</label>
              <div className={styles["guts-input-group"]}>
                <input
                  className={`${styles["guts-input"]} ${styles["small"]}`}
                  type="number"
                  min={0}
                  step={1}
                  value={shoesCount}
                  disabled={!showActionIcons}
                  onChange={(e) =>
                    setShoesCount(e.target.value.replace(/\D/g, ""))
                  }
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  inputMode="numeric"
                />
                <span className={styles["guts-suffix"]}>คน</span>
              </div>
            </div>
          </div>
        </div>

        <div
          className={[
            styles["guts-box"],
            styles["collapsible"],
            otherOpen ? "" : styles["collapsed"],
          ].join(" ")}
        >
          <div
            className={styles["guts-box-title"]}
            role="button"
            aria-expanded={otherOpen}
            onClick={() => setOtherOpen((v) => !v)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setOtherOpen((v) => !v);
            }}
          >
            อื่น ๆ
            <button
              type="button"
              className={styles["guts-collapse-toggle"]}
              aria-label={otherOpen ? "ย่อ อื่น ๆ" : "ขยาย อื่น ๆ"}
            >
              {otherOpen ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
            </button>
          </div>

          <div
            className={`${styles["guts-box-body"]} ${otherOpen ? "" : styles["collapsed"]}`}
          >
            <div
              className={[styles["guts-field-row"], styles["two-col"]].join(
                " ",
              )}
            >
              <label className={styles["guts-label"]}>พบผู้ว่างจ้าง:</label>
              <div className={styles["guts-input-group"]}>
                <input
                  className={`${styles["guts-input"]} ${styles["small"]}`}
                  type="number"
                  min={0}
                  step={1}
                  value={foundCount}
                  disabled={!showActionIcons}
                  onChange={(e) =>
                    setFoundCount(e.target.value.replace(/\D/g, ""))
                  }
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  inputMode="numeric"
                />
                <span className={styles["guts-suffix"]}>จุด</span>
              </div>
            </div>

            <div className={styles["guts-detail-box"]}>
              <AutoResizeTextarea
                className={`${styles["guts-input-full"]} ${styles["guts-detail-textarea"]} ${styles["approval-textarea"]}`}
                rows={2}
                value={foundNote}
                disabled={!showActionIcons}
                onChange={(e) => setFoundNote(e.target.value)}
                placeholder="รายละเอียด/เวลา/ผู้เกี่ยวข้อง"
              />
            </div>

            <div
              className={[styles["guts-field-row"], styles["two-col"]].join(
                " ",
              )}
              style={{ marginTop: 8 }}
            >
              <label className={styles["guts-label"]}>อบรม:</label>
              <div className={styles["guts-input-group"]}>
                <input
                  className={`${styles["guts-input"]} ${styles["small"]}`}
                  type="number"
                  min={0}
                  step={1}
                  value={trainCount}
                  disabled={!showActionIcons}
                  onChange={(e) =>
                    setTrainCount(e.target.value.replace(/\D/g, ""))
                  }
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  inputMode="numeric"
                />
                <span className={styles["guts-suffix"]}>จุด:</span>
              </div>
            </div>

            <div className={styles["guts-detail-box"]}>
              <AutoResizeTextarea
                className={`${styles["guts-input-full"]} ${styles["guts-detail-textarea"]} ${styles["approval-textarea"]}`}
                rows={2}
                value={otherNote}
                disabled={!showActionIcons}
                onChange={(e) => setOtherNote(e.target.value)}
                placeholder="รายละเอียด/เวลา/ผู้เกี่ยวข้อง"
              />
            </div>
            <div
              className={[styles["guts-field-row"], styles["two-col"]].join(
                " ",
              )}
              style={{ marginTop: 8 }}
            >
              <label className={styles["guts-label"]}>เพิ่มเติม:</label>
            </div>

            <div className={styles["guts-detail-box"]}>
              <AutoResizeTextarea
                className={`${styles["guts-input-full"]} ${styles["guts-detail-textarea"]} ${styles["approval-textarea"]}`}
                rows={2}
                value={trainNote}
                disabled={!showActionIcons}
                onChange={(e) => setTrainNote(e.target.value)}
                placeholder="รายละเอียด/เวลา/ผู้เกี่ยวข้อง"
              />
            </div>
          </div>
        </div>

        <div className={styles["approval-section"]}>
          <div
            className={[
              styles["approval-remark-section"],
              approvalStatus === "APPROVED"
                ? styles["approval-remark-approved"]
                : approvalStatus === "REJECT"
                  ? styles["approval-remark-reject"]
                  : styles["approval-remark-pending"],
            ].join(" ")}
          >
            {isManager ? (
              <div className={styles["approval-status-row"]}>
                <label className={styles["approval-status-label"]}>
                  การอนุมัติ:
                </label>
                <select
                  className={[
                    styles["approval-select"],
                    approvalStatus === "APPROVED"
                      ? styles["approval-select-approved"]
                      : approvalStatus === "REJECT"
                        ? styles["approval-select-reject"]
                        : styles["approval-select-pending"],
                  ].join(" ")}
                  value={approvalStatus}
                  disabled={!showActionIcons}
                  onChange={(e) =>
                    setApprovalStatus(toApprovalStatus(e.target.value))
                  }
                >
                  <option value="PENDING">รออนุมัติ</option>
                  <option value="APPROVED">อนุมัติแล้ว</option>
                  <option value="REJECT">ไม่อนุมัติ</option>
                </select>
              </div>
            ) : null}

            <div className={styles["approval-content"]}>
              <AutoResizeTextarea
                className={styles["approval-textarea"]}
                rows={3}
                value={approvalRemark}
                disabled={!isManager || !showActionIcons}
                onChange={(e) => setApprovalRemark(e.target.value)}
                placeholder="หมายเหตุการอนุมัติ/ไม่อนุมัติ"
              />
            </div>
          </div>
          <div className={styles["signature-section"]}>
            <div className={styles["signature-slot"]}>
              <div className={styles["signature-title"]}>ผู้ บันทึก</div>
              <div className={styles["signature-line"]}>
                {props.item?.created_by || "ADMIN"}
              </div>
            </div>
            <div className={styles["signature-slot"]}>
              <div className={styles["signature-title"]}>ผู้ อำนวยงาน</div>
              <div className={styles["signature-line"]}>
                {props.item?.approved_by || "\u00A0"}
              </div>
            </div>
          </div>
        </div>

        <div
          className={styles["guts-Mo-actions"]}
          style={{ gridColumn: "1 / 2" }}
        >
          {showActionIcons && (
            <>
              <button
                type="button"
                className={`${styles["guts-btn"]} ${styles["guts-cancel-btn"]}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowActionIcons((v) => !v);
                }}
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                className={`${styles["guts-btn"]} ${styles["guts-submit-btn"]}`}
                disabled={!hasAnyData() || !isDirty()}
              >
                อัปเดต
              </button>
            </>
          )}
        </div>
      </form>
    </>
  );
}

// also provide a named export for easier re-exports/imports
export { MoUpdatePage };
