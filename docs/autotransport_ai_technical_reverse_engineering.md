# AutoTransport AI — Technical Reverse-Engineering Report
**Research date:** 26 October 2026  
**Target:** `https://autotransportai.com/` and its public blog  
**Purpose:** Explain how to build a similar vehicle-shipping platform, including likely architecture, backend services, data models, workflows, integrations, and an implementation roadmap.

---

## 1. Executive summary

AutoTransport AI presents itself as a digital auto-transport broker/platform. Its public website describes a customer journey that includes:

1. Enter pickup/delivery locations and vehicle details.
2. Calculate an instant shipping quote.
3. Choose a transport/pickup option and book.
4. Save a payment method without charging immediately.
5. Find a licensed, insured carrier.
6. Charge the customer at pickup.
7. Track shipment progress and complete delivery.

The site also has a large SEO/content layer: service pages, route/city/state pages, pricing tables, FAQs, and a searchable blog. The provided page text advertises open and enclosed shipping, expedited pickup, optional third-party insurance, carrier verification, GPS tracking, and AI agents for quote, matching, tracking, support, and payment.

**Important limitation:** This is a black-box analysis of public pages and the two supplied text extractions, not access to the company’s source code, production database, private APIs, cloud account, or carrier contracts. Therefore, this report separates:
- **Observed:** stated in public website text or public terms.
- **Likely implementation:** a technically plausible way to implement the advertised behaviour.
- **Unverified:** the website does not publicly prove that a specific implementation exists or that every marketing claim is backed by a live integration.

Do not assume that the company uses the exact framework or infrastructure proposed below. The suggested stack is a practical implementation plan, not a claim about its actual stack.

## 2. What is visible from the website?

### Public product surface

The supplied homepage extraction describes:
- Instant quote and pricing by route.
- Open and enclosed transport.
- Vehicle size and operability adjustments.
- Standard versus expedited pickup.
- Booking with $0 charged at booking and payment at pickup.
- Carrier verification and insurance.
- Shipment tracking, status updates, and a shareable tracking ID.
- Customer support through email, chat, and SMS.
- Optional third-party shipper’s-interest insurance.
- Route, city, state, service and pricing pages.
- A blog/knowledge hub with category filters, search, pagination and article pages.

The supplied blog extraction shows article categories such as Cost & Pricing, How It Works, Scams & Consumer Protection, Route Guides, Audience Guides, Comparisons, Heavy Equipment, Industry Insider, AI & Technology and Operational FAQs. It shows article cards with titles, descriptions, reading-time estimates and dates, plus search and pagination.

### Publicly stated technical details

