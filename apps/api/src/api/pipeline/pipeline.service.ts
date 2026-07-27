import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ModuleType, Prisma, StageType } from "@prisma/client";
import { prisma } from "../../lib/prisma/prisma";
import {
  SetPipelineConfigDto,
  UpdatePipelineStagesDto,
} from "./dto/pipeline.schema";

type PipelineRange = { from?: string; to?: string };

type StageTotal = { count: number; value: number };

// FieldValue.value and History values are encrypted at rest, so every sum and
// grouping runs in memory after the extension decrypts, never in Postgres.
@Injectable()
export class PipelineService {
  async getPipeline(
    organizationId: string,
    moduleType: string,
    range: PipelineRange
  ) {
    const { stageField, amountField } = await this.resolvePipelineFields(
      organizationId,
      moduleType
    );

    const fieldIds = amountField
      ? [stageField.id, amountField.id]
      : [stageField.id];

    const [options, boards] = await Promise.all([
      prisma.fieldOption.findMany({
        where: { fieldId: stageField.id, isDeleted: false },
        orderBy: [{ optionOrder: "asc" }, { optionName: "asc" }],
      }),
      prisma.board.findMany({
        where: this.boardWhere(organizationId, moduleType, range),
        select: {
          id: true,
          values: {
            where: { fieldId: { in: fieldIds } },
            select: { fieldId: true, value: true },
          },
        },
      }),
    ]);

    const totals = new Map<string, StageTotal>();
    const unstaged: StageTotal = { count: 0, value: 0 };

    for (const board of boards) {
      const stage = board.values.find(
        (v) => v.fieldId === stageField.id
      )?.value;
      const amount = amountField
        ? this.parseAmount(
            board.values.find((v) => v.fieldId === amountField.id)?.value
          )
        : 0;

      const bucket = stage
        ? (totals.get(stage) ?? { count: 0, value: 0 })
        : unstaged;
      bucket.count += 1;
      bucket.value += amount;
      if (stage) totals.set(stage, bucket);
    }

    const stages = options.map((option) => {
      const total = totals.get(option.optionName) ?? { count: 0, value: 0 };
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
        count: total.count,
        value: this.round(total.value),
        forecast: this.round((total.value * probability) / 100),
      };
    });

    const open = this.sumStages(stages, StageType.OPEN);
    const won = this.sumStages(stages, StageType.WON);
    const lost = this.sumStages(stages, StageType.LOST);
    const closed = won.count + lost.count;

