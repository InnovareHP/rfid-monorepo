import { FieldType, Prisma, ReferralFieldType } from "@prisma/client";
import { prisma } from "src/lib/prisma/prisma";

export const OnboardingSeeding = async (organization_id: string) => {
  console.log("🌱 Seeding start");

  //
  // ✅ Seed referral records
  //
  await prisma.referral.createMany({
    data: [
      { referral_name: "John Doe", organization_id },
      { referral_name: "Jane Smith", organization_id },
      { referral_name: "Alice Johnson", organization_id },
    ],
    skipDuplicates: true,
  });

  //
  // ✅ Create referral fields
  //
  const referralFieldData = [
    ["Referral Date", ReferralFieldType.DATE],
    ["County", ReferralFieldType.DROPDOWN],
    ["Facility", ReferralFieldType.TEXT],
    ["Contact", ReferralFieldType.TEXT],
    ["Number", ReferralFieldType.NUMBER],
    ["Patient Name", ReferralFieldType.TEXT],
    ["Date of Birth", ReferralFieldType.DATE],
    ["Payor", ReferralFieldType.DROPDOWN],
    ["Remote or Onsite", ReferralFieldType.DROPDOWN],
    ["Assessed", ReferralFieldType.CHECKBOX],
    ["Reason", ReferralFieldType.TEXT],
    ["Status", ReferralFieldType.STATUS],
    ["Admission Type", ReferralFieldType.DROPDOWN],
    ["CPAP", ReferralFieldType.TEXT],
    ["Location", ReferralFieldType.LOCATION],
    ["Assessor", ReferralFieldType.TEXT],
    ["Wrap Up", ReferralFieldType.TEXT],
    ["Diagnosis / Behavior", ReferralFieldType.TEXT],
    ["Action Date (Accepted / Rejected)", ReferralFieldType.DATE],
    ["Length of Assessment", ReferralFieldType.TEXT],
    ["Transport Name", ReferralFieldType.TEXT],
    ["Additional Notes", ReferralFieldType.TEXT],
    ["Referred Out To", ReferralFieldType.TEXT],
  ].map(([name, type], index) => ({
    field_name: name,
    field_type: type,
    field_order: index + 1,
    organization_id,
  }));

  await prisma.referralField.createMany({
    data: referralFieldData as any,
    skipDuplicates: true,
  });

  const referralFields = await prisma.referralField.findMany({
    where: { organization_id },
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
    .filter((f) => f.field_type === ReferralFieldType.DROPDOWN)
    .flatMap(
      (field) =>
        dropdownMap[field.field_name]?.map((option) => ({
          referral_field_id: field.id,
          option_name: option,
        })) ?? []
    );

  if (referralFieldOptions.length > 0) {
    await prisma.referralFieldOption.createMany({
      data: referralFieldOptions,
      skipDuplicates: true,
    });
  }

  //
  // ✅ Generate referral values ONLY for correct org
  //
  const referrals = await prisma.referral.findMany({
    where: { organization_id },
  });

  const allReferralOptions = await prisma.referralFieldOption.findMany();

  const referralValues: Prisma.ReferralValueCreateManyInput[] = [];

  for (const referral of referrals) {
    for (const field of referralFields) {
      let value: string | null = null;

      switch (field.field_type) {
        case "TEXT":
          value = "Test Text";
          break;
        case "DATE":
          value = new Date().toISOString().split("T")[0];
          break;
        case "NUMBER":
          value = "12345";
          break;
        case "CHECKBOX":
          value = "true";
          break;
        case "STATUS":
          value = "New";
          break;
        case "LOCATION":
          value = "123 Main St";
          break;
        case "DROPDOWN":
          value =
            allReferralOptions.find((o) => o.referral_field_id === field.id)
              ?.option_name ?? null;
          break;
      }

      referralValues.push({
        referral_id: referral.id,
        field_id: field.id,
        value,
      });
    }
  }

  await prisma.referralValue.createMany({
    data: referralValues,
    skipDuplicates: true,
  });

  //
  // ============================================
  // LEADS
  // ============================================
  //

  const leadFields = [
    ["History", FieldType.TIMELINE],
    ["Number of Beds", FieldType.TEXT],
    ["Type of Facility", FieldType.DROPDOWN],
    ["Account Manager", FieldType.ASSIGNED_TO],
    ["Address", FieldType.LOCATION],
    ["County", FieldType.DROPDOWN],
    ["City", FieldType.TEXT],
    ["State", FieldType.TEXT],
    ["Zip Code", FieldType.TEXT],
    ["Phone", FieldType.TEXT],
    ["Fax", FieldType.TEXT],
    ["Medical Director", FieldType.TEXT],
    ["Director of Nursing", FieldType.TEXT],
    ["Admissions/Marketing", FieldType.TEXT],
    ["Company Name", FieldType.TEXT],
    ["Psychiatric Services", FieldType.TEXT],
    ["Notes", FieldType.TEXT],
  ].map(([name, type], index) => ({
    field_name: name,
    field_type: type,
    field_order: index + 1,
    organization_id,
  }));

  await prisma.leadField.createMany({
    data: leadFields as any,
    skipDuplicates: true,
  });

  //
  // Seed Leads
  //
  await prisma.lead.createMany({
    data: [
      { lead_name: "John Doe 1", organization_id },
      { lead_name: "Jane Smith 2", organization_id },
      { lead_name: "Alice Johnson 3", organization_id },
    ],
    skipDuplicates: true,
  });

  // ❗ FIX: Fetch only leads for this organization
  const leads = await prisma.lead.findMany({
    where: { organization_id },
  });

  // ❗ FIX: Fetch only lead fields for this org
  const dbLeadFields = await prisma.leadField.findMany({
    where: { organization_id },
  });

  //
  // Generate Lead Values (correct org only)
  //
  const leadValues: Prisma.LeadValueCreateManyInput[] = [];

  for (const lead of leads) {
    for (const field of dbLeadFields) {
      let value: string | null = null;

      switch (field.field_type) {
        case "TEXT":
          value = "Test Text";
          break;
        case "EMAIL":
          value =
            lead.lead_name.toLowerCase().replace(" ", ".") + "@example.com";
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
        lead_id: lead.id,
        field_id: field.id,
        value: field.field_name === "County" ? "" : value,
      });
    }
  }

  await prisma.leadValue.createMany({
    data: leadValues,
    skipDuplicates: true,
  });

  console.log("✅ Seeding complete");
};
