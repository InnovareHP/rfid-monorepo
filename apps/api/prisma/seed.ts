import { FieldType, PrismaClient, ReferralFieldType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Step 1: Clear old data (optional but useful for reseeding)
  await prisma.leadValue.deleteMany();
  await prisma.leadField.deleteMany();
  await prisma.lead.deleteMany();

  await prisma.referralValue.deleteMany();
  await prisma.referralField.deleteMany();
  await prisma.referral.deleteMany();

  // Step 2: Seed Lead Fields
  await prisma.leadField.createMany({
    data: [
      { field_name: "Lead", field_type: FieldType.TEXT, field_order: 1 },
      { field_name: "Status", field_type: FieldType.STATUS, field_order: 2 },
      {
        field_name: "Activities Timeline",
        field_type: FieldType.TIMELINE,
        field_order: 3,
      },
      { field_name: "Company", field_type: FieldType.TEXT, field_order: 4 },
      {
        field_name: "Email",
        field_type: FieldType.EMAIL,
        field_order: 5,
      },
      {
        field_name: "Phone",
        field_type: FieldType.TEXT,
        field_order: 6,
      },
      {
        field_name: "Fax",
        field_type: FieldType.TEXT,
        field_order: 6,
      },
      {
        field_name: "Address",
        field_type: FieldType.LOCATION,
        field_order: 7,
      },
      {
        field_name: "City",
        field_type: FieldType.TEXT,
        field_order: 7,
      },
      {
        field_name: "State",
        field_type: FieldType.TEXT,
        field_order: 7,
      },
      {
        field_name: "Zip",
        field_type: FieldType.TEXT,
        field_order: 7,
      },
      {
        field_name: "County",
        field_type: FieldType.TEXT,
        field_order: 7,
      },
      {
        field_name: "Country",
        field_type: FieldType.TEXT,
        field_order: 7,
      },
    ],
  });

  // Step 3: Fetch fields to link them later
  const fields = await prisma.leadField.findMany();

  // Step 4: Seed some referrals
  await prisma.referral.createMany({
    data: [
      { referral_name: "John Doe" },
      { referral_name: "Jane Smith" },
      { referral_name: "Alice Johnson" },
    ],
  });

  await prisma.referralField.createMany({
    data: [
      {
        field_name: "Referral Date",
        field_type: FieldType.DATE,
        field_order: 1,
      },
      {
        field_name: "County",
        field_type: FieldType.DROPDOWN,
        field_order: 2,
      },
      {
        field_name: "Facility",
        field_type: FieldType.TEXT,
        field_order: 3,
      },
      {
        field_name: "Contact",
        field_type: FieldType.TEXT,
        field_order: 4,
      },
      {
        field_name: "Number",
        field_type: FieldType.NUMBER,
        field_order: 5,
      },
      {
        field_name: "Patient Name",
        field_type: FieldType.TEXT,
        field_order: 6,
      },
      {
        field_name: "Date of Birth",
        field_type: FieldType.DATE,
        field_order: 7,
      },
      {
        field_name: "Payor",
        field_type: FieldType.DROPDOWN,
        field_order: 7,
      },
      {
        field_name: "Remote or Onsite",
        field_type: FieldType.DROPDOWN,
        field_order: 7,
      },
      {
        field_name: "Assessed",
        field_type: ReferralFieldType.CHECKBOX,
        field_order: 7,
      },
      {
        field_name: "Reason",
        field_type: ReferralFieldType.TEXT,
        field_order: 7,
      },
      {
        field_name: "Status",
        field_type: ReferralFieldType.STATUS,
        field_order: 7,
      },
      {
        field_name: "Admission Type",
        field_type: ReferralFieldType.DROPDOWN,
        field_order: 7,
      },
      {
        field_name: "CPAP",
        field_type: ReferralFieldType.TEXT,
        field_order: 7,
      },
      {
        field_name: "Location",
        field_type: ReferralFieldType.LOCATION,
        field_order: 7,
      },
      {
        field_name: "Assessor",
        field_type: ReferralFieldType.TEXT,
        field_order: 7,
      },
      {
        field_name: "Wrap Up",
        field_type: ReferralFieldType.TEXT,
        field_order: 7,
      },
      {
        field_name: "Diagnosis / Behavior",
        field_type: ReferralFieldType.TEXT,
        field_order: 7,
      },
      {
        field_name: "Action Date (Accepted / Rejected)",
        field_type: ReferralFieldType.DATE,
        field_order: 7,
      },
      {
        field_name: "Length of Assessment",
        field_type: ReferralFieldType.TEXT,
        field_order: 7,
      },
      {
        field_name: "Transport Name",
        field_type: ReferralFieldType.TEXT,
        field_order: 7,
      },
      {
        field_name: "Additional Notes",
        field_type: ReferralFieldType.TEXT,
        field_order: 7,
      },
      {
        field_name: "Referred Out To",
        field_type: ReferralFieldType.TEXT,
        field_order: 7,
      },
    ],
  });
  const referralRecords = await prisma.referral.findMany();

  // Step 6: For each lead, assign field values
  for (const referral of referralRecords) {
    for (const field of fields) {
      let value: string | null = null;

      switch (field.field_type) {
        case FieldType.TEXT:
          value = referral.referral_name;
          break;
        case FieldType.EMAIL:
          value = `${referral.referral_name.toLowerCase().replace(" ", ".")}@example.com`;
          break;
        case FieldType.PHONE:
          value = "09171234567";
          break;
        case FieldType.STATUS:
          value = "New Lead";
          break;
        case FieldType.DATE:
          value = new Date().toISOString().split("T")[0];
          break;
        case FieldType.CHECKBOX:
          value = Math.random() > 0.5 ? "true" : "false";
          break;
        case FieldType.DROPDOWN:
          value = ["Facebook", "Website", "Referral"][
            Math.floor(Math.random() * 3)
          ];
          break;
      }

      await prisma.referralValue.create({
        data: {
          referral_id: referral.id,
          field_id: field.id,
          value,
        },
      });
    }
  }

  const leads = await prisma.lead.createMany({
    data: [
      { lead_name: "John Doe" },
      { lead_name: "Jane Smith" },
      { lead_name: "Alice Johnson" },
    ],
  });

  const leadRecords = await prisma.lead.findMany();

  // Step 6: For each lead, assign field values
  for (const lead of leadRecords) {
    for (const field of fields) {
      let value: string | null = null;

      switch (field.field_type) {
        case FieldType.TEXT:
          value = lead.lead_name;
          break;
        case FieldType.EMAIL:
          value = `${lead.lead_name.toLowerCase().replace(" ", ".")}@example.com`;
          break;
        case FieldType.PHONE:
          value = "09171234567";
          break;
        case FieldType.STATUS:
          value = "New Lead";
          break;
        case FieldType.DATE:
          value = new Date().toISOString().split("T")[0];
          break;
        case FieldType.CHECKBOX:
          value = Math.random() > 0.5 ? "true" : "false";
          break;
        case FieldType.DROPDOWN:
          value = ["Facebook", "Website", "Referral"][
            Math.floor(Math.random() * 3)
          ];
          break;
      }

      await prisma.leadValue.create({
        data: {
          lead_id: lead.id,
          field_id: field.id,
          value,
        },
      });
    }
  }

  console.log("✅ Seeded Lead Values for all leads");
}

main()
  .then(() => {
    console.log("🎉 Seeding complete!");
  })
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  .finally(async () => {
    await prisma.$disconnect();
  });
