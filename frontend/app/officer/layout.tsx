"use client";

import { ToastProvider } from "@/components/Toast";

export default function OfficerLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
