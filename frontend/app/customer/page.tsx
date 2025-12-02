"use client";

import React, { useEffect, useState } from "react";
import RoleGuard from "../../components/RoleGuard";
import Navbar from "../../components/Navbar";
import Sidebar from "../../components/Sidebar";
import api from "../../lib/api";

type CreditDecision = {
  status: "Approved" | "Denied";
  score: number;
  probability: number;
  topFactors: { feature: string; contribution: number }[];
};

export default function CustomerDashboard() {
  const [creditDecision, setCreditDecision] = useState<CreditDecision | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDecision() {
      try {
        const res = await api.get("/dashboard/customer/credit-decision");
        setCreditDecision(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDecision();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-lg font-semibold">Loading your dashboard...</p>
      </div>
    );
  }

  if (!creditDecision) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-lg font-semibold">No credit decision available.</p>
      </div>
    );
  }

  const isDenied = creditDecision.status === "Denied";

  return (
    <RoleGuard allowed={["customer"]}>
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8">
            <h1 className="text-3xl font-bold mb-6">Customer Portal</h1>

            <div className="bg-white p-6 rounded shadow-lg max-w-xl mx-auto">
              <h2 className="text-2xl font-semibold mb-4">Your Credit Decision</h2>

              <div className={`p-4 rounded text-white font-bold mb-4 ${isDenied ? "bg-red-600" : "bg-green-600"}`}>
                {creditDecision.status} — Score: {creditDecision.score} ({(creditDecision.probability * 100).toFixed(1)}%)
              </div>

              {isDenied && (
                <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-600 text-red-800">
                  <p className="font-semibold mb-2">Why your application was denied:</p>
                  <ul className="list-disc list-inside">
                    {creditDecision.topFactors.map((f, idx) => (
                      <li key={idx}>
                        {f.feature}: {f.contribution > 0 ? "+" : ""}{f.contribution.toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!isDenied && (
                <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-600 text-green-800">
                  <p className="font-semibold mb-2">Factors contributing to your approval:</p>
                  <ul className="list-disc list-inside">
                    {creditDecision.topFactors.map((f, idx) => (
                      <li key={idx}>
                        {f.feature}: {f.contribution > 0 ? "+" : ""}{f.contribution.toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-sm text-gray-500">
                <p>Tip: Improve your financial profile by focusing on factors with negative contributions above.</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
