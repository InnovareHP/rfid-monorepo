import { CalendarPage } from "@/components/calendar/calendar-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/calendar")({
  component: CalendarPage,
});
