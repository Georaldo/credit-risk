"use client";
import React, { useState } from "react";
import { useAuth } from "../lib/auth";

export default function LoginForm() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-80">
        <h2 className="text-xl font-bold mb-4">Login</h2>
        {error && <p className="text-red-600 mb-2">{error}</p>}
        <input
          type="text"
          placeholder="Username"
          className="border p-2 rounded w-full mb-3"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="border p-2 rounded w-full mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded">
          Login
        </button>
      </form>
    </div>
  );
}
