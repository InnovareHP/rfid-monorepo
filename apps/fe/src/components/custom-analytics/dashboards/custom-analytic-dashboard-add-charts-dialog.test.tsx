// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CustomAnalyticDashboardAddChartsDialog } from "./custom-analytic-dashboard-add-charts-dialog";

vi.mock("@/services/custom-analytics/custom-analytics-service", () => ({
  getCustomAnalytics: vi.fn().mockResolvedValue([
    { id: "a1", name: "Referrals by source" },
    { id: "a2", name: "Leads by status" },
  ]),
}));

afterEach(cleanup);

const client = new QueryClient();

const dialog = (open: boolean) => (
  <QueryClientProvider client={client}>
    <CustomAnalyticDashboardAddChartsDialog
      open={open}
      memberIds={[]}
      isSaving={false}
      onOpenChange={() => {}}
      onAdd={() => {}}
    />
  </QueryClientProvider>
);

const addButton = () =>
  screen.getByRole("button", { name: "Add to Dashboard" });

describe("CustomAnalyticDashboardAddChartsDialog", () => {
  it("starts empty when reopened after the parent closed it on a successful add", async () => {
    const { rerender } = render(dialog(true));

    fireEvent.click(await screen.findByText("Choose a chart..."));
    fireEvent.click(await screen.findByText("Referrals by source"));
    expect(addButton().hasAttribute("disabled")).toBe(false);

    // The view page closes the dialog itself from the mutation's onSuccess.
    rerender(dialog(false));
    rerender(dialog(true));

    expect(addButton().hasAttribute("disabled")).toBe(true);
  });
});
