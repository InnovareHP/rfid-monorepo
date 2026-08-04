import { LandingPagePreview } from "@/components/marketing/landing-page/landing-page-preview";
import { getPublicLandingPage } from "@/services/marketing/landing-page-service";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useEffect } from "react";

export const PublicLandingPage = () => {
  const { slug } = useParams({ strict: false }) as { slug: string };

  const {
    data: page,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["public-landing-page", slug],
    queryFn: () => getPublicLandingPage(slug),
  });

  useEffect(() => {
    if (page?.seoTitle) document.title = page.seoTitle;
  }, [page?.seoTitle]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  if (isError || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        This page is not available.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <LandingPagePreview
        sections={page.sections}
        embeddedForm={page.embeddedForm}
      />
    </div>
  );
};
