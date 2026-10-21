// @vitest-environment jsdom
import type { CalendarConnectionStatus } from "@/services/calendar/calendar-service";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreateEventDialog } from "./create-event-dialog";

vi.mock("@/services/calendar/calendar-service", () => ({
  createCalendarEvent: vi.fn(),
}));

afterEach(cleanup);

const connectionStatus = {
  google: { connected: true, email: "a@example.com" },
  outlook: { connected: false, email: null },
} as unknown as CalendarConnectionStatus;

const client = new QueryClient();

const dialog = (defaultDate: Date) => (
  <QueryClientProvider client={client}>
    <CreateEventDialog
      open
      onOpenChange={() => {}}
      connectionStatus={connectionStatus}
      defaultDate={defaultDate}
    />
  </QueryClientProvider>
);

const startValue = () =>
  (screen.getByLabelText("Start") as HTMLInputElement).value;

describe("CreateEventDialog", () => {
  it("prefills the start with the date clicked on the calendar, not the first one", () => {
    const { rerender } = render(dialog(new Date(2026, 9, 1, 9, 0)));
    expect(startValue()).toBe("2026-10-01T09:00");

    // The page keeps the dialog mounted and only swaps defaultDate per click.
    rerender(dialog(new Date(2026, 9, 22, 14, 30)));

    expect(startValue()).toBe("2026-10-22T14:30");
  });
});
