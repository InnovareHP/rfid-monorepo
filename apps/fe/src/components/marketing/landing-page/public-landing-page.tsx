import { PublicPageSkeleton } from "@/components/skeletons/page-skeletons";
import { LandingPagePreview } from "@/components/marketing/landing-page/landing-page-preview";
import { getPublicLandingPage } from "@/services/marketing/landing-page-service";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useEffect } from "react";

export const PublicLandingPage = () => {
  const { orgSlug, slug } = useParams({ strict: false }) as {
    orgSlug: string;
    slug: string;
  };

  const {
    data: page,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["public-landing-page", orgSlug, slug],
    queryFn: () => getPublicLandingPage(orgSlug, slug),
  });

  useEffect(() => {
    if (page?.seoTitle) document.title = page.seoTitle;
  }, [page?.seoTitle]);

  if (isLoading) {
    return <PublicPageSkeleton />;
  }

  if (isError || !page) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-gray-500">
        This page is not available.
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-white">
      <LandingPagePreview
        sections={page.sections}
        embeddedForm={page.embeddedForm}
      />
    </div>
  );
};
