# Onulink: Technical Reverse-Engineering and Build Guide

**Research date:** 26 October 2026  
**Target:** https://onulink.com/ and the public Onulink Driver app listings  
**Goal:** Explain how the visible product likely works technically and how to build a comparable auto-hauling TMS.

> **Evidence labels:** **Observed** means supported by the supplied website copy or public listings. **Inference / recommended design** means a technically plausible implementation, not a claim about Onulink's private codebase. Public pages do not reveal its exact frontend framework, backend language, database vendor, hosting provider, API routes, or internal algorithms.

## 1. Executive summary

Onulink is not just a brochure website. It appears to be a vertical **transportation management system (TMS)** for auto haulers, with a connected driver mobile app and a broker-to-carrier marketplace.

The core product surfaces are:

1. **Public marketing and subscription site** — feature pages, pricing, FAQs, reviews, signup and demo calls to action.
2. **Fleet TMS** — customers, vehicles, loads, trucks, drivers, dispatch, live status, settlements/payroll, invoicing, BOL generation, audit logs and notifications.
3. **Driver mobile app** — assigned loads, route/stops, VIN scanning, guided pickup/drop-off inspections, photos, damage marking, signatures, eBOL, paystubs, fuel receipts and optional location sharing.
4. **Broker workflow** — post loads to carriers, receive requests/bids, auto-accept within a limit, generate dispatch sheets, receive photos/BOLs/invoices, track payables and margins.
5. **Shared carrier/broker network** — carriers can receive brokered work without paying for the load board; the carrier's operational data is scoped to the carrier and the relevant booked loads.

The difficult engineering is not the marketing page. It is **data integrity across a web dashboard, mobile app, offline work, location tracking, photo/document evidence, financial calculations, and multiple companies' permissions**.

## 2. Evidence: what public material establishes

### 2.1 Website

The supplied copy and the public home page describe:
- Dispatch, load and operations management for auto haulers.
- Driver and truck management; CSV import.
- Load status updates, activity log and audit trail.
- Driver payment calculations, settlements, adjustments and reports.
- BOL PDFs, customer invoices, payment status and VIN decoding.
- Notifications and driver portal/mobile app.
- Per-driver carrier pricing starting at $29/month on the homepage copy.
- A separate broker offer described at $149/month, with one agent included and additional agents priced separately.
- Broker load board, direct offers, auto-accept limits, dispatch sheets, payables, margins, FMCSA authority/insurance signals and ratings.
- Stripe and Google Maps logos in the marketing page's “tools” area.

The price points above are claims shown in the supplied copy, not a guarantee that those prices remain current. Confirm current pricing on the live pricing page.

### 2.2 Driver mobile app

The public app listing describes:
- Loads appearing after dispatch assigns them.
- Opening addresses in a maps app, including multi-stop routes.
- Vehicle lists, VINs, dates and dispatcher notes.
- Guided pickup/drop-off photo inspections with timestamps.
- Damage marks on a vehicle diagram.
- VIN barcode scanning.
- Customer signatures and automatically assembled BOLs.
- Downloadable paystub PDFs.
- Fuel receipt capture and extraction of gallons, total and state for IFTA records.
- Optional location sharing controlled by the driver.
- Push notifications for assignments, changes and finalized pay.
- Offline operation for photos, signatures and VIN scans, with later upload/sync.
- More recent listing copy also describes trip-based location tracking, state-mile recording for IFTA, odometer prompts, run maps, fuel-stop discovery and biometric sign-in.

These are app-store descriptions of intended functionality. They do not reveal the internal SDKs or server implementation.

### 2.3 Public references

- Homepage: https://onulink.com/
- Features: https://onulink.com/features
- Preview: https://onulink.com/preview
- Pricing: https://onulink.com/pricing
- Plans/trial: https://onulink.com/plans
- FAQ: https://onulink.com/faq
- Broker page: https://onulink.com/broker
- Broker signup: https://onulink.com/broker/signup
- Carrier driver app on Google Play: https://play.google.com/store/apps/details?id=com.onulink.driver
- Driver app on Apple App Store: https://apps.apple.com/us/app/onulink-driver/id6798491334
- Stripe developer docs: https://docs.stripe.com/
- Google Maps Platform docs: https://developers.google.com/maps
- PostgreSQL docs: https://www.postgresql.org/docs/
- React Native docs: https://reactnative.dev/docs/getting-started
- Expo docs: https://docs.expo.dev/
- Apple background location guidance: https://developer.apple.com/documentation/corelocation
- Android location guidance: https://developer.android.com/develop/sensors-and-location/location

## 3. Product architecture at a glance

The diagram below is a **recommended architecture for a similar product**, not a verified diagram of Onulink's internal services.

