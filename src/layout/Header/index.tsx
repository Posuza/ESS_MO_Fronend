// src/layout/Header/index.tsx
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import styles from "./Header.module.css";
import { useStore } from "@/store/store";
import logoSrc from "@/assets/logo/logoguts.svg";

type Props = {
  empCode?: string;
  displayName?: string;

  /** ซ่อน/แสดงแถบผู้ใช้งาน (default: true) */
  showUserCard?: boolean;
};

export default function Header({
  empCode: _empCode,
  displayName: _displayName,
  showUserCard = true,
}: Props) {
  const authEmployee = useStore((s) => s.authEmployee);
  const empCode = _empCode ?? authEmployee?.employee_code ?? "";
  const displayName =
    _displayName ??
    (authEmployee
      ? `${authEmployee.first_name} ${authEmployee.last_name}`.trim() ||
        authEmployee.employee_code
      : undefined);
  return (
    <header className={styles.header}>
      <div className={styles.logoWrap}>
        <img className={styles.logo} src={logoSrc} alt="GUTS ESS" />
      </div>

      <div className={styles.subEn}>
        <span className={styles.redLetter}>E</span>mployee{" "}
        <span className={styles.redLetter}>S</span>elf{" "}
        <span className={styles.redLetter}>S</span>ervice
      </div>
      <div className={styles.subTh}>ระบบบริการตนเอง</div>

      {showUserCard && (
        <div className={styles.usercard} role="status" aria-label="ผู้ใช้งาน">
          <span className={styles.usercardIcon} aria-hidden="true">
            <FontAwesomeIcon icon={faUser} />
          </span>

          <span className={styles.usercardLabel}>ผู้ใช้งาน:</span>

          <span className={styles.usercardValue}>
            {empCode}
            {displayName ? `-${displayName}` : ""}
          </span>
        </div>
      )}
    </header>
  );
}
