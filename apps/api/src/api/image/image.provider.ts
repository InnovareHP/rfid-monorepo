import { ConfigOptions, v2 } from "cloudinary";
import { appConfig } from "../../config/app-config";
import { CLOUDINARY } from "../../lib/constant";

export const CloudinaryProvider = {
  provide: CLOUDINARY,
  useFactory: (): ConfigOptions => {
    return v2.config({
      cloud_name: appConfig.CLOUDINARY_CLOUD_NAME,
      api_key: appConfig.CLOUDINARY_API_KEY,
      api_secret: appConfig.CLOUDINARY_API_SECRET,
    });
  },
};
