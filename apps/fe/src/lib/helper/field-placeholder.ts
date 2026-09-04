const PLACEHOLDER_BY_TYPE: Record<string, string> = {
  EMAIL: "jane.doe@company.com",
  PHONE: "(555) 123-4567",
  NUMBER: "0",
  PERSON: "Jane Doe",
};

const PLACEHOLDER_BY_NAME: Record<string, string> = {
  // Record names
  "contact name": "Jane Doe",
  "company name": "Sunrise Health Group",
  "facility name": "Sunrise Health Group",
  referrer: "Jane Doe",
  "patient name": "Jane Doe",
  "full name": "Jane Doe",
  "first name": "Jane",
  "last name": "Doe",

  // Contact and company
  title: "Director of Nursing",
  company: "Sunrise Health Group",
  website: "https://sunrisehealth.com",
  industry: "Skilled Nursing",

  // Location
  address: "123 Main St, Springfield, IL",
  city: "Springfield",
  state: "IL",
  "zip code": "62704",
  county: "Sangamon",

  // Facility
  "number of beds": "120",
  fax: "(555) 123-4568",
  "psychiatric services": "On-site, weekly visits",

  // Referral
  "contact number": "(555) 123-4567",
  reason: "Post-surgery rehab placement",
  assessor: "M. Reyes",
  "wrap up": "Awaiting insurance verification",
  "diagnosis / behavior": "Dementia, wandering risk",

  // Notes
  notes: "Met at the spring conference, prefers email",
  "additional notes": "Family requests morning contact",
  message: "How can we help?",
};

// Sample value for a field label, falling back to its type then a generic hint
export function placeholderFor(label: string, type: string) {
  return (
    PLACEHOLDER_BY_NAME[label.toLowerCase().trim()] ??
    PLACEHOLDER_BY_TYPE[type] ??
    `Enter ${label.toLowerCase()}`
  );
}
