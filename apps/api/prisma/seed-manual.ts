import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding User Manual...");

  // Clear old manual data
  await prisma.manualStep.deleteMany();
  await prisma.manualArticle.deleteMany();
  await prisma.manualCategory.deleteMany();

  // ── Categories ──────────────────────────────────────────────

  const categories = await Promise.all([
    prisma.manualCategory.create({
      data: {
        name: "Getting Started",
        slug: "getting-started",
        description:
          "Set up your organization, invite your team, and configure the basics.",
        icon: "Rocket",
        order: 0,
      },
    }),
    prisma.manualCategory.create({
      data: {
        name: "Master List",
        slug: "master-list",
        description:
          "Manage leads with dynamic fields, inline editing, filters, and CSV import.",
        icon: "ClipboardList",
        order: 1,
      },
    }),
    prisma.manualCategory.create({
      data: {
        name: "Referral List",
        slug: "referral-list",
        description:
          "Track and manage referrals with dynamic columns, analytics, and exports.",
        icon: "Users",
        order: 2,
      },
    }),
    prisma.manualCategory.create({
      data: {
        name: "Integrations",
        slug: "integrations",
        description:
          "Connect Gmail, Outlook, and Calendar providers to the dashboard.",
        icon: "Plug",
        order: 3,
      },
    }),
    prisma.manualCategory.create({
      data: {
        name: "Team & Roles",
        slug: "team-and-roles",
        description:
          "Invite members, assign roles, and manage your organization team.",
        icon: "Shield",
        order: 4,
      },
    }),
    prisma.manualCategory.create({
      data: {
        name: "Logs & Reports",
        slug: "logs-and-reports",
        description:
          "Log mileage, marketing activities, and expenses, then generate reports.",
        icon: "BarChart3",
        order: 5,
      },
    }),
    prisma.manualCategory.create({
      data: {
        name: "Calendar",
        slug: "calendar",
        description:
          "View and create events from your connected Google or Outlook calendar.",
        icon: "CalendarDays",
        order: 6,
      },
    }),
    prisma.manualCategory.create({
      data: {
        name: "County Configuration",
        slug: "county-configuration",
        description:
          "Add counties and assign liaison personnel to each one.",
        icon: "MapPin",
        order: 7,
      },
    }),
    prisma.manualCategory.create({
      data: {
        name: "Account & Security",
        slug: "account-and-security",
        description:
          "Manage your account, login credentials, profile, and security settings.",
        icon: "UserCircle",
        order: 8,
      },
    }),
    prisma.manualCategory.create({
      data: {
        name: "Billing & Subscription",
        slug: "billing-and-subscription",
        description:
          "View plans, manage your subscription, and access billing details.",
        icon: "CreditCard",
        order: 9,
      },
    }),
    prisma.manualCategory.create({
      data: {
        name: "Support Portal",
        slug: "support-portal",
        description:
          "Get help through the AI assistant, submit support tickets, and track requests.",
        icon: "Headphones",
        order: 10,
      },
    }),
  ]);

  const [
    gettingStarted,
    masterList,
    referralList,
    integrations,
    teamRoles,
    logsReports,
    calendar,
    countyConfig,
    accountSecurity,
    billingSubscription,
    supportPortal,
  ] = categories;

  // ── Articles ────────────────────────────────────────────────

  // Helper: get first super_admin or support user as author
  const author = await prisma.user.findFirst({
    where: { role: { in: ["super_admin", "support"] } },
    select: { id: true },
  });

  // Fallback to any user if no admin/support exists
  const fallbackUser = author ?? (await prisma.user.findFirst({ select: { id: true } }));

  if (!fallbackUser) {
    console.log("⚠️  No users found. Seeding categories only (articles need a createdBy user).");
    console.log("✅ Seeded", categories.length, "categories.");
    return;
  }

  const userId = fallbackUser.id;

  // ─────────────────────────────────────────────────────────────
  // GETTING STARTED
  // ─────────────────────────────────────────────────────────────

  await prisma.manualArticle.create({
    data: {
      title: "Setting Up Your Organization",
      slug: "setting-up-your-organization",
      summary:
        "Create your organization, upload a team logo, and configure initial settings after signing up.",
      categoryId: gettingStarted.id,
      published: true,
      order: 0,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Sign up and create your account",
            content:
              "Visit the dashboard and complete the registration form. You will be asked to verify your email address before continuing. Once verified, the onboarding flow will guide you through initial setup questions such as how you heard about us and how you plan to use the platform.",
            order: 0,
          },
          {
            title: "Create your organization",
            content:
              "After onboarding, create your first organization. Enter an organization name — this is the team workspace where all your leads, referrals, and reports will live. Each organization gets its own data, members, and settings.",
            order: 1,
          },
          {
            title: "Upload your team logo",
            content:
              'Navigate to the Team page from the sidebar. Click the camera icon on the organization avatar at the top of the page. Select an image file to upload. The logo will appear in the sidebar and team pages for all members.',
            order: 2,
          },
          {
            title: "Review the sidebar navigation",
            content:
              "The sidebar is your primary navigation. It is divided into sections: Overview (Master List, Referral), Marketing (Master List, Referral, History Check, Logs), Reports (Mileage, Marketing, Expense), Import (Master List Import), and Settings (Team, County Config). Some sections are visible only to certain roles.",
            order: 3,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Inviting Your First Team Members",
      slug: "inviting-your-first-team-members",
      summary:
        "Send invitations to teammates and assign the right roles so everyone can start working.",
      categoryId: gettingStarted.id,
      published: true,
      order: 1,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open the Team page",
            content:
              'Click "Team" in the Settings section of the sidebar. You will see a dashboard with stats cards showing Total Members, Active Members, and Pending Invites.',
            order: 0,
          },
          {
            title: "Click Invite Member",
            content:
              'Click the "Invite Member" button in the top right. A dialog will appear with fields for the email address, a role dropdown (Liaison, Owner, or Admission Manager), and an optional personal message.',
            order: 1,
          },
          {
            title: "Choose the right role",
            content:
              "Owner: Full access including billing, imports, team management, and all reports. Liaison: Can view and edit leads, log mileage, marketing, and expenses. Admission Manager: Same as Liaison, plus access to History Check and all reports.",
            order: 2,
          },
          {
            title: "Send the invitation",
            content:
              'Click "Send Invitation". The invited person will receive an email with a link to join your organization. You can track pending invitations in the Pending Invitations tab and resend or cancel them if needed.',
            order: 3,
          },
        ],
      },
    },
  });

  // ─────────────────────────────────────────────────────────────
  // MASTER LIST
  // ─────────────────────────────────────────────────────────────

  await prisma.manualArticle.create({
    data: {
      title: "Adding and Editing Leads",
      slug: "adding-and-editing-leads",
      summary:
        "Add new leads to your Master List and edit any field inline without leaving the table.",
      categoryId: masterList.id,
      published: true,
      order: 0,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Navigate to the Master List",
            content:
              'Click "Master List" under the Marketing section in the sidebar. The table loads with all your leads and their dynamic columns.',
            order: 0,
          },
          {
            title: "Add a new lead",
            content:
              'Click the "Add Row" button in the toolbar above the table. A new row appears at the top. Type the lead name to create the record. The row is saved automatically.',
            order: 1,
          },
          {
            title: "Edit a cell inline",
            content:
              "Click any cell in the table to edit its value. Different field types have different editors: text fields show an input, date fields show a calendar picker, dropdown fields show a select menu, checkbox fields toggle on click, location fields open a Google Maps autocomplete, and assigned-to fields show a member selector. Changes are saved immediately.",
            order: 2,
          },
          {
            title: "Create dropdown options on the fly",
            content:
              'When editing a dropdown cell, you can type a new value that does not exist yet and press Enter or click the create option. The new option is added to the list for all leads in your organization.',
            order: 3,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Filtering and Searching Leads",
      slug: "filtering-and-searching-leads",
      summary:
        "Use search, filters, and column visibility to find exactly the leads you need.",
      categoryId: masterList.id,
      published: true,
      order: 1,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Use the search bar",
            content:
              "Type in the search bar above the table to filter leads by name or other text fields. The table updates as you type.",
            order: 0,
          },
          {
            title: "Apply advanced filters",
            content:
              "Click the filter icon to open the advanced filter panel. You can add multiple filter conditions across different fields (text, date range, dropdown values). Combine filters to narrow down your results precisely.",
            order: 1,
          },
          {
            title: "Sort by column",
            content:
              "Click any column header to sort the table ascending or descending by that column. Click again to reverse the sort order.",
            order: 2,
          },
          {
            title: "Show or hide columns",
            content:
              "Click the column configuration icon in the toolbar. Toggle the visibility of individual columns on or off. This is useful when you have many dynamic fields and want to focus on specific data.",
            order: 3,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Importing Leads from CSV",
      slug: "importing-leads-from-csv",
      summary:
        "Bulk import leads by uploading a CSV file. The system auto-maps columns to your lead fields.",
      categoryId: masterList.id,
      published: true,
      order: 2,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open the Import page",
            content:
              'Click "Master List" under the Import section in the sidebar (Owner only). You will see a drag-and-drop file upload area.',
            order: 0,
          },
          {
            title: "Upload your CSV file",
            content:
              "Drag a .csv file onto the upload area or click to browse your files. The system will parse the file and detect column headers automatically.",
            order: 1,
          },
          {
            title: "Preview and validate",
            content:
              "After parsing, you will see a preview of the first few rows with detected headers. The system highlights any validation errors such as empty headers, missing required columns, or inconsistent date formats. Fix these in your CSV and re-upload if needed.",
            order: 2,
          },
          {
            title: "Confirm and import",
            content:
              'Click "Upload" to submit all rows. The backend matches CSV column headers to your lead fields. Missing dropdown options are created automatically. After completion, you will see a summary showing how many rows were imported, how many options were created, and any unmatched columns.',
            order: 3,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Exporting Leads to CSV",
      slug: "exporting-leads-to-csv",
      summary:
        "Download your Master List data as a CSV file for offline use or external reporting.",
      categoryId: masterList.id,
      published: true,
      order: 3,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Apply any desired filters",
            content:
              "Before exporting, use the search bar or advanced filters to narrow your data to the records you want. The export will include only the filtered results.",
            order: 0,
          },
          {
            title: 'Click "Export CSV"',
            content:
              'Click the "Export CSV" button in the toolbar. The system fetches all matching records (even those beyond the current page) and generates a CSV file. The download starts automatically with a filename that includes the current date.',
            order: 1,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Viewing Lead History and Restoring Changes",
      slug: "viewing-lead-history-and-restoring",
      summary:
        "Review all changes made to leads and restore previous values if needed (Owner and Admission Manager only).",
      categoryId: masterList.id,
      published: true,
      order: 4,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open History Check",
            content:
              'Click "History Check" under the Marketing section in the sidebar. This page is available only to Owners and Admission Managers. It displays a table of every change made to any lead.',
            order: 0,
          },
          {
            title: "Review changes",
            content:
              "Each row shows the lead name, the field that changed, the old value, the new value, who made the change, and when. You can see UPDATE, DELETE, and CREATE events.",
            order: 1,
          },
          {
            title: "Restore a previous value",
            content:
              'For UPDATE and DELETE entries, click the "Restore" button on the right side of the row. The lead will be reverted to its previous state. A success notification confirms the restoration.',
            order: 2,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Using Master List Analytics",
      slug: "using-master-list-analytics",
      summary:
        "View aggregated marketing analytics, filter by date and liaison, and export as PDF.",
      categoryId: masterList.id,
      published: true,
      order: 5,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open analytics",
            content:
              'Click "Master List" under the Overview section in the sidebar. This opens the analytics dashboard for your leads.',
            order: 0,
          },
          {
            title: "Filter by date range and user",
            content:
              "Use the date range picker and user filter at the top to narrow the data. Analytics reflect only the filtered data, so numbers may differ from unfiltered table totals.",
            order: 1,
          },
          {
            title: "Export as PDF",
            content:
              'Click the "Export PDF" button to download the current analytics view as a PDF document. The file includes a timestamp in the filename.',
            order: 2,
          },
        ],
      },
    },
  });

  // ─────────────────────────────────────────────────────────────
  // REFERRAL LIST
  // ─────────────────────────────────────────────────────────────

  await prisma.manualArticle.create({
    data: {
      title: "Creating Referrals",
      slug: "creating-referrals",
      summary:
        "Add one or multiple referrals at once using the multi-referral creation form.",
      categoryId: referralList.id,
      published: true,
      order: 0,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Navigate to the Referral List",
            content:
              'Click "Referral" under the Marketing section in the sidebar, then click "Add Referral" in the toolbar.',
            order: 0,
          },
          {
            title: "Fill in the referral form",
            content:
              "The form displays dynamic fields based on your organization's referral column configuration. Fields include text, date pickers, dropdowns, location autocomplete, checkboxes, and assigned-to selectors. Fill in all required fields for the referral.",
            order: 1,
          },
          {
            title: "Add multiple referrals",
            content:
              'Click "Add Another Referral" to add additional referral rows to the form. You can fill out multiple referrals before submitting them all at once. Use the delete button to remove any referral row you no longer need.',
            order: 2,
          },
          {
            title: "Submit",
            content:
              "Click the submit button to create all referrals. They will appear in your Referral List immediately. You can then edit them inline just like leads in the Master List.",
            order: 3,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Managing the Referral List",
      slug: "managing-the-referral-list",
      summary:
        "Edit referrals inline, filter by date and fields, delete records, and export to CSV.",
      categoryId: referralList.id,
      published: true,
      order: 1,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Edit referrals inline",
            content:
              "Click any cell in the referral table to edit it. The same inline editing experience from the Master List applies — text inputs, date pickers, dropdowns with on-the-fly option creation, checkboxes, and location autocomplete.",
            order: 0,
          },
          {
            title: "Filter and search",
            content:
              "Use the date range filters (From / To) and the advanced filter panel to narrow results. The search bar filters by referral name and other text fields.",
            order: 1,
          },
          {
            title: "Delete referrals",
            content:
              "Select one or more referrals using the checkboxes on the left side of each row, then click the delete button. Selected records are removed immediately.",
            order: 2,
          },
          {
            title: "Export to CSV",
            content:
              'Click "Export CSV" to download all filtered referrals as a CSV file.',
            order: 3,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Referral Analytics",
      slug: "referral-analytics",
      summary:
        "View referral metrics, filter by date and liaison, and export analytics as PDF.",
      categoryId: referralList.id,
      published: true,
      order: 2,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open Referral Analytics",
            content:
              'Click "Referral" under the Overview section in the sidebar to open the referral analytics dashboard.',
            order: 0,
          },
          {
            title: "Filter analytics",
            content:
              "Use the date range picker and user filter to view data for specific time periods or team members. The metrics update to reflect only the filtered data.",
            order: 1,
          },
          {
            title: "Export as PDF",
            content:
              'Click "Export PDF" to download the referral analytics dashboard as a PDF document.',
            order: 2,
          },
        ],
      },
    },
  });

  // ─────────────────────────────────────────────────────────────
  // INTEGRATIONS
  // ─────────────────────────────────────────────────────────────

  await prisma.manualArticle.create({
    data: {
      title: "Connecting Gmail and Outlook Email",
      slug: "connecting-gmail-and-outlook-email",
      summary:
        "Link your Gmail or Outlook email account to power activity workflows and follow-ups.",
      categoryId: integrations.id,
      published: true,
      order: 0,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open the Integrations page",
            content:
              'Click the "Apps" icon in the primary sidebar (left vertical bar). This opens the Integrations page with Email and Calendar tabs.',
            order: 0,
          },
          {
            title: "Connect Gmail",
            content:
              'In the Email tab, find the Gmail card and click "Connect Gmail". A popup will open for Google OAuth. Sign in with your Google account and grant the requested permissions. Once authorized, the popup closes and the card shows your connected email address with a "Connected" badge.',
            order: 1,
          },
          {
            title: "Connect Outlook",
            content:
              'In the Email tab, find the Outlook card and click "Connect Outlook". A popup will open for Microsoft OAuth. Sign in with your Microsoft account and grant permissions. Once authorized, the card shows your connected email with a "Connected" badge.',
            order: 2,
          },
          {
            title: "Disconnect an account",
            content:
              'To disconnect, click "Disconnect" on the connected email card. This revokes access and clears your stored tokens. You can reconnect at any time by clicking the connect button again.',
            order: 3,
          },
          {
            title: "Troubleshooting",
            content:
              "If the OAuth popup does not appear, check that popups are allowed in your browser settings. If the account is already linked but not working, disconnect it first and reconnect to refresh the tokens.",
            order: 4,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Connecting Google Calendar and Outlook Calendar",
      slug: "connecting-calendar-providers",
      summary:
        "Link your calendar provider to view and create events directly from the dashboard.",
      categoryId: integrations.id,
      published: true,
      order: 1,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Switch to the Calendar tab",
            content:
              'On the Integrations page (Apps icon in the sidebar), click the "Calendar" tab.',
            order: 0,
          },
          {
            title: "Connect Google Calendar",
            content:
              'Click "Connect Google" on the Google Calendar card. Authorize via Google OAuth. Once connected, your Google Calendar events will appear on the Calendar page.',
            order: 1,
          },
          {
            title: "Connect Outlook Calendar",
            content:
              'Click "Connect Outlook" on the Outlook Calendar card. Authorize via Microsoft OAuth. Once connected, your Outlook Calendar events will appear on the Calendar page.',
            order: 2,
          },
          {
            title: "Verify on the Calendar page",
            content:
              'Navigate to the Calendar page (calendar icon in the primary sidebar). Your events should appear color-coded: Google events in red, Outlook events in blue.',
            order: 3,
          },
        ],
      },
    },
  });

  // ─────────────────────────────────────────────────────────────
  // TEAM & ROLES
  // ─────────────────────────────────────────────────────────────

  await prisma.manualArticle.create({
    data: {
      title: "Managing Team Members",
      slug: "managing-team-members",
      summary:
        "View your team roster, change roles, remove members, and manage pending invitations.",
      categoryId: teamRoles.id,
      published: true,
      order: 0,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open the Team page",
            content:
              'Click "Team" under the Settings section in the sidebar. You will see stats cards (Total Members, Active Members, Pending Invites) and a table of all team members.',
            order: 0,
          },
          {
            title: "Search for members",
            content:
              "Use the search bar above the members table to filter by name or email. The table updates as you type.",
            order: 1,
          },
          {
            title: "Change a member's role",
            content:
              'Click the three-dot menu on a member row and select "Edit Role". Choose the new role (Owner, Liaison, or Admission Manager) and confirm. The change takes effect immediately.',
            order: 2,
          },
          {
            title: "Remove a member",
            content:
              'Click the three-dot menu on a member row and select "Remove From Team". The member will lose access to the organization immediately.',
            order: 3,
          },
          {
            title: "Manage pending invitations",
            content:
              'Switch to the "Pending Invitations" tab to see all outstanding invites. You can resend an invitation email or cancel an invitation from the three-dot menu on each row.',
            order: 4,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Understanding Roles and Permissions",
      slug: "understanding-roles-and-permissions",
      summary:
        "Learn what each role can and cannot do across the dashboard features.",
      categoryId: teamRoles.id,
      published: true,
      order: 1,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Owner role",
            content:
              "Owners have full access to every feature: Master List, Referral List, all reports (Mileage, Marketing, Expense), History Check with restore capabilities, CSV import, team management (invite, remove, change roles), county configuration, billing, and organization settings.",
            order: 0,
          },
          {
            title: "Liaison role",
            content:
              "Liaisons can view and edit leads in the Master List and Referral List, log mileage, marketing activities, and expenses, and export data as CSV. They cannot access reports, history check, CSV import, team management, or county configuration.",
            order: 1,
          },
          {
            title: "Admission Manager role",
            content:
              "Admission Managers have all Liaison capabilities plus access to History Check (view and restore lead changes) and all report pages (Mileage Report, Marketing Report, Expense Report). They cannot manage team members or import CSVs.",
            order: 2,
          },
        ],
      },
    },
  });

  // ─────────────────────────────────────────────────────────────
  // LOGS & REPORTS
  // ─────────────────────────────────────────────────────────────

  await prisma.manualArticle.create({
    data: {
      title: "Logging Mileage",
      slug: "logging-mileage",
      summary:
        "Track miles traveled for work with automatic reimbursement calculation at federal or state rates.",
      categoryId: logsReports.id,
      published: true,
      order: 0,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open the Mileage Log",
            content:
              'Click "Mileage Log" under the Marketing section in the sidebar (available to Liaisons and Admission Managers).',
            order: 0,
          },
          {
            title: "Create a new log entry",
            content:
              'Click "+ New Log" to open the entry form. Fill in: Destination (where you traveled), Counties Marketed (areas covered), Beginning Mileage (odometer start), and Ending Mileage (odometer end).',
            order: 1,
          },
          {
            title: "Select the rate type",
            content:
              "Choose Federal ($0.67/mile) or State ($0.50/mile). The Total Miles, Rate Per Mile, and Reimbursement Amount are calculated automatically based on your beginning and ending mileage.",
            order: 2,
          },
          {
            title: "Submit and review",
            content:
              "Click submit to save the entry. It appears in the mileage log table below. You can delete entries with the delete button if needed.",
            order: 3,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Logging Marketing Activities",
      slug: "logging-marketing-activities",
      summary:
        "Record facility visits, touchpoints, and contacts for marketing tracking and reporting.",
      categoryId: logsReports.id,
      published: true,
      order: 1,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open the Marketing Log",
            content:
              'Click "Marketing Log" under the Marketing section in the sidebar.',
            order: 0,
          },
          {
            title: "Create a new entry",
            content:
              'Click "+ New Log" and fill in: Facility (select from dropdown), Touchpoint (multi-select: In Person Meeting, LinkedIn, Facebook, Text, Email, Phone, or Other), Talked To (person\'s name), Reason For Visit, and optional Notes.',
            order: 1,
          },
          {
            title: "Submit",
            content:
              "Click submit to save. The entry appears in the marketing log table with a timestamp. All entries contribute to the Marketing Report visible to Owners and Admission Managers.",
            order: 2,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Logging Expenses",
      slug: "logging-expenses",
      summary:
        "Record business expenses with amounts, descriptions, and receipt images.",
      categoryId: logsReports.id,
      published: true,
      order: 2,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open the Expense Log",
            content:
              'Click "Expense Log" under the Marketing section in the sidebar.',
            order: 0,
          },
          {
            title: "Create a new entry",
            content:
              'Click "+ New Log" and fill in: Amount (numeric value), Description (what the expense was for), optional Notes, and an optional receipt image (click or drag to upload).',
            order: 1,
          },
          {
            title: "Upload a receipt",
            content:
              "If you have a receipt, click the upload area to select an image file. A preview will appear. The receipt image is stored and can be viewed later by clicking on the expense entry.",
            order: 2,
          },
          {
            title: "Submit and review",
            content:
              "Click submit to save the expense. It appears in the expense log table. All expense entries contribute to the Expense Report.",
            order: 3,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Viewing Reports",
      slug: "viewing-reports",
      summary:
        "Access Mileage, Marketing, and Expense reports to see aggregated data and export as PDF (Owner and Admission Manager only).",
      categoryId: logsReports.id,
      published: true,
      order: 3,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Navigate to Reports",
            content:
              'Under the Reports section in the sidebar, click Mileage Report, Marketing Report, or Expense Report. These pages are only visible to Owners and Admission Managers.',
            order: 0,
          },
          {
            title: "Mileage Report",
            content:
              "Shows total miles traveled, total reimbursement amount, and a breakdown by rate type (Federal vs State). Filter by date range or team member to narrow the data.",
            order: 1,
          },
          {
            title: "Marketing Report",
            content:
              "Displays marketing activity metrics including total visits, breakdown by touchpoint type (In Person, LinkedIn, Phone, etc.), and facilities visited. Filter by date and user.",
            order: 2,
          },
          {
            title: "Expense Report",
            content:
              "Summarizes all expense entries with totals and descriptions. Receipt attachments are accessible from each entry. Filter by date and team member.",
            order: 3,
          },
          {
            title: "Export as PDF",
            content:
              'Click the "Export PDF" button on any report page to download the current view as a PDF document. The filename includes a timestamp.',
            order: 4,
          },
        ],
      },
    },
  });

  // ─────────────────────────────────────────────────────────────
  // CALENDAR
  // ─────────────────────────────────────────────────────────────

  await prisma.manualArticle.create({
    data: {
      title: "Using the Calendar",
      slug: "using-the-calendar",
      summary:
        "View events from connected calendars, switch between views, and create new events.",
      categoryId: calendar.id,
      published: true,
      order: 0,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open the Calendar",
            content:
              "Click the calendar icon in the primary sidebar (left vertical bar). If no calendar is connected, you will see an empty state with a link to the Integrations page.",
            order: 0,
          },
          {
            title: "Switch views",
            content:
              "Use the view buttons at the top to switch between Month, Week, and Day views. Use the Previous and Next arrows to navigate through dates. Click Today to jump back to the current date.",
            order: 1,
          },
          {
            title: "Identify event sources",
            content:
              "Events are color-coded by provider: Google Calendar events appear in red, Outlook Calendar events appear in blue. Up to 3 events are shown per day in month view — click to see all events for that day.",
            order: 2,
          },
          {
            title: "Create a new event",
            content:
              'Click the "New Event" button or click on a date/time slot to create an event. Fill in the event details in the dialog and save. The event is created in your connected calendar provider.',
            order: 3,
          },
          {
            title: "View event details",
            content:
              "Click on any event to see its details including title, time, and description in a popup dialog.",
            order: 4,
          },
        ],
      },
    },
  });

  // ─────────────────────────────────────────────────────────────
  // COUNTY CONFIGURATION
  // ─────────────────────────────────────────────────────────────

  await prisma.manualArticle.create({
    data: {
      title: "Configuring Counties",
      slug: "configuring-counties",
      summary:
        "Add counties to your organization and assign liaison personnel to manage each one.",
      categoryId: countyConfig.id,
      published: true,
      order: 0,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open County Configuration",
            content:
              'Click "County Config" under the Settings section in the sidebar. You will see a table of all configured counties with their assignment status.',
            order: 0,
          },
          {
            title: "Add a county",
            content:
              'Fill in the County Name field (required) and optionally the Assigned To field (the person responsible for this county). Click "Add County" to save.',
            order: 1,
          },
          {
            title: "Track assignment status",
            content:
              'Each county shows a status badge: green "Assigned" if someone is assigned, or orange "Unassigned" if the Assigned To field is empty. The top of the page shows a ratio of assigned vs total counties (e.g., 3/5 Assigned).',
            order: 2,
          },
          {
            title: "Delete a county",
            content:
              "Click the trash icon on a county row to remove it. This action is immediate and cannot be undone.",
            order: 3,
          },
        ],
      },
    },
  });

  // ─────────────────────────────────────────────────────────────
  // ADDITIONAL GETTING STARTED
  // ─────────────────────────────────────────────────────────────

  await prisma.manualArticle.create({
    data: {
      title: "Navigating the Dashboard",
      slug: "navigating-the-dashboard",
      summary:
        "Understand the sidebar layout, primary bar icons, and how to find every feature.",
      categoryId: gettingStarted.id,
      published: true,
      order: 2,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Primary sidebar (left vertical bar)",
            content:
              "The narrow vertical bar on the far left contains icon buttons for top-level pages: Home (marketing analytics overview), Calendar, Apps (integrations), and Help (this page). Click any icon to jump directly to that section.",
            order: 0,
          },
          {
            title: "Collapsible sidebar (main navigation)",
            content:
              "The wider sidebar panel is your main navigation. It is organized into sections: Overview (Master List analytics, Referral analytics), Marketing (Master List, Referral, History Check, Mileage Log, Marketing Log, Expense Log), Reports (Mileage Report, Marketing Report, Expense Report), Import (Master List Import), and Settings (Team, County Config). Click the collapse button to minimize it for more screen space.",
            order: 1,
          },
          {
            title: "Role-based visibility",
            content:
              "Not every section is visible to every role. Reports and History Check appear only for Owners and Admission Managers. Log pages appear for Liaisons and Admission Managers. Import is Owner-only. If you cannot see a section, check your role on the Team page.",
            order: 2,
          },
          {
            title: "User menu",
            content:
              "At the bottom of the collapsible sidebar, click your avatar to see account options: switch organizations, view your profile, or log out.",
            order: 3,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Switching Between Organizations",
      slug: "switching-between-organizations",
      summary:
        "If you belong to multiple organizations, switch between them without logging out.",
      categoryId: gettingStarted.id,
      published: true,
      order: 3,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open the organization switcher",
            content:
              "Click the organization name or your avatar at the bottom of the sidebar. A dropdown or menu appears listing all organizations you belong to.",
            order: 0,
          },
          {
            title: "Select a different organization",
            content:
              "Click the organization you want to switch to. The dashboard reloads with that organization's data — leads, referrals, team members, reports, and settings are all scoped to the active organization.",
            order: 1,
          },
          {
            title: "Create a new organization",
            content:
              "If you need a separate workspace, you can create a new organization from the switcher. Each organization has its own members, data, and subscription.",
            order: 2,
          },
        ],
      },
    },
  });

  // ─────────────────────────────────────────────────────────────
  // ADDITIONAL MASTER LIST
  // ─────────────────────────────────────────────────────────────

  await prisma.manualArticle.create({
    data: {
      title: "Deleting Leads",
      slug: "deleting-leads",
      summary:
        "Select and remove one or multiple leads from your Master List.",
      categoryId: masterList.id,
      published: true,
      order: 6,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Select leads to delete",
            content:
              "In the Master List table, click the checkbox on the left side of each row you want to remove. You can select multiple leads at once.",
            order: 0,
          },
          {
            title: "Click delete",
            content:
              "Once you have selected one or more leads, a delete button appears in the toolbar. Click it to remove the selected leads. The operation is applied immediately with an optimistic update.",
            order: 1,
          },
          {
            title: "Restore deleted leads",
            content:
              "If you delete a lead by mistake, Owners and Admission Managers can go to History Check and restore deleted records. Look for entries with the DELETE action type and click Restore.",
            order: 2,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Using Smart Scan and AI Analysis",
      slug: "using-smart-scan-and-ai-analysis",
      summary:
        "Run AI-powered analysis on your leads to get insights and recommendations.",
      categoryId: masterList.id,
      published: true,
      order: 7,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Smart Scan",
            content:
              'Click the "Smart Scan" button in the Master List toolbar. This uses AI to scan your lead data and surface patterns, duplicates, or recommendations across your entire list.',
            order: 0,
          },
          {
            title: "Analyze an individual lead",
            content:
              "Click on a lead name in the table to open the lead detail dialog. Switch to the analysis tab to see AI-generated insights about that specific lead, including engagement scores, recommended next steps, and historical patterns.",
            order: 1,
          },
          {
            title: "View lead timeline",
            content:
              "In the lead detail dialog, the Timeline tab shows a chronological view of all interactions and changes for that lead, including emails, status updates, and field edits.",
            order: 2,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Lead Notifications",
      slug: "lead-notifications",
      summary:
        "Get notified when leads are updated and mark notifications as seen.",
      categoryId: masterList.id,
      published: true,
      order: 8,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Notification indicator",
            content:
              "When leads in your Master List have been updated by other team members, a bell icon or notification indicator appears next to those leads. This helps you spot changes without reviewing every row.",
            order: 0,
          },
          {
            title: "Review updates",
            content:
              "Click on a lead with a notification indicator to view what changed. The lead detail or inline cell will show the updated values.",
            order: 1,
          },
          {
            title: "Mark as seen",
            content:
              "After reviewing updates, the notification indicator clears automatically. You can also dismiss all notifications at once to mark everything as seen.",
            order: 2,
          },
        ],
      },
    },
  });

  // ─────────────────────────────────────────────────────────────
  // ADDITIONAL TEAM & ROLES
  // ─────────────────────────────────────────────────────────────

  await prisma.manualArticle.create({
    data: {
      title: "Uploading Your Team Logo",
      slug: "uploading-your-team-logo",
      summary:
        "Customize your organization's branding by uploading a logo that appears across the dashboard.",
      categoryId: teamRoles.id,
      published: true,
      order: 2,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Go to the Team page",
            content:
              'Click "Team" under the Settings section in the sidebar.',
            order: 0,
          },
          {
            title: "Click the avatar",
            content:
              "At the top of the Team page, hover over the organization avatar (circle icon). A camera icon appears. Click it to open the file picker.",
            order: 1,
          },
          {
            title: "Select an image",
            content:
              "Choose an image file (PNG, JPG, or similar) from your computer. The image is uploaded to cloud storage and the avatar updates immediately. The logo will be visible in the sidebar and team pages for all members of your organization.",
            order: 2,
          },
        ],
      },
    },
  });

  // ─────────────────────────────────────────────────────────────
  // ADDITIONAL INTEGRATIONS
  // ─────────────────────────────────────────────────────────────

  await prisma.manualArticle.create({
    data: {
      title: "Checking Integration Status on the Help Page",
      slug: "checking-integration-status",
      summary:
        "Quickly see if your Gmail and Outlook accounts are connected from the Help Center.",
      categoryId: integrations.id,
      published: true,
      order: 2,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open the Help Center",
            content:
              "Click the Help icon in the primary sidebar. The Help Center page loads with an Integration Health card on the right side.",
            order: 0,
          },
          {
            title: "Check connection status",
            content:
              'The Integration Health card shows Gmail and Outlook with badges indicating "Connected" or "Disconnected". This gives you a quick health check without navigating to the Integrations page.',
            order: 1,
          },
          {
            title: "Fix disconnected integrations",
            content:
              "If a provider shows as Disconnected, navigate to the Integrations page (Apps icon in the primary sidebar) and reconnect. Common issues include expired tokens — disconnecting and reconnecting usually resolves this.",
            order: 2,
          },
        ],
      },
    },
  });

  // ─────────────────────────────────────────────────────────────
  // ADDITIONAL LOGS & REPORTS
  // ─────────────────────────────────────────────────────────────

  await prisma.manualArticle.create({
    data: {
      title: "Deleting Log Entries",
      slug: "deleting-log-entries",
      summary:
        "Remove incorrect mileage, marketing, or expense log entries from your records.",
      categoryId: logsReports.id,
      published: true,
      order: 4,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Find the entry to delete",
            content:
              "Navigate to the relevant log page (Mileage Log, Marketing Log, or Expense Log). Scroll through the table or use pagination to find the entry you want to remove.",
            order: 0,
          },
          {
            title: "Click delete",
            content:
              "Click the delete (trash) icon on the row. The entry is removed immediately. This action cannot be undone, so make sure you are deleting the correct entry.",
            order: 1,
          },
          {
            title: "Impact on reports",
            content:
              "Deleted log entries are excluded from reports immediately. If you check the Mileage Report, Marketing Report, or Expense Report after deleting, the totals will reflect the removal.",
            order: 2,
          },
        ],
      },
    },
  });

  // ─────────────────────────────────────────────────────────────
  // ADDITIONAL CALENDAR
  // ─────────────────────────────────────────────────────────────

  await prisma.manualArticle.create({
    data: {
      title: "Managing Calendar Events",
      slug: "managing-calendar-events",
      summary:
        "Create, view, and manage events from Google Calendar or Outlook directly in the dashboard.",
      categoryId: calendar.id,
      published: true,
      order: 1,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Create an event by clicking a date",
            content:
              'In addition to the "New Event" button, you can click directly on a date or time slot in the calendar to create an event. A dialog opens pre-filled with the selected date and time.',
            order: 0,
          },
          {
            title: "Fill in event details",
            content:
              "Enter the event title, start and end time, and an optional description. The event will be saved to your connected calendar provider (Google or Outlook).",
            order: 1,
          },
          {
            title: "View event details",
            content:
              "Click on any event in the calendar to open a detail popup. You can see the event title, time, description, and which calendar provider it belongs to.",
            order: 2,
          },
          {
            title: "Multiple calendar sources",
            content:
              "If you have both Google Calendar and Outlook Calendar connected, events from both appear on the same calendar view. Google events show in red and Outlook events show in blue so you can tell them apart at a glance.",
            order: 3,
          },
        ],
      },
    },
  });

  // ─────────────────────────────────────────────────────────────
  // ADDITIONAL COUNTY CONFIGURATION
  // ─────────────────────────────────────────────────────────────

  await prisma.manualArticle.create({
    data: {
      title: "Assigning Liaisons to Counties",
      slug: "assigning-liaisons-to-counties",
      summary:
        "Assign team members to specific counties so everyone knows their coverage area.",
      categoryId: countyConfig.id,
      published: true,
      order: 1,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open County Configuration",
            content:
              'Click "County Config" under the Settings section in the sidebar.',
            order: 0,
          },
          {
            title: "Add a county with an assignee",
            content:
              "When adding a new county, fill in both the County Name and the Assigned To field with the liaison's name. The county will be created with a green \"Assigned\" status badge.",
            order: 1,
          },
          {
            title: "Track unassigned counties",
            content:
              "Counties without an Assigned To value show an orange \"Unassigned\" badge. The summary at the top of the page shows how many counties are assigned vs total (e.g., 3/5 Assigned), making it easy to spot gaps in coverage.",
            order: 2,
          },
          {
            title: "Update assignments",
            content:
              "To change who is assigned to a county, delete the existing county entry and re-add it with the new assignee. Keep track of your coverage to ensure no county is left unmanaged.",
            order: 3,
          },
        ],
      },
    },
  });

  // ─────────────────────────────────────────────────────────────
  // ACCOUNT & SECURITY
  // ─────────────────────────────────────────────────────────────

  await prisma.manualArticle.create({
    data: {
      title: "Registering a New Account",
      slug: "registering-a-new-account",
      summary:
        "Create your dashboard account with email and password, then verify your email to get started.",
      categoryId: accountSecurity.id,
      published: true,
      order: 0,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open the registration page",
            content:
              'Navigate to the dashboard URL and click "Sign Up" or "Create an Account". You will see a registration form asking for your full name, email address, and a password.',
            order: 0,
          },
          {
            title: "Fill in your details",
            content:
              "Enter your full name, a valid email address, and choose a strong password. The password should be at least 8 characters. Click the Register button to submit.",
            order: 1,
          },
          {
            title: "Verify your email",
            content:
              "Check your inbox for a verification email from the platform. Click the verification link in the email. You will be redirected to the dashboard confirming your email is verified. If you don't see the email, check your spam folder.",
            order: 2,
          },
          {
            title: "Complete onboarding",
            content:
              "After verifying, you will be guided through a short onboarding flow. Answer a few questions about how you heard about us and how you plan to use the platform. This helps us tailor your experience.",
            order: 3,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Logging In to the Dashboard",
      slug: "logging-in-to-the-dashboard",
      summary:
        "Sign in with email/password or Google, and use OTP verification for added security.",
      categoryId: accountSecurity.id,
      published: true,
      order: 1,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Enter your credentials",
            content:
              'Go to the dashboard login page. Enter the email address and password you used during registration. Click "Sign In" to proceed.',
            order: 0,
          },
          {
            title: "Use Google Sign-In (optional)",
            content:
              'If your account is linked to Google, you can click "Continue with Google" to sign in using your Google account. This skips the password step entirely.',
            order: 1,
          },
          {
            title: "OTP verification",
            content:
              "If OTP is enabled, after entering your credentials you will be prompted to enter a one-time password sent to your email. Check your inbox, enter the 6-digit code, and click Verify to complete login.",
            order: 2,
          },
          {
            title: "Troubleshooting login issues",
            content:
              'If you cannot log in, check that your email is correct and your password is right. If you forgot your password, click "Forgot Password?" on the login page to initiate a password reset.',
            order: 3,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Resetting Your Password",
      slug: "resetting-your-password",
      summary:
        "Recover access to your account by resetting your password via email.",
      categoryId: accountSecurity.id,
      published: true,
      order: 2,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Request a password reset",
            content:
              'On the login page, click "Forgot Password?" or "Reset Password". Enter the email address associated with your account and click Submit. A reset link will be sent to your email.',
            order: 0,
          },
          {
            title: "Check your email",
            content:
              "Open the password reset email (check spam if needed). Click the reset link — it will take you to a page where you can enter a new password.",
            order: 1,
          },
          {
            title: "Set a new password",
            content:
              "Enter your new password and confirm it. Choose a strong password with at least 8 characters. Click Save or Reset to apply the change. You will be redirected to the login page where you can sign in with your new password.",
            order: 2,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Editing Your Profile",
      slug: "editing-your-profile",
      summary:
        "Update your name, profile picture, and personal details from the Profile page.",
      categoryId: accountSecurity.id,
      published: true,
      order: 3,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Navigate to your profile",
            content:
              'Click on your avatar or name in the bottom-left corner of the sidebar. Select "Profile" from the dropdown menu. This opens the Profile page showing your current details.',
            order: 0,
          },
          {
            title: "Update your name or details",
            content:
              "On the Profile page, you can edit your display name and other personal information. Make your changes and click Save to update your profile across the dashboard.",
            order: 1,
          },
          {
            title: "Change your profile picture",
            content:
              "Click on your current avatar image to upload a new profile photo. Select an image file from your computer. The new photo will be visible to all team members in the organization.",
            order: 2,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Accepting a Team Invitation",
      slug: "accepting-a-team-invitation",
      summary:
        "Join an organization when you receive an email invitation from a team member.",
      categoryId: accountSecurity.id,
      published: true,
      order: 4,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Check your email",
            content:
              "When someone invites you to their organization, you will receive an email with an invitation link. The email will show which organization invited you and what role you have been assigned.",
            order: 0,
          },
          {
            title: "Click the invitation link",
            content:
              "Click the invitation link in the email. If you already have an account, you will be signed in and added to the organization automatically. If you are new, you will be prompted to create an account first.",
            order: 1,
          },
          {
            title: "Start collaborating",
            content:
              "Once accepted, the new organization will appear in your organization switcher (top of the sidebar). Switch to it to see the team's leads, referrals, and data. Your role determines which features you can access.",
            order: 2,
          },
        ],
      },
    },
  });

  // ─────────────────────────────────────────────────────────────
  // BILLING & SUBSCRIPTION
  // ─────────────────────────────────────────────────────────────

  await prisma.manualArticle.create({
    data: {
      title: "Viewing Available Plans",
      slug: "viewing-available-plans",
      summary:
        "Browse subscription plans and compare features before choosing the right one for your team.",
      categoryId: billingSubscription.id,
      published: true,
      order: 0,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open the Plans page",
            content:
              'Navigate to the Plans page from the sidebar or Settings. You will see a list of available subscription tiers with their pricing, included features, and member limits.',
            order: 0,
          },
          {
            title: "Compare plan features",
            content:
              "Each plan card shows what is included — number of team members, lead/referral limits, access to analytics, integrations, and reporting features. Compare the options to find the best fit for your organization's size and needs.",
            order: 1,
          },
          {
            title: "Select a plan",
            content:
              'Click "Subscribe" or "Get Started" on the plan you want. You will be redirected to the Stripe checkout page to enter your payment details. After successful payment, your subscription will be activated immediately.',
            order: 2,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Managing Your Subscription",
      slug: "managing-your-subscription",
      summary:
        "View your current plan, update payment methods, and manage billing through the Stripe portal.",
      categoryId: billingSubscription.id,
      published: true,
      order: 1,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open Billing Settings",
            content:
              'Go to Settings > Billing from the sidebar. This page shows your current subscription plan, billing cycle, and payment status.',
            order: 0,
          },
          {
            title: "Access the Stripe billing portal",
            content:
              'Click "Manage Billing" or "Billing Portal" to open the Stripe customer portal. Here you can update your credit card, view past invoices, download receipts, and change your billing email.',
            order: 1,
          },
          {
            title: "Upgrade or downgrade",
            content:
              "To change your plan, navigate back to the Plans page and select a different tier. Stripe will automatically prorate the charges — you only pay the difference for the remainder of your billing cycle.",
            order: 2,
          },
          {
            title: "Cancel your subscription",
            content:
              "In the Stripe billing portal, you can cancel your subscription. Your access will continue until the end of the current billing period. You can resubscribe at any time from the Plans page.",
            order: 3,
          },
        ],
      },
    },
  });

  // ─────────────────────────────────────────────────────────────
  // ADDITIONAL MASTER LIST ARTICLES
  // ─────────────────────────────────────────────────────────────

  await prisma.manualArticle.create({
    data: {
      title: "Managing Dropdown Field Options",
      slug: "managing-dropdown-field-options",
      summary:
        "Create, edit, and organize the options available in dropdown and status fields for leads.",
      categoryId: masterList.id,
      published: true,
      order: 9,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Access the option manager",
            content:
              'In the Master List, click on a dropdown or status column header, then select "Manage Options" (or navigate to the option management page from the column settings). This opens a page where you can see all current options for that field.',
            order: 0,
          },
          {
            title: "Add a new option",
            content:
              'Click "Add Option" and enter the option label. For status fields, you can also assign a color. The new option will immediately be available when editing leads in that column.',
            order: 1,
          },
          {
            title: "Edit or reorder options",
            content:
              "Click the edit icon next to any option to rename it. Use drag handles to reorder options — the order determines how they appear in the dropdown when editing a lead cell.",
            order: 2,
          },
          {
            title: "Delete an option",
            content:
              "Click the trash icon to remove an option. Note: leads that currently have this value may display a blank or fallback. Consider updating those leads first before deleting an option.",
            order: 3,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Viewing a Lead's Timeline",
      slug: "viewing-a-leads-timeline",
      summary:
        "See the full activity history for an individual lead, including all field changes and updates.",
      categoryId: masterList.id,
      published: true,
      order: 10,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open a lead's timeline",
            content:
              'In the Master List, find the lead you want to inspect. Click on the lead row or click the timeline icon/button. This navigates you to the Lead Timeline page showing all activity for that specific lead.',
            order: 0,
          },
          {
            title: "Review activity entries",
            content:
              "The timeline shows a chronological list of all changes made to the lead — who changed which field, what the old and new values were, and when the change occurred. Each entry includes the team member's name and avatar.",
            order: 1,
          },
          {
            title: "Filter timeline events",
            content:
              "Use the available filters to narrow down the timeline to specific fields or date ranges. This is helpful when you need to track when a particular status changed or who updated a specific value.",
            order: 2,
          },
          {
            title: "Navigate back",
            content:
              'Click the back arrow or "Back to Master List" to return to the full lead table. The timeline is read-only — to make changes, go back to the Master List and edit the lead inline.',
            order: 3,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Sending Bulk Emails to Leads",
      slug: "sending-bulk-emails-to-leads",
      summary:
        "Select multiple leads and send them an email directly from the Master List.",
      categoryId: masterList.id,
      published: true,
      order: 11,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Select leads with email addresses",
            content:
              "In the Master List, use the checkboxes to select one or more leads. Ensure the selected leads have valid email addresses in their Email field. The bulk action toolbar will appear at the top of the table.",
            order: 0,
          },
          {
            title: "Click the email action",
            content:
              'In the bulk action toolbar, click the "Send Email" or email icon button. A compose dialog will open where you can write your email subject and body.',
            order: 1,
          },
          {
            title: "Compose and send",
            content:
              "Write your email message. The email will be sent to all selected leads that have valid email addresses. You need to have a connected email integration (Gmail or Outlook) for this feature to work. Click Send to dispatch the emails.",
            order: 2,
          },
        ],
      },
    },
  });

  // ─────────────────────────────────────────────────────────────
  // ADDITIONAL REFERRAL LIST ARTICLES
  // ─────────────────────────────────────────────────────────────

  await prisma.manualArticle.create({
    data: {
      title: "Importing Referrals from CSV",
      slug: "importing-referrals-from-csv",
      summary:
        "Bulk import referrals from a CSV file with automatic field mapping and validation.",
      categoryId: referralList.id,
      published: true,
      order: 3,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open the Referral Import page",
            content:
              'Navigate to the Referral Import page from the sidebar. You will see a file upload area and instructions for preparing your CSV file.',
            order: 0,
          },
          {
            title: "Prepare your CSV",
            content:
              "Your CSV file should include column headers that match your referral field names (e.g., Name, Email, Phone, Referral Source). The system will attempt to auto-map CSV columns to your existing referral fields.",
            order: 1,
          },
          {
            title: "Upload and map columns",
            content:
              "Drag and drop your CSV file or click to browse. The system will show a preview of your data with column mapping. Verify that each CSV column is mapped to the correct referral field. Adjust any mismatched mappings manually.",
            order: 2,
          },
          {
            title: "Review and confirm import",
            content:
              "Review the preview showing how your data will be imported. Check for any validation warnings (missing required fields, invalid formats). Click Import to create all the referral records. A summary will show how many referrals were successfully imported.",
            order: 3,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Managing Referral Dropdown Options",
      slug: "managing-referral-dropdown-options",
      summary:
        "Customize the dropdown and status options available in referral list columns.",
      categoryId: referralList.id,
      published: true,
      order: 4,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Access referral field options",
            content:
              'In the Referral List, click on a dropdown or status column header and select "Manage Options". This opens the option management page for that specific referral field.',
            order: 0,
          },
          {
            title: "Add, edit, or delete options",
            content:
              "The option management page works the same as for the Master List. Add new options with labels and optional colors, reorder them with drag handles, and delete options you no longer need.",
            order: 1,
          },
          {
            title: "Options apply organization-wide",
            content:
              "Any changes to referral field options apply to all team members in the organization. New options are immediately available when editing referrals in the list.",
            order: 2,
          },
        ],
      },
    },
  });

  // ─────────────────────────────────────────────────────────────
  // ADDITIONAL GETTING STARTED ARTICLES
  // ─────────────────────────────────────────────────────────────

  await prisma.manualArticle.create({
    data: {
      title: "The Onboarding Flow",
      slug: "the-onboarding-flow",
      summary:
        "Understand the initial setup wizard that walks you through configuring your account after registration.",
      categoryId: gettingStarted.id,
      published: true,
      order: 4,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Start the onboarding",
            content:
              "After registering and verifying your email, you will be automatically directed to the onboarding flow. This is a step-by-step wizard that helps you set up the essentials before using the dashboard.",
            order: 0,
          },
          {
            title: "Answer setup questions",
            content:
              "The onboarding asks how you heard about the platform and what you plan to use it for. These answers help tailor your experience. Fill them in and click Continue.",
            order: 1,
          },
          {
            title: "Create or join an organization",
            content:
              "You will be prompted to create your first organization (give it a name) or accept a pending invitation if one exists. This is required — all dashboard features are scoped to an organization.",
            order: 2,
          },
          {
            title: "Choose a subscription plan",
            content:
              "If required, you will be shown available plans. Select the one that fits your needs to activate your organization. Free trials may be available depending on your setup.",
            order: 3,
          },
          {
            title: "Enter the dashboard",
            content:
              "Once onboarding is complete, you will land on the Master List — the main page of the dashboard. From here you can start adding leads, inviting team members, and exploring other features.",
            order: 4,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Using the Help Center",
      slug: "using-the-help-center",
      summary:
        "Find answers quickly by browsing categories, searching articles, and accessing support resources.",
      categoryId: gettingStarted.id,
      published: true,
      order: 5,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open the Help Center",
            content:
              'Click "Help" in the sidebar navigation. The Help Center page shows a search bar, category filters, and a list of published knowledge base articles.',
            order: 0,
          },
          {
            title: "Search for articles",
            content:
              "Type keywords into the search bar to filter articles by title, summary, or category name. Results update instantly as you type.",
            order: 1,
          },
          {
            title: "Filter by category",
            content:
              "Click on a category badge (e.g., Getting Started, Master List, Integrations) to show only articles in that category. Click the category again or select All to remove the filter.",
            order: 2,
          },
          {
            title: "Read an article",
            content:
              "Click on any article card to open its full content. The article shows numbered steps with explanations and optional screenshots. Use the Back button to return to the article list.",
            order: 3,
          },
          {
            title: "Quick Actions and support",
            content:
              'The Help Center also includes Quick Action cards for common tasks and an "Integration Health" section showing whether your Gmail, Outlook, and Calendar integrations are connected. Use the "Submit a Request" section to contact support directly.',
            order: 4,
          },
        ],
      },
    },
  });

  // ─────────────────────────────────────────────────────────────
  // SUPPORT PORTAL
  // ─────────────────────────────────────────────────────────────

  await prisma.manualArticle.create({
    data: {
      title: "Using the AI Chat Assistant",
      slug: "using-the-ai-chat-assistant",
      summary:
        "Get instant answers and guidance from the AI-powered chat widget on the support portal.",
      categoryId: supportPortal.id,
      published: true,
      order: 0,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open the support portal",
            content:
              "Navigate to the support portal (separate from the main dashboard). The home page shows the knowledge base and a chat widget in the bottom corner of the screen.",
            order: 0,
          },
          {
            title: "Start a conversation",
            content:
              "Click the chat bubble icon to open the AI assistant. Type your question in natural language — for example, 'How do I import leads?' or 'What roles are available?'. The AI will provide relevant answers based on the knowledge base.",
            order: 1,
          },
          {
            title: "Expand for a full-screen view",
            content:
              "Click the expand icon on the chat widget to switch to an enlarged overlay mode. This gives you more space to read longer responses and have a more detailed conversation.",
            order: 2,
          },
          {
            title: "Escalate to a human",
            content:
              "If the AI cannot resolve your question, you can submit a support ticket directly from the chat interface. Click the assistance/ticket button to fill in details about your issue, including optional image attachments.",
            order: 3,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Submitting a Support Ticket",
      slug: "submitting-a-support-ticket",
      summary:
        "Create a support request with details and attachments when you need help from the team.",
      categoryId: supportPortal.id,
      published: true,
      order: 1,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open the ticket form",
            content:
              "On the support portal home page, scroll down to find the support request section, or click the assistance button within the AI chat. A form will appear where you can describe your issue.",
            order: 0,
          },
          {
            title: "Fill in the details",
            content:
              "Provide a clear subject line and a detailed description of your issue. Include what you were trying to do, what happened, and any error messages you saw. The more detail you provide, the faster the team can help.",
            order: 1,
          },
          {
            title: "Attach screenshots",
            content:
              "Use the image attachment area to upload screenshots showing the issue. Drag and drop images or click to browse. Screenshots help the support team understand the problem quickly.",
            order: 2,
          },
          {
            title: "Submit and track",
            content:
              'Click Submit to send your ticket. You will receive a confirmation with a ticket number. Navigate to "My Requests" to track the status of your submitted tickets.',
            order: 3,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Tracking Your Support Requests",
      slug: "tracking-your-support-requests",
      summary:
        "View the status of all your submitted tickets, filter by status, and follow up on open issues.",
      categoryId: supportPortal.id,
      published: true,
      order: 2,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open My Requests",
            content:
              'Navigate to "My Requests" from the support portal navigation. This page shows all support tickets you have submitted, with their current status, creation date, and ticket number.',
            order: 0,
          },
          {
            title: "Search and filter tickets",
            content:
              "Use the search bar to find tickets by keyword. Use the status filter buttons to show only Open, In Progress, Resolved, or Closed tickets. Pagination is available if you have many tickets.",
            order: 1,
          },
          {
            title: "View ticket details",
            content:
              "Click on any ticket row to open its detail page. Here you can see the full conversation history, including responses from the support team. You may also be able to add follow-up messages.",
            order: 2,
          },
          {
            title: "Check resolution status",
            content:
              "Each ticket shows its current status: Open (awaiting response), In Progress (being worked on), Resolved (fix applied), or Closed (completed). You will receive notifications when the status changes.",
            order: 3,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Browsing the Knowledge Base",
      slug: "browsing-the-knowledge-base",
      summary:
        "Explore the self-service knowledge base on the support portal for articles, guides, and resources.",
      categoryId: supportPortal.id,
      published: true,
      order: 3,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Visit the support portal home",
            content:
              "The support portal home page displays a grid of knowledge base categories and articles. Each card shows a title, description, and icon representing the topic.",
            order: 0,
          },
          {
            title: "Browse by category",
            content:
              "Click on a knowledge base card to explore articles within that category. Categories cover topics like Getting Started, Master List, Referrals, Integrations, and more.",
            order: 1,
          },
          {
            title: "Access resource links",
            content:
              "The portal also includes quick resource links for common tasks like accessing the main dashboard, viewing FAQs, or contacting the team directly.",
            order: 2,
          },
        ],
      },
    },
  });

  // ─────────────────────────────────────────────────────────────
  // ADDITIONAL INTEGRATIONS ARTICLE
  // ─────────────────────────────────────────────────────────────

  await prisma.manualArticle.create({
    data: {
      title: "Disconnecting an Integration",
      slug: "disconnecting-an-integration",
      summary:
        "Remove a connected email or calendar integration when you no longer need it.",
      categoryId: integrations.id,
      published: true,
      order: 4,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open the Integrations page",
            content:
              'Navigate to "Integrations" from the sidebar. You will see cards for each integration (Gmail, Outlook, Google Calendar, Outlook Calendar) showing their connection status.',
            order: 0,
          },
          {
            title: "Find the connected integration",
            content:
              'Connected integrations show a green "Connected" badge with the linked email address. Locate the integration you want to disconnect.',
            order: 1,
          },
          {
            title: "Click Disconnect",
            content:
              'Click the "Disconnect" button on the integration card. Confirm the action when prompted. The integration will be removed and the card will revert to showing a "Connect" button.',
            order: 2,
          },
          {
            title: "Impact of disconnecting",
            content:
              "After disconnecting, any features that relied on that integration will stop working. For example, disconnecting Gmail means you can no longer send emails from the Master List. Calendar events from that provider will no longer appear on your Calendar page. You can reconnect at any time.",
            order: 3,
          },
        ],
      },
    },
  });

  // ─────────────────────────────────────────────────────────────
  // ADDITIONAL TEAM & ROLES ARTICLE
  // ─────────────────────────────────────────────────────────────

  await prisma.manualArticle.create({
    data: {
      title: "Removing a Team Member",
      slug: "removing-a-team-member",
      summary:
        "Remove a member from your organization when they no longer need access.",
      categoryId: teamRoles.id,
      published: true,
      order: 3,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open the Team page",
            content:
              'Navigate to "Team" in the sidebar. You will see a list of all current members with their roles, join dates, and status.',
            order: 0,
          },
          {
            title: "Find the member to remove",
            content:
              "Scroll through the member list or use search to find the person. You must be an Owner to remove members from the organization.",
            order: 1,
          },
          {
            title: "Remove the member",
            content:
              'Click the actions menu (three dots) next to the member and select "Remove Member". Confirm the removal when prompted. The member will immediately lose access to the organization and all its data.',
            order: 2,
          },
          {
            title: "Reassign their work",
            content:
              "After removing a member, check if they were assigned to any leads, counties, or tasks. Use the Master List and County Configuration to reassign their responsibilities to other team members.",
            order: 3,
          },
        ],
      },
    },
  });

  // ─────────────────────────────────────────────────────────────
  // ADDITIONAL LOGS & REPORTS ARTICLES
  // ─────────────────────────────────────────────────────────────

  await prisma.manualArticle.create({
    data: {
      title: "Understanding Report Filters and Date Ranges",
      slug: "understanding-report-filters-and-date-ranges",
      summary:
        "Use date range pickers and member filters to generate focused reports for mileage, marketing, and expenses.",
      categoryId: logsReports.id,
      published: true,
      order: 5,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Open any report page",
            content:
              "Navigate to Mileage Report, Marketing Report, or Expense Report from the Reports section in the sidebar. Each report page has filter controls at the top.",
            order: 0,
          },
          {
            title: "Set a date range",
            content:
              "Use the date range picker to select a start and end date. The report will recalculate to show only entries within that period. Common presets (This Week, This Month, Last 30 Days) may be available for quick selection.",
            order: 1,
          },
          {
            title: "Filter by team member",
            content:
              "Use the member filter dropdown to view entries from a specific team member, or select All to see the entire organization's data. Owners and Admission Managers can see everyone's entries; Liaisons see only their own.",
            order: 2,
          },
          {
            title: "Read the summary cards",
            content:
              "Each report page shows summary cards at the top (e.g., Total Mileage, Total Expense, Activity Count) that update based on your active filters. Below the cards, a detailed table or chart shows individual entries.",
            order: 3,
          },
        ],
      },
    },
  });

  await prisma.manualArticle.create({
    data: {
      title: "Exporting Reports to PDF",
      slug: "exporting-reports-to-pdf",
      summary:
        "Generate a downloadable PDF of any report with your current filters applied.",
      categoryId: logsReports.id,
      published: true,
      order: 6,
      createdBy: userId,
      steps: {
        create: [
          {
            title: "Apply your desired filters",
            content:
              "Before exporting, set the date range and member filters to show exactly the data you want in the PDF. The export will include only the filtered results.",
            order: 0,
          },
          {
            title: 'Click "Export as PDF"',
            content:
              'Click the "Export as PDF" button (usually in the top right area of the report page). The system will generate a formatted PDF document containing the summary cards and the detailed data table.',
            order: 1,
          },
          {
            title: "Download and share",
            content:
              "The PDF will download automatically to your browser's downloads folder. You can share this file with stakeholders, attach it to emails, or print it for physical records.",
            order: 2,
          },
        ],
      },
    },
  });

  // Count results
  const articleCount = await prisma.manualArticle.count();
  const stepCount = await prisma.manualStep.count();
  console.log(
    `✅ Seeded ${categories.length} categories, ${articleCount} articles, ${stepCount} steps`
  );
}

main()
  .then(() => {
    console.log("🎉 Manual seed complete!");
  })
  .catch((e) => {
    console.error("❌ Manual seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
