# Auto Hauler Exchange (AHX): Technical Reverse-Engineering and Build Guide

**Research date:** 26 October 2026  
**Target:** https://www.autohaulerexchange.com/ and its public marketplace/signup pages  
**Purpose:** Explain the observable product, likely architecture, key systems, and a practical path to build a similar platform.

> **Important limitation:** This is a black-box analysis of public pages and public help documentation, not access to AHX's private source code, infrastructure, database, or internal APIs. Sections marked **Observed** are directly supported by public pages. Sections marked **Inference / recommended design** describe a plausible implementation, not a claim about AHX's exact stack. Do not copy their branding, proprietary content, private data, or protected assets.

## 1. Executive summary

AHX appears to operate two connected products:

1. **Marketing website** — public pages, brand visuals, customer logos, statistics, testimonials, educational content, cookie-consent UI, and calls to action.
2. **Authenticated logistics marketplace** — shipper and carrier accounts, shipment listings, direct booking and bidding, carrier vetting, shipment tracking, document workflows, notifications, and payments.

The public site is served from `autohaulerexchange.com`; account registration and the marketplace use `marketplace.autohaulerexchange.com`; help articles are published at `knowledge.autohaulerexchange.com`. Public pages describe direct shipper-to-carrier matching, market-estimate pricing, carrier verification, live tracking, documents, and payments. AHX says carriers are vetted for DOT/authority, insurance and background/identity risks, and its public documentation names Highway as its carrier-vetting software. It also documents tracking integrations and use of the Macropoint app when a carrier's preferred app is not integrated.

The practical lesson: **the marketing website is the easy part; the hard product is the transactional marketplace, compliance process, tracking integrations, and payment/document state machine.**

## 2. What is observable versus unknown

### Observed from public pages

- The home page presents AHX as a vehicle-transport marketplace.
- Shippers can request an account through a form asking for business type, contact details, legal business name, company address, estimated shipment volume, and optionally a business/dealer license or W-9.
- Carrier registration asks for identity/contact details, company name, DOT number, MC/docket number, and certifications.
- Public help pages explain load listing, bids, bookings, tracking, delivery documents, payment status, and carrier verification.
- The marketing page links into a separate marketplace subdomain.
- The supplied page text includes cookie-consent categories and a form success/error message.
- Images are hosted on a Webflow CDN domain (`cdn.prod.website-files.com`), which is strong evidence that Webflow is used for at least some public-site assets.

### Not established by public evidence

- The marketplace's frontend framework (React, Vue, Angular, etc.).
- The marketplace backend language/framework, cloud provider, database vendor, queues, or exact hosting topology.
- Exact database schema, APIs, fraud model, market-pricing formula, GPS polling frequency, and internal permissions.
- Whether the marketing site uses Webflow for every page or only some pages.
- Exact analytics, CRM, email, payment-processing, and observability vendors beyond the vendors explicitly named in public help documentation.

Do not assume the private application shares the marketing site's technology stack. Many companies use a visual CMS for marketing and a separate custom application for logged-in users.

## 3. Public research references

These pages are the primary evidence used for this guide. Check them again before implementation because product behavior and documentation can change.

- AHX home page: https://www.autohaulerexchange.com/
- Shipper account request: https://marketplace.autohaulerexchange.com/sign-up/customer
- Carrier signup: https://marketplace.autohaulerexchange.com/sign-up/carrier
- Login: https://marketplace.autohaulerexchange.com/login
- Carrier requirements: https://knowledge.autohaulerexchange.com/requirements-for-becoming-a-carrier
- Carrier marketplace workflow: https://www.autohaulerexchange.com/carriers
- How to bid on loads: https://knowledge.autohaulerexchange.com/how-to-bid-on-loads
- Payment workflow: https://knowledge.autohaulerexchange.com/how-payment-works-for-carriers-on-auto-hauler-exchange
- Uploading vehicle release documents: https://knowledge.autohaulerexchange.com/how-to-upload-and-manage-vehicle-release-documents
- Carrier dashboard: https://knowledge.autohaulerexchange.com/carrier-dashboard
- AHX shipper help index: https://knowledge.autohaulerexchange.com/shippers
- Webflow developer documentation: https://developers.webflow.com/home
- Webflow hosting overview: https://help.webflow.com/hc/en-us/articles/33961342422547-Webflow-hosting-overview

## 4. Likely system architecture

The diagram below is a **recommended architecture for a comparable product**, not a verified diagram of AHX's internal systems.

