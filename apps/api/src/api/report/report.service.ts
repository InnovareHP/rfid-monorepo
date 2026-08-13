import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma/prisma";
import { SaveReportDto, UpdateReportDto } from "./dto/report.dto";

@Injectable()
export class ReportService {
  async getReports(organizationId: string) {
    return prisma.savedReport.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: { module: { select: { key: true, label: true } } },
    });
  }

  async getReport(id: string, organizationId: string) {
    const report = await prisma.savedReport.findFirst({
      where: { id, organizationId },
      include: { module: { select: { key: true, label: true } } },
    });

    if (!report) throw new NotFoundException("Report not found");

    return report;
  }

  async createReport(
    dto: SaveReportDto,
    organizationId: string,
    userId: string
  ) {
    return prisma.savedReport.create({
      data: {
        name: dto.name,
        moduleId: dto.moduleId,
        columnIds: dto.columnIds,
        filter: dto.filter as Prisma.InputJsonValue,
        rangeDays: dto.rangeDays,
        organizationId,
        createdBy: userId,
      },
    });
  }

  async updateReport(id: string, dto: UpdateReportDto, organizationId: string) {
    await this.getReport(id, organizationId);

    return prisma.savedReport.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.moduleId !== undefined && { moduleId: dto.moduleId }),
        ...(dto.columnIds !== undefined && { columnIds: dto.columnIds }),
        ...(dto.filter !== undefined && {
          filter: dto.filter as Prisma.InputJsonValue,
        }),
        ...(dto.rangeDays !== undefined && { rangeDays: dto.rangeDays }),
      },
    });
  }

  async deleteReport(id: string, organizationId: string) {
    await this.getReport(id, organizationId);

    await prisma.savedReport.delete({ where: { id } });

    return { message: "Report deleted successfully" };
  }

  // The window is applied at run time rather than stored as dates, so a saved
  // report keeps meaning "the last 90 days" instead of the 90 days it was built on.
  async runReport(id: string, organizationId: string) {
    const report = await this.getReport(id, organizationId);

    const records = await prisma.board.findMany({
      where: {
        organizationId,
        moduleId: report.moduleId,
        isDeleted: false,
        ...(report.rangeDays && {
          createdAt: {
            gte: new Date(Date.now() - report.rangeDays * 86_400_000),
          },
        }),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        recordName: true,
        createdAt: true,
        values: {
          where: { fieldId: { in: report.columnIds } },
          select: { fieldId: true, value: true },
        },
      },
    });

    const columns = await prisma.field.findMany({
      where: { id: { in: report.columnIds }, organizationId },
      select: { id: true, fieldName: true, fieldType: true },
    });

    const filter = report.filter as Record<string, string>;
    const filterEntries = Object.entries(filter).filter(([, value]) => value);

    const rows = records
      .map((record) => {
        const byField = new Map(
          record.values.map((value) => [value.fieldId, value.value])
        );

        return {
          id: record.id,
          recordName: record.recordName,
          createdAt: record.createdAt,
          values: Object.fromEntries(
            report.columnIds.map((fieldId) => [
              fieldId,
              byField.get(fieldId) ?? null,
            ])
          ),
        };
      })
      .filter((row) =>
        filterEntries.every(
          ([fieldId, expected]) => row.values[fieldId] === expected
        )
      );

    // Column order follows the report, not the field table.
    const orderedColumns = report.columnIds
      .map((fieldId) => columns.find((column) => column.id === fieldId))
      .filter((column) => column !== undefined);

    return { report, columns: orderedColumns, rows };
  }
}
