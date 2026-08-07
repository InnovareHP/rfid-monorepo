import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { EntitlementGuard } from "../../guard/entitlement/entitlement.guard";
import { SubscriptionGuard } from "../../guard/subscription/subscription.guard";
import {
  AutocompleteQueryDto,
  CountyCenterQueryDto,
  PlaceDetailsQueryDto,
} from "./dto/places.schema";
import { PlacesService } from "./places.service";

@Controller("places")
@UseGuards(AuthGuard, SubscriptionGuard, EntitlementGuard)
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get("/autocomplete")
  async autocomplete(@Query() query: AutocompleteQueryDto) {
    try {
      return await this.placesService.autocomplete(query.input);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/details")
  async getPlaceDetails(@Query() query: PlaceDetailsQueryDto) {
    try {
      return await this.placesService.getPlaceDetails(query.placeId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/county-center")
  async getCountyCenter(@Query() query: CountyCenterQueryDto) {
    return await this.placesService.getCountyCenter(query.county);
  }
}
