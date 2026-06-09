import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, PinIcon, PlusIcon, X } from "lucide-react";
import styles from "./MoUpdateForm.module.css";
import { useStore } from "../../store/store";
import ConfirmCancelDialog from "../dev.Mo/model/ConfirmCancelDialog";
import ConfirmSubmitDialog from "../dev.Mo/model/ConfirmSubmitDialog";
import InfoModel from "../Mo/InfoModel";
import AutoResizeTextarea from "../AutoResizeTextarea";

export type EmployeeLocation = {
  id: number;
  location: string;
  sub_locations?: string[];
};

type Props = {
  onCancel?: () => void;
  selectedLocation?: string;
  locations?: EmployeeLocation[];
  reportData?: Record<string, unknown>;
  submitRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  isEditing?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  isDirty?: boolean;
  onRequestSave?: () => void;
};

export default function MoUpdateForm(props: Props) {
  console.log("[MoUpdateForm] RENDERED", { reportData: props.reportData });
  const {
    createReport,
    updateReport,
    authEmployee,
    fetchDistinctDisciplineTypes,
  } = useStore();
  const reportItem = props.reportData as Record<string, any> | undefined;

  const [distinctDisciplineTypes, setDistinctDisciplineTypes] = useState<
    { key: string; label: string }[]
  >([]);
  useEffect(() => {
    fetchDistinctDisciplineTypes().then((types) =>
      setDistinctDisciplineTypes(types),
    );
  }, [fetchDistinctDisciplineTypes]);

  // sector / department selection from auth store
  const locations: EmployeeLocation[] = authEmployee?.department_name
    ? [
      {
        id: authEmployee.department_id ?? 1,
        location: authEmployee.department_name,
        sub_locations: [],
      },
    ]
    : [];
  const [selectedSector, setSelectedSector] = useState<number>(
    authEmployee?.department_id ?? locations[0]?.id ?? 1,
  );
  const selectedSectorName =
    locations.find((loc) => loc.id === selectedSector)?.location ?? "";
  const selectedLocation = locations.find((loc) => loc.id === selectedSector);
  const [selectedSubLocation, setSelectedSubLocation] = useState<string>("");

  // reset sub-location when sector changes
  useEffect(() => {
    const nextSubLocation =
      props.selectedLocation ||
      String(props.reportData?.sub_location ?? "") ||
      `เขต ${selectedSector}.1`;
    setSelectedSubLocation(nextSubLocation);
  }, [props.reportData, props.selectedLocation, selectedSector]);

  // confirmation dialog state
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // status options for group3 rows (cycle on click)
  const statusOptions = [
    { label: "ปกติ", key: "normal" },
    { label: "ผิดปกติ", key: "warning" },
    { label: "จุดเด่น", key: "danger" },
  ];

  // Report approval status labels (from MoHome pattern)
  const approvalStatusLabels = [
    { status: "done", label: "ดำเนินการแล้ว", cssClass: styles["status-done"] },
    {
      status: "undergo",
      label: "อยู่ระหว่างดำเนินการ",
      cssClass: styles["status-undergo"],
    },
    {
      status: "waited",
      label: "รอการดำเนินการ",
      cssClass: styles["status-waited"],
    },
    {
      status: "rejected",
      label: "ถูกปฏิเสธ",
      cssClass: styles["status-rejected"],
    },
    {
      status: "undone",
      label: "ยังไม่ได้ดำเนินการ",
      cssClass: styles["status-undone"],
    },
  ];
  const getApprovalStatusClass = (status: string) => {
    const found = approvalStatusLabels.find((s) => s.status === status);
    return found ? found.cssClass : styles["status-undone"];
  };
  const getApprovalStatusLabel = (status: string) => {
    const found = approvalStatusLabels.find((s) => s.status === status);
    return found ? found.label : status;
  };

  // status state per-row (initialized after groups mount)
  const [rowStatus, setRowStatus] = useState<Record<string, number>>({});
  // dynamicGroup3 must exist before this effect runs, declare it here (hydrated later)
  const [dynamicGroup3, setDynamicGroup3] = useState(() => [] as any[]);
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

  const cycleStatus = (idx: number) => {
    setRowStatus((prev) => ({
      ...prev,
      [String(idx)]: ((prev[String(idx)] ?? 0) + 1) % statusOptions.length,
    }));
  };

  // Approval state variables
  const [approvalStatus, setApprovalStatus] = useState<"PENDING" | "APPROVED" | "REJECT">(
    (props.reportData?.approved_status as "PENDING" | "APPROVED" | "REJECT") || "PENDING"
  );
  const [approvalRemark, setApprovalRemark] = useState<string>(
    (props.reportData?.approved_remark as string) || ""
  );

  // Check if current user is manager for approval permissions
  const isManager =
    authEmployee?.position_name?.includes("หัวหน้า") ||
    authEmployee?.position_name?.includes("manager") ||
    authEmployee?.role_name === "admin";

  // Initialize approval data from reportData when it changes
  useEffect(() => {
    setApprovalStatus((props.reportData?.approved_status as "PENDING" | "APPROVED" | "REJECT") || "PENDING");
    setApprovalRemark((props.reportData?.approved_remark as string) || "");
  }, [props.reportData]);

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

  // make group2 editable at runtime (so the plus button can add rows)
  const [dynamicGroup2, setDynamicGroup2] = useState(() => {
    // Build discipline map from reportData.disciplines[] array
    const discMap = new Map<string, number>();
    if (props.reportData) {
      const arr = (props.reportData as any).disciplines;
      if (Array.isArray(arr)) {
        arr.forEach((d: any) => discMap.set(d.key, d.value));
      }
    }

    return group2.map((g) => ({
      ...g,
      items: g.items.map((item) => {
        // 1) try disciplines[] array first
        let val = discMap.get(item.key);
        // 2) fallback to flat field
        if (val == null && props.reportData) {
          const flat = (props.reportData as any)[item.key];
          val = flat != null ? Number(flat) : undefined;
        }
        return {
          ...item,
          isActive: val != null && val > 0,
        };
      }),
    }));
  });

  // modal state for adding a row into group2
  const [showAddGroup2, setShowAddGroup2] = useState(false);
  const [newGroup2Label, setNewGroup2Label] = useState("");
  const [newGroup2Unit, setNewGroup2Unit] = useState("คน");
  // track which inactive items are checked in the modal
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isOtherMode, setIsOtherMode] = useState(false);

  const openAddGroup2 = () => {
    setNewGroup2Label("");
    setNewGroup2Unit("คน");
    setCheckedItems(new Set());
    setIsOtherMode(false);
    setShowAddGroup2(true);
  };

  const addItemToGroup2 = () => {
    // compute new key before mutating state so we can also initialize counts with any edited value
    const g = dynamicGroup2.find((x) => x.key === "discipline");
    const indices = g
      ? g.items.map((it) => Number(String(it.key).split(".")[1]) || 0)
      : [];
    const next = Math.max(0, ...indices) + 1;
    const newKey = `5.${next}`;
    const newItem = {
      key: newKey,
      label: newGroup2Label || "รายการใหม่",
      unit: newGroup2Unit || "คน",
      value: "0",
      isActive: true,
    };

    setDynamicGroup2((prev) =>
      prev.map((pg) =>
        pg.key === "discipline" ? { ...pg, items: [...pg.items, newItem] } : pg,
      ),
    );

    // initialize count for the new item using any currently edited value in the modal
    setCounts((prev) => ({
      ...prev,
      [newKey]:
        editingKey === newKey ? editingRaw || "0" : (prev[newKey] ?? "0"),
    }));

    setShowAddGroup2(false);
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

  const handleDeactivate = (key: string) => {
    setDynamicGroup2((prev) =>
      prev.map((pg) => ({
        ...pg,
        items: pg.items.map((item) =>
          item.key === key ? { ...item, isActive: false } : item,
        ),
      })),
    );
    // reset the count so it's not included in the payload
    setCounts((prev) => ({ ...prev, [key]: "0" }));
  };

  const handleSaveModal = () => {
    if (checkedItems.size > 0) {
      const selectedKey = Array.from(checkedItems)[0];

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
    }

    if (newGroup2Label.trim() !== "") {
      addItemToGroup2();
    } else {
      setShowAddGroup2(false);
    }
  };

  const toggleChecked = (key: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
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

  const handleOpenRow = (idx: number) => {
    const meetingGroup = dynamicGroup3.find((group) => group.key === "meeting");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicGroup2, dynamicGroup3]);

  // sync isActive from reportData when it arrives (handles async load after mount)
  useEffect(() => {
    if (!props.reportData) {
      console.log("[MoUpdateForm] no reportData");
      return;
    }
    console.log("[MoUpdateForm] syncing from reportData", props.reportData);

    const discMap = new Map<string, number>();
    const arr = (props.reportData as any).disciplines;
    if (Array.isArray(arr)) {
      arr.forEach((d: any) => discMap.set(d.key, d.value));
    }

    setDynamicGroup2((prev) =>
      prev.map((g) => {
        if (g.key !== "discipline") return g;

        let items = g.items.map((item) => {
          let val = discMap.get(item.key);
          if (val == null) {
            const flat = (props.reportData as any)[item.key];
            val = flat != null ? Number(flat) : undefined;
          }
          return {
            ...item,
            isActive: val != null && val > 0,
          };
        });

        if (Array.isArray(arr)) {
          arr.forEach((d: any) => {
            if (!items.find((it) => it.key === d.key)) {
              items.push({
                key: d.key,
                label: d.label,
                unit: "คน",
                value: String(d.value),
                isActive: d.value > 0,
              });
            }
          });
        }

        return { ...g, items };
      }),
    );
    // also re-sync counts from reportData (both disciplines[] array and flat fields)
    setCounts((prev) => {
      const next = { ...prev };
      // from flat fields (group1 items)
      group1.forEach((g) =>
        g.items.forEach((it) => {
          const rdVal = props.reportData![it.key];
          if (rdVal !== undefined && rdVal !== null) {
            next[it.key] = String(rdVal);
          }
        }),
      );
      // from disciplines[] array (group2 items)
      if (Array.isArray(arr)) {
        arr.forEach((d: any) => {
          next[d.key] = String(d.value);
        });
      }
      // from flat fields as fallback for group2
      group2.forEach((g) =>
        g.items.forEach((it) => {
          if (!(it.key in next)) {
            const rdVal = props.reportData![it.key];
            if (rdVal !== undefined && rdVal !== null) {
              next[it.key] = String(rdVal);
            }
          }
        }),
      );
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.reportData]);

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

  // hydrate dynamicGroup3 from reportData.projects on mount, fall back to empty
  useEffect(() => {
    const projects = Array.isArray(props.reportData?.projects)
      ? (props.reportData!.projects as {
          label: string;
          detail: string;
          status: string;
          note: string;
        }[])
      : [];
    setDynamicGroup3([
      { key: "meeting", title: "เข้าพบผู้ว่าจ้าง", items: projects },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.reportData]);

  // inline-edit counts for third-column cells (initialized from groups)
  const [counts, setCounts] = useState<Record<string, string>>(() => {
    const acc: Record<string, string> = {};
    group1.forEach((g) =>
      g.items.forEach((it) => {
        const rdVal = props.reportData?.[it.key];
        acc[it.key] =
          rdVal !== undefined
            ? String(rdVal)
            : ((it as { value: string }).value ?? "0");
      }),
    );
    group2.forEach((g) =>
      g.items.forEach((it) => {
        const rdVal = props.reportData?.[it.key];
        acc[it.key] =
          rdVal !== undefined
            ? String(rdVal)
            : ((it as { value: string }).value ?? "0");
      }),
    );
    // group3 items have inline note — skip counts
    return acc;
  });

  // Snapshot of initial form state for dirty detection
  const initialSnapshotRef = useRef<{
    counts: Record<string, string>;
    projectsJson: string;
  } | null>(null);

  useEffect(() => {
    if (!props.reportData) return;
    const snapCounts: Record<string, string> = {};
    group1.forEach((g) =>
      g.items.forEach((it) => {
        const rdVal = props.reportData![it.key];
        snapCounts[it.key] =
          rdVal !== undefined
            ? toDigitString(String(rdVal))
            : ((it as { value: string }).value ?? "0");
      }),
    );
    group2.forEach((g) =>
      g.items.forEach((it) => {
        const rdVal = props.reportData![it.key];
        snapCounts[it.key] =
          rdVal !== undefined
            ? toDigitString(String(rdVal))
            : ((it as { value: string }).value ?? "0");
      }),
    );
    const discArr = (props.reportData as any).disciplines;
    if (Array.isArray(discArr)) {
      discArr.forEach((d: any) => {
        snapCounts[d.key] = toDigitString(String(d.value));
      });
    }
    initialSnapshotRef.current = {
      counts: snapCounts,
      projectsJson: JSON.stringify(
        Array.isArray(props.reportData?.projects)
          ? (props.reportData!.projects as any[]).map((p: any) => ({
              label: p.label,
              detail: p.detail,
              status: p.status,
              note: p.note,
            }))
          : [],
      ),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.reportData]);

  // Compute whether the form has been modified from the initial snapshot
  const isDirty = (() => {
    const snap = initialSnapshotRef.current;
    if (!snap) return false;

    // Compare counts (including any new keys added dynamically)
    for (const key of Object.keys(snap.counts)) {
      if ((counts[key] ?? "0") !== snap.counts[key]) return true;
    }
    for (const key of Object.keys(counts)) {
      if (!(key in snap.counts) && counts[key] !== "0") return true;
    }

    // Compare projects (group3 items)
    const currentProjects =
      dynamicGroup3.find((g) => g.key === "meeting")?.items ?? [];
    const currentJson = JSON.stringify(
      currentProjects.map((p: any) => ({
        label: p.label,
        detail: p.detail,
        status: p.status,
        note: p.note,
      })),
    );
    if (currentJson !== snap.projectsJson) return true;

    return false;
  })();

  // Notify parent of dirty state
  useEffect(() => {
    if (props.onDirtyChange) {
      props.onDirtyChange(isDirty);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  // Reset form to original values from reportData
  const handleReset = () => {
    const snap = initialSnapshotRef.current;
    if (!snap) {
      if (props.onCancel) props.onCancel();
      else window.history.back();
      return;
    }

    // 1. Reset counts to snapshot
    setCounts({ ...snap.counts });

    // 2. Reset dynamicGroup2 isActive states from snapshot values
    setDynamicGroup2((prev) =>
      prev.map((g) => ({
        ...g,
        items: g.items.map((item) => {
          const val = snap.counts[item.key];
          return {
            ...item,
            isActive: val != null && val !== "0",
          };
        }),
      })),
    );

    // 3. Reset dynamicGroup3 from snapshot projects
    try {
      const originalProjects = JSON.parse(snap.projectsJson) as Array<{
        label: string;
        detail: string;
        status: string;
        note: string;
      }>;
      setDynamicGroup3([
        { key: "meeting", title: "เข้าพบผู้ว่าจ้าง", items: originalProjects },
      ]);
      setRowStatus({});
    } catch {
      setDynamicGroup3([
        { key: "meeting", title: "เข้าพบผู้ว่าจ้าง", items: [] },
      ]);
      setRowStatus({});
    }

    // 4. Reset sub-location to original
    if (props.reportData) {
      const origSub = String(props.reportData.sub_location ?? "");
      if (origSub) setSelectedSubLocation(origSub);
    }

    // 5. Clear editing state
    setEditingKey(null);
    setEditingRaw("0");

    // 6. Exit edit mode (parent sets isEditing=false)
    if (props.onCancel) props.onCancel();
  };

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
  const [editingRaw, setEditingRaw] = useState<string>("0");

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

  // helper: normalize a value to clean digit string
  const toDigitString = (v: string) => {
    const digits = String(v || "").replace(/\D/g, "");
    if (digits === "") return "0";
    const n = digits.replace(/^0+/, "");
    return n === "" ? "0" : n;
  };

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

    const normalized = toDigitString(digitsOnly);
    e.preventDefault();

    const el = e.target as HTMLTextAreaElement;
    el.value = normalized;
    setEditingRaw(normalized);
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

  // helper to get display value for a key when NOT editing: expand scientific notation if needed
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

  // notify parent when counts change (dirty tracking)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    props.onDirtyChange?.(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts, dynamicGroup2, dynamicGroup3]);

  // expose submit to parent via ref
  useEffect(() => {
    if (!props.submitRef) return;
    props.submitRef.current = async () => {
      await doSave();
    };
    return () => {
      if (props.submitRef) props.submitRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    counts,
    dynamicGroup2,
    dynamicGroup3,
    selectedSector,
    selectedSubLocation,
    approvalStatus,  // Add approval status to the dependency array
    approvalRemark,  // Add approval remark to the dependency array
  ]);

  const hasAnyData = () => {
    const hasCounts = Object.values(counts).some((v) => Number(v) > 0);
    const hasGroup3Items = dynamicGroup3.some((g) => g.items.length > 0);
    return hasCounts || hasGroup3Items;
  };

  const doSave = async (opts?: { approve?: boolean }) => {
    const payload: Record<string, any> = {
      department_id: Number(selectedSector),
      sub_location: selectedSubLocation,
    };

    // Build flat count fields from group1
    for (const g of group1) {
      for (const item of g.items) {
        payload[item.key] = Number(counts[item.key]) || 0;
      }
    }

    const disciplines: Array<{ key: string; label: string; value: number }> = [];
    for (const g of dynamicGroup2) {
      for (const item of g.items) {
        if (item.isActive) {
          const val = Number(counts[item.key]) || 0;
          if (val > 0) {
            disciplines.push({
              key: item.key,
              label: item.label.replace(/:$/, "").trim(),
              value: val,
            });
          }
        }
      }
    }
    payload.disciplines = disciplines;

    // Build projects array from dynamicGroup3
    const projects: Array<{
      key: string;
      label: string;
      detail: string;
      status: string;
      note: string;
    }> = [];
    for (const g of dynamicGroup3) {
      g.items.forEach((it, i) => {
        projects.push({
          key: String(i + 1),
          label: it.label,
          detail: it.detail ?? "",
          status: it.status ?? "normal",
          note: it.note ?? "",
        });
      });
    }
    payload.projects = projects;

    if (opts?.approve) {
      payload.approved_status = "APPROVED";
      payload.approved_by = authEmployee?.employee_code || "ADMIN";
      payload.approved_at = new Date().toISOString();
    } else {
      // Include approval status and remark when saving without approval
      payload.approved_status = approvalStatus;
      payload.approved_remark = approvalRemark;
      if (approvalStatus === "APPROVED") {
        payload.approved_by = authEmployee?.employee_code || "ADMIN";
        payload.approved_at = new Date().toISOString();
      }
    }

    try {
      const reportId = props.reportData?.id as number | undefined;
      if (reportId) {
        await updateReport(reportId, payload as any);
      } else {
        await createReport(payload as any);
      }
      setShowSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`เกิดข้อผิดพลาดในการบันทึก: ${msg}`);
    }
  };

  const onSubmit = async (
    e?: React.FormEvent,
    opts?: { approve?: boolean },
  ) => {
    e?.preventDefault();
    if (!hasAnyData() && !opts?.approve) return;

    // If triggered by a submit event (not programmatic), show confirm dialog first
    if (e && !opts?.approve) {
      setShowConfirmSubmit(true);
      return;
    }

    await doSave(opts);
  };

  const onSubmitWithApproval = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Check if there are changes to either form data or approval data
    const hasFormDataChanges = hasAnyData();
    const originalApprovalStatus = (props.reportData?.approved_status as "PENDING" | "APPROVED" | "REJECT") || "PENDING";
    const originalApprovalRemark = (props.reportData?.approved_remark as string) || "";
    const hasApprovalChanges = approvalStatus !== originalApprovalStatus || approvalRemark !== originalApprovalRemark;
    
    if (!hasFormDataChanges && !hasApprovalChanges) return;

    // Show confirm dialog if there are form data changes
    if (hasFormDataChanges) {
      setShowConfirmSubmit(true);
    } else {
      // If only approval data changed, save directly
      await doSave();
    }
  };

  return (
    <>
      <form className={styles["guts-Mo-layout"]} onSubmit={(e) => onSubmitWithApproval(e)}>
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
                    {selectedSectorName}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={1} className={`${styles["first-column-cell"]} `}>
                  <PinIcon className={styles["pin-icon"]} />
                </td>
                <td
                  colSpan={3}
                  className={styles["sector-cell-bodytext"]}
                  style={{
                    gap: 8,
                  }}
                >
                  <div className={styles["sector-cell-bodytext-inner"]}>
                    <span style={{ color: "var(--brandDark, #2d6a4f)" }}>
                      {selectedSubLocation}
                    </span>
                    {props.reportData?.approved_status && (
                      <span
                        className={`${styles["status-pill"]} ${getApprovalStatusClass(
                          props.reportData.approved_status as string,
                        )}`}
                      >
                        {getApprovalStatusLabel(
                          props.reportData.approved_status as string,
                        )}
                      </span>
                    )}
                  </div>
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
                          disabled={!props.isEditing}
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
                        const availableOptionsRaw =
                          distinctDisciplineTypes.length > 0
                            ? distinctDisciplineTypes.filter(
                                (d) => !activeKeys.has(d.key),
                              )
                            : dynamicGroup2
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
                                      color: "#fff",
                                      background: "rgba(183, 28, 28, 0.7)",
                                      borderRadius: "50%",
                                      padding: 1,
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
                                  <option value="__other__">-- อื่นๆ --</option>
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
                                        : getDisplayValue(selected.key) === "0"
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
                    (checkedItems.size === 0 && newGroup2Label.trim() === "") ||
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
                    {idx + 1}.
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
                          {itemIdx + 1}
                        </td>
                        <td className={styles["second-column-cell"]}>
                          {props.isEditing ? (
                            <textarea
                              className={`${styles["third-column-textarea"]} ${styles["textarea-left"]}`}
                              value={r.label}
                              rows={1}
                              onChange={(e) => {
                                const newLabel = e.target.value;
                                setDynamicGroup2((prev) =>
                                  prev.map((pg) =>
                                    pg.key === "discipline"
                                      ? {
                                          ...pg,
                                          items: pg.items.map((item) =>
                                            item.key === r.key
                                              ? { ...item, label: newLabel }
                                              : item,
                                          ),
                                        }
                                      : pg,
                                  ),
                                );
                              }}
                            />
                          ) : (
                            r.label
                          )}
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
                            disabled={!props.isEditing}
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
                        {props.isEditing && (
                          <td
                            className={`${styles["five-column-cell"]} ${styles["five-column-cell-danger"]} ${styles["cursor-pointer"]}`}
                            onClick={() => handleDeactivate(r.key)}
                          >
                            ลบ
                          </td>
                        )}
                      </tr>
                    ))}
                  {/* Add discipline row inline — like MoNewForm */}
                  {props.isEditing && (
                    <tr style={{ cursor: "pointer" }} onClick={openAddGroup2}>
                      <td className={styles["first-column-cell"]}>
                        {g.items.filter((r) => r.isActive === true).length + 1}
                      </td>
                      <td colSpan={4} className={styles["add-row-cell"]}>
                        <div className={styles["add-row-centered"]}>
                          <PlusIcon className={styles["pin-icon"]} />
                          เพิ่มข้อมูลวินัยและการลงโทษ
                        </div>
                      </td>
                    </tr>
                  )}
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
              if (e.target === e.currentTarget) closeGroup3Modal();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                closeGroup3Modal();
              }
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
                            onPaste={() => {}}
                            onFocus={handleLabelFocus}
                            onKeyDown={handleLabelKeyDown}
                            onBlur={(e) =>
                              adjustTextareaHeight(
                                e.target as HTMLTextAreaElement,
                              )
                            }
                            placeholder="เช่น โครงการ XXXXX"
                            readOnly={!props.isEditing}
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
                            onPaste={() => {}}
                            onFocus={handleLabelFocus}
                            onKeyDown={handleLabelKeyDown}
                            onBlur={(e) =>
                              adjustTextareaHeight(
                                e.target as HTMLTextAreaElement,
                              )
                            }
                            placeholder="เช่น รายละเอียดการเข้าพบ"
                            readOnly={!props.isEditing}
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
                                disabled={!props.isEditing}
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
                                disabled={!props.isEditing}
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
                                disabled={!props.isEditing}
                              />
                              <span>จุดเด่น</span>
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
                            onPaste={() => {}}
                            onFocus={handleLabelFocus}
                            onKeyDown={handleLabelKeyDown}
                            onBlur={(e) =>
                              adjustTextareaHeight(
                                e.target as HTMLTextAreaElement,
                              )
                            }
                            placeholder="เช่น หมายเหตุเพิ่มเติม"
                            readOnly={!props.isEditing}
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
                  {props.isEditing ? "ปิดหน้าจอ" : "ปิด"}
                </button>
                {props.isEditing && (
                  <button
                    type="button"
                    className={styles["btn-primary"]}
                    onClick={saveGroup3Modal}
                    disabled={newGroup3Label.trim() === ""}
                  >
                    บันทึก
                  </button>
                )}
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
                    {idx + 1}.
                  </th>
                  <th
                    colSpan={props.isEditing ? 5 : 4}
                    className={`${styles["mo-table-header"]} ${styles["no-border"]}`}
                  >
                    <div
                      className={`${styles["mo-header"]}`}
                      onClick={() =>
                        setOpenGroups((s) => ({ ...s, [g.key]: !s[g.key] }))
                      }
                      style={{ cursor: "pointer" }}
                    >
                      <p className={styles["mo-header-red-text"]}>{g.title}</p>
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
                        {idx + 1}.{itemIdx + 1}
                      </td>
                      <td className={styles["group3-second-column-cell"]}>
                        {props.isEditing ? (
                          <textarea
                            className={`${styles["third-column-textarea"]} ${styles["textarea-left"]}`}
                            value={r.label}
                            rows={1}
                            onChange={(e) => {
                              const newLabel = e.target.value;
                              setDynamicGroup3((prev) =>
                                prev.map((pg) =>
                                  pg.key === "meeting"
                                    ? {
                                        ...pg,
                                        items: pg.items.map((item, i) =>
                                          i === itemIdx
                                            ? { ...item, label: newLabel }
                                            : item,
                                        ),
                                      }
                                    : pg,
                                ),
                              );
                            }}
                            onClick={(e) => {
                              // Prevent textarea click from bubbling up to tr click handler
                              e.stopPropagation();
                            }}
                          />
                        ) : (
                          <div 
                            onClick={() => props.isEditing ? handleOpenRow(itemIdx) : undefined}
                            style={{ cursor: props.isEditing ? 'pointer' : 'default' }}
                          >
                            {r.label}
                          </div>
                        )}
                      </td>
                      <td
                        className={`${styles["group3-third-column-cell"]} ${styles[`status-${r.status ?? statusOptions[rowStatus[String(itemIdx)] ?? 0].key}`]} `}
                        onClick={() => {
                          if (props.isEditing) {
                            handleOpenRow(itemIdx);
                          } else {
                            cycleStatus(itemIdx);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (props.isEditing) {
                              handleOpenRow(itemIdx);
                            } else {
                              cycleStatus(itemIdx);
                            }
                          }
                        }}
                      >
                        {(() => {
                          const key =
                            r.status ??
                            statusOptions[rowStatus[String(itemIdx)] ?? 0].key;
                          const opt =
                            statusOptions.find((s) => s.key === key) ??
                            statusOptions[0];
                          return opt.label;
                        })()}
                      </td>
                      {/* Show separate detail/note columns when editing, otherwise show click to view button */}
                   
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
              
                      {props.isEditing && (
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
                      )}
                    </tr>
                  ))}
                  {/* Add meeting row inline — like MoNewForm */}
                  {props.isEditing && (
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
                        {idx + 1}.{g.items.length + 1}
                      </td>
                      <td colSpan={props.isEditing ? 4 : 3} className={styles["add-row-cell"]}>
                        <div className={styles["add-row-centered"]}>
                          <PlusIcon className={styles["pin-icon"]} />
                          เพิ่มข้อมูลเข้าพบผู้ว่าจ้าง
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              )}
            </table>
          </div>
        ))}
        
      </form>
      
      <div className={styles["signature-section"]}>
        <div className={styles["signature-slot-left"]}>
          <div className={styles["signature-title"]}>ผู้ บันทึก:</div>
          <div className={styles["signature-line"]}>
            {reportItem?.created_by || "ADMIN"}
          </div>
        </div>
        <div className={styles["signature-slot-right"]}>
          <div className={styles["signature-title"]}>ผู้ อำนวยงาน:</div>
          <div className={styles["signature-line"]}>
            {reportItem?.approved_by || "--------"}
          </div>
        </div>
      </div>
      
      <div
        className={`${styles["guts-Mo-actions"]} `}
      >
        {props.isEditing && (
          <>
            {/* ── บันทึกรายงาน ── shown for all editing users */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'row', gap: '10px' }}>

            <button
              type="button"
              className={`${styles["guts-save-report-btn"]} ${getApprovalStatusClass(
                props.reportData?.approved_status as string,
              )}`}
              disabled={!isDirty}
              style={!isDirty ? { opacity: 0.35, cursor: "not-allowed" } : {}}
              onClick={() => {
                if (isDirty) setShowConfirmSubmit(true);
              }}
            >
              บันทึกรายงาน
            </button>
            {/* ── บันทึกรายงาน ── shown for all editing users */}
            <button
              type="button"
              className={styles["guts-cancel-btn"]}
              disabled={!isDirty}
              onClick={() => {
                if (isDirty) {
                  setShowConfirmCancel(true);
                } else if (props.onCancel) {
                  props.onCancel();
                }
              }}
            >
              ยกเลิก 
            </button>
            </div>
          </>
        )}
        {/* ── Manager-only buttons ── */}
        {/* {isManager && ( */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* อนุมัติรายงาน: teal filled, saves with approve flag */}
            <button
              type="button"
              className={styles["guts-approve-btn"]}
              onClick={async () => {
                setApprovalStatus("APPROVED");
                await doSave({ approve: true });
              }}
            >
              อนุมัติรายงาน
            </button>

            {/* ส่งกลับแก้ไข หลังอนุมัติ: yellow, only active when currently APPROVED */}
            <button
              type="button"
              className={styles["guts-sendback-btn"]}
              disabled={approvalStatus !== "APPROVED"}
              style={approvalStatus !== "APPROVED" ? { opacity: 0.4, cursor: "not-allowed" } : {}}
              onClick={async () => {
                setApprovalStatus("REJECT");
                await doSave();
              }}
            >
              ส่งกลับแก้ไข หลังอนุมัติ
            </button>
          </div>
        {/* )} */}

      </div>

      <ConfirmCancelDialog
        open={showConfirmCancel}
        onCancel={() => setShowConfirmCancel(false)}
        onConfirm={() => {
          setShowConfirmCancel(false);
          handleReset();
        }}
      />

      <ConfirmSubmitDialog
        open={showConfirmSubmit}
        title="ยืนยันบันทึกการแก้ไข?"
        description="ระบบจะบันทึกข้อมูลที่แก้ไขทั้งหมด"
        onCancel={() => setShowConfirmSubmit(false)}
        onConfirm={async () => {
          setShowConfirmSubmit(false);
          await doSave();
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
    </>
  );
}
