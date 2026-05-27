"use client";

import { create } from "zustand";
import { companiesApi } from "@/api/companies-api";
import { Company, CreateCompanyPayload } from "@/types/companies";

const activeCompanyIdKey = "freight-command-active-company-id";

type CompanyState = {
  companies: Company[];
  activeCompany: Company | null;
  activeCompanyId: number | null;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string;
  loadCompanies: () => Promise<void>;
  createCompany: (payload: CreateCompanyPayload) => Promise<Company>;
  setActiveCompany: (company: Company) => void;
  clearActiveCompany: () => void;
  clearError: () => void;
};

export const useCompanyStore = create<CompanyState>((set) => ({
  companies: [],
  activeCompany: null,
  activeCompanyId: getStoredActiveCompanyId(),
  isLoading: false,
  hasLoaded: false,
  error: "",
  loadCompanies: async () => {
    set({ isLoading: true, error: "" });

    try {
      const companies = await companiesApi.listCompanies();
      const storedCompanyId = getStoredActiveCompanyId();
      const activeCompany = storedCompanyId
        ? companies.find((company) => company.id === storedCompanyId) ?? null
        : companies.length === 1 ? companies[0] : null;

      if (storedCompanyId && !activeCompany) {
        window.localStorage.removeItem(activeCompanyIdKey);
      }
      if (!storedCompanyId && activeCompany) {
        persistActiveCompanyId(activeCompany.id);
      }

      set({
        companies,
        activeCompany,
        activeCompanyId: activeCompany?.id ?? null,
        isLoading: false,
        hasLoaded: true
      });
    } catch (error) {
      set({ companies: [], activeCompany: null, activeCompanyId: null, isLoading: false, hasLoaded: true, error: getMessage(error) });
      throw error;
    }
  },
  createCompany: async (payload) => {
    set({ isLoading: true, error: "" });

    try {
      const company = await companiesApi.createCompany(payload);
      const companies = await companiesApi.listCompanies();
      persistActiveCompanyId(company.id);
      set({ companies, activeCompany: company, activeCompanyId: company.id, isLoading: false, hasLoaded: true });
      return company;
    } catch (error) {
      set({ isLoading: false, error: getMessage(error) });
      throw error;
    }
  },
  setActiveCompany: (company) => {
    persistActiveCompanyId(company.id);
    set({ activeCompany: company, activeCompanyId: company.id, error: "" });
  },
  clearActiveCompany: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(activeCompanyIdKey);
    }
    set({ activeCompany: null, activeCompanyId: null, hasLoaded: false });
  },
  clearError: () => set({ error: "" })
}));

function getStoredActiveCompanyId() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(activeCompanyIdKey);
  const parsed = value ? Number(value) : null;
  return parsed && Number.isFinite(parsed) ? parsed : null;
}

function persistActiveCompanyId(companyId: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(activeCompanyIdKey, String(companyId));
}

function getMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Company request failed.";
}
