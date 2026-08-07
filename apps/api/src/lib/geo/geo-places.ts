import { GeoPlacesClient } from "@aws-sdk/client-geo-places";
import { appConfig } from "../../config/app-config";

export const geoPlaces = new GeoPlacesClient({
  region: appConfig.AWS_REGION,
  credentials: {
    accessKeyId: appConfig.AWS_ACCESS_KEY_ID,
    secretAccessKey: appConfig.AWS_SECRET_ACCESS_KEY,
  },
});
