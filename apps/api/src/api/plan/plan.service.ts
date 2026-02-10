import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma/prisma";
import { GetPlanDto } from "./dto/plan.schema";

@Injectable()
export class PlanService {
  async GetAllPlan(dto: GetPlanDto) {
    const { page, skip, orderBy, sortBy, type, role } = dto;

    const offset = Number(page - 1) * Number(skip);

    let where: Prisma.plan_tableWhereInput = { plan_is_active: true };

    const filterMap: Record<string, () => Prisma.plan_tableWhereInput> = {
      type: () => ({
        plan_type: type,
      }),
      role: () => ({
        plan_role_available: role,
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
      prisma.plan_table.findMany({
        skip: offset,
        take: Number(skip),
        where,
        orderBy: {
          [orderBy]: sortBy,
        },
      }),
      prisma.plan_table.count({ where }),
    ]);

    return { data, total };
  }
}
