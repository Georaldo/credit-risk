"use client";
import React, { useEffect, useState } from "react";
import OfficerDashboard from "../../../components/OfficerDashboard";
import api from "../../../lib/api";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api.get("/oracle/dashboard/officer/applications");
        const customers = res.data.map((app: any) => ({
          name: `Customer #${app.CUSTOMER_ID}`,
          creditScore: app.PREDICTED_SCORE ?? 0,
          riskLevel:
            app.PREDICTED_LABEL === "High Risk"
              ? "high"
              : app.PREDICTED_LABEL === "Medium Risk"
              ? "medium"
              : "low",
          topFeatures: [], // optional, can fetch SHAP later
        }));
        setData({ customers });
      } catch (err) {
        console.error(err);
      }
    }
    fetchData();
  }, []);

  return <OfficerDashboard data={data} />;
}
