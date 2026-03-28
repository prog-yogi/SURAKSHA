"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  ChevronDown,
  Download,
  Globe,
  LogIn,
  LogOut,
  Menu,
  Phone,
  User,
  X,
  AlertTriangle,
  FileText,
  MoreHorizontal,
  LayoutDashboard,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const nav = [
  { href: "/", label: "Home" },
  { href: "/solution", label: "Solution" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

type SessionUser = {
  name: string;
  email: string;
  role: string;
  profileImage?: string | null;
};

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const loginRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
    setLoginOpen(false);
    setMoreOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  // Check auth status
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user ?? null);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, [pathname]);

  /* close dropdowns on outside click */
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
      if (loginRef.current && !loginRef.current.contains(e.target as Node)) setLoginOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setProfileOpen(false);
    router.push("/");
    router.refresh();
  }

  const dashboardHref =
    user?.role === "ADMIN" ? "/dashboard/admin" : "/dashboard/user";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-slate-950/90 transition-colors duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-amber-400 text-sm font-bold text-white shadow-sm">
              S
            </span>
            <span className="hidden font-bold tracking-tight text-slate-900 dark:text-white sm:inline">
              SURAKSHA
            </span>
            <span className="rounded-full bg-amber-300/90 dark:bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-900 dark:text-amber-400 border border-transparent dark:border-amber-400/30">
              Tourist Safety
            </span>
          </Link>
          <ThemeToggle className="ml-2 hidden lg:flex" />
        </div>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname === item.href
                  ? "bg-amber-100/80 text-amber-900 dark:bg-amber-400/10 dark:text-amber-400"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop right actions */}
        <div className="hidden items-center gap-2 lg:flex">
          {/* Auth-aware: show profile or login */}
          {authChecked && user ? (
            /* ── Logged-in profile dropdown ── */
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setMoreOpen(false);
                }}
                className="flex items-center gap-2 rounded-full border-2 border-emerald-500/60 pl-1 pr-3 py-1 text-sm font-medium text-slate-800 dark:text-slate-200 transition hover:border-emerald-500 dark:hover:border-emerald-400"
              >
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.name}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-xs font-bold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="max-w-[120px] truncate">{user.name}</span>
                <ChevronDown className="h-3 w-3 text-slate-400 dark:text-slate-500" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-1 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-slate-900 border overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                    <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
                      {user.role === "ADMIN" ? "Authority" : "Tourist"}
                    </span>
                  </div>
                  <Link
                    href={dashboardHref}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    onClick={() => setProfileOpen(false)}
                  >
                    <LayoutDashboard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    My Dashboard
                  </Link>
                  {user.role === "TOURIST" && (
                    <Link
                      href="/dashboard/user?tab=profile"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                      onClick={() => setProfileOpen(false)}
                    >
                      <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      My Profile
                    </Link>
                  )}
                  <div className="border-t border-slate-100 dark:border-white/5 my-1" />
                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : authChecked ? (
            /* ── Not logged in — Login dropdown ── */
            <div className="relative" ref={loginRef}>
              <button
                type="button"
                onClick={() => {
                  setLoginOpen(!loginOpen);
                  setMoreOpen(false);
                }}
                className="flex items-center gap-1 rounded-full border-2 border-blue-600 dark:border-blue-500 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-400 transition hover:bg-blue-50 dark:hover:bg-blue-500/10"
              >
                <LogIn className="h-4 w-4" />
                Login
                <ChevronDown className="h-3 w-3" />
              </button>
              {loginOpen && (
                <div className="absolute right-0 mt-1 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-slate-900 overflow-hidden">
                  <Link
                    href="/login/admin"
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    onClick={() => setLoginOpen(false)}
                  >
                    <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Authority (Admin)
                  </Link>
                  <Link
                    href="/login/user"
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    onClick={() => setLoginOpen(false)}
                  >
                    <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Tourist (User)
                  </Link>
                </div>
              )}
            </div>
          ) : null}

          {/* More dropdown */}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => {
                setMoreOpen(!moreOpen);
                setLoginOpen(false);
                setProfileOpen(false);
              }}
              className="flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition"
              aria-label="More options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {moreOpen && (
              <div className="absolute right-0 mt-1 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-slate-900 overflow-hidden z-50">
                <a
                  href="#download"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={() => setMoreOpen(false)}
                >
                  <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Download App
                </a>
                <Link
                  href="/contact"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={() => setMoreOpen(false)}
                >
                  <Phone className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Contact Us
                </Link>
                <div className="border-t border-slate-100 dark:border-white/5 px-3 py-2 mt-1">
                  <p className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    English 🇺🇸
                  </p>
                  <p className="mt-1 pl-6 text-xs text-slate-400 dark:text-slate-500">
                    हिंदी (coming soon)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  pathname === item.href
                    ? "bg-amber-100/80 text-amber-900 dark:bg-amber-400/10 dark:text-amber-400"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900"
                }`}
              >
              {item.label}
              </Link>
            ))}

            {/* Auth-aware mobile section */}
            {user ? (
              <>
                <div className="mt-3 flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-900 px-3 py-3 border border-transparent dark:border-white/5">
                  {user.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={user.name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-xs font-bold text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                  </div>
                </div>
                <Link
                  href={dashboardHref}
                  className="mt-1 flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-800 dark:text-blue-400"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  My Dashboard
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-700 dark:text-red-400"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login/admin"
                  className="mt-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-800 dark:text-blue-400"
                >
                  Login — Admin
                </Link>
                <Link
                  href="/login/user"
                  className="mt-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-800 dark:text-emerald-400"
                >
                  Login — Tourist
                </Link>
              </>
            )}

            <Link
              href="/emergency"
              className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
            >
              <AlertTriangle className="h-4 w-4" />
              Emergency SOS
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
