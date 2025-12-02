// components/ManagerDashboard.tsx
"use client";
import React from "react";

interface ManagerDashboardProps {
  data: {
    totalApplications: number;
    approved: number;
    denied: number;
    defaultRate: number;
    portfolioConcentration?: Record<string, number>;
  } | null;
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ data }) => {
  if (!data) return <div>Loading manager dashboard...</div>;

  return (
    <section className="p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Manager Dashboard</h2>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-slate-50 rounded shadow">
          <h3 className="font-semibold">Total Applications</h3>
          <p className="text-xl">{data.totalApplications}</p>
        </div>
        <div className="p-4 bg-green-50 rounded shadow">
          <h3 className="font-semibold">Approved</h3>
          <p className="text-xl">{data.approved}</p>
        </div>
        <div className="p-4 bg-red-50 rounded shadow">
          <h3 className="font-semibold">Denied</h3>
          <p className="text-xl">{data.denied}</p>
        </div>
        <div className="p-4 bg-yellow-50 rounded shadow">
          <h3 className="font-semibold">Default Rate</h3>
          <p className="text-xl">{(data.defaultRate * 100).toFixed(2)}%</p>
        </div>
      </div>

      {data.portfolioConcentration && (
        <div className="p-4 bg-slate-100 rounded">
          <h3 className="font-semibold mb-2">Portfolio Concentration</h3>
          <ul className="list-disc list-inside">
            {Object.entries(data.portfolioConcentration).map(([sector, pct]) => (
              <li key={sector}>{sector}: {(pct * 100).toFixed(1)}%</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default ManagerDashboard;
