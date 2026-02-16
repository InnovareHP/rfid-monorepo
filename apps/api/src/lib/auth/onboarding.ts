import { BoardFieldType, Prisma } from "@prisma/client";
import { prisma } from "src/lib/prisma/prisma";

export const OnboardingSeeding = async (organization_id: string) => {
  console.log("🌱 Seeding start");

  //
  // ✅ Seed referral records
  //
  await prisma.board.createMany({
    data: [
      { record_name: "John Doe", module_type: "REFERRAL", organization_id },
      { record_name: "Jane Smith", module_type: "REFERRAL", organization_id },
      {
        record_name: "Alice Johnson",
        module_type: "REFERRAL",
        organization_id,
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
    ["Facility", BoardFieldType.TEXT],
    ["Contact", BoardFieldType.TEXT],
    ["Number", BoardFieldType.NUMBER],
    ["Patient Name", BoardFieldType.TEXT],
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
    field_name: name,
    field_type: type,
    field_order: index + 1,
    organization_id,
    module_type: "REFERRAL",
  }));

  await prisma.field.createMany({
    data: referralFieldData as any,
    skipDuplicates: true,
  });

  const referralFields = await prisma.field.findMany({
    where: { organization_id, module_type: "REFERRAL" },
  });

  //
  // ✅ Bulk-create referral dropdown options
  //
  const dropdownMap: Record<string, string[]> = {
    Payor: ["Medicare", "Medicaid", "Private Insurance", "Self-Pay"],
    "Remote or Onsite": ["Remote", "Onsite"],
    "Admission Type": ["Emergency", "Routine", "Transfer"],
  };

  const referralFieldOptions = referralFields
    .filter((f) => f.field_type === BoardFieldType.DROPDOWN)
    .flatMap(
      (field) =>
        dropdownMap[field.field_name]?.map((option) => ({
          field_id: field.id,
          option_name: option,
        })) ?? []
    );

  if (referralFieldOptions.length > 0) {
    await prisma.fieldOption.createMany({
      data: referralFieldOptions,
      skipDuplicates: true,
    });
  }

  const referrals = await prisma.board.findMany({
    where: { organization_id, module_type: "REFERRAL" },
  });

  const allReferralOptions = await prisma.fieldOption.findMany();

  const referralValues: Prisma.FieldValueCreateManyInput[] = [];

  for (const referral of referrals) {
    for (const field of referralFields) {
      let value: string | null = null;

      switch (field.field_type) {
        case "TEXT":
          value = "";
          break;
        case "DATE":
          value = new Date().toISOString().split("T")[0];
          break;
        case "NUMBER":
          value = "";
          break;
        case "CHECKBOX":
          value = "true";
          break;
        case "STATUS":
          value = "";
          break;
        case "LOCATION":
          value = "123 Main St";
          break;
        case "DROPDOWN":
          value =
            allReferralOptions.find((o) => o.field_id === field.id)
              ?.option_name ?? null;
          break;
      }

      referralValues.push({
        record_id: referral.id,
        field_id: field.id,
        value,
      });
    }
  }

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
    ["Phone", BoardFieldType.TEXT, 10],
    ["Fax", BoardFieldType.TEXT, 11],
    ["Medical Director", BoardFieldType.TEXT, 12],
    ["Director of Nursing", BoardFieldType.TEXT, 13],
    ["Admissions/Marketing", BoardFieldType.TEXT, 14],
    ["Company Name", BoardFieldType.TEXT, 15],
    ["Psychiatric Services", BoardFieldType.TEXT, 16],
    ["Notes", BoardFieldType.TEXT, 17],
    ["History", BoardFieldType.TIMELINE, 1],
  ].map(([name, type, order]) => ({
    field_name: name,
    field_type: type,
    field_order: order,
    organization_id,
    module_type: "LEAD",
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
      { record_name: "John Doe 1", module_type: "LEAD", organization_id },
      { record_name: "Jane Smith 2", module_type: "LEAD", organization_id },
      { record_name: "Alice Johnson 3", module_type: "LEAD", organization_id },
    ],
    skipDuplicates: true,
  });

  // ❗ FIX: Fetch only leads for this organization
  const leads = await prisma.board.findMany({
    where: { organization_id, module_type: "LEAD" },
  });

  // ❗ FIX: Fetch only lead fields for this org
  const dbLeadFields = await prisma.field.findMany({
    where: { organization_id, module_type: "LEAD" },
  });

  //
  // Generate Lead Values (correct org only)
  //
  const leadValues: Prisma.FieldValueCreateManyInput[] = [];

  for (const lead of leads) {
    for (const field of dbLeadFields) {
      let value: string | null = null;

      switch (field.field_type) {
        case "TEXT":
          value = "Test Text";
          break;
        case "EMAIL":
          value =
            lead.record_name.toLowerCase().replace(" ", ".") + "@example.com";
          break;
        case "PHONE":
          value = "09171234567";
          break;
        case "STATUS":
          value = "New Lead";
          break;
        case "TIMELINE":
          value = JSON.stringify(["Created"]);
          break;
        case "LOCATION":
          value = "123 Main St";
          break;
      }

      leadValues.push({
        record_id: lead.id,
        field_id: field.id,
        value: field.field_name === "County" ? "" : value,
      });
    }
  }

  await prisma.fieldValue.createMany({
    data: leadValues,
    skipDuplicates: true,
  });

  console.log("✅ Seeding complete");
};
