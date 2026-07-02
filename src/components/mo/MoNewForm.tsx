import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, MapPin, PlusIcon, X } from "lucide-react";
import styles from "./MoNewForm.module.css";
import { useStore } from "../../store/store";
import { ConfirmCancelDialog, InfoModel, MoLoadingPopup } from "./popup";

export type EmployeeLocation = {
  id: number;
  location: string;
};

type DivisionOption = {
  id: number;
  name: string;
  shortName: string;
};

export type LocationOption = {
  department: EmployeeLocation;
  divisions: DivisionOption[];
};

// Define the form data type for persistence
type FormData = {
  selectedDepartment: number;
  selectedSubLocation: string;
  // Group 1 - Personnel
  dept_guard_post_count: string;
  dept_current_personnel_count: string;
  dept_missing_regular_count: string;
  dept_missing_personnel_count: string;
  dept_supplement_count: string;
  dept_recruitment_count: string;
  dept_reserve_units_count: string;
  dept_reserve_personnel_count: string;
  // Group 2 - Leave
  leave_personal_count: string;
  leave_sick_count: string;
  leave_absent_count: string;
  leave_deserted_count: string;
  leave_resigned_count: string;
  leave_terminated_count: string;
  // Group 3 - Shift
  shift_18_count: string;
  shift_24_count: string;
  shift_36_count: string;
  // Group 4 - Training
  training_shift_change_count: string;
  training_planned_count: string;
  training_duty_control_count: string;
  // Discipline items
  discipline_phone_count: string;
  discipline_belt_count: string;
  discipline_badge_count: string;
  discipline_uniform_count: string;
  // Dynamic group 2 items
  dynamicGroup2: Array<{
    key: string;
    label: string;
    value: string;
    isActive: boolean;
  }>;
  // Dynamic group 3 items
  dynamicGroup3: Array<{
    label: string;
    detail: string;
    status: string;
    note: string;
  }>;
};

type Props = {
  onCancel?: () => void;
  selectedLocation?: string;
  locationOptions?: LocationOption[];
  usedSubLocations?: string[];
};

