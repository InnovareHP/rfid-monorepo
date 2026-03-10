import { axiosClient } from "../../lib/axios-client";

export interface ManualCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  order: number;
  _count?: { articles: number };
}

export interface ManualStep {
  id: string;
  title: string | null;
  content: string;
  imageUrl: string | null;
  order: number;
}

export interface ManualArticle {
  id: string;
  title: string;
  slug: string;
  summary: string;
  published: boolean;
  order: number;
  categoryId: string;
  category: { id: string; name: string; slug: string; icon: string | null };
  steps: ManualStep[];
  createdByUser: { id: string; name: string; image: string | null };
}

export interface ManualArticleResponse {
  articles: ManualArticle[];
  total: number;
}

export const getCategories = async (): Promise<ManualCategory[]> => {
  const response = await axiosClient.get("/api/manual/categories");
  return response.data;
};

export const getPublishedArticles = async (
  categoryId?: string,
  limit?: number,
  page?: number
): Promise<ManualArticleResponse> => {
  const params = {
    categoryId,
    limit,
    page,
  };
  const response = await axiosClient.get("/api/manual/published", { params });
  return response.data;
};

export const getPublishedArticleBySlug = async (
  slug: string
): Promise<ManualArticle> => {
  const response = await axiosClient.get(`/api/manual/published/${slug}`);
  return response.data;
};