```text
                         PUBLIC INTERNET
                                |
                     DNS + TLS + CDN / WAF
                                |
               +----------------+----------------+
               |                                 |
        Marketing website                 Marketplace web app
        (Webflow or similar)              (React / Next.js)
               |                                 |
       CMS / assets / forms                HTTPS JSON API
                                                 |
                                         API / application layer
                                                 |
            +----------------------+-------------+------------------+
            |                      |             |                  |
        PostgreSQL             Job queue      Object storage    Auth service
        business data          / workers      private files     sessions/MFA
            |                      |             |                  |
            +----------------------+-------------+------------------+
                                   |
                       External integration adapters
              +--------------------+-------------------------+
              |                    |             |            |
          Carrier vetting       GPS/ELD       Email/SMS     Payments/ACH
          / compliance          tracking      notifications processor
              |
        Pricing / risk / analytics services
```

### Suggested deployment boundary

- Keep the public brochure site and marketplace app as separate deployable projects.
- Put an API behind the app; never let the browser connect directly to the database.
- Use a managed relational database for loads, users, bids, bookings, payments, and audit events.
- Store documents and photos in private object storage, not as public static URLs.
- Use background jobs for external API polling, email, status reconciliation, and slow checks.
- Put a CDN/WAF in front of public traffic and apply rate limits to authentication, signup, uploads, and bidding endpoints.

## 5. The public marketing website: how to build it

### 5.1 Page structure

The observed homepage follows a familiar B2B conversion pattern:

1. Brand/navigation and support contact.
2. Trust strip of customer logos.
3. Pain statement about open load boards and fraud.
4. Main value proposition and metrics.
5. Feature blocks: faster delivery, vetted carriers, support, pricing insight, fraud prevention, unified management.
6. Shipper workflow explanation.
7. Carrier workflow explanation.
8. Testimonials and video.
9. Signup calls to action.
10. Cookie preferences/consent UI.

This is mostly content composition, not a complex backend. A CMS can manage logos, testimonials, case studies, blog posts, and page copy.

### 5.2 Likely tools

**Observed clue:** asset URLs use `cdn.prod.website-files.com`, a Webflow-hosted asset domain. That makes Webflow a reasonable choice for reproducing the public marketing layer. It does **not** prove that the authenticated marketplace is built with Webflow.

Possible implementation:
- Webflow for page design, responsive layout, CMS collections and content editing; or
- Next.js/Astro with a headless CMS if engineering control and reusable UI are more important.

Webflow's official developer documentation describes APIs for site data, pages, assets, CMS, forms, and integrations. Webflow also documents managed hosting and CDN delivery. See:
- https://developers.webflow.com/home
- https://help.webflow.com/hc/en-us/articles/33961342422547-Webflow-hosting-overview
- https://developers.webflow.com/designer/reference/forms

### 5.3 How the visible effects are commonly implemented

- **Repeated/scrolling customer logos:** CSS animation (`@keyframes` with a horizontal translate), duplicated logo items to create a seamless loop, and `overflow: hidden`. Pause or reduce motion for accessibility.
- **Feature cards and image/text sections:** responsive CSS grid/flexbox, breakpoints, and optimized image assets.
- **Testimonials/video:** static CMS content with a linked YouTube embed or click-to-load iframe. Consent managers may delay third-party iframe loading until consent.
- **CTA buttons:** regular links to the correct signup route; use analytics events to measure click-through.
- **Cookie preferences:** a consent-management component that stores the visitor's choices and gates non-essential analytics/marketing tags. Do not fire optional trackers before consent where consent is required.
- **Form success/error messages:** client-side validation plus server submission; display success only after the backend confirms acceptance.
- **SEO:** semantic headings, title/description metadata, canonical URLs, Open Graph images, sitemap, robots rules, structured data where appropriate, and fast mobile rendering.

### 5.4 Recreating the text and copy system

Treat page copy as structured content, not hard-coded fragments scattered through components.

Example CMS model:

```json
{
  "hero": {
    "eyebrow": "Vehicle transportation marketplace",
    "headline": "Connect directly with vetted carriers",
    "body": "Post shipments, compare offers, and manage delivery in one place.",
    "primaryCta": { "label": "Request a shipper account", "href": "/sign-up/customer" },
    "secondaryCta": { "label": "Join as a carrier", "href": "/sign-up/carrier" }
  },
  "metrics": [
    { "value": "1200+", "label": "Shippers" },
    { "value": "< 3 min", "label": "To post a shipment" }
  ]
}
```

Use original wording and independently verified metrics in your own product. AHX's numerical claims are their marketing claims, not independently established facts in this guide.

