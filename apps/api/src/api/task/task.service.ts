import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, TaskStatusCategory } from "@prisma/client";
import { prisma } from "../../lib/prisma/prisma";
import {
  CreateAttachmentDto,
  CreateChecklistItemDto,
  CreateCommentDto,
  CreateLabelDto,
  CreateListDto,
  CreateProjectDto,
  CreateTaskDto,
  CreateTimeEntryDto,
  ReorderTaskDto,
  UpdateChecklistItemDto,
  UpdateCommentDto,
  UpdateLabelDto,
  UpdateListDto,
  UpdateProjectDto,
  UpdateTaskDto,
} from "./dto/task.schema";

const POSITION_STEP = 1024;
const MIN_POSITION_GAP = 1e-6;

const listItemInclude = {
  status: true,
  labels: { include: { label: true } },
  assignees: { include: { member: { include: { user: true } } } },
  checklistItems: { select: { isDone: true } },
  _count: {
    select: {
      subtasks: { where: { isDeleted: false } },
      blockedBy: true,
    },
  },
} satisfies Prisma.TaskInclude;

type TaskWithListRelations = Prisma.TaskGetPayload<{
  include: typeof listItemInclude;
}>;

type Tx = Prisma.TransactionClient;

@Injectable()
export class TaskService {
  private toMemberDto(pivot: {
    memberId: string;
    member: { user: { name: string; image: string | null } };
  }) {
    return {
      memberId: pivot.memberId,
      name: pivot.member.user.name,
      image: pivot.member.user.image ?? null,
    };
  }

  private toListItem(task: TaskWithListRelations) {
    return {
      id: task.id,
      taskNumber: task.taskNumber,
      name: task.name,
      priority: task.priority,
      statusId: task.statusId,
      status: {
        id: task.status.id,
        name: task.status.name,
        color: task.status.color,
        sortOrder: task.status.sortOrder,
        category: task.status.category,
      },
      projectId: task.projectId,
      listId: task.listId,
      parentTaskId: task.parentTaskId,
      startDate: task.startDate?.toISOString() ?? null,
      dueDate: task.dueDate?.toISOString() ?? null,
      estimatedMinutes: task.estimatedMinutes,
      trackedMinutes: task.trackedMinutes,
      position: task.position,
      completedAt: task.completedAt?.toISOString() ?? null,
      isArchived: task.isArchived,
      labels: task.labels.map((pivot) => ({
        id: pivot.label.id,
        name: pivot.label.name,
        color: pivot.label.color,
      })),
      assignees: task.assignees.map((assignee) => this.toMemberDto(assignee)),
      checklistDone: task.checklistItems.filter((item) => item.isDone).length,
      checklistTotal: task.checklistItems.length,
      subtaskCount: task._count.subtasks,
      blockedByCount: task._count.blockedBy,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  private async logActivity(
    tx: Tx,
    taskId: string,
    actorUserId: string,
    field: string,
    action: string,
    oldValue?: string | null,
    newValue?: string | null
  ) {
    await tx.taskActivity.create({
      data: {
        taskId,
        actorUserId,
        field,
        action,
        oldValue: oldValue ?? null,
        newValue: newValue ?? null,
      },
    });
  }

  private async findTaskOrThrow(
    tx: Tx,
    taskId: string,
    organizationId: string
  ) {
    return tx.task.findFirstOrThrow({
      where: { id: taskId, organizationId, isDeleted: false },
    });
  }

  async getProjects(organizationId: string, includeArchived: boolean) {
    return prisma.taskProject.findMany({
      where: {
        organizationId,
        isDeleted: false,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      orderBy: { sortOrder: "asc" },
    });
  }

  async createProject(dto: CreateProjectDto, organizationId: string) {
    return prisma.$transaction(async (tx) => {
      const max = await tx.taskProject.aggregate({
        where: { organizationId, isDeleted: false },
        _max: { sortOrder: true },
      });
      const project = await tx.taskProject.create({
        data: {
          name: dto.name,
          color: dto.color ?? null,
          sortOrder: (max._max.sortOrder ?? 0) + 1,
          organizationId,
        },
      });
      const list = await tx.taskList.create({
        data: {
          name: "General",
          sortOrder: 1,
          projectId: project.id,
          organizationId,
        },
      });
      return { ...project, defaultListId: list.id };
    });
  }

  async updateProject(
    id: string,
    dto: UpdateProjectDto,
    organizationId: string
  ) {
    return prisma.taskProject.update({
      where: { id, organizationId, isDeleted: false },
      data: dto,
    });
  }

  async deleteProject(id: string, organizationId: string) {
    return prisma.taskProject.update({
      where: { id, organizationId },
      data: { isDeleted: true },
    });
  }

  async getLists(
    projectId: string,
    organizationId: string,
    includeArchived: boolean
  ) {
    return prisma.taskList.findMany({
      where: {
        projectId,
        organizationId,
        isDeleted: false,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      orderBy: { sortOrder: "asc" },
    });
  }

  async createList(dto: CreateListDto, organizationId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.taskProject.findFirstOrThrow({
        where: { id: dto.projectId, organizationId, isDeleted: false },
      });
      const max = await tx.taskList.aggregate({
        where: { projectId: dto.projectId, isDeleted: false },
        _max: { sortOrder: true },
      });
      return tx.taskList.create({
        data: {
          name: dto.name,
          sortOrder: (max._max.sortOrder ?? 0) + 1,
          projectId: dto.projectId,
          organizationId,
        },
      });
    });
  }

  async updateList(id: string, dto: UpdateListDto, organizationId: string) {
    return prisma.taskList.update({
      where: { id, organizationId, isDeleted: false },
      data: dto,
    });
  }

  async deleteList(id: string, organizationId: string) {
    return prisma.taskList.update({
      where: { id, organizationId },
      data: { isDeleted: true },
    });
  }

  async getStatuses(organizationId: string) {
    return prisma.taskStatus.findMany({
      where: { organizationId },
      orderBy: { sortOrder: "asc" },
    });
  }

  async getLabels(organizationId: string) {
    return prisma.taskLabel.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
    });
  }

