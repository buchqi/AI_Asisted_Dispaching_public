"use client";

import { AnalyticsPage } from "@/features/dispatch/analytics-page";
import { AssignmentsPage } from "@/features/dispatch/assignments-page";
import { BrokersPage } from "@/features/companies/brokers-page";
import { CompaniesPage } from "@/features/companies/companies-page";
import { DriversPage } from "@/features/drivers/drivers-page";
import { LiveLoadsPage } from "@/features/loads/live-loads-page";
import { NotificationsPage } from "@/features/dispatch/notifications-page";
import { SearchCenterPage } from "@/features/search/search-center-page";
import { SettingsPage } from "@/features/settings/settings-page";
import { TrucksPage } from "@/features/trucks/trucks-page";
import { type WorkspacePage } from "@/store/workspace-store";

// OperationalPage is now only a router between domain-owned page components.
// Each business area has its own folder under features/.
export function OperationalPage({ page }: { page: Exclude<WorkspacePage, "dispatch"> }) {
  switch (page) {
    case "live-loads":
      return <LiveLoadsPage />;
    case "assignments":
      return <AssignmentsPage />;
    case "search-sessions":
      return <SearchCenterPage />;
    case "brokers":
      return <BrokersPage />;
    case "companies":
      return <CompaniesPage />;
    case "trucks":
      return <TrucksPage />;
    case "drivers":
      return <DriversPage />;
    case "analytics":
      return <AnalyticsPage />;
    case "notifications":
      return <NotificationsPage />;
    case "settings":
      return <SettingsPage />;
  }
}
