import { WriteGate } from "@/components/write-gate";
import { CalendarSkeleton } from "@/components/booking/booking-skeleton";
import {
  CalendarToolbar,
  type CalendarView,
} from "@/components/calendar/calendar-toolbar";
import { PageHeader } from "@/components/page-header";
import {
  getCalendarConnectionStatus,
  getCalendarEvents,
  type CalendarConnectionStatus,
  type CalendarEvent,
} from "@/services/calendar/calendar-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { Card } from "@dashboard/ui/components/card";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import type {
  DateSelectArg,
  DatesSetArg,
  DayHeaderContentArg,
  EventClickArg,
} from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouteContext } from "@tanstack/react-router";
import { addMonths, startOfMonth, subMonths } from "date-fns";
import { Calendar, Loader2, PlugZap, Plus } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { CreateEventDialog } from "./create-event-dialog";
import { EventDetailDialog } from "./event-detail-dialog";

interface RouteContext {
  activeOrganizationId: string;
}

// Weekday names carry the header typography, so the label is rendered rather
// than left to FullCalendar's own formatting.
function renderDayHeader(arg: DayHeaderContentArg) {
  const isDayView = arg.view.type === "timeGridDay";
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-sm font-bold uppercase tracking-wide text-brand">
        {arg.date.toLocaleDateString(undefined, {
          weekday: isDayView ? "long" : "short",
        })}
      </span>
      {arg.view.type === "timeGridWeek" && (
        <span className="text-xs font-medium text-muted-foreground">
          {arg.date.getMonth() + 1}/{arg.date.getDate()}
        </span>
      )}
    </div>
  );
}

export function CalendarPage() {
  const ctx = useRouteContext({ from: "__root__" }) as RouteContext;
  const { activeOrganizationId } = ctx;
  const calendarRef = useRef<FullCalendar>(null);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [defaultEventDate, setDefaultEventDate] = useState<Date | undefined>();
  const [dateRange, setDateRange] = useState(() => ({
    start: subMonths(startOfMonth(new Date()), 1).toISOString(),
    end: addMonths(startOfMonth(new Date()), 2).toISOString(),
  }));
  // The toolbar lives outside FullCalendar, so its title and active view are
  // mirrored from the calendar API on every navigation.
  const [toolbar, setToolbar] = useState<{
    title: string;
    view: CalendarView;
  }>({ title: "", view: "dayGridMonth" });

  const { data: connectionStatus, isLoading: statusLoading } =
    useQuery<CalendarConnectionStatus>({
      queryKey: ["calendar-status"],
      queryFn: getCalendarConnectionStatus,
      staleTime: 5 * 60 * 1000,
    });

  const hasConnection =
    connectionStatus?.google.connected || connectionStatus?.outlook.connected;

  const { data: events, isLoading: eventsLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["calendar-events", dateRange.start, dateRange.end],
    queryFn: () => getCalendarEvents(dateRange.start, dateRange.end),
    enabled: !!hasConnection,
    staleTime: 2 * 60 * 1000,
  });

  const calendarEvents = (events || []).map((event) => ({
    id: `${event.provider}-${event.id}`,
    title: event.title,
    start: event.start || undefined,
    end: event.end || undefined,
    allDay: event.allDay,
    extendedProps: event,
    classNames: [
      event.provider === "google" ? "fc-event-google" : "fc-event-outlook",
    ],
  }));

  const handleEventClick = useCallback((info: EventClickArg) => {
    const event = info.event.extendedProps as CalendarEvent;
    setSelectedEvent(event);
    setShowEventDetail(true);
  }, []);

  const handleDateSelect = useCallback(
    (selectInfo: DateSelectArg) => {
      if (!hasConnection) return;
      setDefaultEventDate(selectInfo.start);
      setShowCreateEvent(true);
    },
    [hasConnection]
  );

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      setToolbar({
        title: arg.view.title,
        view: arg.view.type as CalendarView,
      });
      const newStart = subMonths(arg.start, 1).toISOString();
      const newEnd = addMonths(arg.end, 1).toISOString();
      if (newStart !== dateRange.start || newEnd !== dateRange.end) {
        setDateRange({ start: newStart, end: newEnd });
      }
    },
    [dateRange]
  );

  if (statusLoading) {
    return (
      <div className="page-style flex flex-col">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Card className="gap-0 overflow-hidden p-0">
          <CalendarSkeleton />
        </Card>
      </div>
    );
  }

  return (
    // h-full keeps the shell height definite so FullCalendar's height="100%" resolves.
    <div className="page-style flex h-full flex-col">
      <PageHeader
        title="Calendar"
        description={
          hasConnection && (
            <span className="flex flex-wrap items-center gap-3">
              {connectionStatus?.google.connected && (
                <span className="flex items-center gap-1.5 text-foreground">
                  <span className="inline-block size-2 rounded-full bg-google" />
                  Google
                </span>
              )}
              {connectionStatus?.outlook.connected && (
                <span className="flex items-center gap-1.5 text-foreground">
                  <span className="inline-block size-2 rounded-full bg-outlook" />
                  Outlook
                </span>
              )}
              <Badge variant="success">Connected</Badge>
            </span>
          )
        }
      >
        {hasConnection && (
          <WriteGate>
            <Button
              onClick={() => {
                setDefaultEventDate(new Date());
                setShowCreateEvent(true);
              }}
            >
              <Plus className="size-4" />
              New Event
            </Button>
          </WriteGate>
        )}
      </PageHeader>

      {!hasConnection ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-muted-foreground">
          <div className="flex size-20 items-center justify-center rounded-2xl bg-primary/15 shadow-inner">
            <Calendar className="size-10 stroke-[1.5] text-primary/50" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">
              Connect a Calendar
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Connect your Google Calendar or Outlook Calendar from the
              Integrations page to view and manage your events here.
            </p>
          </div>
          <Button asChild>
            <Link
              to="/$team/integrations"
              params={{ team: activeOrganizationId }}
              search={{ tab: "calendar" } as any}
            >
              <PlugZap className="size-4" />
              Go to Integrations
            </Link>
          </Button>
        </div>
      ) : (
        <Card className="relative min-h-0 flex-1 gap-0 overflow-hidden p-0 shadow-xs">
          <CalendarToolbar
            title={toolbar.title}
            view={toolbar.view}
            onPrev={() => calendarRef.current?.getApi().prev()}
            onNext={() => calendarRef.current?.getApi().next()}
            onViewChange={(view) => calendarRef.current?.getApi().changeView(view)}
          />

          {eventsLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/60 backdrop-blur-sm">
              <Loader2 className="size-6 animate-spin text-primary/50" />
            </div>
          )}

          <div className="min-h-0 flex-1 border-t">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={false}
              dayHeaderContent={renderDayHeader}
              events={calendarEvents}
              eventClick={handleEventClick}
              selectable
              select={handleDateSelect}
              datesSet={handleDatesSet}
              height="100%"
              nowIndicator
              dayMaxEvents={3}
              eventTimeFormat={{
                hour: "numeric",
                minute: "2-digit",
                meridiem: "short",
              }}
            />
          </div>
        </Card>
      )}

      {connectionStatus && (
        <CreateEventDialog
          open={showCreateEvent}
          onOpenChange={setShowCreateEvent}
          connectionStatus={connectionStatus}
          defaultDate={defaultEventDate}
        />
      )}

      <EventDetailDialog
        event={selectedEvent}
        open={showEventDetail}
        onOpenChange={setShowEventDetail}
      />
    </div>
  );
}
