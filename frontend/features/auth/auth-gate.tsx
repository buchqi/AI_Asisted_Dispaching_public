"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DispatchWorkspace } from "@/features/dispatch/dispatch-workspace";
import { useAuthStore } from "@/store/auth-store";
import { useCompanyStore } from "@/store/company-store";
import { type WorkspacePage } from "@/store/workspace-store";

export function AuthGate({ initialPage = "dispatch" }: { initialPage?: WorkspacePage }) {
  const router = useRouter();
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const hasInitialized = useAuthStore((state) => state.hasInitialized);
  const loadCompanies = useCompanyStore((state) => state.loadCompanies);
  const activeCompanyId = useCompanyStore((state) => state.activeCompanyId);
  const isCompanyLoading = useCompanyStore((state) => state.isLoading);
  const hasLoadedCompanies = useCompanyStore((state) => state.hasLoaded);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (hasInitialized && !isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hasInitialized, isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (hasInitialized && isAuthenticated) {
      loadCompanies().catch(() => {
        router.replace("/companies");
      });
    }
  }, [hasInitialized, isAuthenticated, loadCompanies, router]);

  useEffect(() => {
    if (hasInitialized && isAuthenticated && hasLoadedCompanies && !isCompanyLoading && !activeCompanyId) {
      router.replace("/companies");
    }
  }, [activeCompanyId, hasInitialized, hasLoadedCompanies, isAuthenticated, isCompanyLoading, router]);

  if (isLoading || isCompanyLoading || !hasLoadedCompanies || !hasInitialized) {
    return <div className="min-h-screen bg-terminal-950" />;
  }

  if (!isAuthenticated || !activeCompanyId) {
    return <div className="min-h-screen bg-terminal-950" />;
  }

  return <DispatchWorkspace initialPage={initialPage} />;
}
