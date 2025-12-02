"use client";

import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface RoleGuardProps {
  allowed: string[];
  children: ReactNode;
}

export default function RoleGuard({ allowed, children }: RoleGuardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!user) {
      // redirect to login if not logged in
      router.push("/login");
    } else if (!allowed.includes(user.role)) {
      // redirect to login or unauthorized page if role not allowed
      router.push("/login");
    } else {
      setAuthorized(true);
    }
  }, [user, allowed, router]);

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Checking permissions...</p>
      </div>
    );
  }

  return <>{children}</>;
}
