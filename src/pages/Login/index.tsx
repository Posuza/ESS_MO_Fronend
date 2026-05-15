import React, { useState, useEffect } from "react";
import Header from "@/layout/Header";
import ForgotPasswordModal from "@/components/ForgotPasswordModal";
import LoginModal from "@/components/LoginModal";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import styles from "./Login.module.css";

type Props = {
  empCode: string;
  pin: string;
  loginError?: string | null;
  loginErrorKey?: string | null;
  loginContacts?: Array<{ team?: string; email?: string }>;
  onChangeEmp: (v: string) => void;
  onChangePin: (v: string) => void;
  onSubmit: () => void;
  onSendForgot: () => Promise<{
    success: boolean;
    message: string;
    error?: string;
    contacts?: Array<{ team?: string; email?: string }>;
  }>;
};

export default function Login({
  empCode,
  pin,
  loginError,
  loginErrorKey,
  loginContacts,
  onChangeEmp,
  onChangePin,
  onSubmit,
  onSendForgot,
}: Props) {
  const [forgotOpen, setForgotOpen] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(
    null,
  );

  // Open failed modal when server error or local validation error exists
  useEffect(() => {
    setShowFailedModal(!!loginError || !!localErrorMessage);
  }, [loginError, localErrorMessage]);

  const empValid = /^\d{6}$/.test(empCode);
  const pinValid = /^\d{6}$/.test(pin);
  const canSubmit = empValid && pinValid;

  return (
    <main className={styles["guts-bg"]}>
      {/* ✅ ใช้ Header ร่วมทุกหน้า */}
      <div
        className={styles["guts-app-header"]}
        aria-label="Employee Self Service"
      >
        <Header showUserCard={false} />
      </div>

      <section className={styles["guts-card"]} aria-label="Login form">
        <div className={styles["guts-card-title"]}>เข้าสู่ระบบ</div>

        <form
          className={styles["guts-form"]}
          onSubmit={(e) => {
            e.preventDefault();

            // Local validation: step-by-step behavior
            const empValidNow = /^\d{6}$/.test(empCode);
            const pinValidNow = /^\d{6}$/.test(pin);

            // If both fields are empty, show both messages together
            if (empCode.trim() === "" && pin.trim() === "") {
              setLocalErrorMessage(
                "กรุณากรอกรหัสพนักงาน 6 หลัก \n และ \n รหัสผ่าน 6 หลัก",
              );
              return;
            }

            // If employee is present but not valid, show emp message only
            if (!empValidNow) {
              setLocalErrorMessage("กรุณากรอกรหัสพนักงาน 6 หลัก");
              return;
            }

            // Employee valid -> check pin
            if (!pinValidNow) {
              setLocalErrorMessage("กรุณากรอกรหัสผ่าน 6 หลัก");
              return;
            }

            // All good
            onSubmit();
          }}
        >
          {/* Employee */}
          <div>
            <div className={styles["guts-label"]}>รหัสพนักงาน (6 หลัก)</div>

            <div className={styles["guts-field"]}>
              <span className={styles["guts-icon-left"]} aria-hidden="true">
                <User size={18} />
              </span>

              <input
                className={[
                  styles["guts-input"],
                  styles["guts-input--with-left"],
                ].join(" ")}
                value={empCode}
                onChange={(e) => {
                  onChangeEmp(e.target.value);
                  if (localErrorMessage) setLocalErrorMessage(null);
                }}
                inputMode="numeric"
                autoComplete="off"
                aria-label="Employee code 6 digits"
              />
            </div>
          </div>

          {/* PIN */}
          <div>
            <div className={styles["guts-label"]}>กรอกรหัส ( PIN 6 หลัก )</div>

            <div className={styles["guts-field"]}>
              <span className={styles["guts-icon-left"]} aria-hidden="true">
                <Lock size={18} />
              </span>

              <input
                className={[
                  styles["guts-input"],
                  styles["guts-input--with-left"],
                  styles["guts-input--with-right"],
                ].join(" ")}
                value={pin}
                onChange={(e) => {
                  onChangePin(e.target.value);
                  if (localErrorMessage) setLocalErrorMessage(null);
                }}
                inputMode="numeric"
                autoComplete="off"
                type={showPin ? "text" : "password"}
                aria-label="PIN 6 digits"
              />

              <button
                type="button"
                className={styles["guts-icon-right-btn"]}
                onClick={() => setShowPin((v) => !v)}
                aria-label={showPin ? "ซ่อนรหัส PIN" : "แสดงรหัส PIN"}
                title={showPin ? "ซ่อนรหัส" : "แสดงรหัส"}
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remove inline error, use modal instead */}

          <button className={styles["guts-btn"]} type="submit">
            กดเข้าสู่ระบบ
          </button>

          <div className={styles["guts-links"]}>
            <button
              type="button"
              className={[styles["guts-link"], styles.primary].join(" ")}
              onClick={() => setForgotOpen(true)}
            >
              คลิกลืมรหัสผ่าน
            </button>

            <button
              type="button"
              className={[styles["guts-link"], styles.secondary].join(" ")}
              onClick={() => alert("TODO: คู่มือการใช้งาน")}
            >
              คลิกอ่านคู่มือ
            </button>
          </div>
        </form>
      </section>

      {/* Login Failed Modal */}
      <LoginModal
        open={showFailedModal}
        message={loginError || localErrorMessage || ""}
        // Use server-provided loginErrorKey first. Avoid referencing localErrorKey here to prevent runtime ReferenceError from stale bundles.
        errorKey={loginErrorKey || null}
        contacts={loginContacts}
        onClose={() => {
          setShowFailedModal(false);
          setLocalErrorMessage(null);
          setLocalErrorKey(null);
        }}
      />

      <ForgotPasswordModal
        open={forgotOpen}
        empCode={empCode}
        onChangeEmp={onChangeEmp}
        onClose={() => {
          onChangePin("");
          setForgotOpen(false);
        }}
        onSend={async () => {
          const result = await onSendForgot();
          if (result.success) {
            onChangePin("");
            // Modal will close automatically after success
          }
          return result;
        }}
      />
    </main>
  );
}
