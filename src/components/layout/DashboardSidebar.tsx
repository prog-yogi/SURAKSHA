"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  FileText,
  Home,
  LogOut,
  MapPin,
  Menu,
  Route,
  Siren,
  User,
  Users,
  X,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ElementType };

const USER_NAV: NavItem[] = [
  { href: "/dashboard/user", label: "Overview", icon: Home },
  { href: "/dashboard/user?tab=firs", label: "My FIRs", icon: FileText },
  { href: "/dashboard/user?tab=emergencies", label: "Emergency History", icon: Siren },
  { href: "/dashboard/user/safe-route", label: "Safe Route", icon: Route },
  { href: "/emergency", label: "Emergency SOS", icon: AlertTriangle },
  { href: "/geo", label: "Geo Tracking", icon: MapPin },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard/admin", label: "Overview", icon: Home },
  { href: "/dashboard/admin?tab=alerts", label: "Active Alerts", icon: AlertTriangle },
  { href: "/dashboard/admin?tab=firs", label: "FIR Reports", icon: FileText },
  { href: "/dashboard/admin?tab=analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/admin?tab=tourists", label: "Tourist Registry", icon: Users },
];

export function DashboardSidebar({
  role,
  userName,
  userEmail,
  userImage,
}: {
  role: "TOURIST" | "ADMIN";
  userName: string;
  userEmail: string;
  userImage?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const items = role === "ADMIN" ? ADMIN_NAV : USER_NAV;

  const activeBg = "bg-white dark:bg-[#131B2B]";
  const activeBorder = "border-slate-300 dark:border-[#2A303C]";
  const activeText = "text-emerald-600 dark:text-emerald-400 font-bold";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const isActive = (href: string) => {
    const base = href.split("?")[0];
    if (base === pathname) {
      if (href.includes("?tab=")) {
        return typeof window !== "undefined" && window.location.search.includes(href.split("?")[1]);
      }
      return !href.includes("?tab=");
    }
    return false;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0B0F19] border-r border-slate-200 dark:border-[#2A303C]">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-slate-200 dark:border-[#2A303C]">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-[16px] font-bold text-white shadow-sm`}>
            S
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold text-slate-900 dark:text-white tracking-widest leading-none">SURAKSHA</p>
            <p className={`text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider`}>
              {role === "ADMIN" ? "Admin Panel" : "User Workspace"}
            </p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-3 custom-scrollbar">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition duration-200 ${
                active
                  ? `${activeBg} ${activeText} border ${activeBorder} shadow-sm cursor-default`
                  : "text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-[#131B2B] hover:text-emerald-600 dark:hover:text-emerald-400 hover:shadow-sm hover:border-slate-200 dark:hover:border-[#2A303C] border border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform ${active ? `scale-110 ${activeText}` : "group-hover:scale-110 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400"}`} />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom user card extracted to top-right of layout */}
    </div>
  );

  return (
    <>
      {/* Mobile topbar */}
      <div className="sticky top-0 z-50 flex items-center justify-between bg-slate-50 dark:bg-slate-50/90 dark:bg-[#0B0F19]/90 backdrop-blur-xl px-4 py-4 lg:hidden border-b border-slate-200 dark:border-[#2A303C] shadow-sm">
        <div className="flex items-center gap-3">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-xs font-bold text-white shadow-sm`}>
            S
          </span>
          <span className="text-xs font-bold text-slate-900 dark:text-white tracking-widest">SURAKSHA</span>
        </div>
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={`rounded-lg border border-slate-200 dark:border-[#2A303C] p-2 text-slate-400 hover:text-white hover:bg-white dark:bg-[#131B2B] transition`}
            >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col z-40">
        {sidebarContent}
      </aside>
    </>
  );
}
