import { CompanyRecord } from "@/services/companies/companies-types";
import { readStoredJson } from "@/services/storage/persistence";

const companiesStorageKey = "freight-command-companies";

export const companiesApi = {
  list(): CompanyRecord[] {
    return readStoredJson<CompanyRecord[]>(companiesStorageKey, []);
  }
};