Content models worth creating:
- `Page`: title, slug, SEO title/description, sections
- `Feature`: title, summary, image, order
- `Testimonial`: quote, person, role, company, permission/status
- `CustomerLogo`: image, alt text, destination URL
- `FAQ`: question, answer, category, sort order
- `CaseStudy`: title, challenge, solution, results, approved metrics
- `LegalDocument`: version, effective date, body

Add editorial review, content versioning, image alt text, and approval before publishing. Avoid copying AHX text or its logo assets.

## 6. The marketplace workflows

### 6.1 Shipper account onboarding

Public signup asks for business identity and contact details, business address, estimated shipment volume, and optional supporting business documentation. A robust implementation should:

1. Validate fields in the browser for usability.
2. Revalidate everything server-side.
3. Normalize email, phone, address and business identifiers.
4. Store an onboarding application with a status such as `submitted`.
5. Securely upload optional supporting documents.
6. Notify an internal review queue.
7. Allow an authorized reviewer to approve, reject, or request more information.
8. Only grant shipment-posting privileges when the account meets the business rules.

Suggested states: `draft → submitted → under_review → approved | rejected | needs_information`.

### 6.2 Carrier onboarding and compliance

AHX's public material describes DOT/operating authority, insurance, background/identity checks, equipment details, and tracking requirements. Its public carrier requirements mention Highway as its vetting software and specify insurance/authority criteria. The exact third-party contract and internal decision rules are not public.

For your own product:
- Integrate with a reputable carrier-compliance provider rather than relying only on manual form fields.
- Validate provider webhooks with signatures and idempotency.
- Record each check's provider, timestamp, result, reason code, and expiration.
- Track insurance expiration and authority status continuously.
- Restrict access to documents and personal data by role.
- Provide an appeal/manual-review path for false positives.
- Prevent unapproved carriers from viewing or booking restricted loads.

Suggested states: `applied → documents_pending → checks_pending → review → approved | rejected → suspended`.

Do not treat a carrier as verified just because they entered a DOT number. Verify the identity, authority, insurance, and risk signals using authoritative data sources and auditable checks.

### 6.3 Posting a shipment

The public product describes a shipper entering vehicle details, origin/destination, timeline, and price, optionally guided by a market estimate. AHX documentation also discusses VINs, vehicle operability, trailer type, location notes, hours, contacts, and release documents.

Recommended shipment form:
- Origin and destination addresses and location contacts
- Pickup/delivery windows, time zones, location hours and notes
- Vehicle count and vehicle-level records (VIN, make/model if known, operable/inoperable)
- Trailer/equipment requirements (open/enclosed)
- Price, currency, pricing mode and any maximum/target bid rules
- Special handling requirements
- Gate/release documents and optional photos
- Customer/account and internal reference numbers

A shipment can contain multiple vehicles, so model `loads` and `vehicles` separately rather than stuffing every VIN into a single text field.

Recommended load states:

```text
draft → posted → booked → pickup_confirmed → in_transit
      → delivered_pending_documents → completed
```

Additional terminal or exception states might include `cancelled`, `disputed`, `on_hold`, and `failed`. Use explicit transitions and permissions instead of allowing arbitrary status changes.

### 6.4 Carrier discovery, bids and booking

Public help documentation describes carrier listings, searching/filtering, bids, and pickup/delivery ETA windows. A safe design:

1. Filter eligible loads by geography, equipment, timing, capacity, carrier status, and access permissions.
2. Display only fields that a carrier is authorized to see.
3. Accept a bid through a server endpoint.
4. Validate price, ETA windows, bid expiry, load status and carrier eligibility.
5. Notify the shipper of the bid.
6. Let the shipper accept, reject or counter according to the business rules.
7. On acceptance, atomically create a booking and change the load status.
8. Notify both parties and create the tender/booking documents.

**Concurrency matters:** two carriers must not successfully book the same load. Enforce this with a database transaction and a uniqueness/locking strategy, not merely by hiding the button in the UI. Make booking endpoints idempotent so a retry cannot create duplicate bookings.

Example API shape:

```text
POST /api/loads
GET  /api/loads?status=posted&origin=...
GET  /api/loads/:id
POST /api/loads/:id/bids
POST /api/bids/:id/accept
POST /api/loads/:id/book
POST /api/bookings/:id/pickup-confirmation
POST /api/bookings/:id/delivery-confirmation
```

These are example endpoints for your implementation, not AHX's private API routes.

## 7. Pricing / market-estimate engine

