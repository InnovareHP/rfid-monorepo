// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CustomAnalyticDashboardsListPage from "./custom-analytic-dashboards-list-page";

const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
  useParams: () => ({ team: "org1" }),
  useSearch: () => ({ new: true }),
  useRouteContext: () => ({ activeOrganizationId: "org1" }),
}));
vi.mock(
  "@/services/custom-analytics/custom-analytic-dashboard-service",
  () => ({
    getDashboards: vi.fn().mockResolvedValue([]),
    createDashboard: vi.fn().mockResolvedValue({ id: "dash1", name: "Q4" }),
    deleteDashboard: vi.fn(),
    updateDashboard: vi.fn(),
  })
);
vi.mock("./unfiled-charts-section", () => ({
  UnfiledChartsSection: () => null,
}));

afterEach(() => {
  cleanup();
  navigate.mockClear();
});

const renderPage = () => {
  const client = new QueryClient();
  client.setQueryData(["member-data", "org1"], { role: "owner" });
  return render(
    <QueryClientProvider client={client}>
      <CustomAnalyticDashboardsListPage />
    </QueryClientProvider>
  );
};

describe("CustomAnalyticDashboardsListPage create", () => {
  it("opens the new dashboard after Create Dashboard instead of returning to the list", async () => {
    renderPage();

    fireEvent.change(await screen.findByPlaceholderText("Referral overview"), {
      target: { value: "Q4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Dashboard" }));

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(navigate.mock.lastCall?.[0]).toMatchObject({
      to: "/$team/analytics/custom/dashboards/$dashboardId",
      params: { team: "org1", dashboardId: "dash1" },
    });
  });
});
