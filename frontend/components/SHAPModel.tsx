// components/SHAPModal.tsx
"use client";
import React from "react";
import SHAPChart from "./SHAPChart";

export default function SHAPModel({
  open,
  onClose,
  features,
}: {
  open: boolean;
  onClose: () => void;
  features: { feature: string; impact: number }[];
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Model Explanation (SHAP)</h3>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900">
            Close
          </button>
        </div>

        <SHAPChart features={features} />

        <div className="mt-6 grid grid-cols-2 gap-4">
          {features.map((f) => (
            <div key={f.feature} className="flex justify-between items-center p-3 bg-slate-50 rounded">
              <div className="text-sm font-medium">{f.feature}</div>
              <div className="text-sm font-mono">{Number(f.impact).toFixed(4)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
