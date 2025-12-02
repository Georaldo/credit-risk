"use client";
import React from "react";
import { useAuth } from "../lib/auth";

export type OfficerTab = "overview" | "models" | "predict" | "shap";

interface SidebarProps {
  activeTab: OfficerTab;
  setTab: (tab: OfficerTab) => void;
  role: "loan_officer";
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setTab }) => {
  const { user } = useAuth();

  const menuItems: { label: string; tab: OfficerTab }[] = [
    { label: "Overview", tab: "overview" },
    { label: "Model Management", tab: "models" },
    { label: "Predictions", tab: "predict" },
    { label: "SHAP Explanations", tab: "shap" },
  ];

  return (
    <aside className="w-64 bg-white border-r min-h-screen p-4">
      <h2 className="text-lg font-semibold mb-4">Menu</h2>
      <ul className="flex flex-col gap-2">
        {menuItems.map((item) => (
          <li key={item.tab}>
            <button
              onClick={() => setTab(item.tab)}
              className={`block w-full text-left px-3 py-2 rounded ${
                activeTab === item.tab ? "bg-indigo-600 text-white" : "hover:bg-slate-100"
              }`}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default Sidebar;
