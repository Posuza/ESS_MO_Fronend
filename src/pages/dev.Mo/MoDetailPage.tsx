// src/pages/dev.Mo/MoDetailPage.tsx
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Trash2, Pencil } from "lucide-react";
import styles from "./MoDetailPage.module.css";
import ConfirmDeleteDialog from "../../components/Mo/ConfirmDeleteDialog";
import InfoModel from "../../components/Mo/InfoModel";
import MoUpdateForm from "../../components/dev.Mo/MoUpdateForm";
import { useStore } from "../../store/store";
import type { SectorReport } from "../../store/store";

type Props = {
  onCancel?: () => void;
  item?: SectorReport;
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

  const submitRef = useRef<(() => Promise<void>) | null>(null);

  const currentEmployee = useStore((state) => state.authEmployee);
  const { deleteReport, fetchReportById, currentReport } = useStore();

  // Fetch fresh data on mount
  useEffect(() => {
    if (props.item?.id) {
      fetchReportById(props.item.id);
    }
  }, [props.item?.id, fetchReportById]);

  const reportData =
    (currentReport?.id === props.item?.id
      ? (currentReport as unknown as Record<string, unknown>)
      : null) ?? (props.item as unknown as Record<string, unknown>);

  const itemCreatedBy = props.item?.created_by ?? currentReport?.created_by;
  const canEditData =
    !currentEmployee ||
    currentEmployee?.position_name !== "สายตรวจและประสานงาน" ||
    (itemCreatedBy !== undefined &&
      itemCreatedBy !== "" &&
      currentEmployee?.employee_code !== undefined &&
      itemCreatedBy === currentEmployee.employee_code);

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

  return (
    <>
      <div className={styles["gut-detail-btns-box"]}>
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

        <div className={styles["guts-action-icons"]}>
          {canEditData && (
            <>
              {/* Pencil: only visible when not editing */}
              {!isEditing && (
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

              {/* Delete: hidden while editing */}
              {!isEditing && (
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

      <MoUpdateForm
        reportData={reportData}
        selectedLocation={(props.item as any)?.sub_location}
        onCancel={() => {
          setIsEditing(false);
          setIsDirty(false);
        }}
        submitRef={submitRef}
        isEditing={isEditing}
        onDirtyChange={setIsDirty}
        isDirty={isDirty}
      />
    </>
  );
}
