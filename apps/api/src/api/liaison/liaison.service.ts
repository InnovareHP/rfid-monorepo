import { MarketingReportResponse } from "@dashboard/shared";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, TouchpointType } from "@prisma/client";
import axios from "axios";
import * as PDFDocument from "pdfkit";
import * as sharp from "sharp";
import { prisma } from "../../lib/prisma/prisma";
import { TOUCHPOINT_ACTIVITIES } from "./liaison-activity.service";
import {
  CreateExpenseDto,
  CreateMarketingDto,
  CreateMillageDto,
  UpdateExpenseDto,
  UpdateMarketingDto,
  UpdateMillageDto,
} from "./dto/liaison.schema";

type MarketingActivityInput = {
  touchpoints: TouchpointType[];
  talkedTo: string;
  notes?: string | null;
  reasonForVisit?: string | null;
};

// The mirrored activity is typed from the first touchpoint, so the rest are named
// in the description instead of being dropped.
const toActivityFields = (log: MarketingActivityInput) => ({
  title: log.reasonForVisit
    ? `Marketing touchpoint: ${log.reasonForVisit}`
    : "Marketing touchpoint",
  description: `${log.touchpoints.join(", ")} - talked to ${log.talkedTo}${
    log.notes ? ` - ${log.notes}` : ""
  }`,
  activityType: TOUCHPOINT_ACTIVITIES[log.touchpoints[0]],
});

