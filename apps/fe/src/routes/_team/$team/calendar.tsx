import { createFileRoute } from "@tanstack/react-router";
import { Calendar } from "lucide-react";

export const Route = createFileRoute("/_team/$team/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-muted-foreground">
      <Calendar className="size-16 stroke-1" />
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">Calendar</h2>
        <p className="mt-1 text-sm">Coming soon</p>
      </div>
    </div>
  );
}
