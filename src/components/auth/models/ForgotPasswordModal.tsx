import { useEffect, useRef, useState } from "react";
import { User, X, MailCheck } from "lucide-react";
import styles from "./ForgotPasswordModal.module.css";
import TimingMessagePopUp from "../popup/TimingMessagePopUp";
import BigIconSuccessSmsPopUp from "../popup/BigIconSuccessSmsPopUp";
import FaceForgetPassSuccessSmsPopUp from "../popup/FaceForgetPassSuccessSmsPopUp";
import { preloadCameraModels } from "@/components/auth/ailoader/preloadCameraModels";
import VerificationCameraModal from "@/components/auth/models/VerificationCameraModal";
import { MoLoadingPopup } from "@/components/mo/popup";
import { useStore } from "@/store/store";

type Props = {
  open: boolean;
  empCode: string;
  onChangeEmp: (v: string) => void;
  onClose: () => void;
  onSend: () => Promise<{
    success: boolean;
    message: string;
    error?: string;
    contacts?: Array<{ team?: string; email?: string }>;
  }>;
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
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<
    "scan" | "send" | "faceVerify" | null
  >(null);
  const [showResult, setShowResult] = useState(false);
  const [resultSuccess, setResultSuccess] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [resultContacts, setResultContacts] = useState<
    Array<{ team?: string; email?: string }> | undefined
  >(undefined);
  const [camOpen, setCamOpen] = useState(false);
  const [successMode, setSuccessMode] = useState<"email" | "face">("email");
  const loading = !!loadingMessage;

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      // Reset states when modal opens
      setShowResult(false);
      setResultSuccess(false);
      setResultMessage("");
      setLoadingMessage(null);
      setLoadingAction(null);
      setCamOpen(false);
      setSuccessMode("email");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, loading, onClose]);

  const handleSend = async () => {
    setLoadingAction("send");
    setLoadingMessage("กำลังส่งรหัสผ่าน...");
    try {
      const result = await onSend();
      setResultSuccess(result.success);
      if (result.success) {
        setResultMessage("ระบบได้ส่งรหัสผ่านไปยังอีเมลที่ลงทะเบียนไว้แล้ว");
      } else {
        setResultMessage(result.message || "เกิดข้อผิดพลาด");
        setResultContacts(result.contacts);
      }
      setShowResult(true);
    } catch (err) {
      setResultSuccess(false);
      setResultMessage(
        "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้งหรือติดต่อฝ่ายบุคคล",
      );
      setShowResult(true);
    } finally {
      setLoadingMessage(null);
      setLoadingAction(null);
    }
  };

  const handleScanFace = async () => {
    if (!empValid) {
      setResultSuccess(false);
      setResultContacts(undefined);
      setResultMessage("กรุณากรอกรหัสพนักงาน 6 หลักให้ถูกต้อง");
      setShowResult(true);
      return;
    }

    setLoadingAction("scan");
    setLoadingMessage("กำลังตรวจสอบข้อมูลใบหน้า...");
    let openingCamera = false;
    let profileChecked = false;
    try {
      const profile = await useStore
        .getState()
        .lookupEmployeeFaceProfile(empCode);
      profileChecked = true;

      if (!profile.has_face_profile) {
        setResultSuccess(false);
        setResultContacts(undefined);
        setResultMessage("ยังไม่มีข้อมูลใบหน้า\nกรุณาติดต่อ GutsEssCenter");
        setShowResult(true);
        return;
      }

      setShowResult(false);
      setLoadingMessage("กำลังเตรียมระบบสแกนใบหน้า...");
      await preloadCameraModels("verify");
      setLoadingMessage("กำลังเปิดกล้อง...");
      openingCamera = true;
      setCamOpen(true);
    } catch (error) {
      setResultSuccess(false);
      setResultContacts(undefined);
      setResultMessage(
        !profileChecked && error instanceof Error
          ? error.message
          : "ไม่สามารถเตรียมระบบสแกนใบหน้าได้",
      );
      setShowResult(true);
    } finally {
      if (!openingCamera) {
        setLoadingMessage(null);
        setLoadingAction(null);
      }
    }
  };

  const handleFaceCaptured = async (imageDataUrl: string) => {
    setLoadingAction("faceVerify");
    setLoadingMessage("กำลังยืนยันใบหน้า...");
    try {
      const result = await useStore
        .getState()
        .verifyEmployeeFace(empCode, imageDataUrl);
      setResultContacts(undefined);
      setResultSuccess(result.success && result.is_match);
      setSuccessMode("face");
      setResultMessage(
        result.success && result.is_match
          ? result.password || "ไม่พบรหัสผ่าน กรุณาติดต่อ GutsEssCenter"
          : result.message || "ใบหน้าไม่ตรงกับข้อมูลพนักงาน",
      );
      setShowResult(true);
    } catch {
      setResultSuccess(false);
      setResultContacts(undefined);
      setResultMessage("ยังไม่มีข้อมูลใบหน้า\nกรุณาติดต่อ GutsEssCenter");
      setShowResult(true);
    } finally {
      setLoadingMessage(null);
      setLoadingAction(null);
    }
  };

  const closeResult = () => {
    setShowResult(false);
    setResultSuccess(false);
    setResultContacts(undefined);
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

          <X
            size={35}
            strokeWidth={2.5}
            onClick={() => {
              if (!loading) onClose();
            }}
            className={styles.closeBtn}
          />
        </div>

        <>
          <p className={styles.desc}>
            กรอกรหัสพนักงาน 6 หลัก แล้วกดส่งรหัส
            ระบบจะส่งรหัสไปยังอีเมลที่ลงทะเบียนไว้
          </p>

          <div className={styles.form}>
            <div className={styles.label}>รหัสพนักงาน (6 หลัก)</div>
            <div className={styles.field}>
              <span className={styles.iconLeft} aria-hidden="true">
                <User size={18} />
              </span>
              <input
                ref={inputRef}
                className={styles.inputWithIcon}
                value={empCode}
                onChange={(e) => {
                  onChangeEmp(e.target.value);
                }}
                inputMode="numeric"
                autoComplete="off"
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={loading}
              onClick={handleScanFace}
            >
              {loadingAction === "scan" ? "กำลังตรวจสอบ..." : "สแกนใบหน้า"}
            </button>

            <button
              type="button"
              className={styles.primaryBtn}
              disabled={loading}
              onClick={handleSend}
            >
              {loadingAction === "send" ? "กำลังส่ง..." : "กดส่งรหัสผ่าน"}
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

          {/*<div className={styles.warn} style={{ marginTop: 10 }}>
            **ระบบจะส่งรหัสไปอีเมลที่ลงทะเบียนไว้
            <br />
            หากไม่ได้รับอีเมล กรุณาติดต่อฝ่ายบุคคล
          </div>*/}
        </>
      </div>

      {resultSuccess && successMode === "face" ? (
        <FaceForgetPassSuccessSmsPopUp
          open={showResult}
          message={resultMessage}
          onClose={() => {
            setShowResult(false);
            setResultSuccess(false);
            onClose();
          }}
        />
      ) : resultSuccess ? (
        <BigIconSuccessSmsPopUp
          open={showResult}
          icon={<MailCheck size={80} />}
          iconColor="gray"
          title="กรุณาตรวจสอบรหัสผ่านของคุณในอีเมล์"
          subText={resultMessage}
          onClose={() => {
            setShowResult(false);
            setResultSuccess(false);
            onClose();
          }}
        />
      ) : (
        <TimingMessagePopUp
          open={showResult}
          variant="warning"
          message={resultMessage}
          errorKey={null}
          contacts={resultContacts}
          closeOnBackdrop={true}
          closeOnEsc={true}
          onClose={closeResult}
        />
      )}

      <MoLoadingPopup open={loading} message={loadingMessage || undefined} />

      <VerificationCameraModal
        open={camOpen}
        onClose={() => {
          setCamOpen(false);
          setLoadingMessage(null);
          setLoadingAction(null);
        }}
        onCaptured={handleFaceCaptured}
        onReady={() => {
          setLoadingMessage(null);
          setLoadingAction(null);
        }}
        onSetupError={(message) => {
          setCamOpen(false);
          setLoadingMessage(null);
          setLoadingAction(null);
          setResultSuccess(false);
          setResultContacts(undefined);
          setResultMessage(message);
          setShowResult(true);
        }}
        closeOnBackdrop={false}
        closeOnEsc={true}
        modelSettingsPreloaded={true}
      />
    </div>
  );
}