```text
                  PUBLIC USERS / CUSTOMERS / BROKERS
                                |
                         DNS + TLS + CDN/WAF
                                |
                 +--------------+----------------+
                 |                               |
          Marketing website                TMS web application
          pages / pricing / CMS            dispatch / admin / broker
                                                 |
                                      Authenticated HTTPS API
                                                 |
                                 +---------------+----------------+
                                 |               |                |
                            Domain modules   Realtime gateway   Job workers
                                 |           WebSocket/SSE      notifications,
                                 |                              PDFs, OCR, sync
                         Managed PostgreSQL
                          + geospatial data
                                 |
                   Private object/file storage
                   photos, signatures, BOLs, fuel receipts
                                 |
                       Integration adapters
            +--------------------+---------------------+
            |                    |                     |
       Maps/geocoding       Billing/payments      VIN decoder / OCR
            |                    |                     |
            +--------------------+---------------------+
                                 |
                         Driver mobile app
                    local database + file queue
                    camera / barcode / GPS / push
```

### Recommended service boundaries

Start with a **modular monolith**: one backend deployment divided into clean domain modules. Split out workers or services only where workload or reliability requires it.

Suggested modules:
- Identity, organizations and roles
- Fleet, trucks and drivers
- Customers and locations
- Loads, stops, vehicles and dispatch
- Driver app sync and mobile notifications
- Inspections, damage, photos and signatures
- BOLs, invoices and documents
- Driver settlements and payroll
- Fuel/IFTA records
- Broker load board, bids and booking
- Payments/subscriptions
- Reporting, audit and administration

## 4. Marketing site: how to reproduce the public pages

The marketing website is mostly a conventional responsive content site:
- Hero headline and CTA.
- Dashboard illustration/mockup and operational statistics.
- Feature list and tour links.
- Onboarding steps.
- Customer testimonials and review submission form.
- Pricing and FAQ pages.
- Separate broker-specific landing page.
- App Store and Google Play badges.
- Subscription/trial CTA.

### Implementation options

- **Fastest marketing-only route:** Webflow or another visual CMS.
- **Engineering-led route:** Next.js/React plus a CMS, with static rendering for SEO-heavy pages.
- Keep the logged-in TMS separate from the public brochure site even if they share a design system.

The supplied copy alone cannot establish which framework or CMS Onulink uses. Do not infer the application's technology from the design of its public page.

### Visual elements

- **Dashboard demo:** create a real demo-data dashboard component or a carefully designed static mockup. Do not hard-code fake live activity into a real customer's production dashboard.
- **Recent activity feed:** render audit/event records ordered by timestamp; use demo fixtures on the public homepage.
- **Metrics cards:** aggregate counts from demo data for the marketing page. For the real app, compute counts from authorized tenant data.
- **Feature cards:** CMS-driven content and responsive grid.
- **Review cards:** structured review records with moderation and permission to publish.
- **App badges:** direct links to the official store listings.
- **Pricing display:** CMS or configuration-backed values, not duplicated hard-coded prices on multiple pages.
- **Broker funnel:** a dedicated landing page and a separate signup/billing configuration if the broker product has different subscription rules.

### Copy/content model

Use structured content instead of copying text into many components.

```json
{
  "feature": {
    "slug": "driver-settlements",
    "title": "Driver settlements",
    "summary": "Calculate pay from delivered loads.",
    "bullets": [
      "Compensation plans",
      "Adjustments and deductions",
      "Downloadable pay statements"
    ],
    "ctaLabel": "Start free trial",
    "ctaHref": "/plans"
  }
}
```

Potential CMS entities:
- `Page`, `Feature`, `FAQ`, `Testimonial`, `Review`, `PricingPlan`, `ChangelogEntry`, `LegalPage`, `AppLink`.
- Store SEO title, meta description, canonical URL, Open Graph image, and publish state.
- Moderate user-submitted reviews, sanitize text and rate-limit submissions. Never publish an email address without explicit permission.

## 5. Multi-tenant data model: the foundation

This product serves different companies, brokers, dispatchers, drivers and possibly independent owner-operators. The central architecture decision is tenant isolation.

### Recommended tenancy model

Use a shared database with explicit `organization_id` on tenant-owned records, row-level security where suitable, and authorization checks in every API. Separate database/schema per tenant is possible but adds operational complexity.

Roles may include:
- Organization owner/admin
- Dispatcher
- Accounting/payroll
- Fleet manager
- Driver
- Broker owner/agent
- Read-only auditor

A user may belong to multiple organizations. Model that explicitly with `organization_memberships`, rather than assuming one user equals one company.

### Example tables

