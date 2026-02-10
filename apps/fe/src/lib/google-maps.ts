import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

let isConfigured = false;

export const loadGooglePlaces = async () => {
  if (!isConfigured) {
    setOptions({
      key: import.meta.env.VITE_GOOGLE_MAPS_KEY!,
      libraries: ["places"],
    });
    isConfigured = true;
  }

  await importLibrary("places");
};
