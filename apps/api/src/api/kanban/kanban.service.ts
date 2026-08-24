import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, StageType } from "@prisma/client";
import { prisma } from "../../lib/prisma/prisma";
import { resolveModuleId } from "../../lib/module/system-modules";
import { UpdateKanbanStagesDto } from "./dto/kanban.schema";

type KanbanRange = { from?: string; to?: string };

// FieldValue.value and History values are encrypted at rest, so every count and
// grouping runs in memory after the extension decrypts, never in Postgres.
@Injectable()
export class KanbanService {
  async getKanban(
    organizationId: string,
    moduleType: string,
    range: KanbanRange
  ) {
    const stageField = await this.resolveStageField(organizationId, moduleType);

    const [options, boards] = await Promise.all([
      prisma.fieldOption.findMany({
        where: { fieldId: stageField.id, isDeleted: false },
        orderBy: [{ optionOrder: "asc" }, { optionName: "asc" }],
      }),
      prisma.board.findMany({
        where: await this.boardWhere(organizationId, moduleType, range),
        select: {
          id: true,
          values: {
            where: { fieldId: stageField.id },
            select: { fieldId: true, value: true },
          },
        },
      }),
    ]);

    const counts = new Map<string, number>();
    let unstaged = 0;

    for (const board of boards) {
      const stage = board.values.find(
        (v) => v.fieldId === stageField.id
      )?.value;

      if (!stage) {
        unstaged += 1;
        continue;
      }
      counts.set(stage, (counts.get(stage) ?? 0) + 1);
    }

    const stages = options.map((option) => {
      const count = counts.get(option.optionName) ?? 0;
      const probability = this.stageProbability(
        option.stageType,
        option.probability
      );

      return {
        id: option.id,
        name: option.optionName,
        color: option.color,
        order: option.optionOrder,
        stageType: option.stageType,
        probability,
        count,
        // Expected wins rather than money: a stage carries no amount.
        forecast: this.round((count * probability) / 100),
      };
    });

    const open = this.sumStages(stages, StageType.OPEN);
    const won = this.sumStages(stages, StageType.WON);
    const lost = this.sumStages(stages, StageType.LOST);
    const closed = won.count + lost.count;

    return {
      stageField: { id: stageField.id, name: stageField.fieldName },
      stages,
      unstaged: { count: unstaged },
      totals: {
        open,
        won,
        lost,
        winRate: closed ? this.round((won.count / closed) * 100) : 0,
        weightedForecast: this.round(open.forecast + won.count),
      },
    };
  }

