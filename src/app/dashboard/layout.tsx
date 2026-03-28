"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";

type SessionUser = {
  name: string;
  email: string;
  role: string;
  profileImage?: string | null;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) {
          router.push("/login");
          return;
        }
        setUser(d.user);
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 dark:border-[#2A303C] border-t-emerald-500" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-white selection:bg-emerald-500/30">
      <DashboardSidebar
        role={user.role as "TOURIST" | "ADMIN"}
        userName={user.name}
        userEmail={user.email}
        userImage={user.profileImage}
      />
      <div className="lg:pl-64">
        <main className="min-h-screen relative z-10">{children}</main>
      </div>
    </div>
  );
}
