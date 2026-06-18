import { useState, useEffect, useMemo, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import MoNewForm from "../../components/Mo/MoNewForm";
import { useStore } from "../../store/store";
import { getAccessLevel, AccessLevel } from "../../utils/positionAccess";
import { MoLoadingPopup } from "../../components/mo/popup";
import styles from "./MoAddNewPage.module.css";

type Props = {
  onCancel: () => void;
};

export default function MoAddNewPage({ onCancel }: Props) {
  const authEmployee = useStore((s) => s.authEmployee);
  const fetchDivisionsByDepartment = useStore(
    (s) => s.fetchDivisionsByDepartment,
  );
  const fetchTodayDepartmentReportDivisions = useStore(
    (s) => s.fetchTodayDepartmentReportDivisions,
  );

  // Loading popup with minimum 2-second display time
  const [showLoading, setShowLoading] = useState(true);
  const loadingStartRef = useRef(0);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchDoneRef = useRef({ divisions: false, reports: false });
  const MIN_LOADING_MS = 2000;

  // Cleanup timer on unmount
  useEffect(() => {
    loadingStartRef.current = Date.now();

    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    };
  }, []);

  function onFetchDone(type: "divisions" | "reports") {
    fetchDoneRef.current[type] = true;
    if (fetchDoneRef.current.divisions && fetchDoneRef.current.reports) {
      const elapsed = Date.now() - loadingStartRef.current;
      const remaining = MIN_LOADING_MS - elapsed;
      if (remaining > 0) {
        loadingTimerRef.current = setTimeout(() => {
          setShowLoading(false);
        }, remaining);
      } else {
        setShowLoading(false);
      }
    }
  }

  // Department selection
  const [selectedDepartment] = useState<number>(
    authEmployee?.department_id ?? 1,
  );

  // List of divisions (เขต) for this department
  const [divisionList, setDivisionList] = useState<
    { id: number; name: string; shortName: string }[]
  >([]);

  // Which division names already have reports submitted today
  const [usedDivisionNames, setUsedDivisionNames] = useState<string[]>([]);

  // Combine departments and their divisions into one dictionary array
  // key = department, value = list of divisions
  const locationOptions = useMemo(() => {
    const dept = authEmployee?.department_name
      ? {
          id: authEmployee.department_id ?? 1,
          location: authEmployee.department_name,
        }
      : null;

    return dept
      ? [
          {
            department: dept,
            divisions: divisionList,
          },
        ]
      : [];
  }, [authEmployee, divisionList]);

  // Fetch divisions — filtered by position access level
  useEffect(() => {
    if (!selectedDepartment) return;
    fetchDivisionsByDepartment(selectedDepartment)
      .then((divs) => {
        let opts = divs.map((d) => {
          const m = d.division_name.match(/เขต\s+[\d.]+/);
          return {
            id: d.division_id,
            name: d.division_name,
            shortName: m ? m[0] : d.division_name,
          };
        });

        // Filter by position: managers see all, others see only their division
        const level = getAccessLevel(authEmployee?.position_id);
        if (level !== AccessLevel.ALL_DEPT) {
          const empDivId = (authEmployee as { division_id?: number })
            ?.division_id;
          if (empDivId != null) {
            opts = opts.filter((d) => d.id === empDivId);
          }
        }

        setDivisionList(opts);
      })
      .finally(() => {
        onFetchDone("divisions");
      });
  }, [selectedDepartment, fetchDivisionsByDepartment, authEmployee]);

  // Fetch today's already-reported divisions for this department
  useEffect(() => {
    if (!selectedDepartment) return;
    fetchTodayDepartmentReportDivisions(selectedDepartment)
      .then((reported) => {
        // Extract short names (e.g. "เขต 1.1") for usedSubLocations
        const names = reported.map((r) => {
          const m = r.division_name.match(/เขต\s+[\d.]+/);
          return m ? m[0] : r.division_name;
        });
        setUsedDivisionNames(names);
      })
      .finally(() => {
        onFetchDone("reports");
      });
  }, [selectedDepartment, fetchTodayDepartmentReportDivisions]);

  return (
    <>
      <MoLoadingPopup open={showLoading} />

      <div className={styles["mo-back-outer"]}>
        <button
          type="button"
          className={styles["mo-back-btn"]}
          onClick={onCancel}
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      {!showLoading && (
        <MoNewForm
          selectedLocation={undefined}
          onCancel={onCancel}
          locationOptions={locationOptions}
          usedSubLocations={usedDivisionNames}
        />
      )}
    </>
  );
}
