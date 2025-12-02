// app/dashboard/page.tsx
"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ManagerDashboard from "@/components/ManagerDashboard";
import OfficerDashboard from "@/components/OfficerDashboard";
import CustomerDashboard from "@/components/CustomerDashboard";
import { useAuth } from "@/lib/auth";

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) {
    return <div className="p-6 text-center text-red-600">Please log in to access the dashboard.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1">
        <Navbar />
        <main className="p-8">
          {user.role === "manager" && <ManagerDashboard />}
          {user.role === "officer" && <OfficerDashboard />}
          {user.role === "customer" && <CustomerDashboard />}
        </main>
      </div>
    </div>
  );
}
