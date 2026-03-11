import { Injectable } from "@nestjs/common";
import { appConfig } from "../../config/app-config";

type PlacePrediction = {
  description: string;
  place_id: string;
};

type PlaceDetail = {
  formatted_address: string;
  place_id: string;
};

@Injectable()
export class PlacesService {
  private readonly apiKey = appConfig.GOOGLE_PLACES_API_KEY;

  async autocomplete(
    input: string,
    sessionToken?: string
  ): Promise<PlacePrediction[]> {
    if (!input || input.length < 2) return [];

    const params = new URLSearchParams({
      input,
      types: "geocode",
      components: "country:us",
      key: this.apiKey,
    });

    if (sessionToken) {
      params.set("sessiontoken", sessionToken);
    }

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`
    );

    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(`Places API error: ${data.status}`);
    }

    return (data.predictions ?? []).map((p: any) => ({
      description: p.description,
      place_id: p.place_id,
    }));
  }

  async getPlaceDetails(
    placeId: string,
    sessionToken?: string
  ): Promise<PlaceDetail> {
    const params = new URLSearchParams({
      place_id: placeId,
      fields: "formatted_address",
      key: this.apiKey,
    });

    if (sessionToken) {
      params.set("sessiontoken", sessionToken);
    }

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params}`
    );

    const data = await res.json();

    if (data.status !== "OK") {
      throw new Error(`Place Details API error: ${data.status}`);
    }

    return {
      formatted_address: data.result.formatted_address,
      place_id: placeId,
    };
  }
}
