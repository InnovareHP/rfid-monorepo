import { Button } from "@dashboard/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ErrorPage } from "./error-page";

export const NotFoundPage = () => (
  <ErrorPage
    code="404"
    title="Page not found"
    description="We looked everywhere, but this page isn't where it should be. It may have moved, been renamed, or never existed at all."
    artSrc="/branding/Error/not-found-mascot.png"
    artAlt="Refidly mascot searching with a magnifying glass"
    supportPrefix="Still lost?"
    supportSuffix="and we'll help you find it."
    action={
      <Button
        asChild
        size="sm"
        className="h-8 gap-2.5 bg-brand px-3 text-sm font-bold text-brand-foreground shadow-xs hover:bg-brand/90"
      >
        <Link to="/">
          <ArrowLeft className="size-6" />
          Back to Homepage
        </Link>
      </Button>
    }
  />
);
