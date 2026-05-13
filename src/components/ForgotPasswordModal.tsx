import { useEffect, useRef, useState } from "react";
import styles from "./ForgotPasswordModal.module.css";

type Props = {
  open: boolean;
  empCode: string;
  onChangeEmp: (v: string) => void;
  onClose: () => void;
  onSend: () => Promise<{ success: boolean; message: string }>;
};

export default function ForgotPasswordModal({
  open,
  empCode,
  onChangeEmp,
  onClose,
  onSend,
}: Props) {
  const empValid = /^\d{6}$/.test(empCode);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      // Reset states when modal opens
      setError(null);
      setSuccess(false);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const handleSend = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await onSend();
      if (result.success) {
        setSuccess(true);
        setError(null);
        // Auto close after 3 seconds on success
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        setError(result.message || "ไม่พบรหัสพนักงานในระบบ กรุณาติดต่อฝ่ายบุคคล");
        setSuccess(false);
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้งหรือติดต่อฝ่ายบุคคล");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Forgot password"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.head}>
          <h3 className={styles.title}>ลืมรหัสผ่าน</h3>

          <button
            className={styles.closeBtn}
            type="button"
            onClick={onClose}
            aria-label="Close"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {success ? (
          <div className={styles.successBox}>
            <div className={styles.successIcon}>✓</div>
            <p className={styles.successText}>
              ส่งรหัสผ่านสำเร็จ!
              <br />
              กรุณาตรวจสอบอีเมลที่ลงทะเบียนไว้
            </p>
          </div>
        ) : (
          <>
            <p className={styles.desc}>
              กรอกรหัสพนักงาน 6 หลัก แล้วกดส่งรหัส ระบบจะส่งรหัสไปยังอีเมลที่ลงทะเบียนไว้
            </p>

            <div className={styles.form}>
              <div className={styles.label}>รหัสพนักงาน (6 หลัก)</div>
              <input
                ref={inputRef}
                className={styles.input}
                value={empCode}
                onChange={(e) => {
                  onChangeEmp(e.target.value);
                  setError(null); // Clear error when user types
                }}
                inputMode="numeric"
                autoComplete="off"
                disabled={loading}
              />
            </div>

            {error && (
              <div className={styles.errorBox}>
                <span className={styles.errorIcon}>⚠</span>
                <span className={styles.errorText}>{error}</span>
              </div>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={!empValid || loading}
                onClick={handleSend}
              >
                {loading ? "กำลังส่ง..." : "กดส่งรหัสผ่าน"}
              </button>

              <button
                type="button"
                className={styles.backBtn}
                onClick={onClose}
                disabled={loading}
              >
                ย้อนกลับ
              </button>
            </div>

            <div className={styles.warn} style={{ marginTop: 10 }}>
              **ระบบจะส่งรหัสไปอีเมลที่ลงทะเบียนไว้
              <br />
              หากไม่ได้รับอีเมล กรุณาติดต่อฝ่ายบุคคล
            </div>
          </>
        )}
      </div>
    </div>
  );
}