| Table | Purpose |
|---|---|
| `users` | Login identity, email, auth subject, status |
| `organizations` | Carrier/fleet/broker company |
| `organization_memberships` | User, organization, role, permissions |
| `subscription_accounts` | Plan, trial dates, billing customer, status |
| `drivers` | Driver profile, contact, app access, pay plan |
| `trucks` | Unit number, type, capacity, identifiers |
| `trailers` | Trailer details and capacity |
| `customers` | Shipper/dealer/customer records |
| `locations` | Address, coordinates, access notes, hours, geocode status |
| `loads` | Customer, status, dates, origin/destination, price, assigned driver/truck |
| `load_stops` | Ordered pickup/delivery/other stops |
| `load_vehicles` | Load ID, VIN, vehicle details, position on truck |
| `dispatch_assignments` | Driver/truck, assignment time, status |
| `inspections` | Vehicle, stop, type, inspector, timestamps, condition |
| `damage_marks` | Vehicle diagram coordinates/zone, damage type, notes |
| `media_files` | Private object key, checksum, type, size, uploader |
| `signatures` | Signer name/role, signed time, signature object key, document version |
| `documents` | BOL, invoice, paystub, receipt and related metadata |
| `invoices` | Customer amount, due date, status, terms |
| `driver_pay_plans` | Percent, per-mile, fixed/per-load, owner-operator terms |
| `settlements` | Driver, period, gross, adjustments, net, approval state |
| `settlement_lines` | Load earnings, bonuses, deductions, corrections |
| `fuel_receipts` | Driver, truck, gallons, total, date, state, OCR result |
| `ifta_trip_segments` | Time/location/mileage segments and state attribution |
| `broker_load_posts` | Broker's marketplace representation of a load |
| `carrier_requests` | Carrier offer/request/bid and proposed pay |
| `bookings` | Accepted broker/carrier pairing and dispatch terms |
| `payments` | Payment provider references, amount, status |
| `audit_events` | Actor, action, entity, timestamp, safe metadata |
| `outbox_events` | Reliable asynchronous event publishing |
| `device_sync_events` | Mobile operation ID, device, sync result, timestamps |

### Key modeling decisions

- A load may contain many vehicles and many stops; avoid one flat row with a giant VIN string.
- A driver can be assigned to different loads over time; assignment history should be retained.
- A BOL is a generated artifact from a specific version of the load and inspection data. Store the generated PDF and the data/version used to produce it.
- Store money in integer minor units (for example, cents) plus currency, not floating-point values.
- Preserve timestamps in UTC and also store relevant local timezone information for stop windows.
- Track every important state change with an actor and timestamp.

## 6. Dispatch and load management

### Core flow

1. Dispatcher creates a load and customer.
2. Add origin, destination, stop windows, vehicles and VINs.
3. Assign truck and driver.
4. Server validates that the driver/truck are active and not conflicting with another assignment.
5. Driver app receives the assignment.
6. Driver confirms pickup/delivery and submits inspections, photos and signatures.
7. Load status updates appear to authorized web users.
8. Documents and financial records are generated or unlocked by those events.

### Example load state machine

```text
draft → planned → assigned → dispatched → at_pickup
      → picked_up → in_transit → at_delivery → delivered
      → paperwork_complete → invoiced → closed
```

Possible exception states: `cancelled`, `on_hold`, `failed_delivery`, `damage_claim`, `needs_review`.

Use explicit transition functions and permission checks. Do not accept arbitrary `status` values from a browser or mobile app.

### Dispatch board

Common implementation:
- API returns a paginated load list and current assignments.
- Frontend renders table/board/calendar/map views.
- Drag-and-drop changes are submitted as an assignment command.
- Backend checks permissions, time conflicts and truck/driver availability.
- The server commits the change and emits an event.
- Connected dashboards receive a WebSocket/SSE update; disconnected clients refresh later.

The UI can optimistically move a card, but must roll it back if the server rejects the change.

### Preventing assignment conflicts

Do not rely on a frontend check. Validate on the server and use a transaction/constraint/locking strategy to prevent a driver or truck from being assigned to overlapping time windows where the business rule forbids it.

## 7. Driver app: native capabilities and offline-first design

The public app description makes the driver app one of the most technically distinctive parts of Onulink. It uses camera, barcode scanning, signatures, notifications, GPS and local/offline storage.

### Mobile technology choices

A comparable app could be built using:
- **React Native** for shared iOS/Android application code, with native modules for camera, background location, biometrics and notifications; or
- **Flutter** for a cross-platform UI with native plugins; or
- Separate Swift and Kotlin apps if platform-specific behavior and deep native control justify two codebases.

These are recommendations, not a claim about Onulink's implementation.

### Mobile app components

- Authentication and organization selection
- Assigned loads and stop sequence
- Vehicle/VIN list
- Navigation handoff to Apple Maps/Google Maps or an in-app map
- VIN barcode scanner
- Inspection checklist and vehicle damage diagram
- Camera capture and upload queue
- Signature capture
- BOL preview and delivery workflow
- Driver settlements/paystubs
- Fuel receipt capture and review
- Location-sharing toggle
- Push notifications
- Offline queue and sync status indicator

### Offline-first architecture

