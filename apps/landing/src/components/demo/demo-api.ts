// The landing site is static and has no axios client, so the demo island talks
// to the API directly.
const API_URL = "https://api.refidly.com";

export type DemoRequestPayload = {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  teamSize?: string;
  notes?: string;
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  website?: string;
};

export type DemoRequestResult = {
  id: string | null;
  acceptingBookings: boolean;
  hostName?: string;
  timezone?: string;
  durationMinutes?: number;
};

export type BookedDemo = {
  startTime: string;
  endTime: string;
  meetingUrl: string | null;
};

const post = async <T>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(`${API_URL}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.message ?? "Something went wrong. Please try again.");
  }

  return response.json() as Promise<T>;
};

export const createDemoRequest = (payload: DemoRequestPayload) =>
  post<DemoRequestResult>("/demo/requests", payload);

// The prospect's own zone travels with the booking so their confirmation email
// reads in local time rather than the host's.
export const visitorTimezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone;

export const bookDemo = (requestId: string, startTime: string) =>
  post<BookedDemo>(`/demo/requests/${requestId}/book`, {
    startTime,
    inviteeTimezone: visitorTimezone(),
  });

export const fetchSlots = async (
  requestId: string,
  date: string
): Promise<string[]> => {
  const response = await fetch(
    `${API_URL}/api/demo/requests/${requestId}/slots?date=${date}`
  );
  if (!response.ok) throw new Error("Could not load times for that day.");

  return response.json() as Promise<string[]>;
};

// Read once at submit rather than stored, so a bookmarked form does not carry
// stale attribution.
export const readAttribution = () => {
  const params = new URLSearchParams(window.location.search);

  return {
    source: params.get("source") ?? "landing",
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
  };
};
