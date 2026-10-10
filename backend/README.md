# Photography booking email delivery

The front end collects an enquiry, lets the visitor review it and submits JSON to a private email-delivery backend. It does not open their email app. A success screen appears only after the email service accepts the request; no slot is automatically reserved. Email acceptance is not a guarantee of inbox delivery.

## One-time connection

The existing site uses GitHub Pages, which cannot execute this Worker. Deploy this folder separately on Cloudflare Workers. Resend is the included email adapter; you can replace the provider without changing the form contract.

1. Verify a sending domain with Resend and create a send-only API key. Store it as the Worker secret `RESEND_API_KEY` using `npx wrangler secret put RESEND_API_KEY`. Never put a key in the site, ZIP, browser JavaScript or Git history.
2. Set `BOOKING_FROM` to your verified sender using `npx wrangler secret put BOOKING_FROM`. Keep `BOOKING_TO` as `hello@aketch.ie` or change it to your intended private recipient. The visitor's email is the Reply-To, never the sender or recipient.
3. From this directory deploy with `npx wrangler deploy`. Confirm that the rate-limit binding in `wrangler.toml` is created in your account; use an unused namespace identifier if 1001 is already in use.
4. Set `data-endpoint` on `#booking-form` in `photography.html` to the deployed Worker URL plus `/api/booking`. Alternatively route `aketch.ie/api/booking*` to the Worker if the domain is on Cloudflare; then the existing `/api/booking` value can stay.
5. Make a real test enquiry after deployment and confirm receipt and reply handling. Add any separately hosted preview origin explicitly to `ALLOWED_ORIGINS` only when needed.

Until this is connected, sending displays an honest failure with an email link and retains the visitor's details. Do not advertise online booking as live before completing step 5. No real email was sent during development tests.

## Behaviour and safeguards

- Allowed-origin checks, JSON-only requests, server-side field/date/size validation, a honeypot, and five requests per IP per minute at each Cloudflare location.
- Origin checks are not bot authentication. For substantial public traffic, add a verified anti-bot challenge or a stricter shared rate limiter.
- Required configuration fails closed. Provider errors do not produce success confirmations.
- Idempotency keys prevent duplicate provider sends for an unchanged request retried by the visitor. Editing creates a new request identifier.
- No database or browser storage holds enquiry details. The email provider and receiving mailbox process them; their retention/settings still apply. Keep the privacy copy aligned with the service you deploy.
- Secrets and provider error bodies are never returned to the browser. The backend uses plain text email so user-supplied HTML is not rendered.

References: https://resend.com/docs/api-reference/emails/send-email and https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