A driver may be in an auction yard, warehouse or rural location with no usable signal. The app should not require a live API request to save every photo or signature.

Recommended flow:
1. Cache assigned load data in a local database such as SQLite.
2. Save inspections/signatures locally as soon as the driver completes them.
3. Save photo files to app-private storage and enqueue upload tasks.
4. Give each local operation a globally unique idempotency ID.
5. When connectivity returns, sync queued operations to the API.
6. Server deduplicates repeated submissions and returns canonical IDs/status.
7. Upload files with retry/backoff and checksum verification.
8. Show pending/synced/failed states and provide a safe retry option.

Use a **transactional local outbox** so a saved inspection cannot be lost between writing the form and scheduling its upload.

### Conflict handling

Do not silently overwrite server data when a driver goes offline. For each command, define:
- Which fields the driver can edit
- Whether a later dispatcher edit supersedes the local value
- Whether the server rejects stale changes
- How duplicate signatures or status events are handled
- How users resolve conflicts

For evidence such as photos and signatures, preserve the original capture time, upload time, actor, device/app version and load/vehicle relationship.

## 8. Photo inspections and damage diagrams

A robust inspection feature is more than a camera button.

### Data model

Each inspection should include:
- Load, vehicle and stop
- Pickup or delivery phase
- Inspector identity
- Start/completion timestamps
- Required photo angles and completion state
- Vehicle condition checklist
- Damage marks, notes and severity
- Signature records
- Media files and checksums

### Image handling

- Capture at a sensible resolution; preserve originals where evidence requirements demand it.
- Generate thumbnails and compressed display derivatives asynchronously.
- Store images in private object storage.
- Use short-lived signed upload/download URLs.
- Record hashes to detect accidental corruption or duplicate uploads.
- Keep timestamps and the original file; avoid modifying evidence images in a way that obscures condition.
- Use access controls and retention policies appropriate to claims and privacy.

### Damage diagram

A vehicle outline can be rendered as an SVG or vector asset. Tapping a panel records a normalized coordinate or named zone plus damage type, notes and optional photo references. Store the mark data separately from the image so it remains editable and searchable.

### BOL generation

A Bill of Lading may combine:
- Load and customer information
- Origin/destination and stop times
- Vehicle/VIN list
- Pickup and delivery condition marks
- Photos or links to photo evidence
- Signatures and timestamps
- Carrier/driver/truck details
- Terms and document version

Generate PDFs on the server or in a dedicated worker using a stable HTML-to-PDF or PDF library. Save the final PDF and the exact source-data snapshot/document version. Email it asynchronously and record delivery outcome.

Do not rebuild a historical signed BOL from current mutable data without preserving the original version.

## 9. VIN decoding

The page advertises VIN decoding. The general approach is:

1. Capture a VIN from typing or barcode scan.
2. Normalize case and validate expected characters/length.
3. Query a licensed or public VIN-decoding data source.
4. Cache results because the same VIN may be scanned repeatedly.
5. Store the returned attributes with source and retrieval time.
6. Allow manual correction when the decoder lacks a trim/body detail.

Possible fields include year, make, model, body class and engine attributes, depending on source coverage. VIN decoding is not a substitute for visually verifying the actual vehicle.

Use a provider adapter to avoid hard-coupling the app to one decoder. Check provider terms, rate limits, data licensing and commercial-use conditions. Never assume every VIN will decode perfectly.

## 10. Location, routes and IFTA mileage

Onulink's public app listing describes optional location sharing, trip-based tracking and state-mile records for IFTA. That implies a location pipeline, but public material does not establish the exact GPS frequency, provider or route-matching algorithm.

### Recommended GPS pipeline

1. Driver explicitly enables tracking and understands what is collected.
2. Mobile app requests the platform permissions needed for the chosen mode.
3. App records timestamped GPS points while the applicable trip is active.
4. A local queue stores points during network outages.
5. Batch upload sends points to the API.
6. API validates driver/load association, timestamps and coordinates.
7. Store points in a geospatial/time-series-friendly table.
8. Map UI displays last known location and freshness.
9. Trip segmentation/mileage logic associates movement with a vehicle/load and calculates distance by jurisdiction.
10. User can inspect and correct exceptions before final tax reporting.

### IFTA is more than drawing a route on a map

A production mileage system needs:
- Trip start/end odometer readings where applicable
- Timestamped GPS points and data-quality flags
- Map matching or jurisdiction-boundary attribution
- State/province mileage aggregation
- Fuel purchases by jurisdiction, gallons and date
- Corrections for gaps, low accuracy, implausible jumps and missing data
- Audit trail for manual corrections
- Export/reporting aligned with the fleet's filing process

GPS-derived mileage is an estimate unless validated against the applicable records and rules. IFTA requirements can be jurisdiction- and record-system-specific; consult a qualified tax/compliance professional before claiming regulatory compliance.

