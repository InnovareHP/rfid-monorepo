import { toSlug } from "@dashboard/shared";
import {
  BoardFieldType,
  Prisma,
  StageType,
  TaskStatusCategory,
} from "@prisma/client";
import { emailIndex, normalizeEmail } from "src/lib/crypto/email-index";
import {
  resolveModuleId,
  seedSystemModules,
} from "src/lib/module/system-modules";
import { prisma } from "src/lib/prisma/prisma";
import { runWithTenant } from "src/lib/prisma/tenant-context";

export const LEAD_STATUS_FIELD = "Status";

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
  // ✅ Seed referral records
  //
  await prisma.board.createMany({
    data: [
      {
        recordName: "John Doe",
        moduleType: "REFERRAL",
        moduleId: referralModuleId,
        organizationId,
      },
      {
        recordName: "Jane Smith",
        moduleType: "REFERRAL",
        moduleId: referralModuleId,
        organizationId,
      },
      {
        recordName: "Alice Johnson",
        moduleType: "REFERRAL",
        moduleId: referralModuleId,
        organizationId,
      },
    ],
    skipDuplicates: true,
  });

  //
  // ✅ Create referral fields
  //
  const referralFieldData = [
    ["Referral Date", BoardFieldType.DATE],
    ["County", BoardFieldType.DROPDOWN],
    ["Facility", BoardFieldType.REFERRAL_LINK],
    ["Number", BoardFieldType.PHONE],
    ["Patient Name", BoardFieldType.PERSON],
    ["Date of Birth", BoardFieldType.DATE],
    ["Payor", BoardFieldType.DROPDOWN],
    ["Remote or Onsite", BoardFieldType.DROPDOWN],
    ["Assessed", BoardFieldType.CHECKBOX],
    ["Reason", BoardFieldType.TEXT],
    ["Status", BoardFieldType.STATUS],
    ["Admission Type", BoardFieldType.DROPDOWN],
    ["CPAP", BoardFieldType.TEXT],
    ["Location", BoardFieldType.LOCATION],
    ["Assessor", BoardFieldType.TEXT],
    ["Wrap Up", BoardFieldType.TEXT],
    ["Diagnosis / Behavior", BoardFieldType.TEXT],
    ["Action Date (Accepted / Rejected)", BoardFieldType.DATE],
    ["Length of Assessment", BoardFieldType.TEXT],
    ["Transport Name", BoardFieldType.TEXT],
    ["Additional Notes", BoardFieldType.TEXT],
    ["Referred Out To", BoardFieldType.TEXT],
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
    "Remote or Onsite": ["Remote", "Onsite"],
    "Admission Type": ["Emergency", "Routine", "Transfer"],
  };

  // Carries stage metadata so the referral Kanban has real outcomes: without a
  // stageType every column defaults to OPEN and win rate can never move.
  const statusOptionsMap: Record<string, ReferralStatusOption[]> = {
    Status: [
      {
        name: "Pending",
        color: "#eab308",
        stageType: StageType.OPEN,
        probability: 50,
      },
      {
        name: "Admitted",
        color: "#22c55e",
        stageType: StageType.WON,
        probability: null,
      },
      {
        name: "Rejected",
        color: "#ef4444",
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

  const referrals = await prisma.board.findMany({
    where: { organizationId, moduleType: "REFERRAL" },
    orderBy: { createdAt: "asc" },
  });

  const allReferralOptions = await prisma.fieldOption.findMany({
    where: { fieldId: { in: referralFields.map((f) => f.id) } },
  });

  const today = new Date().toISOString().split("T")[0];
  const pick = (samples: string[], index: number) =>
    samples[index % samples.length];

  const referralTextSamples: Record<string, string[]> = {
    Reason: [
      "Behavioral health evaluation",
      "Post-surgery rehab placement",
      "Memory care assessment",
    ],
    CPAP: ["No", "Yes", "No"],
    Assessor: ["M. Reyes", "K. Thompson", "D. Alvarez"],
    "Wrap Up": [
      "Awaiting insurance verification",
      "Family touring facility",
      "Approved for admission",
    ],
    "Diagnosis / Behavior": [
      "Anxiety, mild agitation",
      "Dementia, wandering risk",
      "Depression, stable",
    ],
    "Length of Assessment": ["45 minutes", "1 hour", "30 minutes"],
    "Transport Name": ["MedTrans LLC", "CareRide", "Family transport"],
    "Additional Notes": [
      "Family requests morning contact",
      "Prefers private room",
      "Needs Spanish interpreter",
    ],
    "Referred Out To": ["", "Lakeside Health Center", ""],
  };

  const dobSamples = ["1948-03-12", "1955-11-02", "1962-07-24"];
  const phoneSamples = ["(555) 201-4567", "(555) 318-9920", "(555) 476-1183"];
  const locationSamples = [
    "1420 W Elm St, Springfield, IL",
    "88 Harbor View Dr, Riverton, OH",
    "301 Cedar Ridge Rd, Cedar Falls, IA",
  ];

  const referralValues: Prisma.FieldValueCreateManyInput[] = [];

  referrals.forEach((referral, index) => {
    for (const field of referralFields) {
      let value: string | null = null;

      switch (field.fieldType) {
        case "TEXT":
          value = referralTextSamples[field.fieldName]
            ? pick(referralTextSamples[field.fieldName], index)
            : "";
          break;
        case "DATE":
          value =
            field.fieldName === "Date of Birth"
              ? pick(dobSamples, index)
              : today;
          break;
        case "PHONE":
          value = pick(phoneSamples, index);
          break;
        case "PERSON":
          value = referral.recordName;
          break;
        case "CHECKBOX":
          value = index % 2 === 0 ? "true" : "false";
          break;
        case "LOCATION":
          value = pick(locationSamples, index);
          break;
        case "STATUS":
        case "DROPDOWN": {
          const fieldOptions = allReferralOptions.filter(
            (o) => o.fieldId === field.id
          );
          value = fieldOptions.length
            ? fieldOptions[index % fieldOptions.length].optionName
            : null;
          break;
        }
      }

      referralValues.push({
        recordId: referral.id,
        fieldId: field.id,
        value,
        organizationId,
      });
    }
  });

  await prisma.fieldValue.createMany({
    data: referralValues,
    skipDuplicates: true,
  });

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

  //
  // Seed Leads
  //
  await prisma.board.createMany({
    data: [
      {
        recordName: "Sunrise Care Facility",
        moduleType: "LEAD",
        moduleId: leadModuleId,
        organizationId,
      },
      {
        recordName: "Lakeside Health Center",
        moduleType: "LEAD",
        moduleId: leadModuleId,
        organizationId,
      },
      {
        recordName: "Maple Grove Nursing",
        moduleType: "LEAD",
        moduleId: leadModuleId,
        organizationId,
      },
    ],
    skipDuplicates: true,
  });

  const leads = await prisma.board.findMany({
    where: { organizationId, moduleType: "LEAD" },
    orderBy: { createdAt: "asc" },
  });

  const dbLeadFields = await prisma.field.findMany({
    where: { organizationId, moduleType: "LEAD" },
  });

  const leadFieldOptions = await prisma.fieldOption.findMany({
    where: { fieldId: { in: dbLeadFields.map((f) => f.id) } },
  });

  const leadTextSamples: Record<string, string[]> = {
    "Number of Beds": ["120", "85", "64"],
    City: ["Springfield", "Riverton", "Cedar Falls"],
    State: ["IL", "OH", "IA"],
    "Zip Code": ["62704", "45802", "50613"],
    Fax: ["(555) 201-9001", "(555) 318-9002", "(555) 476-9003"],
    "Psychiatric Services": ["Yes", "No", "Yes"],
    Notes: [
      "Strong referral partner, monthly check-in",
      "New contact, intro call scheduled",
      "Toured facility last quarter",
    ],
  };

  const personSamples = [
    "Dr. Sarah Mitchell",
    "Robert Chen, RN",
    "Angela Torres",
  ];

  const leadValues: Prisma.FieldValueCreateManyInput[] = [];

  leads.forEach((lead, index) => {
    for (const field of dbLeadFields) {
      let value: string | null = null;

      switch (field.fieldType) {
        case "TEXT":
        case "NUMBER":
          value = leadTextSamples[field.fieldName]
            ? pick(leadTextSamples[field.fieldName], index)
            : "";
          break;
        case "EMAIL":
          value =
            lead.recordName.toLowerCase().replace(/\s+/g, ".") + "@example.com";
          break;
        case "PHONE":
          value = pick(phoneSamples, index);
          break;
        case "CONTACT_LINK":
          value = pick(personSamples, index + field.fieldOrder);
          break;
        case "TIMELINE":
          value = JSON.stringify(["Created"]);
          break;
        case "LOCATION":
          value = pick(locationSamples, index);
          break;
        case "STATUS":
        case "DROPDOWN": {
          const fieldOptions = leadFieldOptions.filter(
            (o) => o.fieldId === field.id
          );
          value = fieldOptions.length
            ? fieldOptions[index % fieldOptions.length].optionName
            : null;
          break;
        }
      }

      leadValues.push({
        recordId: lead.id,
        fieldId: field.id,
        value: field.fieldName === "County" ? "" : value,
        organizationId,
      });
    }
  });

  await prisma.fieldValue.createMany({
    data: leadValues,
    skipDuplicates: true,
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

  //
  // Seed contact and company records
  //
  await prisma.board.createMany({
    data: [
      ...personSamples.map((name) => ({
        recordName: name,
        moduleType: "CONTACT" as const,
        moduleId: contactModuleId,
        organizationId,
      })),
      {
        recordName: "CarePoint Group",
        moduleType: "COMPANY" as const,
        moduleId: companyModuleId,
        organizationId,
      },
      {
        recordName: "Harbor Health Partners",
        moduleType: "COMPANY" as const,
        moduleId: companyModuleId,
        organizationId,
      },
    ],
    skipDuplicates: true,
  });

  const contacts = await prisma.board.findMany({
    where: { organizationId, moduleType: "CONTACT" },
    orderBy: { createdAt: "asc" },
  });

  const contactFieldRows = crmFields.filter((f) => f.moduleType === "CONTACT");
  const contactValues: Prisma.FieldValueCreateManyInput[] = [];

  contacts.forEach((contact, index) => {
    for (const field of contactFieldRows) {
      let value: string | null = null;

      if (field.fieldType === BoardFieldType.EMAIL) {
        value =
          contact.recordName.toLowerCase().replace(/[^a-z]+/g, ".") +
          "@example.com";
      }
      if (field.fieldType === BoardFieldType.PHONE) {
        value = pick(phoneSamples, index);
      }
      if (value === null) continue;

      contactValues.push({
        recordId: contact.id,
        fieldId: field.id,
        value,
        organizationId,
      });
    }
  });

  await prisma.fieldValue.createMany({
    data: contactValues,
    skipDuplicates: true,
  });

  //
  // Link lead contact fields to seeded contact records
  //
  const contactByName = new Map(contacts.map((c) => [c.recordName, c.id]));
  const contactLinkFieldIds = new Set(
    dbLeadFields
      .filter((f) => f.fieldType === BoardFieldType.CONTACT_LINK)
      .map((f) => f.id)
  );

  const leadContactValues = leadValues.filter(
    (v) => contactLinkFieldIds.has(v.fieldId) && v.value
  );

  const leadContactRelations = leadContactValues
    .map((v) => ({
      sourceId: v.recordId,
      targetId: contactByName.get(v.value as string) as string,
      relationType: "CONTACT_LINK" as const,
      organizationId,
    }))
    .filter((r) => r.targetId);

  if (leadContactRelations.length > 0) {
    await prisma.boardRelation.createMany({
      data: leadContactRelations,
      skipDuplicates: true,
    });
  }

  // Link values store the target board id, not the display name
  for (const v of leadContactValues) {
    const targetId = contactByName.get(v.value as string);
    if (!targetId) continue;
    await prisma.fieldValue.update({
      where: {
        recordId_fieldId: {
          recordId: v.recordId,
          fieldId: v.fieldId,
        },
      },
      data: { value: targetId },
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
  // DEMO CONTENT FOR TASKS, MARKETING, BOOKING, LOGS
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

  const ownerId = ownerMember.user.id;
  const ownerMemberId = ownerMember.id;
  const ownerName = ownerMember.user.name;

  //
  // ============================================
  // TASKS
  // ============================================
  //
  const taskProject = await prisma.taskProject.create({
    data: { name: "Getting Started", sortOrder: 0, organizationId },
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
      name: "Explore your first lead",
      statusName: "Completed",
      description:
        "You already have three sample leads - edit one or add your own.",
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
  // COUNTY CONFIGURATION
  // ============================================
  //
  const assignedCounty = await prisma.boardCounty.create({
    data: { countyName: "Springfield County", organizationId },
  });

  await prisma.boardCountyAssignedTo.create({
    data: { assignedTo: ownerName, boardCountyId: assignedCounty.id },
  });

  await prisma.boardCounty.create({
    data: { countyName: "Riverton County", organizationId },
  });

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

  const subscriberSeeds = [
    { email: "referrals@example.com", name: "Referral Desk" },
    { email: "intake@example.com", name: "Intake Team" },
  ];

  for (const subscriber of subscriberSeeds) {
    const email = normalizeEmail(subscriber.email);
    const emailHash = emailIndex(email);

    await prisma.emailSubscriber.upsert({
      where: { organizationId_emailHash: { organizationId, emailHash } },
      create: { email, emailHash, name: subscriber.name, organizationId },
      update: {},
    });
  }

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
  // MILEAGE AND MARKETING VISIT LOGS
  // ============================================
  //
  await prisma.marketing.create({
    data: {
      facility: "Sunrise Care Facility",
      touchpoints: ["IN_PERSON_MEETING"],
      talkedTo: "Dr. Sarah Mitchell",
      reasonForVisit: "Quarterly relationship check-in",
      notes: "Discussed upcoming bed availability.",
      memberId: ownerMemberId,
      organizationId,
    },
  });

  const mileageBeginning = 10250;
  const mileageEnding = 10287;
  const mileageTotal = mileageEnding - mileageBeginning;
  const mileageRate = 0.67;

  await prisma.mileage.create({
    data: {
      destination: "Sunrise Care Facility",
      countiesMarketed: "Springfield County",
      beginningMileage: mileageBeginning,
      endingMileage: mileageEnding,
      totalMiles: mileageTotal,
      rateType: "FEDERAL",
      ratePerMile: mileageRate,
      reimbursementAmount: Number((mileageTotal * mileageRate).toFixed(2)),
      memberId: ownerMemberId,
      organizationId,
    },
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
      body: "We've pre-loaded sample leads, referrals, and a starter marketing campaign so you can explore before adding your own data.",
      entityType: "organization",
      entityId: organizationId,
      organizationId,
      recipientId: ownerMemberId,
    },
  });

  console.log("✅ Seeding complete");
};
