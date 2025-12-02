"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const success = await login(email, password);
    setLoading(false);

    if (!success) {
      setError("Invalid email or password. Please try again.");
      return;
    }

    // redirect based on role
    const role = localStorage.getItem("sc_role");
    if (role === "manager") router.push("/manager");
    else if (role === "loan_officer") router.push("/officer");
    else router.push("/customer");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border"
      >
        <h1 className="text-2xl font-bold mb-4 text-center">Login</h1>

        {error && (
          <div className="mb-4 text-red-600 text-sm text-center">{error}</div>
        )}

        <label className="block text-sm mb-1">Email</label>
        <input
          type="email"
          className="border p-2 rounded w-full mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="block text-sm mb-1">Password</label>
        <input
          type="password"
          className="border p-2 rounded w-full mb-6"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
        >
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
