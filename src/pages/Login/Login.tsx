import React, { useState, useEffect } from "react";
import Header from "@/layout/Header";
import TimingMessagePopUp from "@/components/auth/popup/TimingMessagePopUp";
import LoginFaceCameraModal from "@/components/auth/models/LoginFaceCameraModal";
import { preloadCameraModels } from "@/components/auth/ailoader/preloadCameraModels";
import { scheduleCameraModelPreload } from "@/components/auth/ailoader/modelPreloadScheduler";
import { MoLoadingPopup } from "@/components/mo/popup";
import { useStore } from "@/store/store";
import LoginMethod from "../../components/auth/LoginMethod";
import PasswordLogin from "../../components/auth/PasswordLogin";
import FaceLogin from "../../components/auth/FaceLogin";
import ForgotPassword from "../../components/auth/ForgotPassword";
import ChangePassword from "../../components/auth/ChangePassword";
import styles from "./Login.module.css";

type Props = {
  onLoginSuccess: (empCode: string, displayName: string) => void;
};

export type LoginStep =
  | "method"
  | "password"
  | "face"
  | "forgotPassword"
  | "changePassword";

type LoadingAction = "faceProfile" | "faceLogin" | null;

export default function Login({ onLoginSuccess }: Props) {
  const [empCode, setEmpCode] = useState(
    () => sessionStorage.getItem("emp_code") || "",
  );
  const [pin, setPin] = useState("");
  const [loginStep, setLoginStep] = useState<LoginStep>("method");
  const [faceCameraOpen, setFaceCameraOpen] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [changeOldPin, setChangeOldPin] = useState("");
  const [changeNewPin, setChangeNewPin] = useState("");
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);

  const authError = useStore((s) => s.authError);
  const authErrorKey = useStore((s) => s.authErrorKey);
  const authContacts = useStore((s) => s.authContacts);
  const authLoading = useStore((s) => s.authLoading);
  const loading = !!loadingMessage || authLoading;

  useEffect(() => scheduleCameraModelPreload("verify"), []);

  useEffect(() => {
    setShowFailedModal(!!authError || !!localErrorMessage);
  }, [authError, localErrorMessage]);

  const updateEmpCode = (value: string) => {
    setEmpCode(value.replace(/\D/g, "").slice(0, 6));
    if (localErrorMessage) setLocalErrorMessage(null);
  };

  const goTo = (step: LoginStep) => {
    setLocalErrorMessage(null);
    setLoginStep(step);
  };

  const goBackToMethods = () => {
    setPin("");
    setLocalErrorMessage(null);
    setLoginStep("method");
  };

  const handleSubmit = async () => {
    const empValidNow = /^\d{6}$/.test(empCode);
    const pinValidNow = pin.length === 6;

    if (empCode.trim() === "" && pin.trim() === "") {
      setLocalErrorMessage(
        "กรุณากรอกรหัสพนักงาน 6 หลัก \n และ \n รหัสผ่าน 6 ตัวอักษร",
      );
      return;
    }
    if (!empValidNow) {
      setLocalErrorMessage("กรุณากรอกรหัสพนักงาน 6 หลัก");
      return;
    }
    if (!pinValidNow) {
      setLocalErrorMessage("กรุณากรอกรหัสผ่าน 6 ตัวอักษร");
      return;
    }

    const success = await useStore.getState().login(empCode, pin);
    if (!success) return;

    const emp = useStore.getState().authEmployee;
    if (!emp) return;

    const displayName =
      `${emp.first_name} ${emp.last_name}`.trim() || emp.employee_code;
    setEmpCode(emp.employee_code);
    onLoginSuccess(emp.employee_code, displayName);
  };

  const handleForgotPassword = async () => {
    if (!/^\d{6}$/.test(empCode)) {
      return {
        success: false,
        message: "กรุณากรอกรหัสพนักงาน 6 หลักให้ถูกต้อง",
      };
    }
    return await useStore.getState().forgotPassword(empCode);
  };

  const handleChangePassword = async (oldPin: string, newPin: string) => {
    return await useStore.getState().changePassword(empCode, oldPin, newPin);
  };

  const handleFaceLoginScan = async () => {
    if (!/^\d{6}$/.test(empCode)) {
      setLocalErrorMessage("กรุณากรอกรหัสพนักงาน 6 หลักให้ถูกต้อง");
      return;
    }

    setLoadingAction("faceProfile");
    setLoadingMessage("กำลังตรวจสอบข้อมูลใบหน้า...");
    let openingCamera = false;

    try {
      const profile = await useStore
        .getState()
        .lookupEmployeeFaceProfile(empCode);

      if (!profile.has_face_profile) {
        setLocalErrorMessage("ยังไม่มีข้อมูลใบหน้า\nกรุณาติดต่อ GutsEssCenter");
        return;
      }

      setLoadingMessage("กำลังเตรียมระบบสแกนใบหน้า...");
      await preloadCameraModels("verify");
      setLoadingMessage("กำลังเปิดกล้อง...");
      openingCamera = true;
      setFaceCameraOpen(true);
    } catch (error) {
      setLocalErrorMessage(
        error instanceof Error
          ? error.message
          : "ไม่สามารถเตรียมระบบสแกนใบหน้าได้",
      );
    } finally {
      if (!openingCamera) {
        setLoadingMessage(null);
        setLoadingAction(null);
      }
    }
  };

  const handleFaceCaptured = async (imageDataUrl: string) => {
    setLoadingAction("faceLogin");
    setLoadingMessage("กำลังเข้าสู่ระบบด้วยใบหน้า...");

    try {
      const success = await useStore
        .getState()
        .faceLogin(empCode, imageDataUrl);

      if (!success) return;
      const emp = useStore.getState().authEmployee;
      if (!emp) return;

      const displayName =
        `${emp.first_name} ${emp.last_name}`.trim() || emp.employee_code;
      setEmpCode(emp.employee_code);
      onLoginSuccess(emp.employee_code, displayName);
    } finally {
      setFaceCameraOpen(false);
      setLoadingMessage(null);
      setLoadingAction(null);
    }
  };

  return (
    <main className={styles["guts-bg"]}>
      <div
        className={styles["guts-app-header"]}
        aria-label="Employee Self Service"
      >
        <Header showUserCard={false} />
      </div>

      <div className={styles["login-stage"]}>
        {loginStep === "method" && (
          <LoginMethod
            onSelectFace={() => goTo("face")}
            onSelectPassword={() => goTo("password")}
          />
        )}

        {loginStep === "password" && (
          <PasswordLogin
            empCode={empCode}
            pin={pin}
            loading={authLoading}
            onChangeEmp={updateEmpCode}
            onChangePin={(value) => {
              setPin(value.replace(/\s/g, "").slice(0, 6));
              if (localErrorMessage) setLocalErrorMessage(null);
            }}
            onSubmit={handleSubmit}
            onBack={goBackToMethods}
            onForgotPassword={() => goTo("forgotPassword")}
            onChangePassword={() => goTo("changePassword")}
          />
        )}

        {loginStep === "face" && (
          <FaceLogin
            empCode={empCode}
            loading={loading}
            checkingFaceProfile={loadingAction === "faceProfile"}
            onChangeEmp={updateEmpCode}
            onScanFace={handleFaceLoginScan}
            onBack={goBackToMethods}
          />
        )}

        {loginStep === "forgotPassword" && (
          <ForgotPassword
            empCode={empCode}
            onChangeEmp={updateEmpCode}
            onBack={() => goTo("password")}
            onSend={handleForgotPassword}
          />
        )}

        {loginStep === "changePassword" && (
          <ChangePassword
            empCode={empCode}
            oldPin={changeOldPin}
            newPin={changeNewPin}
            onChangeEmp={updateEmpCode}
            onChangeOldPin={setChangeOldPin}
            onChangeNewPin={setChangeNewPin}
            onBack={() => {
              setChangeOldPin("");
              setChangeNewPin("");
              goTo("password");
            }}
            onForgotPassword={() => {
              setChangeOldPin("");
              setChangeNewPin("");
              goTo("forgotPassword");
            }}
            onSubmit={() => handleChangePassword(changeOldPin, changeNewPin)}
          />
        )}
      </div>

      <TimingMessagePopUp
        open={showFailedModal}
        variant={
          localErrorMessage || authErrorKey === "INVALID_CREDENTIALS"
            ? "warning"
            : "error"
        }
        message={authError || localErrorMessage || ""}
        errorKey={authErrorKey || null}
        contacts={authContacts}
        onClose={() => {
          setShowFailedModal(false);
          setLocalErrorMessage(null);
        }}
      />

      <MoLoadingPopup open={!!loadingMessage} message={loadingMessage || undefined} />

      <LoginFaceCameraModal
        open={faceCameraOpen}
        onClose={() => {
          setFaceCameraOpen(false);
          setLoadingMessage(null);
          setLoadingAction(null);
        }}
        onCaptured={handleFaceCaptured}
        onReady={() => {
          setLoadingMessage(null);
          setLoadingAction(null);
        }}
        onSetupError={(message) => {
          setFaceCameraOpen(false);
          setLoadingMessage(null);
          setLoadingAction(null);
          setLocalErrorMessage(message);
        }}
        closeOnBackdrop={false}
        closeOnEsc={true}
      />
    </main>
  );
}
