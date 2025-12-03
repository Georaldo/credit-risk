"use client";
import React, { useState } from "react";
import { useAuth } from "../lib/auth";

export default function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    
    try {
      await login(email, password);
      // Login successful - AuthProvider handles redirect
    } catch (err: any) {
      console.log("⚠️ Error caught in LoginForm:", err);
      
      // 1. Check for Backend Error Message (e.g., "Invalid credentials")
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } 
      // 2. Check for Manual Error (e.g., "Missing token")
      else if (err.message) {
        setError(err.message);
      } 
      // 3. Fallback
      else {
        setError("Login failed. Please check your network.");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-80">
        <h2 className="text-xl font-bold mb-4 text-center">SmartCredit Login</h2>
        
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-3 border border-red-200">
            {error}
          </div>
        )}
        
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          placeholder="loanofficer@gmail.com"
          className="border p-2 rounded w-full mb-3 focus:ring-2 focus:ring-indigo-500 outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
        />
        
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input
          type="password"
          placeholder="••••••••"
          className="border p-2 rounded w-full mb-6 focus:ring-2 focus:ring-indigo-500 outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
        />
        
        <button 
          type="submit" 
          disabled={isSubmitting}
          className={`w-full text-white py-2 rounded font-semibold transition duration-200 ${
            isSubmitting ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Logging in...
            </span>
          ) : (
            "Sign In"
          )}
        </button>
      </form>
    </div>
  );
}