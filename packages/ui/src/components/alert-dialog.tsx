import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as React from "react";

import {
  MODAL_SHELL_BODY,
  MODAL_SHELL_CONTENT,
  MODAL_SHELL_FOOTER,
  MODAL_SHELL_HEADER,
  MODAL_SHELL_ICON,
  MODAL_SHELL_TITLE,
} from "@dashboard/ui/lib/modal-shell";
import { cn } from "@dashboard/ui/lib/utils";

const AlertDialog = AlertDialogPrimitive.Root;

const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> & {
    // "shell" is the banded confirm: flush header, scrolling body, flush footer.
    variant?: "default" | "shell";
  }
>(({ className, variant = "default", ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg",
        variant === "default" && "p-4 sm:p-6",
        variant === "shell" && MODAL_SHELL_CONTENT,
        className
      )}
      {...props}
    />
  </AlertDialogPortal>
));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
AlertDialogDescription.displayName =
  AlertDialogPrimitive.Description.displayName;

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action ref={ref} className={cn(className)} {...props} />
));
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel ref={ref} className={cn(className)} {...props} />
));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

// Mirrors DialogFormHeader off the same constants, so a confirm carries the
// same band as a form modal while keeping the alertdialog role.
const AlertDialogFormHeader = ({
  icon,
  title,
  description,
  className,
  iconClassName,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  iconClassName?: string;
}) => (
  <AlertDialogHeader className={cn(MODAL_SHELL_HEADER, className)} {...props}>
    <div className={cn(MODAL_SHELL_ICON, iconClassName)}>{icon}</div>
    <div className="space-y-1">
      <AlertDialogTitle className={MODAL_SHELL_TITLE}>{title}</AlertDialogTitle>
      {description ? (
        <AlertDialogDescription>{description}</AlertDialogDescription>
      ) : null}
    </div>
  </AlertDialogHeader>
);
AlertDialogFormHeader.displayName = "AlertDialogFormHeader";

// Shared modal shell body: the only part of a shell confirm that scrolls.
const AlertDialogFormBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn(MODAL_SHELL_BODY, className)} {...props} />
);
AlertDialogFormBody.displayName = "AlertDialogFormBody";

const AlertDialogFormFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <AlertDialogFooter className={cn(MODAL_SHELL_FOOTER, className)} {...props} />
);
AlertDialogFormFooter.displayName = "AlertDialogFormFooter";

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogFormBody,
  AlertDialogFormFooter,
  AlertDialogFormHeader,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
};
