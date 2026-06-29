// src/pages/dev.Mo/MoDetailPage.tsx
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Trash2, Pencil } from "lucide-react";
import styles from "./MoDetailPage.module.css";
import {
  ConfirmDeleteDialog,
  InfoModel,
  MoLoadingPopup,
} from "../../components/mo/popup";
import MoUpdateForm from "../../components/mo/MoUpdateForm";
import { useStore } from "../../store/store";
import type { SectorReport } from "../../services/moReporTransaction.Service";
import { canApprove } from "../../utils/positionAccess";

type Props = {
  onCancel?: () => void;
  item?: SectorReport;
};

// Approval status helpers (mirrors what MoUpdateForm uses internally)
const approvalStatusLabels = [
  {
    keys: ["approved", "ดำเนินการแล้ว"],
    label: "อนุมัติเรียบร้อยแล้ว",
    cssClass: "status-approved",
  },
  {
    keys: ["PENDING", "pending", "waited", "รอการดำเนินการ", "รอ"],
    label: "รอผู้อำนวยการอนุมัติ",
    cssClass: "status-pending",
  },
  {
    keys: ["REJECTED", "rejected", "reject", "ถูกปฏิเสธ"],
    label: "รอการดำเนินการแก้ไข",
    cssClass: "status-rejected",
  },
];

const getApprovalStatusClass = (
  status: string,
  stylesMod: Record<string, string>,
) => {
  const cleaned = String(status ?? "")
    .trim()
    .toLowerCase();
  const found = approvalStatusLabels.find((item) =>
    item.keys.some((k) => k.toLowerCase() === cleaned),
  );
  return found
    ? (stylesMod[found.cssClass] ?? "")
    : (stylesMod["status-pending"] ?? "");
};

