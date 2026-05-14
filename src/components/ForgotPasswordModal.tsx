import { useEffect, useRef, useState } from "react";
import styles from "./ForgotPasswordModal.module.css";
import EmailModal from "./EmailModal";

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
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [emailContacts, setEmailContacts] = useState<Array<{team?: string; email?: string}> | undefined>(undefined);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      // Reset states when modal opens
      setShowEmailModal(false);
      setEmailSuccess(false);
      setEmailMessage("");
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
    setLoading(true);
    try {
      const result = await onSend();
      setEmailSuccess(result.success);
        setEmailMessage(result.message || (result.success ? "ส่งรหัสผ่านสำเร็จ" : "เกิดข้อผิดพลาด"));
        setEmailContacts((result as any).contacts);
      setShowEmailModal(true);
      
      if (result.success) {
          // Do NOT auto-close the forgot-password modal; user will dismiss manually
      }
    } catch (err) {
      setEmailSuccess(false);
      setEmailMessage("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้งหรือติดต่อฝ่ายบุคคล");
      setShowEmailModal(true);
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
              }}
              inputMode="numeric"
              autoComplete="off"
              disabled={loading}
            />
          </div>

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
      </div>
      
      {/* Email Result Modal */}
      <EmailModal
        open={showEmailModal}
        success={emailSuccess}
        message={emailMessage}
        contacts={emailContacts}
        closeOnBackdrop={false}
        closeOnEsc={false}
        onOk={() => {
          setShowEmailModal(false);
        }}
        onClose={() => setShowEmailModal(false)}
      />
    </div>
  );
}
