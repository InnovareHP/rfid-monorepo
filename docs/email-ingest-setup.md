# SES inbound setup for reply logging

There is no `terraform/` directory in this repo, so these resources are created by
hand. Do this once per environment.

## 1. Environment variables

Add to `apps/api/.env`:

```
EMAIL_INGEST_DOMAIN=in.example.com
SES_INBOUND_BUCKET=example-ses-inbound
SES_INBOUND_TOPIC_ARN=arn:aws:sns:us-east-1:000000000000:ses-inbound
EMAIL_OPEN_TRACKING=true
```

`EMAIL_INGEST_DOMAIN` must be a subdomain used only for ingest. Do not point the
organization's real mail domain at SES.

Open tracking works without any of the ingest variables. With
`EMAIL_INGEST_DOMAIN` unset, outbound mail carries no thread token and inbound
ingest is inert.

## 2. Verify the ingest domain in SES

Verify `in.example.com` and add the MX record SES gives you:

```
in.example.com.  MX  10 inbound-smtp.<region>.amazonaws.com.
```

Inbound receiving is only available in the SES regions that support it. Check the
current list before picking a region.

## 3. S3 bucket

Create `example-ses-inbound`, block all public access, enable default encryption
(SSE-KMS preferred), and attach a bucket policy allowing `ses.amazonaws.com` to
`s3:PutObject` with `aws:Referer` set to your account id.

Set a lifecycle rule to expire objects after a short window — the raw MIME holds
PHI and the parsed copy already lives in the database. Seven days is enough to
cover a failed queue drain.

## 4. SNS topic

Create the topic, then subscribe the API endpoint:

```
https://<api-host>/api/email/inbound/sns
```

The controller confirms the subscription automatically on the first
`SubscriptionConfirmation` message, but only after the signature verifies against
an `sns.<region>.amazonaws.com` signing certificate.

Set `SES_INBOUND_TOPIC_ARN` so the endpoint rejects messages from any other topic.

## 5. Receipt rule

In the SES rule set, add one rule for recipient `in.example.com` with two actions
in order:

1. **S3** — bucket `example-ses-inbound`, no prefix needed.
2. **SNS** — the topic above.

The S3 action must come first so the object exists by the time the worker reads
the key out of the notification.

## 6. Verify

Send a message to the address shown on the Integrations page under Reply Logging.
Expected: a `queued: true` response at the endpoint, one `email-ingest` job, and
an INBOUND activity on the matching record. A message from an address that
matches no record is discarded and never written to the database.

## IAM

The API's credentials need `s3:GetObject` on the inbound bucket only. Nothing in
this path writes to S3 or publishes to SNS.
