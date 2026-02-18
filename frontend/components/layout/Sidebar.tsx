"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Home, PawPrint, Zap, Settings, LogOut, Activity, Shield, BookOpen, Building2 } from "lucide-react";
import api from "@/lib/api";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/pets", label: "My Pets", icon: PawPrint },
  { href: "/vet-providers", label: "My Vets", icon: Building2 },
  { href: "/medications-guide", label: "Meds Guide", icon: BookOpen },
  { href: "/ddi", label: "Drug Interactions", icon: Zap },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    api
      .get("/auth/me")
      .then(({ data }) => setIsAdmin(!!data.is_admin))
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    toast.success("Signed out");
    router.push("/login");
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Activity className="text-indigo-600" size={22} />
          <span className="text-xl font-bold text-indigo-700">MedPetRx</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Veterinary Records</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}

        {/* Admin link — only for admin users */}
        {isAdmin && (
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === "/admin" || pathname.startsWith("/admin/")
                ? "bg-purple-50 text-purple-700"
                : "text-purple-600 hover:bg-purple-50 hover:text-purple-800"
            }`}
          >
            <Shield size={18} />
            Admin
          </Link>
        )}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 w-full transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
