import { axiosClient } from "@/lib/axios-client";
import type { PublicForm } from "@/services/marketing/form-service";

export type LandingSectionBase = { id: string };

export type HeroSection = LandingSectionBase & {
  type: "HERO";
  props: {
    heading: string;
    subheading?: string;
    imageSrc?: string;
    ctaLabel?: string;
    ctaHref?: string;
  };
};

export type TextSection = LandingSectionBase & {
  type: "TEXT";
  props: {
    heading?: string;
    body: string;
  };
};

export type ImageSection = LandingSectionBase & {
  type: "IMAGE";
  props: {
    src: string;
    alt: string;
    caption?: string;
  };
};

export type FormEmbedSection = LandingSectionBase & {
  type: "FORM_EMBED";
  props: {
    heading?: string;
  };
};

export type CtaSection = LandingSectionBase & {
  type: "CTA";
  props: {
    heading?: string;
    buttonLabel: string;
    href: string;
  };
};

export type LandingSection =
  | HeroSection
  | TextSection
  | ImageSection
  | FormEmbedSection
  | CtaSection;

export type LandingPageStatus = "DRAFT" | "PUBLISHED";

export type MarketingLandingPage = {
  id: string;
  organizationId: string;
  campaignId: string | null;
  name: string;
  slug: string;
  status: LandingPageStatus;
  sections: LandingSection[];
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  formId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicEmbeddedForm = PublicForm & { slug: string };

export type PublicLandingPage = {
  id: string;
  name: string;
  seoTitle: string | null;
  seoDescription: string | null;
  sections: LandingSection[];
  embeddedForm: PublicEmbeddedForm | null;
};

export const getLandingPages = async (): Promise<MarketingLandingPage[]> => {
  const response = await axiosClient.get("/api/marketing/landing-pages");
  return response.data;
};

export const getLandingPage = async (
  id: string
): Promise<MarketingLandingPage> => {
  const response = await axiosClient.get(`/api/marketing/landing-pages/${id}`);
  return response.data;
};

export const createLandingPage = async (data: {
  name: string;
  campaignId?: string;
  sections?: LandingSection[];
  formId?: string;
  seoTitle?: string;
  seoDescription?: string;
}): Promise<MarketingLandingPage> => {
  const response = await axiosClient.post(
    "/api/marketing/landing-pages",
    data
  );
  return response.data;
};

export const updateLandingPage = async (
  id: string,
  data: Partial<{
    name: string;
    campaignId: string;
    sections: LandingSection[];
    formId: string;
    seoTitle: string;
    seoDescription: string;
  }>
): Promise<MarketingLandingPage> => {
  const response = await axiosClient.patch(
    `/api/marketing/landing-pages/${id}`,
    data
  );
  return response.data;
};

export const publishLandingPage = async (
  id: string
): Promise<MarketingLandingPage> => {
  const response = await axiosClient.post(
    `/api/marketing/landing-pages/${id}/publish`
  );
  return response.data;
};

export const deleteLandingPage = async (id: string) => {
  const response = await axiosClient.delete(
    `/api/marketing/landing-pages/${id}`
  );
  return response.data;
};

export const getPublicLandingPage = async (
  slug: string
): Promise<PublicLandingPage> => {
  const response = await axiosClient.get(
    `/api/marketing/public/pages/${slug}`
  );
  return response.data;
};
