import { PrismaClient, TaskStatusCategory } from "@prisma/client";

const raw = new PrismaClient();

const DEFAULT_TASK_STATUSES = [
  {
    name: "Backlog",
    color: "#6b7280",
    sortOrder: 1,
    category: TaskStatusCategory.ACTIVE,
  },
  {
    name: "To Do",
    color: "#64748b",
    sortOrder: 2,
    category: TaskStatusCategory.ACTIVE,
  },
  {
    name: "In Progress",
    color: "#3b82f6",
    sortOrder: 3,
    category: TaskStatusCategory.ACTIVE,
  },
  {
    name: "In Review",
    color: "#a855f7",
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
    color: "#22c55e",
    sortOrder: 6,
    category: TaskStatusCategory.DONE,
  },
  {
    name: "Cancelled",
    color: "#9ca3af",
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
    for (const status of DEFAULT_TASK_STATUSES) {
      const existing = await raw.taskStatus.findFirst({
        where: { organizationId: org.id, name: status.name },
        select: { id: true },
      });
      if (existing) continue;
      await raw.taskStatus.create({
        data: { ...status, organizationId: org.id },
      });
      created++;
    }
    console.log(
      `[${org.id}] created ${created}/${DEFAULT_TASK_STATUSES.length}`
    );
  }
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => raw.$disconnect());
