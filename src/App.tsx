// src/App.tsx
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useStore } from "./store/store";
import { authService, type EssEmployeeProfile } from "./services/auth.Service";
import {
  getEssAuth,
  loginWithEss,
  logoutFromEss,
} from "./services/ess-auth";
import type { AuthEmployee } from "./store/Slice/auth";
import LogoutPopUp, {
  type LogoutStatus,
} from "./components/auth/popup/LogoutPopUp";
// Legacy password login is preserved in ./pages/Login but ESS now owns the
// complete login/logout flow, so the component is intentionally not mounted.
// const Login = lazy(() => import("./pages/Login"));
const Home = lazy(() => import("./pages/Home"));
import Mo from "./pages/Mo/Mo";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CheckInOut = lazy(() => import("./pages/Attendance/CheckInOut"));
const FaceVerify = lazy(() => import("./pages/Attendance/FaceVerify"));

type Route =
  | "login"
  | "home"
  | "dashboard"
  | "checkInOut"
  | "faceVerify"
  | "mo";
type PunchType = "in" | "out";
type EssState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; employeeId: string }
  | { status: "error"; message: string };

function toAuthEmployee(profile: EssEmployeeProfile): AuthEmployee {
  return {
    employee_code: profile.employee_code,
    email: profile.email,
    first_name: profile.first_name,
    last_name: profile.last_name,
    role_name: profile.role_name,
    name_prefix: profile.name_prefix,
    field_id: profile.field_id,
    field_name: profile.field_name,
    position_id: profile.position_id,
    position_name: profile.position_name,
    department_id: profile.department_id,
    department_name: profile.department_name,
    division_id: profile.division_id,
    division_name: profile.division_name,
    route: profile.route_name,
  };
}