AHX publicly says its pricing engine analyzes lane trends and that shippers can use a market estimate or set their own price. The exact model, features, training data, and formula are not public.

### A reasonable first version

Start with an explainable statistical estimate before adding machine learning.

Potential inputs:
- Origin/destination ZIP codes or geocoded coordinates
- Distance and route characteristics
- Vehicle count, size/class and operability
- Open vs enclosed transport
- Pickup/delivery timing and urgency
- Seasonality and lane-specific demand
- Historical accepted bids and completed prices
- Carrier availability, deadhead distance and capacity
- Fuel and other relevant cost indices, if licensed and suitable

A simple baseline could be:

`estimated_price = base_fee + (distance_miles × lane_rate) + equipment_adjustment + vehicle_adjustment + urgency_adjustment`

This is only a starter formula. Fit the actual coefficients from trustworthy historical data; do not use invented constants as production pricing.

### Data pipeline

1. Ingest completed loads and bids.
2. Remove duplicates and invalid/cancelled records.
3. Normalize geography, vehicle categories, equipment, and currency.
4. Exclude or flag outliers and disputed transactions.
5. Build lane/time-period aggregates.
6. Train/evaluate a model against a held-out time period.
7. Return an estimate range, confidence level and sample-size caveat.
8. Monitor error by lane, equipment and shipment type; retrain only when validation supports it.

For later models, try gradient-boosted trees or quantile regression before a complicated deep-learning system. A price range (for example, low/typical/high) is often more useful than a single falsely precise number. Record model version and features used for each estimate so you can explain changes.

Avoid leakage: a model must not use information that would not have been available at the moment the estimate was requested. Measure MAE/median absolute error and calibration of estimate ranges, not just a headline accuracy score.

## 8. Real-time tracking

AHX publicly describes live tracking and says shipments must be tracked; its help content mentions Macropoint when a carrier's preferred tracking app is not integrated. The public information does not establish the exact GPS ingestion frequency or the private integration protocol.

### Recommended architecture

- Create a `tracking_sessions` record for a booked load and assigned vehicle/driver.
- Integrate a provider SDK/API or driver app with clear consent and permissions.
- Receive GPS updates through signed webhooks or poll the provider where webhooks are unavailable.
- Validate timestamps, coordinate bounds, load assignment, and replay/duplicate events.
- Store current location separately from a history table or time-series store.
- Send location changes to authorized clients using WebSockets or Server-Sent Events; periodic refresh may be enough for an MVP.
- Render a route and last-known position using a map SDK.
- Show “last updated at” and stale/offline state; never imply GPS is live if data is delayed.
- Stop tracking after delivery or according to the consent and retention policy.

Suggested event:

```json
{
  "loadId": "load_123",
  "trackingSessionId": "track_456",
  "latitude": 39.7392,
  "longitude": -104.9903,
  "recordedAt": "2026-10-26T10:00:00Z",
  "source": "tracking_provider"
}
```

Use a provider abstraction so you can support different ELD/mobile tracking partners without rewriting shipment logic. Protect location data as sensitive information; scope it to the relevant shipment and retain it only as long as necessary.

## 9. Documents and media

The public help center describes uploading release documents, vehicle photos, bills of lading (BOL), and proof of delivery (POD). These are core workflow data, not merely attachments.

Recommended design:
- Store file bytes in private object storage (for example, an S3-compatible bucket).
- Store metadata in PostgreSQL: owner, load, document type, uploader, timestamps, size, MIME type, checksum, scan status and visibility.
- Upload via short-lived presigned URLs; the browser should not receive permanent storage credentials.
- Check file size and allowed formats; inspect actual file content rather than trusting the extension.
- Scan uploads for malware and quarantine suspicious files.
- Serve downloads through short-lived signed URLs after authorization.
- Keep an audit trail of upload, view, download, replacement, and deletion.
- Use separate document types/permissions for release forms, photos, BOLs, PODs, insurance, and identity documents.
- Require the appropriate delivery documents before the payment workflow can advance.

Never put private document URLs into public CMS pages, analytics payloads, or logs.

## 10. Notifications and background jobs

The product describes notifications at booking, pickup, and delivery. Use an event-driven design so business actions are decoupled from email delivery.

Example events:
- `shipper.account_submitted`
- `carrier.approved`
- `load.posted`
- `bid.created`
- `bid.accepted`
- `booking.confirmed`
- `pickup.confirmed`
- `tracking.stale`
- `delivery.confirmed`
- `document.approved`
- `payment.released`

