import { NotFoundException } from "@nestjs/common";

jest.mock("../../lib/prisma/prisma", () => {
  const supportTicket = { findFirst: jest.fn() };
  const supportTicketMessage = { findFirst: jest.fn(), create: jest.fn() };
  const supportTicketAttachment = { create: jest.fn() };
  const supportHistory = { create: jest.fn(), findMany: jest.fn() };
  const supportLiveChat = { findFirst: jest.fn() };
  const supportLiveChatMessage = { create: jest.fn() };
  const supportLiveChatAttachment = { create: jest.fn() };

  return {
    prisma: {
      supportTicket,
      supportTicketMessage,
      supportTicketAttachment,
      supportHistory,
      supportLiveChat,
      supportLiveChatMessage,
      supportLiveChatAttachment,
    },
  };
});

import { prisma } from "../../lib/prisma/prisma";
import { SupportService } from "./support.service";

const OWNER = "user-a";
const ATTACKER = "user-b";
const FOREIGN = "ticket-owned-by-user-a";

const db = prisma as unknown as {
  supportTicket: { findFirst: jest.Mock };
  supportTicketMessage: { findFirst: jest.Mock; create: jest.Mock };
  supportTicketAttachment: { create: jest.Mock };
  supportHistory: { create: jest.Mock; findMany: jest.Mock };
  supportLiveChat: { findFirst: jest.Mock };
  supportLiveChatMessage: { create: jest.Mock };
  supportLiveChatAttachment: { create: jest.Mock };
};

const asUser = (id: string) => ({ id, role: "user" }) as any;
const asSupport = (id: string) => ({ id, role: "support" }) as any;
const asSuperAdmin = (id: string) => ({ id, role: "super_admin" }) as any;

describe("SupportService cross-account isolation", () => {
  let service: SupportService;

  beforeEach(() => {
    jest.clearAllMocks();
    db.supportTicket.findFirst.mockResolvedValue(null);
    db.supportTicketMessage.findFirst.mockResolvedValue(null);
    db.supportLiveChat.findFirst.mockResolvedValue(null);
    service = new SupportService();
  });

  // Tickets are platform-level rows, so the isolation axis is the user, not
  // the organization. A plain user only ever reaches tickets they opened.
  describe("getTicketById", () => {
    it("refuses a ticket opened by another user", async () => {
      await expect(
        service.getTicketById(FOREIGN, asUser(ATTACKER))
      ).rejects.toThrow(NotFoundException);

      expect(db.supportTicket.findFirst.mock.calls[0][0].where).toMatchObject({
        createBy: ATTACKER,
      });
    });

    it("scopes a support agent to the tickets assigned to them", async () => {
      db.supportTicket.findFirst.mockResolvedValue({ id: FOREIGN });

      await service.getTicketById(FOREIGN, asSupport(ATTACKER));

      expect(db.supportTicket.findFirst.mock.calls[0][0].where).toMatchObject({
        assignedTo: ATTACKER,
      });
    });

    it("lets a super admin read any ticket", async () => {
      db.supportTicket.findFirst.mockResolvedValue({ id: FOREIGN });

      await service.getTicketById(FOREIGN, asSuperAdmin(ATTACKER));

      const { where } = db.supportTicket.findFirst.mock.calls[0][0];
      expect(where.createBy).toBeUndefined();
      expect(where.assignedTo).toBeUndefined();
    });
  });

  describe("createTicketMessage", () => {
    it("refuses to post into another user's ticket", async () => {
      await expect(
        service.createTicketMessage(FOREIGN, asUser(ATTACKER), "hello")
      ).rejects.toThrow(NotFoundException);

      expect(db.supportTicketMessage.create).not.toHaveBeenCalled();
      expect(db.supportHistory.create).not.toHaveBeenCalled();
    });

    it("posts once the ticket is confirmed reachable", async () => {
      db.supportTicket.findFirst.mockResolvedValue({ id: FOREIGN });

      await service.createTicketMessage(FOREIGN, asUser(OWNER), "hello");

      expect(db.supportTicketMessage.create).toHaveBeenCalled();
    });
  });

  describe("createTicketAttachment", () => {
    it("refuses to attach to a message on another user's ticket", async () => {
      await expect(
        service.createTicketAttachment("msg-1", asUser(ATTACKER), "http://x")
      ).rejects.toThrow(NotFoundException);

      expect(
        db.supportTicketMessage.findFirst.mock.calls[0][0].where
      ).toMatchObject({ supportTicket: { createBy: ATTACKER } });
      expect(db.supportTicketAttachment.create).not.toHaveBeenCalled();
    });
  });

  describe("createLiveChatMessage", () => {
    it("refuses to post into another user's live chat", async () => {
      await expect(
        service.createLiveChatMessage("chat-1", ATTACKER, "hello")
      ).rejects.toThrow(NotFoundException);

      expect(db.supportLiveChat.findFirst.mock.calls[0][0].where).toMatchObject({
        id: "chat-1",
        sender: ATTACKER,
      });
      expect(db.supportLiveChatMessage.create).not.toHaveBeenCalled();
    });
  });

  describe("createLiveChatAttachment", () => {
    it("refuses to attach to another user's live chat", async () => {
      await expect(
        service.createLiveChatAttachment("chat-1", ATTACKER, "http://x")
      ).rejects.toThrow(NotFoundException);

      expect(db.supportLiveChatAttachment.create).not.toHaveBeenCalled();
    });
  });
});
