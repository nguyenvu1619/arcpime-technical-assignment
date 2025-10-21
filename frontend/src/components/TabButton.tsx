import React from "react";
import classNames from "../utils/classNames";

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={classNames(
      "px-4 py-2 rounded-xl text-sm",
      active ? "bg-indigo-600 text-white shadow" : "bg-white border hover:bg-gray-50"
    )}
  >
    {children}
  </button>
);

export default TabButton;


