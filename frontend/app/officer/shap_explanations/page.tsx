"use client";
import React, { useState } from "react";
import api from "../../../lib/api";

export default function SHAPPage() {
  const [appId, setAppId] = useState<number | null>(null);
  const [features, setFeatures] = useState<any[]>([]);

  const handleExplain = async () => {
    if (!appId) return;
    try {
      const res = await api.post("/model/explain", { loan_id: appId });
      setFeatures(res.data.top_features ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <section className="p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">SHAP Explanations</h2>
      <div className="flex gap-2 mb-4">
        <input
          type="number"
          placeholder="Enter Loan ID"
          className="border p-1 rounded"
          value={appId ?? ""}
          onChange={(e) => setAppId(parseInt(e.target.value))}
        />
        <button
          onClick={handleExplain}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Explain
        </button>
      </div>
      {features.length > 0 && (
        <ul className="list-disc list-inside">
          {features.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