A worker consumes events and sends email/SMS/in-app notifications. Store delivery attempts and provider IDs. Retry temporary failures with exponential backoff; route repeated failures to a dead-letter queue. Make each handler idempotent.

A transactional outbox pattern is useful: write the load/booking change and its event to the same database transaction, then have a worker publish the event. This avoids a successful booking with a missing notification event.

## 11. Payments and reconciliation

AHX's public help pages describe carrier payments after delivery documents are submitted and approved, standard payment timing, and a faster Quick Pay option with a fee. Another public article describes shipper prepayment features and payment-method management. These are observed product behaviors; the actual internal payment architecture is not public.

For a similar product:
- Use a reputable payment provider; do not store raw card numbers or bank credentials.
- Use hosted/tokenized card entry and a bank-link provider where suitable.
- Keep payment status separate from shipment status.
- Use a ledger-style record of charges, fees, credits, payouts and refunds.
- Verify payment webhooks and deduplicate them by provider event ID.
- Reconcile internal transactions with provider reports.
- Require document approval and resolution of disputes/holds before payout.
- Make the fee, settlement terms and any expedited-payment fee clear.
- Consider the legal/regulatory implications of holding or transmitting money, payment facilitation, money transmission, tax reporting, and marketplace payouts in each operating jurisdiction. Get specialist legal/accounting advice before launch.

Possible states:

```text
Payment: not_due → pending_documents → under_review → approved
         → scheduled → processing → paid
         ↘ on_hold / failed / reversed
```

Do not mark a payment `paid` just because a payment API request was sent; wait for the provider's confirmed state and reconcile it.

## 12. Database design

A practical starting point is PostgreSQL. The following is a conceptual schema; production schemas need constraints, indexes, migrations and privacy review.

| Table | Purpose / important fields |
|---|---|
| `users` | id, email, auth_subject, status, created_at |
| `organizations` | id, legal_name, business_type, address, status |
| `organization_members` | organization_id, user_id, role |
| `shipper_profiles` | organization_id, volume_band, review_status |
| `carrier_profiles` | organization_id, DOT/MC identifiers, equipment, service area, approval status |
| `compliance_checks` | carrier_id, provider, check_type, status, checked_at, expires_at, reason_code |
| `loads` | shipper_org_id, status, origin/destination, windows, price rules, equipment |
| `vehicles` | load_id, VIN, make/model, operable, special handling |
| `bids` | load_id, carrier_id, amount, ETA windows, status, expires_at |
| `bookings` | load_id, carrier_id, accepted_bid_id, status, booked_at |
| `tracking_sessions` | booking_id, provider, external_session_id, status |
| `location_points` | tracking_session_id, coordinates, recorded_at, source |
| `documents` | load_id/booking_id, type, object_key, checksum, scan_status, uploaded_by |
| `shipment_events` | load_id, event_type, actor_id, occurred_at, metadata |
| `payments` | booking_id, payer/payee, amount, currency, status, provider_reference |
| `ledger_entries` | payment_id, entry_type, debit/credit, amount, created_at |
| `notifications` | recipient_id, channel, event_id, status, provider_reference |
| `audit_logs` | actor, action, resource, timestamp, safe metadata |
| `pricing_estimates` | route features, estimate range, model_version, created_at |

Important database rules:
- Use UUIDs or similarly unguessable public identifiers.
- Add foreign keys and check constraints.
- Use unique constraints for one active booking per load, where the business rule requires it.
- Index status, organization, route geography, created time, and common search filters.
- Use PostGIS if geospatial filtering and distance queries become important.
- Keep an audit trail for sensitive actions.
- Avoid logging full VINs, identity documents, payment details, or secrets unless there is a clear need and strict access control.

## 13. API, authentication and authorization

### API design

Use REST for an initial product unless there is a strong reason to adopt GraphQL. Version the API and document it with OpenAPI. Validate request schemas on the server. Return consistent error codes and correlation IDs.

### Authentication

Options include a managed identity provider or a well-maintained framework. Support:
- Email verification and password reset
- MFA for administrators and sensitive roles
- Secure, HttpOnly, SameSite cookies for browser sessions
- Short-lived access tokens where appropriate
- Session revocation and suspicious-login monitoring
- Rate limiting and bot protection

### Authorization

Use role-based access plus resource-level checks. A carrier must not be able to access another carrier's private documents by changing an ID in the URL. A shipper must not edit another organization's load. Admin permissions should be narrowly scoped and audited.

