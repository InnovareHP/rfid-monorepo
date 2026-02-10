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
