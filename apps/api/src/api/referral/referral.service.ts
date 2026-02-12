// import { Injectable, NotFoundException } from "@nestjs/common";
// import { Prisma, ReferralFieldType } from "@prisma/client";
// import { gemini } from "src/lib/gemini/gemini";
// import { v4 as uuidv4 } from "uuid";
// import { prisma } from "../../lib/prisma/prisma";

// @Injectable()
// export class ReferralService {
//   async getAllReferrals(organizationId: string, filters: any) {
//     const {
//       referralDateFrom,
//       referralDateTo,
//       page = 1,
//       limit = 50,
//       filter,
//       search,
//     } = filters;

//     const offset = (page - 1) * Number(limit);

//     const where: Prisma.ReferralFlatViewWhereInput = {
//       organization_id: organizationId,
//     };

//     if (referralDateFrom || referralDateTo) {
//       where.created_at = {};

//       if (referralDateFrom) {
//         where.created_at.gte = new Date(referralDateFrom);
//       }

//       if (referralDateTo) {
//         where.created_at.lte = new Date(referralDateTo);
//       }
//     }

//     const ANDfilters: Prisma.ReferralFlatViewWhereInput[] = [];

//     if (ANDfilters.length > 0) {
//       where.AND = ANDfilters;
//     }

//     if (search) {
//       where.referral_name = {
//         contains: search,
//         mode: "insensitive",
//       };
//     }
//     if (filter && Object.keys(filter).length > 0) {
//       const dynamicFilters = Object.entries(filter)
//         .filter(([key, val]) => key !== "" && val !== undefined)
//         .map(([key, val]) => {
//           return {
//             referral_data: {
//               path: [key], // column name
//               string_contains: String(val),
//             },
//           };
//         });

//       if (!where.AND) where.AND = [];
//       (where.AND as Prisma.ReferralFlatViewWhereInput[]).push(
//         ...dynamicFilters
//       );
//     }

//     const [referrals, count, fields] = await Promise.all([
//       prisma.referralFlatView.findMany({
//         where,
//         skip: offset,
//         take: Number(limit),
//         orderBy: [{ has_notification: "desc" }, { referral_name: "asc" }],
//       }),
//       prisma.referralFlatView.count({ where }),
//       prisma.referralField.findMany({
//         where: { organization_id: organizationId },
//         orderBy: { field_order: "asc" },
//       }),
//     ]);

//     const formatted = referrals.map((r) => ({
//       id: r.referral_id,
//       referral_name: r.referral_name,
//       created_at: r.created_at,
//       has_notification: r.has_notification,
//       ...(r.referral_data as Record<string, string | null>),
//     }));

//     return {
//       pagination: {
//         page: Number(page),
//         limit: Number(limit),
//         count: count,
//       },
//       columns: fields.map((f) => ({
//         id: f.id,
//         name: f.field_name,
//         type: f.field_type,
//       })),
//       data: formatted,
//     };
//   }

//   async getReferralColumns(organizationId: string) {
//     const fields = await prisma.referralField.findMany({
//       where: { organization_id: organizationId },
//       orderBy: { field_order: "asc" },
//     });
//     return fields.map((f) => ({
//       id: f.id,
//       name: f.field_name,
//       type: f.field_type,
//     }));
//   }

//   async getReferralById(referralId: string) {
//     const referrals = await prisma.referralFlatView.findFirstOrThrow({
//       where: { referral_id: referralId },
//     });

//     const formatted = {
//       referral_name: referrals.referral_name,
//       ...(referrals.referral_data as Record<string, string | null>),
//     };

//     const fields = await prisma.referralField.findMany({
//       orderBy: { field_order: "asc" },
//     });

//     return {
//       columns: fields.map((f) => ({
//         id: f.id,
//         name: f.field_name,
//         type: f.field_type,
//       })),
//       data: formatted,
//     };
//   }

