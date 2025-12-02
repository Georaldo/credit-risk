// components/FeatureForm.tsx
"use client";
import React from "react";

export default function FeatureForm({
  features,
  values,
  onChange,
}: {
  features: string[];
  values: Record<string, any>;
  onChange: (k: string, v: any) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {features.map((f) => (
        <div key={f} className="flex flex-col">
          <label className="text-sm font-medium text-slate-700 mb-1">{f}</label>
          <input
            className="border rounded p-2"
            value={values[f] ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              const n = Number(v);
              onChange(f, v === "" ? "" : Number.isNaN(n) ? v : n);
            }}
          />
        </div>
      ))}
    </div>
  );
}
