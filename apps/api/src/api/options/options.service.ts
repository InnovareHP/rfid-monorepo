import { Injectable } from "@nestjs/common";
import { prisma } from "../../lib/prisma/prisma";

@Injectable()
export class OptionsService {
  async getCounties(organizationId: string) {
    return await prisma.boardCounty
      .findMany({
        where: { organizationId: organizationId },
        select: {
          id: true,
          countyName: true,
        },
        orderBy: { countyName: "asc" },
      })
      .then((counties) =>
        counties.map((c) => ({
          id: c.id,
          value: c.countyName,
        }))
      );
  }

  async getFieldOptions(organizationId: string, assignedTo: string) {
    const leads = await prisma.board.findMany({
      where: {
        organizationId: organizationId,
        moduleType: "LEAD",
        assignedTo: assignedTo ? assignedTo : undefined,
      },
      select: {
        id: true,
        recordName: true,
      },
    });

    return leads.map((l) => ({
      id: l.id,
      value: l.recordName,
    }));
  }

  async getMemberOptions(organizationId: string, isLiason: boolean) {
    if (isLiason) {
      return await prisma.member
        .findMany({
          where: { organizationId: organizationId, role: "liason" },
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
        .then((members) =>
          members.map((m) => ({
            id: m.user.id,
            value: m.user.name,
          }))
        );
    }
    return await prisma.member
      .findMany({
        where: { organizationId: organizationId },
        select: {
          id: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      })
      .then((members) =>
        members.map((m) => ({
          id: m.id,
          value: m.user.name,
        }))
      );
  }
}
