import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma/prisma";
import { ListMembersDto } from "./dto/team.dto";

// User.name and User.email are absent from ENCRYPTED_FIELDS, so both are
// plaintext and the search term goes into the query rather than a memory pass.
@Injectable()
export class TeamService {
  async listMembers(organizationId: string, query: ListMembersDto) {
    const search = query.search;

    // Member is in AUTH_MANAGED, so the tenant extension does not scope it and
    // the organization filter has to be written here.
    const where: Prisma.MemberWhereInput = {
      organizationId,
      ...(search && {
        user: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        },
      }),
    };

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.member.count({ where }),
    ]);

    return { members, total };
  }
}
