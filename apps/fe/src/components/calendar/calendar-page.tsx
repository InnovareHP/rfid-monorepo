import {
  getCalendarConnectionStatus,
  getCalendarEvents,
  type CalendarConnectionStatus,
  type CalendarEvent,
} from "@/services/calendar/calendar-service";
import { Button } from "@dashboard/ui/components/button";
import type { DateSelectArg, EventClickArg } from "@fullcalendar/core";
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
    backgroundColor: event.provider === "google" ? "#ea4335" : "#0078d4",
    borderColor: event.provider === "google" ? "#ea4335" : "#0078d4",
    textColor: "#ffffff",
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
    (arg: { start: Date; end: Date }) => {
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
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-blue-100 bg-white/80 backdrop-blur-sm px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md">
              <Calendar className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Calendar
              </h1>
              {/* Legend */}
              {hasConnection && (
                <div className="flex items-center gap-3 mt-0.5">
                  {connectionStatus?.google.connected && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="inline-block size-2.5 rounded-full bg-[#ea4335] ring-2 ring-red-100" />
                      <span>Google</span>
                    </div>
                  )}
                  {connectionStatus?.outlook.connected && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="inline-block size-2.5 rounded-full bg-[#0078d4] ring-2 ring-blue-100" />
                      <span>Outlook</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasConnection && (
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md"
                onClick={() => {
                  setDefaultEventDate(new Date());
                  setShowCreateEvent(true);
                }}
              >
                <Plus className="size-4 mr-1" />
                New Event
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Calendar or empty state */}
      {!hasConnection ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-muted-foreground px-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 shadow-inner">
            <Calendar className="size-10 text-blue-400 stroke-[1.5]" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800">
              Connect a Calendar
            </h2>
            <p className="mt-2 text-sm max-w-md text-gray-500">
              Connect your Google Calendar or Outlook Calendar from the
              Integrations page to view and manage your events here.
            </p>
          </div>
          <Button
            asChild
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md"
          >
            <Link
              to="/$team/integrations"
              params={{ team: activeOrganizationId }}
              search={{ tab: "calendar" } as any}
            >
              <PlugZap className="size-4 mr-1" />
              Go to Integrations
            </Link>
          </Button>
        </div>
      ) : (
        <div className="flex-1 min-h-0 relative mx-4 sm:mx-6 mb-4 sm:mb-6 rounded-xl border border-blue-100 bg-white shadow-sm overflow-hidden">
          {eventsLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-10">
              <Loader2 className="size-6 animate-spin text-blue-400" />
            </div>
          )}
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
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
      )}

      {/* Dialogs */}
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
