"use client";

import React, { useEffect, useState } from "react";
import RoleGuard from "../../components/RoleGuard";
import Navbar from "../../components/Navbar";
import Sidebar from "../../components/Sidebar";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import api from "../../lib/api";

type KPI = {
  name: string;
  value: number;
};

export default function ManagerDashboard() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [portfolioData, setPortfolioData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch KPIs
        const res = await api.get("/dashboard/manager/kpis");
        setKpis(res.data.kpis);

        // Fetch portfolio overview
        const portfolio = await api.get("/dashboard/manager/portfolio");
        setPortfolioData(portfolio.data);
      } catch (err) {
        console.error(err);
      }
    }

    fetchData();
  }, []);

  return (
    <RoleGuard allowed={["manager"]}>
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8">
            <h1 className="text-3xl font-bold mb-6">Manager Dashboard</h1>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              {kpis.map((k) => (
                <div key={k.name} className="p-6 bg-white rounded shadow hover:shadow-lg transition">
                  <h3 className="text-lg font-semibold text-gray-600">{k.name}</h3>
                  <p className="text-2xl font-bold mt-2">{k.value}</p>
                </div>
              ))}
            </div>

            {/* Portfolio Bar Chart */}
            <div className="bg-white p-6 rounded shadow mb-8">
              <h2 className="text-xl font-semibold mb-4">Portfolio Overview</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={portfolioData}>
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#4f46e5" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Recent Applications Table */}
            <div className="bg-white p-6 rounded shadow">
              <h2 className="text-xl font-semibold mb-4">Recent Applications</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Applicant</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Score</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Decision</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {portfolioData.map((app) => (
                      <tr key={app.id}>
                        <td className="px-4 py-2">{app.applicant}</td>
                        <td className="px-4 py-2">{app.score}</td>
                        <td className={`px-4 py-2 font-semibold ${app.decision === "High Risk" ? "text-red-600" : "text-green-600"}`}>
                          {app.decision}
                        </td>
                        <td className="px-4 py-2">{app.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
