import { AlertCircle } from "lucide-react";

// Shared by the desktop table cell and the mobile card list so both error
// states stay identical.
export const TableErrorState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center gap-3">
    <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
      <AlertCircle className="h-8 w-8 text-destructive" />
    </div>
    <p className="font-semibold text-destructive">{message}</p>
    <p className="text-sm text-muted-foreground">
      Please refresh the page or contact support if the problem persists.
    </p>
  </div>
);
