// components/SHAPChart.tsx
"use client";
import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type SHAPPoint = { feature: string; impact: number };

export default function SHAPChart({ features }: { features: SHAPPoint[] }) {
  const labels = features.map((f) => f.feature);
  const values = features.map((f) => Number(f.impact));

  const data = {
    labels,
    datasets: [
      {
        label: "SHAP impact",
        data: values,
        backgroundColor: "rgba(79,70,229,0.9)",
      },
    ],
  };

  const options = {
    indexAxis: "y" as const,
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: { mode: "nearest" },
    },
    scales: {
      x: { beginAtZero: true },
      y: { ticks: { autoSkip: false } },
    },
  };

  return (
    <div className="w-full h-64">
      <Bar data={data} options={options} />
    </div>
  );
}
