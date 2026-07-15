import { BoardFieldType, Prisma, TaskStatusCategory } from "@prisma/client";
import { prisma } from "src/lib/prisma/prisma";

export const DEFAULT_TASK_STATUSES = [
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

export const OnboardingSeeding = async (organizationId: string) => {
  console.log("🌱 Seeding start");

  //
  // ✅ Seed referral records
  //
  await prisma.board.createMany({
    data: [
      { recordName: "John Doe", moduleType: "REFERRAL", organizationId },
      { recordName: "Jane Smith", moduleType: "REFERRAL", organizationId },
      {
        recordName: "Alice Johnson",
        moduleType: "REFERRAL",
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

  const statusOptionsMap: Record<string, { name: string; color: string }[]> = {
    Status: [
      { name: "Pending", color: "#eab308" },
      { name: "Admitted", color: "#22c55e" },
      { name: "Rejected", color: "#ef4444" },
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
          statusOptionsMap[field.fieldName]?.map((opt) => ({
            fieldId: field.id,
            optionName: opt.name,
            color: opt.color,
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
    ["Medical Director", BoardFieldType.PERSON, 12],
    ["Director of Nursing", BoardFieldType.PERSON, 13],
    ["Admissions/Marketing", BoardFieldType.PERSON, 14],
    ["Psychiatric Services", BoardFieldType.TEXT, 15],
    ["Notes", BoardFieldType.TEXT, 16],
  ].map(([name, type, order]) => ({
    fieldName: name,
    fieldType: type,
    fieldOrder: order,
    organizationId,
    moduleType: "LEAD",
  }));

  await prisma.field.createMany({
    data: leadFields as any,
    skipDuplicates: true,
  });

  //
  // Seed Leads
  //
  await prisma.board.createMany({
    data: [
      {
        recordName: "Sunrise Care Facility",
        moduleType: "LEAD",
        organizationId,
      },
      {
        recordName: "Lakeside Health Center",
        moduleType: "LEAD",
        organizationId,
      },
      { recordName: "Maple Grove Nursing", moduleType: "LEAD", organizationId },
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
        case "PERSON":
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

  await prisma.taskStatus.createMany({
    data: DEFAULT_TASK_STATUSES.map((status) => ({
      ...status,
      organizationId,
    })),
    skipDuplicates: true,
  });

  console.log("✅ Seeding complete");
};
