import {
  Address,
  AutocompleteCommand,
  GeocodeCommand,
  GetPlaceCommand,
} from "@aws-sdk/client-geo-places";
import { Injectable, NotFoundException } from "@nestjs/common";
import { geoPlaces } from "../../lib/geo/geo-places";

type PlacePrediction = {
  description: string;
  place_id: string;
};

type PlaceComponents = {
  city: string;
  state: string;
  zipCode: string;
  county: string;
};

type PlaceDetail = {
  formatted_address: string;
  place_id: string;
  components: PlaceComponents;
};

// Amazon Location returns county names bare, but callers store them without the suffix.
const stripCountySuffix = (value: string) =>
  value.replace(/ county$/i, "").trim();

export const toComponents = (
  address: Address | undefined
): PlaceComponents => ({
  city: address?.Locality ?? "",
  state: address?.Region?.Code ?? address?.Region?.Name ?? "",
  zipCode: address?.PostalCode?.split("-")[0] ?? "",
  county: stripCountySuffix(address?.SubRegion?.Name ?? ""),
});

@Injectable()
export class PlacesService {
  async autocomplete(input: string): Promise<PlacePrediction[]> {
    if (input.length < 2) return [];

    const response = await geoPlaces.send(
      new AutocompleteCommand({
        QueryText: input,
        MaxResults: 5,
        IntendedUse: "SingleUse",
        Filter: {
          IncludeCountries: ["USA"],
          IncludePlaceTypes: ["Locality", "PostalCode", "Street", "Region"],
        },
      })
    );

    return (response.ResultItems ?? [])
      .filter((item) => item.PlaceId)
      .map((item) => ({
        description: item.Address?.Label ?? item.Title ?? "",
        place_id: item.PlaceId as string,
      }));
  }

  async getPlaceDetails(placeId: string): Promise<PlaceDetail> {
    const response = await geoPlaces.send(
      new GetPlaceCommand({
        PlaceId: placeId,
        AdditionalFeatures: ["TimeZone"],
      })
    );

    return {
      formatted_address: response.Address?.Label ?? response.Title ?? "",
      place_id: placeId,
      components: toComponents(response.Address),
    };
  }

  // The heat map needs a centre point per county name, not a full address.
  async getCountyCenter(county: string): Promise<{ lng: number; lat: number }> {
    const response = await geoPlaces.send(
      new GeocodeCommand({
        QueryText: `${county} County`,
        MaxResults: 1,
        IntendedUse: "SingleUse",
        Filter: { IncludeCountries: ["USA"] },
      })
    );

    const position = response.ResultItems?.[0]?.Position;

    if (!position) {
      throw new NotFoundException(`No coordinates found for ${county}`);
    }

    return { lng: position[0], lat: position[1] };
  }
}