//   async getReferralHistory(referralId: string, take: number, offset: number) {
//     const [history, total] = await Promise.all([
//       prisma.referralHistory.findMany({
//         where: { referral_id: referralId },
//         include: {
//           user: {
//             select: {
//               user_name: true,
//             },
//           },
//         },
//         orderBy: { created_at: "desc" },
//         take: take,
//         skip: offset,
//       }),
//       prisma.referralHistory.count({
//         where: { referral_id: referralId },
//       }),
//     ]);

//     const formatted = history.map((h) => {
//       return {
//         id: h.id,
//         created_at: h.created_at,
//         created_by: h.user?.user_name,
//         action: h.action,
//         old_value: h.old_value,
//         new_value: h.new_value,
//         column: h.column,
//       };
//     });

//     return {
//       data: formatted,
//       total: total,
//     };
//   }

//   async getReferralFieldOptions(
//     fieldId: string,
//     offset: number,
//     limit: number
//   ) {
//     let where: Prisma.ReferralFieldOptionFindManyArgs = {
//       where: { referral_field_id: fieldId, is_deleted: false },
//     };

//     if (offset && limit) {
//       where.skip = offset;
//       where.take = limit;
//       where.orderBy = { option_name: "asc" };
//     }

//     const field = await prisma.referralField.findUnique({
//       where: { id: fieldId },
//       select: {
//         field_name: true,
//       },
//     });

//     if (!field) throw new NotFoundException("Field not found");

//     if (field.field_name === "County") {
//       const counties = await prisma.referralCounty.findMany({
//         select: {
//           id: true,
//           county_name: true,
//           referralCountyAssignedTo: {
//             select: {
//               assigned_to: true,
//             },
//           },
//         },
//       });

//       return counties.map((c) => ({
//         id: c.id,
//         value: c.county_name,
//         assigned_to: c.referralCountyAssignedTo.map((a) => a.assigned_to),
//       }));
//     }

//     const options = await prisma.referralFieldOption.findMany(where);

//     if (!offset && !limit) {
//       return options.map((o) => ({
//         id: o.id,
//         value: o.option_name,
//       }));
//     }

//     const total = await prisma.referralFieldOption.count({
//       where: where.where,
//     });

//     return {
//       field: field?.field_name,
//       data: options.map((o) => ({
//         id: o.id,
//         value: o.option_name,
//       })),
//       total: total,
//     };
//   }

//   async getCountyConfiguration(organizationId: string) {
//     const counties = await prisma.referralCounty.findMany({
//       where: { organization_id: organizationId },
//       select: {
//         id: true,
//         county_name: true,
//         referralCountyAssignedTo: {
//           select: {
//             assigned_to: true,
//           },
//         },
//       },
//     });

//     return counties.map((c) => ({
//       id: c.id,
//       name: c.county_name,
//       assigned_to: c.referralCountyAssignedTo.map((a) => a.assigned_to),
//     }));
//   }

//   async updateReferralValue(
//     referralId: string,
//     fieldId: string,
//     value: string,
//     organizationId: string,
//     reason?: string,
//     userId?: string
//   ) {
//     const field = await prisma.referralField.findUnique({
//       where: { id: fieldId, organization_id: organizationId },
//       select: {
//         field_type: true,
//         id: true,
//         field_name: true,
//         ReferralValue: {
//           select: {
//             value: true,
//           },
//         },
//       },
//     });

//     if (!field) throw new NotFoundException("Field not found");

//     // if (field.field_type === ReferralFieldType.LOCATION) {
//     //   return await this.createLocation(value, referralId);
//     // }

//     await prisma.$transaction(async (tx) => {
//       await this.createReferralHistory(
//         referralId,
//         field.ReferralValue[0].value ?? undefined,
//         value,
//         userId,
//         "update",
//         field.field_name
//       );

//       if (field.field_type === ReferralFieldType.MULTISELECT) {
//         // Normalize value into an array of clean strings
//         const normalizedValue = Array.isArray(value)
//           ? value
//           : typeof value === "string"
//             ? value

//                 .split(",")
//                 .map((v) => v.trim())
//                 .filter(Boolean)
//             : [];

