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

// Every label ends in the country, which is noise when the filter is USA-only.
const stripCountry = (label: string) =>
  label.replace(/,\s*United States$/i, "").trim();

export const toComponents = (
  address: Address | undefined
): PlaceComponents => ({
  city: address?.Locality ?? "",
  state: address?.Region?.Code ?? address?.Region?.Name ?? "",
  zipCode: address?.PostalCode?.split("-")[0] ?? "",
  county: stripCountySuffix(address?.SubRegion?.Name ?? ""),
});

// Autocomplete only completes partial text, so a typed house number is dropped
// and every match comes back street-level; Geocode resolves the full address.
const hasHouseNumber = (input: string) => /^\s*\d/.test(input);

type PlaceResultItem = {
  PlaceId?: string;
  Title?: string;
  Address?: Address;
};

const toPredictions = (items: PlaceResultItem[] = []): PlacePrediction[] =>
  items
    .filter((item) => item.PlaceId)
    .map((item) => ({
      description: stripCountry(item.Address?.Label ?? item.Title ?? ""),
      place_id: item.PlaceId as string,
    }));

@Injectable()
export class PlacesService {
  async autocomplete(input: string): Promise<PlacePrediction[]> {
    if (input.length < 2) return [];
    if (hasHouseNumber(input)) return this.geocodeAddress(input);

    const response = await geoPlaces.send(
      new AutocompleteCommand({
        QueryText: input,
        MaxResults: 10,
        IntendedUse: "SingleUse",
        Filter: {
          IncludeCountries: ["USA"],
          // Address types keep partial house-number input matching real places.
          IncludePlaceTypes: [
            "PointAddress",
            "InterpolatedAddress",
            "Street",
            "Locality",
            "PostalCode",
            "Region",
          ],
        },
      })
    );

    return toPredictions(response.ResultItems);
  }

  private async geocodeAddress(input: string): Promise<PlacePrediction[]> {
    const response = await geoPlaces.send(
      new GeocodeCommand({
        QueryText: input,
        MaxResults: 10,
        IntendedUse: "SingleUse",
        Filter: { IncludeCountries: ["USA"] },
      })
    );

    return toPredictions(response.ResultItems);
  }

  async getPlaceDetails(placeId: string): Promise<PlaceDetail> {
    const response = await geoPlaces.send(
      new GetPlaceCommand({
        PlaceId: placeId,
        AdditionalFeatures: ["TimeZone"],
      })
    );

    return {
      formatted_address: stripCountry(
        response.Address?.Label ?? response.Title ?? ""
      ),
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
