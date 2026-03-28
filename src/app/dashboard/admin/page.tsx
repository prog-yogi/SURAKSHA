"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Loader2,
  MapPin,
  Search,
  Shield,
  Users,
  X,
  LogOut,
} from "lucide-react";

/* ─── Types ─── */
type Overview = {
  totalTourists: number;
  activeAlerts: number;
  recentEmergencies: number;
  safetyScore: number;
  avgResolutionMin: number;
  activities: { id: string; message: string; kind: string; detail: string | null }[];
};

type Tourist = {
  id: string;
  name: string;
  email: string;
  address: string | null;
  status: string;
  phone: string | null;
  nationality: string | null;
  gender: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
};

type EmergencyEvent = {
  id: string;
  createdAt: string;
  resolved: boolean;
  lat: number | null;
  lng: number | null;
  user: { name: string; email: string };
};

type AdminFIR = {
  id: string;
  firNumber: string;
  complainantName: string;
  incidentType: string;
  incidentDateTime: string;
  location: string;
  description: string;
  status: string;
  createdAt: string;
  verifiedAt: string | null;
  user: { id: string; name: string; email: string };
};

type Analytics = {
  totalTourists: number;
  totalAdmins: number;
  statusBreakdown: Record<string, number>;
  incidentBreakdown: Record<string, number>;
  firsTotal: number;
  firsResolved: number;
  firsPending: number;
  emergenciesTotal: number;
  emergenciesResolved: number;
  emergenciesPending: number;
  recentRegistrations: number;
  safetyScore: number;
};

type Tab = "overview" | "alerts" | "firs" | "analytics" | "tourists";