### Battery and privacy

- Track only when needed for an active work context.
- Use adaptive sampling and batching rather than constant high-frequency uploads.
- Make location sharing visible and easy to stop.
- Stop collection when the trip/work state ends, subject to clearly disclosed policy.
- Explain retention and who can see location.
- Handle iOS/Android background permission limits and battery optimizations.
- Display last update time rather than implying stale coordinates are live.

## 11. Fuel receipt OCR and fuel records

The app listing says drivers can photograph fuel receipts and have gallons, total and state extracted.

Recommended pipeline:
1. Capture receipt image.
2. Save locally if offline.
3. Upload to private storage.
4. Run OCR/document extraction in a worker.
5. Parse candidate fields: merchant, date, gallons, fuel type, total, jurisdiction and possibly odometer.
6. Validate against plausible ranges and the selected truck/driver.
7. Show a review screen; driver or accounting confirms/corrects the result.
8. Store both extracted and corrected values, confidence and audit history.
9. Feed approved records into fuel and IFTA reporting.

OCR is probabilistic. Never silently accept a low-confidence gallon amount or state as a definitive accounting record. Keep the receipt image as supporting evidence.

## 12. Driver pay and settlements

The feature page describes compensation models such as percentage of revenue, per-mile, owner-operator and per-load/period settlements, with adjustments and deductions.

### Calculation model

Use a deterministic calculation service with versioned pay-plan rules. Inputs may include:
- Completed/delivered loads
- Revenue base (gross customer revenue or a defined subset)
- Percentage split or per-mile/per-load amount
- Bonuses, deductions, reimbursements and advances
- Effective dates for pay-plan changes
- Settlement period and approval state

Illustrative formula:

```text
gross_earnings = sum(load_pay_calculations)
adjustments = bonuses + reimbursements - deductions
net_settlement = gross_earnings + adjustments
```

This is illustrative, not a complete payroll/tax calculation. Rules need to define rounding, corrections, minimums, deductions and which loads count.

### Important controls

- Store money in integer cents and define rounding explicitly.
- Freeze or snapshot the rule inputs when a settlement is finalized.
- Keep each load and adjustment as a separate settlement line.
- Require permission to approve/finalize a settlement.
- Record who changed a pay plan and when it became effective.
- Make finalized settlements immutable; use a correction/reversal entry instead of silently editing history.
- Generate a downloadable paystub PDF from the finalized snapshot.
- Distinguish payroll calculations from tax withholding, contractor settlement and accounting exports; those have different legal implications.

### Payouts

The public feature page mentions optional Stripe payout integration. A similar product can use Stripe where the business model and supported country/recipient structure fit. Do not assume every Stripe product supports the exact payout flow required. A ledger, reconciliation process, webhook validation and dispute handling remain necessary.

## 13. Customer invoicing and payment tracking

An invoice module should track:
- Invoice number and legal entity
- Customer and bill-to details
- Load/vehicle lines
- Amount, currency, taxes/fees if applicable
- Issue date, due date and payment terms
- Status: draft, issued, partially paid, paid, void, overdue, disputed
- PDF snapshot and email delivery status
- Payment records and references

Separate “invoice marked paid” from “payment confirmed by processor.” Manual payment methods (check, ACH outside the platform, etc.) need an actor, date, amount and reference, plus an audit trail.

For online payments:
- Use hosted/tokenized payment entry.
- Verify webhooks and deduplicate provider event IDs.
- Reconcile provider settlements to internal invoices.
- Never store raw card details.
- Keep subscription billing for the software distinct from freight/customer/carrier financial records.

## 14. Broker load board and carrier network

The supplied broker copy describes a two-sided workflow: a broker posts a load, carriers request/bid, the broker accepts one, and the carrier's driver-generated documents flow back into the broker's record.

### Suggested flow

1. Broker creates a load with customer price, carrier pay target/limit, stops, dates and VINs.
2. Public marketplace representation hides sensitive customer details.
3. Eligible carriers see route summaries, vehicle details with masked VINs, pay and terms.
4. Carrier submits a request or bid.
5. Broker reviews authority/insurance status, history and rating.
6. Broker accepts a request, or auto-accept rules choose an eligible bid within a configured limit.
7. Booking transaction locks the load to one carrier.
8. Dispatch sheet/rate confirmation is generated and emailed.
9. Carrier's dispatch system receives the booked load.
10. Driver inspections, photos, signatures and BOL become available to authorized broker users.
11. Carrier invoice appears in payables; broker records or executes payment.
12. Analytics aggregates revenue, carrier cost and margin.

### Critical security rule: hide sensitive fields server-side

The broker copy says customer/street details and full VINs are hidden until booking. Implement this in API response shaping and authorization, not just by covering text with CSS.

Use separate DTOs/view models:
- `UnbookedCarrierLoadView`: allowed city/state/ZIP, dates, masked VIN, pay, terms.
- `BookedCarrierLoadView`: full operational details after confirmed booking.

