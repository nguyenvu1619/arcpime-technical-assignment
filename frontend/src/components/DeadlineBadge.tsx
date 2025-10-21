import React from "react";
import classNames from "../utils/classNames";

interface DeadlineBadgeProps {
  date: string | null;
}

const DeadlineBadge: React.FC<DeadlineBadgeProps> = ({ date }) => {
  if (!date) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">No deadline</span>
    );
  }

  const today = new Date();
  const due = new Date(date);
  const diffMs = due.getTime() - today.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let cls = "bg-sky-100 text-sky-800"; // > 60 days => blue
  if (days <= 30) cls = "bg-rose-100 text-rose-800"; // <= 30 => red
  else if (days <= 60) cls = "bg-amber-100 text-amber-800"; // <= 60 => yellow

  return (
    <span className={classNames("px-2 py-0.5 rounded-full text-xs", cls)}>
      {new Date(date).toLocaleDateString()}
    </span>
  );
};

export default DeadlineBadge;


