import { axiosClient } from "../../lib/axios-client";

export interface ManualCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  _count?: { articles: number };
}

export interface ManualStep {
  id?: string;
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
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string; slug: string };
  steps?: ManualStep[];
  createdByUser?: { id: string; name: string; image: string | null };
  _count?: { steps: number };
}

export interface ManualArticleResponse {
  articles: ManualArticle[];
  total: number;
}

// ── Categories ──────────────────────────────────────────────

export const getCategories = async (): Promise<ManualCategory[]> => {
  const response = await axiosClient.get("/api/manual/categories");
  return response.data;
};

export const createCategory = async (data: {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  order?: number;
}): Promise<ManualCategory> => {
  const response = await axiosClient.post("/api/manual/categories", data);
  return response.data;
};

export const updateCategory = async (
  id: string,
  data: Partial<{
    name: string;
    slug: string;
    description: string;
    icon: string;
    order: number;
  }>
): Promise<ManualCategory> => {
  const response = await axiosClient.patch(
    `/api/manual/categories/${id}`,
    data
  );
  return response.data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  await axiosClient.delete(`/api/manual/categories/${id}`);
};

export const getArticles = async (
  categoryId?: string,
  limit?: number,
  page?: number
): Promise<ManualArticleResponse> => {
  const params = {
    categoryId,
    limit,
    page,
  };
  const response = await axiosClient.get("/api/manual/articles", { params });
  return response.data;
};

export const getArticleById = async (id: string): Promise<ManualArticle> => {
  const response = await axiosClient.get(`/api/manual/articles/${id}`);
  return response.data;
};

export const createArticle = async (data: {
  title: string;
  slug: string;
  summary: string;
  categoryId: string;
  published?: boolean;
  order?: number;
  steps: {
    title?: string;
    content: string;
    imageUrl?: string;
    order: number;
  }[];
}): Promise<ManualArticle> => {
  const response = await axiosClient.post("/api/manual/articles", data);
  return response.data;
};

export const updateArticle = async (
  id: string,
  data: {
    title?: string;
    slug?: string;
    summary?: string;
    categoryId?: string;
    published?: boolean;
    order?: number;
    steps?: {
      title?: string;
      content: string;
      imageUrl?: string;
      order: number;
    }[];
  }
): Promise<ManualArticle> => {
  const response = await axiosClient.patch(`/api/manual/articles/${id}`, data);
  return response.data;
};

export const deleteArticle = async (id: string): Promise<void> => {
  await axiosClient.delete(`/api/manual/articles/${id}`);
};
