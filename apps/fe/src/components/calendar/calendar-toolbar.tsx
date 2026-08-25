import {
  SegmentedTabsList,
  SegmentedTabsTrigger,
} from "@/components/segmented-tabs";
import { Button } from "@dashboard/ui/components/button";
import { Tabs } from "@dashboard/ui/components/tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CalendarView = "dayGridMonth" | "timeGridWeek" | "timeGridDay";

type CalendarToolbarProps = {
  title: string;
  view: CalendarView;
  onPrev: () => void;
  onNext: () => void;
  onViewChange: (view: CalendarView) => void;
};

export function CalendarToolbar({
  title,
  view,
  onPrev,
  onNext,
  onViewChange,
}: CalendarToolbarProps) {
  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-5">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={onPrev}
          aria-label="Previous period"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={onNext}
          aria-label="Next period"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <h2 className="text-xl font-semibold text-foreground sm:flex-1 sm:text-center sm:text-3xl">
        {title}
      </h2>

      <Tabs
        className="max-w-full overflow-x-auto"
        value={view}
        onValueChange={(value) => onViewChange(value as CalendarView)}
      >
        <SegmentedTabsList>
          <SegmentedTabsTrigger value="dayGridMonth">Month</SegmentedTabsTrigger>
          <SegmentedTabsTrigger value="timeGridWeek">Week</SegmentedTabsTrigger>
          <SegmentedTabsTrigger value="timeGridDay">Day</SegmentedTabsTrigger>
        </SegmentedTabsList>
      </Tabs>
    </div>
  );
}
