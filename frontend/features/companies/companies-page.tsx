"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Crown, MailPlus, Plus, ShieldCheck, Trash2, UserRoundCheck } from "lucide-react";
import { companyMembersApi } from "@/api/company-members-api";
import { OperationsShell } from "@/components/layout/operations-shell";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { useAuthStore } from "@/store/auth-store";
import { useCompanyStore } from "@/store/company-store";
import { Company, CompanyMember } from "@/types/companies";

export function CompaniesPage() {
  const router = useRouter();
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authLoading = useAuthStore((state) => state.isLoading);
  const hasInitialized = useAuthStore((state) => state.hasInitialized);
  const companies = useCompanyStore((state) => state.companies);
  const activeCompany = useCompanyStore((state) => state.activeCompany);
  const activeCompanyId = useCompanyStore((state) => state.activeCompanyId);
  const loadCompanies = useCompanyStore((state) => state.loadCompanies);
  const createCompany = useCompanyStore((state) => state.createCompany);
  const setActiveCompany = useCompanyStore((state) => state.setActiveCompany);
  const clearError = useCompanyStore((state) => state.clearError);
  const companyLoading = useCompanyStore((state) => state.isLoading);
  const companyError = useCompanyStore((state) => state.error);
  const [companyName, setCompanyName] = useState("");
  const [companyFormOpen, setCompanyFormOpen] = useState(false);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("dispatcher");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);
  const [localError, setLocalError] = useState("");
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "Dispatcher";

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (hasInitialized && !authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, hasInitialized, isAuthenticated, router]);

  useEffect(() => {
    if (hasInitialized && isAuthenticated) {
      loadCompanies().catch(() => undefined);
    }
  }, [hasInitialized, isAuthenticated, loadCompanies]);

  useEffect(() => {
    if (!activeCompanyId) {
      setMembers([]);
      return;
    }

    loadMembers(activeCompanyId);
  }, [activeCompanyId]);

  const selectedCompany = useMemo(
    () => activeCompany ?? companies.find((company) => company.id === activeCompanyId) ?? null,
    [activeCompany, activeCompanyId, companies]
  );
  const visibleMembers = useMemo(
    () => members.filter((member) => member.status !== "removed"),
    [members]
  );
  const memberCountLabel = `${visibleMembers.length} ${visibleMembers.length === 1 ? "member" : "members"}`;

  const submitCompany = async () => {
    clearError();
    setLocalError("");

    const name = companyName.trim();
    if (!name) {
      setLocalError("Company name is required.");
      return;
    }

    try {
      const company = await createCompany({ name });
      setCompanyName("");
      setCompanyFormOpen(false);
      setActiveCompany(company);
      await loadMembers(company.id);
    } catch {
      // Error is stored in company state for display.
    }
  };

  const selectCompany = async (company: Company) => {
    setActiveCompany(company);
    await loadMembers(company.id);
  };

  const inviteMember = async () => {
    if (!activeCompanyId) {
      setInviteError("Create or select a company before inviting members.");
      return;
    }

    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setInviteError("Email is required.");
      return;
    }

    setInviteLoading(true);
    setInviteError("");

    try {
      await companyMembersApi.inviteCompanyMember(activeCompanyId, { email, role: inviteRole });
      setInviteEmail("");
      await loadMembers(activeCompanyId);
    } catch (error) {
      setInviteError(getMessage(error));
    } finally {
      setInviteLoading(false);
    }
  };

  const changeRole = async (member: CompanyMember, role: string) => {
    if (!activeCompanyId) {
      return;
    }

    setActionId(member.id);
    setMembersError("");

    try {
      await companyMembersApi.updateCompanyMember(activeCompanyId, member.id, { role });
      await loadMembers(activeCompanyId);
    } catch (error) {
      setMembersError(getMessage(error));
    } finally {
      setActionId(null);
    }
  };

  const removeMember = async (member: CompanyMember) => {
    if (!activeCompanyId) {
      return;
    }
    if (!window.confirm("Remove this member from the company?")) {
      return;
    }

    setActionId(member.id);
    setMembersError("");

    try {
      await companyMembersApi.removeCompanyMember(activeCompanyId, member.id);
      await loadMembers(activeCompanyId);
    } catch (error) {
      setMembersError(getMessage(error));
    } finally {
      setActionId(null);
    }
  };

  async function loadMembers(companyId: number) {
    setMembersLoading(true);
    setMembersError("");

    try {
      const items = await companyMembersApi.listCompanyMembers(companyId);
      setMembers(items.filter((member) => member.status !== "removed"));
    } catch (error) {
      setMembers([]);
      setMembersError(getMessage(error));
    } finally {
      setMembersLoading(false);
    }
  }

  if (authLoading || !hasInitialized || !isAuthenticated) {
    return <main className="min-h-screen bg-terminal-950" />;
  }

  return (
    <OperationsShell>
      <div className="h-[calc(100vh-4rem)] overflow-auto p-3 xl:p-4">
        <section className="min-h-full border border-white/[0.08] bg-terminal-950/75">
          <header className="flex flex-wrap items-center gap-3 border-b border-white/[0.08] p-4">
            <div className="grid h-11 w-11 place-items-center rounded-md border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-slate-50">{selectedCompany ? toTitleCase(selectedCompany.name) : "Company"}</h1>
              <p className="mt-1 text-sm text-slate-500">Manage company profile, invitations, and members.</p>
            </div>
            <Badge tone={selectedCompany ? "green" : "slate"}>{selectedCompany ? memberCountLabel : "no company"}</Badge>
          </header>

          <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              <section className="border border-white/[0.08] bg-white/[0.025] p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-md border border-violet-300/25 bg-violet-400/10 text-violet-100">
                    <UserRoundCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-slate-100">{displayName}</h2>
                    <p className="mt-1 text-xs text-slate-500">{user?.email}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone="cyan">profile</Badge>
                      {selectedCompany ? <Badge tone="green">{selectedCompany.name}</Badge> : <Badge tone="amber">company required</Badge>}
                    </div>
                  </div>
                  {!selectedCompany ? (
                    <IconButton label="Create company" active={companyFormOpen} onClick={() => setCompanyFormOpen((value) => !value)}>
                      <Plus className="h-4 w-4" />
                    </IconButton>
                  ) : null}
                </div>

                {!selectedCompany && companyFormOpen ? (
                  <div className="mt-4 border border-white/[0.08] bg-white/[0.025] p-3">
                    <label className="block text-xs text-slate-500">
                      Company name
                      <input
                        value={companyName}
                        onChange={(event) => setCompanyName(event.target.value)}
                        className="mt-1 h-10 w-full border border-white/[0.08] bg-white/[0.035] px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-300/35"
                        placeholder="Fleet company"
                      />
                    </label>
                    {localError || companyError ? <div className="mt-3 border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{localError || companyError}</div> : null}
                    <button
                      type="button"
                      onClick={submitCompany}
                      disabled={companyLoading}
                      className="mt-3 h-9 border border-cyan-300/25 bg-cyan-300/10 px-4 text-sm text-cyan-100 disabled:cursor-wait disabled:opacity-60"
                    >
                      {companyLoading ? "Creating..." : "Create Company"}
                    </button>
                  </div>
                ) : null}

                {companies.length > 1 ? (
                  <div className="mt-4 border-t border-white/[0.08] pt-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Switch company</div>
                    <div className="flex flex-wrap gap-2">
                      {companies.map((company) => (
                        <button
                          key={company.id}
                          type="button"
                          onClick={() => selectCompany(company)}
                          className={`h-9 border px-3 text-xs transition ${
                            activeCompanyId === company.id
                              ? "border-violet-300/35 bg-violet-400/15 text-violet-100"
                              : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:border-cyan-300/25 hover:text-cyan-100"
                          }`}
                        >
                          {company.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>

              <MembersTable
                members={visibleMembers}
                loading={membersLoading}
                error={membersError}
                actionId={actionId}
                onPromote={(member) => changeRole(member, "admin")}
                onDemote={(member) => changeRole(member, "dispatcher")}
                onRemove={removeMember}
              />
            </div>

            <InvitePanel
              activeCompany={selectedCompany}
              email={inviteEmail}
              role={inviteRole}
              loading={inviteLoading}
              error={inviteError}
              onEmailChange={setInviteEmail}
              onRoleChange={setInviteRole}
              onInvite={inviteMember}
            />
          </div>
        </section>
      </div>
    </OperationsShell>
  );
}

function InvitePanel({
  activeCompany,
  email,
  role,
  loading,
  error,
  onEmailChange,
  onRoleChange,
  onInvite
}: {
  activeCompany: Company | null;
  email: string;
  role: string;
  loading: boolean;
  error: string;
  onEmailChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onInvite: () => void;
}) {
  return (
    <aside className="border border-white/[0.08] bg-white/[0.025] p-4">
      <div className="mb-4 flex items-center gap-2">
        <IconButton label="Invite people" className="h-9 w-9">
          <MailPlus className="h-4 w-4" />
        </IconButton>
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Invite People</h2>
          <p className="mt-1 text-xs text-slate-500">Add registered users to the active company.</p>
        </div>
      </div>

      <label className="block text-xs text-slate-500">
        User email
        <input
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          disabled={!activeCompany}
          className="mt-1 h-10 w-full border border-white/[0.08] bg-white/[0.035] px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-300/35 disabled:cursor-not-allowed disabled:opacity-60"
          placeholder="dispatcher@example.com"
        />
      </label>

      <label className="mt-3 block text-xs text-slate-500">
        Role
        <select
          value={role}
          onChange={(event) => onRoleChange(event.target.value)}
          disabled={!activeCompany}
          className="mt-1 h-10 w-full border border-white/[0.08] bg-[#071226] px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/35 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="dispatcher">dispatcher</option>
          <option value="admin">admin</option>
        </select>
      </label>

      {error ? <div className="mt-4 border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}

      <button
        type="button"
        onClick={onInvite}
        disabled={!activeCompany || loading}
        className="mt-5 h-10 w-full border border-cyan-300/30 bg-cyan-300/10 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Inviting..." : "Send Invite"}
      </button>

      {!activeCompany ? <p className="mt-3 text-xs text-slate-500">Create a company before inviting members.</p> : null}
    </aside>
  );
}

function MembersTable({
  members,
  loading,
  error,
  actionId,
  onPromote,
  onDemote,
  onRemove
}: {
  members: CompanyMember[];
  loading: boolean;
  error: string;
  actionId: number | null;
  onPromote: (member: CompanyMember) => void;
  onDemote: (member: CompanyMember) => void;
  onRemove: (member: CompanyMember) => void;
}) {
  return (
    <section className="overflow-hidden border border-white/[0.08] bg-white/[0.025]">
      <div className="grid grid-cols-[1fr_1fr_120px_120px_180px] border-b border-white/[0.08] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
        <span>Member</span>
        <span>Email</span>
        <span>Role</span>
        <span>Status</span>
        <span>Actions</span>
      </div>

      {loading ? <div className="p-5 text-sm text-slate-500">Loading members...</div> : null}
      {error ? <div className="border-b border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</div> : null}
      {!loading && members.length === 0 ? <div className="p-5 text-sm text-slate-500">No members loaded for this company.</div> : null}

      {members.map((member) => (
        <div key={member.id} className="grid grid-cols-[1fr_1fr_120px_120px_180px] items-center border-b border-white/[0.06] px-3 py-3 text-sm text-slate-300">
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
              <UserRoundCheck className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold text-slate-100">{memberName(member)}</span>
              <span className="mt-1 block font-mono text-xs text-slate-500">#{member.user_id}</span>
            </span>
          </span>
          <span className="truncate">{memberEmail(member)}</span>
          <span><Badge tone={member.role === "admin" ? "violet" : "cyan"}>{member.role}</Badge></span>
          <span><Badge tone={member.status === "active" ? "green" : "amber"}>{member.status}</Badge></span>
          <span className="flex items-center gap-2">
            <IconButton label="Promote to admin" disabled={actionId === member.id || member.role === "admin"} onClick={() => onPromote(member)} className="h-8 w-8">
              <Crown className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton label="Demote to dispatcher" disabled={actionId === member.id || member.role === "dispatcher"} onClick={() => onDemote(member)} className="h-8 w-8">
              <ShieldCheck className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton label="Remove member" disabled={actionId === member.id} onClick={() => onRemove(member)} className="h-8 w-8 text-red-200 hover:border-red-300/25 hover:bg-red-400/10 hover:text-red-100">
              <Trash2 className="h-3.5 w-3.5" />
            </IconButton>
          </span>
        </div>
      ))}
    </section>
  );
}

function memberName(member: CompanyMember) {
  const firstName = member.first_name ?? member.user?.first_name;
  const lastName = member.last_name ?? member.user?.last_name;
  return [firstName, lastName].filter(Boolean).join(" ") || `User ${member.user_id}`;
}

function memberEmail(member: CompanyMember) {
  return member.email ?? member.user?.email ?? "Email not returned";
}

function toTitleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function getMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Company request failed.";
}
