// @vitest-environment jsdom
import type { MarketingBlast } from "@/services/marketing/blast-service";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BlastSendDialog } from "./blast-send-dialog";

vi.mock("@/services/marketing/blast-service", () => ({
  getBlastAudienceCount: vi.fn(),
  sendBlast: vi.fn(),
}));
vi.mock("@/services/marketing/campaign-service", () => ({
  getCampaigns: vi.fn().mockResolvedValue([]),
}));

import { getBlastAudienceCount } from "@/services/marketing/blast-service";

afterEach(cleanup);

const blast = {
  id: "b1",
  campaignId: "c1",
  groups: [],
} as unknown as MarketingBlast;

// Mirrors apps/api/src/filter/filter.ts, which nests HttpException.getResponse() under `message`.
const httpError = (message: string) => ({
  response: {
    data: {
      statusCode: 400,
      message: { message, error: "Bad Request", statusCode: 400 },
    },
  },
});

const renderDialog = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BlastSendDialog blast={blast} onOpenChange={() => {}} />
    </QueryClientProvider>
  );

describe("BlastSendDialog", () => {
  it("shows the API reason when the blast cannot be sent instead of crashing", async () => {
    vi.mocked(getBlastAudienceCount).mockRejectedValue(
      httpError("This blast has no recipient groups")
    );

    renderDialog();

    expect(
      await screen.findByText("This blast has no recipient groups")
    ).toBeTruthy();
  });
});
