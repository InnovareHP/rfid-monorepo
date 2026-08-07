import { axiosClient } from "@/lib/axios-client";

export interface BookingPage {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  locationType: "VIDEO" | "IN_PERSON" | "BOTH";
  locationLabel: string | null;
  durationMinutes: number;
  timezone: string;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  minNoticeHours: number;
  isActive: boolean;
  publicUrl: string;
  // No connected calendar means the public page takes no bookings at all.
  calendarConnected: boolean;
}

export interface AvailabilityRule {
  id: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
}

export interface Booking {
  id: string;
  bookingPageId: string;
  inviteeName: string;
  inviteeEmail: string;
  inviteeNotes: string | null;
  startTime: string;
  endTime: string;
  status: "CONFIRMED" | "CANCELLED";
  calendarProvider: string | null;
  calendarSyncFailed: boolean;
}

export interface PaginatedBookings {
  data: Booking[];
  total: number;
  nextPage: number | null;
}

export const getOwnBookingPage = async (): Promise<BookingPage> => {
  const response = await axiosClient.get("/api/booking/me");
  return response.data;
};

export const updateOwnBookingPage = async (
  data: Partial<{
    title: string;
    description: string;
    locationType: "VIDEO" | "IN_PERSON" | "BOTH";
    locationLabel: string;
    durationMinutes: number;
    timezone: string;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
    minNoticeHours: number;
    isActive: boolean;
  }>
): Promise<BookingPage> => {
  const response = await axiosClient.patch("/api/booking/me", data);
  return response.data;
};

export const getOwnAvailability = async (): Promise<AvailabilityRule[]> => {
  const response = await axiosClient.get("/api/booking/me/availability");
  return response.data;
};

export const replaceOwnAvailability = async (
  rules: { dayOfWeek: number; startMinute: number; endMinute: number }[]
): Promise<AvailabilityRule[]> => {
  const response = await axiosClient.put("/api/booking/me/availability", {
    rules,
  });
  return response.data;
};

export const getOwnBookings = async (
  page = 1,
  limit = 20
): Promise<PaginatedBookings> => {
  const response = await axiosClient.get("/api/booking/bookings", {
    params: { page, limit },
  });
  return response.data;
};

export const cancelBooking = async (id: string) => {
  const response = await axiosClient.delete(`/api/booking/bookings/${id}`);
  return response.data;
};