Never send hidden customer details to the browser and rely on the UI to conceal them.

### Bidding and auto-accept concurrency

A load may receive several bids at once. Accepting a bid should be a database transaction that:
- Confirms load is still available.
- Confirms carrier is eligible and bid is valid.
- Applies auto-accept limit and other rules.
- Creates a unique booking.
- Changes load status.
- Records audit and outbox events.

Add a database constraint or locking strategy so two carriers cannot both win the same load. Auto-accept should have deterministic, auditable selection rules and a way to handle simultaneous requests.

### FMCSA authority and insurance

The page says the product presents FMCSA authority/insurance information. For a similar product, integrate appropriate official/licensed data sources and/or a compliance vendor, store retrieval timestamps, and recheck expiry/status. A cached status is not proof that insurance remains active now; show freshness and handle unavailable sources.

### Ratings

Store rating records tied to completed transactions, with anti-abuse rules, moderation and clear visibility. Do not allow unverified public ratings or reveal private review metadata to unauthorized users.

## 15. Realtime updates and notifications

The marketing demo shows a “LIVE” recent-activity feed. The real app describes live status updates, auto-refresh and push notifications.

### Recommended design

- Every important mutation creates an audit/domain event.
- The backend commits the business record and an outbox event in one transaction.
- A worker publishes events and performs side effects.
- Web dashboards receive WebSocket or Server-Sent Events updates; polling is acceptable for a simple MVP.
- Mobile push notifications use APNs/FCM or an equivalent provider.
- Push payloads should contain minimal sensitive data; the app fetches authorized details after opening.
- Notifications have delivery attempts, provider IDs, retries and deduplication.

Example events:
- `load.created`
- `assignment.changed`
- `driver.load_status_changed`
- `inspection.completed`
- `bol.generated`
- `settlement.finalized`
- `invoice.issued`
- `broker.bid_received`
- `booking.confirmed`
- `insurance.expiring`

An event-driven UI does not mean every operation needs a microservice. A modular backend plus a queue is usually enough initially.

## 16. Authentication, permissions and tenant isolation

A multi-company TMS has sensitive customer addresses, VINs, driver identity, location history, financial records, signatures and photos.

Security requirements:
- Secure session management or a managed identity provider.
- Email verification, password reset and MFA for administrators.
- Biometric unlock should protect a local session, not replace server authorization.
- Organization membership and role checks on every request.
- Resource-level access checks for every load, photo, invoice, settlement and document.
- Short-lived signed URLs for private files.
- TLS in transit and encryption at rest.
- Secrets in a secret manager.
- Rate limits on login, signup, VIN lookup, uploads and broker bidding.
- CSRF defenses where cookie sessions are used; XSS-safe rendering and CSP.
- File type/size checks, malware scanning and private quarantine.
- Audit logs for role changes, financial actions, data exports and admin overrides.
- Backups with tested restore procedures.
- Data retention/deletion policy for GPS, photos, signatures and financial documents.

Use tenant-aware queries and consider PostgreSQL Row-Level Security as defense in depth. Never treat a client-supplied `organization_id` as sufficient proof of access.

## 17. Suggested technology stack

This is a practical build recommendation, not a claim about Onulink's private stack.

| Layer | Recommended option | Why |
|---|---|---|
| Marketing site | Webflow or Next.js + CMS | SEO and quick content iteration |
| TMS web frontend | TypeScript + React/Next.js | Complex tables, boards and reusable components |
| Mobile app | React Native or Flutter | Shared iOS/Android code with native camera/GPS integrations |
| Backend API | TypeScript + NestJS/Fastify or Python + FastAPI | Typed API/domain logic |
| Main database | Managed PostgreSQL | Transactions and relational consistency |
| Geospatial | PostGIS | Location, route and jurisdiction queries |
| Local mobile DB | SQLite | Offline loads, inspections and sync queue |
| Cache/coordination | Redis where needed | Rate limits, cache, ephemeral coordination |
| Async jobs | Managed queue or Redis-backed worker | PDFs, OCR, email, push, webhook processing |
| Object storage | Private S3-compatible storage | Photos, BOLs, signatures, fuel receipts |
| Realtime | WebSockets or Server-Sent Events | Dashboard updates |
| Maps | Google Maps Platform or another licensed provider | Geocoding, maps, route display |
| Push notifications | APNs + FCM through a maintained SDK/service | Mobile alerts |
| Payments | Stripe or another suitable provider | Subscription billing and supported payment workflows |
| VIN decoding | Licensed/public decoder behind an adapter | Vehicle data |
| OCR | Cloud document AI or OCR engine | Fuel receipt extraction |
| Auth | Managed identity provider or mature framework | Sessions, MFA, account recovery |
| Monitoring | Error tracker + metrics + structured logs | Debugging and operational reliability |
| CI/CD | GitHub Actions or equivalent | Automated tests/deployments |
| Hosting | Managed app platform/cloud provider | Reduce server maintenance |

