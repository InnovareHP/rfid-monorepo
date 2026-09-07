import { STREET_NAMES, STREET_TYPES } from "./catalog/address";
import { CITIES } from "./catalog/facilities";
import { between, pick } from "./random";

// A LOCATION field normally gets its value from the geocoder, which also fills
// City, State and Zip from the result. The seeder writes those columns itself,
// so the street line is built from the same city and zip and the row stays
// internally consistent rather than pointing at a different town.
export const addressLine = (city: string, zip: string) =>
  `${between(100, 9899)} ${pick(STREET_NAMES)} ${pick(STREET_TYPES)}, ${city}, IL ${zip}`;

// Contacts and companies carry no City or Zip column, so theirs stands alone.
export const anyAddress = () =>
  addressLine(pick(CITIES), String(between(60000, 62999)));
