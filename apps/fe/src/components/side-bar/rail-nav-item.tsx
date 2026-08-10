import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@dashboard/ui/components/tooltip";
import { cn } from "@dashboard/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { cva, type VariantProps } from "class-variance-authority";
import type { ElementType } from "react";

// Hierarchy comes from the background, not from thinning the label: 10px text at
// 70% opacity on the gradient was below AA.
const railNavItem = cva(
  "flex flex-col items-center justify-center text-brand-rail-foreground transition-colors",
  {
    variants: {
      surface: {
        rail: "size-12 rounded-lg",
        bar: "h-full flex-1",
      },
      active: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        surface: "rail",
        active: true,
        class:
          "bg-brand-rail-foreground/20 shadow-sm ring-1 ring-brand-rail-foreground/35",
      },
      {
        surface: "rail",
        active: false,
        class: "hover:bg-brand-rail-foreground/10",
      },
      {
        surface: "bar",
        active: true,
        class: "bg-brand-rail-foreground/20",
      },
      {
        surface: "bar",
        active: false,
        class: "hover:bg-brand-rail-foreground/10",
      },
    ],
    defaultVariants: { surface: "rail", active: false },
  }
);

type RailNavItemProps = VariantProps<typeof railNavItem> & {
  icon: ElementType;
  label: string;
  href: string;
  className?: string;
};

export function RailNavItem({
  icon: Icon,
  label,
  href,
  surface = "rail",
  active = false,
  className,
}: RailNavItemProps) {
  const link = (
    <Link
      to={href}
      preload={false}
      aria-current={active ? "page" : undefined}
      className={cn(railNavItem({ surface, active }), className)}
    >
      <Icon className="size-5" />
      <span className="mt-1 w-full truncate px-0.5 text-center text-[10px] leading-none font-medium">
        {label}
      </span>
    </Link>
  );

  // The bottom bar has room for the label and no space for a tooltip to sit in.
  if (surface === "bar") return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