Security essentials:
- TLS everywhere; encryption at rest.
- Secrets in a secret manager, never in source control.
- CSRF protection when cookie-based authentication is used.
- XSS-safe rendering and a restrictive Content Security Policy.
- SQL injection protection through parameterized queries/ORM.
- File upload scanning and strict authorization.
- Backups and tested restoration.
- Dependency and container scanning.
- Incident response, data retention and deletion policies.
- Privacy notice and consent for tracking and analytics.

## 14. Suggested technology stack

This is a practical greenfield stack, not a claim about AHX's actual technology.

| Layer | Sensible choice | Why |
|---|---|---|
| Marketing site | Webflow, or Next.js + CMS | Fast content iteration and SEO |
| Marketplace frontend | TypeScript + React / Next.js | Mature ecosystem, reusable UI |
| UI styling | Tailwind CSS or CSS modules | Consistent responsive components |
| Backend API | TypeScript + NestJS/Fastify, or Python + FastAPI | Typed contracts and maintainable API |
| Database | Managed PostgreSQL | Transactions and relational integrity |
| Geospatial | PostGIS | Route/lane/location queries |
| Cache / short-lived coordination | Redis | Rate limits, caching, temporary locks |
| Background jobs | Managed queue or Redis-backed worker | Retries and slow integrations |
| File storage | Private S3-compatible object storage | Documents, photos, signed URLs |
| Authentication | Managed identity provider or mature framework | MFA, reset flows, session security |
| Maps | Google Maps, Mapbox, or another licensed provider | Geocoding and map rendering |
| Email/SMS | Transactional email and SMS provider | Reliable notifications |
| Payments | Payment processor supporting your marketplace model | Tokenization, events and reconciliation |
| Carrier verification | Compliance provider such as the one you contract with | Authority/insurance/risk checks |
| Tracking | GPS/ELD partner APIs or mobile SDK | Location updates |
| Monitoring | Error tracking + metrics + centralized logs | Detect incidents and slow requests |
| CI/CD | GitHub Actions or equivalent | Automated test/deploy pipeline |
| Hosting | Managed app hosting/cloud platform | Reduce infrastructure maintenance |

Choose vendors based on region, pricing, compliance needs, reliability, and the provider's current marketplace capabilities. Do not pick a provider merely because a competitor appears to use it.

## 15. Servers and infrastructure: what you actually need

You generally do **not** need to buy or manage a physical server to launch.

A small initial production setup can use:
1. DNS and TLS certificate management.
2. CDN/WAF for the public site and app assets.
3. A managed frontend deployment.
4. One or more API instances or serverless handlers.
5. Managed PostgreSQL with automated backups.
6. Private object storage for documents and photos.
7. A queue and background worker.
8. A secret manager.
9. Error tracking, logs, uptime checks and alerts.
10. A separate staging environment.

Keep development, staging and production credentials and data separate. Use infrastructure-as-code once the system grows. Start with managed services and a modular monolith; split into microservices only when scale or team boundaries justify the added complexity.

### Typical request flow

When a shipper posts a load:

1. Browser submits a validated form over HTTPS.
2. API authenticates the user and checks shipper permissions.
3. API validates addresses, dates, vehicles, price and required fields.
4. A database transaction creates the load, vehicle records and audit event.
5. The API returns the created load ID and current state.
6. An outbox/queue worker triggers notifications and search-index updates.
7. Eligible carriers see the load through an authorized query.
8. A carrier bid/booking request is checked again server-side.
9. Status changes produce events for email, dashboard updates and downstream workflows.

The browser is never the source of truth for price, carrier approval, booking eligibility, payment state or shipment status.

## 16. Search, filtering and performance

At MVP scale, PostgreSQL indexes can support most listing filters. Later:
- Use PostGIS for geographic radius/route filtering.
- Add a search engine only when text search/filter complexity justifies it.
- Paginate large result sets (cursor pagination is often preferable).
- Cache public content and stable reference data, not private user-specific responses indiscriminately.
- Optimize image sizes and use responsive image formats.
- Add database query monitoring and slow-query alerts.
- Use asynchronous processing for bulk CSV uploads, large imports, and document scanning.

Never cache private shipment data across users without a correct authorization-aware cache key.

## 17. Fraud prevention and operational controls

AHX advertises fraud prevention and carrier vetting. A comparable platform should layer controls rather than rely on one “fraud score.”

