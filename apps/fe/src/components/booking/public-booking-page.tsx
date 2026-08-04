import {
  createPublicBooking,
  getPublicBookingPage,
  getPublicBookingSlots,
} from "@/services/booking/booking-public-service";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Button } from "@dashboard/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import { Textarea } from "@dashboard/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Loader2, MapPin } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { BookingConfirmation } from "./booking-confirmation";
import { SlotPicker } from "./slot-picker";

const inviteeSchema = z.object({
  inviteeName: z.string().min(1, "Name is required"),
  inviteeEmail: z.email("Invalid email address"),
  inviteeNotes: z.string().optional(),
});

type InviteeFormValues = z.infer<typeof inviteeSchema>;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PublicBookingPage({
  slug,
  boardId,
}: {
  slug: string;
  boardId?: string;
}) {
  const [date, setDate] = useState(todayIso());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{
    title: string;
    startTime: string;
    hostName: string;
  } | null>(null);

  const pageQuery = useQuery({
    queryKey: ["public-booking-page", slug],
    queryFn: () => getPublicBookingPage(slug),
  });

  const slotsQuery = useQuery({
    queryKey: ["public-booking-slots", slug, date],
    queryFn: () => getPublicBookingSlots(slug, date),
    enabled: !!date,
  });

  const form = useForm<InviteeFormValues>({
    resolver: zodResolver(inviteeSchema),
    defaultValues: { inviteeName: "", inviteeEmail: "", inviteeNotes: "" },
  });

  const bookMutation = useMutation({
    mutationFn: (values: InviteeFormValues) =>
      createPublicBooking(slug, {
        startTime: selectedSlot as string,
        inviteeName: values.inviteeName,
        inviteeEmail: values.inviteeEmail,
        inviteeNotes: values.inviteeNotes || undefined,
        boardId,
      }),
    onSuccess: () => {
      if (!pageQuery.data || !selectedSlot) return;
      setConfirmed({
        title: pageQuery.data.title,
        startTime: selectedSlot,
        hostName: pageQuery.data.hostName,
      });
    },
    onError: (error: Error) => {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? (error.response?.data?.message ?? error.message)
        : error.message;
      toast.error(message || "Failed to book this slot");
    },
  });

  if (confirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <BookingConfirmation {...confirmed} />
      </div>
    );
  }

  if (pageQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (pageQuery.isError || !pageQuery.data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-muted-foreground">
          This booking page is not available.
        </p>
      </div>
    );
  }

  const page = pageQuery.data;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{page.title}</CardTitle>
          <CardDescription>
            {page.durationMinutes} min with {page.hostName}
            {page.organizationName ? ` · ${page.organizationName}` : ""}
          </CardDescription>
          {page.description && (
            <p className="text-sm text-muted-foreground pt-2">
              {page.description}
            </p>
          )}
          {page.locationLabel && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground pt-1">
              <MapPin className="h-3.5 w-3.5" />
              {page.locationLabel}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="booking-date">Date</Label>
            <Input
              id="booking-date"
              type="date"
              value={date}
              min={todayIso()}
              onChange={(e) => {
                setDate(e.target.value);
                setSelectedSlot(null);
              }}
            />
          </div>

          {slotsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading available times...
            </div>
          ) : (
            <SlotPicker
              slots={slotsQuery.data ?? []}
              selected={selectedSlot}
              onSelect={setSelectedSlot}
            />
          )}

          {selectedSlot && (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((values) =>
                  bookMutation.mutate(values)
                )}
                className="space-y-4 border-t pt-4"
              >
                <FormField
                  control={form.control}
                  name="inviteeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="inviteeEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="inviteeNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (optional)</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={bookMutation.isPending}
                >
                  {bookMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Confirm Booking
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
