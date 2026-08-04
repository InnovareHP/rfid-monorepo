import { PrismaClient, TaskStatusCategory } from "@prisma/client";

const raw = new PrismaClient();

const DEFAULT_TASK_STATUSES = [
  {
    name: "Backlog",
    color: "#807f7f",
    sortOrder: 1,
    category: TaskStatusCategory.ACTIVE,
  },
  {
    name: "To Do",
    color: "#a5e4f7",
    sortOrder: 2,
    category: TaskStatusCategory.ACTIVE,
  },
  {
    name: "In Progress",
    color: "#2c86d9",
    sortOrder: 3,
    category: TaskStatusCategory.ACTIVE,
  },
  {
    name: "In Review",
    color: "#0d3185",
    sortOrder: 4,
    category: TaskStatusCategory.ACTIVE,
  },
  {
    name: "Blocked",
    color: "#ef4444",
    sortOrder: 5,
    category: TaskStatusCategory.ACTIVE,
  },
  {
    name: "Completed",
    color: "#70bbff",
    sortOrder: 6,
    category: TaskStatusCategory.DONE,
  },
  {
    name: "Cancelled",
    color: "#202020",
    sortOrder: 7,
    category: TaskStatusCategory.CANCELLED,
  },
];

async function run() {
  const organizations = await raw.organization.findMany({
    select: { id: true },
  });

  for (const org of organizations) {
    let created = 0;
    let recolored = 0;
    for (const status of DEFAULT_TASK_STATUSES) {
      const existing = await raw.taskStatus.findFirst({
        where: { organizationId: org.id, name: status.name },
        select: { id: true, color: true },
      });
      if (existing) {
        // Keep existing statuses on the current design palette.
        if (existing.color !== status.color) {
          await raw.taskStatus.update({
            where: { id: existing.id },
            data: { color: status.color },
          });
          recolored++;
        }
        continue;
      }
      await raw.taskStatus.create({
        data: { ...status, organizationId: org.id },
      });
      created++;
    }
    console.log(
      `[${org.id}] created ${created}/${DEFAULT_TASK_STATUSES.length}, recolored ${recolored}`
    );
  }
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => raw.$disconnect());
