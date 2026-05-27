"use client";

import { useEffect, useState } from "react";
import { LockKeyhole, RadioTower, UserPlus } from "lucide-react";
import { DispatchWorkspace } from "@/components/dispatch/dispatch-workspace";

type AuthMode = "login" | "register";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  company: string;
  role: "dispatcher" | "admin";
  createdAt: number;
};

const usersKey = "freight-command-auth-users";
const sessionKey = "freight-command-auth-session";

const defaultUsers: AuthUser[] = [
  {
    id: "demo-dispatcher",
    name: "Giorgi Dispatcher",
    email: "dispatcher@fleet.local",
    password: "dispatch123",
    company: "Freight Command",
    role: "dispatcher",
    createdAt: Date.now()
  }
];

export function AuthGate() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState({ name: "", company: "", email: "", password: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    const users = readUsers();
    if (users.length === 0) {
      window.localStorage.setItem(usersKey, JSON.stringify(defaultUsers));
    }

    const session = window.localStorage.getItem(sessionKey);
    const activeUser = readUsers().find((item) => item.id === session) ?? null;
    setUser(activeUser);
    setMounted(true);
  }, []);

  const submit = () => {
    const email = form.email.trim().toLowerCase();
    const password = form.password.trim();
    const users = readUsers();

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    if (mode === "login") {
      const matchedUser = users.find((item) => item.email.toLowerCase() === email && item.password === password);
      if (!matchedUser) {
        setError("Invalid email or password.");
        return;
      }

      window.localStorage.setItem(sessionKey, matchedUser.id);
      setUser(matchedUser);
      setError("");
      return;
    }

    if (!form.name.trim()) {
      setError("Dispatcher name is required.");
      return;
    }
    if (users.some((item) => item.email.toLowerCase() === email)) {
      setError("This email is already registered.");
      return;
    }

    const nextUser: AuthUser = {
      id: `user-${Date.now()}`,
      name: form.name.trim(),
      email,
      password,
      company: form.company.trim() || "Freight Command",
      role: "dispatcher",
      createdAt: Date.now()
    };

    window.localStorage.setItem(usersKey, JSON.stringify([nextUser, ...users]));
    window.localStorage.setItem(sessionKey, nextUser.id);
    setUser(nextUser);
    setError("");
  };

  if (!mounted) {
    return <div className="min-h-screen bg-terminal-950" />;
  }

  if (user) {
    return <DispatchWorkspace />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#050b1a] p-4 text-slate-100">
      <section className="grid w-full max-w-[980px] overflow-hidden border border-white/[0.10] bg-terminal-950 shadow-2xl shadow-black/70 lg:grid-cols-[1fr_420px]">
        <div className="flex min-h-[560px] flex-col justify-between border-b border-white/[0.08] bg-[#071226] p-6 lg:border-b-0 lg:border-r">
          <div>
            <div className="mb-8 flex h-11 w-fit items-center gap-3 rounded-md border border-violet-300/30 bg-violet-400/15 px-3 text-violet-100 shadow-glow">
              <RadioTower className="h-5 w-5" />
              <span className="text-sm font-semibold">Freight Command</span>
            </div>
            <h1 className="max-w-[520px] text-3xl font-semibold leading-tight text-slate-50">
              Realtime dispatch workspace access
            </h1>
            <p className="mt-4 max-w-[560px] text-sm leading-6 text-slate-400">
              Authorize before opening live loads, driver assignments, broker intelligence, tracker status, and operations analytics.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <AuthStat label="Live loads" value="guarded" />
            <AuthStat label="Role" value="dispatcher" />
            <AuthStat label="Session" value="local" />
          </div>
        </div>

        <div className="p-6">
          <div className="mb-5 flex rounded-md border border-white/[0.08] bg-white/[0.035] p-1">
            <button type="button" onClick={() => { setMode("login"); setError(""); }} className={mode === "login" ? activeTabClass : inactiveTabClass}>
              <LockKeyhole className="h-4 w-4" />
              Login
            </button>
            <button type="button" onClick={() => { setMode("register"); setError(""); }} className={mode === "register" ? activeTabClass : inactiveTabClass}>
              <UserPlus className="h-4 w-4" />
              Register
            </button>
          </div>

          <div className="space-y-3">
            {mode === "register" ? (
              <>
                <AuthInput label="Dispatcher name" value={form.name} onChange={(name) => setForm({ ...form, name })} placeholder="Giorgi Dispatcher" />
                <AuthInput label="Company" value={form.company} onChange={(company) => setForm({ ...form, company })} placeholder="Fleet company" />
              </>
            ) : null}
            <AuthInput label="Email" value={form.email} onChange={(email) => setForm({ ...form, email })} placeholder="dispatcher@fleet.local" />
            <AuthInput label="Password" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} placeholder="dispatch123" />
          </div>

          {error ? <div className="mt-4 border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}

          <button type="button" onClick={submit} className="mt-5 h-10 w-full border border-cyan-300/30 bg-cyan-300/10 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/15">
            {mode === "login" ? "Enter Workspace" : "Create Account"}
          </button>

          <div className="mt-5 border border-white/[0.08] bg-white/[0.025] p-3 text-xs leading-5 text-slate-500">
            Demo login: <span className="font-mono text-cyan-200">dispatcher@fleet.local</span> / <span className="font-mono text-cyan-200">dispatch123</span>
          </div>
        </div>
      </section>
    </main>
  );
}

function AuthInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block text-xs text-slate-500">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full border border-white/[0.08] bg-white/[0.035] px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-300/35"
        placeholder={placeholder}
      />
    </label>
  );
}

function AuthStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/[0.08] bg-white/[0.035] p-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-2 font-mono text-sm text-cyan-100">{value}</div>
    </div>
  );
}

function readUsers(): AuthUser[] {
  if (typeof window === "undefined") {
    return defaultUsers;
  }

  try {
    const raw = window.localStorage.getItem(usersKey);
    return raw ? (JSON.parse(raw) as AuthUser[]) : defaultUsers;
  } catch {
    return defaultUsers;
  }
}

const activeTabClass = "flex h-9 flex-1 items-center justify-center gap-2 rounded border border-violet-300/35 bg-violet-400/15 text-sm text-violet-100";
const inactiveTabClass = "flex h-9 flex-1 items-center justify-center gap-2 rounded border border-transparent text-sm text-slate-500 hover:text-slate-200";