//         return await tx.referralValue.upsert({
//           where: {
//             referral_id_field_id: {
//               referral_id: referralId,
//               field_id: field.id,
//             },
//           },
//           update: {
//             value: JSON.stringify(normalizedValue),
//           },
//           create: {
//             referral_id: referralId,
//             field_id: field.id,
//             value: JSON.stringify(normalizedValue),
//           },
//         });
//       }

//       if (field.field_name === "County") {
//         const [assignedTo, facilityField] = await Promise.all([
//           tx.referralCounty.findFirstOrThrow({
//             where: {
//               county_name: value,
//               organization_id: organizationId,
//             },
//             include: {
//               referralCountyAssignedTo: {
//                 select: {
//                   assigned_to: true,
//                 },
//                 take: 1,
//               },
//             },
//           }),
//           tx.referralField.findFirstOrThrow({
//             where: {
//               field_name: "Facility",
//               organization_id: organizationId,
//             },
//             select: {
//               id: true,
//             },
//           }),
//         ]);

//         // Save County value
//         await tx.referralValue.upsert({
//           where: {
//             referral_id_field_id: {
//               referral_id: referralId,
//               field_id: field.id,
//             },
//           },
//           update: { value },
//           create: {
//             referral_id: referralId,
//             field_id: field.id,
//             value,
//           },
//         });

//         // Save Facility value
//         await tx.referralValue.upsert({
//           where: {
//             referral_id_field_id: {
//               referral_id: referralId,
//               field_id: facilityField.id,
//             },
//           },
//           update: {
//             value: assignedTo.referralCountyAssignedTo[0].assigned_to,
//           },
//           create: {
//             referral_id: referralId,
//             field_id: facilityField.id,
//             value: assignedTo.referralCountyAssignedTo[0].assigned_to,
//           },
//         });

//         return {
//           message: "County assigned successfully",
//         };
//       }

//       if (field.field_name === "Status") {
//         // Find the related "Reason" and "Action Date" fields
//         const statusFields = await prisma.referralField.findMany({
//           where: {
//             field_name: {
//               in: ["Reason", "Action Date (Accepted / Rejected)"],
//             },
//             organization_id: organizationId,
//           },
//           select: { id: true, field_name: true },
//         });

//         const reasonField = statusFields.find((f) => f.field_name === "Reason");
//         const actionDateField = statusFields.find(
//           (f) => f.field_name === "Action Date (Accepted / Rejected)"
//         );

//         await prisma.$transaction(async (tx) => {
//           // 1️⃣ Update Status
//           await tx.referralValue.upsert({
//             where: {
//               referral_id_field_id: {
//                 referral_id: referralId,
//                 field_id: field.id,
//               },
//             },
//             update: { value },
//             create: {
//               referral_id: referralId,
//               field_id: field.id,
//               value,
//             },
//           });

//           // 2️⃣ Update Reason (if provided by frontend)
//           if (reason && reasonField) {
//             await tx.referralValue.upsert({
//               where: {
//                 referral_id_field_id: {
//                   referral_id: referralId,
//                   field_id: reasonField.id,
//                 },
//               },
//               update: { value: reason },
//               create: {
//                 referral_id: referralId,
//                 field_id: reasonField.id,
//                 value: reason,
//               },
//             });
//           }

//           // 3️⃣ Update Action Date (set to current timestamp)
//           if (actionDateField) {
//             const now = new Date().toISOString();

//             await tx.referralValue.upsert({
//               where: {
//                 referral_id_field_id: {
//                   referral_id: referralId,
//                   field_id: actionDateField.id,
//                 },
//               },
//               update: { value: now },
//               create: {
//                 referral_id: referralId,
//                 field_id: actionDateField.id,
//                 value: now,
//               },
//             });
//           }
//         });

//         return {
//           message: "Status updated successfully",
//         };
//       }

//       return await tx.referralValue.upsert({
//         where: {
//           referral_id_field_id: { referral_id: referralId, field_id: field.id },
//         },
//         update: { value },
//         create: { referral_id: referralId, field_id: field.id, value },
//       });
//     });
//   }

