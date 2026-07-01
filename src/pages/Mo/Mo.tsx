import { useState, useEffect } from "react";
import Header from "../../layout/Header";
import styles from "./Mo.module.css";
import MoHome from "./MoHome";
import { useStore } from "../../store/store";

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

function formatRoundDate(date: Date) {
  const dayName = dayNames[date.getDay()];
  const day = date.getDate();
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear() + 543;
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `รอบ วัน ${dayName} ที่ ${day} ${month} ${year} เวลาขณะนี้ ${hour}:${minute} น.`;
}

export default function Mo({ onBackHome }: Props) {
  const authEmployee = useStore((state) => state.authEmployee);
  const [roundDate, setRoundDate] = useState(formatRoundDate(new Date()));

  useEffect(() => {
    const timer = setInterval(() => {
      setRoundDate(formatRoundDate(new Date()));
    }, 30_000);
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
          <div className={styles["guts-meta-date"]}>{roundDate}</div>
        </div>

        <MoHome onBackHome={onBackHome} />
      </section>
    </div>
  );
}
