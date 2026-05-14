import { useEffect } from "react";
import styles from "./LoginModal.module.css";

type Props = {
  open: boolean;
  message?: string;
  contacts?: Array<{ team?: string; email?: string }>;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  onClose?: () => void;
};

export default function LoginModal({
  open,
  message = "",
  contacts,
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
      aria-label="เข้าสู่ระบบไม่สำเร็จ"
      onClick={() => {
        if (!closeOnBackdrop) return;
        onClose?.();
      }}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.badge} aria-hidden="true">
            !
          </div>
          <div className={styles.title}>เข้าสู่ระบบไม่สำเร็จ</div>
          <button
            className={styles.closeBtn}
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className={styles.body}>
          {message.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}

          {contacts && contacts.length > 0 && (
            <div className={styles.contacts}>
              {contacts.map((c, idx) => (
                <div key={idx} className={styles.contact}>
                  <div className={styles.contactLabel}>ติดต่อ:</div>
                  <div className={styles.contactValue}>{c.team || "ไม่ระบุ"}</div>
                  <div className={styles.contactEmail}>{c.email || "ไม่ระบุ"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
