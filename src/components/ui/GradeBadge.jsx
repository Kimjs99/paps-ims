import { GRADE_COLORS, GRADE_LABELS } from "../../constants/paps";

export function GradeBadge({ grade, showLabel = false, size = "sm" }) {
  if (!grade) return <span className="text-gray-400 text-sm">-</span>;

  const sizeClass = size === "lg"
    ? "px-3 py-1 text-sm"
    : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold text-white ${sizeClass}`}
      style={{ backgroundColor: GRADE_COLORS[grade] }}
    >
      {grade}등급{showLabel && ` · ${GRADE_LABELS[grade]}`}
    </span>
  );
}
