import { CtaSection } from "@/components/marketing/landing-page/sections/cta-section";
import { FormEmbedSection } from "@/components/marketing/landing-page/sections/form-embed-section";
import { HeroSection } from "@/components/marketing/landing-page/sections/hero-section";
import { ImageSection } from "@/components/marketing/landing-page/sections/image-section";
import { TextSection } from "@/components/marketing/landing-page/sections/text-section";
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
      {page.sections.map((section) => {
        switch (section.type) {
          case "HERO":
            return <HeroSection key={section.id} section={section} />;
          case "TEXT":
            return <TextSection key={section.id} section={section} />;
          case "IMAGE":
            return <ImageSection key={section.id} section={section} />;
          case "FORM_EMBED":
            return (
              <FormEmbedSection
                key={section.id}
                section={section}
                embeddedForm={page.embeddedForm}
              />
            );
          case "CTA":
            return <CtaSection key={section.id} section={section} />;
          default:
            return null;
        }
      })}
    </div>
  );
};
