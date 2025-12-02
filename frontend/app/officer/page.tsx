"use client";
import React, { useState } from "react";
import RoleGuard from "../../components/RoleGuard";
import Navbar from "../../components/Navbar";
import Sidebar, { OfficerTab } from "../../components/Sidebar";
import ModelManagementPanel from "../../components/officer/ModelManagementPanel";
import PredictionPanel from "../../components/officer/PredictionPanel";
import SHAPPanel from "../../components/officer/SHAPPanel";
import { motion, AnimatePresence } from "framer-motion";
import { ToastProvider } from "../../components/Toast";

export default function OfficerPortal() {
  const [tab, setTab] = useState<OfficerTab>("overview");

  const renderPanel = () => {
    switch (tab) {
      case "overview":
        return (
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-semibold">Overview</h2>
            <p className="text-sm text-slate-600">Quick summary and pending tasks.</p>
          </div>
        );
      case "models":
        return <ModelManagementPanel />;
      case "predict":
        return <PredictionPanel />;
      case "shap":
        return <SHAPPanel />;
      default:
        return null;
    }
  };

  return (
    <ToastProvider>
      <RoleGuard allowed={["loan_officer"]}>
        <div className="min-h-screen bg-slate-50">
          <Navbar />
          <div className="flex">
            <Sidebar activeTab={tab} setTab={setTab} role="loan_officer" />
            <main className="flex-1 p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  {renderPanel()}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>
      </RoleGuard>
    </ToastProvider>
  );
}
