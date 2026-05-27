"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, RadioTower, UserPlus } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useCompanyStore } from "@/store/company-store";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const clearError = useAuthStore((state) => state.clearError);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const hasInitialized = useAuthStore((state) => state.hasInitialized);
  const activeCompanyId = useCompanyStore((state) => state.activeCompanyId);
  const [localError, setLocalError] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
    timezone: ""
  });

  useEffect(() => {
    initializeAuth();
    setForm((current) => ({
      ...current,
      timezone: current.timezone || getBrowserTimezone()
    }));
  }, [initializeAuth]);

  useEffect(() => {
    if (hasInitialized && isAuthenticated) {
      router.replace(activeCompanyId ? "/dashboard" : "/companies");
    }
  }, [activeCompanyId, hasInitialized, isAuthenticated, router]);

  const submit = async () => {
    clearError();
    setLocalError("");

    const validationError = validateForm(mode, form);
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    try {
      if (mode === "login") {
        await login({ email: form.email.trim().toLowerCase(), password: form.password });
      } else {
        await register({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone.trim(),
          timezone: form.timezone.trim() || getBrowserTimezone()
        });
      }
      router.replace("/companies");
    } catch {
      // Error is stored in auth state for display.
    }
  };

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
            <AuthStat label="API" value="FastAPI" />
            <AuthStat label="Role" value="dispatcher" />
            <AuthStat label="Session" value="token" />
          </div>
        </div>

        <div className="p-6">
          <div className="mb-5 flex rounded-md border border-white/[0.08] bg-white/[0.035] p-1">
            <button type="button" onClick={() => router.push("/login")} className={mode === "login" ? activeTabClass : inactiveTabClass}>
              <LockKeyhole className="h-4 w-4" />
              Login
            </button>
            <button type="button" onClick={() => router.push("/register")} className={mode === "register" ? activeTabClass : inactiveTabClass}>
              <UserPlus className="h-4 w-4" />
              Register
            </button>
          </div>

          <div className="space-y-3">
            {mode === "register" ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <AuthInput label="First name" value={form.first_name} onChange={(first_name) => setForm({ ...form, first_name })} placeholder="Giorgi" />
                  <AuthInput label="Last name" value={form.last_name} onChange={(last_name) => setForm({ ...form, last_name })} placeholder="Dispatcher" />
                </div>
              </>
            ) : null}
            <AuthInput label="Email" value={form.email} onChange={(email) => setForm({ ...form, email })} placeholder="dispatcher@fleet.local" />
            <AuthInput label="Password" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} placeholder="Password" />
            {mode === "register" ? (
              <>
                <AuthInput label="Phone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} placeholder="+1 555 0100" />
                <AuthInput label="Timezone" value={form.timezone} onChange={(timezone) => setForm({ ...form, timezone })} placeholder="America/New_York" />
              </>
            ) : null}
          </div>

          {localError || error ? <div className="mt-4 border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{localError || error}</div> : null}

          <button
            type="button"
            onClick={submit}
            disabled={isLoading}
            className="mt-5 h-10 w-full border border-cyan-300/30 bg-cyan-300/10 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/15 disabled:cursor-wait disabled:opacity-60"
          >
            {isLoading ? "Authorizing..." : mode === "login" ? "Enter Workspace" : "Create Account"}
          </button>
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

const activeTabClass = "flex h-9 flex-1 items-center justify-center gap-2 rounded border border-violet-300/35 bg-violet-400/15 text-sm text-violet-100";
const inactiveTabClass = "flex h-9 flex-1 items-center justify-center gap-2 rounded border border-transparent text-sm text-slate-500 hover:text-slate-200";

function validateForm(
  mode: AuthMode,
  form: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone: string;
    timezone: string;
  }
) {
  if (!form.email.trim()) {
    return "Email is required.";
  }
  if (!form.password) {
    return "Password is required.";
  }
  if (mode === "register" && !form.first_name.trim()) {
    return "First name is required.";
  }
  if (mode === "register" && !form.last_name.trim()) {
    return "Last name is required.";
  }
  if (mode === "register" && !form.phone.trim()) {
    return "Phone is required.";
  }
  if (mode === "register" && !form.timezone.trim()) {
    return "Timezone is required.";
  }

  return "";
}

function getBrowserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
