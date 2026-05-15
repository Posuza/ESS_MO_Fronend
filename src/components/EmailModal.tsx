import { useEffect } from "react";
import styles from "./EmailModal.module.css";

type Props = {
  open: boolean;
  success: boolean;
  message: string;
  contacts?: Array<{ team?: string; email?: string }>;
  onOk: () => void;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  onClose?: () => void;
};

export default function EmailModal({
  open,
  success,
  message,
  contacts,
  onOk,
  closeOnBackdrop = false,
  closeOnEsc = true,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeOnEsc, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={success ? "ส่งอีเมลสำเร็จ" : "ส่งอีเมลไม่สำเร็จ"}
      onClick={() => {
        if (!closeOnBackdrop) return;
        onClose?.();
      }}
    >
      <div
        className={`${styles.modal} ${success ? styles.successModal : styles.errorModal}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div
            className={`${styles.badge} ${success ? styles.success : styles.error}`}
            aria-hidden="true"
          >
            {success ? "✓" : "!"}
          </div>
          <div
            className={`${styles.title} ${success ? styles.successTitle : styles.errorTitle}`}
          >
            {success ? "ส่งอีเมลสำเร็จ" : "ส่งอีเมลไม่สำเร็จ"}
          </div>
          {/* Always show close button in header */}
          <button
            className={styles.closeBtn}
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div
          className={`${styles.body} ${success ? styles.successBody : styles.errorBody}`}
        >
          {message.split("\n").map((line, i) => (
            <div key={i}>{line}</div>
          ))}

          {!success && contacts && contacts.length > 0 && (
            <div className={styles.contacts}>
              {contacts.map((c, idx) => (
                <div key={idx} className={styles.contact}>
                  <div className={styles.contactLabel}>ติดต่อ:</div>
                  <div className={styles.contactValue}>
                    {c.team || "ไม่ระบุ"}
                  </div>
                  <div className={styles.contactEmail}>
                    {c.email || "ไม่ระบุ"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
