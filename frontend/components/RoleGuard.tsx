"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";

interface Props {
  children: React.ReactNode;
  allowedRoles?: string[]; // Arrays of "manager" | "customer" | "loan_officer"
}

export default function RoleGuard({ children, allowedRoles }: Props) {
  const { token, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; 

    // 1. Check Login
    if (!token) {
      router.push("/login");
      return;
    }

    // 2. Check Role Permission
    if (allowedRoles && user) {
        if (!allowedRoles.includes(user.role)) {
            // If logged in but wrong role, redirect to their home or root
            router.push("/"); 
        }
    }
  }, [token, user, isLoading, allowedRoles, router]);

  if (isLoading || !token) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="text-slate-500 text-sm">Verifying access...</p>
            </div>
        </div>
    );
  }

  // Prevent flash of content if role is wrong
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      return null;
  }

  return <>{children}</>;
}