export default function MoNewForm(props: Props) {
  const { createReport, authEmployee, fetchDistinctDisciplineTypes } =
    useStore();

  // Generate unique key for form data persistence based on employee code
  const formPersistenceKey = `moNewForm_${authEmployee?.employee_code || "anonymous"}`;

  // Fetch all distinct discipline types (key + label only) from the data
  const [distinctDisciplineTypes, setDistinctDisciplineTypes] = useState<
    { key: string; label: string }[]
  >([]);
  useEffect(() => {
    fetchDistinctDisciplineTypes().then((types) => {
      console.log(
        "[MoNewForm] Distinct discipline types (key + label):",
        types,
      );
      setDistinctDisciplineTypes(types);
    });
  }, [fetchDistinctDisciplineTypes]);

  // Props-injected data
  const { locationOptions = [], usedSubLocations = [] } = props;

  // Derive locations from the dictionary array
  const locations = locationOptions.map((o) => o.department);

  // Check if we have saved form data in localStorage
  const [savedFormData, setSavedFormData] = useState<FormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved form data from localStorage
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(formPersistenceKey);
      if (savedData) {
        const parsedData = JSON.parse(savedData) as FormData;
        setSavedFormData(parsedData);
      }
    } catch (error) {
      console.error("Failed to load form data from localStorage", error);
    }
    setIsLoading(false);
  }, [formPersistenceKey]);

  // Initialize selectedDepartment from saved data or defaults
  const [selectedDepartment, setSelectedDepartment] = useState<number>(() => {
    if (savedFormData?.selectedDepartment)
      return savedFormData.selectedDepartment;
    return authEmployee?.department_id ?? locations[0]?.id ?? 1;
  });

  // Derive divisionOptions for the currently selected department
  const currentLocation = locationOptions.find(
    (o) => o.department.id === selectedDepartment,
  );
  const divisionOptions = currentLocation?.divisions ?? [];

  // Initialize selectedSubLocation from saved data or defaults
  const [selectedSubLocation, setSelectedSubLocation] = useState<string>(() => {
    if (savedFormData?.selectedSubLocation)
      return savedFormData.selectedSubLocation;
    return "";
  });

  const availableSubSectorOptions = divisionOptions.filter(
    (d) => !usedSubLocations.includes(d.shortName),
  );

  useEffect(() => {
    if (availableSubSectorOptions.length > 0 && !selectedSubLocation) {
      setSelectedSubLocation(availableSubSectorOptions[0].shortName);
    }
  }, [availableSubSectorOptions, selectedSubLocation]);

  // confirmation dialog state
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFail, setShowFail] = useState(false);
  const [failMessage, setFailMessage] = useState("");

  // Submission loading popup with minimum 2-second display time
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitStartRef = useRef(0);
  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MIN_SUBMIT_MS = 2000;

  useEffect(() => {
    return () => {
      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    };
  }, []);

  // status options for group3 rows (cycle on click)
  const statusOptions = [
    { label: "ปกติ", key: "normal" },
    { label: "ผิดปกติ", key: "warning" },
    { label: "ฉุกเฉิน", key: "danger" },
  ];

  // status state per-row (initialized after groups mount)
  const [rowStatus, setRowStatus] = useState<Record<string, number>>({});
  // dynamicGroup3 must exist before this effect runs, declare it here (hydrated later)
  const [dynamicGroup3, setDynamicGroup3] = useState(() => {
    if (savedFormData?.dynamicGroup3) {
      return [
        {
          key: "meeting",
          title: "เข้าพบผู้ว่าจ้าง",
          items: savedFormData.dynamicGroup3,
        },
      ];
    }
    return [
      {
        key: "meeting",
        title: "เข้าพบผู้ว่าจ้าง",
        items: [],
      },
    ];
  });

  useEffect(() => {
    const init: Record<string, number> = {};
    // initialize only for group3 items (index-based)
    dynamicGroup3.forEach((g) => {
      g.items.forEach((it, i) => {
        const idx = statusOptions.findIndex(
          (s) => s.key === (it as any).status,
        );
        init[String(i)] = idx >= 0 ? idx : 0;
      });
    });
    setRowStatus(init);
  }, [dynamicGroup3]);

  // Initialize dynamicGroup2 from saved data or defaults
  const [dynamicGroup2, setDynamicGroup2] = useState(() => {
    if (savedFormData?.dynamicGroup2) {
      return [
        {
          key: "discipline",
          title: "วินัยและการลงโทษ",
          items: savedFormData.dynamicGroup2,
        },
      ];
    }

    return [
      {
        key: "discipline",
        title: "วินัยและการลงโทษ",
        items: [
          {
            key: "discipline_phone_count",
            label: "เล่นโทรศัพท์มือถือ :",
            unit: "คน",
            value: "0",
            isActive: false,
          },
          {
            key: "discipline_belt_count",
            label: "ไม่มีเข็มขัด :",
            unit: "คน",
            value: "0",
            isActive: false,
          },
          {
            key: "discipline_badge_count",
            label: "ไม่แขวนบัตร :",
            unit: "คน",
            value: "0",
            isActive: false,
          },
          {
            key: "discipline_uniform_count",
            label: "ชุดชำรุดเก่า :",
            unit: "คน",
            value: "0",
            isActive: false,
          },
        ],
      },
    ];
  });

  const cycleStatus = (idx: number) => {
    setDynamicGroup3((prev) =>
      prev.map((g) => ({
        ...g,
        items: g.items.map((item, i) => {
          if (i !== idx) return item;
          const currentIdx = statusOptions.findIndex(
            (s) => s.key === item.status,
          );
          const nextIdx = (currentIdx + 1) % statusOptions.length;
          return { ...item, status: statusOptions[nextIdx].key };
        }),
      })),
    );
  };

  // grouped rows config under the main personnel header
  const group1 = [
    {
      key: "dept",
      title: "หน่วยงานที่รับผิดชอบ",
      items: [
        {
          key: "dept_guard_post_count",
          label: "จุดรักษาการณ์ :",
          unit: "หน่วยงาน",
          value: "0",
        },
        {
          key: "dept_current_personnel_count",
          label: "กำลังพลปัจจุบัน :",
          unit: "คน",
          value: "0",
        },
        {
          key: "dept_missing_regular_count",
          label: "ขาดตัวประจำ :",
          unit: "หน่วยงาน",
          value: "0",
        },
        {
          key: "dept_missing_personnel_count",
          label: "ขาดกำลังพล :",
          unit: "คน",
          value: "0",
        },
        {
          key: "dept_supplement_count",
          label: "จัดกำลังพลเสริมพิเศษ :",
          unit: "คน",
          value: "0",
        },
        {
          key: "dept_recruitment_count",
          label: "สรรหาผู้สมัครงานใหม่ :",
          unit: "คน",
          value: "0",
        },
        {
          key: "dept_reserve_units_count",
          label: "จำนวนหน่วยงานสำรองเวร :",
          unit: "หน่วย",
          value: "0",
        },
        {
          key: "dept_reserve_personnel_count",
          label: "จำนวนกำลังพลสำรองเวร :",
          unit: "นาย",
          value: "0",
        },
      ],
    },
    {
      key: "leave",
      title: "การลา",
      items: [
        {
          key: "leave_personal_count",
          label: "ลากิจ :",
          unit: "คน",
          value: "0",
        },
        { key: "leave_sick_count", label: "ลาป่วย :", unit: "คน", value: "0" },
        {
          key: "leave_absent_count",
          label: "ขาดงาน :",
          unit: "คน",
          value: "0",
        },
        {
          key: "leave_deserted_count",
          label: "หนีหาย :",
          unit: "คน",
          value: "0",
        },
        {
          key: "leave_resigned_count",
          label: "ลาออก :",
          unit: "คน",
          value: "0",
        },
        {
          key: "leave_terminated_count",
          label: "ไล่ออก :",
          unit: "คน",
          value: "0",
        },
      ],
    },
    {
      key: "shift",
      title: "การบริหารการควงเวร",
      items: [
        {
          key: "shift_18_count",
          label: "18 ชั่วโมง :",
          unit: "คน",
          value: "0",
        },
        {
          key: "shift_24_count",
          label: "24 ชั่วโมง :",
          unit: "คน",
          value: "0",
        },
        {
          key: "shift_36_count",
          label: "36 ชั่วโมง :",
          unit: "คน",
          value: "0",
        },
      ],
    },
    {
      key: "training",
      title: "อบรมและควบคุมหน้าที่งาน",
      items: [
        {
          key: "training_shift_change_count",
          label: "อบรมเปลี่ยนผลัด :",
          unit: "หน่วยงาน",
          value: "0",
        },
        {
          key: "training_planned_count",
          label: "อบรมตามแผนงานที่กำหนด :",
          unit: "หน่วยงาน",
          value: "0",
        },
        {
          key: "training_duty_control_count",
          label: "ควบคุมหน้าที่งาน :",
          unit: "หน่วยงาน",
          value: "0",
        },
      ],
    },
  ];

  // Initialize group1 counts from saved data or defaults
  const [counts, setCounts] = useState<Record<string, string>>(() => {
    if (savedFormData) {
      return {
        dept_guard_post_count: savedFormData.dept_guard_post_count || "0",
        dept_current_personnel_count:
          savedFormData.dept_current_personnel_count || "0",
        dept_missing_regular_count:
          savedFormData.dept_missing_regular_count || "0",
        dept_missing_personnel_count:
          savedFormData.dept_missing_personnel_count || "0",
        dept_supplement_count: savedFormData.dept_supplement_count || "0",
        dept_recruitment_count: savedFormData.dept_recruitment_count || "0",
        dept_reserve_units_count: savedFormData.dept_reserve_units_count || "0",
        dept_reserve_personnel_count:
          savedFormData.dept_reserve_personnel_count || "0",
        leave_personal_count: savedFormData.leave_personal_count || "0",
        leave_sick_count: savedFormData.leave_sick_count || "0",
        leave_absent_count: savedFormData.leave_absent_count || "0",
        leave_deserted_count: savedFormData.leave_deserted_count || "0",
        leave_resigned_count: savedFormData.leave_resigned_count || "0",
        leave_terminated_count: savedFormData.leave_terminated_count || "0",
        shift_18_count: savedFormData.shift_18_count || "0",
        shift_24_count: savedFormData.shift_24_count || "0",
        shift_36_count: savedFormData.shift_36_count || "0",
        training_shift_change_count:
          savedFormData.training_shift_change_count || "0",
        training_planned_count: savedFormData.training_planned_count || "0",
        training_duty_control_count:
          savedFormData.training_duty_control_count || "0",
        discipline_phone_count: savedFormData.discipline_phone_count || "0",
        discipline_belt_count: savedFormData.discipline_belt_count || "0",
        discipline_badge_count: savedFormData.discipline_badge_count || "0",
        discipline_uniform_count: savedFormData.discipline_uniform_count || "0",
      };
    }

    // Default initialization
    const initialCounts: Record<string, string> = {};
    [...group1, ...dynamicGroup2].forEach((g) =>
      g.items.forEach((it) => {
        initialCounts[it.key] = (it as any).value ?? "0";
      }),
    );
    return initialCounts;
  });

  const group2 = [
    {
      key: "discipline",
      title: "วินัยและการลงโทษ",
      items: [
        {
          key: "discipline_phone_count",
          label: "เล่นโทรศัพท์มือถือ :",
          unit: "คน",
          value: "0",
          isActive: false,
        },
        {
          key: "discipline_belt_count",
          label: "ไม่มีเข็มขัด :",
          unit: "คน",
          value: "0",
          isActive: false,
        },
        {
          key: "discipline_badge_count",
          label: "ไม่แขวนบัตร :",
          unit: "คน",
          value: "0",
          isActive: false,
        },
        {
          key: "discipline_uniform_count",
          label: "ชุดชำรุดเก่า :",
          unit: "คน",
          value: "0",
          isActive: false,
        },
      ],
    },
  ];

  // Save form data to localStorage whenever any form field changes
  useEffect(() => {
    if (isLoading) return;

    const formData: FormData = {
      selectedDepartment,
      selectedSubLocation,
      dept_guard_post_count: counts.dept_guard_post_count || "0",
      dept_current_personnel_count: counts.dept_current_personnel_count || "0",
      dept_missing_regular_count: counts.dept_missing_regular_count || "0",
      dept_missing_personnel_count: counts.dept_missing_personnel_count || "0",
      dept_supplement_count: counts.dept_supplement_count || "0",
      dept_recruitment_count: counts.dept_recruitment_count || "0",
      dept_reserve_units_count: counts.dept_reserve_units_count || "0",
      dept_reserve_personnel_count: counts.dept_reserve_personnel_count || "0",
      leave_personal_count: counts.leave_personal_count || "0",
      leave_sick_count: counts.leave_sick_count || "0",
      leave_absent_count: counts.leave_absent_count || "0",
      leave_deserted_count: counts.leave_deserted_count || "0",
      leave_resigned_count: counts.leave_resigned_count || "0",
      leave_terminated_count: counts.leave_terminated_count || "0",
      shift_18_count: counts.shift_18_count || "0",
      shift_24_count: counts.shift_24_count || "0",
      shift_36_count: counts.shift_36_count || "0",
      training_shift_change_count: counts.training_shift_change_count || "0",
      training_planned_count: counts.training_planned_count || "0",
      training_duty_control_count: counts.training_duty_control_count || "0",
      discipline_phone_count: counts.discipline_phone_count || "0",
      discipline_belt_count: counts.discipline_belt_count || "0",
      discipline_badge_count: counts.discipline_badge_count || "0",
      discipline_uniform_count: counts.discipline_uniform_count || "0",
      dynamicGroup2: dynamicGroup2.flatMap((g) => g.items),
      dynamicGroup3: dynamicGroup3.flatMap((g) => g.items),
    };

    try {
      localStorage.setItem(formPersistenceKey, JSON.stringify(formData));
    } catch (error) {
      console.error("Failed to save form data to localStorage", error);
    }
  }, [
    selectedDepartment,
    selectedSubLocation,
    counts.dept_guard_post_count,
    counts.dept_current_personnel_count,
    counts.dept_missing_regular_count,
    counts.dept_missing_personnel_count,
    counts.dept_supplement_count,
    counts.dept_recruitment_count,
    counts.dept_reserve_units_count,
    counts.dept_reserve_personnel_count,
    counts.leave_personal_count,
    counts.leave_sick_count,
    counts.leave_absent_count,
    counts.leave_deserted_count,
    counts.leave_resigned_count,
    counts.leave_terminated_count,
    counts.shift_18_count,
    counts.shift_24_count,
    counts.shift_36_count,
    counts.training_shift_change_count,
    counts.training_planned_count,
    counts.training_duty_control_count,
    counts.discipline_phone_count,
    counts.discipline_belt_count,
    counts.discipline_badge_count,
    counts.discipline_uniform_count,
    dynamicGroup2,
    dynamicGroup3,
    formPersistenceKey,
    isLoading,
  ]);

  // Function to clear form data from localStorage when form is successfully submitted
  const clearFormData = () => {
    localStorage.removeItem(formPersistenceKey);
  };

  // modal state for adding a row into group2 (discipline)
  const [showAddGroup2, setShowAddGroup2] = useState(false);
  const [newGroup2Label, setNewGroup2Label] = useState("");
  const [newGroup2Unit, setNewGroup2Unit] = useState("คน");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isOtherMode, setIsOtherMode] = useState(false);

  const openAddGroup2 = () => {
    setNewGroup2Label("");
    setNewGroup2Unit("คน");
    setCheckedItems(new Set());
    setIsOtherMode(false);
    setShowAddGroup2(true);
  };

  const addItemToGroup2 = (initialValue?: string) => {
    // temporary key — backend will replace "auto_gen" with discipline_custom_{N} on submit
    const g = dynamicGroup2.find((x) => x.key === "discipline");
    const autoGenCount = g
      ? g.items.filter((it) => String(it.key).startsWith("auto_gen")).length
      : 0;
    const newKey = `auto_gen_${autoGenCount + 1}`;
    const newItem = {
      key: newKey,
      label: newGroup2Label || "รายการใหม่",
      unit: newGroup2Unit || "คน",
      value: initialValue || "0",
      isActive: true,
    };

    setDynamicGroup2((prev) =>
      prev.map((pg) =>
        pg.key === "discipline" ? { ...pg, items: [...pg.items, newItem] } : pg,
      ),
    );

    // initialize count for the new item using the provided value or any currently edited value
    setCounts((prev) => ({
      ...prev,
      [newKey]: initialValue || editingRaw || "0",
    }));

    setShowAddGroup2(false);
  };

  const handleDeactivate = (key: string) => {
    setDynamicGroup2((prev) =>
      prev.map((pg) => ({
        ...pg,
        items: pg.items.map((item) =>
          item.key === key ? { ...item, isActive: false } : item,
        ),
      })),
    );
    // also reset the count so hasAnyData() re-evaluates correctly
    setCounts((prev) => ({ ...prev, [key]: "0" }));
  };

  const handleSaveModal = () => {
    if (checkedItems.size === 0) {
      setEditingKey(null);
      if (newGroup2Label.trim() !== "") {
        const otherCount =
          editingKey === "__other__"
            ? editingRaw
            : (counts["__other__"] ?? "0");
        addItemToGroup2(otherCount);
        setEditingRaw("");
        setCounts((prev) => {
          const next = { ...prev };
          delete next["__other__"];
          return next;
        });
      } else {
        setShowAddGroup2(false);
      }
      return;
    }

    const selectedKey = checkedItems.values().next().value as string;

    setDynamicGroup2((prev) => {
      const discGroup = prev.find((g) => g.key === "discipline");
      if (!discGroup) return prev;

      const exists = discGroup.items.some((it) => it.key === selectedKey);

      return prev.map((pg) => {
        if (pg.key !== "discipline") return pg;

        let items = pg.items;

        // Add item from API if it doesn't exist yet
        if (!exists) {
          const disc = distinctDisciplineTypes.find(
            (d) => d.key === selectedKey,
          );
          items = [
            ...items,
            {
              key: selectedKey,
              label: disc?.label ?? "รายการใหม่",
              unit: "คน",
              value: "0",
              isActive: false,
            },
          ];
        }

        // Activate the checked item if value > 0
        items = items.map((item) => {
          if (item.key !== selectedKey) return item;
          const val =
            editingKey === item.key ? editingRaw : (counts[item.key] ?? "0");
          return Number(val) > 0 ? { ...item, isActive: true } : item;
        });

        return { ...pg, items };
      });
    });

    setEditingKey(null);
    setShowAddGroup2(false);
  };

  // modal state for adding a row into group3
  const [showAddGroup3, setShowAddGroup3] = useState(false);
  const [newGroup3Label, setNewGroup3Label] = useState("");
  const [newGroup3Detail, setNewGroup3Detail] = useState("");
  const [newGroup3Status, setNewGroup3Status] = useState("normal");
  const [newGroup3Note, setNewGroup3Note] = useState("");
  const [editingGroup3Index, setEditingGroup3Index] = useState<number | null>(
    null,
  );

  const closeGroup3Modal = () => {
    setShowAddGroup3(false);
    setEditingGroup3Index(null);
    setNewGroup3Label("");
    setNewGroup3Detail("");
    setNewGroup3Status("normal");
    setNewGroup3Note("");
  };

  const openAddGroup3 = () => {
    setEditingGroup3Index(null);
    setNewGroup3Label("");
    setNewGroup3Detail("");
    setNewGroup3Status("normal");
    setNewGroup3Note("");
    setShowAddGroup3(true);
  };

  const handleRemoveGroup3Item = (groupKey: string, itemIdx: number) => {
    setDynamicGroup3((prev) =>
      prev.map((pg) =>
        pg.key === groupKey
          ? { ...pg, items: pg.items.filter((_, i) => i !== itemIdx) }
          : pg,
      ),
    );
  };

  const handleOpenRow = (idx: number) => {
    const meetingGroup = dynamicGroup3.find((g) => g.key === "meeting");
    const item = meetingGroup?.items[idx];
    if (!item) return;

    setEditingGroup3Index(idx);
    setNewGroup3Label(item.label ?? "");
    setNewGroup3Detail(item.detail ?? "");
    setNewGroup3Status(item.status ?? "normal");
    setNewGroup3Note(item.note ?? "");
    setShowAddGroup3(true);
  };

  const saveGroup3Modal = () => {
    const nextItem = {
      label: newGroup3Label || "รายการใหม่",
      detail: newGroup3Detail,
      status: newGroup3Status,
      note: newGroup3Note,
    };

    setDynamicGroup3((prev) =>
      prev.map((pg) =>
        pg.key === "meeting"
          ? {
              ...pg,
              items:
                editingGroup3Index === null
                  ? [...pg.items, nextItem]
                  : pg.items.map((item, index) =>
                      index === editingGroup3Index ? nextItem : item,
                    ),
            }
          : pg,
      ),
    );

    closeGroup3Modal();
  };

  const handleGroup3DetailChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const el = e.target;
    setNewGroup3Detail(el.value);
    adjustTextareaHeight(el);
  };

  const handleGroup3NoteChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const el = e.target;
    setNewGroup3Note(el.value);
    adjustTextareaHeight(el);
  };

  const handleGroup3StatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewGroup3Status(e.target.value);
  };

  // ensure counts contain any newly added keys from dynamicGroup2 and dynamicGroup3
  useEffect(() => {
    setCounts((prev) => {
      const next = { ...prev };
      dynamicGroup2.forEach((g) => {
        g.items.forEach((it) => {
          if (!(it.key in next)) next[it.key] = "0";
        });
      });
      // group3 items have inline note — skip counts
      return next;
    });
  }, [dynamicGroup2, dynamicGroup3]);

  const group3 = [
    {
      key: "meeting",
      title: "เข้าพบผู้ว่าจ้าง",
      items: [] as {
        label: string;
        detail: string;
        status: string;
        note: string;
      }[],
    },
  ];

  // hydrate dynamicGroup3 from static group3 on mount
  useEffect(() => {
    setDynamicGroup3(group3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // open/closed state per group to render sections dynamically
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    [...group1, ...dynamicGroup2, ...group3].reduce(
      (acc, g, i) => {
        acc[g.key] = i === 0; // open first group by default
        return acc;
      },
      {} as Record<string, boolean>,
    ),
  );

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingRaw, setEditingRaw] = useState<string>("");

  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const labelInputRef = useRef<HTMLTextAreaElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // track warning flags per-row to show brief validation hint
  const [warnings, setWarnings] = useState<Record<string, boolean>>({});
  const warningTimersRef = useRef<Record<string, number | null>>({});

  const triggerWarning = (key: string) => {
    // clear any existing timer
    const existing = warningTimersRef.current[key];
    if (existing) window.clearTimeout(existing);
    setWarnings((s) => ({ ...s, [key]: true }));
    const t = window.setTimeout(() => {
      setWarnings((s) => ({ ...s, [key]: false }));
      warningTimersRef.current[key] = null;
    }, 1200);
    warningTimersRef.current[key] = t as unknown as number;
  };

  const handleLabelChangeGroup3 = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const el = e.target;
    setNewGroup3Label(el.value);
    adjustTextareaHeight(el);
  };

  const handleLabelFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    adjustTextareaHeight(e.target as HTMLTextAreaElement);
    // focus the inputRef so keyboard behavior stays consistent
    labelInputRef.current = e.target as HTMLTextAreaElement;
  };

  const handleLabelKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLTextAreaElement).blur();
      return;
    }
  };

  // helper to auto-resize textarea when editing
  const adjustTextareaHeight = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    // add 2px to avoid scrollbar in some browsers
    el.style.height = `${el.scrollHeight + 2}px`;
  };

  // normalize to clean digit string
  const toDigitString = (v: string) => {
    const digits = String(v || "").replace(/\D/g, "");
    if (digits === "") return "0";
    const n = digits.replace(/^0+/, "");
    // Limit to 15 digits to stay within JavaScript safe integer range
    return n === "" ? "0" : n.slice(0, 15);
  };

  // sanitize any pre-existing counts on mount (in case invalid values were stored before)
  useEffect(() => {
    setCounts((prev) => {
      const next: Record<string, string> = {};
      Object.keys(prev).forEach((k) => {
        next[k] = toDigitString(prev[k]);
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- textarea handlers moved out of JSX for clarity ---
  const handleTextareaChange = (
    key: string,
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const el = e.target;
    const raw = el.value;
    const sanitized = raw.replace(/\s/g, "");

    // allow empty / minus prefix for entering negative
    if (sanitized === "" || sanitized === "-") {
      setEditingRaw(sanitized);
      adjustTextareaHeight(el);
      return;
    }

    // if everything is non-digit, warn and reject (don't update state)
    if (!/\d/.test(sanitized)) {
      triggerWarning(key);
      adjustTextareaHeight(el);
      return;
    }

    const clean = toDigitString(sanitized);
    setEditingRaw(clean);
    adjustTextareaHeight(el);
  };

  const handleTextareaFocus = (
    key: string,
    e: React.FocusEvent<HTMLTextAreaElement>,
  ) => {
    setEditingKey(key);
    const clean = toDigitString(counts[key] ?? "0");
    setEditingRaw(clean);
    adjustTextareaHeight(e.target as HTMLTextAreaElement);
  };

  const handleTextareaKeyDown = (
    key: string,
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLTextAreaElement).blur();
      return;
    }
    if (e.key === "Escape") {
      setEditingKey(null);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const valStr = editingRaw || "0";
      try {
        setEditingRaw(String(BigInt(valStr) + 1n));
      } catch {
        setEditingRaw(String(Number(valStr) + 1));
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const valStr = editingRaw || "0";
      try {
        const base = BigInt(valStr);
        setEditingRaw(base > 0n ? String(base - 1n) : "0");
      } catch {
        setEditingRaw(String(Math.max(0, Number(valStr) - 1)));
      }
    }
  };

  const handleTextareaBlur = (key: string) => {
    const final = toDigitString(editingRaw);
    setCounts((s) => ({ ...s, [key]: final }));
    setEditingRaw(final);
    setEditingKey(null);
  };

  const handleTextareaPaste = (
    key: string,
    e: React.ClipboardEvent<HTMLTextAreaElement>,
  ) => {
    const paste =
      (e.clipboardData || (window as any).clipboardData).getData("text") || "";
    const digitsOnly = paste.replace(/\D/g, "");
    if (digitsOnly === "") {
      e.preventDefault();
      triggerWarning(key);
      return;
    }
    let normalized = toDigitString(digitsOnly);
    e.preventDefault();
    const el = e.target as HTMLTextAreaElement;
    el.value = normalized;
    setEditingRaw(normalized);
    adjustTextareaHeight(el);
  };

  const getDisplayValue = (key: string) => {
    return toDigitString(counts[key] ?? "0");
  };

  // ensure textarea heights match their content for both editing and non-editing states
  useEffect(() => {
    // find all textareas inside any mo-table-wrapper. We avoid relying on a single ref
    // because the section can be mounted/unmounted and refs may change.
    const selector = `.${styles["mo-table-wrapper"]} textarea`;
    const nodes = Array.from(
      document.querySelectorAll(selector),
    ) as HTMLTextAreaElement[];
    if (nodes.length === 0) return;

    // run adjustment on the next animation frame so layout has settled after collapse/expand
    let rafId = 0;
    const adjustAll = () => {
      nodes.forEach((ta) => adjustTextareaHeight(ta));
    };
    rafId = requestAnimationFrame(adjustAll);
    return () => cancelAnimationFrame(rafId);
  }, [counts, editingKey, openGroups]);

  // when an "add" modal opens (group2 or group3), ensure the label textarea gets an initial height
  useEffect(() => {
    if (!showAddGroup2 && !showAddGroup3) return;
    // wait until the modal has rendered and layout is stable
    const id = requestAnimationFrame(() => {
      try {
        adjustTextareaHeight(labelInputRef.current);
      } catch (e) {
        // swallow errors — adjustment is best-effort
      }
    });
    return () => cancelAnimationFrame(id);
  }, [showAddGroup2, showAddGroup3]);

  // require at least one meaningful value (non-zero or non-empty text) from group counts
  // or any group3 items (meeting records are text-only, no numeric counts)
  const hasAnyData = () => {
    const hasCounts = Object.values(counts).some((v) => Number(v) > 0);
    const hasGroup3Items = dynamicGroup3.some((g) => g.items.length > 0);
    // also check the field currently being edited (counts hasn't saved yet)
    const hasEditingValue = editingKey ? Number(editingRaw) > 0 : false;
    return hasCounts || hasGroup3Items || hasEditingValue;
  };

  const onSubmit = async (
    e?: React.FormEvent,
    opts?: { approve?: boolean },
  ) => {
    e?.preventDefault();
    if (!hasAnyData() && !opts?.approve) return;

    const payload: Record<string, unknown> = {
      department_id: selectedDepartment,
      division_name:
        selectedSubLocation || availableSubSectorOptions[0]?.shortName || "",
      division_id:
        divisionOptions.find((d) => d.shortName === selectedSubLocation)?.id ||
        divisionOptions[0]?.id ||
        0,
      department_name: authEmployee?.department_name || "",
      created_by: authEmployee?.employee_code || "ADMIN",
    };

    // Send all inline-edit group counts mapped to their field names
    for (const [key, value] of Object.entries(counts)) {
      const num = Number(value);
      if (num > 0 || value !== "0") payload[key] = value;
    }

    // Build disciplines array from dynamicGroup2 (active items with values)
    const disciplines: Array<{
      key: string;
      label: string;
      value: number;
    }> = [];
    for (const g of dynamicGroup2) {
      if (g.key !== "discipline") continue;
      for (const item of g.items) {
        if (!item.isActive) continue;
        const val = Number(counts[item.key] ?? item.value ?? 0);
        if (val > 0) {
          disciplines.push({
            key: item.key,
            label: item.label.replace(/\s*:$/, ""),
            value: val,
          });
        }
      }
    }
    if (disciplines.length > 0) payload.disciplines = disciplines;

    // Build projects array from dynamicGroup3
    const projects: Array<{
      key: string;
      name: string;
      detail: string;
      status: string;
      note: string;
    }> = [];
    for (const g of dynamicGroup3) {
      g.items.forEach((it, i) => {
        projects.push({
          key: String(i + 1),
          name: it.label,
          detail: it.detail ?? "",
          status: it.status ?? "normal",
          note: it.note ?? "",
        });
      });
    }
    if (projects.length > 0) payload.projects = projects;

    if (opts?.approve) {
      payload.approved_status = "APPROVED";
      payload.approved_by = authEmployee?.employee_code || "ADMIN";
      payload.approved_at = new Date().toISOString();
    }

    try {
      submitStartRef.current = Date.now();
      setIsSubmitting(true);

      await createReport(payload as any);

      // Ensure minimum 2-second display time
      const elapsed = Date.now() - submitStartRef.current;
      const remaining = MIN_SUBMIT_MS - elapsed;
      if (remaining > 0) {
        await new Promise<void>((resolve) => {
          submitTimerRef.current = setTimeout(resolve, remaining);
        });
      }

      setIsSubmitting(false);
      setShowSuccess(true);

      // Clear form data from localStorage after successful submission
      clearFormData();
    } catch (err: unknown) {
      setIsSubmitting(false);
      const msg = err instanceof Error ? err.message : String(err);
      setFailMessage(msg);
      setShowFail(true);
    }
  };

  return (
    <>
      <form className={styles["guts-mo-form"]} onSubmit={(e) => onSubmit(e)}>
        <div className={styles["guts-Mo-layout"]}>
          {/* หน่วยงาน / Sector row */}
          <div className={styles["sector-table-wrapper"]}>
            <table className={styles["mo-table"]}>
              <thead>
                <tr>
                  <th
                    colSpan={4}
                    className={`${styles["location-table-header"]} ${styles["no-border"]}`}
                  >
                    <div className={styles["sector-header-fullwidth"]}>
                      {locations.length > 1 ? (
                        <select
                          className={`${styles["sector-cell-select"]} ${styles["sector-cell-select-full"]}`}
                          value={selectedDepartment}
                          onChange={(e) =>
                            setSelectedDepartment(Number(e.target.value))
                          }
                        >
                          {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.location}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={styles["sector-cell-single-value"]}
                          style={{ color: "#fff" }}
                        >
                          {locations[0]?.location}
                        </span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={1} className={`${styles["first-column-cell"]} `}>
                    <MapPin className={styles["pin-icon"]} />
                  </td>
                  <td
                    colSpan={3}
                    className={styles["sector-cell-bodytext"]}
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {availableSubSectorOptions.length > 1 ? (
                      <select
                        className={`${styles["sector-cell-select"]} ${styles["sector-cell-bodytext"]} ${styles["sector-cell-select-green"]} ${styles["sector-cell-select-full"]}`}
                        value={selectedSubLocation}
                        onChange={(e) => setSelectedSubLocation(e.target.value)}
                      >
                        {availableSubSectorOptions.map((opt) => (
                          <option key={opt.id} value={opt.shortName}>
                            {opt.shortName}
                          </option>
                        ))}
                      </select>
                    ) : availableSubSectorOptions.length >= 1 ? (
                      <span className={styles["sector-cell-single-value"]}>
                        {selectedSubLocation ||
                          availableSubSectorOptions[0].shortName}
                      </span>
                    ) : (
                      <span className={styles["sector-cell-single-value"]}>
                        เขต ไม่พร้อมใช้งาน
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* dynamic sections rendered from group1 */}
          {group1.map((g, idx) => (
            <div
              key={g.key}
              ref={wrapperRef}
              className={styles["mo-table-wrapper"]}
            >
              <table className={styles["mo-table"]}>
                <thead>
                  <tr>
                    <th
                      colSpan={1}
                      className={`${styles["first-column-cell"]} ${styles["no-border"]}`}
                    >
                      {idx + 1}.
                    </th>
                    <th
                      colSpan={3}
                      className={`${styles["mo-table-header"]} ${styles["no-border"]}`}
                    >
                      <div
                        className={`${styles["mo-header"]}`}
                        onClick={() =>
                          setOpenGroups((s) => ({ ...s, [g.key]: !s[g.key] }))
                        }
                        style={{ cursor: "pointer" }}
                      >
                        <p>{g.title}</p>
                        <div>
                          {openGroups[g.key] ? (
                            <ChevronDown size={18} />
                          ) : (
                            <ChevronRight size={18} />
                          )}
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>
                {openGroups[g.key] && (
                  <tbody>
                    {g.items.map((r, itemIdx) => (
                      <tr key={r.key}>
                        <td className={styles["first-column-cell"]}>
                          {idx + 1}.{itemIdx + 1}
                        </td>
                        <td className={styles["second-column-cell"]}>
                          {r.label}
                        </td>
                        <td
                          className={`${styles["third-column-cell"]} ${counts[r.key].toString().length > 4 ? styles["third-column-wrap-cell"] : ""}`}
                        >
                          <textarea
                            ref={inputRef as any}
                            className={`${styles["third-column-textarea"]}`}
                            value={
                              editingKey === r.key
                                ? editingRaw
                                : getDisplayValue(r.key)
                            }
                            rows={1}
                            style={{
                              fontStyle:
                                (editingKey === r.key
                                  ? editingRaw
                                  : getDisplayValue(r.key)) === "0"
                                  ? "italic"
                                  : "normal",
                            }}
                            onChange={(e) => handleTextareaChange(r.key, e)}
                            onPaste={(e) => handleTextareaPaste(r.key, e)}
                            onFocus={(e) => handleTextareaFocus(r.key, e)}
                            onKeyDown={(e) => handleTextareaKeyDown(r.key, e)}
                            onBlur={() => handleTextareaBlur(r.key)}
                          />
                        </td>
                        <td className={`${styles["fourth-column-cell"]}`}>
                          {r.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
          ))}

          {/* Add item modal (appears when 'add from group2  header' clicked) */}
          {showAddGroup2 && (
            <div
              className={styles["modal-overlay"]}
              role="dialog"
              aria-modal="true"
              onMouseDown={(e) => {
                // click backdrop to close
                if (e.target === e.currentTarget) setShowAddGroup2(false);
              }}
            >
              <div
                className={styles["modal"]}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className={styles["modal-header"]}>
                  <h3>เพิ่มข้อมูลวินัยและการลงโทษ</h3>
                </div>

                {/* modal body rendered as a mini table to match form style */}
                <div className={styles["modal-body"]}>
                  <div className={styles["mo-table-wrapper"]}>
                    <table className={styles["mo-table"]}>
                      <thead>
                        <tr>
                          <th
                            colSpan={1}
                            className={`${styles["first-column-cell"]} ${styles["no-border"]} ${styles["mo-table-header-red"]}`}
                          >
                            5
                          </th>
                          <th
                            colSpan={4}
                            className={`${styles["mo-table-header"]} ${styles["no-border"]} ${styles["mo-table-header-red"]}`}
                          >
                            <div
                              className={`${styles["mo-header"]}`}
                              style={{
                                padding: "6px 8px",
                                justifyContent: "flex-start",
                              }}
                            >
                              <p className={styles["mo-header-red-text"]}>
                                วินัยและการลงโทษ
                              </p>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* single selector row — pick one discipline type not yet active */}
                        {(() => {
                          // Get keys already active in the current form
                          const activeKeys = new Set(
                            dynamicGroup2
                              .filter((g) => g.key === "discipline")
                              .flatMap((g) =>
                                g.items
                                  .filter((r) => r.isActive === true)
                                  .map((r) => r.key),
                              ),
                          );

                          // Available options: from API distinct types, minus already-active ones
                          // Deduplicated by key to prevent React duplicate-key errors
                          const availableOptionsRaw =
                            distinctDisciplineTypes.length > 0
                              ? distinctDisciplineTypes.filter(
                                  (d) => !activeKeys.has(d.key),
                                )
                              : // Fallback to hardcoded inactive items when API hasn't loaded yet
                                dynamicGroup2
                                  .filter((g) => g.key === "discipline")
                                  .flatMap((g) =>
                                    g.items.filter(
                                      (r) =>
                                        r.isActive === false &&
                                        String(r.key).startsWith("discipline_"),
                                    ),
                                  )
                                  .map((r) => ({
                                    key: r.key,
                                    label: r.label,
                                  }));
                          const availableOptions = Array.from(
                            new Map(
                              availableOptionsRaw.map((o) => [o.key, o]),
                            ).values(),
                          );

                          if (availableOptions.length === 0) return null;
                          const selected =
                            availableOptions.find((r) =>
                              checkedItems.has(r.key),
                            ) ?? null;
                          const activeCount = dynamicGroup2
                            .filter((g) => g.key === "discipline")
                            .flatMap((g) =>
                              g.items.filter((r) => r.isActive === true),
                            ).length;
                          return (
                            <tr>
                              <td className={styles["first-column-cell"]}>
                                5.{activeCount + 1}
                              </td>
                              <td
                                className={`${styles["second-column-cell"]} ${styles["textarea-cell"]}`}
                                colSpan={2}
                                style={{ position: "relative" }}
                              >
                                {isOtherMode ? (
                                  <>
                                    <textarea
                                      className={`${styles["third-column-textarea"]} ${styles["third-column-textarea-danger"]}`}
                                      value={newGroup2Label}
                                      placeholder="ระบุรายการอื่น..."
                                      rows={1}
                                      onChange={(e) => {
                                        setNewGroup2Label(e.target.value);
                                        adjustTextareaHeight(e.target);
                                      }}
                                      style={{
                                        paddingRight: 28,
                                        textAlign: "left",
                                        fontSize: 13,
                                        fontWeight: 400,
                                      }}
                                    />
                                    <X
                                      size={18}
                                      style={{
                                        position: "absolute",
                                        top: 5,
                                        right: 8,
                                        cursor: "pointer",
                                        background: "rgba(183, 28, 28, 0.7)",
                                        borderRadius: "50%",
                                        padding: 1,
                                        color: "#fff",
                                      }}
                                      onClick={() => {
                                        setIsOtherMode(false);
                                        setNewGroup2Label("");
                                        setCheckedItems(new Set());
                                      }}
                                    />
                                  </>
                                ) : (
                                  <select
                                    className={styles["sector-cell-select"]}
                                    style={{
                                      width: "100%",
                                      maxWidth: "100%",
                                      background: "transparent",
                                      color: "inherit",
                                      border: "1px solid #ccc",
                                      padding: "4px 8px",
                                      fontSize: 14,
                                    }}
                                    value={selected?.key ?? ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === "__other__") {
                                        setIsOtherMode(true);
                                        setCheckedItems(new Set());
                                      } else {
                                        setIsOtherMode(false);
                                        setCheckedItems(
                                          val ? new Set([val]) : new Set(),
                                        );
                                      }
                                    }}
                                  >
                                    <option value="">-- เลือกรายการ --</option>
                                    {availableOptions.map((r) => (
                                      <option key={r.key} value={r.key}>
                                        {r.label}
                                      </option>
                                    ))}
                                    <option value="__other__">
                                      -- อื่นๆ --
                                    </option>
                                  </select>
                                )}
                              </td>
                              <td className={styles["third-column-cell"]}>
                                {(selected ||
                                  (isOtherMode &&
                                    newGroup2Label.trim() !== "")) && (
                                  <textarea
                                    className={`${styles["third-column-textarea"]} ${styles["third-column-textarea-danger"]}`}
                                    value={
                                      selected
                                        ? editingKey === selected.key
                                          ? editingRaw
                                          : getDisplayValue(selected.key) ===
                                              "0"
                                            ? ""
                                            : getDisplayValue(selected.key)
                                        : editingKey === "__other__"
                                          ? editingRaw
                                          : getDisplayValue("__other__") === "0"
                                            ? ""
                                            : getDisplayValue("__other__")
                                    }
                                    placeholder="0"
                                    rows={1}
                                    onChange={(e) =>
                                      selected
                                        ? handleTextareaChange(selected.key, e)
                                        : handleTextareaChange("__other__", e)
                                    }
                                    onFocus={(e) =>
                                      selected
                                        ? handleTextareaFocus(selected.key, e)
                                        : handleTextareaFocus("__other__", e)
                                    }
                                    onKeyDown={(e) =>
                                      selected
                                        ? handleTextareaKeyDown(selected.key, e)
                                        : handleTextareaKeyDown("__other__", e)
                                    }
                                    onBlur={() =>
                                      selected
                                        ? handleTextareaBlur(selected.key)
                                        : handleTextareaBlur("__other__")
                                    }
                                  />
                                )}
                              </td>
                              <td className={styles["fourth-column-cell"]}>
                                {"คน"}
                              </td>
                            </tr>
                          );
                        })()}
                        {/* add new item row — commented out */}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={styles["modal-footer"]}>
                  <button
                    type="button"
                    className={styles["btn-secondary"]}
                    onClick={() => {
                      setShowAddGroup2(false);
                      setNewGroup2Label("");
                      setCheckedItems(new Set());
                      setIsOtherMode(false);
                      setEditingKey(null);
                      setEditingRaw("");
                      setCounts((prev) => {
                        const next = { ...prev };
                        delete next["__other__"];
                        return next;
                      });
                    }}
                  >
                    ปิดหน้าจอ
                  </button>
                  <button
                    type="button"
                    className={styles["btn-primary"]}
                    onClick={handleSaveModal}
                    disabled={
                      (checkedItems.size === 0 &&
                        newGroup2Label.trim() === "") ||
                      Number(
                        isOtherMode
                          ? editingKey === "__other__"
                            ? editingRaw
                            : (counts["__other__"] ?? "0")
                          : checkedItems.size > 0
                            ? editingKey === [...checkedItems][0]
                              ? editingRaw
                              : (counts[[...checkedItems][0]] ?? "0")
                            : "0",
                      ) < 1
                    }
                  >
                    บันทึก
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* dynamic sections rendered from group2 */}
          {dynamicGroup2.map((g, idx) => (
            <div
              key={g.key}
              ref={wrapperRef}
              className={styles["mo-table-wrapper"]}
            >
              <table className={styles["mo-table"]}>
                <thead>
                  <tr>
                    <th
                      colSpan={1}
                      className={`${styles["first-column-cell"]} ${styles["no-border"]} ${styles["mo-table-header-red"]}`}
                    >
                      5.
                    </th>
                    <th
                      colSpan={4}
                      className={`${styles["mo-table-header"]} ${styles["mo-table-header-red"]} ${styles["no-border"]}`}
                    >
                      <div
                        className={`${styles["mo-header"]}`}
                        onClick={() =>
                          setOpenGroups((s) => ({ ...s, [g.key]: !s[g.key] }))
                        }
                        style={{ cursor: "pointer" }}
                      >
                        <p
                          className={
                            g.key === "discipline"
                              ? styles["mo-header-red-text"]
                              : ""
                          }
                        >
                          {g.title}
                        </p>
                        <div>
                          {openGroups[g.key] ? (
                            <ChevronDown size={18} />
                          ) : (
                            <ChevronRight size={18} />
                          )}
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>

                {openGroups[g.key] && (
                  <tbody>
                    {g.items
                      .filter((r) => r.isActive === true)
                      .map((r, itemIdx) => (
                        <tr key={r.key}>
                          <td className={styles["first-column-cell"]}>
                            5.{itemIdx + 1}
                          </td>
                          <td className={styles["group3-second-column-cell"]}>
                            {r.label}
                          </td>
                          <td
                            className={`${styles["third-column-cell"]} ${counts[r.key].toString().length > 4 ? styles["third-column-wrap-cell"] : ""}`}
                          >
                            <textarea
                              ref={inputRef as any}
                              className={`${styles["third-column-textarea"]} ${g.key === "discipline" ? styles["third-column-textarea-danger"] : ""}`}
                              value={
                                editingKey === r.key
                                  ? editingRaw
                                  : getDisplayValue(r.key)
                              }
                              rows={1}
                              onChange={(e) => handleTextareaChange(r.key, e)}
                              onPaste={(e) => handleTextareaPaste(r.key, e)}
                              onFocus={(e) => handleTextareaFocus(r.key, e)}
                              onKeyDown={(e) => handleTextareaKeyDown(r.key, e)}
                              onBlur={() => handleTextareaBlur(r.key)}
                            />
                          </td>
                          <td
                            className={`${styles["fourth-column-cell"]} ${styles["fourth-column-cell-danger"]}`}
                          >
                            {r.unit}
                          </td>
                          <td
                            className={`${styles["five-column-cell"]} ${styles["five-column-cell-danger"]} ${styles["cursor-pointer"]}`}
                            onClick={() => handleDeactivate(r.key)}
                          >
                            ลบ
                          </td>
                        </tr>
                      ))}
                    {/* add discipline row — follows column layout */}
                    {g.key === "discipline" &&
                      (() => {
                        const items = dynamicGroup2
                          .filter((g2) => g2.key === "discipline")
                          .flatMap((g2) => g2.items);
                        const allActive = items.every((it) => it.isActive);
                        if (allActive) return null;
                        const nextNum =
                          items.filter((it) => it.isActive).length + 1;
                        return (
                          <tr
                            style={{ cursor: "pointer" }}
                            onClick={openAddGroup2}
                          >
                            <td className={styles["first-column-cell"]}>
                              5.{nextNum}
                            </td>
                            <td
                              colSpan={4}
                              className={` ${styles["add-row-cell"]}`}
                            >
                              <div className={styles["add-row-centered"]}>
                                <PlusIcon className={styles["pin-icon"]} />
                                เพิ่มข้อมูลวินัยและการลงโทษ
                              </div>
                            </td>
                          </tr>
                        );
                      })()}
                  </tbody>
                )}
              </table>
            </div>
          ))}
          {showAddGroup3 && (
            <div
              className={styles["modal-overlay"]}
              role="dialog"
              aria-modal="true"
              onMouseDown={(e) => {
                // click backdrop to close
                if (e.target === e.currentTarget) closeGroup3Modal();
              }}
            >
              <div
                className={styles["modal"]}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className={styles["modal-header"]}>
                  <h3>
                    {editingGroup3Index === null
                      ? "เพิ่มข้อมูลเข้าพบผู้ว่าจ้าง"
                      : "รายละเอียดการเข้าพบผู้ว่าจ้าง"}
                  </h3>
                </div>
                <div className={styles["modal-body"]}>
                  <div className={styles["mo-table-wrapper"]}>
                    <table className={styles["mo-table"]}>
                      <thead>
                        <tr>
                          <th
                            colSpan={1}
                            className={`${styles["first-column-cell"]} ${styles["no-border"]} `}
                          >
                            6.
                          </th>
                          <th
                            colSpan={4}
                            className={`${styles["mo-table-header"]} ${styles["no-border"]}`}
                          >
                            <div
                              className={`${styles["mo-header"]}`}
                              style={{
                                padding: "6px 8px",
                                justifyContent: "flex-start",
                              }}
                            >
                              <p className={styles["mo-header-red-text"]}>
                                เข้าพบผู้ว่าจ้าง
                              </p>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className={styles["first-column-cell"]}>
                            {(() => {
                              if (editingGroup3Index !== null) {
                                return `6.${editingGroup3Index + 1}`;
                              }
                              const grp = dynamicGroup3.find(
                                (x) => x.key === "meeting",
                              );
                              return `6.${grp ? grp.items.length + 1 : 1}`;
                            })()}
                          </td>
                          <td
                            colSpan={3}
                            className={`${styles["group3-second-column-cell"]} ${styles["second-column-cell-left"]}`}
                          >
                            <textarea
                              ref={labelInputRef as any}
                              className={`${styles["third-column-textarea"]} ${styles["textarea-left"]}`}
                              value={newGroup3Label}
                              rows={1}
                              onChange={handleLabelChangeGroup3}
                              onPaste={() => {
                                /* allow any text paste */
                              }}
                              onFocus={handleLabelFocus}
                              onKeyDown={handleLabelKeyDown}
                              onBlur={(e) =>
                                adjustTextareaHeight(
                                  e.target as HTMLTextAreaElement,
                                )
                              }
                              placeholder="เช่น โครงการ XXXXX"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className={styles["first-column-cell"]}>
                            รายละเอียด
                          </td>
                          <td
                            className={`${styles["second-column-cell"]} ${styles["textarea-cell"]}`}
                            colSpan={2}
                          >
                            <textarea
                              ref={labelInputRef as any}
                              className={`${styles["group3-popup-third-column-textarea1"]} ${styles["textarea-left"]}`}
                              value={newGroup3Detail}
                              rows={1}
                              onChange={handleGroup3DetailChange}
                              onPaste={() => {
                                /* allow any text paste */
                              }}
                              onFocus={handleLabelFocus}
                              onKeyDown={handleLabelKeyDown}
                              onBlur={(e) =>
                                adjustTextareaHeight(
                                  e.target as HTMLTextAreaElement,
                                )
                              }
                              placeholder="เช่น รายละเอียดการเข้าพบ"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className={styles["first-column-cell"]}>สถานะ</td>
                          <td className={`${styles["second-column-cell"]} `}>
                            <div className={styles["radio-group"]}>
                              <label className={styles["radio-item"]}>
                                <input
                                  type="radio"
                                  name="newGroup3Status"
                                  value="normal"
                                  checked={newGroup3Status === "normal"}
                                  onChange={handleGroup3StatusChange}
                                  className={styles["radio-input"]}
                                />
                                <span>ปกติ</span>
                              </label>
                              <label className={styles["radio-item"]}>
                                <input
                                  type="radio"
                                  name="newGroup3Status"
                                  value="warning"
                                  checked={newGroup3Status === "warning"}
                                  onChange={handleGroup3StatusChange}
                                  className={styles["radio-input"]}
                                />
                                <span>ผิดปกติ</span>
                              </label>
                              <label className={styles["radio-item"]}>
                                <input
                                  type="radio"
                                  name="newGroup3Status"
                                  value="danger"
                                  checked={newGroup3Status === "danger"}
                                  onChange={handleGroup3StatusChange}
                                  className={styles["radio-input"]}
                                />
                                <span>ฉุกเฉิน</span>
                              </label>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td className={styles["first-column-cell"]}>
                            หมายเหตุ
                          </td>
                          <td
                            className={`${styles["second-column-cell"]} ${styles["textarea-cell"]}`}
                            colSpan={2}
                          >
                            <textarea
                              ref={labelInputRef as any}
                              className={`${styles["group3-popup-third-column-textarea2"]} ${styles["textarea-left"]}`}
                              value={newGroup3Note}
                              rows={1}
                              onChange={handleGroup3NoteChange}
                              onPaste={() => {
                                /* allow any text paste */
                              }}
                              onFocus={handleLabelFocus}
                              onKeyDown={handleLabelKeyDown}
                              onBlur={(e) =>
                                adjustTextareaHeight(
                                  e.target as HTMLTextAreaElement,
                                )
                              }
                              placeholder="เช่น หมายเหตุเพิ่มเติม"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={styles["modal-footer"]}>
                  <button
                    type="button"
                    className={styles["btn-secondary"]}
                    onClick={closeGroup3Modal}
                  >
                    ปิดหน้าจอ
                  </button>
                  <button
                    type="button"
                    className={styles["btn-primary"]}
                    onClick={saveGroup3Modal}
                    disabled={newGroup3Label.trim() === ""}
                  >
                    บันทึก
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* dynamic sections rendered from group3 */}
          {dynamicGroup3.map((g, idx) => (
            <div
              key={g.key}
              ref={wrapperRef}
              className={styles["mo-table-wrapper"]}
            >
              <table className={styles["mo-table"]}>
                <thead>
                  <tr>
                    <th
                      colSpan={1}
                      className={`${styles["first-column-cell"]} ${styles["no-border"]}`}
                    >
                      6.
                    </th>
                    <th
                      colSpan={5}
                      className={`${styles["mo-table-header"]} ${styles["no-border"]}`}
                    >
                      <div
                        className={`${styles["mo-header"]}`}
                        onClick={() =>
                          setOpenGroups((s) => ({ ...s, [g.key]: !s[g.key] }))
                        }
                        style={{ cursor: "pointer" }}
                      >
                        <p className={styles["mo-header-red-text"]}>
                          {g.title}
                        </p>
                        <div>
                          {openGroups[g.key] ? (
                            <ChevronDown size={18} />
                          ) : (
                            <ChevronRight size={18} />
                          )}
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>
                {openGroups[g.key] && (
                  <tbody>
                    {g.items.map((r, itemIdx) => (
                      <tr key={itemIdx}>
                        <td className={styles["first-column-cell"]}>
                          6.{itemIdx + 1}
                        </td>
                        <td className={styles["group3-second-column-cell"]}>
                          {r.label}
                        </td>
                        <td
                          className={`${styles["group3-third-column-cell"]} ${styles[`status-${r.status ?? statusOptions[rowStatus[String(itemIdx)] ?? 0].key}`]} `}
                        >
                          {(() => {
                            const key =
                              r.status ??
                              statusOptions[rowStatus[String(itemIdx)] ?? 0]
                                .key;
                            const opt =
                              statusOptions.find((s) => s.key === key) ??
                              statusOptions[0];
                            return opt.label;
                          })()}
                        </td>
                        <td
                          className={`${styles["group3-fourth-column-cell"]} `}
                        >
                          <button
                            type="button"
                            className={styles["action-link"]}
                            onClick={() => handleOpenRow(itemIdx)}
                          >
                            คลิกดู
                          </button>
                        </td>
                        <td
                          className={`${styles["five-column-cell"]} ${styles["five-column-cell-danger"]} ${styles["cursor-pointer"]}`}
                          onClick={() => handleRemoveGroup3Item(g.key, itemIdx)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleRemoveGroup3Item(g.key, itemIdx);
                            }
                          }}
                        >
                          ลบ
                        </td>
                      </tr>
                    ))}
                    {/* add group3 row */}
                    <tr
                      style={{ cursor: "pointer" }}
                      onClick={openAddGroup3}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openAddGroup3();
                        }
                      }}
                    >
                      <td className={styles["first-column-cell"]}>
                        6.{g.items.length + 1}
                      </td>
                      <td colSpan={4} className={styles["add-row-cell"]}>
                        <div className={styles["add-row-centered"]}>
                          <PlusIcon className={styles["pin-icon"]} />
                          เพิ่มข้อมูลเข้าพบผู้ว่าจ้าง
                        </div>
                      </td>
                    </tr>
                  </tbody>
                )}
              </table>
            </div>
          ))}
        </div>
        <div className={styles["guts-Mo-actions"]}>
          <button
            type="submit"
            className={[styles["guts-btn"], styles["guts-submit-btn"]].join(
              " ",
            )}
            disabled={!hasAnyData() || isSubmitting}
          >
            บันทึกรายงาน
          </button>
        </div>
      </form>

      <MoLoadingPopup open={isSubmitting} message="กำลังบันทึกข้อมูล..." />

      <ConfirmCancelDialog
        open={showConfirmCancel}
        onCancel={() => setShowConfirmCancel(false)}
        onConfirm={() => {
          setShowConfirmCancel(false);
          if (props.onCancel) props.onCancel();
          else window.history.back();
        }}
      />

      <InfoModel
        open={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          if (props.onCancel) props.onCancel();
          else window.history.back();
        }}
        variant="success"
        title="บันทึกรายงานสำเร็จ!"
        description="ระบบได้ทำการบันทึกข้อมูลของคุณเรียบร้อยแล้ว"
      />

      <InfoModel
        open={showFail}
        onClose={() => {
          setShowFail(false);
          if (props.onCancel) props.onCancel();
          else window.history.back();
        }}
        variant="error"
        title="บันทึกรายงานไม่สำเร็จ"
        description={failMessage}
      />
    </>
  );
}