@Injectable()
export class LiaisonService {
  private readonly logger = new Logger(LiaisonService.name);
  async createMillage(
    createMillageDto: CreateMillageDto,
    memberId: string,
    organizationId: string
  ) {
    await prisma.$transaction(async (tx) => {
      const existingMileageToday = await tx.mileage.findFirst({
        where: {
          memberId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });

      if (existingMileageToday) {
        throw new BadRequestException(
          "You have already created a mileage today"
        );
      }

      await tx.mileage.create({
        data: {
          destination: createMillageDto.destination,
          countiesMarketed: createMillageDto.countiesMarketed,
          beginningMileage: createMillageDto.beginningMileage,
          endingMileage: createMillageDto.endingMileage,
          totalMiles: createMillageDto.totalMiles,
          rateType: createMillageDto.rateType,
          ratePerMile: createMillageDto.ratePerMile,
          reimbursementAmount: createMillageDto.reimbursementAmount,
          memberId,
          organizationId,
        },
      });
    });
  }

  async getMillage(
    memberId: string | null,
    filter: any,
    organizationId: string
  ) {
    const where: Prisma.MileageWhereInput = {
      memberId: memberId ?? undefined,
      member: { organizationId },
      isDeleted: false,
    };

    if (filter.filter.mileageDateFrom && filter.filter.mileageDateTo) {
      where.createdAt = {
        gte: new Date(filter.filter.mileageDateFrom),
        lte: new Date(filter.filter.mileageDateTo),
      };
    }

    const offset = (filter.page - 1) * filter.limit;

    const [data, total, sums] = await Promise.all([
      prisma.mileage.findMany({
        where,
        skip: offset,
        take: filter.limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.mileage.count({
        where,
      }),
      prisma.mileage.aggregate({
        where,
        _sum: { reimbursementAmount: true, totalMiles: true },
      }),
    ]);
    return {
      data,
      total,
      totals: {
        reimbursement: sums._sum.reimbursementAmount ?? 0,
        miles: sums._sum.totalMiles ?? 0,
        trips: total,
      },
      nextPage: filter.page * filter.limit < total ? filter.page + 1 : null,
    };
  }

  // Mileage carries no organizationId of its own, so ownership is proven
  // through the member relation before the row is read or mutated.
  // memberId is null for org admins, who may act on any member's entry.
  private async assertMileageInOrg(
    id: string,
    organizationId: string,
    memberId: string | null
  ) {
    const mileage = await prisma.mileage.findFirst({
      where: {
        id,
        member: { organizationId },
        ...(memberId ? { memberId } : {}),
      },
      select: { id: true },
    });
    if (!mileage) throw new NotFoundException("Mileage not found");
  }

  async getMillageById(id: string, organizationId: string) {
    const millage = await prisma.mileage.findFirst({
      where: {
        id,
        isDeleted: false,
        member: { organizationId },
      },
    });
    if (!millage) throw new NotFoundException("Mileage not found");
    return millage;
  }

  async updateMillage(
    id: string,
    updateMillageDto: UpdateMillageDto,
    organizationId: string,
    memberId: string | null
  ) {
    await this.assertMileageInOrg(id, organizationId, memberId);

    await prisma.mileage.update({
      where: {
        id,
      },
      data: updateMillageDto,
    });
  }

  async deleteMillage(
    id: string,
    organizationId: string,
    memberId: string | null
  ) {
    await this.assertMileageInOrg(id, organizationId, memberId);

    await prisma.mileage.update({
      where: {
        id,
      },
      data: {
        isDeleted: true,
      },
    });
  }

  // recordName is encrypted at rest with a random IV, so equality lookups must
  // compare decrypted values in memory.
  private async findFacilityRecord(facility: string, organizationId: string) {
    const leads = await prisma.board.findMany({
      where: {
        organizationId,
        moduleType: "LEAD",
        isDeleted: false,
      },
      select: { id: true, recordName: true },
    });

    const match = leads.find((lead) => lead.recordName === facility);

    if (!match) {
      throw new BadRequestException("Lead not found");
    }

    return match;
  }

  async createMarketing(
    createMarketingDto: CreateMarketingDto,
    memberId: string,
    userId: string,
    organizationId: string
  ) {
    const findLeadNameViaName = await this.findFacilityRecord(
      createMarketingDto.facility,
      organizationId
    );

    await prisma.$transaction(async (tx) => {
      const marketing = await tx.marketing.create({
        data: {
          facility: createMarketingDto.facility,
          touchpoints: createMarketingDto.touchpoint,
          talkedTo: createMarketingDto.talkedTo,
          notes: createMarketingDto.notes,
          reasonForVisit: createMarketingDto.reasonForVisit,
          memberId,
          organizationId,
          facilityRecordId: findLeadNameViaName.id,
        },
        select: { id: true },
      });

      await tx.activity.create({
        data: {
          ...toActivityFields({
            touchpoints: createMarketingDto.touchpoint,
            talkedTo: createMarketingDto.talkedTo,
            notes: createMarketingDto.notes,
            reasonForVisit: createMarketingDto.reasonForVisit,
          }),
          status: "COMPLETED",
          completedAt: new Date(),
          recordId: findLeadNameViaName.id,
          marketingId: marketing.id,
          createdBy: userId,
          organizationId,
        },
      });

      await tx.history.create({
        data: {
          recordId: findLeadNameViaName.id,
          organizationId,
          column: "marketing",
          newValue:
            "Created a milestone for the organization" +
            createMarketingDto.facility +
            " with the following touchpoints: " +
            createMarketingDto.touchpoint.join(", ") +
            " and talked to: " +
            createMarketingDto.talkedTo +
            " with the following notes: " +
            createMarketingDto.notes +
            " on " +
            new Date().toISOString(),
          createdBy: userId,
          action: "milestone_created",
        },
      });
    });
  }

  async getMarketing(
    memberId: string | null,
    filter: any,
    organizationId: string
  ): Promise<MarketingReportResponse> {
    const where: Prisma.MarketingWhereInput = {
      memberId: memberId ?? undefined,
      member: { organizationId },
      isDeleted: false,
    };

    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (filter.filter.marketingDateFrom && filter.filter.marketingDateTo) {
      startDate = new Date(filter.filter.marketingDateFrom);
      endDate = new Date(filter.filter.marketingDateTo);
      where.createdAt = { gte: startDate, lte: endDate };
    }

    const offset = (filter.page - 1) * filter.limit;

    const [data, total, scopedRows] = await Promise.all([
      prisma.marketing.findMany({
        where,
        skip: offset,
        take: filter.limit,
        orderBy: { createdAt: "desc" },
        include: { member: { select: { user: { select: { name: true } } } } },
      }),
      prisma.marketing.count({
        where,
      }),
      // Full scan of the filtered set to build the facility/touchpoint
      // breakdowns below — acceptable at current scale, revisit if this
      // becomes a hot path.
      prisma.marketing.findMany({
        where,
        select: { facility: true, facilityRecordId: true, touchpoints: true },
      }),
    ]);

    const facilityIds = [
      ...new Set(
        scopedRows
          .map((row) => row.facilityRecordId)
          .filter((id): id is string => id !== null)
      ),
    ];

    // source is the REFERRAL-type record, target is the LEAD/facility record
    // (BoardRelation.REFERRAL_LINK), mirroring analytics.service.ts's
    // referralRecordWhere/fetchReferralLinkedLeads shape. The date filter
    // belongs on source.createdAt (the referral's own creation date), not the
    // facility's, and organizationId must be checked on source explicitly
    // since BoardRelation.organizationId is nullable and unenforced.
    const referralLinks = facilityIds.length
      ? await prisma.boardRelation.findMany({
          where: {
            relationType: "REFERRAL_LINK",
            target: { id: { in: facilityIds } },
            source: {
              moduleType: "REFERRAL",
              isDeleted: false,
              organizationId,
              ...(startDate &&
                endDate && { createdAt: { gte: startDate, lte: endDate } }),
            },
          },
          select: {
            targetId: true,
            source: {
              select: {
                values: {
                  where: {
                    field: { fieldName: "Status", moduleType: "REFERRAL" },
                  },
                  select: { value: true },
                },
              },
            },
          },
        })
      : [];

    const referrals = referralLinks.length;

    const referralCountByFacilityId = new Map<string, number>();
    const admissionCountByFacilityId = new Map<string, number>();
    let admissions = 0;

    for (const link of referralLinks) {
      referralCountByFacilityId.set(
        link.targetId,
        (referralCountByFacilityId.get(link.targetId) ?? 0) + 1
      );

      // Status is the referral's own field, so an admission is attributed to
      // the facility the outreach was logged against.
      if (!link.source?.values.some((v) => v.value === "Admitted")) continue;

      admissions += 1;
      admissionCountByFacilityId.set(
        link.targetId,
        (admissionCountByFacilityId.get(link.targetId) ?? 0) + 1
      );
    }

    // Group by facilityRecordId, falling back to the plain-text facility name
    // for legacy rows without one — Marketing.facility is not encrypted, so
    // it is safe to group and display directly.
    const facilityGroups = new Map<
      string,
      { facility: string; facilityRecordId: string | null; outreach: number }
    >();
    for (const row of scopedRows) {
      const key = row.facilityRecordId ?? `name:${row.facility}`;
      const existing = facilityGroups.get(key);
      if (existing) {
        existing.outreach += 1;
      } else {
        facilityGroups.set(key, {
          facility: row.facility,
          facilityRecordId: row.facilityRecordId,
          outreach: 1,
        });
      }
    }

    const facilityBreakdown = [...facilityGroups.values()]
      .map((group) => {
        const groupReferrals = group.facilityRecordId
          ? (referralCountByFacilityId.get(group.facilityRecordId) ?? 0)
          : 0;
        const groupAdmissions = group.facilityRecordId
          ? (admissionCountByFacilityId.get(group.facilityRecordId) ?? 0)
          : 0;
        return {
          facility: group.facility,
          facilityRecordId: group.facilityRecordId,
          outreach: group.outreach,
          referrals: groupReferrals,
          admissions: groupAdmissions,
          conversionRate: group.outreach
            ? Math.round((groupReferrals / group.outreach) * 100)
            : 0,
        };
      })
      .sort((a, b) => b.outreach - a.outreach);

    const touchpointCounts = new Map<string, number>();
    for (const row of scopedRows) {
      for (const touchpoint of row.touchpoints) {
        touchpointCounts.set(
          touchpoint,
          (touchpointCounts.get(touchpoint) ?? 0) + 1
        );
      }
    }
    const touchpointBreakdown = [...touchpointCounts.entries()]
      .map(([touchpoint, count]) => ({ touchpoint, count }))
      .sort((a, b) => b.count - a.count);

    return {
      data: data.map(({ member, createdAt, updatedAt, ...row }) => ({
        ...row,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt ? updatedAt.toISOString() : null,
        liaisonName: member.user.name,
      })),
      total,
      totals: {
        outreach: total,
        referrals,
        admissions,
        conversionRate: total ? Math.round((referrals / total) * 100) : 0,
        admissionRate: referrals
          ? Math.round((admissions / referrals) * 100)
          : 0,
      },
      facilityBreakdown,
      touchpointBreakdown,
      nextPage: filter.page * filter.limit < total ? filter.page + 1 : null,
    };
  }

  // memberId is null for org admins, who may act on any member's entry.
  private async assertMarketingInOrg(
    id: string,
    organizationId: string,
    memberId: string | null
  ) {
    const marketing = await prisma.marketing.findFirst({
      where: {
        id,
        member: { organizationId },
        ...(memberId ? { memberId } : {}),
      },
      select: { id: true },
    });
    if (!marketing) throw new NotFoundException("Marketing not found");
  }

  async getMarketingById(id: string, organizationId: string) {
    const marketing = await prisma.marketing.findFirst({
      where: {
        id,
        isDeleted: false,
        member: { organizationId },
      },
    });
    if (!marketing) throw new NotFoundException("Marketing not found");
    return marketing;
  }

  async updateMarketing(
    id: string,
    updateMarketingDto: UpdateMarketingDto,
    organizationId: string,
    memberId: string | null
  ) {
    await this.assertMarketingInOrg(id, organizationId, memberId);

    const existing = await prisma.marketing.findUniqueOrThrow({
      where: { id },
      select: {
        facility: true,
        touchpoints: true,
        talkedTo: true,
        notes: true,
        reasonForVisit: true,
        activity: { select: { id: true } },
      },
    });

    const facility = updateMarketingDto.facility ?? existing.facility;
    const facilityRecord = await this.findFacilityRecord(
      facility,
      organizationId
    );

    const log = {
      touchpoints: updateMarketingDto.touchpoint ?? existing.touchpoints,
      talkedTo: updateMarketingDto.talkedTo ?? existing.talkedTo,
      notes: updateMarketingDto.notes ?? existing.notes,
      reasonForVisit:
        updateMarketingDto.reasonForVisit ?? existing.reasonForVisit,
    };

    await prisma.$transaction(async (tx) => {
      await tx.marketing.update({
        where: { id },
        data: { facility, facilityRecordId: facilityRecord.id, ...log },
      });

      if (!existing.activity) return;

      await tx.activity.update({
        where: { id: existing.activity.id },
        data: { ...toActivityFields(log), recordId: facilityRecord.id },
      });
    });
  }

  async deleteMarketing(
    id: string,
    organizationId: string,
    memberId: string | null
  ) {
    await this.assertMarketingInOrg(id, organizationId, memberId);

    // Activity.marketingId cascades, so the mirrored activity goes with the log.
    await prisma.marketing.delete({
      where: {
        id,
      },
    });
  }

  async createExpense(
    dto: CreateExpenseDto,
    memberId: string,
    organizationId: string
  ) {
    await prisma.$transaction(async (tx) => {
      await tx.expense.create({
        data: {
          amount: dto.amount,
          imageUrl: dto.image,
          description: dto.description,
          notes: dto.notes,
          memberId,
          organizationId,
        },
      });
    });
  }

  async getExpense(
    memberId: string | null,
    filter: any,
    activeOrganizationId: string
  ) {
    const where: Prisma.ExpenseWhereInput = {
      memberId: memberId ?? undefined,
      isDeleted: false,
      member: {
        organizationId: activeOrganizationId,
      },
    };

    if (filter.filter.expenseDateFrom && filter.filter.expenseDateTo) {
      where.createdAt = {
        gte: new Date(filter.filter.expenseDateFrom),
        lte: new Date(filter.filter.expenseDateTo),
      };
    }

    const offset = (filter.page - 1) * filter.limit;

    const [data, total, sums, missingReceipts] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip: offset,
        take: filter.limit,
        orderBy: {
          createdAt: "desc",
        },
        include: { member: { select: { user: { select: { name: true } } } } },
      }),
      prisma.expense.count({
        where,
      }),
      prisma.expense.aggregate({ where, _sum: { amount: true } }),
      prisma.expense.count({ where: { ...where, imageUrl: "" } }),
    ]);

