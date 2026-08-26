import { axiosClient } from "@/lib/axios-client";

export type BookingLocation = "VIDEO" | "IN_PERSON";

export interface PublicBookingPage {
  // False when the host has no calendar connected: slots stay empty and the
  // booking endpoint rejects.
  acceptingBookings: boolean;
  title: string;
  description: string | null;
  durationMinutes: number;
  // BOTH is the only value that lets the invitee pick.
  locationType: BookingLocation | "BOTH";
  locationLabel: string | null;
  timezone: string;
  hostName: string;
  organizationName: string | null;
  organizationLogo: string | null;
}

export const getPublicBookingPage = async (
  slug: string
): Promise<PublicBookingPage> => {
  const response = await axiosClient.get(`/api/booking/public/${slug}`);
  return response.data;
};

export const getPublicBookingSlots = async (
  slug: string,
  date: string
): Promise<string[]> => {
  const response = await axiosClient.get(
    `/api/booking/public/${slug}/slots`,
    { params: { date } }
  );
  return response.data;
};

export const createPublicBooking = async (
  slug: string,
  data: {
    startTime: string;
    inviteeName: string;
    inviteeEmail: string;
    inviteeNotes?: string;
    locationType?: BookingLocation;
    boardId?: string;
    inviteeTimezone?: string;
  }
): Promise<{
  id: string;
  startTime: string;
  endTime: string;
  status: "CONFIRMED" | "CANCELLED";
  meetingUrl: string | null;
}> => {
  const response = await axiosClient.post(
    `/api/booking/public/${slug}/bookings`,
    data
  );
  return response.data;
};

// ─── Invitee-side management ────────────────────────────────────────────
// The booking id is the only credential; it reaches the invitee by email.

export interface ManagedBooking {
  id: string;
  title: string;
  status: "CONFIRMED" | "CANCELLED";
  startTime: string;
  endTime: string;
  durationMinutes: number;
  timezone: string;
  hostTimezone: string;
  hostName: string | null;
  locationLabel: string | null;
  meetingUrl: string | null;
  inviteeName: string;
  slug: string;
}

export const getManagedBooking = async (
  bookingId: string
): Promise<ManagedBooking> => {
  const response = await axiosClient.get(
    `/api/booking/public/bookings/${bookingId}`
  );
  return response.data;
};

export const cancelManagedBooking = async (
  bookingId: string
): Promise<{ status: "CANCELLED" }> => {
  const response = await axiosClient.post(
    `/api/booking/public/bookings/${bookingId}/cancel`
  );
  return response.data;
};

export const rescheduleManagedBooking = async (
  bookingId: string,
  startTime: string
): Promise<{
  startTime: string;
  endTime: string;
  meetingUrl: string | null;
}> => {
  const response = await axiosClient.post(
    `/api/booking/public/bookings/${bookingId}/reschedule`,
    { startTime }
  );
  return response.data;
};
