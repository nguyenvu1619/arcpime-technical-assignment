import React from "react";
import classNames from "../utils/classNames";

type ConfidenceLevel = "high" | "medium" | "low";

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
}

const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ level }) => {
  const map = {
    high: { label: "High", cls: "bg-emerald-100 text-emerald-800" },
    medium: { label: "Medium", cls: "bg-amber-100 text-amber-800" },
    low: { label: "Low", cls: "bg-rose-100 text-rose-800" },
  } as const;

  return (
    <span className={classNames("px-2 py-0.5 rounded-full text-xs font-medium", map[level].cls)}>
      {map[level].label}
    </span>
  );
};

export default ConfidenceBadge;


