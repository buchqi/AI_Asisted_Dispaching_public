"use client";

import { AnalyticsPage } from "@/components/analytics/analytics-page";
import { AssignmentsPage } from "@/components/assignments/assignments-page";
import { BrokersPage } from "@/components/brokers/brokers-page";
import { CompaniesPage } from "@/components/companies/companies-page";
import { DriversPage } from "@/components/drivers/drivers-page";
import { LiveLoadsPage } from "@/components/loads/live-loads-page";
import { NotificationsPage } from "@/components/notifications/notifications-page";
import { SearchCenterPage } from "@/components/search/search-center-page";
import { SettingsPage } from "@/components/settings/settings-page";
import { TrucksPage } from "@/components/trucks/trucks-page";
import { type WorkspacePage } from "@/store/workspace-store";

// OperationalPage is now only a router between domain-owned page components.
// Each business area has its own folder under components/.
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