The website's logos alone do not prove which APIs are used in production or how deeply they are integrated.

## 18. Servers and deployment

You usually do not need physical servers for the first release.

Minimum production components:
1. DNS and TLS.
2. CDN/WAF.
3. Marketing frontend hosting.
4. TMS frontend hosting.
5. API application service.
6. Managed PostgreSQL and automated backups.
7. Private object storage.
8. Background worker and queue.
9. Push/email integration credentials in a secret manager.
10. Logs, error monitoring and uptime alerts.
11. Staging environment separated from production.

### Typical deployment flow

```text
Developer commit
    ↓
CI: lint + unit tests + type checks
    ↓
Build web/API/mobile artifacts
    ↓
Integration tests against temporary/test DB
    ↓
Deploy to staging
    ↓
Smoke tests and migration check
    ↓
Approved production deployment
    ↓
Health checks + metrics + rollback path
```

Use backward-compatible database migrations where possible because mobile clients may remain on older app versions for weeks. Version the API and maintain compatibility for the minimum supported app versions.

### Example monorepo

```text
onulink-like-tms/
  apps/
    marketing/
    web/
    driver-mobile/
    api/
    worker/
  packages/
    domain/
    api-contracts/
    ui/
    document-templates/
    mobile-sync/
    integrations/
      maps/
      payments/
      vin/
      ocr/
      notifications/
  database/
    migrations/
    seeds/
  infra/
  docs/
    architecture.md
    security.md
    runbooks/
  tests/
    integration/
    e2e/
```

## 19. API design examples

These are illustrative endpoints for a new product, **not Onulink's private routes**.

```text
POST   /api/loads
GET    /api/loads?status=in_transit
GET    /api/loads/:loadId
POST   /api/loads/:loadId/assignments
POST   /api/loads/:loadId/status-events

GET    /api/driver/me/loads
POST   /api/loads/:loadId/inspections
POST   /api/inspections/:inspectionId/media-upload-url
POST   /api/inspections/:inspectionId/signatures
POST   /api/mobile/sync

POST   /api/loads/:loadId/generate-bol
POST   /api/invoices
POST   /api/settlements/calculate
POST   /api/settlements/:id/finalize

POST   /api/broker/loads
POST   /api/broker/loads/:id/requests
POST   /api/broker/requests/:id/accept
POST   /api/broker/loads/:id/auto-accept-rules

POST   /api/webhooks/payments
POST   /api/webhooks/vin-or-compliance-provider
```

API conventions:
- Validate all inputs server-side.
- Use OpenAPI for documentation.
- Use idempotency keys for operations that can be retried.
- Use cursor pagination for large datasets.
- Include request/correlation IDs in logs and errors.
- Return consistent error codes.
- Do not return private fields before authorization has been checked.

## 20. Financial and subscription model

The product has at least two commercial concepts in the supplied copy: carrier TMS subscriptions and a broker plan. Keep these distinct.

### SaaS billing
- Plans, trial start/end, subscription status, billing customer ID.
- Included users/agents and any plan limits.
- Subscription invoice/payment status.
- Cancellation, failed-payment and grace-period rules.
- Webhook reconciliation with the billing provider.

### Freight operations money
- Customer invoice amount.
- Carrier pay.
- Broker revenue/cost/margin.
- Driver settlement and adjustments.
- Payment and reconciliation records.

Do not mix these into one generic `payments` table without a type and clear ledger semantics. A broker subscription charge is not the same thing as a carrier payout or a customer freight invoice.

### Margin calculations

Illustrative:

```text
gross_margin = customer_revenue - carrier_cost - directly_attributable_costs
margin_percent = gross_margin / customer_revenue
```

Define which fees, refunds, accessorial charges and adjustments are included. Handle zero revenue and currency differences explicitly. Store the calculation version and underlying amounts for auditability.

## 21. Analytics and reporting

Useful operational metrics:
- Loads by status and customer.
- On-time pickup/delivery.
- Driver utilization and completed loads.
- Revenue/cost/margin by lane, customer, carrier and agent.
- Unpaid invoices and payables due.
- Driver settlement exceptions.
- Fuel spend and mileage by state.
- Missing inspection photos or signatures.
- Stale GPS updates.
- Failed sync/upload queues.
- Broker bid acceptance and carrier performance.

Start with indexed SQL queries and summary tables. Add a warehouse/BI tool only when operational reporting becomes too expensive or complex for the transactional database. Keep tenant scoping in every report/export.

## 22. Testing and failure scenarios

