"use client";
import React, { useState } from "react";
import api from "../../lib/api";
import { useToasts } from "../../components/Toast";

export default function SHAPPanel() {
  const { pushToast } = useToasts();
  const [loanId, setLoanId] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleExplain() {
    if (!loanId) return pushToast({ type: "error", message: "Enter a Loan ID." });
    setLoading(true);
    try {
      const res = await api.post("/model/explain", { loan_id: loanId });
      setFeatures(res.data.top_features || []);
      pushToast({ type: "success", message: `SHAP explanation loaded for Loan #${loanId}.` });
    } catch (err) {
      console.error(err);
      pushToast({ type: "error", message: "Failed to get SHAP explanation." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">SHAP Explanations</h2>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Loan ID"
          value={loanId}
          onChange={(e) => setLoanId(e.target.value)}
          className="border px-3 py-1 rounded flex-1"
        />
        <button
          onClick={handleExplain}
          className="px-4 py-1 bg-purple-600 text-white rounded"
        >
          Explain
        </button>
      </div>
      {loading && <p>Loading explanation...</p>}
      {features.length > 0 && (
        <ul className="mt-2 list-disc list-inside bg-slate-50 p-4 rounded">
          {features.map((f, idx) => (
            <li key={idx}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
