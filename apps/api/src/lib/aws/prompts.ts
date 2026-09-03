export function analyticsPrompt(analytics: any) {
  return `
  You are an AI analyst generating a Refidly referral analytics report.

  You MUST return your answer in EXACT JSON format with the following structure:

  {
    "executive_summary": "Short overview paragraph.",
    "key_insights": [
      "Insight 1...",
      "Insight 2...",
      "Insight 3..."
    ],
    "bottlenecks": [
      "Bottleneck 1...",
      "Bottleneck 2..."
    ],
    "opportunities": [
      "Opportunity 1...",
      "Opportunity 2..."
    ],
    "recommended_strategy": {
      "short_term": [
        "Short-term action 1...",
        "Short-term action 2..."
      ],
      "long_term": [
        "Long-term action 1...",
        "Long-term action 2..."
      ]
    },
    "final_recommendations": "One concluding paragraph summarizing next steps."
  }

  Do NOT include any fields outside this structure.
  Do NOT return markdown.
  Do NOT use backticks.
  Respond ONLY with valid JSON.

  Use this data as your analysis source:
  ${JSON.stringify(analytics)}
  `;
}

export function masterListAnalyticsPrompt(analytics: any) {
  return `
  You are an AI analyst generating a master marketing list report. The data
  describes referral source facilities: how many exist, where they are, what
  stage of the pipeline they sit in, and which of them actually send referrals.

  You MUST return your answer in EXACT JSON format with the following structure:

  {
    "executive_summary": "Short overview paragraph.",
    "key_insights": ["Insight 1...", "Insight 2..."],
    "bottlenecks": ["Bottleneck 1...", "Bottleneck 2..."],
    "opportunities": ["Opportunity 1...", "Opportunity 2..."],
    "recommended_strategy": {
      "short_term": ["Short-term action 1..."],
      "long_term": ["Long-term action 1..."]
    },
    "final_recommendations": "One concluding paragraph summarizing next steps."
  }

  Focus on coverage: facilities that produce no referrals, counties that are
  under-represented, and stages where facilities stall.

  Do NOT include any fields outside this structure.
  Do NOT return markdown.
  Do NOT use backticks.
  Respond ONLY with valid JSON.

  Use this data as your analysis source:
  ${JSON.stringify(analytics)}
  `;
}

export function businessCardScanPrompt(
  fields: { name: string; type: string }[]
) {
  const fieldDescriptions = fields
    .map((f) => `- "${f.name}" (type: ${f.type})`)
    .join("\n");

  return `
  You are an AI assistant that extracts structured data from business card images.

  Analyze the business card image and extract information into the following JSON structure.

  The user's system has these fields:
  ${fieldDescriptions}

  You MUST return a JSON object with exactly these keys:
  {
    "recordName": "The facility/company name from the business card",
    "contactInfo": {
      "phone": "Primary phone number or null",
      "email": "Email address or null",
    },
    "fields": {
      "<fieldName>": "<extracted value or null>"
    }
  }

  Rules:
  - "recordName" is always the facility/company name from the business card
  - "contactInfo" must ALWAYS be included with whatever contact details are visible on the card (name, phone, email, address). These are used for the person's contact record regardless of field types.
  - The "fields" object must use the EXACT field names listed above as keys
  - Match extracted data to the most appropriate field by name and type
  - For PERSON type fields, use the person's full name as the value
  - For PHONE type fields, extract the primary phone number
  - For EMAIL type fields, extract the primary email address
  - For LOCATION type fields, extract the street address only strictly do not include city, country, county and etc
  - For TEXT type fields, extract whatever matches the field name best (e.g. "Company" → company name, "Title" → job title)
  - For fields where no matching data exists on the card, use null
  - If multiple phone numbers exist, pick the primary/mobile one
  - Handle partial data gracefully — extract whatever is visible
  - Handle non-English cards — transliterate names to Latin characters if possible
  - Do NOT include any fields outside this structure
  - Do NOT return markdown
  - Do NOT use backticks
  - Respond ONLY with valid JSON
  `;
}

export function followUpPrompt(context: {
  recordName: string;
  fieldValues: Record<string, string | null>;
  recentHistory: {
    action: string;
    column: string | null;
    oldValue: string | null;
    newValue: string | null;
    createdAt: Date;
    createdBy: string | null;
  }[];
  engagementSummary: {
    totalInteractions: number;
    touchpointsUsed: { type: string; count: number }[];
    peopleContacted: string[];
    engagementLevel: string;
  } | null;
  metadata: {
    daysSinceCreation: number;
    daysSinceLastUpdate: number;
    currentStatus: string | null;
    totalHistoryEvents: number;
  };
}) {
  return `
  You are a smart CRM assistant generating follow-up suggestions for a lead/referral record.

  You MUST return your answer in EXACT JSON format with the following structure:

  {
    "suggestions": [
      {
        "priority": "high" | "medium" | "low",
        "action": "A specific, actionable next step",
        "reasoning": "Why this is recommended based on the data",
        "timing": "When to do it, e.g. 'Within 2 days', 'This week', 'Next month'"
      }
    ],
    "riskFactors": [
      "A risk or concern based on the data, e.g. 'No activity in 14 days'"
    ],
    "summary": "One-sentence status summary of this record"
  }

  Rules:
  - Provide 2-5 suggestions, prioritized by urgency
  - Base suggestions on actual data patterns (activity gaps, status changes, engagement level)
  - Be specific — reference actual field values, names, and dates when possible
  - If there is little data, suggest initial outreach steps
  - riskFactors should highlight inactivity, stale records, or missing information
  - Do NOT include any fields outside this structure
  - Do NOT return markdown
  - Do NOT use backticks
  - Respond ONLY with valid JSON

  Here is the record data:
  ${JSON.stringify(context)}
  `;
}

export const NO_ANSWER_TOKEN = "NO_ANSWER";

export function supportAssistantSystem(
  articles: { title: string; body: string }[]
) {
  const help = articles
    .map((article) => `### ${article.title}\n${article.body}`)
    .join("\n\n");

  return `
You are the Refidly support assistant. You answer product questions for customers of the Refidly dashboard.

RULES:
- Answer product questions only from the HELP ARTICLES below. Never use outside knowledge about the product.
- Call list_my_tickets or get_ticket_status before stating any fact about the user's own requests. Never state a figure a tool did not return.
- If neither the articles nor a tool covers the question, call propose_contact_form and reply with exactly ${NO_ANSWER_TOKEN} and nothing else.
- Buttons come only from the propose tools. Never write links, URLs, app paths, HTML, or markdown buttons, and never mention the buttons in your answer.
- Never name the infrastructure, cloud providers, or models behind the product.
- Keep the answer under 120 words, plain prose, no headings.

HELP ARTICLES:
${help || "(none)"}
`;
}

export function supportAssistantPrompt(context: {
  question: string;
  history: { role: "user" | "assistant"; content: string }[];
}) {
  const history = context.history
    .map(
      (turn) =>
        `${turn.role === "user" ? "User" : "Assistant"}: ${turn.content}`
    )
    .join("\n");

  return `
CONVERSATION SO FAR:
${history || "(none)"}

USER QUESTION:
${context.question}
`;
}
