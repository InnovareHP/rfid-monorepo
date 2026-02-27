export function analyticsPrompt(analytics: any) {
  return `
  You are an AI analyst generating a Behavioral Referral Intelligence Report.

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
    "record_name": "The facility/company name from the business card",
    "contactInfo": {
      "phone": "Primary phone number or null",
      "email": "Email address or null",
    },
    "fields": {
      "<field_name>": "<extracted value or null>"
    }
  }

  Rules:
  - "record_name" is always the facility/company name from the business card
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
    old_value: string | null;
    new_value: string | null;
    created_at: Date;
    created_by: string | null;
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
