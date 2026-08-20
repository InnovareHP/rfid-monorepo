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
    <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
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

      <h2 className="flex-1 text-center text-2xl font-semibold text-foreground sm:text-3xl">
        {title}
      </h2>

      <Tabs
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
