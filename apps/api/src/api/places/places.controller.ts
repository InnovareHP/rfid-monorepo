import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import {
  AutocompleteQueryDto,
  PlaceDetailsQueryDto,
} from "./dto/places.schema";
import { PlacesService } from "./places.service";

@Controller("places")
@UseGuards(AuthGuard)
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get("/autocomplete")
  async autocomplete(@Query() query: AutocompleteQueryDto) {
    try {
      return await this.placesService.autocomplete(
        query.input,
        query.sessionToken
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/details")
  async getPlaceDetails(@Query() query: PlaceDetailsQueryDto) {
    try {
      return await this.placesService.getPlaceDetails(
        query.placeId,
        query.sessionToken
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
