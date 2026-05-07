import React, { useMemo, useState } from "react";
import "./LineChartSection.css";
import LineChart from "../charts/LineChart";
import caseData from "@/temp_data/case.json";

export default function LineChartSection() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number | null>(
    now.getFullYear(),
  );
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // derive groupBy automatically from selections
  const groupBy =
    selectedYear === null ? "year" : selectedMonth === null ? "month" : "day";
  const year = selectedYear ?? now.getFullYear();
  const month = selectedMonth ?? now.getMonth();

  const monthOptions = [
    { value: "all", label: "All" },
    ...Array.from({ length: 12 }).map((_, i) => ({
      value: i,
      label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(
        new Date(2020, i, 1),
      ),
    })),
  ];

  const availableYears = useMemo(() => {
    const years = new Set(
      (caseData as any[]).map((e: any) =>
        new Date(e.update_at || e.create_at).getFullYear(),
      ),
    );
    return Array.from(years).sort((a: any, b: any) => b - a);
  }, []);

  const chartResult = useMemo(() => {
    // Group definitions: aggregate multiple fields into high-level series
    const groups = [
      { key: "leave", test: (k: string) => /^leave_/.test(k) },
      { key: "shift", test: (k: string) => /^shift_/.test(k) },
      { key: "rule", test: (k: string) => /^rule_/.test(k) },
      { key: "wear", test: (k: string) => /^wear_/.test(k) },
    ];

    const map = new Map();

    caseData.forEach((entry) => {
      const d = new Date(entry.update_at || entry.create_at);
      // filtering based on selection
      if (groupBy === "month" || groupBy === "day") {
        if (d.getFullYear() !== Number(year)) return;
      }
      if (groupBy === "day") {
        if (d.getMonth() !== Number(month)) return;
      }

      let key = "";
      if (groupBy === "year") key = String(d.getFullYear());
      else if (groupBy === "month")
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      else {
        // Use local date formatting to avoid timezone issues
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }

      const prev: any = map.get(key) || {};

      // compute grouped values for this entry
      const grouped: Record<string, number> = {};
      groups.forEach((g) => (grouped[g.key] = 0));
      // ensure locations counter is initialized so it gets included in totals
      grouped.locations = 0;

      // aggregate fields into groups
      Object.keys(entry).forEach((field) => {
        const val = Number((entry as any)[field]) || 0;
        groups.forEach((g) => {
          if (g.test(field) && typeof val === "number") grouped[g.key] += val;
        });
      });

      // warning: count non-empty warning strings
      if (entry.warning && String(entry.warning).trim() !== "")
        grouped.warning = (grouped.warning || 0) + 1;
      else grouped.warning = grouped.warning || 0;

      // removed aggregation for other_counts, other_job, other_training, absent

      // combine rule + warning into a single 'issues' series
      grouped.issues = (grouped.rule || 0) + (grouped.warning || 0);
      // track unique locations per group using a Set on the running totals
      if (!prev._locationsSet) prev._locationsSet = new Set();
      if (entry.location) prev._locationsSet.add(String(entry.location));

      // ensure prev has numeric keys and add grouped values into totals (skip 'locations' placeholder)
      Object.keys(grouped).forEach((gk) => {
        if (gk === "locations") return;
        if (prev[gk] == null) prev[gk] = 0;
        prev[gk] += grouped[gk];
      });

      map.set(key, prev);
    });

    // Fill missing periods so chart shows complete sequence
    const ensureAllPeriods = () => {
      const fullKeys: string[] = [];
      
      if (groupBy === 'year') {
        // Show all available years
        availableYears.forEach(y => fullKeys.push(String(y)));
      } else if (groupBy === 'month') {
        // Show all 12 months for selected year
        for (let m = 0; m < 12; m++) {
          const key = `${year}-${String(m + 1).padStart(2, '0')}`;
          fullKeys.push(key);
        }
      } else {
        // Show all days in selected month
        const lastDay = new Date(Number(year), Number(month) + 1, 0).getDate();
        for (let d = 1; d <= lastDay; d++) {
          // Use local date formatting to avoid timezone issues
          const dayKey = `${year}-${String(Number(month) + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          fullKeys.push(dayKey);
        }
      }
      
      // Add missing keys with zero values
      fullKeys.forEach((k) => {
        if (!map.has(k)) {
          map.set(k, {
            leave: 0,
            shift: 0,
            rule: 0,
            wear: 0,
            issues: 0,
            warning: 0,
            locations: 0,
            _locationsSet: new Set()
          });
        }
      });
    };

    ensureAllPeriods();

    const data = Array.from(map.entries())
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB)) // Sort by original key FIRST
      .map(([k, v]: any) => {
        // convert _locationsSet to a numeric 'locations' count
        const locationsCount = v._locationsSet
          ? v._locationsSet.size
          : v.locations || 0;
        // format group label based on groupBy
        let label = k;
        if (groupBy === "month") {
          // "2026-02" → "Feb"
          const [y, m] = k.split("-");
          label = new Intl.DateTimeFormat("en-US", { month: "short" }).format(
            new Date(Number(y), Number(m) - 1, 1),
          );
        } else if (groupBy === "day") {
          // "2026-02-01" → "Feb 01"
          const d = new Date(k);
          label = new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "2-digit",
          }).format(d);
        }
        const copy = { group: label, ...v, locations: locationsCount };
        // remove internal set before returning
        delete copy._locationsSet;
        return copy;
      });
    // categories: leave, shift, rule, wear, other_job, other_training, absent, warning, other_counts
    // categories now include a single aggregated 'locations' series
    const categories = ["leave", "shift", "issues", "wear", "locations"];
    return { data, categories };
  }, [groupBy, year, month, availableYears]);

  return (
    <div className="mo-linechart">
      <div className="chart-controls">
        <select
          className="chart-pill-select"
          value={selectedYear ?? "all"}
          onChange={(e) => {
            if (e.target.value === "all") {
              setSelectedYear(null);
              setSelectedMonth(null);
            } else setSelectedYear(Number(e.target.value));
          }}
        >
          <option value="all">Year</option>
          {(availableYears as number[]).map((y) => (
            <option key={y} value={y}>
              Year -{y + 543}
            </option>
          ))}
        </select>

        <select
          className="chart-pill-select"
          value={selectedMonth ?? "all"}
          onChange={(e) => {
            if (e.target.value === "all") setSelectedMonth(null);
            else setSelectedMonth(Number(e.target.value));
          }}
          disabled={selectedYear === null}
        >
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <LineChart
        chartData={chartResult.data}
        chartCategories={chartResult.categories}
      />
    </div>
  );
}
