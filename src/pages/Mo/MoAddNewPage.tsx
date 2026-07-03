import { useState, useEffect, useMemo, useRef } from "react";
import MoNewForm from "../../components/mo/MoNewForm";
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

  // Loading popup with minimum 1.5-second display time
  const [showLoading, setShowLoading] = useState(true);
  const loadingStartRef = useRef(0);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchDoneRef = useRef({ divisions: false, reports: false });
  const MIN_LOADING_MS = 1500;

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

  // Department is fixed to the authenticated employee's department.
  // Using a derived value avoids getting stuck on the initial fallback.
  const selectedDepartment = authEmployee?.department_id ?? 1;

  // List of divisions (เขต) for this department
  const [divisionList, setDivisionList] = useState<
    { id: number; name: string; shortName: string }[]
  >([]);

  // Which division names already have reports submitted today
  const [usedDivisionNames, setUsedDivisionNames] = useState<string[]>([]);

  // Filter out divisions that already have a report submitted today
  const availableDivisions = useMemo(
    () => divisionList.filter((d) => !usedDivisionNames.includes(d.name)),
    [divisionList, usedDivisionNames],
  );

  // Combine departments and their divisions into one dictionary array
  // Only includes divisions that have NOT been reported yet today
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
            divisions: availableDivisions,
          },
        ]
      : [];
  }, [authEmployee, availableDivisions]);

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
        // Use full division names for comparison
        const names = reported.map((r) => r.division_name);
        setUsedDivisionNames(names);
      })
      .finally(() => {
        onFetchDone("reports");
      });
  }, [selectedDepartment, fetchTodayDepartmentReportDivisions]);

  return (
    <>
      <MoLoadingPopup open={showLoading} />

      {!showLoading && (
        <MoNewForm
          selectedLocation={undefined}
          onCancel={onCancel}
          locationOptions={locationOptions}
        />
      )}
      <div className={styles["mo-back-outer"]}>
        <button
          type="button"
          className={styles["mo-back-btn"]}
          onClick={onCancel}
        >
          ย้อนกลับ
        </button>
      </div>
    </>
  );
}
