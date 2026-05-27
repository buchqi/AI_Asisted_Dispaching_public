import { apiClient } from "@/api/api-client";
import { CompanyMember, InviteCompanyMemberPayload, UpdateCompanyMemberPayload } from "@/types/companies";

export function inviteCompanyMember(companyId: number | string, payload: InviteCompanyMemberPayload) {
  return apiClient<CompanyMember>(`/companies/${companyId}/members/invite`, {
    method: "POST",
    body: payload
  });
}

export function listCompanyMembers(companyId: number | string) {
  return apiClient<CompanyMember[]>(`/companies/${companyId}/members`);
}

export function updateCompanyMember(
  companyId: number | string,
  membershipId: number | string,
  payload: UpdateCompanyMemberPayload
) {
  return apiClient<CompanyMember>(`/companies/${companyId}/members/${membershipId}`, {
    method: "PATCH",
    body: payload
  });
}

export function removeCompanyMember(companyId: number | string, membershipId: number | string) {
  return apiClient<CompanyMember>(`/companies/${companyId}/members/${membershipId}`, {
    method: "DELETE"
  });
}

export const companyMembersApi = {
  inviteCompanyMember,
  listCompanyMembers,
  updateCompanyMember,
  removeCompanyMember
};
