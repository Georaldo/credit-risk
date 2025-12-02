// components/officer/PredictionPanel.tsx
"use client";

import React, { useState } from "react";
import api from "../../../lib/api";
import { useToasts } from "../../../components/Toast";

type FeaturesInput = {
  person_age: number;
  person_income: number;
  person_home_ownership: string;
  person_emp_length: number;
  loan_intent: string;
  loan_grade: string;
  loan_amnt: number;
  loan_int_rate: number;
  loan_percent_income: number;
  cb_person_default_on_file: string;
  cb_person_cred_hist_length: number;
};

export default function PredictionPanel() {
  const { pushToast } = useToasts();
  const [input, setInput] = useState<FeaturesInput>({
    person_age: 30,
    person_income: 5000,
    person_home_ownership: "RENT",
    person_emp_length: 3,
    loan_intent: "PERSONAL",
    loan_grade: "B",
    loan_amnt: 10000,
    loan_int_rate: 5,
    loan_percent_income: 20,
    cb_person_default_on_file: "N",
    cb_person_cred_hist_length: 5,
  });
  const [result, setResult] = useState<{ predicted_score: number; predicted_label: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (key: keyof FeaturesInput, value: string | number) => {
    setInput((prev) => ({ ...prev, [key]: value }));
  };

  const handlePredict = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post("/model/predict", input);
      setResult({
        predicted_score: res.data.prediction,
        predicted_label: res.data.prediction === 1 ? "Bad" : "Good",
      });
      pushToast({ type: "success", message: "Prediction generated successfully!" });
    } catch (err: any) {
      console.error(err);
      pushToast({ type: "error", message: err.response?.data?.detail || "Prediction failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Predictions</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {Object.entries(input).map(([key, value]) => (
          <div key={key}>
            <label className="block font-semibold capitalize">{key.replace(/_/g, " ")}</label>
            <input
              type={typeof value === "number" ? "number" : "text"}
              className="border p-1 rounded w-full"
              value={value}
              onChange={(e) =>
                handleChange(key as keyof FeaturesInput, typeof value === "number" ? Number(e.target.value) : e.target.value)
              }
            />
          </div>
        ))}
      </div>

      <button
        onClick={handlePredict}
        disabled={loading}
        className={`px-4 py-2 rounded text-white ${loading ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"}`}
      >
        {loading ? "Predicting..." : "Predict"}
      </button>

      {result && (
        <div className="mt-4 p-4 bg-slate-100 rounded">
          <p>
            <strong>Predicted Score:</strong> {result.predicted_score}
          </p>
          <p>
            <strong>Predicted Label:</strong> {result.predicted_label}
          </p>
        </div>
      )}
    </section>
  );
}
