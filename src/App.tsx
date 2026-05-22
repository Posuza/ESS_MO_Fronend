// src/App.tsx
import { Suspense, lazy, useMemo, useState } from "react";
import { useStore } from "./store/store";
const Login = lazy(() => import("./pages/Login"));
const Home = lazy(() => import("./pages/Home"));
const Mo = lazy(() => import("./pages/dev.Mo/Mo"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CheckInOut = lazy(() => import("./pages/Attendance/CheckInOut"));
const FaceVerify = lazy(() => import("./pages/Attendance/FaceVerify"));
import FirstLoginModal from "./components/FirstLoginModal";
import { authService } from "./services/auth.Service";

type Route =
  | "login"
  | "home"
  | "dashboard"
  | "checkInOut"
  | "faceVerify"
  | "mo";
type PunchType = "in" | "out";

export default function App() {
  const [stack, setStack] = useState<Route[]>(["login"]);
  const route = stack[stack.length - 1];

  const [empCode, setEmpCode] = useState("");
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginErrorKey, setLoginErrorKey] = useState<string | null>(null);
  const [loginContacts, setLoginContacts] = useState<
    Array<{ team?: string; email?: string }> | undefined
  >(undefined);

  const [firstLoginOpen, setFirstLoginOpen] = useState(false);

  const empValid = useMemo(() => /^\d{6}$/.test(empCode), [empCode]);
  const pinValid = useMemo(() => /^\d{6}$/.test(pin), [pin]);
  const canSubmit = empValid && pinValid;

  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem("display_name") || "",
  );

  const [lastInAt, setLastInAt] = useState<string | null>(null);
  const [lastOutAt, setLastOutAt] = useState<string | null>(null);

  const [punchType, setPunchType] = useState<PunchType>("in");

  // ===== Navigation helpers =====
  const reset = (r: Route) => setStack([r]);

  const push = (r: Route) =>
    setStack((s) => (s[s.length - 1] === r ? s : [...s, r]));

  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));

  function onlyDigits6(v: string) {
    return v.replace(/\D/g, "").slice(0, 6);
  }

  async function onLogin() {
    if (!canSubmit) return;
    setLoginError(null);
    setLoginErrorKey(null);
    setLoginContacts(undefined);

    const result = await authService.login(empCode, pin);

    if (result.success && result.data) {
      const emp = result.data.employee;
      const prefix = emp.name_prefix ? `${emp.name_prefix}` : "";
      const nextDisplayName =
        `${prefix}${emp.first_name} ${emp.last_name}`.trim() ||
        emp.employee_code;

      localStorage.setItem("emp_code", emp.employee_code);
      localStorage.setItem("display_name", nextDisplayName);
      useStore.setState({ authEmployee: emp });

      setDisplayName(nextDisplayName);
      setPin("");
      reset("home");
    } else {
      setLoginError(result.message || "รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง");
      setLoginErrorKey(result.error || null);
      setLoginContacts(result.contacts);
    }
  }

  async function onRequestPassword(): Promise<{
    success: boolean;
    message: string;
    error?: string;
    contacts?: Array<{ team?: string; email?: string }>;
  }> {
    if (!empValid) {
      return {
        success: false,
        message: "กรุณากรอกรหัสพนักงาน 6 หลักให้ถูกต้อง",
      };
    }
    return await authService.forgotPassword(empCode);
  }

  async function onLogout() {
    const code = localStorage.getItem("emp_code") || empCode;
    if (code) {
      authService.logout(code);
    }
    setPin("");
    setDisplayName("");
    localStorage.removeItem("emp_code");
    localStorage.removeItem("display_name");

    // ✅ Clear employee in Zustand store on logout
    useStore.setState({ authEmployee: null });

    reset("login");
  }

  function goFaceVerify(type: PunchType) {
    setPunchType(type);
    push("faceVerify");
  }

  // ✅ onConfirm = บันทึกอย่างเดียว (ไม่ navigate)
  async function onFaceConfirm(_photoDataUrl: string, type: PunchType) {
    const nowIso = new Date().toISOString();
    if (type === "in") setLastInAt(nowIso);
    else setLastOutAt(nowIso);

    // TODO: เรียก backend จริง (await fetch/axios/google script)
    return;
  }

  // ✅ ให้ FaceVerify เรียกตอนกด OK ใน SuccessModal เพื่อไปหน้า CheckInOut
  function goCheckInOutFromFaceVerify() {
    setStack((s) => {
      const prev = s[s.length - 2];
      if (prev === "checkInOut") return s.slice(0, -1); // pop faceVerify
      return [...s.slice(0, -1), "checkInOut"]; // replace top
    });
  }

  return (
    <Mo
      empCode={empCode}
      displayName={displayName}
      onBackHome={() => reset("home")}
    />
    // <Suspense
    //   fallback={
    //     <div
    //       style={{
    //         display: "flex",
    //         justifyContent: "center",
    //         alignItems: "center",
    //         height: "100vh",
    //       }}
    //     >
    //       กำลังโหลด...
    //     </div>
    //   }
    // >
    //   <>
    //     {route === "login" && (
    //       <>
    //         <Login
    //           empCode={empCode}
    //           pin={pin}
    //           loginError={loginError}
    //           loginErrorKey={loginErrorKey}
    //           loginContacts={loginContacts}
    //           onChangeEmp={(v) => {
    //             setEmpCode(onlyDigits6(v));
    //             setLoginError(null);
    //             setLoginErrorKey(null);
    //             setLoginContacts(undefined);
    //           }}
    //           onChangePin={(v) => {
    //             setPin(onlyDigits6(v));
    //             setLoginError(null);
    //             setLoginErrorKey(null);
    //             setLoginContacts(undefined);
    //           }}
    //           onSubmit={onLogin}
    //           onSendForgot={onRequestPassword}
    //         />

    //         <FirstLoginModal
    //           open={firstLoginOpen}
    //           empCode={empCode}
    //           onClose={() => {
    //             setPin("");
    //             setFirstLoginOpen(false);
    //           }}
    //           onRequestPassword={() => {
    //             onRequestPassword();
    //             setFirstLoginOpen(false);
    //           }}
    //         />
    //       </>
    //     )}

    //     {route === "home" && (
    //       <Home
    //         empCode={empCode}
    //         displayName={displayName}
    //         onLogout={onLogout}
    //         onGoCheckInOut={() => push("checkInOut")}
    //         onGoLeaveOnline={() => alert("TODO: ไปหน้า ลาออนไลน์")}
    //         onGoMo={() => push("mo")}
    //       />
    //     )}

    //     {route === "checkInOut" && (
    //       <CheckInOut
    //         empCode={empCode}
    //         displayName={displayName}
    //         lastInAt={lastInAt}
    //         lastOutAt={lastOutAt}
    //         onBack={back}
    //         onCheckIn={() => goFaceVerify("in")}
    //         onCheckOut={() => goFaceVerify("out")}
    //         onViewHistory={() => alert("TODO: เปิดหน้าประวัติย้อนหลัง 1 เดือน")}
    //       />
    //     )}

    //     {route === "faceVerify" && (
    //       <FaceVerify
    //         empCode={empCode}
    //         displayName={displayName}
    //         punchType={punchType}
    //         onBack={back}
    //         onConfirm={onFaceConfirm} // ✅ save only
    //         onGoCheckInOut={goCheckInOutFromFaceVerify} // ✅ ไปหน้า checkInOut ตอนกด OK
    //         onViewHistory={() => alert("TODO: เปิดหน้าประวัติย้อนหลัง 1 เดือน")}
    //       />
    //     )}
    //     {route === "mo" && (
    //       <Mo
    //         empCode={empCode}
    //         displayName={displayName}
    //         onBackHome={() => reset("home")}
    //       />
    //     )}
    //     {route === "dashboard" && (
    //       <Dashboard empCode={empCode} onLogout={onLogout} />
    //     )}
    //   </>
    // </Suspense>
  );
}
