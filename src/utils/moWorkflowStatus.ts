export type MoWorkflowTone = "pending" | "approved" | "rejected";

export type MoWorkflowDisplayStatus = {
  label: string;
  tone: MoWorkflowTone;
  state: string;
  rank: string;
};

type MoWorkflowReport = {
  approved_status?: string | null;
  workflow_status?: string | null;
};

type MoWorkflowViewer = {
  position_id?: number | string | null;
};

const workflowPrefixes: Array<[string, string]> = [
  ["RETURNED_TO_", "RETURNED_TO"],
  ["WAITING_", "WAITING"],
  ["EDITING_", "EDITING"],
  ["APPROVED_", "APPROVED"],
];

export function parseMoWorkflowStatus(workflowStatus?: string | null) {
  const value = String(workflowStatus ?? "")
    .trim()
    .toUpperCase();

  for (const [prefix, state] of workflowPrefixes) {
    if (value.startsWith(prefix)) {
      return {
        state,
        rank: value.slice(prefix.length),
      };
    }
  }

  const index = value.lastIndexOf("_");
  if (index < 0) return { state: "", rank: "" };

  const rank = value.slice(0, index);
  const legacyState = value.slice(index + 1);
  if (legacyState === "PENDING") return { state: "WAITING", rank };
  if (legacyState === "REJECTED") return { state: "RETURNED_TO", rank };

  return { state: legacyState, rank };
}

export function getMoWorkflowRankLabel(rank?: string | null) {
  switch (String(rank ?? "").trim().toUpperCase()) {
    case "MANAGER":
      return "ผู้จัดการ";
    case "DIRECTOR":
      return "ผู้อำนวยการ";
    case "GM":
      return "GM";
    case "CEO":
      return "CEO";
    default:
      return "ผู้ใช้อื่น";
  }
}

export function getMoWorkflowRankByPositionId(
  positionId?: number | string | null,
) {
  const normalized = Number(positionId);
  if (!Number.isFinite(normalized)) return "";

  switch (normalized) {
    case 1:
    case 5:
      return "DIRECTOR";
    case 2:
    case 6:
      return "MANAGER";
    default:
      return "";
  }
}

function getNextMoWorkflowRank(rank?: string | null) {
  switch (String(rank ?? "").trim().toUpperCase()) {
    case "MANAGER":
      return "DIRECTOR";
    case "DIRECTOR":
      return "GM";
    case "GM":
      return "CEO";
    default:
      return "";
  }
}

function getRoleAwareWaitingLabel(rank: string, viewerRank: string) {
  if (rank === "GM" && viewerRank !== "GM") {
    return viewerRank === "DIRECTOR"
      ? "อนุมัติเรียบร้อยแล้ว"
      : `${getMoWorkflowRankLabel("DIRECTOR")}อนุมัติเรียบร้อยแล้ว`;
  }

  if (rank === viewerRank) {
    return "รอดำเนินการอนุมัติ";
  }

  return `รอ${getMoWorkflowRankLabel(rank)}อนุมัติ`;
}

function getRoleAwareReturnedLabel(rank: string, viewerRank: string) {
  if (rank === viewerRank) {
    return "กรุณาแก้ไขและส่งใหม่";
  }

  if (rank === "DIRECTOR" && viewerRank === "MANAGER") {
    return `${getMoWorkflowRankLabel("DIRECTOR")}อนุมัติเรียบร้อยแล้ว`;
  }

  const returnedByRank = getNextMoWorkflowRank(rank);
  if (returnedByRank) {
    return `${getMoWorkflowRankLabel(returnedByRank)}ส่งกลับให้${getMoWorkflowRankLabel(rank)}แก้ไข`;
  }

  return `ส่งกลับให้${getMoWorkflowRankLabel(rank)}แก้ไข`;
}

function getRoleAwareApprovedLabel(rank: string, viewerRank: string) {
  if (rank === viewerRank) {
    return "อนุมัติเรียบร้อยแล้ว";
  }

  return `${getMoWorkflowRankLabel(rank)}อนุมัติเรียบร้อยแล้ว`;
}

export function getMoWorkflowDisplayStatus(
  report?: MoWorkflowReport | null,
  viewer?: MoWorkflowViewer | null,
): MoWorkflowDisplayStatus {
  const approvedStatus = String(report?.approved_status ?? "PENDING")
    .trim()
    .toUpperCase();
  const { state, rank } = parseMoWorkflowStatus(report?.workflow_status);
  const rankLabel = getMoWorkflowRankLabel(rank);
  const viewerRank = getMoWorkflowRankByPositionId(viewer?.position_id);

  if (state === "WAITING") {
    return {
      label: getRoleAwareWaitingLabel(rank, viewerRank),
      tone: "pending",
      state,
      rank,
    };
  }

  if (state === "EDITING") {
    return {
      label: `${rankLabel}กำลังตรวจสอบแก้ไข`,
      tone: "pending",
      state,
      rank,
    };
  }

  if (state === "RETURNED_TO") {
    return {
      label: getRoleAwareReturnedLabel(rank, viewerRank),
      tone: "rejected",
      state,
      rank,
    };
  }

  if (state === "APPROVED") {
    return {
      label: getRoleAwareApprovedLabel(rank, viewerRank),
      tone: "approved",
      state,
      rank,
    };
  }

  if (approvedStatus === "APPROVED") {
    return {
      label: "อนุมัติเรียบร้อยแล้ว",
      tone: "approved",
      state,
      rank,
    };
  }

  if (approvedStatus === "REJECTED") {
    return {
      label: "รอการดำเนินการแก้ไข",
      tone: "rejected",
      state,
      rank,
    };
  }

  return {
    label: "รอการอนุมัติ",
    tone: "pending",
    state,
    rank,
  };
}
