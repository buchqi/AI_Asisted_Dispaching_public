import { apiClient } from "@/api/api-client";
import { Company, CreateCompanyPayload } from "@/types/companies";

export function listCompanies() {
  return apiClient<Company[]>("/companies");
}

export function createCompany(payload: CreateCompanyPayload) {
  return apiClient<Company>("/companies", {
    method: "POST",
    body: payload
  });
}

export function getCompany(companyId: number | string) {
  return apiClient<Company>(`/companies/${companyId}`);
}

export const companiesApi = {
  listCompanies,
  createCompany,
  getCompany
};
