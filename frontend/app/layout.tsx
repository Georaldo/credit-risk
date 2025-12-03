import type { Metadata } from "next";
import "./globals.css";
import Navbar from "../components/Navbar";
import { ToastProvider } from "../components/Toast";
import { AuthProvider } from "../lib/auth"; 

export const metadata: Metadata = {
  title: "Smart Credit Risk",
  description: "AI-Powered Credit Assessment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">
        <ToastProvider>
          {/* WRAP APP HERE */}
          <AuthProvider>
            <Navbar />
            <main className="container mx-auto py-8 px-4">
              {children}
            </main>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}