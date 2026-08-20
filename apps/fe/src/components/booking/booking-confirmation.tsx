import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { CheckCircle } from "lucide-react";

type BookingConfirmationProps = {
  title: string;
  startTime: string;
  hostName: string;
  meetingUrl?: string | null;
};

export function BookingConfirmation({
  title,
  startTime,
  hostName,
  meetingUrl,
}: BookingConfirmationProps) {
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="flex flex-col justify-center items-center text-center">
        <CheckCircle className="h-10 w-10 text-green-600 mb-2" />
        <CardTitle>Booking Confirmed</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">
          {new Date(startTime).toLocaleString(undefined, {
            dateStyle: "full",
            timeStyle: "short",
          })}
        </p>
        <p className="text-sm text-muted-foreground">with {hostName}</p>
        {meetingUrl && (
          <a
            href={meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block break-all pt-2 text-sm font-medium text-primary underline"
          >
            Join the meeting
          </a>
        )}
        <p className="text-sm text-muted-foreground pt-2">
          A confirmation email is on its way.
        </p>
      </CardContent>
    </Card>
  );
}