Potential controls:
- Carrier identity/authority/insurance verification.
- Expiry monitoring and periodic rechecks.
- Detect duplicate or conflicting carrier identities.
- Verify the account making a booking is authorized for the carrier organization.
- Detect suspicious changes to pickup/delivery details and payment instructions.
- Track device/IP signals proportionately and lawfully.
- Require multi-factor review for high-risk changes.
- Compare tracking events with declared route/time windows.
- Flag unusual bid patterns and repeated failed bookings.
- Audit manual overrides and administrative access.
- Keep a clear dispute, claims and incident process.

Use explainable risk rules initially and human review for high-impact decisions. Do not automatically reject people based on opaque signals without an appeal process.

## 18. Observability and reliability

Add structured logs and metrics from the beginning.

Track:
- API latency and error rates by endpoint.
- Signup completion and review times.
- Load-posting success/failure.
- Time from posted to booked.
- Bid acceptance rates.
- Tracking freshness and provider error rate.
- Document upload/scan failures.
- Payment processing/reconciliation exceptions.
- Email/SMS delivery failures.
- Database connection saturation and queue lag.

Use correlation IDs across API requests, jobs, provider calls and audit events. Alert on business failures (for example, a booking without a notification event), not only server CPU. Create runbooks for database restoration, provider outages, suspected account takeover and payment discrepancies.

## 19. Testing strategy

Minimum coverage:
- Unit tests for pricing, permissions and state transitions.
- API integration tests with a test database.
- Concurrency tests proving a load cannot be booked twice.
- Authorization tests across organizations and roles.
- Upload tests for malicious, oversized and invalid files.
- Webhook tests for bad signatures, duplicate events and out-of-order delivery.
- End-to-end tests for shipper signup, carrier onboarding, post → bid → book → pickup → delivery → documents → payment.
- Accessibility checks and mobile/responsive visual tests.
- Backup restoration drills and incident simulations.

Use synthetic test data in staging; never copy production identity documents or payment data into development.

## 20. Build roadmap

### Phase 1 — Marketing and lead capture
- Public homepage and core pages.
- CMS for FAQs, testimonials, case studies and help content.
- Signup request forms.
- Cookie consent, analytics governance, SEO and responsive design.

### Phase 2 — Accounts and compliance
- Organizations, users and roles.
- Shipper application review.
- Carrier profile and document upload.
- Compliance provider integration and approval workflow.
- Admin audit log.

### Phase 3 — Marketplace core
- Load creation and vehicle records.
- Carrier listings, search and filters.
- Bids, counters and booking.
- Concurrency protection and status transitions.
- Email/in-app notifications.

### Phase 4 — Shipment operations
- Pickup/delivery confirmations.
- BOL/POD and release-document workflow.
- Tracking provider integration and map display.
- Exceptions, claims and customer support tools.

### Phase 5 — Payments and pricing
- Payment-method tokenization.
- Fees, invoices, payouts and reconciliation.
- Market-estimate baseline and model evaluation.
- Dispute/hold workflow.

### Phase 6 — Scale and optimize
- Geospatial search and analytics.
- Fraud monitoring and compliance rechecks.
- Better dispatch tools and reporting.
- Load testing, SLOs, disaster recovery and cost optimization.

**Build order matters:** do not begin with AI pricing or sophisticated live maps. First make identity, permissions, loads, bids, bookings, documents and status transitions correct.

## 21. Example monorepo layout

```text
vehicle-marketplace/
  apps/
    marketing/             # Webflow export or separate marketing app
    web/                   # Shipper/carrier/admin UI
    api/                   # HTTP API
    worker/                # Async jobs and webhook processing
  packages/
    contracts/             # Shared request/response schemas
    ui/                    # Shared design system
    domain/                # Domain rules and state transitions
    integrations/
      payments/
      tracking/
      compliance/
      email/
  infra/
    terraform/             # Optional infrastructure-as-code
    deployment/
  database/
    migrations/
    seeds/
  docs/
    architecture.md
    runbooks/
  tests/
    integration/
    e2e/
```

A monorepo is optional. Keep domain rules separate from framework-specific controllers and UI components so that payment, tracking and compliance providers can be changed independently.

## 22. Example state-transition rules

Prefer explicit domain operations to arbitrary status updates:

```ts
type LoadStatus =
  | "draft"
  | "posted"
  | "booked"
  | "pickup_confirmed"
  | "in_transit"
  | "delivered_pending_documents"
  | "completed"
  | "cancelled"
  | "on_hold";

function canBookLoad(input: {
  status: LoadStatus;
  carrierApproved: boolean;
  hasActiveBooking: boolean;
}) {
  return input.status === "posted"
    && input.carrierApproved
    && !input.hasActiveBooking;
}
```

