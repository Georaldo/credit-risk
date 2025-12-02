"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

type ToastType = "success" | "error" | "info";
type Toast = { id: string; type: ToastType; message: string };

interface ToastContextType {
  pushToast: (toast: { type: ToastType; message: string }) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToasts = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToasts must be used within ToastProvider");
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = ({ type, message }: { type: ToastType; message: string }) => {
    const id = Date.now() + Math.random().toString(36).slice(2, 7);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  };

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2 rounded shadow ${
              t.type === "success"
                ? "bg-green-600 text-white"
                : t.type === "error"
                ? "bg-red-600 text-white"
                : "bg-gray-700 text-white"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
