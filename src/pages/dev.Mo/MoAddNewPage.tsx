import { ArrowLeft } from "lucide-react";
import MoNewForm from "../../components/dev.Mo/MoNewForm";
import styles from "./MoAddNewPage.module.css";

type Props = {
  onCancel: () => void;
};

export default function MoAddNewPage({ onCancel }: Props) {
  return (
    <>
      <div className={styles["mo-back-outer"]}>
        <button
          type="button"
          className={styles["mo-back-btn"]}
          onClick={onCancel}
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      <MoNewForm selectedLocation={undefined} onCancel={onCancel} />
    </>
  );
}
