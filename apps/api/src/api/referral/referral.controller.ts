// import {
//   BadRequestException,
//   Body,
//   Controller,
//   Delete,
//   Get,
//   Param,
//   Patch,
//   Post,
//   Query,
//   UseGuards,
// } from "@nestjs/common";
// import { ReferralFieldType } from "@prisma/client";
// import { AuthGuard, Session, UserSession } from "@thallesp/nestjs-better-auth";
// import { StripeGuard } from "src/guard/stripe/stripe.guard";
// import { ReferralService } from "./referral.service";

// @Controller("referral")
// @UseGuards(AuthGuard)
// @UseGuards(StripeGuard)
// export class ReferralController {
//   constructor(private readonly referralService: ReferralService) {}

//   @Get()
//   async getAllReferrals(
//     @Session()
//     session: UserSession & { session: { activeOrganizationId: string } },
//     @Query("filter") filtersQuery: any,
//     @Query("referralDateFrom") referralDateFrom?: string,
//     @Query("referralDateTo") referralDateTo?: string,
//     @Query("search") search?: string,
//     @Query("page") page = 1,
//     @Query("limit") limit = 50
//   ) {
//     try {
//       const organizationId = session.session.activeOrganizationId;
//       const filter = filtersQuery ? JSON.parse(filtersQuery) : {};
//       const filters = {
//         filter: filter,
//         referralDateFrom,
//         referralDateTo,
//         page: Number(page),
//         limit: Number(limit),
//         search,
//       };

//       return this.referralService.getAllReferrals(organizationId, filters);
//     } catch (error) {
//       throw new BadRequestException(error.message);
//     }
//   }

//   @Get("/columns")
//   async getReferralColumns(
//     @Session()
//     session: UserSession & { session: { activeOrganizationId: string } }
//   ) {
//     const organizationId = session.session.activeOrganizationId;
//     return await this.referralService.getReferralColumns(organizationId);
//   }

//   @Get("/timeline/:referralId")
//   async getReferralHistory(
//     @Param("referralId") referralId: string,
//     @Query("take") take: number = 15,
//     @Query("skip") skip: number = 1
//   ) {
//     try {
//       const offset = (skip - 1) * take;
//       return await this.referralService.getReferralHistory(
//         referralId,
//         Number(take),
//         Number(offset)
//       );
//     } catch (error) {
//       throw new BadRequestException(error.message);
//     }
//   }

//   @Get("/:referralId")
//   async getReferralById(@Param("referralId") referralId: string) {
//     try {
//       return await this.referralService.getReferralById(referralId);
//     } catch (error) {
//       throw new BadRequestException(error.message);
//     }
//   }

//   @Get("/county/configuration")
//   async getCountyConfiguration(
//     @Session()
//     session: UserSession & { session: { activeOrganizationId: string } }
//   ) {
//     const organizationId = session.session.activeOrganizationId;
//     try {
//       return await this.referralService.getCountyConfiguration(organizationId);
//     } catch (error) {
//       throw new BadRequestException(error.message);
//     }
//   }

//   @Get("/field/:fieldId/options")
//   async getReferralFieldOptions(
//     @Param("fieldId") fieldId: string,
//     @Query("page") page = 1,
//     @Query("limit") limit = 50
//   ) {
//     try {
//       const offset = (page - 1) * limit;
//       return await this.referralService.getReferralFieldOptions(
//         fieldId,
//         Number(offset),
//         Number(limit)
//       );
//     } catch (error) {
//       throw new BadRequestException(error.message);
//     }
//   }

//   @Post()
//   async createReferral(
//     @Body() body: { data: { referral_name: string; [key: string]: any }[] },
//     @Session()
//     session: UserSession & {
//       session: { activeOrganizationId: string };
//     }
//   ) {
//     const organizationId = session.session.activeOrganizationId;
//     const userId = session.session.userId;

//     try {
//       return this.referralService.createReferral(
//         body.data,
//         organizationId,
//         userId
//       );
//     } catch (error) {
//       throw new BadRequestException(error.message);
//     }
//   }

//   @Post("/notification-state")
//   async setReferralNotificationState(@Body() body: { referral_id: string }) {
//     const { referral_id } = body;

//     try {
//       return this.referralService.setReferralNotificationState(referral_id);
//     } catch (error) {
//       throw new BadRequestException(error.message);
//     }
//   }

