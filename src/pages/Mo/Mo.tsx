import { useState, useEffect, useCallback } from "react";
import Header from "../../layout/Header";
import styles from "./Mo.module.css";
import MoHome from "./MoHome";
import { useStore } from "../../store/store";
import { clearAllMoPersistedState } from "./moPersistence";

type Props = {
  onBackHome?: () => void;
};

const dayNames = [
  "อาทิตย์",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
];
const monthNames = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

function formatThaiDate(date: Date) {
  const dayName = dayNames[date.getDay()];
  const day = date.getDate();
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear() + 543;

  return { dayName, day, month, year };
}

function formatRoundDate(date: Date) {
  const roundDate = new Date(date);
  roundDate.setDate(roundDate.getDate() - 1);
  const { dayName, day, month, year } = formatThaiDate(roundDate);

  return `รอบวัน${dayName} ที่ ${day} ${month} ${year}`;
}

function formatTransactionDate(date: Date) {
  const { dayName, day, month, year } = formatThaiDate(date);
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `วันที่ทำรายการ วัน${dayName} ที่ ${day} ${month} ${year} เวลา ${hour}:${minute} น.`;
}

function formatDateMeta(date: Date) {
  return {
    roundDate: formatRoundDate(date),
    transactionDate: formatTransactionDate(date),
  };
}

export default function Mo({ onBackHome }: Props) {
  const authEmployee = useStore((state) => state.authEmployee);
  const [dateMeta, setDateMeta] = useState(formatDateMeta(new Date()));

  // Clear persisted subview when leaving Mo so the next entry starts at main view
  const handleBackHome = useCallback(() => {
    clearAllMoPersistedState();
    onBackHome?.();
  }, [onBackHome]);

  useEffect(() => {
    const timer = setInterval(() => {
      setDateMeta(formatDateMeta(new Date()));
    }, 2_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`guts-home ${styles["mo-page-wrap"]}`}>
      <section className="guts-home-card" aria-label="Mo">
        <Header />

        {/* Title */}
        <h3 className={styles["guts-att-title"]}>
          รายงานประจำวันฝ่ายปฏิบัติการ
        </h3>

        {/* Station + division on one line */}
        <div className={styles["guts-card-meta"]}>
          <div className={styles["guts-meta-station"]}>
            <span>{authEmployee?.department_name ?? "-"}</span>
            {authEmployee?.division_name && (
              <span>{authEmployee.division_name}</span>
            )}
            {authEmployee?.route && <span>{authEmployee.route}</span>}
          </div>
        </div>

        {/* Live round date */}
        <div className={styles["guts-card-meta"]}>
          <div className={styles["guts-meta-date"]}>{dateMeta.roundDate}</div>
          <div className={styles["guts-meta-date"]}>
            {dateMeta.transactionDate}
          </div>
        </div>

        <MoHome onBackHome={handleBackHome} />
      </section>
    </div>
  );
}