The website’s Terms of Service say the platform connects shippers with independent FMCSA-licensed motor carriers and does not physically transport vehicles itself. They describe quote pricing, carrier matching, GPS tracking and payment processing. The terms name Highway as the carrier verification provider and state that optional insurance is available through a partner. See the [official Terms of Service](https://autotransportai.com/terms).

An article on the site describes a possible industry stack involving a pricing engine, carrier matching, Highway verification, GPS integration, Stripe payments, customer communications and an API/MCP layer. This is useful context, but a company’s blog article is not proof that each component is deployed in production: [The API Stack Behind Modern Vehicle Transport Platforms](https://autotransportai.com/blog/api-stack-behind-vehicle-transport).

### Claims that need validation

The public pages are not perfectly consistent:
- The homepage text mentions approximately 25% extra for enclosed transport, inoperable vehicles, and expedited pickup in some sections; the pricing page uses different multipliers, including +30% for enclosed/inoperable and +35% for expedited.
- The homepage and FAQ/blog use different carrier-network counts, including 1,000+ and 5,000+.
- “Live GPS tracking” requires a real data source from the driver/carrier or a telematics provider. A map and a moving marker alone do not prove live GPS.
- “AI-powered pricing” could mean a conventional pricing formula with market-data inputs, an ML model, a rules engine, an LLM-assisted workflow, or a mixture. The phrase alone does not identify which one is used.
- The website’s claims about carrier vetting, insurance, no hidden fees and guaranteed quotes require operational, legal and partner-level validation.

**Practical lesson:** Reproduce the customer experience, but do not copy inconsistent numbers or promise integrations/features you have not implemented.

## 3. A plausible system architecture

A sensible implementation can start as a modular monolith and split into services only when there is a clear scaling or team-ownership reason.

```text
Customer / Admin / Carrier
          |
          v
 Web frontend (Next.js / React)
          |
          v
 Backend API (TypeScript / Node.js)
   |       |         |          |
   v       v         v          v
Pricing  Booking   Payments   Shipment workflow
engine   service   (Stripe)   + status history
   |       |         |          |
   +-------+---------+----------+
                   |
                   v
            PostgreSQL database
                   |
         +---------+----------+
         |         |          |
         v         v          v
       Queue     Object     Search/cache
    (jobs/events) storage   (optional)
         |
         v
 Background workers
    |       |        |         |
    v       v        v         v
 Carrier  Email/SMS  Tracking  Insurance
 APIs     provider   provider  provider
    |
    v
 Admin dashboard + audit logs + monitoring
```

### Recommended stack

| Layer | Practical choice | Why |
|---|---|---|
| Frontend and server rendering | Next.js + TypeScript | Landing pages, quote flow, SEO pages and logged-in dashboards in one codebase |
| UI | React, Tailwind CSS, accessible component library | Reusable forms, tables, cards, status timelines and responsive layouts |
| API | Next.js Route Handlers initially, or Fastify/NestJS as a separate API | Typed endpoints, validation, authentication and integration boundaries |
| Validation | Zod | Validate browser input and server-side payloads |
| Database | PostgreSQL | Relational data, transactional booking/payment workflows and reporting |
| ORM | Drizzle or Prisma | Typed database access and migrations |
| Authentication | Auth.js, Better Auth, or a managed provider | Customer/admin accounts and sessions |
| Payments | Stripe PaymentIntents + SetupIntents or Checkout setup mode | Collect and save payment credentials with explicit permission; charge later |
| Maps/routing | Mapbox or Google Maps Platform | Geocoding, road distance, route geometry and map display |
| Background jobs | BullMQ + Redis, or a managed queue | Carrier polling, email/SMS, webhooks, retries and scheduled work |
| File storage | S3-compatible object storage | Inspection photos, documents and insurance files |
| Email | Resend, Postmark or equivalent | Booking confirmations, receipts and shipment updates |
| SMS | Twilio or equivalent | Pickup reminders, verification and status notifications |
| Observability | Sentry + structured logs + uptime monitoring | Debugging, tracing failures and alerting |
| Hosting | Vercel for frontend; managed Node/API, database and queue as needed | Fast initial deployment without managing every server |

You do **not** need Kubernetes, a fleet of microservices, a custom AI model, or a vector database to build the first version. Start with a reliable application, relational data, a queue, and clear integration boundaries.

## 4. Frontend: pages and interactions

### Public website

Build reusable page templates rather than hand-coding every city and route page:
- Home/landing page.
- Quote calculator.
- How it works.
- Pricing and service-type pages.
- Carrier/insurance information.
- Route pages such as `/routes/california-to-texas`.
- City/state pages such as `/car-shipping/texas`.
- Blog index, category pages, search results, pagination and article pages.
- FAQ, terms, privacy and contact pages.

The homepage’s repeated calls to action should all lead to the same canonical quote flow, with analytics events attached.

### Quote form

Collect enough information to produce a quote:
- Pickup and delivery ZIP codes or addresses.
- Pickup and delivery coordinates after geocoding.
- Vehicle year, make, model, body/size class.
- Whether it runs and drives.
- Open or enclosed transport.
- Earliest pickup date and pickup-speed option.
- Contact details when needed.
- Any special handling requirements.

Use a multi-step form or one carefully designed form. Validate fields in the browser for usability and again on the server for correctness. Do not trust client-submitted prices, distances, or carrier eligibility.

### Blog and SEO implementation

A blog with hundreds of entries should be data-driven:
- Store articles as MDX/Markdown files or in a CMS.
- Use a stable slug, title, description, category, publication date, updated date, reading-time estimate and structured body.
- Implement category filtering, search and pagination on the server or through a search index.
- Generate canonical URLs, sitemap, robots rules, Open Graph metadata and Article/Breadcrumb structured data where appropriate.
- Use shared templates for city, state and route pages; avoid publishing thousands of near-duplicate, low-value pages.

The supplied blog text shows the intended UI and content taxonomy, but does not reveal the original CMS, framework, database, or hosting provider.

## 5. Backend modules

### 5.1 Quote service

The quote endpoint should accept validated shipment details, normalize them, calculate a route, query available market/carrier data, calculate a price, and persist a quote snapshot.

Example API:
- `POST /api/quotes` — calculate and create a quote.
- `GET /api/quotes/:id` — retrieve a saved quote.
- `POST /api/quotes/:id/refresh` — refresh if it is expired or market data changed.

Store the inputs, pricing breakdown, currency, validity window, pricing-engine version, and data timestamp. A quote should not silently change after booking. If it must change because of an input correction or market condition, create a new version and show the customer the reason.

### 5.2 Booking service

Example endpoints:
- `POST /api/bookings` — create booking from a valid quote.
- `GET /api/bookings/:id` — booking details.
- `POST /api/bookings/:id/cancel` — apply cancellation policy.
- `POST /api/bookings/:id/confirm-pickup` — authenticated operational action, not a public unauthenticated endpoint.

Use a database transaction to check quote validity, prevent duplicate booking, reserve the correct quote version, and create an order. Use idempotency keys for requests that may be retried.

### 5.3 Carrier service

A carrier record should contain:
- Legal name and business identifiers.
- USDOT/MC identifiers as applicable.
- Authority status and verification timestamps.
- Insurance policy metadata, coverage and expiry.
- Supported equipment/transport types.
- Service regions and operating constraints.
- Availability, contact channel and integration IDs.
- Quality, reliability and rejection/cancellation history.

Use an official/regulatory source and/or a licensed provider integration to verify status. Do not rely on a carrier’s self-reported checkbox alone. FMCSA describes operating-authority and insurance requirements; see its [insurance filing requirements](https://www.fmcsa.dot.gov/registration/insurance-filing-requirements) and [SAFER system](https://safer.fmcsa.dot.gov/).

The website names Highway as its carrier verification provider. If you want to use Highway, contact the provider for current API access, product coverage, pricing and contract terms. Do not assume an unrestricted public API exists.

### 5.4 Matching service

A first version can be a deterministic scoring algorithm, not an LLM:

```text
score(carrier, shipment) =
    route_fit             * weight_route
  + equipment_fit         * weight_equipment
  + pickup_availability   * weight_availability
  + insurance_compliance  * weight_compliance
  + reliability_score     * weight_reliability
  - expected_delay_penalty
  - price_penalty
```

First apply hard filters:
- Active operating authority.
- Required insurance and verification.
- Correct equipment.
- Pickup/delivery region coverage.
- Capacity and date compatibility.

Then rank eligible carriers by fit, expected pickup time, price, reliability and acceptance probability. Log why each carrier was considered or rejected. Give a human operator a way to review exceptions.

The matching process must have a real carrier data source and a dispatch workflow. An algorithm cannot match against a network that you do not actually have access to.

### 5.5 Shipment tracking

Create a normalized status model, for example:

`quoted → booked → searching_for_carrier → carrier_assigned → pickup_scheduled → picked_up → in_transit → delivered`

Also support exception states such as `cancelled`, `delayed`, `pickup_failed`, `delivery_exception` and `payment_failed`.

Store every status change as an append-only event with:
- Shipment ID.
- Previous and new status.
- Timestamp and source.
- Actor or integration ID.
- Optional location, coordinates, note and evidence attachment.

Possible tracking data sources:
1. Carrier API/webhooks.
2. Driver app that sends authenticated location updates.
3. Telematics/GPS provider.
4. Manual dispatcher updates as a fallback.

If there is no real GPS feed, display “last reported status/location” and its timestamp. Do not label estimated or manually updated data as live GPS.

## 6. Pricing engine: the most important logic

The public site says price depends on route/distance, vehicle size, open versus enclosed transport, operability, pickup speed, seasonality and carrier capacity. That suggests a pricing engine with structured inputs and market data. It does not prove the use of a trained ML model.

### Phase 1: rules-based pricing

Start with a transparent formula:

```text
base_transport_cost = market_lane_rate(route, date, equipment)
vehicle_adjustment  = vehicle_class_modifier
equipment_adjustment = transport_type_modifier
operability_adjustment = running_status_modifier
speed_adjustment = pickup_speed_modifier
season_adjustment = seasonal_capacity_modifier

customer_total =
  base_transport_cost
  + vehicle_adjustment
  + equipment_adjustment
  + operability_adjustment
  + speed_adjustment
  + service_fee
  + optional_insurance
```

Prefer percentage multipliers or fixed adjustments that are explicitly documented and versioned. Avoid hardcoding random price-per-mile values as if they were real market rates. A distance-based fallback is useful for a demo, but a production quote needs current lane rates, supply/capacity signals, carrier acceptance and operational costs.

The site’s own pages show inconsistent modifiers, so treat the formula above as an architecture example, not a reproduction of its exact price calculation.

### Phase 2: collect real quote and outcome data

For each quote/order, store:
- Route and distance.
- Vehicle and transport options.
- Date/season and lead time.
- Initial quote and quote version.
- Carrier offers and acceptance/rejection.
- Final carrier payout and customer total.
- Time to carrier assignment and pickup.
- Cancellation, delay and delivery outcome.
- Reason for price override.

This creates a useful dataset for improving prices.

### Phase 3: ML, if data supports it

Potential models:
- Regression/gradient-boosted trees to estimate market price or carrier acceptance.
- A calibrated model for expected pickup delay.
- Ranking model for carrier matching.
- Time-series features for lane-level supply and seasonality.

Evaluate using time-based holdouts, route-level error, price acceptance, carrier acceptance, cancellation rate and margin. Compare against a simple baseline. Keep hard compliance rules outside the model. Do not let an LLM invent a price.

## 7. Route distance and map

A mapping provider can geocode ZIP codes/addresses into coordinates and return road distance, duration and route geometry. Mapbox’s Directions API documents driving-route calculations and route geometry: [Mapbox Directions API](https://docs.mapbox.com/api/navigation/directions/).

Example flow:
1. Validate pickup and delivery input.
2. Geocode each location.
3. Request road route/distance.
4. Cache results by normalized origin/destination and relevant route settings.
5. Store the provider, timestamp, distance and route version with the quote.
6. Render the route geometry on the frontend.

For a US car-shipping MVP, ZIP-centroid distance can work as a rough fallback, but it is not equivalent to truck-accessible road mileage. Add exceptions for inaccessible pickup locations, rural routes, vehicle dimensions and loading constraints where appropriate.

## 8. Payments: “$0 today, charge at pickup”

This is a workflow and compliance problem, not simply a payment button.

The website’s terms state that no payment is due at booking and that the customer is charged after physical pickup. A technically plausible Stripe implementation is:
1. Create or retrieve a Stripe Customer.
2. Use a **SetupIntent** or Checkout setup mode to collect and save the payment method without charging immediately.
3. Clearly explain the future charge, amount, trigger and cancellation policy; collect the necessary customer consent.
4. Save Stripe customer/payment-method IDs, not raw card numbers.
5. When an authorized pickup event is confirmed, create and confirm a PaymentIntent for the agreed amount, using the saved method.
6. Process Stripe webhooks to update payment status.
7. If off-session payment fails or authentication is required, notify the customer and route the case to a safe recovery flow.

Stripe explains that SetupIntents save payment credentials for future payments without an immediate charge: [Stripe SetupIntents documentation](https://docs.stripe.com/api/setup_intents). Off-session payments can fail or require customer authentication, so the system must handle that case rather than assuming every later charge succeeds.

**Critical design rule:** Do not charge based only on a browser button or an unverified webhook. Verify the pickup event from an authenticated, auditable operational source, check the booking and payment state, and make the charge idempotent. Keep a clear audit trail. If the pickup signal is disputed, require an operational review.

Also distinguish:
- The amount charged to the customer.
- Carrier payout.
- Platform/service fee.
- Optional insurance premium.
- Refunds, disputes and chargebacks.

Those may have different recipients and settlement rules. Consult a payments/legal professional before launching a real deferred-charge model.

## 9. Insurance, legal and operational boundaries

The site describes carrier cargo insurance and optional third-party shipper’s-interest coverage. These are separate concepts and should be represented separately in the product:
- Carrier policy and coverage verification.
- Optional policy quote/eligibility.
- Policy terms, exclusions, deductible and certificate.
- Claims contact and claim status.

Do not write your own policy wording or imply that the platform itself is an insurer. Obtain an agreement with an appropriately licensed insurance partner and display the actual policy terms. Verify regulatory requirements for the role your business plays (broker, carrier, marketplace, technology provider) in every relevant jurisdiction.

Likewise, a “verified carrier” badge should be backed by stored evidence, timestamps and refresh logic. Verification expires; it is not a one-time UI label.

## 10. AI agents: where they actually help

The site markets separate agents for quoting, carrier matching, tracking, support and carrier payment. You can implement these as ordinary modules/workflows first, then use AI selectively.

| Agent/workflow | Reliable implementation | Appropriate AI use |
|---|---|---|
| Quote | Deterministic pricing service + market data | Explain a pricing breakdown; parse customer-provided details |
| Carrier matching | Eligibility filters + scoring/ranking | Summarize trade-offs for a human dispatcher |
| Tracking | Events/webhooks/polling + status database | Explain status and next steps from verified events |
| Customer support | Retrieval over policies and order data | Draft answers; classify and route cases |
| Carrier payment | Accounting rules + payment/settlement integration | Extract fields from documents, flag anomalies |
| Operations assistant | Role-based internal tools | Summarize exceptions and recommend next action |

**Never let an LLM be the authority for a price, insurance status, payment capture, carrier compliance or shipment location.** Those should come from validated records and deterministic services. AI can interpret, summarize and help operators; privileged actions need authorization, audit logs and confirmation rules.

A tool-using agent should have narrow tools such as `get_shipment_status`, `get_quote_breakdown` or `draft_customer_update`. A tool that charges a card or cancels a shipment must enforce permissions and state transitions server-side.

## 11. Blog/content data model

For a blog with categories, search, pagination and article pages, a minimal schema might include:

```text
Article
- id
- slug (unique)
- title
- description
- body (MDX/Markdown or CMS reference)
- category_id
- status (draft/published/archived)
- published_at
- updated_at
- author_id
- reading_time_minutes
- canonical_url (optional)

Category
- id
- slug (unique)
- name
- description

ArticleTag
- article_id
- tag_id
```

For large collections, index slug, status, publication date and category. Use PostgreSQL full-text search initially; add a dedicated search service only if needed. Generate static pages for stable content and revalidate when an article changes.

For route/city SEO pages, generate from real route/service data and unique helpful content. Avoid creating pages whose only difference is swapped city names.

## 12. Suggested database schema

A first production-minded schema might include:

```text
users
customers
vehicles
locations
quotes
quote_versions
bookings
carriers
carrier_verifications
carrier_insurance_policies
carrier_offers
shipment_assignments
shipments
shipment_events
inspection_reports
inspection_photos
payment_records
refunds
insurance_policies
support_conversations
notifications
webhook_events
audit_logs
articles
categories
```

Important relationships:
- A customer can own many vehicles and create many quotes/bookings.
- A quote can have multiple versions; a booking references the accepted version.
- A booking has one shipment, with one or more assignment attempts.
- A shipment has many append-only status events.
- Payment records are separate from shipment state.
- Carrier verification records have timestamps and evidence.
- Webhook events have provider IDs and idempotency keys.

Use database constraints for unique IDs and valid relationships. For money, use integer minor units (cents) or a carefully designed decimal type—never floating-point arithmetic. Store currency explicitly.

## 13. API contract sketch

Illustrative endpoints:

```http
POST   /api/quotes
GET    /api/quotes/:quoteId
POST   /api/quotes/:quoteId/refresh

POST   /api/bookings
GET    /api/bookings/:bookingId
POST   /api/bookings/:bookingId/cancel

GET    /api/shipments/:shipmentId
GET    /api/shipments/:shipmentId/events

POST   /api/webhooks/stripe
POST   /api/webhooks/carriers/:provider

GET    /api/admin/shipments
POST   /api/admin/shipments/:shipmentId/assign-carrier
POST   /api/admin/shipments/:shipmentId/confirm-pickup
POST   /api/admin/carriers/:carrierId/reverify
```

Security rules:
- Validate all inputs with Zod or equivalent.
- Authenticate and authorize every private/admin endpoint.
- Never expose secret API keys to the browser.
- Verify webhook signatures.
- Use idempotency keys for booking/payment operations.
- Rate-limit public quote endpoints and protect against spam.
- Log sensitive actions with actor, timestamp and reason.
- Avoid logging card details, full addresses or other sensitive data unnecessarily.

## 14. Background jobs and event-driven workflow

Use a queue for tasks that should survive process restarts and be retried:
- Send quote/booking confirmation.
- Re-check carrier verification and insurance expiry.
- Request or poll carrier availability.
- Notify dispatchers when a booking is unmatched.
- Poll tracking providers when webhooks are unavailable.
- Send pickup reminders.
- Process payment events and reconcile failed charges.
- Generate receipts and inspection documents.
- Notify customers when shipment status changes.

A queue worker should be idempotent. Record each event/job ID, retry transient errors with backoff, dead-letter persistent failures, and provide an admin way to inspect and replay safe jobs.

For payments, use a database-backed state machine plus provider webhooks; do not rely on queue delivery order alone.

## 15. Security and reliability checklist

- HTTPS everywhere; secure cookies and sensible session expiration.
- Role-based access control for customers, support, dispatch, finance and admins.
- Encrypt secrets using a managed secret store; rotate keys.
- Keep card data with the payment provider; never store PAN/CVV.
- Validate provider webhook signatures and reject replayed events.
- Add request idempotency and database constraints to prevent duplicate charges/bookings.
- Back up PostgreSQL and test restoration.
- Keep audit logs for quote overrides, carrier assignment, pickup confirmation, cancellation and payment capture.
- Limit access to inspection photos, addresses and documents.
- Define data retention/deletion rules and privacy disclosures.
- Add monitoring for failed quote generation, unassigned bookings, stale tracking, expired insurance and failed payments.
- Provide a human escalation path for safety, damage, cancellation and payment disputes.

## 16. Build roadmap

### Phase 0 — Validate the business (before coding deeply)
- Confirm whether you are a broker, marketplace or software-only platform.
- Obtain real carrier/market-data access and understand contracts.
- Validate insurance and payment flow with qualified providers.
- Decide who handles dispatch, customer support, disputes and refunds.

### Phase 1 — Website and quote MVP
- Build the landing page and responsive quote form.
- Add geocoding/road distance.
- Implement a rules-based quote engine with clearly labelled estimates.
- Save quote versions in PostgreSQL.
- Add email confirmation and admin quote lookup.
- Build blog and route pages using templates.

### Phase 2 — Booking and payments
- Create bookings from valid quotes.
- Implement customer consent and payment-method setup.
- Add Stripe webhook handling, failed-payment recovery and audit logs.
- Implement cancellation and refund workflows.
- Do not claim the “charge at pickup” experience until the full flow is tested end to end.

### Phase 3 — Carrier operations
- Integrate a legitimate carrier verification/data source.
- Build carrier profiles, verification expiry and availability.
- Implement manual carrier assignment first.
- Add carrier acceptance/rejection and dispatch dashboard.
- Record inspection documents and shipment status events.

### Phase 4 — Tracking and notifications
- Integrate actual carrier/driver location data.
- Add tracking timeline and shareable, access-controlled tracking links.
- Add email/SMS notifications and exception handling.
- Display the timestamp/source of the latest location update.

### Phase 5 — Automation and intelligence
- Add matching scores once you have enough operational data.
- Add quote-quality and carrier-acceptance analytics.
- Use AI for customer support drafts and dispatcher summaries.
- Introduce ML only after collecting sufficient high-quality outcomes and measuring against a baseline.

### Phase 6 — Production readiness
- Load and abuse testing, security review and backup restoration test.
- Payment and webhook failure simulations.
- Legal/privacy review and provider contracts.
- Operational playbooks for no carrier found, pickup missed, vehicle damaged, delivery delayed, card declined and customer cancellation.

## 17. What to build first if you are a solo engineer

Build the **thin vertical slice**, not every advertised feature:

1. Next.js + TypeScript + Tailwind.
2. PostgreSQL with users, quotes, bookings and shipment events.
3. One quote form with ZIP-code geocoding and route distance.
4. A transparent rules-based price estimator.
5. Admin dashboard to view quotes and manually assign a carrier.
6. Email notifications.
7. A simulated shipment timeline for development only, clearly marked as demo data.
8. Real payment integration in test mode.
9. Real carrier/verification integration only after commercial access is secured.

This validates the user journey without pretending you have a national carrier network or live GPS. A demo can show the architecture; a real logistics business needs contracts, operational coverage, compliance, and reliable data.

## 18. What cannot be determined from the public website

Without source code, authenticated browser inspection, network traces, DNS/hosting evidence, or vendor access, this review cannot confirm:
- The exact frontend framework, CSS framework, CMS or hosting provider.
- The database, server language, queue or cloud topology.
- Whether “AI pricing” is a formula, a model, or a combination.
- Whether carrier matching is automated or human-assisted.
- Which provider supplies live GPS and whether tracking is truly live.
- Whether every carrier claim, network size and insurance statement is current.
- Whether the quote/booking/payment flow is fully operational in every case.
- The existence, shape or security of any private API.

The right next step for a deeper black-box review is to inspect the live quote flow in a browser, document each field and transition, and observe only the public browser-visible network requests. That can reveal request/response shapes and third-party services, but not private backend code or secrets. Do not attempt to bypass authentication or access controls.

## 19. Research references

1. AutoTransport AI homepage — https://autotransportai.com/
2. AutoTransport AI Terms of Service — https://autotransportai.com/terms
3. AutoTransport AI pricing page — https://autotransportai.com/pricing
4. AutoTransport AI technical article — https://autotransportai.com/blog/api-stack-behind-vehicle-transport
5. Stripe SetupIntents API — https://docs.stripe.com/api/setup_intents
6. Stripe guide to saving payment methods — https://support.stripe.com/questions/saving-payment-methods-for-subscriptions-after-strong-customer-authentication-%28sca%29-regulations-take-effect?locale=en-GB
7. FMCSA insurance filing requirements — https://www.fmcsa.dot.gov/registration/insurance-filing-requirements
8. FMCSA SAFER — https://safer.fmcsa.dot.gov/
9. Mapbox Directions API — https://docs.mapbox.com/api/navigation/directions/

---

## Final recommendation

The website is best understood as **three products combined**:

1. **Marketing/SEO website** — landing pages, pricing explanations, route pages and a large content library.
2. **Transactional marketplace** — quote, booking, payment, carrier verification, assignment and shipment state.
3. **Operations platform** — dispatch tools, support, carrier data, inspections, tracking, exceptions and reconciliation.

The first layer is relatively straightforward. The second and third layers are the real engineering and business challenge. Build them around auditable state transitions, real external data, explicit payment consent, and human handling of exceptions. Add “AI” only where it improves a measured workflow.