//   async createReferral(
//     data: { referral_name: string; [key: string]: any }[],
//     organizationId: string,
//     memberId: string
//   ) {
//     return await prisma.$transaction(async (tx) => {
//       const fields = await tx.referralField.findMany({
//         where: { organization_id: organizationId },
//         orderBy: { field_order: "asc" },
//       });

//       const createdReferrals: any = [];
//       const allReferralValues: any[] = [];
//       const allHistoryEntries: any[] = [];
//       const allNotificationStates: any[] = [];

//       for (const referralData of data) {
//         const referral = await tx.referral.create({
//           data: {
//             referral_name: referralData.referral_name ?? "",
//             organization_id: organizationId,
//           },
//         });

//         createdReferrals.push(referral);

//         for (const field of fields) {
//           const customValue =
//             data[field.field_name] ?? data[field.field_name.toLowerCase()];
//           let value: string | null = null;

//           if (customValue !== undefined && customValue !== null) {
//             // Handle MULTISELECT type
//             if (field.field_type === ReferralFieldType.MULTISELECT) {
//               const normalizedValue = Array.isArray(customValue)
//                 ? customValue
//                 : typeof customValue === "string"
//                   ? customValue
//                       .split(",")
//                       .map((v) => v.trim())
//                       .filter(Boolean)
//                   : [];
//               value = JSON.stringify(normalizedValue);
//             } else {
//               value = String(customValue);
//             }
//           }

//           allReferralValues.push({
//             id: uuidv4(),
//             referral_id: referral.id,
//             field_id: field.id,
//             value: value,
//           });
//         }

//         // Prepare history entry
//         allHistoryEntries.push({
//           id: uuidv4(),
//           created_at: new Date(),
//           referral_id: referral.id,
//           old_value: null,
//           new_value: referralData.referral_name,
//           action: "create",
//           created_by: memberId,
//           column: "Referral Name",
//         });

//         allNotificationStates.push({
//           id: uuidv4(),
//           updated_at: new Date(),
//           referral_id: referral.id,
//           last_seen: new Date(),
//         });
//       }

//       // Bulk insert all referral values
//       if (allReferralValues.length > 0) {
//         await tx.referralValue.createMany({
//           data: allReferralValues,
//         });
//       }

//       // Bulk insert all history entries
//       if (allHistoryEntries.length > 0) {
//         await tx.referralHistory.createMany({
//           data: allHistoryEntries,
//         });
//       }

//       // Bulk insert all notification states
//       if (allNotificationStates.length > 0) {
//         await tx.referralNotificationState.createMany({
//           data: allNotificationStates,
//         });
//       }

//       return {
//         message: `${createdReferrals.length} referral(s) created successfully`,
//         count: createdReferrals.length,
//         referrals: createdReferrals,
//       };
//     });
//   }

//   async createColumn(
//     column_name: string,
//     referral_type: ReferralFieldType,
//     organizationId: string
//   ) {
//     const lastColumn = await prisma.referralField.findFirst({
//       where: { organization_id: organizationId },
//       orderBy: { field_order: "desc" },
//     });

//     const newOrder = lastColumn ? lastColumn.field_order + 1 : 1;

//     return await prisma.referralField.create({
//       data: {
//         field_name: column_name,
//         field_type: referral_type,
//         field_order: newOrder,
//         organization_id: organizationId,
//       },
//     });
//   }

//   async createLocation(location_name: string, referral_id: string) {
//     const prompt = `
//           Extract the following details from the text below:
//           - City
//           - State
//           - Zip
//           - County
//           - Country

//           Return the result as a JSON object in this format:
//           {
//             "city": "<city name or null>",
//             "state": "<state name or null>",
//             "zip": "<zip code or null>",
//             "county": "<county name or null>",
//             "country": "<country name or null>"
//           }

//           Text: "${location_name}"
//         `;

//     const response = await gemini.models.generateContent({
//       model: "gemini-2.5-flash",
//       contents: [prompt],
//       config: {
//         responseMimeType: "application/json",
//       },
//     });

//     const locationData = JSON.parse(response.text ?? "");

//     locationData.address = location_name;