  async getWinLoss(
    organizationId: string,
    moduleType: string,
    range: KanbanRange
  ) {
    const stageField = await this.resolveStageField(organizationId, moduleType);

    const options = await prisma.fieldOption.findMany({
      where: { fieldId: stageField.id, isDeleted: false },
      select: { optionName: true, stageType: true },
    });

    const outcomeByStage = new Map(
      options
        .filter((o) => o.stageType !== StageType.OPEN)
        .map((o) => [o.optionName, o.stageType])
    );
    if (!outcomeByStage.size) {
      throw new BadRequestException(
        "No stage is marked WON or LOST for this Kanban"
      );
    }

    const boards = await prisma.board.findMany({
      where: await this.boardWhere(organizationId, moduleType, range),
      select: {
        id: true,
        createdAt: true,
        history: {
          where: { fieldId: stageField.id },
          orderBy: { createdAt: "asc" },
          select: { newValue: true, oldValue: true, createdAt: true },
        },
      },
    });

    const won = { count: 0, cycleDays: 0 };
    const lost = { count: 0, cycleDays: 0 };
    const lostFromStage = new Map<string, number>();

    for (const board of boards) {
      // Last transition into a WON or LOST stage decides the outcome
      const closing = [...board.history]
        .reverse()
        .find((h) => h.newValue && outcomeByStage.has(h.newValue));
      if (!closing?.newValue) continue;

      const days =
        (closing.createdAt.getTime() - board.createdAt.getTime()) / 86_400_000;

      if (outcomeByStage.get(closing.newValue) === StageType.WON) {
        won.count += 1;
        won.cycleDays += days;
        continue;
      }

      lost.count += 1;
      lost.cycleDays += days;
      const from = closing.oldValue ?? "Unknown";
      lostFromStage.set(from, (lostFromStage.get(from) ?? 0) + 1);
    }

    const closed = won.count + lost.count;

    return {
      won: {
        count: won.count,
        avgCycleDays: won.count ? this.round(won.cycleDays / won.count) : 0,
      },
      lost: {
        count: lost.count,
        avgCycleDays: lost.count ? this.round(lost.cycleDays / lost.count) : 0,
      },
      winRate: closed ? this.round((won.count / closed) * 100) : 0,
      lostFromStage: [...lostFromStage.entries()]
        .map(([stage, count]) => ({ stage, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  async getConfig(organizationId: string, moduleType: string) {
    const stageField = await this.findStageField(organizationId, moduleType);

    const stages = stageField
      ? await prisma.fieldOption.findMany({
          where: { fieldId: stageField.id, isDeleted: false },
          orderBy: [{ optionOrder: "asc" }, { optionName: "asc" }],
          select: {
            id: true,
            optionName: true,
            color: true,
            optionOrder: true,
            stageType: true,
            probability: true,
          },
        })
      : [];

    return {
      stageField: stageField
        ? { id: stageField.id, name: stageField.fieldName }
        : null,
      stages,
    };
  }

  async updateStages(organizationId: string, dto: UpdateKanbanStagesDto) {
    const { moduleType, stages } = dto;

    const owned = await prisma.fieldOption.findMany({
      where: {
        id: { in: stages.map((s) => s.optionId) },
        field: {
          organizationId,
          moduleId: await resolveModuleId(moduleType, organizationId),
          isDeleted: false,
        },
      },
      select: { id: true },
    });

    if (owned.length !== stages.length) {
      throw new NotFoundException(
        "One or more stages do not belong to this organization"
      );
    }

    await prisma.$transaction(
      stages.map((s) =>
        prisma.fieldOption.update({
          where: { id: s.optionId },
          data: {
            optionOrder: s.optionOrder,
            stageType: s.stageType,
            probability: s.probability ?? null,
          },
        })
      )
    );

    return this.getConfig(organizationId, moduleType);
  }

  // Every module's Kanban groups by its first STATUS field, so a module created
  // by an organization gets a board without configuring anything.
  private async findStageField(organizationId: string, moduleType: string) {
    return prisma.field.findFirst({
      where: {
        organizationId,
        moduleId: await resolveModuleId(moduleType, organizationId),
        isDeleted: false,
        fieldType: "STATUS",
      },
      orderBy: { fieldOrder: "asc" },
      select: { id: true, fieldName: true },
    });
  }

  private async resolveStageField(organizationId: string, moduleType: string) {
    const stageField = await this.findStageField(organizationId, moduleType);
    if (!stageField) {
      throw new NotFoundException(
        "This module has no status field to group by"
      );
    }
    return stageField;
  }

  private async boardWhere(
    organizationId: string,
    moduleType: string,
    range: KanbanRange
  ): Promise<Prisma.BoardWhereInput> {
    return {
      organizationId,
      moduleId: await resolveModuleId(moduleType, organizationId),
      isDeleted: false,
      ...((range.from || range.to) && {
        createdAt: {
          ...(range.from && { gte: new Date(range.from) }),
          ...(range.to && { lte: new Date(range.to) }),
        },
      }),
    };
  }

  // WON and LOST are certain, so only OPEN stages carry a configurable weight
  private stageProbability(stageType: StageType, probability: number | null) {
    if (stageType === StageType.WON) return 100;
    if (stageType === StageType.LOST) return 0;
    return probability ?? 0;
  }

  private sumStages(
    stages: { stageType: StageType; count: number; forecast: number }[],
    stageType: StageType
  ) {
    const matching = stages.filter((s) => s.stageType === stageType);
    return {
      count: matching.reduce((sum, s) => sum + s.count, 0),
      forecast: this.round(matching.reduce((sum, s) => sum + s.forecast, 0)),
    };
  }

  private round(value: number) {
    return Math.round(value * 100) / 100;
  }
}
