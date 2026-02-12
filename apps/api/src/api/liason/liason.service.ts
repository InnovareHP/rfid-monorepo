import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import axios from "axios";
import * as PDFDocument from "pdfkit";
import * as sharp from "sharp";
import { prisma } from "../../lib/prisma/prisma";
import {
  CreateExpenseDto,
  CreateMarketingDto,
  CreateMillageDto,
  UpdateExpenseDto,
  UpdateMarketingDto,
  UpdateMillageDto,
} from "./dto/liason.schema";

@Injectable()
export class LiasonService {
  private readonly logger = new Logger(LiasonService.name);
  async createMillage(createMillageDto: CreateMillageDto, memberId: string) {
    const existingMileageToday = await prisma.mileage.findFirst({
      where: {
        memberId,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    if (existingMileageToday) {
      throw new BadRequestException("You have already created a mileage today");
    }

    await prisma.mileage.create({
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
      },
    });
  }

  async getMillage(memberId: string | null, filter: any) {
    const where: Prisma.mileageWhereInput = {
      memberId: memberId ?? undefined,
    };

    if (filter.mileageDateFrom && filter.mileageDateTo) {
      where.createdAt = {
        gte: new Date(filter.dateFrom),
        lte: new Date(filter.dateTo),
      };
    } else {
      where.createdAt = {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
        lte: new Date(new Date().setHours(23, 59, 59, 999)),
      };
    }

    const offset = (filter.page - 1) * filter.limit;

    const [data, total] = await Promise.all([
      prisma.mileage.findMany({
        where,
        skip: offset,
        take: filter.limit,
      }),
      prisma.mileage.count({
        where,
      }),
    ]);
    return { data, total };
  }

  async getMillageById(id: string) {
    const millage = await prisma.mileage.findUniqueOrThrow({
      where: {
        id,
      },
    });
    return millage;
  }

  async updateMillage(id: string, updateMillageDto: UpdateMillageDto) {
    await prisma.mileage.update({
      where: {
        id,
      },
      data: updateMillageDto,
    });
  }

  async deleteMillage(id: string) {
    await prisma.mileage.delete({
      where: {
        id,
      },
    });
  }

  async createMarketing(
    createMarketingDto: CreateMarketingDto,
    memberId: string,
    userId: string
  ) {
    const findLeadNameViaName = await prisma.board.findFirst({
      where: {
        record_name: createMarketingDto.facility,
        module_type: "LEAD",
      },
    });

    if (!findLeadNameViaName) {
      throw new BadRequestException("Lead not found");
    }

    await prisma.$transaction(async (tx) => {
      tx.marketing.create({
        data: {
          facility: createMarketingDto.facility,
          touchpoints: createMarketingDto.touchpoint,
          talkedTo: createMarketingDto.talkedTo,
          notes: createMarketingDto.notes,
          reasonForVisit: createMarketingDto.reasonForVisit,
          memberId,
        },
      });

      tx.history.create({
        data: {
          record_id: findLeadNameViaName.id,
          column: "marketing",
          new_value:
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
          created_by: userId,
          action: "milestone_created",
        },
      });
    });
  }

  async getMarketing(memberId: string | null, filter: any) {
    const where: Prisma.marketingWhereInput = {
      memberId: memberId ?? undefined,
    };

    if (filter.filter.marketingDateFrom && filter.filter.marketingDateTo) {
      where.createdAt = {
        gte: new Date(filter.filter.marketingDateFrom),
        lte: new Date(filter.filter.marketingDateTo),
      };
    } else {
      where.createdAt = {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
        lte: new Date(new Date().setHours(23, 59, 59, 999)),
      };
    }

    const offset = (filter.page - 1) * filter.limit;

    const [data, total] = await Promise.all([
      prisma.marketing.findMany({
        where,
        skip: offset,
        take: filter.limit,
      }),
      prisma.marketing.count({
        where,
      }),
    ]);
    return { data, total };
  }

  async getMarketingById(id: string) {
    const marketing = await prisma.marketing.findUniqueOrThrow({
      where: {
        id,
      },
    });
    return marketing;
  }

  async updateMarketing(id: string, updateMarketingDto: UpdateMarketingDto) {
    await prisma.marketing.update({
      where: {
        id,
      },
      data: updateMarketingDto,
    });
  }

  async deleteMarketing(id: string) {
    await prisma.marketing.delete({
      where: {
        id,
      },
    });
  }

  async createExpense(dto: CreateExpenseDto, memberId: string) {
    await prisma.expense.create({
      data: {
        amount: dto.amount,
        imageUrl: dto.image,
        description: dto.description,
        notes: dto.notes,
        memberId,
      },
    });
  }

  async getExpense(memberId: string | null, filter: any) {
    const where: Prisma.expenseWhereInput = {
      memberId: memberId ?? undefined,
    };

    if (filter.filter.expenseDateFrom && filter.filter.expenseDateTo) {
      where.createdAt = {
        gte: new Date(filter.filter.expenseDateFrom),
        lte: new Date(filter.filter.expenseDateTo),
      };
    } else if (memberId) {
      where.createdAt = {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
        lte: new Date(new Date().setHours(23, 59, 59, 999)),
      };
    }

    const offset = (filter.page - 1) * filter.limit;

    const [data, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip: offset,
        take: filter.limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.expense.count({
        where,
      }),
    ]);
    return { data, total };
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
    filter: any
  ): Promise<Buffer> {
    const { data } = await this.getExpense(memberId, filter);

    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: "A4", margin: 40 });
        const buffers: Buffer[] = [];

        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
          resolve(Buffer.concat(buffers));
        });
        doc.on("error", reject);

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
          doc
            .fontSize(12)
            .text("No expense records found.", { align: "center" });
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
                  .text(
                    "Image\nUnavailable",
                    cols.image.x + 10,
                    currentY + 35,
                    {
                      width: imageSize,
                      align: "center",
                    }
                  );
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
            .text(
              `Total Expenses: $${totalAmount.toFixed(2)}`,
              50,
              currentY + 10
            )
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
        reject(error);
      }
    });
  }

  async updateExpense(id: string, updateExpenseDto: UpdateExpenseDto) {
    await prisma.expense.update({
      where: {
        id,
      },
      data: updateExpenseDto,
    });
  }

  async deleteExpense(id: string) {
    await prisma.expense.delete({
      where: {
        id,
      },
    });
  }
}
