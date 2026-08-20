import { ASSISTANT_DESTINATIONS, TicketCategory } from "@dashboard/shared";
import { z } from "zod";
import { registerTools } from "../../lib/ai/registry";
import { defineTool } from "../../lib/ai/types";
import { prisma } from "../../lib/prisma/prisma";

// Aggregates and statuses only: the assistant must never see ticket prose, which is user-entered.
const RECENT_TICKET_LIMIT = 5;

const DESTINATION_LABELS: Record<keyof typeof ASSISTANT_DESTINATIONS, string> =
  {
    home: "Open the help center",
    my_requests: "View my requests",
    account: "Open my account",
  };

const listMyTickets = defineTool({
  name: "list_my_tickets",
  description:
    "Call this before answering anything about the user's own support requests, such as how many are open or whether an agent has replied. Returns counts and ticket numbers only.",
  kind: "read",
  schema: z.object({}),
  jsonSchema: { type: "object", properties: {}, required: [] },
  handler: async (_input, ctx) => {
    const tickets = await prisma.supportTicket.findMany({
      where: { createBy: ctx.userId },
      orderBy: { updatedAt: "desc" },
      select: {
        ticketNumber: true,
        status: true,
        category: true,
        updatedAt: true,
      },
    });

    if (!tickets.length) {
      return { result: "The user has no support requests." };
    }

    const byStatus = tickets.reduce<Record<string, number>>((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] ?? 0) + 1;
      return acc;
    }, {});

    const counts = Object.entries(byStatus)
      .map(([status, count]) => `${status}: ${count}`)
      .join(", ");

    const recent = tickets
      .slice(0, RECENT_TICKET_LIMIT)
      .map(
        (ticket) =>
          `${ticket.ticketNumber} (${ticket.status}, ${ticket.category}, updated ${ticket.updatedAt.toISOString().slice(0, 10)})`
      )
      .join("; ");

    return {
      result: `Total requests: ${tickets.length}. By status: ${counts}. Most recent: ${recent}.`,
    };
  },
});

const getTicketStatus = defineTool({
  name: "get_ticket_status",
  description:
    "Call this when the user names a specific ticket number and asks about its status or progress. Returns status only, never the ticket text.",
  kind: "read",
  schema: z.object({ ticketNumber: z.string().min(1).max(50) }),
  jsonSchema: {
    type: "object",
    properties: {
      ticketNumber: {
        type: "string",
        description: "The ticket number the user referred to.",
      },
    },
    required: ["ticketNumber"],
  },
  handler: async (input, ctx) => {
    const ticket = await prisma.supportTicket.findFirst({
      where: { ticketNumber: input.ticketNumber, createBy: ctx.userId },
      select: {
        ticketNumber: true,
        status: true,
        category: true,
        priority: true,
        updatedAt: true,
        _count: { select: { SupportTicketMessage: true } },
      },
    });

    if (!ticket) {
      return {
        result: `No request numbered ${input.ticketNumber} belongs to this user.`,
      };
    }

    return {
      result: `${ticket.ticketNumber}: status ${ticket.status}, category ${ticket.category}, priority ${ticket.priority}, ${ticket._count.SupportTicketMessage} messages, last updated ${ticket.updatedAt.toISOString().slice(0, 10)}.`,
    };
  },
});

const proposeContactForm = defineTool({
  name: "propose_contact_form",
  description:
    "Call this when the help articles do not answer the question, or the user asks to contact support, report a bug, or open a request. Offers the request form; it does not submit anything.",
  kind: "propose",
  schema: z.object({
    category: z.enum(TicketCategory),
    title: z.string().min(1).max(120),
  }),
  jsonSchema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: Object.values(TicketCategory),
        description: "Best-fitting category for the user's issue.",
      },
      title: {
        type: "string",
        description: "Short summary of the issue, used to prefill the form.",
      },
    },
    required: ["category", "title"],
  },
  handler: (input) =>
    Promise.resolve({
      result: "The request form was offered to the user.",
      action: {
        kind: "open_form" as const,
        label: "Submit a request",
        prefill: {
          title: input.title,
          subject: input.title,
          category: input.category,
        },
      },
    }),
});

const proposeNavigate = defineTool({
  name: "propose_navigate",
  description:
    "Call this when the answer is something the user does on a specific page of the portal. Offers a link to that page.",
  kind: "propose",
  schema: z.object({
    destination: z.enum(
      Object.keys(ASSISTANT_DESTINATIONS) as [
        keyof typeof ASSISTANT_DESTINATIONS,
      ]
    ),
  }),
  jsonSchema: {
    type: "object",
    properties: {
      destination: {
        type: "string",
        enum: Object.keys(ASSISTANT_DESTINATIONS),
        description: "Which portal page to offer.",
      },
    },
    required: ["destination"],
  },
  handler: (input) =>
    Promise.resolve({
      result: `A link to ${input.destination} was offered to the user.`,
      action: {
        kind: "navigate" as const,
        label: DESTINATION_LABELS[input.destination],
        destination: input.destination,
      },
    }),
});

export const ASSISTANT_TOOLS = [
  listMyTickets,
  getTicketStatus,
  proposeContactForm,
  proposeNavigate,
];

registerTools(ASSISTANT_TOOLS);