//   @Post("/column")
//   async createColumn(
//     @Session()
//     session: UserSession & { session: { activeOrganizationId: string } },
//     @Body() body: { column_name: string; referral_type: ReferralFieldType }
//   ) {
//     const { column_name, referral_type } = body;
//     const organizationId = session.session.activeOrganizationId;
//     try {
//       return await this.referralService.createColumn(
//         column_name,
//         referral_type,
//         organizationId
//       );
//     } catch (error) {
//       throw new BadRequestException(error.message);
//     }
//   }

//   @Post("/location")
//   async createLocation(
//     @Body() body: { location_name: string; referral_id: string }
//   ) {
//     try {
//       const { location_name, referral_id } = body;
//       return this.referralService.createLocation(location_name, referral_id);
//     } catch (error) {
//       throw new BadRequestException(error.message);
//     }
//   }

//   @Post("/field/:fieldId/options")
//   async createReferralFieldOption(
//     @Param("fieldId") fieldId: string,
//     @Body() body: { option_name: string }
//   ) {
//     const { option_name } = body;
//     try {
//       return await this.referralService.createReferralFieldOption(
//         fieldId,
//         option_name
//       );
//     } catch (error) {
//       throw new BadRequestException(error.message);
//     }
//   }

//   @Post("/county/assignment")
//   async createCountyAssignment(
//     @Body() body: { name: string; assigned_to: string },
//     @Session()
//     session: UserSession & { session: { activeOrganizationId: string } }
//   ) {
//     const { name, assigned_to } = body;
//     const organizationId = session.session.activeOrganizationId;
//     try {
//       return await this.referralService.createCountyAssignment(
//         name,
//         organizationId,
//         assigned_to
//       );
//     } catch (error) {
//       throw new BadRequestException(error.message);
//     }
//   }

//   @Post("/timeline/:referralId")
//   async createReferralHistory(
//     @Param("referralId") referralId: string,

//     @Body() body: { old_value: string; new_value: string; created_by: string }
//   ) {
//     const { old_value, new_value, created_by } = body;
//     try {
//       return await this.referralService.createReferralHistory(
//         referralId,
//         old_value,
//         new_value,
//         created_by
//       );
//     } catch (error) {
//       throw new BadRequestException(error.message);
//     }
//   }

//   @Patch("/timeline/:referralId")
//   async updateReferralHistory(@Param("referralId") referralId: string) {
//     try {
//       return await this.referralService.updateReferralHistory(referralId);
//     } catch (error) {
//       throw new BadRequestException(error.message);
//     }
//   }

//   @Patch(":referralId")
//   async updateReferralValue(
//     @Param("referralId") referralId: string,
//     @Body() body: { value: string; fieldId: string; reason?: string },
//     @Session()
//     session: UserSession & {
//       session: { activeOrganizationId: string; userId: string };
//     }
//   ) {
//     const { value, fieldId, reason } = body;
//     const organizationId = session.session.activeOrganizationId;
//     const userId = session.session.userId;
//     try {
//       return await this.referralService.updateReferralValue(
//         referralId,
//         fieldId,
//         value,
//         organizationId,
//         reason,
//         userId
//       );
//     } catch (error) {
//       throw new BadRequestException(error.message);
//     }
//   }

//   @Delete("")
//   async deleteReferral(@Body() body: { column_ids: string[] }) {
//     try {
//       const { column_ids } = body;
//       return await this.referralService.deleteReferral(column_ids);
//     } catch (error) {
//       throw new BadRequestException(error.message);
//     }
//   }

//   @Delete("/timeline/:referralId")
//   async deleteReferralHistory(@Param("referralId") referralId: string) {
//     try {
//       return await this.referralService.deleteReferralHistory(referralId);
//     } catch (error) {
//       throw new BadRequestException(error.message);
//     }
//   }

//   @Delete("/county/assignment/:countyId")
//   async deleteCountyAssignment(@Param("countyId") countyId: string) {
//     try {
//       return await this.referralService.deleteCountyAssignment(countyId);
//     } catch (error) {
//       throw new BadRequestException(error.message);
//     }
//   }

//   @Delete("/field/options/:optionId")
//   async deleteReferralFieldOption(@Param("optionId") optionId: string) {
//     try {
//       return await this.referralService.deleteReferralFieldOption(optionId);
//     } catch (error) {
//       throw new BadRequestException(error.message);
//     }
//   }
// }