//     const fields = await prisma.leadField.findMany({
//       where: {
//         field_name: {
//           in: ["Address", "City", "State", "Zip", "County", "Country"],
//         },
//       },
//     });

//     for (const field of fields) {
//       const key = field.field_name.toLowerCase();
//       const value = locationData[key];

//       if (!value) continue;

//       await prisma.referralValue.upsert({
//         where: {
//           referral_id_field_id: { referral_id, field_id: field.id },
//         },
//         update: { value },
//         create: {
//           referral_id,
//           field_id: field.id,
//           value,
//         },
//       });
//     }

//     return locationData;
//   }

//   async createReferralFieldOption(fieldId: string, option_name: string) {
//     return await prisma.referralFieldOption.create({
//       data: {
//         option_name: option_name,
//         referral_field_id: fieldId,
//       },
//     });
//   }

//   async createReferralHistory(
//     referralId: string,
//     oldValue?: string,
//     newValue?: string,
//     created_by?: string,
//     action?: string,
//     column?: string
//   ) {
//     return await prisma.$transaction(async (tx) => {
//       await tx.referralHistory.create({
//         data: {
//           referral_id: referralId,
//           old_value: oldValue,
//           new_value: newValue,
//           action: action ?? "create",
//           created_by: created_by,
//           column: column,
//         },
//       });
//       await tx.referralNotificationState.upsert({
//         where: {
//           referral_id: referralId,
//         },
//         update: {
//           last_seen: new Date(),
//         },
//         create: {
//           referral_id: referralId,
//           last_seen: new Date(),
//         },
//       });
//     });
//   }

//   async createCountyAssignment(
//     name: string,
//     organizationId: string,
//     assigned_to: string
//   ) {
//     await prisma.referralCounty.create({
//       data: {
//         county_name: name,
//         organization_id: organizationId,
//         referralCountyAssignedTo: {
//           create: {
//             assigned_to: assigned_to,
//           },
//         },
//       },
//     });

//     return {
//       message: "County assignment created successfully",
//     };
//   }

//   async updateReferralHistory(referralId: string) {
//     return await prisma.referralHistory.updateMany({
//       where: { id: referralId },
//       data: { created_at: new Date() },
//     });
//   }

//   async deleteReferralHistory(timelineId: string) {
//     const timeline = await prisma.referralHistory.findUnique({
//       where: { id: timelineId },
//     });
//     if (!timeline) throw new NotFoundException("Timeline not found");

//     return await prisma.referralHistory.delete({ where: { id: timelineId } });
//   }

//   async deleteReferral(referralIds: string[]) {
//     await prisma.$transaction(async (tx) => {
//       await tx.referral.updateMany({
//         where: { id: { in: referralIds } },
//         data: { is_deleted: true },
//       });
//       // await tx.referralValue.deleteMany({
//       //   where: { referral_id: { in: referralIds } },
//       // });

//       // await tx.referral.deleteMany({
//       //   where: { id: { in: referralIds } },
//       // });
//     });
//     return {
//       message: "Referral(s) deleted successfully",
//     };
//   }

//   async setReferralNotificationState(referralId: string) {
//     await prisma.referralNotificationState.deleteMany({
//       where: { referral_id: referralId },
//     });
//     return { message: "Notification marked as seen" };
//   }

//   async deleteCountyAssignment(countyId: string) {
//     const county = await prisma.referralCounty.findUnique({
//       where: { id: countyId },
//       include: {
//         referralCountyAssignedTo: true,
//       },
//     });

//     if (!county) throw new NotFoundException("County not found");

//     await prisma.$transaction(async (tx) => {
//       await tx.referralCountyAssignedTo.deleteMany({
//         where: { referral_county_id: countyId },
//       });
//       await tx.referralCounty.delete({ where: { id: countyId } });
//     });
//     return {
//       message: "County assignment deleted successfully",
//     };
//   }

//   async deleteReferralFieldOption(optionId: string) {
//     return await prisma.referralFieldOption.update({
//       where: { id: optionId },
//       data: { is_deleted: true },
//     });
//   }
// }