export default function AdminDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab | null;
  const [tab, setTab] = useState<Tab>(
    tabParam && ["overview", "alerts", "firs", "analytics", "tourists"].includes(tabParam)
      ? tabParam
      : "overview",
  );
  const [overview, setOverview] = useState<Overview | null>(null);
  const [tourists, setTourists] = useState<Tourist[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyEvent[]>([]);
  const [adminFirs, setAdminFirs] = useState<AdminFIR[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tabParam && ["overview", "alerts", "firs", "analytics", "tourists"].includes(tabParam)) {
      setTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/overview").then((r) => r.json()),
      fetch("/api/tourists").then((r) => r.json()),
      fetch("/api/emergency").then((r) => r.json()),
    ])
      .then(([o, t, e]) => {
        if (!o.error) setOverview(o);
        setTourists(t.tourists ?? []);
        setEmergencies(e.emergencies ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  // Lazy load
  useEffect(() => {
    if (tab === "firs" && adminFirs.length === 0) {
      fetch("/api/admin/firs")
        .then((r) => r.json())
        .then((d) => setAdminFirs(d.firs ?? []));
    }
    if (tab === "analytics" && !analytics) {
      fetch("/api/admin/analytics")
        .then((r) => r.json())
        .then((d) => { if (!d.error) setAnalytics(d); });
    }
  }, [tab]);

  function changeTab(t: Tab) {
    setTab(t);
    const url = t === "overview" ? "/dashboard/admin" : `/dashboard/admin?tab=${t}`;
    window.history.replaceState(null, "", url);
  }

  const logout = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500  rounded-full" />
      </div>
    );
  }

  return (
    <div className="px-4 py-8 lg:px-8 max-w-7xl mx-auto relative">
      {/* Subtle Bluish Glow for Admin Space */}
      <div className="pointer-events-none fixed inset-0 -z-0 flex justify-center">
        <div className="h-[600px] w-full max-w-5xl bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-[#0B0F19]/0 to-transparent opacity-80" />
      </div>

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            System Overview <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 ">Terminal</span>
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 uppercase tracking-widest font-medium">
            Authority Central Command Console
          </p>
        </div>
        
        {/* Top Right Controls */}
        <div className="flex items-start gap-4">
          <ThemeToggle className="mt-1" />
          
          {/* Admin Logout Block */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-[#2A303C] bg-slate-50 dark:bg-[#0B0F19] p-4 min-w-[200px] shadow-lg">
            <div className="flex items-center gap-3">
               <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-[#131B2B] text-lg font-bold text-blue-400 ring-2 ring-slate-200 dark:ring-[#2A303C]">
                 A
               </div>
               <div className="min-w-0 flex-1">
                 <p className="truncate text-sm font-bold text-slate-900 dark:text-white tracking-wide">Administrator</p>
                 <p className="truncate text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">Control Panel</p>
               </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 transition-all hover:bg-slate-800 hover:text-slate-900 dark:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span>Secure Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 border-zinc-800 mb-8 pb-1">
        {([
          ["overview", "Command Center", Shield],
          ["alerts", "Active Beacons", AlertTriangle],
          ["firs", "Incident Reports", FileText],
          ["analytics", "Deep Analytics", BarChart3],
          ["tourists", "Registry Matrix", Users],
        ] as const).map(([k, label, Icon]) => (
          <button
            key={k}
            type="button"
            onClick={() => changeTab(k)}
            className={`inline-flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest transition-all relative group rounded-t-lg ${
              tab === k
                ? "text-cyan-700 dark:text-cyan-500 bg-white dark:bg-[#131B2B] shadow-sm border-t border-l border-r border-slate-300 dark:border-[#2A303C]"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#131B2B] border border-transparent"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {tab === k && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-400  " />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-in fade-in duration-500 pb-20">
        {tab === "overview" && <OverviewAdminTab overview={overview} tourists={tourists} emergencies={emergencies} />}
        {tab === "alerts" && <AlertsTab emergencies={emergencies} onResolve={(id) => {
          fetch(`/api/admin/emergency/${id}`, { method: "PATCH" })
            .then((r) => r.json())
            .then(() => {
              setEmergencies((prev) => prev.map((e) => (e.id === id ? { ...e, resolved: true } : e)));
            });
        }} />}
        {tab === "firs" && <FIRsAdminTab firs={adminFirs} onStatusChange={(firId, status) => {
          fetch("/api/admin/firs", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ firId, status }),
          })
            .then((r) => r.json())
            .then((d) => {
              if (d.fir) {
                setAdminFirs((prev) =>
                  prev.map((f) => (f.id === firId ? { ...f, status } : f)),
                );
              }
            });
        }} />}
        {tab === "analytics" && <AnalyticsTab data={analytics} />}
        {tab === "tourists" && <TouristRegistryTab tourists={tourists} />}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  OVERVIEW TAB                                            */
/* ──────────────────────────────────────────────────────── */
function OverviewAdminTab({
  overview,
  tourists,
  emergencies,
}: {
  overview: Overview | null;
  tourists: Tourist[];
  emergencies: EmergencyEvent[];
}) {
  const safe = tourists.filter((x) => x.status === "SAFE").length;
  const warn = tourists.filter((x) => x.status === "WARNING").length;
  const emerg = tourists.filter((x) => x.status === "EMERGENCY").length;
  const pendingEmergencies = emergencies.filter((e) => !e.resolved).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} title="Network Population" value={String(overview?.totalTourists ?? tourists.length)} color="blue" />
        <StatCard icon={AlertTriangle} title="Critical Beacons" value={String(pendingEmergencies)} color="red" />
        <StatCard icon={Shield} title="Global Safety Index" value={`${overview?.safetyScore ?? Math.round((safe / Math.max(tourists.length, 1)) * 100)}%`} color="emerald" />
        <StatCard icon={Clock} title="Mean Response Time" value={`< ${overview?.avgResolutionMin ?? 5} min`} color="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status breakdown */}
        <div className="rounded-2xl border border-slate-200 border-zinc-800  bg-white dark:bg-[#131B2B] p-6  rounded-2xl border border-slate-200 dark:border-[#2A303C] relative overflow-hidden">
          <div className="absolute top-[-50%] left-[-20%] w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.05),transparent_70%)] pointer-events-none" />
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-widest text-cyan-500 mb-6 border-b border-slate-100 border-zinc-800/50 pb-3">
            <Activity className="h-4 w-4 " />
            LIVE FLEET STATUS
          </h3>
          <div className="space-y-5 relative z-10">
            <ProgressBar label="SECURE" value={safe} total={tourists.length} color="bg-emerald-400  " />
            <ProgressBar label="ELEVATED" value={warn} total={tourists.length} color="bg-amber-400  " />
            <ProgressBar label="CRITICAL" value={emerg} total={tourists.length} color="bg-red-500  " />
          </div>
          <div className="mt-6 flex flex-wrap gap-4 text-xs font-mono font-bold tracking-widest relative z-10">
            <span className="text-emerald-500">{safe} SEC</span>
            <span className="text-amber-500">{warn} WRN</span>
            <span className="text-red-500">{emerg} CRT</span>
            <span className="text-cyan-500">{tourists.length} TOT</span>
          </div>
        </div>

        {/* Activity feed */}
        <div className="rounded-2xl border border-slate-200 border-zinc-800  bg-white dark:bg-[#131B2B] p-6  rounded-2xl border border-slate-200 dark:border-[#2A303C]">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-widest text-slate-900 dark:text-white mb-6 border-b border-slate-100 border-zinc-800/50 pb-3">
            <Activity className="h-4 w-4 text-indigo-400 " />
            EVENT STREAM
          </h3>
          <ul className="space-y-4 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
            {overview?.activities?.map((a) => (
              <li key={a.id} className="flex gap-4 p-3 rounded-lg border border-slate-100 border-zinc-800/50 bg-slate-950/40 hover:bg-slate-50 dark:bg-[#0B0F19] bg-slate-800/50 transition">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full  ${
                    a.kind === "success"
                      ? "bg-emerald-400 text-emerald-500"
                      : a.kind === "warning"
                        ? "bg-amber-400 text-amber-500"
                        : "bg-cyan-400 text-cyan-500"
                  }`}
                />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{a.message}</p>
                  {a.detail && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 border-l border-slate-200 border-zinc-800 pl-2">{a.detail}</p>
                  )}
                </div>
              </li>
            ))}
            {(!overview?.activities || overview.activities.length === 0) && (
              <li className="text-sm font-mono text-slate-500 dark:text-slate-400 text-center py-8 border border-dashed border-slate-200 border-zinc-800 rounded-xl">NO EVENTS IN LAST CYCLE.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  ALERTS TAB                                              */
/* ──────────────────────────────────────────────────────── */
function AlertsTab({
  emergencies,
  onResolve,
}: {
  emergencies: EmergencyEvent[];
  onResolve: (id: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("all");
  const filtered = emergencies.filter((e) => {
    if (filter === "pending") return !e.resolved;
    if (filter === "resolved") return e.resolved;
    return true;
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#131B2B] p-3 rounded-xl border border-slate-200 border-zinc-800">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-widest ml-2">ACTIVE S.O.S. QUEUE</h2>
        <div className="flex gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-100 border-zinc-800/50">
          {(["all", "pending", "resolved"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-md px-4 py-1.5 text-[10px] uppercase tracking-widest font-bold transition ${
                filter === f
                  ? "bg-cyan-500/20 text-cyan-500  border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-300 hover:bg-slate-800"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={AlertTriangle} message="Signal Clear" hint={filter === "all" ? "No emergency broadcasts received." : `Zero ${filter} alerts detected.`} color="cyan" />
      ) : (
        <div className="space-y-4">
          {filtered.map((ev) => (
            <div
              key={ev.id}
              className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border  bg-white dark:bg-[#131B2B]/60 backdrop-blur p-5 transition ${
                ev.resolved ? "border-slate-200 border-zinc-800" : "border-red-500/50  relative overflow-hidden"
              }`}
            >
              {!ev.resolved && <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-[80px] pointer-events-none" />}
              
              <div className="flex items-center gap-4 relative z-10">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${ev.resolved ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" : "bg-red-500/20 text-red-500 border-red-500/50"}`}>
                  <AlertTriangle className={`h-6 w-6 ${ev.resolved ? "" : "animate-pulse"}`} />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900 dark:text-white tracking-wide">{ev.user.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {ev.user.email} <span className="mx-2">|</span> {new Date(ev.createdAt).toLocaleString()}
                  </p>
                  {ev.lat != null && ev.lng != null && (
                    <p className="text-xs text-cyan-500 font-bold tracking-widest mt-1.5 flex items-center gap-2 border border-cyan-500/30 bg-cyan-500/10 rounded px-2 py-0.5 w-max ">
                      <MapPin className="h-3 w-3" /> [ {ev.lat.toFixed(5)}, {ev.lng.toFixed(5)} ]
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 relative z-10 w-full sm:w-auto mt-2 sm:mt-0 justify-end border-t border-slate-100 border-zinc-800/50 sm:border-0 pt-3 sm:pt-0">
                <span className={`rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-widest border ${ev.resolved ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" : "bg-red-500/20 text-red-500 border-red-500/50"}`}>
                  {ev.resolved ? "SECURED" : "CRITICAL"}
                </span>
                {!ev.resolved && (
                  <button
                    type="button"
                    onClick={() => onResolve(ev.id)}
                    className="group flex flex-col items-center justify-center rounded-xl bg-red-600 border border-red-400 px-6 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-red-500 hover: transition  "
                  >
                    DEPLOY RESOLUTION
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  FIR REPORTS TAB                                         */
/* ──────────────────────────────────────────────────────── */
function FIRsAdminTab({
  firs,
  onStatusChange,
}: {
  firs: AdminFIR[];
  onStatusChange: (firId: string, status: string) => void;
}) {
  const [filter, setFilter] = useState("ALL");
  const filtered = firs.filter((f) => filter === "ALL" || f.status === filter);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#131B2B] p-3 rounded-xl border border-slate-200 border-zinc-800">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-widest ml-2">FIR DIRECTORY (VOL. {firs.length})</h2>
        <div className="flex flex-wrap gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-100 border-zinc-800/50">
          {["ALL", "PENDING", "INVESTIGATING", "RESOLVED", "CLOSED"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-md px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold transition ${
                filter === s
                  ? "bg-cyan-500/20 text-cyan-500  border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-300 hover:bg-slate-800"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} message="Repository Empty" hint="Authorized incident logs will sync here." color="amber" />
      ) : (
        <div className="space-y-4">
          {filtered.map((fir) => (
            <div
              key={fir.id}
              className="rounded-2xl border border-slate-100 border-zinc-800/50  bg-white dark:bg-[#131B2B]/50 backdrop-blur p-6 hover:border-amber-500/30 transition shadow-lg group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-transparent via-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 relative z-10">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap mb-3">
                    <p className="font-mono text-sm font-bold text-amber-500 ">FILE #{fir.firNumber}</p>
                    <StatusBadge status={fir.status} />
                    <span className="rounded bg-slate-800/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 border border-slate-200 border-zinc-800">
                      CLASS: {fir.incidentType.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white tracking-wide">{fir.complainantName}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-mono items-center">
                    <span>{fir.user.email}</span>
                    <span className="text-slate-700">|</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-cyan-500" /> {fir.location}</span>
                    <span className="text-slate-700">|</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-cyan-500" /> {new Date(fir.incidentDateTime).toLocaleString()}</span>
                  </div>
                  <div className="mt-4 p-4 rounded-xl border border-slate-100 border-zinc-800/50 bg-slate-950/60 shadow-inner">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic border-l-2 border-amber-500/50 pl-3">"{fir.description}"</p>
                  </div>
                </div>
                
                <div className="lg:min-w-64 bg-slate-950/80 border border-slate-200 border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-100 border-zinc-800/50 pb-2">Authority Control</span>
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Set File Status:</label>
                    <select
                      value={fir.status}
                      onChange={(e) => onStatusChange(fir.id, e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-white dark:bg-[#131B2B] px-3 py-2 text-sm font-bold tracking-wide text-slate-900 dark:text-white outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 appearance-none"
                    >
                      <option value="PENDING">PENDING REVIEW</option>
                      <option value="INVESTIGATING">INVESTIGATING</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="CLOSED">ARCHIVED</option>
                    </select>
                  </div>
                  {fir.status === "RESOLVED" && <div className="text-xs font-bold text-center bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 py-2 rounded-lg mt-2">CASE CLOSED</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  ANALYTICS TAB                                           */
/* ──────────────────────────────────────────────────────── */
function AnalyticsTab({ data }: { data: Analytics | null }) {
  if (!data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500  rounded-full" />
      </div>
    );
  }

  const incidentTypes = Object.entries(data.incidentBreakdown);
  const maxIncident = Math.max(...incidentTypes.map(([, v]) => v), 1);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} title="Global Nodes" value={String(data.totalTourists)} color="blue" />
        <StatCard icon={Shield} title="Security Rating" value={`${data.safetyScore}%`} color="emerald" />
        <StatCard icon={FileText} title="Documented FIRs" value={String(data.firsTotal)} color="amber" />
        <StatCard icon={AlertTriangle} title="Historical S.O.S." value={String(data.emergenciesTotal)} color="red" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status distribution */}
        <div className="rounded-2xl border border-slate-200 border-zinc-800  bg-white dark:bg-[#131B2B] p-6  rounded-2xl border border-slate-200 dark:border-[#2A303C] relative overflow-hidden">
          <div className="absolute top-[-50%] right-[-20%] w-[100%] h-[150%] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.05),transparent_70%)] pointer-events-none" />
          <h3 className="text-sm font-bold tracking-widest uppercase text-slate-900 dark:text-white mb-6 border-b border-slate-100 border-zinc-800/50 pb-3 relative z-10">Entity State Telemetry</h3>
          <div className="space-y-5 relative z-10">
            {Object.entries(data.statusBreakdown).map(([status, count]) => (
              <ProgressBar
                key={status}
                label={status}
                value={count}
                total={data.totalTourists}
                color={
                  status === "SAFE"
                    ? "bg-emerald-400  "
                    : status === "WARNING"
                      ? "bg-amber-400  "
                      : "bg-red-500  "
                }
              />
            ))}
          </div>
        </div>

        {/* Incident type chart */}
        <div className="rounded-2xl border border-slate-200 border-zinc-800  bg-white dark:bg-[#131B2B] p-6  rounded-2xl border border-slate-200 dark:border-[#2A303C] relative">
          <div className="absolute bottom-[-50%] left-[-20%] w-[100%] h-[150%] bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.05),transparent_70%)] pointer-events-none" />
          <h3 className="text-sm font-bold tracking-widest uppercase text-slate-900 dark:text-white mb-6 border-b border-slate-100 border-zinc-800/50 pb-3 relative z-10">Crime Typology Distribution</h3>
          {incidentTypes.length === 0 ? (
            <p className="text-sm font-mono text-slate-500 dark:text-slate-400 relative z-10">NO DATA FOUND.</p>
          ) : (
            <div className="space-y-4 relative z-10">
              {incidentTypes.map(([type, count]) => (
                <div key={type} className="flex items-center gap-4">
                  <span className="w-28 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 shrink-0">{type}</span>
                  <div className="flex-1 h-3 rounded-full bg-slate-800 border border-slate-100 border-zinc-800/50 overflow-hidden shadow-inner">
                    <div
                      className="h-full rounded-full bg-violet-500  transition-all duration-1000 ease-out"
                      style={{ width: `${(count / maxIncident) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-violet-400 w-8 text-right ">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resolution stats */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 border-zinc-800  bg-white dark:bg-[#131B2B] p-6  rounded-2xl border border-slate-200 dark:border-[#2A303C] flex items-center gap-8">
          <DonutChart resolved={data.firsResolved} pending={data.firsPending} color="#fbbf24" glowColor="rgba(251,191,36,0.8)" />
          <div className="flex-1">
            <h3 className="text-sm font-bold tracking-widest uppercase text-amber-500 border-b border-slate-100 border-zinc-800/50 pb-2 mb-3">FIR Triage Ratio</h3>
            <div className="space-y-2 text-sm font-mono">
              <p className="flex justify-between text-slate-900 dark:text-white"><span className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded  bg-emerald-500" />RESOLVED</span> <span className="font-bold">{data.firsResolved}</span></p>
              <p className="flex justify-between text-slate-500 dark:text-slate-400"><span className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded  bg-amber-400" />PENDING</span> <span className="font-bold text-slate-900 dark:text-white">{data.firsPending}</span></p>
            </div>
          </div>
        </div>
        
        <div className="rounded-2xl border border-slate-200 border-zinc-800  bg-white dark:bg-[#131B2B] p-6  rounded-2xl border border-slate-200 dark:border-[#2A303C] flex items-center gap-8">
          <DonutChart resolved={data.emergenciesResolved} pending={data.emergenciesPending} color="#ef4444" glowColor="rgba(239,68,68,0.8)" />
          <div className="flex-1">
            <h3 className="text-sm font-bold tracking-widest uppercase text-red-500 border-b border-slate-100 border-zinc-800/50 pb-2 mb-3 ">S.O.S. Triage Ratio</h3>
            <div className="space-y-2 text-sm font-mono">
              <p className="flex justify-between text-slate-900 dark:text-white"><span className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded  bg-emerald-500" />RESOLVED</span> <span className="font-bold">{data.emergenciesResolved}</span></p>
              <p className="flex justify-between text-slate-500 dark:text-slate-400"><span className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded  bg-red-500 animate-pulse" />PENDING</span> <span className="font-bold text-slate-900 dark:text-white">{data.emergenciesPending}</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-5 text-center text-sm mb-4">
        <p className="font-mono text-cyan-500 uppercase tracking-widest text-xs">Node Influx (Past 168 Hours): <span className="font-bold text-slate-900 dark:text-white text-lg ml-2">{data.recentRegistrations} REGISTRATIONS</span></p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  TOURIST REGISTRY TAB                                    */
/* ──────────────────────────────────────────────────────── */
function TouristRegistryTab({ tourists }: { tourists: Tourist[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = tourists.filter((t) => {
    const matchesSearch =
      search === "" ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selected = selectedId ? tourists.find((t) => t.id === selectedId) : null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4 bg-white dark:bg-[#131B2B] p-4 rounded-xl border border-slate-200 border-zinc-800">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-500/50" />
          <input
            type="text"
            placeholder="Query Registry By Alias or Network ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-cyan-900/50 bg-slate-950/80 py-3 pl-11 pr-4 text-sm font-mono text-cyan-100 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 placeholder:text-slate-600 transition"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-cyan-900/50 bg-slate-950/80 px-4 py-3 text-sm font-bold uppercase tracking-widest text-cyan-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 appearance-none"
        >
          <option value="ALL">ANY STATE</option>
          <option value="SAFE">SECURE</option>
          <option value="WARNING">WARNING</option>
          <option value="EMERGENCY">CRITICAL</option>
        </select>
      </div>

      <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">[{filtered.length}] ENTITIES MATCH QUERY</p>

      <div className="space-y-3">
        {filtered.map((t) => (
          <div
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 border-zinc-800/50 bg-white dark:bg-[#131B2B] px-5 py-4 shadow-lg hover:border-cyan-500/30 hover:bg-slate-800/60 transition group cursor-pointer"
            onClick={() => setSelectedId(t.id)}
          >
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-slate-900 dark:text-white tracking-wide group-hover:text-cyan-100 transition">{t.name}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs font-mono text-slate-500 dark:text-slate-400">
                <span>{t.email}</span>
                {t.phone && (
                  <>
                    <span className="text-slate-700">|</span>
                    <span>{t.phone}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <StatusBadge status={t.status} />
              <div className="rounded-lg border border-slate-200 border-zinc-800 bg-slate-950 p-2 text-slate-500 dark:text-slate-400 group-hover:text-cyan-500 group-hover:border-cyan-500/50 transition">
                <Eye className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail modal wrapper matching neon aesthetic */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-white dark:bg-[#131B2B]  overflow-hidden scale-100 animate-in zoom-in-95">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-600" />
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 border-zinc-800 bg-slate-50 dark:bg-[#0B0F19] bg-slate-800/50">
              <h3 className="text-xs font-bold tracking-widest uppercase text-cyan-500 flex items-center gap-2">
                <Users className="h-4 w-4" /> Node Telemetry Profile
              </h3>
              <button onClick={() => setSelectedId(null)} className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-700 hover:text-slate-900 dark:text-white transition cursor-pointer z-10">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-sm max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-4 mb-6">
                 <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-2xl font-bold text-cyan-500  ">
                    {selected.name.charAt(0).toUpperCase()}
                 </div>
                 <div>
                   <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selected.name}</h2>
                   <div className="mt-2"><StatusBadge status={selected.status} /></div>
                 </div>
              </div>
            
              <div className="space-y-1">
                <InfoRow label="Network ID" value={selected.email} />
                <InfoRow label="Primary Comms" value={selected.phone} />
                <InfoRow label="Phenotype" value={selected.gender} />
                <InfoRow label="Jurisdiction" value={selected.nationality} />
                <InfoRow label="Base Coordinates" value={selected.address} />
              </div>
              
              <div className="mt-6 pt-4 border-t border-slate-100 border-zinc-800/50 space-y-1 bg-red-500/5 p-4 rounded-xl border-red-500/20">
                <h4 className="text-[10px] font-bold tracking-widest uppercase text-red-500 mb-3 flex items-center gap-1"><Shield className="h-3 w-3"/> Failsafe Protocol</h4>
                <InfoRow label="Alias" value={selected.emergencyContactName} />
                <InfoRow label="Frequency" value={selected.emergencyContactPhone} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  SHARED COMPONENTS                                       */
/* ──────────────────────────────────────────────────────── */

function StatCard({
  icon: Icon,
  title,
  value,
  color,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  color: string;
}) {
  const colorMap: Record<string, { bg: string, text: string, shadow: string, border: string }> = {
    blue: { bg: "bg-blue-500/10", text: "text-blue-500", shadow: "", border: "border-blue-500/30" },
    red: { bg: "bg-red-500/10", text: "text-red-500", shadow: "", border: "border-red-500/30" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500", shadow: "", border: "border-emerald-500/30" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-500", shadow: "", border: "border-amber-500/30" },
  };
  const theme = colorMap[color] ?? colorMap.blue;

  return (
    <div className={`group rounded-2xl border bg-white dark:bg-[#131B2B]/60 backdrop-blur p-5 transition-all duration-300 hover:bg-slate-50 dark:hover:bg-[#131B2B]/80 hover:-translate-y-1 hover:shadow-lg shadow-sm border-slate-300 dark:border-[#2A303C] ${theme.border}`}>
      <div className={`inline-flex rounded-xl p-2.5 transition-all duration-300 ${theme.bg}`}>
        <Icon className={`h-5 w-5 ${theme.text} group-hover:drop-shadow-[0_0_8px_currentColor]`} />
      </div>
      <p className={`mt-4 text-3xl font-bold font-mono tracking-tight transition-all duration-300 ${theme.text} group-hover:drop-shadow-[0_0_12px_currentColor]`}>{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">{title}</p>
    </div>
  );
}

function ProgressBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-[11px] font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400 mb-2">
        <span>{label}</span>
        <span className="font-mono text-slate-900 dark:text-white">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-zinc-800/50 shadow-inner overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-1000 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function DonutChart({ resolved, pending, color = "#10b981", glowColor = "rgba(16,185,129,0.8)" }: { resolved: number; pending: number; color?: string; glowColor?: string }) {
  const total = resolved + pending;
  const pct = total > 0 ? Math.round((resolved / total) * 100) : 0;
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg className="h-28 w-28 -rotate-90 " style={{ color: glowColor }} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="12" />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold font-mono text-slate-900 dark:text-white tracking-tight leading-none" style={{ textShadow: `0 0 10px ${glowColor}` }}>
          {pct}%
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    SAFE: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 ",
    WARNING: "bg-amber-500/10 text-amber-500 border-amber-500/30 ",
    EMERGENCY: "bg-red-500/10 text-red-500 border-red-500/30 animate-pulse",
    PENDING: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    INVESTIGATING: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    RESOLVED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    CLOSED: "bg-slate-800/80 text-slate-400 border-slate-700",
    ACTIVE: "bg-red-500/10 text-red-500 border-red-500/30 animate-pulse",
    VERIFIED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  };

  return (
    <span className={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${map[status] ?? "bg-slate-800 text-slate-400 border-slate-700"}`}>
      {status}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-1.5 border-b border-slate-100 border-zinc-800/50 last:border-0">
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-900 dark:text-slate-200 mt-0.5 sm:mt-0 max-w-[60%] truncate text-right">
        {value || <span className="text-slate-500 dark:text-slate-600 font-mono text-xs">N/A</span>}
      </span>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  message,
  hint,
  color="cyan"
}: {
  icon: React.ElementType;
  message: string;
  hint: string;
  color?: string;
}) {
  const colorClass = color === "red" ? "text-red-500 " :
                     color === "amber" ? "text-amber-500 " :
                     "text-cyan-500 ";
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 border-zinc-800 bg-white dark:bg-[#131B2B]/30 py-20 text-center">
      <div className="rounded-2xl border border-slate-100 border-zinc-800/50 bg-slate-50 dark:bg-[#0B0F19] bg-slate-800/50 p-5 mb-4 shadow-lg flex items-center justify-center">
        <Icon className={`h-8 w-8 ${colorClass}`} />
      </div>
      <p className="text-sm font-bold tracking-widest uppercase text-slate-900 dark:text-white">{message}</p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono tracking-tight">{hint}</p>
    </div>
  );
}