  async createLabel(dto: CreateLabelDto, organizationId: string) {
    return prisma.taskLabel.create({
      data: { name: dto.name, color: dto.color, organizationId },
    });
  }

  async updateLabel(id: string, dto: UpdateLabelDto, organizationId: string) {
    return prisma.taskLabel.update({
      where: { id, organizationId },
      data: dto,
    });
  }

  async deleteLabel(id: string, organizationId: string) {
    return prisma.taskLabel.delete({
      where: { id, organizationId },
    });
  }

  async getTasks(
    query: {
      projectId: string;
      listId?: string;
      includeArchived: boolean;
      search?: string;
      page: number;
      limit: number;
    },
    organizationId: string
  ) {
    const rows = await prisma.task.findMany({
      where: {
        organizationId,
        projectId: query.projectId,
        parentTaskId: null,
        isDeleted: false,
        ...(query.listId ? { listId: query.listId } : {}),
        ...(query.includeArchived ? {} : { isArchived: false }),
      },
      include: listItemInclude,
      orderBy: { position: "asc" },
    });

    const search = query.search?.trim().toLowerCase();
    const filtered = search
      ? rows.filter((row) => row.name.toLowerCase().includes(search))
      : rows;

    const total = filtered.length;
    const offset = (query.page - 1) * query.limit;
    const data = filtered
      .slice(offset, offset + query.limit)
      .map((row) => this.toListItem(row));

    return {
      data,
      total,
      nextPage: query.page * query.limit < total ? query.page + 1 : null,
    };
  }

  async getTaskById(id: string, organizationId: string) {
    const task = await prisma.task.findFirstOrThrow({
      where: { id, organizationId, isDeleted: false },
      include: {
        status: true,
        labels: { include: { label: true } },
        assignees: { include: { member: { include: { user: true } } } },
        watchers: { include: { member: { include: { user: true } } } },
        checklistItems: { orderBy: { sortOrder: "asc" } },
        attachments: { orderBy: { createdAt: "desc" } },
        creator: true,
        subtasks: {
          where: { isDeleted: false },
          include: listItemInclude,
          orderBy: { position: "asc" },
        },
        blockedBy: {
          include: {
            blockerTask: { select: { id: true, name: true, taskNumber: true } },
          },
        },
        blocking: {
          include: {
            blockedTask: { select: { id: true, name: true, taskNumber: true } },
          },
        },
        _count: {
          select: {
            subtasks: { where: { isDeleted: false } },
            blockedBy: true,
          },
        },
      },
    });

    return {
      ...this.toListItem({
        ...task,
        checklistItems: task.checklistItems.map((item) => ({
          isDone: item.isDone,
        })),
      } as TaskWithListRelations),
      description: task.description,
      createdBy: task.createdBy,
      creatorName: task.creator?.name ?? null,
      watchers: task.watchers.map((watcher) => this.toMemberDto(watcher)),
      checklistItems: task.checklistItems.map((item) => ({
        id: item.id,
        title: item.title,
        isDone: item.isDone,
        sortOrder: item.sortOrder,
      })),
      attachments: task.attachments.map((attachment) => ({
        id: attachment.id,
        url: attachment.url,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        uploadedBy: attachment.uploadedBy,
        createdAt: attachment.createdAt.toISOString(),
      })),
      subtasks: task.subtasks.map((subtask) =>
        this.toListItem(subtask as TaskWithListRelations)
      ),
      blockedBy: task.blockedBy.map((dep) => ({
        id: dep.id,
        blockerTaskId: dep.blockerTaskId,
        blockedTaskId: dep.blockedTaskId,
        blockerTaskName: dep.blockerTask?.name ?? null,
        blockedTaskName: null,
        blockerTaskNumber: dep.blockerTask?.taskNumber ?? null,
        blockedTaskNumber: null,
      })),
      blocking: task.blocking.map((dep) => ({
        id: dep.id,
        blockerTaskId: dep.blockerTaskId,
        blockedTaskId: dep.blockedTaskId,
        blockerTaskName: null,
        blockedTaskName: dep.blockedTask?.name ?? null,
        blockerTaskNumber: null,
        blockedTaskNumber: dep.blockedTask?.taskNumber ?? null,
      })),
    };
  }

