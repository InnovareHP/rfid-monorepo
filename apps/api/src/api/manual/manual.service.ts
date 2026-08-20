import { Injectable, NotFoundException } from "@nestjs/common";
import { CACHE_PREFIX } from "../../lib/constant";
import { prisma } from "../../lib/prisma/prisma";
import { cacheData, getData, purgeAllCacheKeys } from "../../lib/redis/redis";
import {
  CreateArticleDto,
  CreateCategoryDto,
  UpdateArticleDto,
  UpdateCategoryDto,
} from "./dto/manual.schema";

// Published help content is global and changes only when an editor saves, so the
// day is a backstop and every mutation purges the prefix. Editor-facing reads are
// deliberately uncached so a save is visible immediately.
const MANUAL_CACHE_TTL = 60 * 60 * 24;

@Injectable()
export class ManualService {
  private cacheKey(...parts: (string | number)[]) {
    return [CACHE_PREFIX.MANUAL, ...parts].join(":");
  }

  private async cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = await getData(key);
    if (hit) return hit as T;

    const fresh = await load();
    // A miss is not cached, so a slug that appears later is not shadowed by it.
    if (fresh) await cacheData(key, fresh, MANUAL_CACHE_TTL);
    return fresh;
  }

  private purge() {
    return purgeAllCacheKeys(CACHE_PREFIX.MANUAL);
  }

  async getCategories() {
    return prisma.manualCategory.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { articles: true } } },
    });
  }

  async getPublishedCategories() {
    return this.cached(this.cacheKey("categories"), async () => {
      const categories = await prisma.manualCategory.findMany({
        orderBy: { order: "asc" },
        include: {
          articles: { where: { published: true }, select: { id: true } },
        },
      });
      return categories.map(({ articles, ...category }) => ({
        ...category,
        _count: { articles: articles.length },
      }));
    });
  }

  async getPublishedCategoryBySlug(slug: string) {
    const category = await this.cached(this.cacheKey("category", slug), () =>
      prisma.manualCategory.findUnique({ where: { slug } })
    );
    if (!category) throw new NotFoundException("Category not found");
    return category;
  }

  async getCategoryById(id: string) {
    const category = await prisma.manualCategory.findUnique({
      where: { id },
      include: {
        articles: {
          orderBy: { order: "asc" },
          include: { _count: { select: { steps: true } } },
        },
      },
    });
    if (!category) throw new NotFoundException("Category not found");
    return category;
  }

  async createCategory(data: CreateCategoryDto) {
    const category = await prisma.manualCategory.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        icon: data.icon,
        order: data.order,
      },
    });
    await this.purge();
    return category;
  }

  async updateCategory(id: string, data: UpdateCategoryDto) {
    const category = await prisma.manualCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException("Category not found");
    const updated = await prisma.manualCategory.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        icon: data.icon,
        order: data.order,
      },
    });
    await this.purge();
    return updated;
  }

  async deleteCategory(id: string) {
    const category = await prisma.manualCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException("Category not found");
    const deleted = await prisma.manualCategory.delete({ where: { id } });
    await this.purge();
    return deleted;
  }

  async getArticles(categoryId?: string, limit?: number, page?: number) {
    const offset = (Number(page) - 1) * Number(limit);
    const [articles, total] = await Promise.all([
      prisma.manualArticle.findMany({
        where: categoryId ? { categoryId } : undefined,
        skip: Number(offset),
        take: Number(limit),
        orderBy: { order: "asc" },
        include: {
          category: {
            select: { id: true, name: true, slug: true, icon: true },
          },
          steps: { orderBy: { order: "asc" } },
          createdByUser: { select: { id: true, name: true, image: true } },
        },
      }),
      prisma.manualArticle.count({
        where: { ...(categoryId ? { categoryId } : {}) },
      }),
    ]);
    return { articles, total };
  }

  async getPublishedArticles(
    categoryId?: string,
    limit?: number,
    page?: number,
    search?: string
  ) {
    const offset = (Number(page) - 1) * Number(limit);
    const where = {
      published: true,
      ...(categoryId ? { categoryId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { summary: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const load = async () => {
      const [articles, total] = await Promise.all([
        prisma.manualArticle.findMany({
          where,
          skip: Number(offset),
          take: Number(limit),
          orderBy: { order: "asc" },
          include: {
            category: {
              select: { id: true, name: true, slug: true, icon: true },
            },
            steps: { orderBy: { order: "asc" } },
            createdByUser: { select: { id: true, name: true, image: true } },
          },
        }),
        prisma.manualArticle.count({ where }),
      ]);
      return { articles, total };
    };

    // Search terms are unbounded, so those queries go straight to the database
    // rather than filling Redis with one key per phrase anyone types.
    if (search) return load();

    return this.cached(
      this.cacheKey(
        "articles",
        categoryId ?? "all",
        Number(limit),
        Number(page)
      ),
      load
    );
  }

  async getFeaturedArticles(limit?: number) {
    const take = Number(limit) || 9;
    return this.cached(this.cacheKey("featured", take), () =>
      prisma.manualArticle.findMany({
        where: { published: true, featured: true },
        take,
        orderBy: { order: "asc" },
        include: {
          category: {
            select: { id: true, name: true, slug: true, icon: true },
          },
        },
      })
    );
  }

  async getPublishedArticleBySlug(slug: string) {
    const article = await this.cached(this.cacheKey("article", slug), () =>
      prisma.manualArticle.findUnique({
        where: { slug, published: true },
        include: {
          category: {
            select: { id: true, name: true, slug: true, icon: true },
          },
          steps: { orderBy: { order: "asc" } },
          createdByUser: { select: { id: true, name: true, image: true } },
        },
      })
    );
    if (!article) throw new NotFoundException("Article not found");
    return article;
  }

  async getArticleById(id: string) {
    const article = await prisma.manualArticle.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        steps: { orderBy: { order: "asc" } },
        createdByUser: { select: { id: true, name: true, image: true } },
      },
    });
    if (!article) throw new NotFoundException("Article not found");
    return article;
  }

  async createArticle(userId: string, data: CreateArticleDto) {
    const article = await prisma.manualArticle.create({
      data: {
        title: data.title,
        slug: data.slug,
        summary: data.summary,
        categoryId: data.categoryId,
        published: data.published,
        featured: data.featured,
        readMinutes: data.readMinutes,
        order: data.order,
        createdBy: userId,
        steps: {
          create: data.steps.map((step, index) => ({
            title: step.title,
            content: step.content,
            imageUrl: step.imageUrl,
            order: step.order ?? index,
          })),
        },
      },
      include: {
        steps: { orderBy: { order: "asc" } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });
    await this.purge();
    return article;
  }

  async updateArticle(id: string, data: UpdateArticleDto) {
    const article = await prisma.manualArticle.findUnique({ where: { id } });
    if (!article) throw new NotFoundException("Article not found");

    const { steps, ...articleData } = data;

    const updated = await prisma.$transaction(async (tx) => {
      if (steps) {
        await tx.manualStep.deleteMany({ where: { articleId: id } });
        await tx.manualStep.createMany({
          data: steps.map((step, index) => ({
            title: step.title,
            content: step.content,
            imageUrl: step.imageUrl,
            articleId: id,
            order: step.order ?? index,
          })),
        });
      }

      return tx.manualArticle.update({
        where: { id },
        data: {
          title: articleData.title,
          slug: articleData.slug,
          summary: articleData.summary,
          categoryId: articleData.categoryId,
          published: articleData.published,
          featured: articleData.featured,
          readMinutes: articleData.readMinutes,
          order: articleData.order,
        },
        include: {
          steps: { orderBy: { order: "asc" } },
          category: { select: { id: true, name: true, slug: true } },
        },
      });
    });
    await this.purge();
    return updated;
  }

  async deleteArticle(id: string) {
    const article = await prisma.manualArticle.findUnique({ where: { id } });
    if (!article) throw new NotFoundException("Article not found");
    const deleted = await prisma.manualArticle.delete({ where: { id } });
    await this.purge();
    return deleted;
  }
}