This snippet illustrates the idea only. Production logic must enforce the rule inside a transaction and also check permissions, capacity, bid acceptance, expiry, and any additional business conditions.

## 23. Budgeting and team

Costs vary dramatically by traffic, geography, provider contracts, file volume, GPS frequency, and payment volume. Avoid pretending there is one reliable monthly price before requirements are known.

Budget categories:
- Domain, email and public-site hosting.
- Application hosting and database.
- Object storage and backups.
- Maps/geocoding and tracking provider usage.
- Carrier verification/compliance checks.
- Email/SMS volume.
- Payment processing and expedited payout fees.
- Logging/error monitoring.
- Security review, legal/compliance advice, support and operations.

A realistic minimum team for a transactional MVP is usually some combination of:
- Product/domain owner who understands vehicle logistics.
- Full-stack engineer.
- Backend/integration engineer (may be the same person initially).
- Product designer or design-capable frontend engineer.
- QA/operations support.
- Legal/compliance and payments specialists as needed.

The largest non-code challenge is building a reliable carrier network and handling exceptions, disputes, document checks and payment reconciliation.

## 24. Practical black-box inspection checklist

If you want to investigate the public site further yourself, use browser developer tools on pages you are authorized to inspect:

1. **Network tab:** reload and categorize document, CSS, JavaScript, image, API and iframe requests.
2. **View source / Elements:** identify script hosts, asset domains, meta tags, and form destinations.
3. **Application/Storage:** inspect cookies and local storage only for your own session; do not extract other users' data.
4. **Performance:** record page-load waterfall, largest assets, layout shifts and long tasks.
5. **Responsive mode:** test navigation, grids, form behavior and breakpoints at phone/tablet/desktop sizes.
6. **Forms:** submit only test information through forms you are permitted to use; observe validation and confirmation behavior.
7. **Cookie consent:** compare requests before and after consent and verify optional scripts are gated appropriately.
8. **Public DNS/TLS:** inspect public DNS records and certificate information, but remember these do not reveal the private application architecture.
9. **Source maps/API endpoints:** public artifacts may expose implementation details, but do not bypass authentication, probe private endpoints aggressively, or access data outside your authorization.
10. **Document every inference:** record the evidence, confidence level, and alternative explanations.

A browser's “technology detector” or a hosting lookup is a clue, not proof. Minified JavaScript, CDN headers, and subdomains rarely reveal the complete backend.

## 25. Final recommendation

To build a similar product, reproduce the **workflow**, not AHX's exact implementation:

- Use a visual CMS or lightweight frontend for the marketing site.
- Build a separate authenticated marketplace with a secure API and PostgreSQL.
- Treat loads, bids, bookings, tracking, documents, compliance and payments as explicit domain modules.
- Integrate established providers for carrier vetting, GPS tracking, notifications and payments.
- Start as a modular monolith with background workers; avoid unnecessary microservices.
- Build security, auditability, concurrency protection and reconciliation into the first release.
- Add pricing intelligence only after you have clean, representative shipment and bid data.

The highest-value next step is to write a short product requirements document for your own version: which user roles you need, which shipment states are required, which countries you will operate in, and whether you need real payments and GPS tracking in version one. Those decisions determine the real architecture and budget.

---

## Sources

1. Auto Hauler Exchange homepage — https://www.autohaulerexchange.com/
2. AHX shipper signup — https://marketplace.autohaulerexchange.com/sign-up/customer
3. AHX carrier signup — https://marketplace.autohaulerexchange.com/sign-up/carrier
4. AHX carrier requirements — https://knowledge.autohaulerexchange.com/requirements-for-becoming-a-carrier
5. AHX carrier information — https://www.autohaulerexchange.com/carriers
6. AHX bidding workflow — https://knowledge.autohaulerexchange.com/how-to-bid-on-loads
7. AHX carrier payment workflow — https://knowledge.autohaulerexchange.com/how-payment-works-for-carriers-on-auto-hauler-exchange
8. AHX document workflow — https://knowledge.autohaulerexchange.com/how-to-upload-and-manage-vehicle-release-documents
9. AHX carrier dashboard — https://knowledge.autohaulerexchange.com/carrier-dashboard
10. AHX shipper help index — https://knowledge.autohaulerexchange.com/shippers
11. Webflow developer platform — https://developers.webflow.com/home
12. Webflow hosting overview — https://help.webflow.com/hc/en-us/articles/33961342422547-Webflow-hosting-overview
13. Webflow form documentation — https://developers.webflow.com/designer/reference/forms