  async createTask(dto: CreateTaskDto, session: MemberSession) {
    const organizationId = session.session.activeOrganizationId;
    const userId = session.session.userId;

    return prisma.$transaction(async (tx) => {
      const list = await tx.taskList.findFirstOrThrow({
        where: { id: dto.listId, organizationId, isDeleted: false },
      });
      if (list.projectId !== dto.projectId) {
        throw new BadRequestException(
          "List does not belong to the given project"
        );
      }

      if (dto.parentTaskId) {
        const parent = await this.findTaskOrThrow(
          tx,
          dto.parentTaskId,
          organizationId
        );
        if (parent.parentTaskId) {
          throw new BadRequestException("Subtasks can only be one level deep");
        }
      }

      let statusId = dto.statusId;
      if (statusId) {
        await tx.taskStatus.findFirstOrThrow({
          where: { id: statusId, organizationId },
        });
      } else {
        const defaultStatus = await tx.taskStatus.findFirstOrThrow({
          where: { organizationId, category: TaskStatusCategory.ACTIVE },
          orderBy: { sortOrder: "asc" },
        });
        statusId = defaultStatus.id;
      }

      if (dto.assigneeMemberIds?.length) {
        const members = await tx.member.findMany({
          where: { id: { in: dto.assigneeMemberIds }, organizationId },
          select: { id: true },
        });
        if (members.length !== dto.assigneeMemberIds.length) {
          throw new BadRequestException("Invalid assignee members");
        }
      }

      if (dto.labelIds?.length) {
        const labels = await tx.taskLabel.findMany({
          where: { id: { in: dto.labelIds }, organizationId },
          select: { id: true },
        });
        if (labels.length !== dto.labelIds.length) {
          throw new BadRequestException("Invalid labels");
        }
      }

      const project = await tx.taskProject.update({
        where: { id: dto.projectId, organizationId },
        data: { taskCounter: { increment: 1 } },
      });

      const maxPosition = await tx.task.aggregate({
        where: { listId: dto.listId, isDeleted: false },
        _max: { position: true },
      });

      const task = await tx.task.create({
        data: {
          taskNumber: project.taskCounter,
          name: dto.name,
          description: dto.description ?? null,
          priority: dto.priority ?? "NORMAL",
          statusId,
          projectId: dto.projectId,
          listId: dto.listId,
          parentTaskId: dto.parentTaskId ?? null,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          estimatedMinutes: dto.estimatedMinutes ?? null,
          position: (maxPosition._max.position ?? 0) + POSITION_STEP,
          createdBy: userId,
          organizationId,
        },
      });

      if (dto.assigneeMemberIds?.length) {
        await tx.taskAssignee.createMany({
          data: dto.assigneeMemberIds.map((memberId) => ({
            taskId: task.id,
            memberId,
          })),
        });
      }

      if (dto.labelIds?.length) {
        await tx.taskLabelPivot.createMany({
          data: dto.labelIds.map((labelId) => ({
            taskId: task.id,
            labelId,
          })),
        });
      }

      await this.logActivity(tx, task.id, userId, "task", "created");

      return task;
    });
  }

