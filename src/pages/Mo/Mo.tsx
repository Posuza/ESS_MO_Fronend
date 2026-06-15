import { useState, useEffect } from "react";
import Header from "../../layout/Header";
import styles from "./Mo.module.css";
import MoHome from "./MoHome";

type Props = {
  onBackHome?: () => void;
};

export default function Mo({ onBackHome }: Props) {
  const now = new Date();
  const thaiDay = now.getDate();
  const thaiMonth = new Intl.DateTimeFormat("th-TH", { month: "long" }).format(
    now,
  );
  const thaiYear = new Intl.DateTimeFormat("th-TH", { year: "numeric" }).format(
    now,
  );
  const longThaiDate = `วันที่ ${thaiDay} เดือน ${thaiMonth} ${thaiYear}`;

  const [timeNow, setTimeNow] = useState(
    now.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const t = new Date();
      setTimeNow(
        t.toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`guts-home ${styles["mo-page-wrap"]}`}>
      <section className="guts-home-card" aria-label="Mo">
        <Header />

        <div className={styles["guts-card-meta"]}>
          <div className={styles["guts-meta-year"]}>{longThaiDate}</div>
          <div className={styles["guts-meta-date"]}>เวลา {timeNow} น.</div>
        </div>

        <h3 className={styles["guts-att-title"]}>
          รายงานประจำวันฝ่ายปฏิบัติการ
        </h3>
        <MoHome onBackHome={onBackHome} />
      </section>
    </div>
  );
}
