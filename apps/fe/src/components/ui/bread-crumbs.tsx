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

export function DynamicBreadcrumb() {
  const pathname = useLocation();

  const pathSegments = pathname.pathname
    .split("/")
    .filter((segment) => segment)
    .slice(1);

  const buildHref = (index: number) =>
    "/" + pathSegments.slice(0, index + 1).join("/");

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {pathSegments.map((segment, index) => {
          const label = decodeURIComponent(segment)
            .replace(/-/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()); // Capitalize words

          const isLast = index === pathSegments.length - 1;
          const href = buildHref(index);

          return (
            <React.Fragment key={index}>
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
