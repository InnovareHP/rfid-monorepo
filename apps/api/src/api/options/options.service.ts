import { Injectable } from "@nestjs/common";
import { prisma } from "../../lib/prisma/prisma";

@Injectable()
export class OptionsService {
  async getCounties(organizationId: string) {
    return await prisma.boardCounty
      .findMany({
        where: { organization_id: organizationId },
        select: {
          id: true,
          county_name: true,
        },
        orderBy: { county_name: "asc" },
      })
      .then((counties) =>
        counties.map((c) => ({
          id: c.id,
          value: c.county_name,
        }))
      );
  }

  async getFieldOptions(organizationId: string, assignedTo: string) {
    const leads = await prisma.board.findMany({
      where: {
        organization_id: organizationId,
        module_type: "LEAD",
        assigned_to: assignedTo ? assignedTo : undefined,
      },
      select: {
        id: true,
        record_name: true,
      },
    });

    return leads.map((l) => ({
      id: l.id,
      value: l.record_name,
    }));
  }

  async getMemberOptions(organizationId: string, isLiason: boolean) {
    if (isLiason) {
      return await prisma.member_table
        .findMany({
          where: { organizationId: organizationId, member_role: "liason" },
          select: {
            id: true,
            user_table: {
              select: {
                id: true,
                user_name: true,
              },
            },
          },
        })
        .then((members) =>
          members.map((m) => ({
            id: m.user_table.id,
            value: m.user_table.user_name,
          }))
        );
    }
    return await prisma.member_table
      .findMany({
        where: { organizationId: organizationId },
        select: {
          id: true,
          user_table: {
            select: {
              user_name: true,
            },
          },
        },
      })
      .then((members) =>
        members.map((m) => ({
          id: m.id,
          value: m.user_table.user_name,
        }))
      );
  }
}
