// src/pages/Home.tsx
import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  XCircle,
  Eye,
  MapPinCheck,
} from "lucide-react";
import styles from "./MoDetailPage.module.css";
import AutoResizeTextarea from "../../../components/AutoResizeTextarea";
import MoPdfViewer from "../MoPdfViewerPage/MoPdfViewer";

type Props = {
  onCancel?: () => void;
  onShare?: () => void;
  item?: SectorReport;
};

type ApprovalStatus = "PENDING" | "APPROVED" | "REJECT";

function ApprovalStatusIcon({ value }: { value: ApprovalStatus }) {
  if (value === "APPROVED") {
    return <CheckCircle2 size={16} strokeWidth={2.2} />;
  }
  if (value === "REJECT") {
    return <XCircle size={16} strokeWidth={2.2} />;
  }
  return <Clock3 size={16} strokeWidth={2.2} />;
}

export default function MoDetailPage(props: Props) {
  const [showPdf, setShowPdf] = useState(false);
  const [date] = useState(() => new Date().toLocaleDateString("th-TH"));
  const [region, setRegion] = useState("");
  // ลา
  const [sickLeave, setSickLeave] = useState("");
  const [personalLeave, setPersonalLeave] = useState("");
  const [otherLeaveType, setOtherLeaveType] = useState("");

  // กำลังพล
  const [absentCount, setAbsentCount] = useState("");
  // breakdown for การควงกะ
  const [workShiftOpen, setWorkShiftOpen] = useState(true);
  const [shift18, setShift18] = useState("");
  const [shift24, setShift24] = useState("");
  const [shift36, setShift36] = useState("");
  // collapse state for "กำลังพล" box
  const [personnelOpen, setPersonnelOpen] = useState(true);
  // ผิดข้อปฏิบัติ / การตักเตือน
  const [disciplineNote, setDisciplineNote] = useState("");
  // collapse + numeric counts for ผิดข้อปฏิบัติ UI
  const [disciplineOpen, setDisciplineOpen] = useState(true);
  const [sleepCount, setSleepCount] = useState("");
  const [phoneCount, setPhoneCount] = useState("");
  const [badgeCount, setBadgeCount] = useState("");
  // เครื่องแต่งกาย - counts
  const [hatCount, setHatCount] = useState("");
  const [shirtCount, setShirtCount] = useState("");
  const [pantsCount, setPantsCount] = useState("");
  const [shoesCount, setShoesCount] = useState("");
  // collapse state for เครื่องแต่งกาย
  const [uniformOpen, setUniformOpen] = useState(true);
  // อื่น ๆ
  const [otherNote, setOtherNote] = useState("");
  // "อื่น ๆ" detailed rows
  const [foundCount, setFoundCount] = useState("");
  const [foundNote, setFoundNote] = useState("");
  const [trainCount, setTrainCount] = useState("");
  const [trainNote, setTrainNote] = useState("");
  // collapse state for อื่น ๆ
  const [otherOpen, setOtherOpen] = useState(true);

  // new: collapse state for "ลา" card
  const [leaveOpen, setLeaveOpen] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>("PENDING");
  const [approvalRemark, setApprovalRemark] = useState("");

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

    setFoundCount(it.other_Job_count != null ? String(it.other_Job_count) : "");
    setFoundNote(it.other_Job ?? "");
    setTrainCount(
      it.other_training_count != null ? String(it.other_training_count) : "",
    );
    setTrainNote(it.other_training ?? "");
    setOtherNote(it.other_extral ?? "");
    setApprovalStatus(toApprovalStatus(it.approved_status));
    setApprovalRemark(it.approved_remark ?? "");
  }, [props.item]);

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
        </div>
      </div>
      <div className={styles["guts-Mo-layout"]}>
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
            <p className={styles["region-card-meta-date"]}>
              {props.item?.created_at
                ? new Date(props.item.created_at).toLocaleDateString("th-TH")
                : date}
            </p>
            <p className={styles["region-card-meta-id"]}>#{props.item?.id ?? ""}</p>
          </div>
        </div>

        <div className={[styles["guts-box"], styles["collapsible"]].join(" ")}>
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
                  disabled={true}
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
                  disabled={true}
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
                  disabled={true}
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

        <div className={[styles["guts-box"], styles["collapsible"]].join(" ")}>
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
                  disabled={true}
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

            <div className={styles["guts-subbox"]}>
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
                      disabled={true}
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
                      disabled={true}
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
                      disabled={true}
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

        <div className={[styles["guts-box"], styles["collapsible"]].join(" ")}>
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
                  disabled={true}
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
                  disabled={true}
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
                  disabled={true}
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
                disabled={true}
                onChange={(e) => setDisciplineNote(e.target.value)}
                placeholder="บันทึกการตักเตือน (สาเหตุ/คำสั่ง/ผู้รับผิดชอบ)"
              />
        
          </div>
        </div>

        <div className={[styles["guts-box"], styles["collapsible"]].join(" ")}>
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
                  disabled={true}
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
                  disabled={true}
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
                  disabled={true}
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
                  disabled={true}
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

        <div className={[styles["guts-box"], styles["collapsible"]].join(" ")}>
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
            className={[styles["guts-field-row"], styles["two-col"]].join(" ")}
          >
            <label className={styles["guts-label"]}>พบผู้ว่างจ้าง:</label>
            <div className={styles["guts-input-group"]}>
              <input
                className={`${styles["guts-input"]} ${styles["small"]}`}
                type="number"
                min={0}
                step={1}
                value={foundCount}
                disabled={true}
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
              disabled={true}
              onChange={(e) => setFoundNote(e.target.value)}
              placeholder="รายละเอียด/เวลา/ผู้เกี่ยวข้อง"
            />
          </div>

          <div
            className={[styles["guts-field-row"], styles["two-col"]].join(" ")}
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
                disabled={true}
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
              value={trainNote}
              disabled={true}
              onChange={(e) => setTrainNote(e.target.value)}
              placeholder="รายละเอียด/เวลา/ผู้เกี่ยวข้อง"
            />
          </div>
          <div
            className={[styles["guts-field-row"], styles["two-col"]].join(" ")}
            style={{ marginTop: 8 }}
          >
            <label className={styles["guts-label"]}>เพิ่มเติม:</label>
          </div>

          <div className={styles["guts-detail-box"]}>
            <AutoResizeTextarea
              className={`${styles["guts-input-full"]} ${styles["guts-detail-textarea"]} ${styles["approval-textarea"]}`}
              rows={2}
              value={otherNote}
              disabled={true}
              onChange={(e) => setOtherNote(e.target.value)}
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
            <div className={styles["approval-content"]}>
              <AutoResizeTextarea
                className={styles["approval-textarea"]}
                rows={3}
                value={approvalRemark}
                disabled={true}
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
      </div>
    </>
  );
}
