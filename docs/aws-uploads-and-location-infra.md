# AWS infra for uploads and Amazon Location

What has to exist outside this repo before the Cloudinary/Google/Mapbox removal
can ship. There is no terraform workspace here, so all of it is applied by hand.

## 1. Uploads bucket

One bucket, two prefixes. `image.service.ts` writes
`public/<scope>/<uuid>-<name>` or `private/<scope>/<uuid>-<name>` and puts every
object with `ServerSideEncryption: AES256` (SSE-S3).

- Versioning on, so a bad migration run is recoverable.
- Default encryption SSE-S3 to match what the code sends. KMS is the open HIPAA
  item and would need `kms:GenerateDataKey` added to the app policy.
- No lifecycle rule is required. Add one on `private/` only if you want receipts
  aged out, which interacts with the retention work.

### Reading `public/`

Two options. Pick one.

**A. CloudFront with Origin Access Control (recommended).** Bucket stays fully
private, Block Public Access stays fully on, and `S3_PUBLIC_BASE_URL` points at
the distribution. Nothing in the bucket is ever reachable by direct URL.

**B. Public bucket policy.** Simpler, but requires turning off
`BlockPublicPolicy` and `RestrictPublicBuckets` on the bucket, which weakens the
guard that keeps `private/` from ever being exposed by a later mistake.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadPublicPrefixOnly",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::BUCKET/public/*"
    }
  ]
}
```

Leave `S3_PUBLIC_BASE_URL` unset with option B and the code falls back to
`https://BUCKET.s3.REGION.amazonaws.com`.

### CORS

Not needed. Uploads are server-side `PutObject` from the API, and reads are
either `<img>` tags or a 302 to a presigned URL. Neither is a cross-origin XHR.
Add a CORS rule only if a future feature fetches an object from JS.

## 2. IAM policy for the API credentials

The same `AWS_ACCESS_KEY_ID` already used for SES and Bedrock.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Uploads",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::BUCKET/*"
    },
    {
      "Sid": "Places",
      "Effect": "Allow",
      "Action": [
        "geo-places:Autocomplete",
        "geo-places:GetPlace",
        "geo-places:Geocode"
      ],
      "Resource": "*"
    }
  ]
}
```

`geo-places` actions are not resource scoped. The API sends
`IntendedUse: "Storage"` from `board.service.geocodeLocation` because that
result is persisted on the record, and `"SingleUse"` everywhere else. Storage
results are billed differently, so do not flip them to match.

## 3. Amazon Location API key for map tiles

`county-heat-map.tsx` builds the style URL from `VITE_AWS_REGION` and
`VITE_AWS_LOCATION_API_KEY`. That key ships in the browser bundle, so it must be
scoped:

- Allowed actions: `geo-maps:GetTile`, `geo-maps:GetStyleDescriptor`. Nothing
  else, and specifically no `geo-places:*` — geocoding runs server side through
  `GET /api/places/county-center` precisely so the signing credentials stay on
  the API.
- Restrict to your own referers (the dashboard origin, plus localhost for dev).
- Give it an expiry and a rotation owner.

## 4. Environment

API service: `S3_UPLOADS_BUCKET` (required, the process will not boot without
it), `S3_PUBLIC_BASE_URL` (optional). `AWS_REGION`, `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY` already exist.

FE service: `VITE_AWS_REGION`, `VITE_AWS_LOCATION_API_KEY`.

Remove after the deploy is green: `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `GEOCODIFY_API_KEY`,
`GOOGLE_PLACES_API_KEY`, `VITE_MAPBOX_TOKEN`.

## 5. Data migration

`pnpm --filter api migrate:cloudinary-s3` is a dry run. It prints every URL it
would copy and rewrites nothing. `--apply` copies the objects and rewrites the
rows.

It touches `organization.logo`, `expense.imageUrl`, `landingPage.sections`
(deep walk of the JSON blob), both support attachment tables, and
`manualStep.imageUrl`. Everything is copied as `public` except
`expense.imageUrl`, which goes to `private` and is served through the presigned
redirect.

Run the dry run first, keep the output, then `--apply`. Do not delete the
Cloudinary account until the rewritten rows have been spot checked — the script
copies, it does not verify the new URL resolves.
