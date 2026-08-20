import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import { EntitlementGuard } from "../../guard/entitlement/entitlement.guard";
import { HipaaGuard } from "../../guard/hipaa/hipaa.guard";
import { SubscriptionGuard } from "../../guard/subscription/subscription.guard";
import {
  PermissionGuard,
  RequirePermission,
} from "../../guard/permission/permission.guard";
import {
  CreateAttachmentDto,
  CreateChecklistItemDto,
  CreateCommentDto,
  CreateDependencyDto,
  CreateLabelDto,
  CreateListDto,
  CreateProjectDto,
  CreateTaskDto,
  CreateTimeEntryDto,
  ReorderTaskDto,
  SetLabelsDto,
  SetMembersDto,
  StartTimerDto,
  UpdateChecklistItemDto,
  UpdateCommentDto,
  UpdateLabelDto,
  UpdateListDto,
  UpdateProjectDto,
  UpdateTaskDto,
} from "./dto/task.schema";
import { TaskService } from "./task.service";

@Controller("task")
@UseGuards(
  AuthGuard,
  SubscriptionGuard,
  PermissionGuard,
  EntitlementGuard,
  HipaaGuard
)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @RequirePermission({ task: ["read"] })
  @Get("projects")
  async getProjects(
    @Session() session: MemberSession,
    @Query("includeArchived") includeArchived?: string
  ) {
    try {
      return await this.taskService.getProjects(
        session.session.activeOrganizationId,
        includeArchived === "true"
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["create"] })
  @Post("projects")
  async createProject(
    @Body() dto: CreateProjectDto,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.createProject(
        dto,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["update"] })
  @Patch("projects/:id")
  async updateProject(
    @Param("id") id: string,
    @Body() dto: UpdateProjectDto,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.updateProject(
        id,
        dto,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["delete"] })
  @Delete("projects/:id")
  async deleteProject(
    @Param("id") id: string,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.deleteProject(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["read"] })
  @Get("lists")
  async getLists(
    @Query("projectId") projectId: string,
    @Session() session: MemberSession,
    @Query("includeArchived") includeArchived?: string
  ) {
    try {
      return await this.taskService.getLists(
        projectId,
        session.session.activeOrganizationId,
        includeArchived === "true"
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["create"] })
  @Post("lists")
  async createList(
    @Body() dto: CreateListDto,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.createList(
        dto,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["update"] })
  @Patch("lists/:id")
  async updateList(
    @Param("id") id: string,
    @Body() dto: UpdateListDto,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.updateList(
        id,
        dto,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["delete"] })
  @Delete("lists/:id")
  async deleteList(@Param("id") id: string, @Session() session: MemberSession) {
    try {
      return await this.taskService.deleteList(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["read"] })
  @Get("statuses")
  async getStatuses(@Session() session: MemberSession) {
    try {
      return await this.taskService.getStatuses(
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["read"] })
  @Get("labels")
  async getLabels(@Session() session: MemberSession) {
    try {
      return await this.taskService.getLabels(
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["create"] })
  @Post("labels")
  async createLabel(
    @Body() dto: CreateLabelDto,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.createLabel(
        dto,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["update"] })
  @Patch("labels/:id")
  async updateLabel(
    @Param("id") id: string,
    @Body() dto: UpdateLabelDto,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.updateLabel(
        id,
        dto,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["delete"] })
  @Delete("labels/:id")
  async deleteLabel(
    @Param("id") id: string,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.deleteLabel(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["read"] })
  @Get("timer/running")
  async getRunningTimer(@Session() session: MemberSession) {
    try {
      return await this.taskService.getRunningTimer(
        session.session.activeOrganizationId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["create"] })
  @Post("timer/start")
  async startTimer(
    @Body() dto: StartTimerDto,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.startTimer(
        dto.taskId,
        session.session.activeOrganizationId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["update"] })
  @Post("timer/stop")
  async stopTimer(@Session() session: MemberSession) {
    try {
      return await this.taskService.stopTimer(
        session.session.activeOrganizationId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["update"] })
  @Patch("reorder")
  async reorderTask(
    @Body() dto: ReorderTaskDto,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.reorderTask(
        dto,
        session.session.activeOrganizationId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["update"] })
  @Patch("checklist/:itemId")
  async updateChecklistItem(
    @Param("itemId") itemId: string,
    @Body() dto: UpdateChecklistItemDto,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.updateChecklistItem(
        itemId,
        dto,
        session.session.activeOrganizationId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["delete"] })
  @Delete("checklist/:itemId")
  async deleteChecklistItem(
    @Param("itemId") itemId: string,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.deleteChecklistItem(
        itemId,
        session.session.activeOrganizationId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["update"] })
  @Patch("comments/:commentId")
  async updateComment(
    @Param("commentId") commentId: string,
    @Body() dto: UpdateCommentDto,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.updateComment(
        commentId,
        dto,
        session.session.activeOrganizationId,
        session.session.memberId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["delete"] })
  @Delete("comments/:commentId")
  async deleteComment(
    @Param("commentId") commentId: string,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.deleteComment(
        commentId,
        session.session.activeOrganizationId,
        session.session.memberId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["delete"] })
  @Delete("attachments/:attachmentId")
  async deleteAttachment(
    @Param("attachmentId") attachmentId: string,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.deleteAttachment(
        attachmentId,
        session.session.activeOrganizationId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["delete"] })
  @Delete("time-entries/:entryId")
  async deleteTimeEntry(
    @Param("entryId") entryId: string,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.deleteTimeEntry(
        entryId,
        session.session.activeOrganizationId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["delete"] })
  @Delete("dependencies/:dependencyId")
  async removeDependency(
    @Param("dependencyId") dependencyId: string,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.removeDependency(
        dependencyId,
        session.session.activeOrganizationId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["read"] })
  @Get()
  async getTasks(
    @Query("projectId") projectId: string,
    @Session() session: MemberSession,
    @Query("listId") listId?: string,
    @Query("includeArchived") includeArchived?: string,
    @Query("search") search?: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 50
  ) {
    try {
      return await this.taskService.getTasks(
        {
          projectId,
          listId: listId || undefined,
          includeArchived: includeArchived === "true",
          search: search || undefined,
          page: Number(page),
          limit: Number(limit),
        },
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["create"] })
  @Post()
  async createTask(
    @Body() dto: CreateTaskDto,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.createTask(dto, session);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["read"] })
  @Get(":id")
  async getTaskById(
    @Param("id") id: string,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.getTaskById(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["update"] })
  @Patch(":id")
  async updateTask(
    @Param("id") id: string,
    @Body() dto: UpdateTaskDto,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.updateTask(
        id,
        dto,
        session.session.activeOrganizationId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["delete"] })
  @Delete(":id")
  async deleteTask(@Param("id") id: string, @Session() session: MemberSession) {
    try {
      return await this.taskService.deleteTask(
        id,
        session.session.activeOrganizationId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["create"] })
  @Post(":id/duplicate")
  async duplicateTask(
    @Param("id") id: string,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.duplicateTask(
        id,
        session.session.activeOrganizationId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["update"] })
  @Post(":id/complete")
  async completeTask(
    @Param("id") id: string,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.completeTask(
        id,
        session.session.activeOrganizationId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["update"] })
  @Post(":id/uncomplete")
  async uncompleteTask(
    @Param("id") id: string,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.uncompleteTask(
        id,
        session.session.activeOrganizationId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["update"] })
  @Put(":id/assignees")
  async setAssignees(
    @Param("id") id: string,
    @Body() dto: SetMembersDto,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.setAssignees(
        id,
        dto.memberIds,
        session.session.activeOrganizationId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["update"] })
  @Put(":id/watchers")
  async setWatchers(
    @Param("id") id: string,
    @Body() dto: SetMembersDto,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.setWatchers(
        id,
        dto.memberIds,
        session.session.activeOrganizationId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["update"] })
  @Put(":id/labels")
  async setLabels(
    @Param("id") id: string,
    @Body() dto: SetLabelsDto,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.setLabels(
        id,
        dto.labelIds,
        session.session.activeOrganizationId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["create"] })
  @Post(":id/checklist")
  async addChecklistItem(
    @Param("id") id: string,
    @Body() dto: CreateChecklistItemDto,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.addChecklistItem(
        id,
        dto,
        session.session.activeOrganizationId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["read"] })
  @Get(":id/comments")
  async getComments(
    @Param("id") id: string,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.getComments(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["create"] })
  @Post(":id/comments")
  async addComment(
    @Param("id") id: string,
    @Body() dto: CreateCommentDto,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.addComment(
        id,
        dto,
        session.session.activeOrganizationId,
        session.session.memberId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["create"] })
  @Post(":id/attachments")
  async addAttachment(
    @Param("id") id: string,
    @Body() dto: CreateAttachmentDto,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.addAttachment(
        id,
        dto,
        session.session.activeOrganizationId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["read"] })
  @Get(":id/time-entries")
  async getTimeEntries(
    @Param("id") id: string,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.getTimeEntries(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["create"] })
  @Post(":id/time-entries")
  async addTimeEntry(
    @Param("id") id: string,
    @Body() dto: CreateTimeEntryDto,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.addTimeEntry(
        id,
        dto,
        session.session.activeOrganizationId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["create"] })
  @Post(":id/dependencies")
  async addDependency(
    @Param("id") id: string,
    @Body() dto: CreateDependencyDto,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.addDependency(
        id,
        dto.blockerTaskId,
        session.session.activeOrganizationId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ task: ["read"] })
  @Get(":id/activity")
  async getActivity(
    @Param("id") id: string,
    @Session() session: MemberSession
  ) {
    try {
      return await this.taskService.getActivity(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
