import React, { useState, useRef, useEffect, useMemo } from "react";
import styles from "./MoSummariesForm.module.css";
import newCaseData from "../../temp_data/NewCase/newCase.json";
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
  const { createReport, authEmployee } = useStore();

  // sector / department selection
  // derive locations: prefer props.locations; otherwise derive from newCaseData.table1
  const derivedLocations: EmployeeLocation[] = (() => {
    try {
      const rows =
        newCaseData && Array.isArray((newCaseData as any).table1)
          ? (newCaseData as any).table1
          : [];
      const map: Record<string, Set<string>> = {};
      rows.forEach((r: any) => {
        const id = Number(r.department_id) || 0;
        const sub = (r.sub_location ? String(r.sub_location) : "").trim();
        if (!map[id]) map[id] = new Set();
        if (sub) map[id].add(sub);
      });
      return Object.keys(map).map((k) => ({
        id: Number(k),
        location: `Department ${k}`,
        sub_locations: Array.from(map[k]),
      }));
    } catch (e) {
      return [];
    }
  })();

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

  const selectedSectorName =
    locations.find((loc) => loc.id === selectedSector)?.location ?? "";

  // keep selectedSubLocation in sync when department changes
  useEffect(() => {
    const loc = locations.find((l) => l.id === selectedSector);
    const first = loc?.sub_locations?.[0] ?? "";
    setSelectedSubLocation((prev) =>
      prev && loc?.sub_locations?.includes(prev) ? prev : first,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSector]);

  // transaction ids available in the fixture (mo_daily_transaction_id) for the selected department
  const transactionIds = useMemo(() => {
    const rows = (newCaseData as any)?.table1 ?? [];
    const filtered = Array.isArray(rows)
      ? rows.filter(
          (r: any) => Number(r.department_id) === Number(selectedSector),
        )
      : [];
    const ids = Array.from(
      new Set(filtered.map((r: any) => r.mo_daily_transaction_id)),
    ).filter(Boolean);
    return ids as number[];
  }, [selectedSector]);

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

  const [sectorLocked, setSectorLocked] = useState(true);

  // Notes / textual fields (keep these)
  const [disciplineNote, setDisciplineNote] = useState("");
  const [otherNote, setOtherNote] = useState("");
  const [foundNote, setFoundNote] = useState("");
  const [trainNote, setTrainNote] = useState("");

  // confirmation dialog state
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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
      key: "1",
      title: "หน่วยงานที่รับผิดชอบ",
      items: [
        { key: "1.1", label: "จุดรักษาการณ์ :", unit: "หน่วยงาน" },
        { key: "1.2", label: "กำลังพลปัจจุบัน :", unit: "คน" },
        { key: "1.3", label: "ขาดตัวประจำ :", unit: "หน่วยงาน" },
        { key: "1.4", label: "ขาดกำลังพล :", unit: "คน" },
        { key: "1.5", label: "จัดกำลังพลเสริมพิเศษ :", unit: "คน" },
        { key: "1.6", label: "สรรหาผู้สมัครงานใหม่ :", unit: "คน" },
        { key: "1.7", label: "จำนวนหน่วยงานสำรองเวร :", unit: "หน่วย" },
        { key: "1.8", label: "จำนวนกำลังพลสำรองเวร :", unit: "นาย" },
      ],
    },
    {
      key: "2",
      title: "การลา",
      items: [
        { key: "2.1", label: "ลากิจ :", unit: "คน" },
        { key: "2.2", label: "ลาป่วย :", unit: "คน" },
        { key: "2.3", label: "ขาดงาน :", unit: "คน" },
        { key: "2.4", label: "หนีหาย :", unit: "คน" },
        { key: "2.5", label: "ลาออก :", unit: "คน" },
        { key: "2.6", label: "ไล่ออก :", unit: "คน" },
      ],
    },
    {
      key: "3",
      title: "การบริหารการควงเวร",
      items: [
        { key: "3.1", label: "18 ชั่วโมง :", unit: "คน" },
        { key: "3.2", label: "24 ชั่วโมง :", unit: "คน" },
        { key: "3.3", label: "36 ชั่วโมง :", unit: "คน" },
      ],
    },
    {
      key: "4",
      title: "อบรมและควบคุมหน้าที่งาน",
      items: [
        { key: "4.1", label: "อบรมเปลี่ยนผลัด :", unit: "หน่วยงาน" },
        { key: "4.2", label: "อบรมตามแผนงานที่กำหนด :", unit: "หน่วยงาน" },
        { key: "4.3", label: "ควบคุมหน้าที่งาน :", unit: "หน่วยงาน" },
      ],
    },
  ];

  const group2: Group[] = [
    {
      key: "5",
      title: "วินัยและการลงโทษ",
      items: [
        { key: "5.1", label: "เล่นโทรศัพท์มือถือ :", unit: "คน" },
        { key: "5.2", label: "ไม่มีเข็มขัด :", unit: "คน" },
        { key: "5.3", label: "ไม่แขวนบัตร :", unit: "คน" },
        { key: "5.4", label: "ชุดชำรุดเก่า :", unit: "คน" },
      ],
    },
  ];

  const group3: Group[] = [
    {
      key: "6",
      title: "เข้าพบผู้ว่าจ้าง",
      items: [
        {
          key: "6.1",
          label: "",
          status: "",
          unit: "หน่วยงาน",
        },
        {
          key: "6.2",
          label: "",
          status: "",
          unit: "หน่วยงาน",
        },
        {
          key: "6.3",
          label: "",
          status: "danger",
          unit: "หน่วยงาน",
        },
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
    // compute new key before mutating state so we can also initialize counts with any edited value
    const g = dynamicGroup2.find((x) => x.key === "5");
    const indices = g
      ? g.items.map((it) => Number(String(it.key).split(".")[1]) || 0)
      : [];
    const next = Math.max(0, ...indices) + 1;
    const newKey = `5.${next}`;
    const newItem = {
      key: newKey,
      label: newGroup2Label || "รายการใหม่",
      unit: newGroup2Unit || "คน",
    };

    setDynamicGroup2((prev) =>
      prev.map((pg) =>
        pg.key === "5" ? { ...pg, items: [...pg.items, newItem] } : pg,
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
    const g = dynamicGroup3.find((x) => x.key === "6");
    const indices = g
      ? g.items.map((it) => Number(String(it.key).split(".")[1]) || 0)
      : [];
    const next = Math.max(0, ...indices) + 1;
    const newKey = `6.${next}`;
    const newItem = {
      key: newKey,
      label: newGroup3Label || "รายการใหม่",
      status: "normal",
    };

    setDynamicGroup3((prev) =>
      prev.map((pg) =>
        pg.key === "6" ? { ...pg, items: [...pg.items, newItem] } : pg,
      ),
    );

    // initialize any counts (group3 doesn't currently use numeric counts but keep consistent)
    setCounts((prev) => ({
      ...prev,
      [newKey]: prev[newKey] ?? "0",
    }));

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

  // hydrate dynamicGroup3 from JSON filtered by selectedTransactionId
  useEffect(() => {
    try {
      const table4 = (newCaseData as any)?.table4 ?? [];
      const filtered = Array.isArray(table4)
        ? table4.filter(
            (it: any) => it.mo_daily_transaction_id === selectedTransactionId,
          )
        : [];

      if (filtered.length > 0) {
        const items = filtered.map((it: any) => ({
          key: it.key,
          label: it.label ?? it.detail ?? it.note ?? `รายการ ${it.key}`,
          status: it.status ?? "normal",
        }));
        setDynamicGroup3([{ key: "6", title: "เข้าพบผู้ว่าจ้าง", items }]);
      } else {
        setDynamicGroup3(group3);
      }
    } catch (e) {
      setDynamicGroup3(group3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTransactionId]);

  // Load data from newCase.json and initialize counts (will be populated when selectedTransactionId changes)
  const [counts, setCounts] = useState<CountState>({});

  // when selectedTransactionId changes, build counts from matching JSON rows
  useEffect(() => {
    const acc: CountState = {};
    if (selectedTransactionId == null) {
      setCounts(acc);
      return;
    }

    // group1 values come from table2 rows matching the transaction id (take first match)
    const table2Rows = (newCaseData as any)?.table2 ?? [];
    const t2match = table2Rows.find(
      (r: any) => r.mo_daily_transaction_id === selectedTransactionId,
    );
    if (t2match) {
      group1.forEach((g) => {
        g.items.forEach((it) => {
          acc[it.key] = t2match[it.key] || "0";
        });
      });
    }

    // group2 numeric values from table3 where mo_daily_transaction_id matches
    const table3Rows = (newCaseData as any)?.table3 ?? [];
    (table3Rows as any[])
      .filter((r) => r.mo_daily_transaction_id === selectedTransactionId)
      .forEach((item) => {
        acc[item.key] = item.value || "0";
      });

    // group3 keys: set to "0" (status handled separately)
    const table4Rows = (newCaseData as any)?.table4 ?? [];
    (table4Rows as any[])
      .filter((r) => r.mo_daily_transaction_id === selectedTransactionId)
      .forEach((item) => {
        acc[item.key] = acc[item.key] ?? "0";
      });

    setCounts(acc);
  }, [selectedTransactionId]);

  // group3Data: prefer JSON-backed table4 filtered by selectedTransactionId, otherwise fallback to static group3
  const group3Data = useMemo(() => {
    try {
      const table4 = (newCaseData as any)?.table4 ?? [];
      const filtered = Array.isArray(table4)
        ? table4.filter(
            (it: any) => it.mo_daily_transaction_id === selectedTransactionId,
          )
        : [];
      if (filtered.length > 0) {
        return [
          {
            key: "6",
            title: "เข้าพบผู้ว่าจ้าง",
            items: filtered.map((it: any) => ({
              key: it.key,
              label: it.label ?? it.detail ?? it.note ?? `รายการ ${it.key}`,
              status: it.status ?? "normal",
            })),
          },
        ] as Group[];
      }
    } catch (e) {
      // ignore and fall back
    }
    return group3;
  }, [selectedTransactionId]);

  // groupedCounts: derived mapping of group title -> { key: value }
  const groupedCounts = useMemo(() => {
    const out: Record<string, Record<string, string>> = {};

    // Process group1
    group1.forEach((g) => {
      out[g.title] = {};
      g.items.forEach((it) => {
        out[g.title][it.key] = counts[it.key] ?? "0";
      });
    });

    // Process group2 (dynamic)
    dynamicGroup2.forEach((g) => {
      if (!out[g.title]) {
        out[g.title] = {};
      }
      g.items.forEach((it) => {
        out[g.title][it.key] = counts[it.key] ?? "0";
      });
    });

    // Process group3 (use group3Data)
    group3Data.forEach((g) => {
      if (!out[g.title]) {
        out[g.title] = {};
      }
      g.items.forEach((it) => {
        out[g.title][it.key] = counts[it.key] ?? "0";
      });
    });

    return out;
  }, [counts, group3Data]);

  // helper to update counts by key (keeps flat counts as source-of-truth)
  const setCountByKey = (key: string, value: string) => {
    setCounts((prev) => ({ ...prev, [key]: value }));
  };

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingRaw, setEditingRaw] = useState<string>("");
  const [editingNormalized, setEditingNormalized] = useState<string>("0");

  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const labelInputRef = useRef<HTMLTextAreaElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // keep last valid digits-only value so we can reject invalid edits (e.g. scientific notation like 66e+22)
  const lastValidEditingRef = useRef<string>("0");
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

  // helper to normalize digits-only values
  const sanitizeDigits = (v: string) => {
    const digits = String(v || "").replace(/\D/g, "");
    if (digits === "") return "0";
    // strip leading zeros except keep single zero
    const normalized = digits.replace(/^0+/, "");
    return normalized === "" ? "0" : normalized;
  };

  // expand scientific notation like '3.452e+5' into full digits '345200'
  const expandScientificToDigits = (input: string) => {
    if (!input || typeof input !== "string") return input;
    const m = input.trim().match(/^([+-]?\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/);
    if (!m) return input;
    const intPart = m[1] || "";
    const fracPart = m[2] || "";
    const exp = parseInt(m[3] || "0", 10);
    // only handle non-negative exponent to produce integer digits
    if (isNaN(exp) || exp < 0) return sanitizeDigits(input);
    const mantissa = intPart + fracPart; // all digits
    const decimals = fracPart.length;
    const toPad = exp - decimals;
    if (toPad >= 0) {
      return mantissa + "0".repeat(toPad);
    }
    // exp < decimals: shift decimal within mantissa
    const splitAt = mantissa.length + toPad; // toPad is negative
    if (splitAt <= 0) {
      // fractional less than 1 -> result becomes 0... keep as '0'
      return "0";
    }
    return mantissa.slice(0, splitAt);
  };

  // sanitize any pre-existing counts on mount (in case invalid values were stored before)
  useEffect(() => {
    setCounts((prev) => {
      const next: CountState = {};
      Object.keys(prev).forEach((k) => {
        next[k] = sanitizeDigits(prev[k]);
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
      setEditingNormalized("0");
      lastValidEditingRef.current = "0";
      adjustTextareaHeight(el);
      return;
    }

    const digitsOnly = sanitized.replace(/\D/g, "");
    let normalizedDisplay: string;

    if (digitsOnly === "") {
      triggerWarning(key);
      setEditingRaw(raw);
      return;
    } else {
      const stripped = digitsOnly.replace(/^0+/, "");
      normalizedDisplay = stripped === "" ? "0" : stripped;
    }

    // update visible raw (controlled) and normalized value
    setEditingRaw(normalizedDisplay);
    setEditingNormalized(normalizedDisplay === "" ? "0" : normalizedDisplay);
    lastValidEditingRef.current =
      normalizedDisplay === "" ? "0" : normalizedDisplay;

    // update textarea height
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
      // nothing usable in paste
      e.preventDefault();
      triggerWarning(key);
      return;
    }

    // insert only digits from paste (normalize leading zeros)
    let normalized = digitsOnly.replace(/^0+/, "");
    if (normalized === "") normalized = "0";
    e.preventDefault();

    const el = e.target as HTMLTextAreaElement;
    el.value = normalized;
    setEditingRaw(normalized);
    setEditingNormalized(normalized);
    lastValidEditingRef.current = normalized;
    adjustTextareaHeight(el);
  };

  const handleTextareaFocus = (
    key: string,
    e: React.FocusEvent<HTMLTextAreaElement>,
  ) => {
    setEditingKey(key);
    const init = counts[key] ?? "0";
    // if stored value is in scientific notation, expand to full digits for editing/display
    const expanded = /[eE]/.test(String(init))
      ? expandScientificToDigits(String(init))
      : sanitizeDigits(String(init));

    setEditingRaw(expanded);
    setEditingNormalized(expanded);
    lastValidEditingRef.current = expanded;
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
      try {
        const valStr = /^[0-9]+$/.test(editingRaw)
          ? editingRaw || "0"
          : editingNormalized || "0";
        const base = BigInt(valStr);
        const next = String(base + 1n);
        setEditingRaw(next);
        setEditingNormalized(next);
        lastValidEditingRef.current = next;
      } catch {
        const valStr = /^[0-9]+$/.test(editingRaw)
          ? editingRaw || "0"
          : editingNormalized || "0";
        const base = Number(valStr);
        const next = String(base + 1);
        setEditingRaw(next);
        setEditingNormalized(next);
        lastValidEditingRef.current = next;
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      try {
        const valStr = /^[0-9]+$/.test(editingRaw)
          ? editingRaw || "0"
          : editingNormalized || "0";
        const base = BigInt(valStr);
        const prev = base > 0n ? String(base - 1n) : "0";
        setEditingRaw(prev);
        setEditingNormalized(prev);
        lastValidEditingRef.current = prev;
      } catch {
        const valStr = /^[0-9]+$/.test(editingRaw)
          ? editingRaw || "0"
          : editingNormalized || "0";
        const base = Number(valStr);
        const prev = String(Math.max(0, base - 1));
        setEditingRaw(prev);
        setEditingNormalized(prev);
        lastValidEditingRef.current = prev;
      }
    }
  };

  const handleTextareaBlur = (key: string) => {
    // if the raw editing content contains non-digits, restore the last normalized value and show warning
    if (!/^[0-9\n]*$/.test(editingRaw)) {
      const restore = editingNormalized || lastValidEditingRef.current || "0";
      setCounts((s) => ({ ...s, [key]: restore }));
      setEditingRaw(restore);
      triggerWarning(key);
    } else {
      const digits = (editingRaw || "").replace(/\n/g, "");
      // Strip leading zeros safely without losing precision via standard JS Number conversion
      let final = digits.replace(/^0+/, "");
      if (final === "") {
        final = "0";
      }
      setCounts((s) => ({ ...s, [key]: final }));
      setEditingRaw(final);
    }

    setEditingKey(null);
  };

  const normalizeNumber = (value: string) => {
    const num = Number(value);
    return Number.isNaN(num) ? 0 : num;
  };

  const normalizeText = (value: string) => value.trim();

  // helper to get display value for a key when NOT editing: expand scientific notation
  const getDisplayValue = (key: string) => {
    const v = String(counts[key] ?? "0");
    return /[eE]/.test(v) ? expandScientificToDigits(v) : sanitizeDigits(v);
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
  }, [counts, editingKey]);

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
    if (isDirty()) {
      setShowConfirmCancel(true);
    } else {
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

    // Build payload that preserves group structure (group1, group2, group3)
    const payload: Record<string, unknown> = {
      department_id: selectedSector,
      groups: {
        group1: group1.map((g) => ({
          key: g.key,
          title: g.title,
          items: g.items.map((it) => ({
            key: it.key,
            label: it.label,
            unit: (it as any).unit ?? null,
            value: counts[it.key] ?? "0",
          })),
        })),
        group2: dynamicGroup2.map((g) => ({
          key: g.key,
          title: g.title,
          items: g.items.map((it: any) => ({
            key: it.key,
            label: it.label,
            unit: it.unit ?? null,
            value: counts[it.key] ?? "0",
          })),
        })),
        group3: dynamicGroup3.map((g: any) => ({
          key: g.key,
          title: g.title,
          items: g.items.map((it: any) => ({
            key: it.key,
            label: it.label,
            status:
              (it as any).status ?? statusOptions[rowStatus[it.key] ?? 0].key,
            value: counts[it.key] ?? "0",
          })),
        })),
      },

      notes: {
        warning: disciplineNote,
        other_job: foundNote,
        other_training: trainNote,
        other_extral: otherNote,
        sub_location: selectedSubLocation,
      },

      created_by: authEmployee?.employee_code || props.empCode || "ADMIN",
    };

    if (opts?.approve) {
      // include approval fields if requested
      payload.approved_status = "APPROVED";
      payload.approved_by = authEmployee?.employee_code || "ADMIN";
      payload.approved_at = new Date().toISOString();
    }

    try {
      await createReport(payload as any);
      setShowSuccess(true);
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
    const g = dynamicGroup2.find((x) => x.key === "5");
    if (!g) return "5.1";
    const indices = g.items.map((it) => {
      const parts = String(it.key).split(".");
      return Number(parts[1]) || 0;
    });
    const next = Math.max(0, ...indices) + 1;
    return `${g.key}.${next}`;
  })();

  // preview key for next new item in group3
  const nextGroup3Key = (() => {
    const g = dynamicGroup3.find((x) => x.key === "6");
    if (!g) return "6.1";
    const indices = g.items.map((it) => {
      const parts = String(it.key).split(".");
      return Number(parts[1]) || 0;
    });
    const next = Math.max(0, ...indices) + 1;
    return `${g.key}.${next}`;
  })();

  return (
    <div className={styles["guts-Mo-layout"]}>
      <div className={`${styles["mo-tables-wrapper"]}`}>
        {/* dynamic sections rendered from group1 */}
        {group1.map((g, idx) => {
          // compute location columns once per group (used for header colspan and body)
          const table1Rows = (newCaseData as any)?.table1 ?? [];
          const cols = table1Rows.filter(
            (row: any) => Number(row.department_id) === Number(selectedSector),
          );

          // total columns per row = 1 (index) + 1 (label) + cols.length + 1 (total) + 1 (unit)
          // group header should span all columns except the leading index column, so colspan = (totalCols - 1)
          // add 2 extra default columns as buffer so the header never appears shorter when tbody is collapsed
          const headerColSpan = cols.length + 3 + 2; // cols.length + 5

          return (
            <div
              key={g.key}
              ref={wrapperRef}
              className={styles["mo-table-wrapper"]}
            >
              {/* build columns from table1 (sub-locations) for the selected department */}
              <table className={styles["mo-table"]}>
                <thead>
                  <tr>
                    <th
                      colSpan={1}
                      className={`${styles["first-column-cell"]} ${styles["no-border"]}`}
                    >
                      {idx + 1}.
                    </th>

                    {/* group title cell (expander) */}
                    <th
                      colSpan={headerColSpan}
                      className={`${styles["mo-table-header"]} ${styles["no-border"]}`}
                    >
                      <div className={`${styles["mo-header"]}`}>
                        <p>{g.title}</p>
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {/* location header row inside tbody (moved from thead) */}
                  <tr key={`loc-header-${g.key}`}>
                    <td
                      colSpan={2}
                      className={` ${styles["second-column-header-cell"]} `}
                    >
                      <strong>หัวข้อ</strong>
                    </td>
                    {cols.map((c: any) => (
                      <td
                        key={String(c.mo_daily_transaction_id)}
                        className={`${styles["third-column-header1-cell"]}`}
                      >
                        <strong>{c.sub_location}</strong>
                      </td>
                    ))}
                    <td className={`${styles["third-column-header2-cell"]}`}>
                      <strong>รวม</strong>
                    </td>
                    <td
                      className={`${styles["fourth-column-header-cell"]}`}
                    ></td>
                  </tr>

                  {g.items.map((r, i) => {
                    // collect per-location values and compute total
                    const perLocVals = cols.map((c: any) => {
                      const t2rows = (newCaseData as any)?.table2 ?? [];
                      const match = (t2rows as any[]).find(
                        (t) =>
                          Number(t.mo_daily_transaction_id) ===
                          Number(c.mo_daily_transaction_id),
                      );
                      return match ? String(match[r.key] ?? "0") : "0";
                    });

                    const total = perLocVals.reduce((acc, v) => {
                      const n = Number(v) || 0;
                      return acc + n;
                    }, 0);

                    return (
                      <tr key={r.key}>
                        <td className={styles["first-column-cell"]}>
                          {idx + 1}.{i + 1}
                        </td>
                        <td className={styles["second-column-cell"]}>
                          {r.label}
                        </td>

                        {perLocVals.map((val, i) => (
                          <td
                            key={i}
                            className={`${styles["third-column-cell"]} ${String(val).length > 4 ? styles["third-column-wrap-cell"] : ""}`}
                          >
                            <div className={`${styles["third-column-text"]}`}>
                              {val}
                            </div>
                          </td>
                        ))}

                        <td className={`${styles["third-column-cell"]}`}>
                          <div className={`${styles["third-column-text"]}`}>
                            {String(total)}
                          </div>
                        </td>

                        <td className={`${styles["fourth-column-cell"]}`}>
                          {r.unit}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}

        {dynamicGroup2.map((g, idx) => {
          // compute location columns for dynamic group similar to group1
          const table1Rows = (newCaseData as any)?.table1 ?? [];
          const cols = table1Rows.filter(
            (row: any) => Number(row.department_id) === Number(selectedSector),
          );

          const headerColSpan = cols.length + 3 + 2;

          return (
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
                      colSpan={headerColSpan}
                      className={`${styles["mo-table-header"]} ${styles["mo-table-header-red"]} ${styles["no-border"]}`}
                    >
                      <div className={`${styles["mo-header"]}`}>
                        <p
                          className={
                            g.key === "5" ? styles["mo-header-red-text"] : ""
                          }
                        >
                          {g.title}
                        </p>
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {/* location header row inside tbody (moved from thead) */}
                  <tr key={`loc-header-${g.key}`}>
                    <td
                      colSpan={2}
                      className={` ${styles["second-column-header-cell"]} `}
                    >
                      <strong>หัวข้อ</strong>
                    </td>
                    {cols.map((c: any) => (
                      <td
                        key={String(c.mo_daily_transaction_id)}
                        className={`${styles["third-column-header1-cell"]}`}
                      >
                        <strong>{c.sub_location}</strong>
                      </td>
                    ))}
                    <td className={`${styles["third-column-header2-cell"]}`}>
                      <strong>รวม</strong>
                    </td>
                    <td
                      className={`${styles["fourth-column-header-cell"]}`}
                    ></td>
                  </tr>

                  {g.items.map((r, i) => {
                    // collect per-location values from table3 (dynamic group uses table3 fixture)
                    const perLocVals = cols.map((c: any) => {
                      const t3rows = (newCaseData as any)?.table3 ?? [];
                      const match = (t3rows as any[]).find(
                        (t) =>
                          Number(t.mo_daily_transaction_id) ===
                            Number(c.mo_daily_transaction_id) &&
                          String(t.key) === String(r.key),
                      );
                      return match ? String(match.value ?? "0") : "0";
                    });

                    // total is either existing count (editable) or sum of perLocVals if no count present
                    const totalFromTable = perLocVals.reduce(
                      (acc, v) => acc + (Number(v) || 0),
                      0,
                    );

                    return (
                      <tr key={r.key}>
                        <td className={styles["first-column-cell"]}>
                          {idx + 1}.{i + 1}
                        </td>
                        <td className={styles["second-column-cell"]}>
                          {r.label}
                        </td>

                        {perLocVals.map((val, i) => (
                          <td
                            key={i}
                            className={`${styles["third-column-cell"]} ${String(val).length > 4 ? styles["third-column-wrap-cell"] : ""}`}
                          >
                            <div className={`${styles["third-column-text"]}`}>
                              {val}
                            </div>
                          </td>
                        ))}

                        <td className={`${styles["third-column-cell"]}`}>
                          <div className={`${styles["third-column-text"]}`}>
                            {String(totalFromTable)}
                          </div>
                        </td>

                        <td
                          className={`${styles["fourth-column-cell"]} ${styles["fourth-column-cell-danger"]}`}
                        >
                          {r.unit}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}

        {/* dynamic sections rendered from group3 (use group3Data which is filtered by transaction id) */}
        {group3Data.map((g) => {
          const table1Rows = (newCaseData as any)?.table1 ?? [];
          const cols = table1Rows.filter(
            (row: any) => Number(row.department_id) === Number(selectedSector),
          );

          const headerColSpan = cols.length + 3 + 2;

          return (
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
                      colSpan={headerColSpan}
                      className={`${styles["mo-table-header"]} ${styles["no-border"]}`}
                    >
                      <div className={`${styles["mo-header"]}`}>
                        <p className={styles["mo-header-red-text"]}>
                          {g.title}
                        </p>
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {/* location header row inside tbody (moved from thead) */}
                  <tr key={`loc-header-${g.key}`}>
                    <td
                      colSpan={2}
                      className={` ${styles["second-column-header-cell"]} `}
                    >
                      <strong>หัวข้อ</strong>
                    </td>
                    {cols.map((c: any) => (
                      <td
                        key={String(c.mo_daily_transaction_id)}
                        className={`${styles["third-column-header1-cell"]}`}
                      >
                        <strong>{c.sub_location}</strong>
                      </td>
                    ))}
                    <td className={`${styles["third-column-header2-cell"]}`}>
                      <strong>รวม</strong>
                    </td>
                    <td
                      className={`${styles["fourth-column-header-cell"]}`}
                    ></td>
                  </tr>

                  {statusOptions.map((s, si) => {
                    const rowKey = `${g.key}.${si + 1}`;

                    const table4Rows = (newCaseData as any)?.table4 ?? [];
                    // count how many table4 rows for each sub-location column have this status
                    const perLocVals = cols.map((c: any) => {
                      const matches = (table4Rows as any[]).filter(
                        (t) =>
                          Number(t.mo_daily_transaction_id) ===
                            Number(c.mo_daily_transaction_id) &&
                          String(t.key).startsWith(`${g.key}.`) &&
                          (t.status ??
                            statusOptions[rowStatus[t.key] ?? 0].key) === s.key,
                      );
                      return String(matches.length ?? 0);
                    });

                    const totalForStatus = perLocVals.reduce(
                      (acc, v) => acc + (Number(v) || 0),
                      0,
                    );

                    return (
                      <tr key={rowKey}>
                        <td className={styles["first-column-cell"]}>
                          {rowKey}
                        </td>

                        <td
                          className={`${styles["group3-second-column-cell"]} ${styles[`status-${s.key}`]}`}
                        >
                          {s.label}
                        </td>

                        {perLocVals.map((val, i) => (
                          <td
                            key={i}
                            className={`${styles["third-column-cell"]} ${String(val).length > 4 ? styles["third-column-wrap-cell"] : ""}`}
                          >
                            <div className={`${styles["third-column-text"]}`}>
                              {val}
                            </div>
                          </td>
                        ))}

                        <td className={`${styles["third-column-cell"]}`}>
                          <div className={`${styles["third-column-text"]}`}>
                            {String(totalForStatus)}
                          </div>
                        </td>

                        <td className={`${styles["fourth-column-cell"]}`}>
                          หน่วยงาน
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