Must-test scenarios include:
- Driver goes offline mid-inspection and returns hours later.
- The same photo/signature upload is retried multiple times.
- Dispatcher reassigns a load while the driver has stale cached data.
- Two dispatchers assign the same truck/driver simultaneously.
- Two carriers attempt to accept the same broker load.
- A push notification is delayed or never delivered.
- GPS permissions are denied or location data becomes stale.
- OCR reads the wrong fuel amount or state.
- VIN decoder is down or returns incomplete details.
- PDF generation succeeds but email delivery fails.
- A settlement is recalculated after it was finalized.
- Subscription webhook arrives twice or out of order.
- A user changes a load ID in the URL to access another tenant's document.

Use unit tests for calculations/state machines, integration tests for database/API, end-to-end tests for complete workflows, and device testing on real iOS/Android hardware. Test offline behavior explicitly; browser-only tests are not enough for a field app.

## 23. Build roadmap

### Phase 1 — Marketing and account foundations
- Public site, feature/pricing/FAQ pages.
- Authentication, organizations and roles.
- Trial/subscription lifecycle.
- Tenant-safe database and audit events.

### Phase 2 — Core TMS
- Customers, locations, trucks, drivers and vehicles.
- Loads, stops and assignments.
- Dispatch board and status transitions.
- CSV import and data validation.

### Phase 3 — Driver app
- Login and assigned loads.
- Offline local database and sync queue.
- VIN scan, inspection checklist, photo upload and signatures.
- BOL generation and push notifications.

### Phase 4 — Accounting and operations
- Customer invoices.
- Driver pay plans, settlements and paystub PDFs.
- Fuel receipts, OCR review and IFTA records.
- Audit trail and operational reports.

### Phase 5 — Broker product
- Broker signup and plan.
- Load board and direct offers.
- Bids, auto-accept, booking concurrency.
- Sensitive-field masking.
- Dispatch sheets, carrier invoices, payables and margins.
- Carrier authority/insurance data integration.

### Phase 6 — Optimization
- More robust route/IFTA calculation.
- Improved reporting and search.
- Reconciliation automation.
- Load testing, security review, backup drills and mobile reliability.

**Build in this order:** identity and tenant isolation → loads and assignments → mobile offline capture → documents → settlements/invoices → broker marketplace → advanced GPS/IFTA. The last few areas are expensive to get right and depend on clean core data.

## 24. Black-box inspection checklist

If you want to investigate the live site beyond the supplied copy:
1. Open browser developer tools and inspect the Network waterfall for HTML, JS, CSS, image, API and map requests.
2. Inspect public page source and asset domains to identify public-site hosting/CMS clues.
3. Observe signup and trial forms using only your own test account and permitted actions.
4. Test responsive layouts, navigation and client-side validation.
5. Inspect public app-store version notes for feature evolution.
6. For the mobile app, inspect only your own installed app's behavior and permissions; do not attempt to extract another user's data.
7. Check public DNS/TLS/CDN signals as clues, not proof of backend architecture.
8. Record each observation with confidence and alternative explanations.
9. Do not bypass authentication, access other tenants, scrape private APIs aggressively, or probe systems without authorization.

## 25. Final recommendation

To build a comparable platform, do not start by copying the marketing UI. Start by designing the domain model and the mobile synchronization rules.

The best first MVP is:
- Tenant-safe web app.
- Customers, drivers, trucks, vehicles and loads.
- Dispatch assignment and status history.
- Driver app with offline inspections, photos, signatures and VIN scan.
- Server-generated BOL.
- Basic invoice and driver settlement calculations.
- Notifications and audit events.

Then add IFTA-grade mileage, broker bidding/auto-accept, carrier compliance integrations and payment automation once the underlying records are reliable.

The single most important technical principle is: **the database and server enforce truth; the dashboard and driver app are clients that can disconnect, retry, or hold stale data.** Design for that from day one.

---

## Sources

1. Onulink homepage and supplied product copy — https://onulink.com/
2. Onulink features — https://onulink.com/features
3. Onulink preview — https://onulink.com/preview
4. Onulink pricing — https://onulink.com/pricing
5. Onulink plans/trial — https://onulink.com/plans
6. Onulink FAQ — https://onulink.com/faq
7. Onulink broker page — https://onulink.com/broker
8. Onulink broker signup — https://onulink.com/broker/signup
9. Onulink Driver on Google Play — https://play.google.com/store/apps/details?id=com.onulink.driver
10. Onulink Driver on Apple App Store — https://apps.apple.com/us/app/onulink-driver/id6798491334
11. Stripe documentation — https://docs.stripe.com/
12. Google Maps Platform — https://developers.google.com/maps
13. React Native documentation — https://reactnative.dev/docs/getting-started
14. Expo documentation — https://docs.expo.dev/
15. PostgreSQL documentation — https://www.postgresql.org/docs/
16. Apple Core Location — https://developer.apple.com/documentation/corelocation
17. Android location documentation — https://developer.android.com/develop/sensors-and-location/location
