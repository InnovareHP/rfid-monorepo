import { toSlug } from "@dashboard/shared";
import {
  BoardFieldType,
  Prisma,
  StageType,
  TaskStatusCategory,
} from "@prisma/client";
import { seedDefaultAnalytics } from "src/lib/analytics/default-analytics";
import {
  resolveModuleId,
  seedSystemModules,
} from "src/lib/module/system-modules";
import { prisma } from "src/lib/prisma/prisma";
import { runWithTenant } from "src/lib/prisma/tenant-context";

export const LEAD_STATUS_FIELD = "Status";

// Doubles as the marker that the starter workspace has already been created.
const STARTER_PROJECT = "Getting Started";

type ReferralStatusOption = {
  name: string;
  color: string;
  stageType: StageType;
  probability: number | null;
};

export const DEFAULT_LEAD_KANBAN_STAGES = [
  { name: "New", color: "#3b82f6", stageType: StageType.OPEN, probability: 10 },
  {
    name: "Contacted",
    color: "#6366f1",
    stageType: StageType.OPEN,
    probability: 25,
  },
  {
    name: "Qualified",
    color: "#eab308",
    stageType: StageType.OPEN,
    probability: 50,
  },
  {
    name: "Proposal",
    color: "#f97316",
    stageType: StageType.OPEN,
    probability: 75,
  },
  {
    name: "Won",
    color: "#22c55e",
    stageType: StageType.WON,
    probability: null,
  },
  {
    name: "Lost",
    color: "#ef4444",
    stageType: StageType.LOST,
    probability: null,
  },
];

