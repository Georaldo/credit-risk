"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth"; 

export default function Navbar() {
  const pathname = usePathname();
  const { token, logout, user } = useAuth(); 

  if (pathname === "/login") return null;

  return (
    <nav className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold tracking-tight flex items-center gap-2">
          🏦 <span>SmartCredit</span>
        </Link>
        
        <div className="flex items-center gap-6">
          {token && user ? (
            <>
              {/* STRICT ROLE LINKS */}
              {user.role === 'loan_officer' && (
                <Link href="/officer" className={`hover:text-indigo-400 transition ${pathname.includes('/officer') ? 'text-indigo-400 font-semibold' : ''}`}>
                  Officer Portal
                </Link>
              )}
              
              {user.role === 'manager' && (
                 <Link href="/manager" className={`hover:text-indigo-400 transition ${pathname.includes('/manager') ? 'text-indigo-400 font-semibold' : ''}`}>
                   Manager Dashboard
                 </Link>
              )}

              {user.role === 'customer' && (
                 <Link href="/customer" className={`hover:text-indigo-400 transition ${pathname.includes('/customer') ? 'text-indigo-400 font-semibold' : ''}`}>
                   My Status
                 </Link>
              )}
              
              <div className="flex items-center gap-4 border-l border-slate-700 pl-4">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium">{user.email.split('@')[0]}</div>
                  <div className="text-xs text-slate-400 capitalize">{user.role.replace('_', ' ')}</div>
                </div>
                
                <button
                  onClick={logout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <Link 
              href="/login"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}