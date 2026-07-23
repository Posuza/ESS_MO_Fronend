import type { Group } from "../constant/SummaryGroups";
import type { SummaryColumn } from "./BodyContentLayout";
import {
  displayTableValue,
  divisionHeaderLabel,
  guardMovementStatusCount,
  itemValue,
  projectStatusCount,
  statusTextColor,
} from "./SummaryValue";

type RenderSummaryTableProps = {
  group: Group;
  groupIndex: number;
  columns: SummaryColumn[];
};

export function RenderSummaryTable({
  group,
  groupIndex,
  columns,
}: RenderSummaryTableProps) {
  const itemOffset = group._itemOffset ?? 0;
  const cellStyle: React.CSSProperties = {
    border: "1px solid #d0d0d0",
    height: 16,
    padding: "1px 2px",
    fontSize: 6,
    lineHeight: "14px",
    verticalAlign: "middle",
  };
  const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    background: "#d9d9d9",
    backgroundColor: "#d9d9d9",
    fontWeight: 700,
    fontSize: 7,
  };
  const whiteHeaderCellStyle: React.CSSProperties = {
    ...cellStyle,
    background: "#fff",
    backgroundColor: "#fff",
    fontWeight: 700,
    fontSize: 6,
    height: 18,
    padding: "3px 1px",
    lineHeight: "10px",
    textAlign: "center",
  };
  const divisionHeaderCellStyle: React.CSSProperties = {
    ...whiteHeaderCellStyle,
    whiteSpace: "nowrap",
  };

  const rows = group.items.map((item, index) => {
    const perDivision = columns.map((column) => {
      if (group.key === "guard_movements") {
        return guardMovementStatusCount(column.report, item.status || item.key);
      }
      if (group.key === "meeting" && item.status) {
        return projectStatusCount(column.report, item.status || item.key);
      }
      return itemValue(column.report, group.key, item.key);
    });
    const total = perDivision.reduce((sum, value) => sum + (Number(value) || 0), 0);
    return { item, index, perDivision, total };
  });
  const displayRows =
    group.key === "meeting"
      ? rows.filter((row) => !row.item.status || row.total > 0)
      : group.key === "guard_movements"
        ? rows.filter((row) => row.total > 0)
        : rows;
  const showNoData =
    displayRows.length === 0 ||
    (group.key === "discipline" && rows.every((row) => row.total <= 0));

  return (
    <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
      <colgroup>
        <col style={{ width: 22 }} />
        <col />
        {columns.map((column) => (
          <col key={String(column.id)} style={{ width: 24 }} />
        ))}
        <col style={{ width: 24 }} />
        <col style={{ width: 36 }} />
      </colgroup>
      <thead>
        <tr>
          <th style={{ ...headerCellStyle, textAlign: "center" }}>{groupIndex}</th>
          <th colSpan={columns.length + 3} style={{ ...headerCellStyle, textAlign: "left" }}>
            {group.title}
          </th>
        </tr>
        {!showNoData && (
          <tr>
            <th colSpan={2} style={whiteHeaderCellStyle}>หัวข้อ</th>
            {columns.map((column) => (
              <th key={String(column.id)} style={divisionHeaderCellStyle}>
                {divisionHeaderLabel(column.division)}
              </th>
            ))}
            <th style={whiteHeaderCellStyle}>รวม</th>
            <th style={whiteHeaderCellStyle} />
          </tr>
        )}
      </thead>
      <tbody>
        {showNoData ? (
          <tr>
            <td colSpan={columns.length + 4} style={{ ...cellStyle, textAlign: "center" }}>
              {"<ไม่มีข้อมูล>"}
            </td>
          </tr>
        ) : (
          displayRows.map(({ item, index, perDivision, total }) => (
            <tr key={`${item.key}-${index}`}>
              <td style={{ ...cellStyle, textAlign: "center" }}>
                {groupIndex}.{itemOffset + index + 1}
              </td>
              <td style={{ ...cellStyle, color: statusTextColor(item.status) }}>
                {item.label}
              </td>
              {perDivision.map((value, columnIndex) => (
                <td key={columnIndex} style={{ ...cellStyle, textAlign: "center" }}>
                  {displayTableValue(value)}
                </td>
              ))}
              <td style={{ ...cellStyle, textAlign: "center" }}>
                {displayTableValue(total)}
              </td>
              <td style={{ ...cellStyle, textAlign: "center" }}>{item.unit ?? ""}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
