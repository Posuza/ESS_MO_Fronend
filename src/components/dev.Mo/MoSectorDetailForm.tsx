import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, PlusIcon } from "lucide-react";
import styles from "./MoSectorDetailForm.module.css";
import { useStore } from "../../store/store";

export type EmployeeLocation = {
  id: number;
  location: string;
  sub_locations: string[];
};

type Props = {
  onCancel?: () => void;
  selectedLocation?: string;
  empCode?: string;
  locations?: EmployeeLocation[];
  selectedTransactionId?: number | null;
};

interface GroupItem {
  key: string;
  label: string;
  unit?: string;
  status?: string;
}

interface Group {
  key: string;
  title: string;
  items: GroupItem[];
}

interface StatusOption {
  label: string;
  key: string;
}

interface CountState {
  [key: string]: string;
}

export default function MoNewForm(props: Props) {
  console.log("[MoSectorDetailForm] RENDERED! props:", props);
  const { createReport, authEmployee, reports, fetchReports } = useStore();

  // fetch reports from store on mount
  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sector / department selection
  // derive locations: prefer props.locations; otherwise derive from store reports
  const derivedLocations: EmployeeLocation[] = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    (reports || []).forEach((r) => {
      const id = Number(r.department_id) || 0;
      const sub = (r.sub_location || "").trim();
      if (!map[id]) map[id] = new Set();
      if (sub) map[id].add(sub);
    });
    return Object.keys(map).map((k) => ({
      id: Number(k),
      location: `Department ${k}`,
      sub_locations: Array.from(map[k]),
    }));
  }, [reports]);

  const locations =
    props.locations && props.locations.length > 0
      ? props.locations
      : derivedLocations;
  const [selectedSector, setSelectedSector] = useState<number>(
    authEmployee?.department_id ?? (locations[0] && locations[0].id) ?? 1,
  );

  // selected sub-location (string). Prefers incoming prop selectedLocation when provided.
  const [selectedSubLocation, setSelectedSubLocation] = useState<string>(
    props.selectedLocation ??
      locations.find(
        (l) =>
          l.id ===
          (authEmployee?.department_id ?? (locations[0] && locations[0].id)),
      )?.sub_locations?.[0] ??
      "",
  );

  // keep selectedSubLocation in sync when department changes
  useEffect(() => {
    const loc = locations.find((l) => l.id === selectedSector);
    const first = loc?.sub_locations?.[0] ?? "";
    setSelectedSubLocation((prev) =>
      prev && loc?.sub_locations?.includes(prev) ? prev : first,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSector]);

  // transaction ids available from store reports for the selected department
  const transactionIds = useMemo(() => {
    return (reports || [])
      .filter((r) => Number(r.department_id) === Number(selectedSector))
      .map((r) => r.id)
      .filter(Boolean) as number[];
  }, [reports, selectedSector]);

  const [selectedTransactionId, setSelectedTransactionId] = useState<
    number | null
  >(null);

  // when selectedSector or transactionIds change, update selectedTransactionId default
  useEffect(() => {
    if (transactionIds.length > 0) {
      setSelectedTransactionId((prev) =>
        prev && transactionIds.includes(prev) ? prev : transactionIds[0],
      );
    } else {
      setSelectedTransactionId(null);
    }
  }, [transactionIds]);

  // Notes / textual fields (keep these)
  const [disciplineNote, setDisciplineNote] = useState("");
  const [otherNote, setOtherNote] = useState("");
  const [foundNote, setFoundNote] = useState("");
  const [trainNote, setTrainNote] = useState("");

  // placeholder handler for per-row action (keeps original behavior)
  const handleOpenRow = (key: string) => {
    // TODO: wire to real behavior if needed
    // eslint-disable-next-line no-console
    console.log("open row", key);
  };

  // status options for group3 rows (cycle on click)
  const statusOptions: StatusOption[] = [
    { label: "ปกติ", key: "normal" },
    { label: "ผิดปกติ", key: "warning" },
    { label: "จุดเด่น", key: "danger" },
  ];

  // status state per-row (initialized after groups mount)
  const [rowStatus, setRowStatus] = useState<Record<string, number>>({});
  // dynamicGroup3 must exist before this effect runs, declare it here (hydrated later)
  const [dynamicGroup3, setDynamicGroup3] = useState<Group[]>([]);

  useEffect(() => {
    const init: Record<string, number> = {};
    // initialize only for group3 items
    dynamicGroup3.forEach((g) => {
      g.items.forEach((it) => {
        const idx = statusOptions.findIndex(
          (s) => s.key === (it as any).status,
        );
        init[it.key] = idx >= 0 ? idx : 0; // respect provided status or default to 'ปกติ'
      });
    });
    setRowStatus(init);
  }, [dynamicGroup3]);

  const cycleStatus = (key: string) => {
    setRowStatus((prev) => ({
      ...prev,
      [key]: ((prev[key] ?? 0) + 1) % statusOptions.length,
    }));
  };

  // grouped rows config under the main personnel header
  const group1: Group[] = [
    {
      key: "dept",
      title: "หน่วยงานที่รับผิดชอบ",
      items: [
        {
          key: "dept_guard_post_count",
          label: "จุดรักษาการณ์ :",
          unit: "หน่วยงาน",
        },
        {
          key: "dept_current_personnel_count",
          label: "กำลังพลปัจจุบัน :",
          unit: "คน",
        },
        {
          key: "dept_missing_regular_count",
          label: "ขาดตัวประจำ :",
          unit: "หน่วยงาน",
        },
        {
          key: "dept_missing_personnel_count",
          label: "ขาดกำลังพล :",
          unit: "คน",
        },
        {
          key: "dept_supplement_count",
          label: "จัดกำลังพลเสริมพิเศษ :",
          unit: "คน",
        },
        {
          key: "dept_recruitment_count",
          label: "สรรหาผู้สมัครงานใหม่ :",
          unit: "คน",
        },
        {
          key: "dept_reserve_units_count",
          label: "จำนวนหน่วยงานสำรองเวร :",
          unit: "หน่วย",
        },
        {
          key: "dept_reserve_personnel_count",
          label: "จำนวนกำลังพลสำรองเวร :",
          unit: "นาย",
        },
      ],
    },
    {
      key: "leave",
      title: "การลา",
      items: [
        { key: "leave_personal_count", label: "ลากิจ :", unit: "คน" },
        { key: "leave_sick_count", label: "ลาป่วย :", unit: "คน" },
        { key: "leave_absent_count", label: "ขาดงาน :", unit: "คน" },
        { key: "leave_deserted_count", label: "หนีหาย :", unit: "คน" },
        { key: "leave_resigned_count", label: "ลาออก :", unit: "คน" },
        { key: "leave_terminated_count", label: "ไล่ออก :", unit: "คน" },
      ],
    },
    {
      key: "shift",
      title: "การบริหารการควงเวร",
      items: [
        { key: "shift_18_count", label: "18 ชั่วโมง :", unit: "คน" },
        { key: "shift_24_count", label: "24 ชั่วโมง :", unit: "คน" },
        { key: "shift_36_count", label: "36 ชั่วโมง :", unit: "คน" },
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
        },
        {
          key: "training_planned_count",
          label: "อบรมตามแผนงานที่กำหนด :",
          unit: "หน่วยงาน",
        },
        {
          key: "training_duty_control_count",
          label: "ควบคุมหน้าที่งาน :",
          unit: "หน่วยงาน",
        },
      ],
    },
  ];

  const group2: Group[] = [
    {
      key: "discipline",
      title: "วินัยและการลงโทษ",
      items: [
        {
          key: "discipline_phone_count",
          label: "เล่นโทรศัพท์มือถือ :",
          unit: "คน",
        },
        { key: "discipline_belt_count", label: "ไม่มีเข็มขัด :", unit: "คน" },
        { key: "discipline_badge_count", label: "ไม่แขวนบัตร :", unit: "คน" },
        {
          key: "discipline_uniform_count",
          label: "ชุดชำรุดเก่า :",
          unit: "คน",
        },
      ],
    },
  ];

  const group3: Group[] = [
    {
      key: "projects",
      title: "เข้าพบผู้ว่าจ้าง",
      items: [
        { key: "1", label: "โครงการ xxx", status: "normal" },
        { key: "2", label: "โครงการ yyyy", status: "warning" },
        { key: "3", label: "โครงการ zzzz", status: "danger" },
      ],
    },
  ];

  // make group2 editable at runtime (so the plus button can add rows)
  const [dynamicGroup2, setDynamicGroup2] = useState<Group[]>(group2);

  // modal state for adding a row into group2
  const [showAddGroup2, setShowAddGroup2] = useState(false);
  const [newGroup2Label, setNewGroup2Label] = useState("");
  const [newGroup2Unit, setNewGroup2Unit] = useState("คน");
  // separate option state for radio/select inputs in the add modal (kept independent from the label textarea)
  const [newGroup2Option, setNewGroup2Option] = useState("");

  const openAddGroup2 = () => {
    setNewGroup2Label("");
    setNewGroup2Unit("คน");
    setNewGroup2Option("");
    setShowAddGroup2(true);
  };

  const addItemToGroup2 = () => {
    const g = dynamicGroup2.find((x) => x.key === "discipline");
    const customCount = g
      ? g.items.filter((it) => it.key.startsWith("discipline_custom_")).length
      : 0;
    const newKey = `discipline_custom_${customCount + 1}`;
    const newItem = {
      key: newKey,
      label: newGroup2Label || "รายการใหม่",
      unit: newGroup2Unit || "คน",
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
        editingKey === newKey
          ? editingNormalized || "0"
          : (prev[newKey] ?? "0"),
    }));

    setShowAddGroup2(false);
  };

  // modal state for adding a row into group3
  const [showAddGroup3, setShowAddGroup3] = useState(false);
  const [newGroup3Label, setNewGroup3Label] = useState("");

  const openAddGroup3 = () => {
    setNewGroup3Label("");
    setShowAddGroup3(true);
  };

  const addItemToGroup3 = () => {
    const g = dynamicGroup3.find((x) => x.key === "projects");
    const next = g ? g.items.length + 1 : 1;
    const newKey = String(next);
    const newItem = {
      key: newKey,
      label: newGroup3Label || "รายการใหม่",
      status: "normal",
    };

    setDynamicGroup3((prev) =>
      prev.map((pg) =>
        pg.key === "projects" ? { ...pg, items: [...pg.items, newItem] } : pg,
      ),
    );

    setShowAddGroup3(false);
  };

  // ensure counts contain any newly added keys from dynamicGroup2 and dynamicGroup3
  useEffect(() => {
    setCounts((prev) => {
      const next: CountState = { ...prev };
      dynamicGroup2.forEach((g) => {
        g.items.forEach((it) => {
          if (!(it.key in next)) next[it.key] = "0";
        });
      });
      dynamicGroup3.forEach((g) => {
        g.items.forEach((it) => {
          if (!(it.key in next)) next[it.key] = "0";
        });
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicGroup2, dynamicGroup3]);

  // hydrate dynamicGroup3 from store reports using projects field
  useEffect(() => {
    const report = (reports || []).find((r) => r.id === selectedTransactionId);

    if (report?.projects && report.projects.length > 0) {
      const items = report.projects.map((p) => ({
        key: p.id,
        label: p.label,
        status: p.status ?? "normal",
      }));
      setDynamicGroup3([{ key: "projects", title: "เข้าพบผู้ว่าจ้าง", items }]);
    } else {
      setDynamicGroup3(group3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTransactionId, reports]);

  // Load data from store and initialize counts (will be populated when selectedTransactionId changes)
  const [counts, setCounts] = useState<CountState>({});

  // when selectedTransactionId changes, build counts from matching report
  useEffect(() => {
    console.log("[MO] useEffect triggered", {
      selectedTransactionId,
      reportsCount: (reports || []).length,
    });

    const acc: CountState = {};
    if (selectedTransactionId == null) {
      console.log("[MO] selectedTransactionId is null, clearing counts");
      setCounts(acc);
      return;
    }

    const report = (reports || []).find((r) => r.id === selectedTransactionId);
    if (!report) {
      console.log("[MO] report not found for id:", selectedTransactionId);
      setCounts(acc);
      return;
    }

    console.log("[MO] report found", report);

    // Map flat SectorReport fields to the counts dict by item key
    group1.forEach((g) => {
      g.items.forEach((it) => {
        const val = (report as any)[it.key];
        acc[it.key] = val != null ? String(val) : "0";
      });
    });

    // Map disciplines
    // Strategy: first try the dynamic disciplines[] array, then fall back
    // to flat fields on the report (the backend may return either format).
    const discMap = new Map<string, number>();
    (report.disciplines || []).forEach((d) => discMap.set(d.key, d.value));

    console.log(
      "[MO] report.disciplines:",
      report.disciplines,
      "discMap:",
      discMap,
    );

    dynamicGroup2.forEach((g) => {
      g.items.forEach((it) => {
        // 1) try dynamic array
        let val = discMap.get(it.key);
        // 2) fallback to flat field on the report (e.g. report.discipline_phone_count)
        if (val == null) {
          const flat = (report as any)[it.key];
          if (flat != null)
            console.log(`[MO] fallback: reading flat field ${it.key}=${flat}`);
          val = flat != null ? Number(flat) : undefined;
        }
        acc[it.key] = val != null ? String(val) : "0";
      });
    });

    console.log("[MO] group2 acc after mapping:", acc);

    // Dynamically add any discipline items from the store's dynamic array
    // that are not already in group2 (custom items saved previously).
    const existingKeys = new Set(
      dynamicGroup2.flatMap((g) => g.items.map((it) => it.key)),
    );
    const missing = (report.disciplines || []).filter(
      (d) => !existingKeys.has(d.key),
    );
    if (missing.length > 0) {
      console.log("[MO] missing discipline items from store:", missing);
      missing.forEach((d) => {
        acc[d.key] = String(d.value);
      });

      setDynamicGroup2((prev) =>
        prev.map((g) =>
          g.key === "discipline"
            ? {
                ...g,
                items: [
                  ...g.items,
                  ...missing.map((d) => ({
                    key: d.key,
                    label: d.label,
                    unit: "คน",
                  })),
                ],
              }
            : g,
        ),
      );
    }

    console.log("[MO] final acc being set:", acc);
    setCounts(acc);
  }, [selectedTransactionId, reports]);

  // group3Data: prefer store-backed projects data filtered by selectedTransactionId, otherwise fallback to static group3
  const group3Data = useMemo(() => {
    const report = (reports || []).find((r) => r.id === selectedTransactionId);

    if (report?.projects && report.projects.length > 0) {
      return [
        {
          key: "projects",
          title: "เข้าพบผู้ว่าจ้าง",
          items: report.projects.map((p) => ({
            key: p.id,
            label: p.label,
            status: p.status ?? "normal",
          })),
        },
      ] as Group[];
    }

    return group3;
  }, [selectedTransactionId, reports]);

  // open/closed state per group to render sections dynamically
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    [...group1, ...dynamicGroup2, ...group3Data].reduce(
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
  // handlers for modal label textarea to behave similar to numeric textarea but accept any text
  const handleLabelChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    setNewGroup2Label(el.value);
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

  // handler for radio/select-style options used in add modals (keeps radio state separate from textarea)
  const handleNewGroup2OptionChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setNewGroup2Option(e.target.value);
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
    return n === "" ? "0" : n;
  };

  // sanitize any pre-existing counts on mount (in case invalid values were stored before)
  useEffect(() => {
    setCounts((prev) => {
      const next: CountState = {};
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

    // if everything is non-digit, reject (don't update state)
    if (!/\d/.test(sanitized)) {
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
      return;
    }
    let normalized = toDigitString(digitsOnly);
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

  const normalizeText = (value: string) => value.trim();

  // helper to get display value for a key when NOT editing
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

  // helper to check if anything is filled in (including explicit zeros)
  const isDirty = () => {
    // consider dirty if any count was edited (non-empty / non-zero) or any note has text
    const countsDirty = Object.values(counts || {}).some((v) => {
      const s = String(v ?? "").trim();
      return s !== "" && s !== "0";
    });
    return (
      countsDirty ||
      normalizeText(disciplineNote) !== "" ||
      normalizeText(foundNote) !== "" ||
      normalizeText(trainNote) !== "" ||
      normalizeText(otherNote) !== ""
    );
  };

  // require at least one meaningful value (non-zero or non-empty text)
  const hasAnyData = () => {
    const countsAny = Object.values(counts || {}).some((v) => Number(v) > 0);
    return (
      countsAny ||
      normalizeText(disciplineNote) !== "" ||
      normalizeText(foundNote) !== "" ||
      normalizeText(trainNote) !== "" ||
      normalizeText(otherNote) !== ""
    );
  };

  const handleCancel = () => {
    if (!isDirty()) {
      if (props.onCancel) props.onCancel();
      else window.history.back();
    }
  };

  const onSubmit = async (
    e?: React.FormEvent,
    opts?: { approve?: boolean },
  ) => {
    e?.preventDefault();
    if (!hasAnyData() && !opts?.approve) return;

    const payload: Record<string, unknown> = {
      department_id: selectedSector,
      sub_location: selectedSubLocation,
      created_by: authEmployee?.employee_code || props.empCode || "ADMIN",
    };

    // Send all inline-edit group counts mapped to field names
    for (const [key, value] of Object.entries(counts)) {
      const num = Number(value);
      if (num > 0 || value !== "0") payload[key] = value;
    }

    // Build disciplines array from dynamicGroup2 (dynamic array with key/label/value)
    const disciplines: Array<{
      key: string;
      label: string;
      value: number;
    }> = [];
    for (const g of dynamicGroup2) {
      g.items.forEach((it) => {
        const val = Number(counts[it.key] ?? 0);
        if (val > 0 || counts[it.key] !== "0") {
          disciplines.push({
            key: it.key,
            label: it.label,
            value: val,
          });
        }
      });
    }
    if (disciplines.length > 0) payload.disciplines = disciplines;

    // Remove flat discipline fields from payload (they're now in disciplines[])
    for (const key of Object.keys(payload)) {
      if (key.startsWith("discipline_")) {
        delete payload[key];
      }
    }

    // Build projects array from dynamicGroup3
    const projects: Array<{
      id: string;
      label: string;
      detail: string;
      status: string;
      note: string;
    }> = [];
    for (const g of dynamicGroup3) {
      g.items.forEach((it, i) => {
        projects.push({
          id: it.key || String(i + 1),
          label: it.label,
          detail: "",
          status: it.status ?? "normal",
          note: "",
        });
      });
    }
    if (projects.length > 0) payload.projects = projects;

    // Remove old flat project key field if present
    if (payload.key) delete payload.key;

    if (opts?.approve) {
      payload.approved_status = "APPROVED";
      payload.approved_by = authEmployee?.employee_code || "ADMIN";
      payload.approved_at = new Date().toISOString();
    }

    try {
      await createReport(payload as any);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`เกิดข้อผิดพลาดในการบันทึก: ${msg}`);
    }
  };

  // Export current filled report area to PDF
  const handleExportPdf = async () => {
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = document.getElementById("mo-print");
      if (!element) return alert("ไม่พบพื้นที่สำหรับพิมพ์");
      const opt = {
        margin: 10,
        filename: `mo-report-${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      } as any;
      html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.warn("html2pdf failed", err);
      alert("ไม่สามารถส่งออกเป็น PDF ได้");
    }
  };

  // Approve + save shortcut for managers
  const handleApprove = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (!authEmployee?.position_id || authEmployee.position_id !== 1) {
      alert("คุณไม่มีสิทธิ์อนุมัติ");
      return;
    }
    await onSubmit(undefined, { approve: true });
  };

  // preview key for next new item in group2
  const nextGroup2Key = (() => {
    const g = dynamicGroup2.find((x) => x.key === "discipline");
    if (!g) return "discipline_custom_1";
    const customCount = g.items.filter((it) =>
      it.key.startsWith("discipline_custom_"),
    ).length;
    return `discipline_custom_${customCount + 1}`;
  })();

  // preview key for next new item in group3
  const nextGroup3Key = (() => {
    const g = dynamicGroup3.find((x) => x.key === "projects");
    if (!g) return "1";
    return String(g.items.length + 1);
  })();

  return (
    <div className={styles["guts-Mo-layout"]}>
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
                {g.items.map((r, i) => (
                  <tr key={r.key}>
                    <td className={styles["first-column-cell"]}>
                      {idx + 1}.{i + 1}
                    </td>
                    <td className={styles["second-column-cell"]}>{r.label}</td>
                    <td
                      className={`${styles["third-column-cell"]} ${String(counts[r.key] ?? "0").length > 4 ? styles["third-column-wrap-cell"] : ""}`}
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

      {/* add from group2 row */}
      <div className={styles["sector-table-wrapper"]}>
        <table className={styles["mo-table"]}>
          <thead>
            <tr>
              <th
                colSpan={4}
                className={`${styles["mo-pluse-button-header"]} ${styles["mo-table-header-white"]}`}
              >
                <div
                  className={styles["plus-header-fullwidth"]}
                  style={{ cursor: "pointer" }}
                  onClick={openAddGroup2}
                >
                  <PlusIcon className={styles["pin-icon"]} />
                  <span>กดปุ่มเพิ่มข้อมูลวินัยและการลงโทษ</span>
                </div>
              </th>
            </tr>
          </thead>
        </table>
      </div>

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
                        5.
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
                    <tr>
                      <td className={styles["first-column-cell"]}>
                        {nextGroup2Key}
                      </td>
                      <td
                        className={`${styles["second-column-cell"]} ${styles["textarea-cell"]}`}
                        colSpan={2}
                      >
                        <textarea
                          ref={labelInputRef as any}
                          className={`${styles["third-column-textarea"]} ${styles["textarea-left"]}`}
                          value={newGroup2Label}
                          rows={1}
                          onChange={handleLabelChange}
                          onPaste={(e) => {
                            /* allow any text paste */
                          }}
                          onFocus={handleLabelFocus}
                          onKeyDown={handleLabelKeyDown}
                          onBlur={(e) =>
                            adjustTextareaHeight(
                              e.target as HTMLTextAreaElement,
                            )
                          }
                          placeholder="เช่น รองเท้าผิดระเบียบ"
                        />
                      </td>

                      <td className={styles["third-column-cell"]}>
                        <textarea
                          ref={inputRef as any}
                          className={`${styles["third-column-textarea"]}`}
                          value={
                            editingKey === nextGroup2Key
                              ? editingRaw
                              : getDisplayValue(nextGroup2Key)
                          }
                          rows={1}
                          onChange={(e) =>
                            handleTextareaChange(nextGroup2Key, e)
                          }
                          onPaste={(e) => handleTextareaPaste(nextGroup2Key, e)}
                          onFocus={(e) => handleTextareaFocus(nextGroup2Key, e)}
                          onKeyDown={(e) =>
                            handleTextareaKeyDown(nextGroup2Key, e)
                          }
                          onBlur={() => handleTextareaBlur(nextGroup2Key)}
                        />
                      </td>
                      <td className={styles["fourth-column-cell"]}>คน</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles["modal-footer"]}>
              <button
                type="button"
                className={styles["btn-secondary"]}
                onClick={() => setShowAddGroup2(false)}
              >
                ปิดหน้าจอ
              </button>
              <button
                type="button"
                className={styles["btn-primary"]}
                onClick={addItemToGroup2}
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
                  {g.key}.
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
                {g.items.map((r, i) => (
                  <tr key={r.key}>
                    <td className={styles["first-column-cell"]}>
                      {idx + 1}.{i + 1}
                    </td>
                    <td className={styles["second-column-cell"]}>{r.label}</td>
                    <td
                      className={`${styles["third-column-cell"]} ${String(counts[r.key] ?? "0").length > 4 ? styles["third-column-wrap-cell"] : ""}`}
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
                      className={`${styles["fourth-column-cell"]} ${g.key === "discipline" ? styles["fourth-column-cell-danger"] : ""}`}
                    >
                      {r.unit}
                    </td>
                    <td
                      className={`${styles["five-column-cell"]} ${g.key === "discipline" ? styles["five-column-cell-danger"] : ""}`}
                    >
                      {g.key === "discipline" ? "ลบ" : r.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      ))}

      {/* add from group3 row */}
      <div className={styles["sector-table-wrapper"]}>
        <table className={styles["mo-table"]}>
          <thead>
            <tr>
              <th
                colSpan={4}
                className={`${styles["mo-pluse-button-header"]} ${styles["mo-table-header-white"]}`}
              >
                <div
                  className={styles["plus-header-fullwidth"]}
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
                  <PlusIcon className={styles["pin-icon"]} />
                  <span>กดปุ่มเพิ่มข้อมูลเข้าพบผู้ว่าจ้าง</span>
                </div>
              </th>
            </tr>
          </thead>
        </table>
      </div>

      {/* Add item modal (appears when 'add from group3  header' clicked) */}
      {showAddGroup3 && (
        <div
          className={styles["modal-overlay"]}
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            // click backdrop to close
            if (e.target === e.currentTarget) setShowAddGroup3(false);
          }}
        >
          <div
            className={styles["modal"]}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={styles["modal-header"]}>
              <h3>เพิ่มข้อมูลเข้าพบผู้ว่าจ้าง</h3>
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
                        {nextGroup3Key}
                      </td>
                      <td
                        className={`${styles["group3-second-column-cell"]} ${styles["second-column-cell-left"]}`}
                      >
                        โครงการ XXXXX
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
                          value={newGroup2Label}
                          rows={1}
                          onChange={handleLabelChange}
                          onPaste={(e) => {
                            /* allow any text paste */
                          }}
                          onFocus={handleLabelFocus}
                          onKeyDown={handleLabelKeyDown}
                          onBlur={(e) =>
                            adjustTextareaHeight(
                              e.target as HTMLTextAreaElement,
                            )
                          }
                          placeholder="เช่น รองเท้าผิดระเบียบ"
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
                              name="newGroup2Option"
                              value="normal"
                              checked={newGroup2Option === "normal"}
                              onChange={handleNewGroup2OptionChange}
                              className={styles["radio-input"]}
                            />
                            <span>ปกติ</span>
                          </label>
                          <label className={styles["radio-item"]}>
                            <input
                              type="radio"
                              name="newGroup2Option"
                              value="low"
                              checked={newGroup2Option === "low"}
                              onChange={handleNewGroup2OptionChange}
                              className={styles["radio-input"]}
                            />
                            <span>ต่ำ</span>
                          </label>
                          <label className={styles["radio-item"]}>
                            <input
                              type="radio"
                              name="newGroup2Option"
                              value="emergency"
                              checked={newGroup2Option === "emergency"}
                              onChange={handleNewGroup2OptionChange}
                              className={styles["radio-input"]}
                            />
                            <span>ฉุกเฉิน</span>
                          </label>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className={styles["first-column-cell"]}>หมายเหตุ</td>
                      <td
                        className={`${styles["second-column-cell"]} ${styles["textarea-cell"]}`}
                        colSpan={2}
                      >
                        <textarea
                          ref={labelInputRef as any}
                          className={`${styles["group3-popup-third-column-textarea2"]} ${styles["textarea-left"]}`}
                          value={newGroup2Label}
                          rows={1}
                          onChange={handleLabelChange}
                          onPaste={(e) => {
                            /* allow any text paste */
                          }}
                          onFocus={handleLabelFocus}
                          onKeyDown={handleLabelKeyDown}
                          onBlur={(e) =>
                            adjustTextareaHeight(
                              e.target as HTMLTextAreaElement,
                            )
                          }
                          placeholder="เช่น รองเท้าผิดระเบียบ"
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
                onClick={() => setShowAddGroup3(false)}
              >
                ปิดหน้าจอ
              </button>
              <button
                type="button"
                className={styles["btn-primary"]}
                onClick={addItemToGroup3}
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* dynamic sections rendered from group3 (use group3Data which is filtered by transaction id) */}
      {group3Data.map((g, idx) => (
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
                  {g.key}.
                </th>
                <th
                  colSpan={4}
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
                {g.items.map((r, i) => (
                  <tr key={r.key}>
                    <td className={styles["first-column-cell"]}>
                      {idx + 1}.{i + 1}
                    </td>
                    <td className={styles["group3-second-column-cell"]}>
                      {r.label}
                    </td>
                    <td
                      className={`${styles["group3-third-column-cell"]} ${styles[`status-${(r as any).status ?? statusOptions[rowStatus[r.key] ?? 0].key}`]} `}
                      onClick={() => cycleStatus(r.key)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          cycleStatus(r.key);
                        }
                      }}
                    >
                      {(() => {
                        const key =
                          (r as any).status ??
                          statusOptions[rowStatus[r.key] ?? 0].key;
                        const opt =
                          statusOptions.find((s) => s.key === key) ??
                          statusOptions[0];
                        return opt.label;
                      })()}
                    </td>
                    <td className={`${styles["group3-fourth-column-cell"]} `}>
                      <button
                        type="button"
                        className={styles["action-link"]}
                        onClick={() => handleOpenRow(r.key)}
                      >
                        คลิกดู
                      </button>
                    </td>
                    <td
                      className={`${styles["five-column-cell"]} ${styles["five-column-cell-danger"]}`}
                    >
                      ลบ
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      ))}
    </div>
  );
}