    const totalAmount = sums._sum.amount ?? 0;

    return {
      data: data.map(({ member, ...row }) => ({
        ...row,
        liaisonName: member.user.name,
      })),
      total,
      totals: {
        amount: totalAmount,
        missingReceipts,
        averageAmount: total ? totalAmount / total : 0,
      },
      nextPage: filter.page * filter.limit < total ? filter.page + 1 : null,
    };
  }

  private async fetchImage(url: string): Promise<Buffer> {
    try {
      this.logger.log(`Fetching image from URL: ${url}`);
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 10000,
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      });
      this.logger.log(
        `Successfully fetched image, size: ${response.data.length} bytes`
      );

      const imageBuffer = Buffer.from(response.data);

      // Convert to JPEG format (PDFKit supports JPEG and PNG, but not WebP)
      this.logger.log(`Converting image to JPEG format...`);
      const convertedBuffer = await sharp(imageBuffer)
        .jpeg({ quality: 85 })
        .toBuffer();

      this.logger.log(
        `Successfully converted image, new size: ${convertedBuffer.length} bytes`
      );

      return convertedBuffer;
    } catch (error) {
      this.logger.error(`Failed to fetch image from ${url}: ${error.message}`);
      throw error;
    }
  }

  async getExpenseExport(
    memberId: string | null,
    filter: any,
    activeOrganizationId: string
  ): Promise<Buffer> {
    const { data } = await this.getExpense(
      memberId,
      filter,
      activeOrganizationId
    );

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const buffers: Buffer[] = [];

    // The stream's completion is the promise; the drawing below is ordinary
    // awaited code rather than an async executor, which would swallow a
    // rejection thrown after the first await.
    const rendered = new Promise<Buffer>((resolve, reject) => {
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);
    });

    try {
      const pageWidth = doc.page.width - 80;
      const tableTop = 150;
      const rowHeight = 120;
      const imageSize = 80;

      // Header
      doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .text("Expense Report", { align: "center" });
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(`Generated on ${new Date().toLocaleDateString()}`, {
          align: "center",
        });
      doc.moveDown(2);

      if (!data.length) {
        doc.fontSize(12).text("No expense records found.", { align: "center" });
      } else {
        // Calculate total
        const totalAmount = data.reduce(
          (sum, expense) => sum + Number(expense.amount),
          0
        );

        // Table columns
        const cols = {
          image: { x: 40, width: 100 },
          date: { x: 150, width: 90 },
          amount: { x: 250, width: 80 },
          description: { x: 340, width: 120 },
          notes: { x: 470, width: 100 },
        };

        // Draw table header
        const drawTableHeader = (y: number) => {
          doc.rect(40, y, pageWidth, 30).fillAndStroke("#4A90E2", "#2E5C8A");

          doc
            .fontSize(10)
            .font("Helvetica-Bold")
            .fillColor("#FFFFFF")
            .text("Receipt", cols.image.x + 25, y + 10)
            .text("Date", cols.date.x + 10, y + 10)
            .text("Amount", cols.amount.x + 10, y + 10)
            .text("Description", cols.description.x + 10, y + 10)
            .text("Notes", cols.notes.x + 10, y + 10);

          return y + 30;
        };

        let currentY = drawTableHeader(tableTop);

        // Draw table rows
        for (let i = 0; i < data.length; i++) {
          const expense = data[i];

          // Check if we need a new page
          if (currentY + rowHeight > doc.page.height - 60) {
            doc.addPage();
            currentY = drawTableHeader(60);
          }

          // Draw row background (alternating colors)
          doc
            .rect(40, currentY, pageWidth, rowHeight)
            .fillAndStroke(i % 2 === 0 ? "#F9F9F9" : "#FFFFFF", "#CCCCCC");

          // Draw vertical lines for columns
          doc
            .strokeColor("#CCCCCC")
            .moveTo(cols.date.x, currentY)
            .lineTo(cols.date.x, currentY + rowHeight)
            .moveTo(cols.amount.x, currentY)
            .lineTo(cols.amount.x, currentY + rowHeight)
            .moveTo(cols.description.x, currentY)
            .lineTo(cols.description.x, currentY + rowHeight)
            .moveTo(cols.notes.x, currentY)
            .lineTo(cols.notes.x, currentY + rowHeight)
            .stroke();

          // Add image if available
          if (expense.imageUrl) {
            try {
              const imageBuffer = await this.fetchImage(expense.imageUrl);
              doc.image(imageBuffer, cols.image.x + 50, currentY + 50, {
                fit: [imageSize, imageSize],
                align: "center",
                valign: "center",
              });
            } catch (error) {
              this.logger.error(
                `Failed to load image for expense ${expense.id}: ${error.message}`
              );
              doc
                .fontSize(8)
                .fillColor("#999999")
                .text("Image\nUnavailable", cols.image.x + 10, currentY + 35, {
                  width: imageSize,
                  align: "center",
                });
            }
          } else {
            doc
              .fontSize(8)
              .fillColor("#999999")
              .text("No Image", cols.image.x + 10, cols.image.x + 45, {
                width: imageSize,
                align: "center",
              });
          }

          // Add text content
          doc
            .fontSize(9)
            .font("Helvetica")
            .fillColor("#333333")
            .text(
              expense.createdAt.toLocaleDateString(),
              cols.date.x + 5,
              currentY + 50,
              {
                width: cols.date.width - 10,
                align: "left",
              }
            )
            .text(
              `$${Number(expense.amount).toFixed(2)}`,
              cols.amount.x + 5,
              currentY + 50,
              {
                width: cols.amount.width - 10,
                align: "left",
              }
            )
            .text(
              expense.description || "-",
              cols.description.x + 5,
              currentY + 20,
              {
                width: cols.description.width - 10,
                height: rowHeight - 30,
                align: "left",
              }
            )
            .text(expense.notes || "-", cols.notes.x + 5, currentY + 20, {
              width: cols.notes.width - 10,
              height: rowHeight - 30,
              align: "left",
            });

          currentY += rowHeight;
        }

        // Add total summary
        currentY += 10;
        if (currentY + 40 > doc.page.height - 60) {
          doc.addPage();
          currentY = 60;
        }

        doc
          .rect(40, currentY, pageWidth, 35)
          .fillAndStroke("#E8F4F8", "#4A90E2");

        doc
          .fontSize(12)
          .font("Helvetica-Bold")
          .fillColor("#2E5C8A")
          .text(`Total Expenses: $${totalAmount.toFixed(2)}`, 50, currentY + 10)
          .text(
            `Total Records: ${data.length}`,
            pageWidth - 150,
            currentY + 10,
            { align: "right" }
          );
      }

      // Add footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc
          .fontSize(8)
          .fillColor("#999999")
          .text(`Page ${i + 1} of ${pages.count}`, 40, doc.page.height - 40, {
            align: "center",
          });
      }

      doc.end();
    } catch (error) {
      this.logger.error(`Failed to generate PDF: ${error.message}`);
      throw error instanceof Error ? error : new Error(String(error));
    }

    return rendered;
  }

  // memberId is null for org admins, who may act on any member's entry.
  private async assertExpenseInOrg(
    id: string,
    organizationId: string,
    memberId: string | null
  ) {
    const expense = await prisma.expense.findFirst({
      where: {
        id,
        member: { organizationId },
        ...(memberId ? { memberId } : {}),
      },
      select: { id: true },
    });
    if (!expense) throw new NotFoundException("Expense not found");
  }

  async updateExpense(
    id: string,
    updateExpenseDto: UpdateExpenseDto,
    organizationId: string,
    memberId: string | null
  ) {
    await this.assertExpenseInOrg(id, organizationId, memberId);

    await prisma.expense.update({
      where: {
        id,
      },
      data: updateExpenseDto,
    });
  }

  async deleteExpense(
    id: string,
    organizationId: string,
    memberId: string | null
  ) {
    await this.assertExpenseInOrg(id, organizationId, memberId);

    await prisma.expense.update({
      where: {
        id,
      },
      data: {
        isDeleted: true,
      },
    });
  }
}
