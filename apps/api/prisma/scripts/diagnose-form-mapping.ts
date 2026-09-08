import { PrismaClient } from "@prisma/client";

// Read-only. Prints form-to-module wiring and whether each mapped field id
// actually belongs to that form's module. Field names are org configuration,
// never customer data, and no record values are read.
const prisma = new PrismaClient();

const RECORD_NAME_ID = "record_name";

async function main() {
  const forms = await prisma.form.findMany({
    include: {
      module: { select: { id: true, key: true, label: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!forms.length) {
    console.log("No forms found.");
    return;
  }

  for (const form of forms) {
    const mappings = form.fieldMappings as { fieldId: string }[];
    const mappedIds = mappings
      .map((mapping) => mapping.fieldId)
      .filter((id) => id !== RECORD_NAME_ID);

    // Where each mapped field actually lives, regardless of this form's module.
    const mapped = await prisma.field.findMany({
      where: { id: { in: mappedIds } },
      select: {
        id: true,
        fieldName: true,
        moduleId: true,
        isDeleted: true,
        organizationId: true,
      },
    });

    const moduleFieldCount = await prisma.field.count({
      where: {
        organizationId: form.organizationId,
        moduleId: form.moduleId,
        isDeleted: false,
      },
    });

    console.log(`\n=== ${form.name}  (slug: ${form.slug})`);
    console.log(`    status          ${form.status}`);
    console.log(`    submissions     ${form._count.submissions}`);
    console.log(`    form.moduleType ${form.moduleType}`);
    console.log(`    form.moduleId   ${form.moduleId ?? "NULL"}`);
    console.log(
      `    module          ${form.module ? `${form.module.key} (${form.module.label})` : "NONE"}`
    );
    console.log(`    fields on that module (active): ${moduleFieldCount}`);
    console.log(`    mapped ids: ${mappedIds.length}`);

    for (const id of mappedIds) {
      const field = mapped.find((candidate) => candidate.id === id);

      if (!field) {
        console.log(`      ${id}  -> NO SUCH FIELD (value will be dropped)`);
        continue;
      }

      const sameModule = field.moduleId === form.moduleId;
      const sameOrg = field.organizationId === form.organizationId;
      const flags = [
        sameModule ? "module OK" : `WRONG MODULE (${field.moduleId ?? "NULL"})`,
        sameOrg ? null : "WRONG ORG",
        field.isDeleted ? "DELETED" : null,
      ].filter(Boolean);

      console.log(`      ${field.fieldName}  -> ${flags.join(", ")}`);
    }

    const hasRecordName = mappings.some(
      (mapping) => mapping.fieldId === RECORD_NAME_ID
    );
    console.log(`    record-name mapping stored: ${hasRecordName}`);
  }

  // Did any submission write a record, and did that record get values?
  const submissions = await prisma.formSubmission.findMany({
    take: 10,
    orderBy: { submittedAt: "desc" },
    select: {
      id: true,
      submittedAt: true,
      formId: true,
      record: {
        select: {
          id: true,
          moduleId: true,
          moduleType: true,
          isDeleted: true,
          _count: { select: { values: true } },
        },
      },
    },
  });

  console.log(`\n=== Recent submissions: ${submissions.length}`);

  for (const submission of submissions) {
    const filled = await prisma.fieldValue.count({
      where: { recordId: submission.record.id, NOT: { value: null } },
    });

    console.log(
      `  ${submission.submittedAt.toISOString()}  record ${submission.record.id}` +
        `  moduleId ${submission.record.moduleId ?? "NULL"}` +
        `  moduleType ${submission.record.moduleType}` +
        `  valueRows ${submission.record._count.values}` +
        `  nonNull ${filled}` +
        `  deleted ${submission.record.isDeleted}`
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
