import { GoogleCalendarService } from "./google-calendar.service";
import { OutlookCalendarService } from "./outlook-calendar.service";

export type CalendarProviderKey = "google" | "outlook";

const LABELS: Record<CalendarProviderKey, string> = {
  google: "Google Calendar",
  outlook: "Outlook Calendar",
};

// One calendar per user: bookings write to a single provider, so a second
// connection would leave availability and event ownership split across two.
export async function assertNoOtherCalendar(
  provider: CalendarProviderKey,
  userId: string,
  googleCalendarService: GoogleCalendarService,
  outlookCalendarService: OutlookCalendarService
): Promise<void> {
  const other: CalendarProviderKey =
    provider === "google" ? "outlook" : "google";

  const status =
    other === "google"
      ? await googleCalendarService.getConnectionStatus(userId)
      : await outlookCalendarService.getConnectionStatus(userId);

  if (!status.connected) return;

  throw new Error(
    `${LABELS[other]} is already connected. Disconnect it before connecting ${LABELS[provider]}.`
  );
}