export default function MoDetailPage(props: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTitle, setSuccessTitle] = useState("อัปเดตรายงานสำเร็จ!");
  const [successDescription, setSuccessDescription] = useState(
    "ระบบได้ทำการอัปเดตข้อมูลของคุณเรียบร้อยแล้ว",
  );

  // Fetch error state — report may have been deleted by someone else
  const [showFetchError, setShowFetchError] = useState(false);
  const [fetchErrorMessage, setFetchErrorMessage] = useState("");

  // Delete loading popup with minimum 2-second display time
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MIN_DELETE_MS = 2000;

  // Initial page loading — don't mount form until data is ready + min 2s
  const [pageDataReady, setPageDataReady] = useState(false);
  const [pageMinTimePassed, setPageMinTimePassed] = useState(false);
  const showPageLoading = !(pageDataReady && pageMinTimePassed);

  useEffect(() => {
    const timer = setTimeout(() => setPageMinTimePassed(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    };
  }, []);

  // ── Approval state — lifted up from MoUpdateForm so this page can own the approve/send-back buttons ──
  const [approvalStatus, setApprovalStatus] = useState<
    "PENDING" | "APPROVED" | "REJECTED"
  >(
    (props.item?.approved_status as "PENDING" | "APPROVED" | "REJECTED") ||
      "PENDING",
  );

  // ref that MoUpdateForm exposes so we can trigger a save (with optional approve flag) from here
  const submitRef = useRef<
    ((opts?: { approve?: boolean; sendBack?: boolean }) => Promise<void>) | null
  >(null);

  const currentEmployee = useStore((state) => state.authEmployee);
  const { deleteReport, fetchReportById, currentReport } = useStore();

  // Fetch fresh data on mount — if report was deleted, show error and go back
  useEffect(() => {
    if (props.item?.id) {
      fetchReportById(props.item.id).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setFetchErrorMessage(msg);
        setShowFetchError(true);
        setPageDataReady(true);
        setPageMinTimePassed(true);
      });
    }
  }, [props.item?.id, fetchReportById]);

  // Data is ready when currentReport matches this item
  useEffect(() => {
    if (currentReport?.id === props.item?.id) {
      setPageDataReady(true);
    }
  }, [currentReport, props.item?.id]);

  // Sync local approvalStatus when fresh data arrives
  useEffect(() => {
    const freshStatus =
      (currentReport?.id === props.item?.id
        ? (currentReport as any)?.approved_status
        : null) ?? props.item?.approved_status;
    if (freshStatus) {
      setApprovalStatus(freshStatus as "PENDING" | "APPROVED" | "REJECTED");
    }
  }, [currentReport, props.item]);

  const reportData =
    (currentReport?.id === props.item?.id
      ? (currentReport as unknown as Record<string, unknown>)
      : null) ?? (props.item as unknown as Record<string, unknown>);

  const itemCreatedBy = props.item?.created_by ?? currentReport?.created_by;

  // Check if current user has approval authority (Director / Deputy Director)
  const isApprover = canApprove(currentEmployee?.position_id);

  // Director-level users can approve
  const isDirector = isApprover;

  // Only allow edit/delete if the report's date is today
  const today = new Date().toISOString().split("T")[0];
  const reportDate = props.item?.report_date ?? currentReport?.report_date;
  const isReportDateToday = today === reportDate;

  // User can edit/delete only on the report's date and if they are an approver OR the creator
  const canEditData =
    !!currentEmployee &&
    isReportDateToday &&
    (isApprover ||
      (itemCreatedBy &&
        itemCreatedBy !== "" &&
        currentEmployee.employee_code &&
        currentEmployee.employee_code !== "" &&
        itemCreatedBy === currentEmployee.employee_code));

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirmDelete(true);
  }

  function confirmDelete() {
    if (!props.item?.id) return;
    setShowConfirmDelete(false);
    setIsDeleting(true);
    const startTime = Date.now();

    deleteReport(props.item.id)
      .then(() => {
        const elapsed = Date.now() - startTime;
        const remaining = MIN_DELETE_MS - elapsed;
        if (remaining > 0) {
          deleteTimerRef.current = setTimeout(() => {
            setIsDeleting(false);
            setSuccessTitle("ลบรายการสำเร็จ!");
            setSuccessDescription("ระบบได้ลบรายการนี้ออกจากระบบเรียบร้อยแล้ว");
            setShowSuccess(true);
          }, remaining);
        } else {
          setIsDeleting(false);
          setSuccessTitle("ลบรายการสำเร็จ!");
          setSuccessDescription("ระบบได้ลบรายการนี้ออกจากระบบเรียบร้อยแล้ว");
          setShowSuccess(true);
        }
      })
      .catch((err) => {
        setIsDeleting(false);
        alert(`เกิดข้อผิดพลาดในการลบ: ${err}`);
      });
  }

  // ── Approve: set status then trigger MoUpdateForm's save with the approve flag ──
  const handleApprove = async () => {
    setApprovalStatus("APPROVED");
    // give React one tick to flush the state before saving
    await new Promise((r) => requestAnimationFrame(r));
    await submitRef.current?.({ approve: true });
  };

  // ── Send back for revision: revert status to REJECTED, then save ──
  const handleSendBack = async () => {
    setApprovalStatus("REJECTED");
    // give React one tick to flush the state into the submitRef closure
    await new Promise((r) => requestAnimationFrame(r));
    // save with the REJECTED status so the backend knows (no success popup)
    await submitRef.current?.({ sendBack: true });
    // stay in view mode — user can click the pencil to edit manually
  };

  return (
    <>
      {/* ── Top action bar: back + edit/delete ── */}
      <div className={styles["gut-detail-btns-box"]}>
        <div className={styles["guts-action-icons"]}>
          {canEditData && (
            <>
              {!isEditing && reportData?.approved_status !== "APPROVED" && (
                <button
                  type="button"
                  className={styles["guts-icon-btn"]}
                  title="แก้ไข"
                  aria-label="Edit"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil size={18} />
                </button>
              )}

              {!isEditing && reportData?.approved_status !== "APPROVED" && (
                <button
                  type="button"
                  className={`${styles["guts-icon-btn"]} ${styles["guts-icon-delete"]}`}
                  onClick={handleDelete}
                  title="ลบ"
                  aria-label="Delete"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Confirm delete dialog */}
      <ConfirmDeleteDialog
        open={showConfirmDelete}
        title="ยืนยันลบรายการนี้?"
        description="รายการนี้จะถูกลบออกจากระบบ ไม่สามารถกู้คืนได้"
        onCancel={() => setShowConfirmDelete(false)}
        onConfirm={confirmDelete}
      />

      <MoLoadingPopup open={isDeleting} message="กำลังลบข้อมูล..." />
      <MoLoadingPopup open={showPageLoading} message="กำลังโหลดข้อมูล..." />

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

      <InfoModel
        open={showFetchError}
        onClose={() => {
          setShowFetchError(false);
          if (props.onCancel) props.onCancel();
          else window.history.back();
        }}
        variant="error"
        title="ไม่พบรายงาน"
        description={fetchErrorMessage}
      />

      {/* ── Form — only mount after initial loading is done ── */}
      {!showPageLoading && (
        <MoUpdateForm
          reportData={reportData}
          selectedLocation={(props.item as any)?.division_name}
          onCancel={() => {
            setIsEditing(false);
            setIsDirty(false);
          }}
          submitRef={submitRef}
          isEditing={isEditing}
          onDirtyChange={setIsDirty}
          isDirty={isDirty}
          // Pass approval state down so MoUpdateForm can include it in save payloads
          externalApprovalStatus={approvalStatus}
          onApprovalStatusChange={setApprovalStatus}
        />
      )}

      {/* ── Director-only approval buttons — only after initial loading ── */}
      {isDirector && !isEditing && !showPageLoading && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            padding: 0,
          }}
        >
          {/* อนุมัติรายงาน — hidden once already approved */}
          {approvalStatus !== "APPROVED" && (
            <button
              type="button"
              className={`${styles["guts-approve-btn"]} ${styles["status-pill"]} ${getApprovalStatusClass(
                reportData?.approved_status as string,
                styles,
              )}`}
              onClick={handleApprove}
            >
              อนุมัติรายงาน
            </button>
          )}

          {/* ส่งกลับแก้ไข หลังอนุมัติ — only active when currently APPROVED */}
          <button
            type="button"
            className={styles["guts-reactive-btn"]}
            disabled={approvalStatus !== "APPROVED"}
            style={
              approvalStatus !== "APPROVED"
                ? { opacity: 0.4, cursor: "not-allowed" }
                : {}
            }
            onClick={handleSendBack}
          >
            ผู้อำนวยการส่งกลับให้ผู้จัดการแก้ไข
          </button>
        </div>
      )}

      <div className={styles["mo-back-outer"]}>
        <button
          type="button"
          className={styles["mo-back-btn"]}
          onClick={() => {
            if (props.onCancel) return props.onCancel();
            return window.history.back();
          }}
        >
          ย้อนกลับ
        </button>
      </div>
    </>
  );
}