export const DEFAULT_TASK_STATUSES = [
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

// Seeds the default stages on the lead Status field the Kanban groups by
export const configureLeadKanban = async (organizationId: string) =>
  runWithTenant(organizationId, () => seedLeadKanban(organizationId));

const seedLeadKanban = async (organizationId: string) => {
  const stageField = await prisma.field.findFirst({
    where: {
      organizationId,
      moduleType: "LEAD",
      fieldName: LEAD_STATUS_FIELD,
      isDeleted: false,
    },
  });

  if (!stageField) return null;

  const existingOptions = await prisma.fieldOption.count({
    where: { fieldId: stageField.id, isDeleted: false },
  });

  if (!existingOptions) {
    await prisma.fieldOption.createMany({
      data: DEFAULT_LEAD_KANBAN_STAGES.map((stage, index) => ({
        fieldId: stageField.id,
        optionName: stage.name,
        color: stage.color,
        optionOrder: index,
        stageType: stage.stageType,
        probability: stage.probability,
      })),
    });
  }

  return { stageFieldId: stageField.id };
};

// Runs while the creator's session still points at their previous organization.
export const OnboardingSeeding = async (organizationId: string) =>
  runWithTenant(organizationId, () => seedOrganization(organizationId));

const seedOrganization = async (organizationId: string) => {
  console.log("🌱 Seeding start");

  await seedSystemModules(organizationId);

  const [leadModuleId, referralModuleId, contactModuleId, companyModuleId] =
    await Promise.all([
      resolveModuleId("LEAD", organizationId),
      resolveModuleId("REFERRAL", organizationId),
      resolveModuleId("CONTACT", organizationId),
      resolveModuleId("COMPANY", organizationId),
    ]);

  //
  // ✅ Create referral fields
  //
  const referralFieldData = [
    ["Referral Date", BoardFieldType.DATE],
    ["Facility", BoardFieldType.REFERRAL_LINK],
    ["Contact Number", BoardFieldType.PHONE],
    ["Fax", BoardFieldType.TEXT],
    ["Email", BoardFieldType.EMAIL],
    ["Patient Name", BoardFieldType.PERSON],
    ["Date of Birth", BoardFieldType.DATE],
    ["Payor", BoardFieldType.DROPDOWN],
    ["Type of Assessment", BoardFieldType.DROPDOWN],
    ["Reason", BoardFieldType.TEXT],
    ["Admission Status", BoardFieldType.STATUS],
    ["Action Date", BoardFieldType.DATE],
    ["Location", BoardFieldType.LOCATION],
    ["Assessor", BoardFieldType.TEXT],
    ["Wrap Up", BoardFieldType.TEXT],
    ["Diagnosis / Behavior", BoardFieldType.TEXT],
    ["Transport Name", BoardFieldType.TEXT],
  ].map(([name, type], index) => ({
    fieldName: name,
    fieldType: type,
    fieldOrder: index + 1,
    organizationId,
    moduleType: "REFERRAL",
    moduleId: referralModuleId,
  }));

  await prisma.field.createMany({
    data: referralFieldData as any,
    skipDuplicates: true,
  });

  const referralFields = await prisma.field.findMany({
    where: { organizationId, moduleType: "REFERRAL" },
  });

  //
  // ✅ Bulk-create referral dropdown options
  //
  const dropdownMap: Record<string, string[]> = {
    Payor: ["Medicare", "Medicaid", "Private Insurance", "Self-Pay"],
    "Type of Assessment": ["Involuntary", "Voluntary", "Unknown"],
  };

  // Carries stage metadata so the referral Kanban has real outcomes: without a
  // stageType every column defaults to OPEN and win rate can never move.
  const statusOptionsMap: Record<string, ReferralStatusOption[]> = {
    "Admission Status": [
      {
        name: "Pending",
        color: "#eab308",
        stageType: StageType.OPEN,
        probability: 25,
      },
      {
        name: "Accepted",
        color: "#3b82f6",
        stageType: StageType.OPEN,
        probability: 75,
      },
      {
        name: "Admitted",
        color: "#22c55e",
        stageType: StageType.WON,
        probability: null,
      },
      {
        name: "Pulled by Facility",
        color: "#f97316",
        stageType: StageType.LOST,
        probability: null,
      },
      {
        name: "Denied",
        color: "#ef4444",
        stageType: StageType.LOST,
        probability: null,
      },
      {
        name: "Transferred to another Facility",
        color: "#a855f7",
        stageType: StageType.LOST,
        probability: null,
      },
    ],
  };

  const referralFieldOptions = referralFields
    .filter(
      (f) =>
        f.fieldType === BoardFieldType.DROPDOWN ||
        f.fieldType === BoardFieldType.STATUS
    )
    .flatMap((field) => {
      if (field.fieldType === BoardFieldType.STATUS) {
        return (
          statusOptionsMap[field.fieldName]?.map((opt, index) => ({
            fieldId: field.id,
            optionName: opt.name,
            color: opt.color,
            optionOrder: index,
            stageType: opt.stageType,
            probability: opt.probability,
          })) ?? []
        );
      }
      return (
        dropdownMap[field.fieldName]?.map((option) => ({
          fieldId: field.id,
          optionName: option,
        })) ?? []
      );
    });

  if (referralFieldOptions.length > 0) {
    await prisma.fieldOption.createMany({
      data: referralFieldOptions,
      skipDuplicates: true,
    });
  }

  //
  // ============================================
  // LEADS
  // ============================================
  //

  const leadFields = [
    ["Number of Beds", BoardFieldType.TEXT, 2],
    ["Type of Facility", BoardFieldType.DROPDOWN, 3],
    ["Address", BoardFieldType.LOCATION, 5],
    ["County", BoardFieldType.DROPDOWN, 6],
    ["City", BoardFieldType.TEXT, 7],
    ["State", BoardFieldType.TEXT, 8],
    ["Zip Code", BoardFieldType.TEXT, 9],
    ["Phone", BoardFieldType.PHONE, 10],
    ["Fax", BoardFieldType.TEXT, 11],
    ["Medical Director", BoardFieldType.CONTACT_LINK, 12],
    ["Director of Nursing", BoardFieldType.CONTACT_LINK, 13],
    ["Admissions/Marketing", BoardFieldType.CONTACT_LINK, 14],
    ["Psychiatric Services", BoardFieldType.TEXT, 15],
    ["Notes", BoardFieldType.TEXT, 16],
    [LEAD_STATUS_FIELD, BoardFieldType.STATUS, 17],
  ].map(([name, type, order]) => ({
    fieldName: name,
    fieldType: type,
    fieldOrder: order,
    organizationId,
    moduleType: "LEAD",
    moduleId: leadModuleId,
  }));

  await prisma.field.createMany({
    data: leadFields as any,
    skipDuplicates: true,
  });

  await configureLeadKanban(organizationId);

  const dbLeadFields = await prisma.field.findMany({
    where: { organizationId, moduleType: "LEAD" },
  });

  //
  // ============================================
  // CONTACTS AND COMPANIES
  // ============================================
  //

  const contactFields = [
    ["Title", BoardFieldType.TEXT],
    ["Email", BoardFieldType.EMAIL],
    ["Phone", BoardFieldType.PHONE],
    ["Company", BoardFieldType.COMPANY_LINK],
    ["Related Lead", BoardFieldType.REFERRAL_LINK],
    ["Address", BoardFieldType.LOCATION],
    ["Lifecycle Stage", BoardFieldType.STATUS],
    ["Notes", BoardFieldType.TEXT],
  ].map(([name, type], index) => ({
    fieldName: name,
    fieldType: type,
    fieldOrder: index + 1,
    organizationId,
    moduleType: "CONTACT",
    moduleId: contactModuleId,
  }));

  const companyFields = [
    ["Website", BoardFieldType.TEXT],
    ["Industry", BoardFieldType.DROPDOWN],
    ["Phone", BoardFieldType.PHONE],
    ["Address", BoardFieldType.LOCATION],
    ["Status", BoardFieldType.STATUS],
    ["Notes", BoardFieldType.TEXT],
  ].map(([name, type], index) => ({
    fieldName: name,
    fieldType: type,
    fieldOrder: index + 1,
    organizationId,
    moduleType: "COMPANY",
    moduleId: companyModuleId,
  }));

  await prisma.field.createMany({
    data: [...contactFields, ...companyFields] as any,
    skipDuplicates: true,
  });

  const crmFields = await prisma.field.findMany({
    where: { organizationId, moduleType: { in: ["CONTACT", "COMPANY"] } },
  });

  const crmOptionsMap: Record<string, { name: string; color?: string }[]> = {
    "Lifecycle Stage": [
      { name: "New", color: "#3b82f6" },
      { name: "Active", color: "#22c55e" },
      { name: "Inactive", color: "#9ca3af" },
    ],
    Status: [
      { name: "Prospect", color: "#eab308" },
      { name: "Active", color: "#22c55e" },
      { name: "Inactive", color: "#9ca3af" },
    ],
    Industry: [
      { name: "Healthcare" },
      { name: "Insurance" },
      { name: "Other" },
    ],
  };

  const crmFieldOptions = crmFields
    .filter(
      (f) =>
        f.fieldType === BoardFieldType.DROPDOWN ||
        f.fieldType === BoardFieldType.STATUS
    )
    .flatMap(
      (field) =>
        crmOptionsMap[field.fieldName]?.map((opt) => ({
          fieldId: field.id,
          optionName: opt.name,
          color: opt.color,
        })) ?? []
    );

  if (crmFieldOptions.length > 0) {
    await prisma.fieldOption.createMany({
      data: crmFieldOptions,
      skipDuplicates: true,
    });
  }

  await prisma.taskStatus.createMany({
    data: DEFAULT_TASK_STATUSES.map((status) => ({
      ...status,
      organizationId,
    })),
    skipDuplicates: true,
  });

  //
  // ============================================
  // DEFAULT ANALYTICS
  // ============================================
  //
  // Every module's fields exist by now, which is all the charts need to
  // resolve. seedDefaultAnalytics skips a module that already has a default
  // dashboard. Contacts and companies seed no page, so they are not listed.
  for (const moduleId of [leadModuleId, referralModuleId]) {
    await seedDefaultAnalytics(moduleId, organizationId);
  }

  //
  // ============================================
  // STARTER WORKSPACE: TASKS, MARKETING, BOOKING
  // ============================================
  //
  // The rest of this function needs the org creator's identity, so every
  // remaining section resolves off this one member row instead of repeating
  // the lookup.
  const ownerMember = await prisma.member.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  if (!ownerMember) {
    console.log(
      "⚠️  No member found yet; skipping demo tasks/marketing/booking"
    );
    console.log("✅ Seeding complete");
    return;
  }

  // Everything below is created rather than upserted, so a second run would
  // duplicate it. The starter project is the marker that says it already ran.
  const scaffolded = await prisma.taskProject.findFirst({
    where: { organizationId, name: STARTER_PROJECT },
    select: { id: true },
  });

  if (scaffolded) {
    console.log("✅ Seeding complete");
    return;
  }

  const ownerId = ownerMember.user.id;
  const ownerMemberId = ownerMember.id;

  //
  // ============================================
  // TASKS
  // ============================================
  //
  const taskProject = await prisma.taskProject.create({
    data: { name: STARTER_PROJECT, sortOrder: 0, organizationId },
  });

  const taskList = await prisma.taskList.create({
    data: {
      name: "To Do",
      sortOrder: 0,
      projectId: taskProject.id,
      organizationId,
    },
  });

  const taskStatuses = await prisma.taskStatus.findMany({
    where: { organizationId },
  });
  const taskStatusIdByName = new Map(
    taskStatuses.map((status) => [status.name, status.id])
  );

  const demoTasks = [
    {
      name: "Invite your team",
      statusName: "To Do",
      description:
        "Add teammates from the Team page so everyone can see the pipeline.",
    },
    {
      name: "Connect your calendar",
      statusName: "In Progress",
      description:
        "Link Google or Outlook Calendar from Integrations to sync your meetings.",
    },
    {
      name: "Add your first facility",
      statusName: "To Do",
      description:
        "Open the Master Marketing List and add a facility, or import your list from a spreadsheet.",
    },
  ];

  for (const [index, demoTask] of demoTasks.entries()) {
    const statusId = taskStatusIdByName.get(demoTask.statusName);
    if (!statusId) continue;

    const project = await prisma.taskProject.update({
      where: { id: taskProject.id },
      data: { taskCounter: { increment: 1 } },
    });

    const task = await prisma.task.create({
      data: {
        taskNumber: project.taskCounter,
        name: demoTask.name,
        description: demoTask.description,
        statusId,
        projectId: taskProject.id,
        listId: taskList.id,
        position: (index + 1) * 1024,
        completedAt: demoTask.statusName === "Completed" ? new Date() : null,
        createdBy: ownerId,
        organizationId,
      },
    });

    await prisma.taskAssignee.create({
      data: { taskId: task.id, memberId: ownerMemberId },
    });
  }

  //
  // ============================================
  // MARKETING
  // ============================================
  //
  const campaign = await prisma.campaign.create({
    data: {
      name: "Welcome Series",
      description: "Starter campaign for new referral partners.",
      organizationId,
      createdBy: ownerId,
    },
  });

  const phoneField = dbLeadFields.find((f) => f.fieldName === "Phone");
  const notesField = dbLeadFields.find((f) => f.fieldName === "Notes");

  const contactFormFieldMappings: {
    fieldId: string;
    label: string;
    required: boolean;
  }[] = [];
  if (phoneField) {
    contactFormFieldMappings.push({
      fieldId: phoneField.id,
      label: "Phone Number",
      required: true,
    });
  }
  if (notesField) {
    contactFormFieldMappings.push({
      fieldId: notesField.id,
      label: "What are you looking for?",
      required: false,
    });
  }

  const orgSlugPart = organizationId.slice(0, 8);

  const contactForm = await prisma.form.create({
    data: {
      name: "Website Contact Form",
      slug: `contact-${orgSlugPart}`,
      moduleType: "LEAD",
      moduleId: leadModuleId,
      fieldMappings: contactFormFieldMappings as Prisma.InputJsonValue,
      campaignId: campaign.id,
      createdBy: ownerId,
      organizationId,
    },
  });

  await prisma.landingPage.create({
    data: {
      name: "Get More Referrals",
      slug: `get-started-${orgSlugPart}`,
      campaignId: campaign.id,
      formId: contactForm.id,
      sections: [
        {
          id: "hero-1",
          type: "HERO",
          props: {
            heading: "Partner with us for faster placements",
            subheading:
              "Tell us about your facility and we'll follow up within one business day.",
          },
        },
        {
          id: "form-1",
          type: "FORM_EMBED",
          props: { heading: "Get in touch" },
        },
      ] as unknown as Prisma.InputJsonValue,
      createdBy: ownerId,
      organizationId,
    },
  });

  const recipientGroup = await prisma.recipientGroup.create({
    data: {
      name: "All Active Leads",
      description: "Every lead in the Master List.",
      moduleType: "LEAD",
      moduleId: leadModuleId,
      filter: { filter: {} } as Prisma.InputJsonValue,
      createdBy: ownerId,
      organizationId,
    },
  });

  const blast = await prisma.blast.create({
    data: {
      name: "Monthly Newsletter",
      subject: "What's new this month",
      bodyHtml:
        "<p>Thanks for partnering with us. Here's what's new this month.</p>",
      editorType: "CLASSIC",
      campaignId: campaign.id,
      createdBy: ownerId,
      organizationId,
    },
  });

  await prisma.blastGroup.create({
    data: { blastId: blast.id, groupId: recipientGroup.id },
  });

  //
  // ============================================
  // BOOKING PAGE
  // ============================================
  //
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });

  const bookingPage = await prisma.bookingPage.create({
    data: {
      userId: ownerId,
      organizationId,
      slug: `${toSlug(organization?.name ?? "book")}-${orgSlugPart}`,
      title: "30 Minute Intro Call",
      description: "Book time to walk through a referral or ask a question.",
      durationMinutes: 30,
      timezone: "America/New_York",
    },
  });

  await prisma.availabilityRule.createMany({
    data: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      bookingPageId: bookingPage.id,
      dayOfWeek,
      startMinute: 9 * 60,
      endMinute: 17 * 60,
    })),
  });

  //
  // ============================================
  // WELCOME NOTIFICATION
  // ============================================
  //
  await prisma.notification.create({
    data: {
      type: "welcome",
      title: "Welcome to your new workspace",
      body: "Your workspace is ready. Add your first facility or import your list to get started.",
      entityType: "organization",
      entityId: organizationId,
      organizationId,
      recipientId: ownerMemberId,
    },
  });

  console.log("✅ Seeding complete");
};
