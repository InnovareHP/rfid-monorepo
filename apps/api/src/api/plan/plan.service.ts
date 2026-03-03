import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma/prisma";
import { GetPlanDto } from "./dto/plan.schema";

@Injectable()
export class PlanService {
  async GetAllPlan(dto: GetPlanDto) {
    const { page, skip, orderBy, sortBy, type, role } = dto;

    const offset = Number(page - 1) * Number(skip);

    let where: Prisma.PlanWhereInput = { isActive: true };

    const filterMap: Record<string, () => Prisma.PlanWhereInput> = {
      type: () => ({
        type: type,
      }),
      role: () => ({
        roleAvailable: role,
      }),
    };

    Object.entries({
      type: !!type,
      role: !!role,
    }).forEach(([key, shouldAdd]) => {
      if (shouldAdd) {
        where = { ...where, ...filterMap[key]() };
      }
    });

    const [data, total] = await Promise.all([
      prisma.plan.findMany({
        skip: offset,
        take: Number(skip),
        where,
        orderBy: {
          [orderBy]: sortBy,
        },
      }),
      prisma.plan.count({ where }),
    ]);

    return { data, total };
  }
}