export default function App() {
  const [essState, setEssState] = useState<EssState>({ status: "loading" });

  // The SDK is initialized once at the application boundary. The shared
  // promise also protects React Strict Mode from creating two instances.
  useEffect(() => {
    let active = true;

    getEssAuth()
      .then(async (auth) => {
        if (!active) return;
        if (auth.error) {
          setEssState({ status: "error", message: auth.error.message });
          return;
        }
        if (!auth.employeeId) {
          setEssState({ status: "anonymous" });
          // Start ESS login immediately on the first unauthenticated load.
          // ESS will return to the current URL after the callback.
          void loginWithEss().catch((error: unknown) => {
            if (active) {
              setEssState({
                status: "error",
                message:
                  error instanceof Error ? error.message : "ESS unavailable",
              });
            }
          });
          return;
        }

        const result = await authService.getEssEmployeeProfile(auth.employeeId);
        if (!active) return;
        if (!result.success || !result.employee) {
          setEssState({
            status: "error",
            message: result.message || "ไม่พบข้อมูลพนักงาน",
          });
          return;
        }

        const employee = toAuthEmployee(result.employee);
        const displayName =
          `${employee.first_name} ${employee.last_name}`.trim() ||
          employee.employee_code;
        sessionStorage.setItem("emp_code", employee.employee_code);
        sessionStorage.setItem("display_name", displayName);
        sessionStorage.setItem("auth_employee", JSON.stringify(employee));
        sessionStorage.setItem("login_time", String(Date.now()));
        useStore.setState({ authEmployee: employee });
        setEssState({ status: "authenticated", employeeId: auth.employeeId });
      })
      .catch((error: unknown) => {
        if (active) {
          setEssState({
            status: "error",
            message: error instanceof Error ? error.message : "ESS unavailable",
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (essState.status === "loading" || essState.status === "anonymous") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        กำลังเชื่อมต่อ ESS...
      </div>
    );
  }
  if (essState.status === "error") return <p>ESS unavailable: {essState.message}</p>;
  return <AuthenticatedApp />;
}

function AuthenticatedApp() {

  // ESS is already authenticated before this application shell is mounted.
  const savedRoute = sessionStorage.getItem("app_route") as Route | null;
  const initialRoute: Route =
    savedRoute && savedRoute !== "login" ? savedRoute : "home";
  const [stack, setStack] = useState<Route[]>([initialRoute]);
  const route = stack[stack.length - 1];

  // Persist current route to sessionStorage so refresh keeps the same page
  useEffect(() => {
    if (route !== "login") {
      sessionStorage.setItem("app_route", route);
    }
  }, [route]);

  // ── Session timeout: 1 minute (for testing) ────────────────────────────
  // const SESSION_TIMEOUT_MS = 1 * 60 * 1000; // 1 minute
  const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

  const checkSession = useCallback(() => {
    const loginTime = sessionStorage.getItem("login_time");
    if (loginTime && Date.now() - Number(loginTime) > SESSION_TIMEOUT_MS) {
      sessionStorage.clear();
      useStore.setState({ authEmployee: null });
      void logoutFromEss().finally(() => window.location.reload());
      return false;
    }
    return true;
  }, [SESSION_TIMEOUT_MS]);

  // Check session on mount and on every route change
  useEffect(() => {
    checkSession();
  }, [route, checkSession]);

  // Extend session on user interaction (click, keydown, scroll)
  // — resets the 2-hour timer so active users don't get kicked out
  useEffect(() => {
    const handleActivity = () => {
      if (!checkSession()) return;
      sessionStorage.setItem("login_time", String(Date.now()));
    };
    window.addEventListener("click", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("scroll", handleActivity);
    return () => {
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
    };
  }, [checkSession]);

  const [lastInAt, setLastInAt] = useState<string | null>(null);
  const [lastOutAt, setLastOutAt] = useState<string | null>(null);

  const [punchType, setPunchType] = useState<PunchType>("in");

  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [logoutStatus, setLogoutStatus] = useState<LogoutStatus>("attempt");
  const logoutPromiseRef = useRef<Promise<boolean> | null>(null);

  // ===== Navigation helpers =====
  const reset = (r: Route) => {
    setStack([r]);
    if (r === "login") sessionStorage.removeItem("app_route");
  };

  const push = (r: Route) =>
    setStack((s) => (s[s.length - 1] === r ? s : [...s, r]));

  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));

  async function onLogout() {
    setLogoutStatus("attempt");
    setShowLogoutPopup(true);

    // Record the local audit event before ESS potentially redirects away.
    const code = sessionStorage.getItem("emp_code");
    const p = useStore.getState().logout(code || "");
    logoutPromiseRef.current = p;
    await p;

    try {
      await logoutFromEss();
      sessionStorage.removeItem("emp_code");
      sessionStorage.removeItem("display_name");
      sessionStorage.removeItem("auth_employee");
      sessionStorage.removeItem("app_route");
      useStore.setState({ authEmployee: null });
      // Small delay so user sees the attempt state briefly
      setTimeout(() => setLogoutStatus("success"), 600);
    } catch {
      setLogoutStatus("fail");
    }
  }

  const onLogoutPopupClose = useCallback(() => {
    setShowLogoutPopup(false);
    window.location.reload();
  }, []);

  const onLogoutRetry = useCallback(() => {
    void onLogout();
  }, []);

  function goFaceVerify(type: PunchType) {
    setPunchType(type);
    push("faceVerify");
  }

  // onConfirm = บันทึกอย่างเดียว (ไม่ navigate)
  async function onFaceConfirm(_photoDataUrl: string, type: PunchType) {
    const nowIso = new Date().toISOString();
    if (type === "in") setLastInAt(nowIso);
    else setLastOutAt(nowIso);

    // TODO: เรียก backend จริง (await fetch/axios/google script)
    return;
  }

  // ให้ FaceVerify เรียกตอนกด OK ใน SuccessModal เพื่อไปหน้า CheckInOut
  function goCheckInOutFromFaceVerify() {
    setStack((s) => {
      const prev = s[s.length - 2];
      if (prev === "checkInOut") return s.slice(0, -1); // pop faceVerify
      return [...s.slice(0, -1), "checkInOut"]; // replace top
    });
  }

  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          กำลังโหลด...
        </div>
      }
    >
      <>
        {/* Legacy password login is intentionally not rendered. */}

        {route === "home" && (
          <Home
            onLogout={onLogout}
            onGoCheckInOut={() => push("checkInOut")}
            onGoLeaveOnline={() => alert("TODO: ไปหน้า ลาออนไลน์")}
            onGoMo={() => push("mo")}
          />
        )}

        {route === "checkInOut" && (
          <CheckInOut
            lastInAt={lastInAt}
            lastOutAt={lastOutAt}
            onBack={back}
            onCheckIn={() => goFaceVerify("in")}
            onCheckOut={() => goFaceVerify("out")}
            onViewHistory={() => alert("TODO: เปิดหน้าประวัติย้อนหลัง 1 เดือน")}
          />
        )}

        {route === "faceVerify" && (
          <FaceVerify
            punchType={punchType}
            onBack={back}
            onConfirm={onFaceConfirm}
            onGoCheckInOut={goCheckInOutFromFaceVerify}
            onViewHistory={() => alert("TODO: เปิดหน้าประวัติย้อนหลัง 1 เดือน")}
          />
        )}
        {route === "mo" && <Mo onBackHome={() => reset("home")} />}
        {route === "dashboard" && <Dashboard onLogout={onLogout} />}

        {/* Logout popup overlay */}
        <LogoutPopUp
          open={showLogoutPopup}
          status={logoutStatus}
          onClose={onLogoutPopupClose}
          onRetry={onLogoutRetry}
        />
      </>
    </Suspense>
  );
}
