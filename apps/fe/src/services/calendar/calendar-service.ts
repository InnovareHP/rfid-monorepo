import { axiosClient } from "@/lib/axios-client";

export type CalendarProvider = "google" | "outlook";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start: string | null;
  end: string | null;
  allDay: boolean;
  location: string | null;
  htmlLink: string | null;
  provider: CalendarProvider;
  status: string;
  organizer: string | null;
  attendees: { email: string; responseStatus: string }[];
}

export interface CalendarConnectionStatus {
  google: { connected: boolean; email: string | null };
  outlook: { connected: boolean; email: string | null };
}

export const getCalendarConnectionStatus =
  async (): Promise<CalendarConnectionStatus> => {
    const response = await axiosClient.get("/api/calendar/status");
    return response.data;
  };

export const getCalendarEvents = async (
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> => {
  const response = await axiosClient.get("/api/calendar/events", {
    params: { timeMin, timeMax },
  });
  return response.data;
};

export const getGoogleCalendarAuthUrl = async (): Promise<{ url: string }> => {
  const response = await axiosClient.get("/api/calendar/google/auth-url");
  return response.data;
};

export const getOutlookCalendarAuthUrl = async (): Promise<{
  url: string;
}> => {
  const response = await axiosClient.get("/api/calendar/outlook/auth-url");
  return response.data;
};

export const disconnectGoogleCalendar = async () => {
  const response = await axiosClient.delete("/api/calendar/google/disconnect");
  return response.data;
};

export const disconnectOutlookCalendar = async () => {
  const response = await axiosClient.delete(
    "/api/calendar/outlook/disconnect"
  );
  return response.data;
};

export const createCalendarEvent = async (data: {
  provider: CalendarProvider;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  location?: string;
  attendees?: string[];
}) => {
  const response = await axiosClient.post("/api/calendar/events", data);
  return response.data;
};

export const deleteCalendarEvent = async (
  provider: CalendarProvider,
  eventId: string
) => {
  const response = await axiosClient.delete(
    `/api/calendar/events/${provider}/${eventId}`
  );
  return response.data;
};
