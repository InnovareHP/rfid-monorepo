import { ROLES } from "@dashboard/shared";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Roles, Session } from "@thallesp/nestjs-better-auth";
import {
  CreateArticleDto,
  CreateCategoryDto,
  UpdateArticleDto,
  UpdateCategoryDto,
} from "./dto/manual.schema";
import { ManualService } from "./manual.service";

@Controller("manual")
@UseGuards(AuthGuard)
export class ManualController {
  constructor(private readonly manualService: ManualService) {}

  @Get("/published")
  async getPublishedArticles(
    @Query("categoryId") categoryId?: string,
    @Query("limit") limit?: number,
    @Query("page") page?: number
  ) {
    try {
      return await this.manualService.getPublishedArticles(
        categoryId,
        limit,
        page
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/published/:slug")
  async getPublishedArticleBySlug(@Param("slug") slug: string) {
    try {
      return await this.manualService.getPublishedArticleBySlug(slug);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/categories")
  async getCategories() {
    try {
      return await this.manualService.getCategories();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/categories")
  @UseGuards(AuthGuard)
  @Roles([ROLES.SUPPORT, ROLES.SUPER_ADMIN])
  async createCategory(@Body() dto: CreateCategoryDto) {
    try {
      return await this.manualService.createCategory(dto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch("/categories/:id")
  @UseGuards(AuthGuard)
  @Roles([ROLES.SUPPORT, ROLES.SUPER_ADMIN])
  async updateCategory(
    @Param("id") id: string,
    @Body() dto: UpdateCategoryDto
  ) {
    try {
      return await this.manualService.updateCategory(id, dto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("/categories/:id")
  @UseGuards(AuthGuard)
  @Roles([ROLES.SUPPORT, ROLES.SUPER_ADMIN])
  async deleteCategory(@Param("id") id: string) {
    try {
      return await this.manualService.deleteCategory(id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/articles")
  @UseGuards(AuthGuard)
  @Roles([ROLES.SUPPORT, ROLES.SUPER_ADMIN])
  async getArticles(
    @Query("categoryId") categoryId?: string,
    @Query("limit") limit?: number,
    @Query("page") page?: number
  ) {
    try {
      return await this.manualService.getArticles(
        categoryId,
        Number(limit),
        Number(page)
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/articles/:id")
  @UseGuards(AuthGuard)
  @Roles([ROLES.SUPPORT, ROLES.SUPER_ADMIN])
  async getArticleById(@Param("id") id: string) {
    try {
      return await this.manualService.getArticleById(id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/articles")
  @UseGuards(AuthGuard)
  @Roles([ROLES.SUPPORT, ROLES.SUPER_ADMIN])
  async createArticle(
    @Body() dto: CreateArticleDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.manualService.createArticle(session.user.id, dto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch("/articles/:id")
  @UseGuards(AuthGuard)
  @Roles([ROLES.SUPPORT, ROLES.SUPER_ADMIN])
  async updateArticle(@Param("id") id: string, @Body() dto: UpdateArticleDto) {
    try {
      return await this.manualService.updateArticle(id, dto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("/articles/:id")
  @UseGuards(AuthGuard)
  @Roles([ROLES.SUPPORT, ROLES.SUPER_ADMIN])
  async deleteArticle(@Param("id") id: string) {
    try {
      return await this.manualService.deleteArticle(id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
