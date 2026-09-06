import type { Prisma, PrismaClient, TaskPriority } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { TASK_DESCRIPTIONS, TASK_LISTS, TASK_NAMES } from "./catalog";
import type { DemoContext } from "./context";
import { between, daysAgo, pick, random } from "./random";

const PROJECT_NAME = "Territory Operations";
const TASKS_PER_LIST = 12;

const PRIORITIES: TaskPriority[] = ["URGENT", "HIGH", "NORMAL", "LOW"];

export async function seedTasks(
  prisma: PrismaClient,
  ctx: DemoContext
): Promise<number> {
  const { organizationId } = ctx;

  const statuses = await prisma.taskStatus.findMany({
    where: { organizationId },
    select: { id: true, category: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });

  const active = statuses.filter((status) => status.category === "ACTIVE");
  const done = statuses.filter((status) => status.category === "DONE");

  const projectId = uuidv4();
  await prisma.taskProject.create({
    data: {
      id: projectId,
      name: PROJECT_NAME,
      sortOrder: 1,
      organizationId,
    },
  });

  const lists = TASK_LISTS.map((name, index) => ({
    id: uuidv4(),
    name,
    sortOrder: index + 1,
    projectId,
    organizationId,
  }));

  await prisma.taskList.createMany({ data: lists });

  const tasks: Prisma.TaskCreateManyInput[] = [];
  const assignees: Prisma.TaskAssigneeCreateManyInput[] = [];
  let taskNumber = 0;

  for (const list of lists) {
    for (let index = 0; index < TASKS_PER_LIST; index += 1) {
      const id = uuidv4();
      const member = pick(ctx.assignable);
      const createdAt = daysAgo(between(1, 90));
      const completed = done.length > 0 && random() < 0.35;
      const status = completed ? pick(done) : pick(active);

      taskNumber += 1;

      const dueDate = new Date(createdAt);
      dueDate.setDate(dueDate.getDate() + between(2, 21));

      const completedAt = new Date(createdAt);
      completedAt.setDate(completedAt.getDate() + between(1, 14));

      tasks.push({
        id,
        taskNumber,
        name: pick(TASK_NAMES),
        description: pick(TASK_DESCRIPTIONS),
        priority: pick(PRIORITIES),
        startDate: createdAt,
        dueDate,
        // Sparse positions, the same as the app leaves room for a drag between
        // two neighbours without renumbering the list.
        position: (index + 1) * 1000,
        completedAt: completed ? completedAt : null,
        statusId: status.id,
        projectId,
        listId: list.id,
        createdBy: member.userId,
        organizationId,
        createdAt,
      });

      assignees.push({ taskId: id, memberId: member.id });
    }
  }

  await prisma.task.createMany({ data: tasks });
  await prisma.taskAssignee.createMany({ data: assignees, skipDuplicates: true });

  // taskCounter is what the app reads to hand out the next task number.
  await prisma.taskProject.update({
    where: { id: projectId },
    data: { taskCounter: taskNumber },
  });

  console.log(`Created ${tasks.length} tasks across ${lists.length} lists`);

  return tasks.length;
}
