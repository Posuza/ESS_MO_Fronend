import { createContext, useContext } from "react";
import logoGuts from "../../../../assets/logo/logo_guts.png";
import styles from "./PdfPageLayout.module.css";
import { formatDate } from "./formatDate";

export { formatDate };

// ─── Total-pages context ─────────────────────────────────────
// Provides the total page count to PdfPageFooter without prop-drilling.
export const TotalPagesContext = createContext<number>(0);

// ─── Page Header ─────────────────────────────────────────────
export function PdfPageHeader({
  sectorName,
  title,
  data,
  subLocation,
}: {
  pageNo?: number;
  sectorName: string;
  title: string;
  data: any;
  subLocation?: string;
}) {
  const formattedSectorName = sectorName
    ? sectorName.replace(/([ก-๙0-9]+)\s+([A-Za-z]+)/, "$1 | $2")
    : "-";

  return (
    <>
      <div className={styles.pdfHeaderRow}>
        <div className={styles.logoSection}>
          <img src={logoGuts} alt="GUTS ESS" style={{ height: 60 }} />
        </div>
      </div>
      <div className={styles.pdfTitleBar}>{title}</div>
      <div className={styles.pdfMetaRow}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className={styles.metaLocation}>
            <span>
              {formattedSectorName} {subLocation ? ` | ${subLocation}` : ""}
            </span>
          </div>
        </div>
        <div className={styles.metaDate}>{formatDate(data)}</div>
      </div>
    </>
  );
}

// ─── Page Footer ─────────────────────────────────────────────
export function PdfPageFooter({
  pageNo,
  totalPages: overrideTotal,
}: {
  pageNo: number;
  totalPages?: number;
}) {
  const contextTotal = useContext(TotalPagesContext);
  const total = overrideTotal || contextTotal;
  return (
    <div className={styles.pdfFooter}>
      {total > 0 ? `${pageNo} / ${total}` : pageNo}
    </div>
  );
}