    return {
      stageField: { id: stageField.id, name: stageField.fieldName },
      amountField: amountField
        ? { id: amountField.id, name: amountField.fieldName }
        : null,
      stages,
      unstaged: { count: unstaged.count, value: this.round(unstaged.value) },
      totals: {
        open,
        won,
        lost,
        winRate: closed ? this.round((won.count / closed) * 100) : 0,
        weightedForecast: this.round(open.forecast + won.value),
      },
    };
  }

  async getWinLoss(
    organizationId: string,
    moduleType: string,
    range: PipelineRange
  ) {
    const { stageField } = await this.resolvePipelineFields(
      organizationId,
      moduleType
    );

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
        "No stage is marked WON or LOST for this pipeline"
      );
    }

    const boards = await prisma.board.findMany({
      where: this.boardWhere(organizationId, moduleType, range),
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
    const fields = await prisma.field.findMany({
      where: {
        organizationId,
        moduleType: moduleType as ModuleType,
        isDeleted: false,
        fieldType: { in: ["STATUS", "NUMBER"] },
      },
      orderBy: { fieldOrder: "asc" },
      select: {
        id: true,
        fieldName: true,
        fieldType: true,
        isPipelineStage: true,
        isPipelineAmount: true,
      },
    });

    const stageField = fields.find((f) => f.isPipelineStage);

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
      stageFieldId: stageField?.id ?? null,
      amountFieldId: fields.find((f) => f.isPipelineAmount)?.id ?? null,
      stageCandidates: fields
        .filter((f) => f.fieldType === "STATUS")
        .map((f) => ({ id: f.id, name: f.fieldName })),
      amountCandidates: fields
        .filter((f) => f.fieldType === "NUMBER")
        .map((f) => ({ id: f.id, name: f.fieldName })),
      stages,
    };
  }

  async setConfig(organizationId: string, dto: SetPipelineConfigDto) {
    const { moduleType, stageFieldId, amountFieldId } = dto;

    const fields = await prisma.field.findMany({
      where: {
        id: { in: [stageFieldId, ...(amountFieldId ? [amountFieldId] : [])] },
        organizationId,
        moduleType: moduleType as ModuleType,
        isDeleted: false,
      },
      select: { id: true, fieldType: true },
    });

    const stage = fields.find((f) => f.id === stageFieldId);
    if (stage?.fieldType !== "STATUS") {
      throw new BadRequestException("Stage field must be a STATUS field");
    }

    if (amountFieldId) {
      const amount = fields.find((f) => f.id === amountFieldId);
      if (amount?.fieldType !== "NUMBER") {
        throw new BadRequestException("Amount field must be a NUMBER field");
      }
    }

    const where = { organizationId, moduleType: moduleType as ModuleType };

    await prisma.$transaction([
      prisma.field.updateMany({
        where: { ...where, isPipelineStage: true },
        data: { isPipelineStage: false },
      }),
      prisma.field.updateMany({
        where: { ...where, isPipelineAmount: true },
        data: { isPipelineAmount: false },
      }),
      prisma.field.update({
        where: { id: stageFieldId },
        data: { isPipelineStage: true },
      }),
      ...(amountFieldId
        ? [
            prisma.field.update({
              where: { id: amountFieldId },
              data: { isPipelineAmount: true },
            }),
          ]
        : []),
    ]);

    return this.getConfig(organizationId, moduleType);
  }

  async updateStages(organizationId: string, dto: UpdatePipelineStagesDto) {
    const { moduleType, stages } = dto;

    const owned = await prisma.fieldOption.findMany({
      where: {
        id: { in: stages.map((s) => s.optionId) },
        field: {
          organizationId,
          moduleType: moduleType as ModuleType,
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

  private async resolvePipelineFields(
    organizationId: string,
    moduleType: string
  ) {
    const fields = await prisma.field.findMany({
      where: {
        organizationId,
        moduleType: moduleType as ModuleType,
        isDeleted: false,
        OR: [{ isPipelineStage: true }, { isPipelineAmount: true }],
      },
      select: {
        id: true,
        fieldName: true,
        isPipelineStage: true,
        isPipelineAmount: true,
      },
    });

    const stageField = fields.find((f) => f.isPipelineStage);
    if (!stageField) {
      throw new NotFoundException(
        "No pipeline stage field configured for this module"
      );
    }

    return { stageField, amountField: fields.find((f) => f.isPipelineAmount) };
  }

  private boardWhere(
    organizationId: string,
    moduleType: string,
    range: PipelineRange
  ): Prisma.BoardWhereInput {
    return {
      organizationId,
      moduleType: moduleType as ModuleType,
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

  private parseAmount(value: string | null | undefined) {
    if (!value) return 0;
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private sumStages(
    stages: {
      stageType: StageType;
      count: number;
      value: number;
      forecast: number;
    }[],
    stageType: StageType
  ) {
    const matching = stages.filter((s) => s.stageType === stageType);
    return {
      count: matching.reduce((sum, s) => sum + s.count, 0),
      value: this.round(matching.reduce((sum, s) => sum + s.value, 0)),
      forecast: this.round(matching.reduce((sum, s) => sum + s.forecast, 0)),
    };
  }

  private round(value: number) {
    return Math.round(value * 100) / 100;
  }
}
