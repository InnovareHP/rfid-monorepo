import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@dashboard/ui/components/breadcrumb";
import { Link, useLocation } from "@tanstack/react-router";
import React from "react";

const UUID_SEGMENT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function DynamicBreadcrumb() {
  const pathname = useLocation();

  const segments = pathname.pathname.split("/").filter((segment) => segment);
  const [organizationId, ...trail] = segments;

  // Record ids are opaque routing keys, never labels — keep them out of the trail
  const crumbs = trail
    .map((segment, index) => ({ segment, index }))
    .filter(({ segment }) => !UUID_SEGMENT.test(segment));

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map(({ segment, index }, position) => {
          const label = decodeURIComponent(segment)
            .replace(/-/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()); // Capitalize words

          const isLast = position === crumbs.length - 1;
          // Built from the full path so the org segment stays in the link
          const href = ["", organizationId, ...trail.slice(0, index + 1)].join(
            "/"
          );

          return (
            <React.Fragment key={href}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={href}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