  async updateTask(
    id: string,
    dto: UpdateTaskDto,
    organizationId: string,
    userId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await this.findTaskOrThrow(tx, id, organizationId);

      const data: Prisma.TaskUpdateInput = {};
      const changes: {
        field: string;
        oldValue: string | null;
        newValue: string | null;
      }[] = [];

      if (dto.name !== undefined && dto.name !== existing.name) {
        data.name = dto.name;
        changes.push({ field: "name", oldValue: existing.name, newValue: dto.name });
      }

      if (
        dto.description !== undefined &&
        dto.description !== existing.description
      ) {
        data.description = dto.description;
        changes.push({
          field: "description",
          oldValue: existing.description,
          newValue: dto.description,
        });
      }

      if (dto.statusId !== undefined && dto.statusId !== existing.statusId) {
        const [oldStatus, newStatus] = await Promise.all([
          tx.taskStatus.findFirstOrThrow({
            where: { id: existing.statusId, organizationId },
          }),
          tx.taskStatus.findFirstOrThrow({
            where: { id: dto.statusId, organizationId },
          }),
        ]);
        data.status = { connect: { id: dto.statusId } };
        if (newStatus.category === TaskStatusCategory.DONE) {
          data.completedAt = new Date();
        } else if (existing.completedAt) {
          data.completedAt = null;
        }
        changes.push({
          field: "status",
          oldValue: oldStatus.name,
          newValue: newStatus.name,
        });
      }

      if (dto.priority !== undefined && dto.priority !== existing.priority) {
        data.priority = dto.priority;
        changes.push({
          field: "priority",
          oldValue: existing.priority,
          newValue: dto.priority,
        });
      }

      if (dto.startDate !== undefined) {
        const next = dto.startDate ? new Date(dto.startDate) : null;
        if ((next?.getTime() ?? null) !== (existing.startDate?.getTime() ?? null)) {
          data.startDate = next;
          changes.push({
            field: "startDate",
            oldValue: existing.startDate?.toISOString() ?? null,
            newValue: next?.toISOString() ?? null,
          });
        }
      }

      if (dto.dueDate !== undefined) {
        const next = dto.dueDate ? new Date(dto.dueDate) : null;
        if ((next?.getTime() ?? null) !== (existing.dueDate?.getTime() ?? null)) {
          data.dueDate = next;
          changes.push({
            field: "dueDate",
            oldValue: existing.dueDate?.toISOString() ?? null,
            newValue: next?.toISOString() ?? null,
          });
        }
      }

      if (
        dto.estimatedMinutes !== undefined &&
        dto.estimatedMinutes !== existing.estimatedMinutes
      ) {
        data.estimatedMinutes = dto.estimatedMinutes;
        changes.push({
          field: "estimatedMinutes",
          oldValue: existing.estimatedMinutes?.toString() ?? null,
          newValue: dto.estimatedMinutes?.toString() ?? null,
        });
      }

      if (
        dto.isArchived !== undefined &&
        dto.isArchived !== existing.isArchived
      ) {
        data.isArchived = dto.isArchived;
        changes.push({
          field: "archived",
          oldValue: String(existing.isArchived),
          newValue: String(dto.isArchived),
        });
      }

      if (changes.length === 0) return existing;

      const updated = await tx.task.update({
        where: { id: existing.id },
        data,
      });

      for (const change of changes) {
        await this.logActivity(
          tx,
          existing.id,
          userId,
          change.field,
          "updated",
          change.oldValue,
          change.newValue
        );
      }

      return updated;
    });
  }

  async deleteTask(id: string, organizationId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const task = await this.findTaskOrThrow(tx, id, organizationId);
      await tx.task.update({
        where: { id: task.id },
        data: { isDeleted: true },
      });
      await tx.task.updateMany({
        where: { parentTaskId: task.id },
        data: { isDeleted: true },
      });
      await this.logActivity(tx, task.id, userId, "task", "deleted");
    });
  }

  async duplicateTask(id: string, organizationId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const task = await tx.task.findFirstOrThrow({
        where: { id, organizationId, isDeleted: false },
        include: {
          checklistItems: true,
          labels: true,
          assignees: true,
        },
      });

      const project = await tx.taskProject.update({
        where: { id: task.projectId, organizationId },
        data: { taskCounter: { increment: 1 } },
      });

      const maxPosition = await tx.task.aggregate({
        where: { listId: task.listId, isDeleted: false },
        _max: { position: true },
      });

      const copy = await tx.task.create({
        data: {
          taskNumber: project.taskCounter,
          name: `${task.name} (copy)`,
          description: task.description,
          priority: task.priority,
          statusId: task.statusId,
          projectId: task.projectId,
          listId: task.listId,
          parentTaskId: task.parentTaskId,
          startDate: task.startDate,
          dueDate: task.dueDate,
          estimatedMinutes: task.estimatedMinutes,
          position: (maxPosition._max.position ?? 0) + POSITION_STEP,
          createdBy: userId,
          organizationId,
        },
      });

      if (task.checklistItems.length) {
        for (const item of task.checklistItems) {
          await tx.taskChecklistItem.create({
            data: {
              taskId: copy.id,
              title: item.title,
              isDone: item.isDone,
              sortOrder: item.sortOrder,
            },
          });
        }
      }

      if (task.labels.length) {
        await tx.taskLabelPivot.createMany({
          data: task.labels.map((pivot) => ({
            taskId: copy.id,
            labelId: pivot.labelId,
          })),
        });
      }

      if (task.assignees.length) {
        await tx.taskAssignee.createMany({
          data: task.assignees.map((assignee) => ({
            taskId: copy.id,
            memberId: assignee.memberId,
          })),
        });
      }

      await this.logActivity(tx, copy.id, userId, "task", "duplicated");

      return copy;
    });
  }

  async completeTask(id: string, organizationId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const task = await this.findTaskOrThrow(tx, id, organizationId);
      const doneStatus = await tx.taskStatus.findFirstOrThrow({
        where: { organizationId, category: TaskStatusCategory.DONE },
        orderBy: { sortOrder: "asc" },
      });
      const oldStatus = await tx.taskStatus.findFirstOrThrow({
        where: { id: task.statusId, organizationId },
      });
      const updated = await tx.task.update({
        where: { id: task.id },
        data: { statusId: doneStatus.id, completedAt: new Date() },
      });
      await this.logActivity(
        tx,
        task.id,
        userId,
        "status",
        "completed",
        oldStatus.name,
        doneStatus.name
      );
      return updated;
    });
  }

  async uncompleteTask(id: string, organizationId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const task = await this.findTaskOrThrow(tx, id, organizationId);
      const activeStatus = await tx.taskStatus.findFirstOrThrow({
        where: { organizationId, category: TaskStatusCategory.ACTIVE },
        orderBy: { sortOrder: "asc" },
      });
      const oldStatus = await tx.taskStatus.findFirstOrThrow({
        where: { id: task.statusId, organizationId },
      });
      const updated = await tx.task.update({
        where: { id: task.id },
        data: { statusId: activeStatus.id, completedAt: null },
      });
      await this.logActivity(
        tx,
        task.id,
        userId,
        "status",
        "uncompleted",
        oldStatus.name,
        activeStatus.name
      );
      return updated;
    });
  }

  async reorderTask(
    dto: ReorderTaskDto,
    organizationId: string,
    userId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const task = await this.findTaskOrThrow(tx, dto.taskId, organizationId);
      const targetList = await tx.taskList.findFirstOrThrow({
        where: { id: dto.listId, organizationId, isDeleted: false },
      });
      const targetProjectId = dto.projectId ?? targetList.projectId;
      if (targetList.projectId !== targetProjectId) {
        throw new BadRequestException(
          "Target list does not belong to the target project"
        );
      }

      const siblings = await tx.task.findMany({
        where: {
          listId: dto.listId,
          organizationId,
          isDeleted: false,
          parentTaskId: null,
          id: { not: task.id },
        },
        orderBy: { position: "asc" },
        select: { id: true, position: true },
      });

      let position: number;
      let insertIndex: number;
      if (!dto.beforeTaskId) {
        insertIndex = siblings.length;
        position = siblings.length
          ? siblings[siblings.length - 1].position + POSITION_STEP
          : POSITION_STEP;
      } else {
        insertIndex = siblings.findIndex(
          (sibling) => sibling.id === dto.beforeTaskId
        );
        if (insertIndex === -1) {
          throw new BadRequestException(
            "beforeTaskId is not in the target list"
          );
        }
        const lower =
          insertIndex > 0 ? siblings[insertIndex - 1].position : 0;
        const upper = siblings[insertIndex].position;
        position = (lower + upper) / 2;
        if (upper - lower < MIN_POSITION_GAP) {
          const ordered = [
            ...siblings.slice(0, insertIndex),
            { id: task.id, position: 0 },
            ...siblings.slice(insertIndex),
          ];
          for (let i = 0; i < ordered.length; i++) {
            await tx.task.update({
              where: { id: ordered[i].id },
              data: { position: (i + 1) * POSITION_STEP },
            });
          }
          position = (insertIndex + 1) * POSITION_STEP;
        }
      }

      const updateData: Prisma.TaskUncheckedUpdateInput = {
        listId: dto.listId,
        position,
      };

      if (targetProjectId !== task.projectId) {
        const targetProject = await tx.taskProject.update({
          where: { id: targetProjectId, organizationId },
          data: { taskCounter: { increment: 1 } },
        });
        updateData.projectId = targetProjectId;
        updateData.taskNumber = targetProject.taskCounter;

        await this.logActivity(
          tx,
          task.id,
          userId,
          "project",
          "moved",
          `#${task.taskNumber}`,
          `#${targetProject.taskCounter}`
        );

        const subtasks = await tx.task.findMany({
          where: { parentTaskId: task.id, isDeleted: false },
          select: { id: true },
        });
        for (const subtask of subtasks) {
          const bumped = await tx.taskProject.update({
            where: { id: targetProjectId, organizationId },
            data: { taskCounter: { increment: 1 } },
          });
          await tx.task.update({
            where: { id: subtask.id },
            data: {
              projectId: targetProjectId,
              listId: dto.listId,
              taskNumber: bumped.taskCounter,
            },
          });
        }
      } else if (dto.listId !== task.listId) {
        const oldList = await tx.taskList.findFirstOrThrow({
          where: { id: task.listId, organizationId },
        });
        await this.logActivity(
          tx,
          task.id,
          userId,
          "list",
          "moved",
          oldList.name,
          targetList.name
        );
        await tx.task.updateMany({
          where: { parentTaskId: task.id, isDeleted: false },
          data: { listId: dto.listId },
        });
      }

      return tx.task.update({
        where: { id: task.id },
        data: updateData,
      });
    });
  }

  async setAssignees(
    taskId: string,
    memberIds: string[],
    organizationId: string,
    userId: string
  ) {
    return this.syncTaskMembers(
      taskId,
      memberIds,
      organizationId,
      userId,
      "assignees"
    );
  }

  async setWatchers(
    taskId: string,
    memberIds: string[],
    organizationId: string,
    userId: string
  ) {
    return this.syncTaskMembers(
      taskId,
      memberIds,
      organizationId,
      userId,
      "watchers"
    );
  }

  private async syncTaskMembers(
    taskId: string,
    memberIds: string[],
    organizationId: string,
    userId: string,
    kind: "assignees" | "watchers"
  ) {
    return prisma.$transaction(async (tx) => {
      const task = await this.findTaskOrThrow(tx, taskId, organizationId);

      const uniqueIds = [...new Set(memberIds)];
      if (uniqueIds.length) {
        const members = await tx.member.findMany({
          where: { id: { in: uniqueIds }, organizationId },
          select: { id: true },
        });
        if (members.length !== uniqueIds.length) {
          throw new BadRequestException("Invalid members for organization");
        }
      }

      if (kind === "assignees") {
        await tx.taskAssignee.deleteMany({
          where: { taskId: task.id, memberId: { notIn: uniqueIds } },
        });
        const existing = await tx.taskAssignee.findMany({
          where: { taskId: task.id },
          select: { memberId: true },
        });
        const existingIds = new Set(existing.map((row) => row.memberId));
        const toAdd = uniqueIds.filter((id) => !existingIds.has(id));
        if (toAdd.length) {
          await tx.taskAssignee.createMany({
            data: toAdd.map((memberId) => ({ taskId: task.id, memberId })),
          });
        }
      } else {
        await tx.taskWatcher.deleteMany({
          where: { taskId: task.id, memberId: { notIn: uniqueIds } },
        });
        const existing = await tx.taskWatcher.findMany({
          where: { taskId: task.id },
          select: { memberId: true },
        });
        const existingIds = new Set(existing.map((row) => row.memberId));
        const toAdd = uniqueIds.filter((id) => !existingIds.has(id));
        if (toAdd.length) {
          await tx.taskWatcher.createMany({
            data: toAdd.map((memberId) => ({ taskId: task.id, memberId })),
          });
        }
      }

      await this.logActivity(
        tx,
        task.id,
        userId,
        kind,
        "updated",
        null,
        String(uniqueIds.length)
      );
    });
  }

  async setLabels(
    taskId: string,
    labelIds: string[],
    organizationId: string,
    userId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const task = await this.findTaskOrThrow(tx, taskId, organizationId);

      const uniqueIds = [...new Set(labelIds)];
      if (uniqueIds.length) {
        const labels = await tx.taskLabel.findMany({
          where: { id: { in: uniqueIds }, organizationId },
          select: { id: true },
        });
        if (labels.length !== uniqueIds.length) {
          throw new BadRequestException("Invalid labels for organization");
        }
      }

      await tx.taskLabelPivot.deleteMany({
        where: { taskId: task.id, labelId: { notIn: uniqueIds } },
      });
      const existing = await tx.taskLabelPivot.findMany({
        where: { taskId: task.id },
        select: { labelId: true },
      });
      const existingIds = new Set(existing.map((row) => row.labelId));
      const toAdd = uniqueIds.filter((id) => !existingIds.has(id));
      if (toAdd.length) {
        await tx.taskLabelPivot.createMany({
          data: toAdd.map((labelId) => ({ taskId: task.id, labelId })),
        });
      }

      await this.logActivity(
        tx,
        task.id,
        userId,
        "labels",
        "updated",
        null,
        String(uniqueIds.length)
      );
    });
  }

  async addChecklistItem(
    taskId: string,
    dto: CreateChecklistItemDto,
    organizationId: string,
    userId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const task = await this.findTaskOrThrow(tx, taskId, organizationId);
      const max = await tx.taskChecklistItem.aggregate({
        where: { taskId: task.id },
        _max: { sortOrder: true },
      });
      const item = await tx.taskChecklistItem.create({
        data: {
          taskId: task.id,
          title: dto.title,
          sortOrder: (max._max.sortOrder ?? 0) + 1,
        },
      });
      await this.logActivity(
        tx,
        task.id,
        userId,
        "checklist",
        "added",
        null,
        dto.title
      );
      return item;
    });
  }

  async updateChecklistItem(
    itemId: string,
    dto: UpdateChecklistItemDto,
    organizationId: string,
    userId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const item = await tx.taskChecklistItem.findFirstOrThrow({
        where: { id: itemId, task: { organizationId, isDeleted: false } },
      });
      const updated = await tx.taskChecklistItem.update({
        where: { id: item.id },
        data: dto,
      });
      if (dto.isDone !== undefined && dto.isDone !== item.isDone) {
        await this.logActivity(
          tx,
          item.taskId,
          userId,
          "checklist",
          dto.isDone ? "checked" : "unchecked",
          null,
          item.title
        );
      }
      return updated;
    });
  }

  async deleteChecklistItem(
    itemId: string,
    organizationId: string,
    userId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const item = await tx.taskChecklistItem.findFirstOrThrow({
        where: { id: itemId, task: { organizationId, isDeleted: false } },
      });
      await tx.taskChecklistItem.delete({ where: { id: item.id } });
      await this.logActivity(
        tx,
        item.taskId,
        userId,
        "checklist",
        "removed",
        item.title,
        null
      );
    });
  }

  async getComments(taskId: string, organizationId: string) {
    const task = await prisma.task.findFirstOrThrow({
      where: { id: taskId, organizationId, isDeleted: false },
      select: { id: true },
    });
    const comments = await prisma.taskComment.findMany({
      where: { taskId: task.id, isDeleted: false },
      include: { member: { include: { user: true } } },
      orderBy: { createdAt: "asc" },
    });
    return comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      memberId: comment.memberId,
      author: this.toMemberDto(comment),
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    }));
  }

  async addComment(
    taskId: string,
    dto: CreateCommentDto,
    organizationId: string,
    memberId: string,
    userId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const task = await this.findTaskOrThrow(tx, taskId, organizationId);
      const comment = await tx.taskComment.create({
        data: { taskId: task.id, memberId, body: dto.body },
      });
      await this.logActivity(tx, task.id, userId, "comment", "added");
      return comment;
    });
  }

  async updateComment(
    commentId: string,
    dto: UpdateCommentDto,
    organizationId: string,
    memberId: string
  ) {
    const comment = await prisma.taskComment.findFirstOrThrow({
      where: {
        id: commentId,
        isDeleted: false,
        task: { organizationId, isDeleted: false },
      },
    });
    if (comment.memberId !== memberId) {
      throw new BadRequestException("You can only edit your own comments");
    }
    return prisma.taskComment.update({
      where: { id: comment.id },
      data: { body: dto.body },
    });
  }

  async deleteComment(
    commentId: string,
    organizationId: string,
    memberId: string
  ) {
    const comment = await prisma.taskComment.findFirstOrThrow({
      where: {
        id: commentId,
        isDeleted: false,
        task: { organizationId, isDeleted: false },
      },
    });
    if (comment.memberId !== memberId) {
      throw new BadRequestException("You can only delete your own comments");
    }
    return prisma.taskComment.update({
      where: { id: comment.id },
      data: { isDeleted: true },
    });
  }

  async addAttachment(
    taskId: string,
    dto: CreateAttachmentDto,
    organizationId: string,
    userId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const task = await this.findTaskOrThrow(tx, taskId, organizationId);
      const attachment = await tx.taskAttachment.create({
        data: {
          taskId: task.id,
          url: dto.url,
          filename: dto.filename,
          mimeType: dto.mimeType,
          sizeBytes: dto.sizeBytes,
          uploadedBy: userId,
        },
      });
      await this.logActivity(
        tx,
        task.id,
        userId,
        "attachment",
        "added",
        null,
        dto.filename
      );
      return attachment;
    });
  }

  async deleteAttachment(
    attachmentId: string,
    organizationId: string,
    userId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const attachment = await tx.taskAttachment.findFirstOrThrow({
        where: {
          id: attachmentId,
          task: { organizationId, isDeleted: false },
        },
      });
      await tx.taskAttachment.delete({ where: { id: attachment.id } });
      await this.logActivity(
        tx,
        attachment.taskId,
        userId,
        "attachment",
        "removed",
        attachment.filename,
        null
      );
    });
  }

  async getTimeEntries(taskId: string, organizationId: string) {
    const task = await prisma.task.findFirstOrThrow({
      where: { id: taskId, organizationId, isDeleted: false },
      select: { id: true },
    });
    const entries = await prisma.taskTimeEntry.findMany({
      where: { taskId: task.id, organizationId },
      include: { user: { select: { name: true } } },
      orderBy: { startedAt: "desc" },
    });
    return entries.map((entry) => ({
      id: entry.id,
      taskId: entry.taskId,
      userId: entry.userId,
      userName: entry.user?.name ?? null,
      startedAt: entry.startedAt.toISOString(),
      endedAt: entry.endedAt?.toISOString() ?? null,
      durationMinutes: entry.durationMinutes,
      note: entry.note,
    }));
  }

  async addTimeEntry(
    taskId: string,
    dto: CreateTimeEntryDto,
    organizationId: string,
    userId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const task = await this.findTaskOrThrow(tx, taskId, organizationId);
      const startedAt = dto.startedAt ? new Date(dto.startedAt) : new Date();
      const entry = await tx.taskTimeEntry.create({
        data: {
          taskId: task.id,
          userId,
          organizationId,
          startedAt,
          endedAt: new Date(
            startedAt.getTime() + dto.durationMinutes * 60_000
          ),
          durationMinutes: dto.durationMinutes,
          note: dto.note ?? null,
        },
      });
      await tx.task.update({
        where: { id: task.id },
        data: { trackedMinutes: { increment: dto.durationMinutes } },
      });
      await this.logActivity(
        tx,
        task.id,
        userId,
        "time",
        "logged",
        null,
        String(dto.durationMinutes)
      );
      return entry;
    });
  }

  async deleteTimeEntry(
    entryId: string,
    organizationId: string,
    userId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const entry = await tx.taskTimeEntry.findFirstOrThrow({
        where: { id: entryId, organizationId },
      });
      if (!entry.endedAt) {
        throw new BadRequestException("Cannot delete a running timer entry");
      }
      await tx.taskTimeEntry.delete({ where: { id: entry.id } });
      if (entry.durationMinutes) {
        await tx.task.update({
          where: { id: entry.taskId },
          data: { trackedMinutes: { decrement: entry.durationMinutes } },
        });
      }
      await this.logActivity(
        tx,
        entry.taskId,
        userId,
        "time",
        "removed",
        String(entry.durationMinutes ?? 0),
        null
      );
    });
  }

  async startTimer(taskId: string, organizationId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const task = await this.findTaskOrThrow(tx, taskId, organizationId);
      const running = await tx.taskTimeEntry.findFirst({
        where: { userId, organizationId, endedAt: null },
      });
      if (running) {
        throw new BadRequestException("A timer is already running");
      }
      const entry = await tx.taskTimeEntry.create({
        data: {
          taskId: task.id,
          userId,
          organizationId,
          startedAt: new Date(),
        },
      });
      await this.logActivity(tx, task.id, userId, "time", "timer_started");
      return entry;
    });
  }

  async stopTimer(organizationId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const running = await tx.taskTimeEntry.findFirst({
        where: { userId, organizationId, endedAt: null },
      });
      if (!running) {
        throw new BadRequestException("No running timer found");
      }
      const endedAt = new Date();
      const durationMinutes = Math.max(
        1,
        Math.round((endedAt.getTime() - running.startedAt.getTime()) / 60_000)
      );
      const entry = await tx.taskTimeEntry.update({
        where: { id: running.id },
        data: { endedAt, durationMinutes },
      });
      await tx.task.update({
        where: { id: running.taskId },
        data: { trackedMinutes: { increment: durationMinutes } },
      });
      await this.logActivity(
        tx,
        running.taskId,
        userId,
        "time",
        "timer_stopped",
        null,
        String(durationMinutes)
      );
      return entry;
    });
  }

  async getRunningTimer(organizationId: string, userId: string) {
    const entry = await prisma.taskTimeEntry.findFirst({
      where: { userId, organizationId, endedAt: null },
      include: { task: { select: { id: true, name: true, taskNumber: true } } },
    });
    if (!entry) return null;
    return {
      id: entry.id,
      taskId: entry.taskId,
      taskName: entry.task.name,
      taskNumber: entry.task.taskNumber,
      startedAt: entry.startedAt.toISOString(),
    };
  }

  async addDependency(
    blockedTaskId: string,
    blockerTaskId: string,
    organizationId: string,
    userId: string
  ) {
    return prisma.$transaction(async (tx) => {
      if (blockedTaskId === blockerTaskId) {
        throw new BadRequestException("A task cannot block itself");
      }
      const blocked = await tx.task.findFirstOrThrow({
        where: { id: blockedTaskId, organizationId, isDeleted: false },
      });
      const blocker = await tx.task.findFirstOrThrow({
        where: { id: blockerTaskId, organizationId, isDeleted: false },
      });

      let frontier = [blocked.id];
      const visited = new Set<string>(frontier);
      while (frontier.length) {
        const edges = await tx.taskDependency.findMany({
          where: { blockerTaskId: { in: frontier } },
          select: { blockedTaskId: true },
        });
        const next: string[] = [];
        for (const edge of edges) {
          if (edge.blockedTaskId === blocker.id) {
            throw new BadRequestException(
              "This dependency would create a cycle"
            );
          }
          if (!visited.has(edge.blockedTaskId)) {
            visited.add(edge.blockedTaskId);
            next.push(edge.blockedTaskId);
          }
        }
        frontier = next;
      }

      const dependency = await tx.taskDependency.create({
        data: { blockerTaskId: blocker.id, blockedTaskId: blocked.id },
      });
      await this.logActivity(
        tx,
        blocked.id,
        userId,
        "dependency",
        "added",
        null,
        `#${blocker.taskNumber}`
      );
      return dependency;
    });
  }

  async removeDependency(
    dependencyId: string,
    organizationId: string,
    userId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const dependency = await tx.taskDependency.findFirstOrThrow({
        where: {
          id: dependencyId,
          blockedTask: { organizationId, isDeleted: false },
        },
        include: { blockerTask: { select: { taskNumber: true } } },
      });
      await tx.taskDependency.delete({ where: { id: dependency.id } });
      await this.logActivity(
        tx,
        dependency.blockedTaskId,
        userId,
        "dependency",
        "removed",
        `#${dependency.blockerTask.taskNumber}`,
        null
      );
    });
  }

  async getActivity(taskId: string, organizationId: string) {
    const task = await prisma.task.findFirstOrThrow({
      where: { id: taskId, organizationId, isDeleted: false },
      select: { id: true },
    });
    const activities = await prisma.taskActivity.findMany({
      where: { taskId: task.id },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return activities.map((activity) => ({
      id: activity.id,
      field: activity.field,
      action: activity.action,
      oldValue: activity.oldValue,
      newValue: activity.newValue,
      actorUserId: activity.actorUserId,
      actorName: activity.actor?.name ?? null,
      createdAt: activity.createdAt.toISOString(),
    }));
  }
}
