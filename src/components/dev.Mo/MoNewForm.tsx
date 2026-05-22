import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  MapPinCheck,
} from "lucide-react";
import styles from "./MoNewForm.module.css";
import { useStore } from "../../store/store";
import ConfirmCancelDialog from "../Mo/ConfirmCancelDialog";
import InfoModel from "../Mo/InfoModel";
import AutoResizeTextarea from "./AutoResizeTextarea";

type Props = {
  onCancel?: () => void;
  selectedLocation?: string;
  empCode?: string;
};

export default function MoNewForm(props: Props) {
  const [date] = useState(() => new Date().toLocaleDateString("th-TH"));
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
  const [hatCount, setHatCount] = useState("");
  const [shirtCount, setShirtCount] = useState("");
  const [pantsCount, setPantsCount] = useState("");
  const [shoesCount, setShoesCount] = useState("");
  const [uniformOpen, setUniformOpen] = useState(false);

  // อื่น ๆ
  const [otherNote, setOtherNote] = useState("");
  // "อื่น ๆ" detailed rows
  const [foundCount, setFoundCount] = useState("");
  const [foundNote, setFoundNote] = useState("");
  const [trainCount, setTrainCount] = useState("");
  const [trainNote, setTrainNote] = useState("");
  const [otherOpen, setOtherOpen] = useState(false);

  // new: collapse state for "ลา" card
  const [leaveOpen, setLeaveOpen] = useState(false);

  // confirmation dialog state
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { createReport, authEmployee } = useStore();

  const normalizeNumber = (value: string) => {
    const num = Number(value);
    return Number.isNaN(num) ? 0 : num;
  };

  const normalizeText = (value: string) => value.trim();

  // helper to check if anything is filled in (including explicit zeros)
  const isDirty = () => {
    return (
      sickLeave !== "" ||
      personalLeave !== "" ||
      otherLeaveType !== "" ||
      absentCount !== "" ||
      shift18 !== "" ||
      shift24 !== "" ||
      shift36 !== "" ||
      disciplineNote !== "" ||
      sleepCount !== "" ||
      phoneCount !== "" ||
      badgeCount !== "" ||
      hatCount !== "" ||
      shirtCount !== "" ||
      pantsCount !== "" ||
      shoesCount !== "" ||
      otherNote !== "" ||
      foundCount !== "" ||
      foundNote !== "" ||
      trainCount !== "" ||
      trainNote !== ""
    );
  };

  // require at least one meaningful value (non-zero or non-empty text)
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

  const handleCancel = () => {
    if (isDirty()) {
      setShowConfirmCancel(true);
    } else {
      if (props.onCancel) props.onCancel();
      else window.history.back();
    }
  };

  const onSubmit = async (
    e?: React.FormEvent,
    opts?: { approve?: boolean },
  ) => {
    e?.preventDefault();
    if (!hasAnyData() && !opts?.approve) return;

    const departmentId = authEmployee?.department_id;
    if (!departmentId) {
      alert("ไม่พบข้อมูลภาค (Sector) กรุณาลองใหม่อีกครั้ง");
      return;
    }

    const payload: Record<string, unknown> = {
      department_id: departmentId,
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
      created_by: authEmployee?.employee_code || props.empCode || "ADMIN",
    };

    if (opts?.approve) {
      // include approval fields if requested
      payload.approved_status = "APPROVED";
      payload.approved_by = authEmployee?.employee_code || "ADMIN";
      payload.approved_at = new Date().toISOString();
    }

    try {
      await createReport(payload as any);
      setShowSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`เกิดข้อผิดพลาดในการบันทึก: ${msg}`);
    }
  };

  // Export current filled report area to PDF
  const handleExportPdf = async () => {
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = document.getElementById("mo-print");
      if (!element) return alert("ไม่พบพื้นที่สำหรับพิมพ์");
      const opt = {
        margin: 10,
        filename: `mo-report-${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      } as any;
      html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.warn("html2pdf failed", err);
      alert("ไม่สามารถส่งออกเป็น PDF ได้");
    }
  };

  // Approve + save shortcut for managers
  const handleApprove = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (!authEmployee?.position_id || authEmployee.position_id !== 1) {
      alert("คุณไม่มีสิทธิ์อนุมัติ");
      return;
    }
    await onSubmit(undefined, { approve: true });
  };

  return (
    <>
      <div className={styles["guts-back-outer"]} aria-hidden>
        <button
          type="button"
          className={styles["guts-back-btn"]}
          onClick={handleCancel}
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      <form className={styles["guts-Mo-layout"]} onSubmit={(e) => onSubmit(e)}>
        <div className={styles["region-card-header"]}>
          <div className={styles["region-card-left"]}>
            <div className={styles["region-card-avatar"]}>
              <MapPinCheck size={20} />
            </div>
            <div className={styles["region-card-body"]}>
              <div className={styles["region-card-top-row"]}>
                <div className={styles["region-card-title-wrap"]}>
                  <div className={styles["region-card-title"]}>ภาค</div>
                </div>
              </div>

              <div className={styles["region-card-value"]}>
                {props.selectedLocation || "-"}
              </div>
            </div>
          </div>

          <div className={styles["region-card-right"]}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", gap: 8 }}></div>
              <p className={styles["region-card-meta-date"]}>{date}</p>
            </div>
          </div>
        </div>

        <div id="mo-print" style={{ padding: 6 }}>
          <div
            className={[styles["guts-box"], styles["collapsible"]].join(" ")}
          >
            <div
              className={styles["guts-box-title"]}
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
              className={[
                styles["guts-box-body"],
                leaveOpen ? "" : styles["collapsed"],
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div
                className={[styles["guts-field-row"], styles["two-col"]].join(
                  " ",
                )}
              >
                <label className={styles["guts-label"]}>ลาป่วย</label>
                <div className={styles["guts-input-group"]}>
                  <input
                    className={[styles["guts-input"], styles["small"]].join(
                      " ",
                    )}
                    type="number"
                    min={0}
                    step={1}
                    value={sickLeave}
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
                    className={[styles["guts-input"], styles["small"]].join(
                      " ",
                    )}
                    type="number"
                    min={0}
                    step={1}
                    value={personalLeave}
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
                    className={[styles["guts-input"], styles["small"]].join(
                      " ",
                    )}
                    type="number"
                    min={0}
                    step={1}
                    value={otherLeaveType}
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
            className={[styles["guts-box"], styles["collapsible"]].join(" ")}
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
              className={[
                styles["guts-box-body"],
                personnelOpen ? "" : styles["collapsed"],
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div
                className={[styles["guts-field-row"], styles["two-col"]].join(
                  " ",
                )}
              >
                <label className={styles["guts-label"]}>ขาดงาน</label>
                <div className={styles["guts-input-group"]}>
                  <input
                    className={[styles["guts-input"], styles["small"]].join(
                      " ",
                    )}
                    type="number"
                    min={0}
                    step={1}
                    value={absentCount}
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

              {/* Added missing closing div and proper JSX completion */}
            </div>
          </div>
        </div>
      </form>

      <ConfirmCancelDialog
        open={showConfirmCancel}
        onCancel={() => setShowConfirmCancel(false)}
        onConfirm={() => {
          setShowConfirmCancel(false);
          if (props.onCancel) props.onCancel();
          else window.history.back();
        }}
      />

      <InfoModel
        open={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          if (props.onCancel) props.onCancel();
          else window.history.back();
        }}
        variant="success"
        title="บันทึกรายงานสำเร็จ!"
        description="ระบบได้ทำการบันทึกข้อมูลของคุณเรียบร้อยแล้ว"
      />
    </>
  );
}
