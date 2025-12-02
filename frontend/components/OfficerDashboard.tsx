// components/OfficerDashboard.tsx
"use client";
import React from "react";

interface Customer {
  name: string;
  creditScore: number;
  riskLevel: "low" | "medium" | "high";
  topFeatures: string[];
}

interface OfficerDashboardProps {
  data: {
    customers: Customer[];
  } | null;
}

const OfficerDashboard: React.FC<OfficerDashboardProps> = ({ data }) => {
  if (!data) return <div>Loading officer dashboard...</div>;

  return (
    <section className="p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Loan Officer Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.customers.map((c) => (
          <div key={c.name} className="p-4 bg-slate-50 rounded shadow">
            <h3 className="font-semibold">{c.name}</h3>
            <p>Credit Score: <strong>{c.creditScore}</strong></p>
            <p>
              Risk Level:{" "}
              <span
                className={`font-bold ${
                  c.riskLevel === "high"
                    ? "text-red-600"
                    : c.riskLevel === "medium"
                    ? "text-yellow-600"
                    : "text-green-600"
                }`}
              >
                {c.riskLevel.toUpperCase()}
              </span>
            </p>
            <div className="mt-2">
              <strong>Top Contributing Factors:</strong>
              <ul className="list-disc list-inside">
                {c.topFeatures.map((f, idx) => (
                  <li key={idx}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default OfficerDashboard;
