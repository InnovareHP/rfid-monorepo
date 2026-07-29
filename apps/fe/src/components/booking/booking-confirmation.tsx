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
};

export function BookingConfirmation({
  title,
  startTime,
  hostName,
}: BookingConfirmationProps) {
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="items-center text-center">
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
        <p className="text-sm text-muted-foreground pt-2">
          A confirmation email is on its way.
        </p>
      </CardContent>
    </Card>
  );
}
