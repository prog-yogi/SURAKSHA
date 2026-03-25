"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@suraksha.gov");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error ?? "Login failed");
        return;
      }
      router.push("/dashboard/admin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <p className="text-center text-sm font-semibold uppercase text-blue-600">
        Authority console
      </p>
      <h1 className="mt-2 text-center text-2xl font-bold text-slate-900">
        Admin login
      </h1>
      <p className="mt-2 text-center text-sm text-slate-600">
        Use your administrator credentials. Tourist accounts cannot sign in here.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            autoComplete="username"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            autoComplete="current-password"
            placeholder="rohan#1234"
          />
        </div>
        {err && (
          <p className="text-sm text-red-600" role="alert">
            {err}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in as admin"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Tourist?{" "}
        <Link href="/login/user" className="font-semibold text-emerald-700 hover:underline">
          Use tourist login
        </Link>
      </p>
    </div>
  );
}
