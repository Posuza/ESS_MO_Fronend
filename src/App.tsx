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
const Login = lazy(() => import("./pages/Login"));
const Home = lazy(() => import("./pages/Home"));
import Mo from "./pages/Mo/Mo";
const Dashboard = lazy(() => import("./pages/Dashboard"));

type Route = "login" | "home" | "dashboard" | "mo";
type AuthMode = "ess" | "manual";
type EssState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "manual-login" }
  | { status: "authenticated"; employeeId: string; authMode: AuthMode }
  | { status: "error"; message: string };

function getInitialEssState(): EssState {
  const employee = useStore.getState().authEmployee;
  if (sessionStorage.getItem("auth_mode") === "manual" && employee) {
    return {
      status: "authenticated",
      employeeId: employee.employee_code,
      authMode: "manual",
    };
  }
  return { status: "loading" };
}

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
  const [essState, setEssState] = useState<EssState>(getInitialEssState);
  const hasManualSession =
    essState.status === "authenticated" && essState.authMode === "manual";

  // The SDK is initialized once at the application boundary. The shared
  // promise also protects React Strict Mode from creating two instances.
  useEffect(() => {
    if (hasManualSession) {
      return;
    }

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
        sessionStorage.setItem("auth_mode", "ess");
        useStore.setState({ authEmployee: employee });
        setEssState({
          status: "authenticated",
          employeeId: auth.employeeId,
          authMode: "ess",
        });
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
  }, [hasManualSession]);

  if (essState.status === "manual-login") {
    return (
      <Suspense fallback={<div>กำลังโหลด...</div>}>
        <Login
          onLoginSuccess={(employeeId) => {
            sessionStorage.setItem("auth_mode", "manual");
            setEssState({
              status: "authenticated",
              employeeId,
              authMode: "manual",
            });
          }}
          onEssLogin={() => window.location.reload()}
        />
      </Suspense>
    );
  }

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
  if (essState.status === "error") {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <section
          aria-labelledby="ess-error-title"
          style={{
            width: "min(440px, 100%)",
            padding: 24,
            borderRadius: 16,
            background: "white",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.15)",
            textAlign: "center",
          }}
        >
          <h1 id="ess-error-title" style={{ marginTop: 0, fontSize: 24 }}>
            EssAuth is  unavailable
          </h1>
          <p style={{ overflowWrap: "anywhere" }}>{essState.message}</p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 12,
              marginTop: 20,
            }}
          >
            <button type="button" onClick={() => window.location.reload()}>
              Retry
            </button>
            <button
              type="button"
              onClick={() => setEssState({ status: "manual-login" })}
            >
              Login Mo
            </button>
          </div>
        </section>
      </main>
    );
  }
  return <AuthenticatedApp authMode={essState.authMode} />;
}

function AuthenticatedApp({ authMode }: { authMode: AuthMode }) {

  // ESS is already authenticated before this application shell is mounted.
  const savedRoute = sessionStorage.getItem("app_route");
  const initialRoute: Route =
    savedRoute === "dashboard" || savedRoute === "mo" ? savedRoute : "home";
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
      if (authMode === "ess") {
        void logoutFromEss().finally(() => window.location.reload());
      } else {
        window.location.reload();
      }
      return false;
    }
    return true;
  }, [SESSION_TIMEOUT_MS, authMode]);

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

  async function onLogout() {
    setLogoutStatus("attempt");
    setShowLogoutPopup(true);

    // Record the local audit event before ESS potentially redirects away.
    const code = sessionStorage.getItem("emp_code");
    const p = useStore.getState().logout(code || "");
    logoutPromiseRef.current = p;
    await p;

    try {
      if (authMode === "ess") {
        await logoutFromEss();
      }
      sessionStorage.removeItem("emp_code");
      sessionStorage.removeItem("display_name");
      sessionStorage.removeItem("auth_employee");
      sessionStorage.removeItem("auth_mode");
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

  const onLogoutRetry = () => {
    void onLogout();
  };

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
            onGoLeaveOnline={() => alert("TODO: ไปหน้า ลาออนไลน์")}
            onGoMo={() => push("mo")}
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
