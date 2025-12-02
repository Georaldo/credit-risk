"use client";
import React from "react";
import { useAuth } from "../lib/auth";

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white border-b px-6 py-3 flex justify-between items-center shadow-sm">
      <div className="text-xl font-bold">Credit Risk Dashboard</div>
      {user.role && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">Role: {user.role.replace("_", " ")}</span>
          <button
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
