# TruckTA Technical Reverse-Engineering Report
**Target:** https://www.truckta.com/  
**Research date:** 26 October 2026  
**Purpose:** Explain how TruckTA's public-facing product appears to work, infer a plausible implementation architecture, and provide a practical blueprint for building a comparable system.

> **Evidence labels**
> - **Publicly documented:** explicitly described on TruckTA's public website, help/product pages, or app-store listing.
> - **Engineering inference:** a plausible implementation based on the visible behavior. It is not confirmation of TruckTA's private code, vendors, cloud provider, database, or internal architecture.
> - **Build recommendation:** one practical way to implement a similar product from scratch.

---

## 1. Executive summary

TruckTA is a vertical SaaS transportation-management system (TMS) for car-hauling companies and some freight carriers. It is not primarily a load marketplace. Its core idea is to keep one canonical load record connected to dispatch, drivers, vehicles, documents, invoicing, driver pay, owner settlements, compliance, and reporting.

The product is best understood as several role-specific applications over a shared operational data model:

1. **Dispatch web app:** a live Active Board organized by driver, truck, trailer, date, trailer capacity, assigned loads, and exceptions.
2. **Driver mobile app:** assigned loads, routes, status transitions, VINs, photos, vehicle inspections, electronic bills of lading (eBOL), documents, optional pay summaries, and consent-based location sharing.
3. **Finance center:** accounts receivable, invoice and payment recording, payment aging, driver settlements, owner statements, exports, and audit history.
4. **Owner portal:** restricted views of a fleet's trucks, trailers, drivers, loads, map, documents, and settlement statements.
5. **Compliance center:** document expiry reminders, maintenance and safety records, FMCSA company checks, audit-readiness scoring, and report packets.
6. **Imports and integrations:** CSV/Excel, rate-confirmation PDFs, a Chrome extension for supported load-board pages, read-only email ingestion, Airtable, fuel statements, Super Dispatch, RingCentral, ELD/telematics providers, and other tools.
7. **AI assistance:** optional document-to-load extraction, operational Q&A, and AI-assisted dispatch features. The website describes these as review-first rather than autonomous booking.

**Important limitation:** TruckTA does not publicly disclose enough to assert its exact application framework, database, cloud provider, backend language, hosting topology, or realtime transport. The implementation recommendations below are not claims about its private stack.

---

## 2. What was inspected

Primary public sources:
- Homepage: https://www.truckta.com/
- Dispatch / Active Board: https://www.truckta.com/product/dispatch
- Driver app: https://www.truckta.com/product/driver-app
- Finance: https://www.truckta.com/product/finance
- Live map: https://www.truckta.com/product/live-map
- Imports and integrations: https://www.truckta.com/product/imports-integrations
- FMCSA Company Check: https://www.truckta.com/solutions/fmcsa-company-check
- Drivers solution: https://www.truckta.com/solutions/drivers
- Privacy policy: https://www.truckta.com/privacy-policy
- Driver location privacy: https://www.truckta.com/drive-privacy
- Google Play listing: https://play.google.com/store/apps/details?id=com.truckta.mobile

The supplied page text also describes role-specific solution pages, compliance/audit readiness, pricing by active trucks, and workflow details.

### Evidence quality

The strongest evidence is the behavior described directly on product pages, including:
- a load moving through dispatch, pickup, delivery, invoicing, and settlement;
- realtime board updates and draft-conflict handling;
- server-side fleet scoping for owner accounts;
- weak-network retry behavior in the driver app;
- explicit rules for payment stages and immutable saved settlements;
- review-before-save imports;
- FMCSA data sources and freshness behavior;
- consent and retention limits for location data.

Public product pages are marketing and documentation, not source code. Screenshots and feature descriptions establish product behavior but cannot prove the underlying technology.

---

## 3. Product architecture: one shared load record

The central design decision is that a load is not copied into separate dispatch, driver, and finance systems. Those parts of the product reference the same load and related records.

### Example lifecycle

```text
Load created/imported
        |
        v
Unassigned
        |
        | dispatcher assigns driver + truck + trailer
        v
Assigned / Ready for pickup
        |
        | driver scans VINs, inspects vehicles, records pickup
        v
Picked up / In transit
        |
        | driver records delivery + proof of delivery
        v
Delivered
        |
        | finance records invoice or collection
        v
Invoiced / Awaiting payment / Partially paid / Paid
        |
        +--------------------+
        |                    |
        v                    v
Driver settlement       Fleet-owner statement
```

Exact status names differ by workflow and payment terms. TruckTA's public pages state that stages are calculated from recorded events, not simply selected manually. Some cash-on-pickup (COP) and cash-on-delivery (COD) loads skip the ordinary invoice stage.

### Why this matters technically

A shared record reduces duplicate data entry and disagreement between teams. It requires careful domain modeling:

- Load status and payment status should be separate state machines.
- Driver status changes must update the canonical load, not create a shadow copy.
- Documents must be attached to the relevant load, vehicle, driver, or company record.
- Settlement statements need snapshots so old statements do not silently change when a load is edited later.
- Every write needs company-level authorization, field-level permission checks, validation, and an audit event.
- Realtime UI updates must not bypass server validation or conflict handling.

### Suggested core entities

| Entity | Purpose |
|---|---|
| `Company` | Tenant/account and company-level settings |
| `User` | Login identity and company membership |
| `Role` / `Permission` | Authorization rules for each action |
| `DriverProfile` | Driver identity, preferences, status, and pay configuration |
| `Truck` | Tractor/truck metadata, capacity, identifiers, maintenance |
| `Trailer` | Trailer metadata and vehicle-slot capacity |
| `DriverTruckAssignment` | Effective-dated link between a driver and truck |
| `Load` | Canonical shipment/work record, route, terms, status |
| `LoadStop` | Ordered pickup, delivery, warehouse, and other stops |
| `LoadVehicle` | Vehicle details, VIN, position/slot, inspection status |
| `LoadAssignment` | Driver, truck, trailer, dates, assignment history |
| `Document` | File metadata, ownership, classification, expiry, review state |
| `Inspection` | Pickup/delivery inspection and answers |
| `InspectionPhoto` | Photo references and annotations |
| `ElectronicBillOfLading` | Signed BOL data, PDF and signature evidence |
| `Invoice` | Invoice number, amount, issue date, method, status |
| `Payment` | Recorded collection, amount, date, method, reference |
| `DriverSettlement` | Weekly frozen driver-pay statement |
| `SettlementLine` | Load pay, deduction, adjustment, or reimbursement |
| `OwnerSettlement` | Fleet owner's share and deductions |
| `RecurringChargeRule` | Weekly/monthly/per-settlement fees |
| `LocationPoint` | Time-stamped driver/device location, subject to retention |
| `ComplianceCheck` | FMCSA check results, sources, timestamps |
| `IntegrationConnection` | OAuth/API credentials and sync configuration |
| `ImportJob` / `ImportRow` | Preview, validation, errors, and execution state |
| `AuditEvent` | Append-only record of sensitive changes |

Use stable IDs (UUIDs or ULIDs), timestamps, soft deletion where appropriate, and explicit tenant ownership. Do not use a company name or email address as a primary key.

---

## 4. Dispatch Active Board

### Publicly documented behavior

TruckTA's Active Board groups active work by driver and shows planning cards for today and delivery days. The board exposes:
- active and unassigned loads;
- trailer capacity (“spots”) and vehicles already picked up;
- load assignment by click or drag-and-drop;
- warnings for over-capacity, missing dates, or unavailable drivers;
- problem loads;
- invoice/payment queues;
- changes from other dispatchers without a page refresh;
- conflict handling that preserves a user's draft rather than silently overwriting it.

The product describes warnings as confirmation prompts, not always hard blockers. Booking and assignment still require a human decision.

### Plausible implementation

**Frontend**
- React/TypeScript SPA or app-router web application.
- A board composed of driver rows, date cards, load cards, filters, status chips, and drawers/modals.
- Drag-and-drop via a library such as dnd-kit.
- Server-driven pagination/virtualization if the board can contain many loads.
- Local draft state for edits; server version numbers for conflict detection.

**Backend**
- A load/dispatch domain service validates assignment.
- Capacity calculations derive vehicles assigned to a trailer/day, accounting for delivery dates and multi-stop loads.
- A command such as `assignLoad` performs authorization, validation, database updates, and emits an event.
- An optimistic concurrency token (e.g. `version` integer) prevents stale writes.

Example:

```http
POST /api/loads/TA-5126/assignment
Content-Type: application/json

{
  "driverId": "drv_123",
  "truckId": "truck_103",
  "trailerId": "trl_109",
  "expectedVersion": 12
}
```

Response on a stale draft:

```http
409 Conflict
```

```json
{
  "code": "LOAD_VERSION_CONFLICT",
  "message": "This load changed while you were editing it.",
  "currentVersion": 13,
  "allowedActions": ["compare", "reapply", "use_latest"]
}
```

**Realtime**
A plausible solution is WebSockets, Server-Sent Events (SSE), or a managed realtime service. The page's “no refresh” behavior does not reveal which one is used.

Recommended event flow:

```text
Browser command
   -> API validates permissions and state
   -> database transaction commits
   -> outbox event is written
   -> event worker publishes LoadAssigned
   -> connected boards receive event
   -> clients invalidate/update affected queries
```

Use a transactional outbox so the database commit and event publication cannot easily drift apart. Clients should refetch authoritative data after reconnecting.

### Capacity logic

For a basic car-hauling product:

```text
available_spots(trailer, delivery_date)
  = trailer.capacity
  - count(vehicles assigned to that trailer whose load overlaps that date)
```

A production system must define how it handles:
- a load with multiple vehicles;
- partial pickup/delivery;
- a trailer with different usable capacities;
- overlapping routes and intermediate stops;
- a driver or truck being unavailable;
- assignments changed after pickup;
- warnings versus prohibited actions.

Do not treat capacity as a simple count of load records: one load can carry multiple vehicles.

---

## 5. Driver mobile app

### Publicly documented behavior

The TruckTA Driver App is available for iOS and Android. Company admins invite drivers and control what they can see and change. The app can display assigned loads, stops, vehicles and VINs, pickup/delivery windows, documents, pay summaries, and push notifications. With the appropriate company settings, drivers can complete guided vehicle inspections, mark damage, capture photos, collect customer signatures, and generate an electronic BOL.

The public description says the app retries status updates and uploads after weak connectivity without creating duplicate pickup/delivery records. Location sharing starts only after driver consent and OS permissions. The public Google Play listing reports encrypted data in transit and identifies location and personal information among collected/shared data categories.

### Build recommendation

**Mobile framework**
- React Native + TypeScript, or Flutter. Either can support iOS/Android.
- Native modules may be needed for background location, camera/scanning, push notifications, and platform-specific background execution.
- Google Maps navigation is documented; truck-aware routing should be implemented with a provider/API that supports vehicle dimensions and weight, not ordinary car directions alone.

**Offline-first mutation queue**
1. Driver taps “Mark picked up.”
2. App validates the local form and creates a UUID idempotency key.
3. App writes a pending command to local persistent storage.
4. UI displays pending/syncing state.
5. A background worker submits the command when online.
6. Server deduplicates by idempotency key and validates the current state.
7. App receives the canonical result and clears the pending item.
8. If rejected, app shows the reason and offers a safe recovery path.

Example:

```json
{
  "idempotencyKey": "01J...ULID",
  "loadId": "load_123",
  "eventType": "PICKUP_CONFIRMED",
  "occurredAt": "2026-10-26T09:15:00Z",
  "payload": {
    "vehicleIds": ["veh_1", "veh_2"],
    "inspectionId": "insp_456"
  }
}
```

The server should store idempotency keys and response results. Merely disabling the button after one tap is not enough: the app can retry after a timeout even when the server processed the original request.

### Inspection and eBOL pipeline

```text
Driver selects load/vehicle
   -> scan VIN (barcode/OCR fallback)
   -> confirm vehicle identity
   -> guided walk-around photos
   -> damage markers/notes
   -> customer signs on screen
   -> generate immutable inspection/BOL record
   -> render PDF and attach to load
   -> notify office/customer if configured
```

Store the original image, timestamp, uploader, load/vehicle association, and processing metadata. If images are enhanced or cropped, preserve originals and label derived versions. For signatures, store the signer name/context, signed document hash, timestamp, and consent evidence as appropriate. A drawn signature alone is not a complete legal audit trail.

### Notifications

Use APNs for iOS and FCM for Android, or a cross-platform provider. Keep notifications small and avoid sensitive load/customer information on lock screens by default. Notifications should be treated as hints; the app must fetch the latest authorized record when opened.

---

## 6. Documents, file storage, and expiry workflows

TruckTA documents include rate confirmations, bills of lading, proof of delivery, inspections, driver medical cards/licenses, insurance, registrations, maintenance, accident records, and compliance material.

### Recommended architecture

- Store file bytes in object storage (e.g. S3-compatible storage or a cloud object store).
- Store metadata and access rules in PostgreSQL.
- Upload with short-lived signed URLs; never make sensitive driver documents public.
- Run antivirus/file-type validation before making a document available to other users.
- Use background workers for PDF rendering, OCR, thumbnails, expiry reminders, and ZIP packet generation.
- Use immutable versions or an explicit archive history for replaced documents.

A metadata table might include:

```sql
CREATE TABLE documents (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL,
  owner_type text NOT NULL,
  owner_id uuid NOT NULL,
  document_type text NOT NULL,
  object_key text NOT NULL,
  original_filename text,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL,
  expires_on date,
  review_status text NOT NULL DEFAULT 'pending',
  uploaded_by uuid NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Add database constraints and authorization checks; the polymorphic `owner_type/owner_id` pattern needs careful referential-integrity handling. For stricter integrity, use separate foreign-key columns or a dedicated document-owner relation.

### Expiration jobs

Use a scheduled worker that:
1. selects active documents approaching their configured reminder threshold;
2. checks whether a reminder for that threshold has already been sent;
3. sends in-app/email/push notifications;
4. records delivery attempts;
5. marks expired documents for attention.

Make reminder rules configurable per document type. Avoid sending the same reminder repeatedly every time the job runs.

### Audit readiness

A readiness score should be derived from a versioned checklist of requirements, not stored as an unexplained magic number. Each requirement needs status, evidence links, last checked time, and reason. Export a ZIP containing selected files plus a manifest of included documents, timestamps, and missing items. State clearly that software-organized records are not a legal certification.

---

## 7. Finance, invoices, payments, and settlements

### Publicly documented behavior

TruckTA's finance pages describe:
- a receivable/payment lifecycle from “Ready to Invoice” through invoiced, partially paid, and paid, plus exception states;
- invoice and payment recording from the load or finance center;
- rejection of overpayments;
- payment corrections/reversals that preserve history;
- aging reports and CSV/Excel exports;
- weekly driver settlements;
- fleet-owner settlements with recurring deductions;
- draft → approved → paid settlement workflow;
- frozen statements after save;
- separate permissions for viewing and editing payment information.

TruckTA explicitly says it records payments and payouts but does not move money. Therefore, “Mark paid” is a record of an external payment made through a bank or payment app, not a transfer initiated by TruckTA.

### Keep operational status and financial status separate

Recommended load fields:

```text
operational_status:
  unassigned | assigned | picked_up | in_transit | delivered | canceled

receivable_status:
  not_due | ready_to_invoice | invoiced | partially_paid | paid
  | on_hold | disputed | written_off | not_billable
```

Actual enums should reflect the product's full business rules. Avoid one overloaded `status` column.

### Payment ledger

For a simple first version, record each payment as an immutable transaction row and calculate balance as:

```text
outstanding_balance = invoice_total - sum(valid recorded payments) - valid credits
```

For stronger accounting controls, use a double-entry ledger with balanced journal entries and explicit reversals. Never silently overwrite a payment to “fix” it. A correction should reference the original transaction and create an auditable adjustment/reversal.

### Driver settlement formula

```text
net_driver_pay = gross_driver_pay - deductions + adjustments
```

Driver pay can be configured as:
- percentage of gross per delivered load;
- flat fee per delivered load;
- flat salary;
- other explicitly modeled pay rules.

A settlement should snapshot the source load lines, rates, deductions, adjustments, and totals at approval. After approval, changes should require a controlled correction or new settlement—not a silent recalculation.

### Owner settlement formula

```text
net_to_owner = gross - driver_pay - deductions + adjustments
```

Recurring fees (insurance, trailer rent, dispatch fee) need effective dates, frequency, scope, calculation method, and a record of each applied charge. Prevent duplicate application if a settlement job is retried.

### Example SQL structure

```sql
CREATE TABLE payments (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL,
  load_id uuid NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency char(3) NOT NULL DEFAULT 'USD',
  collected_at timestamptz NOT NULL,
  method text NOT NULL,
  external_reference text,
  recorded_by uuid NOT NULL,
  reverses_payment_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Use integer minor units (cents) or a carefully defined decimal type; do not use binary floating point for money. Enforce tenant scope and overpayment checks inside a transaction to avoid race conditions.

### Exporting reports

Generate CSV/Excel/PDF files server-side from the same source records used by the UI. For large exports, create a background job, save the result privately, and issue a short-lived download link. Record who requested the export and what filters were used.

---

## 8. Owner portal and multi-tenant authorization

This is one of the most security-sensitive parts of the product. TruckTA's public description says the owner portal is restricted on the server to the owner's fleet membership and assignment dates. That implies authorization must happen on the backend for every request, not just by hiding UI elements.

### Recommended permission model

Use RBAC plus resource-scoped checks:

- **RBAC:** Owner, Admin, Manager, Dispatcher, Accountant, Driver, Fleet Owner.
- **Permission examples:** `load.assign`, `load.change_status`, `payment.view`, `payment.edit`, `settlement.approve`, `settlement.mark_paid`, `document.review`, `fmcsa.lookup`, `location.view_current`, `location.view_history`.
- **Resource scope:** company ID, fleet ID, driver assignment dates, truck ownership, and load association.

Example authorization logic:

```ts
await requirePermission(user, "location.view_current");
const truck = await db.truck.findFirst({
  where: {
    id: truckId,
    companyId: user.companyId,
    fleetMemberships: {
      some: {
        ownerUserId: user.id,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }]
      }
    }
  }
});
if (!truck) throw new NotFoundError();
```

The exact ORM syntax will vary. The important point is that the database query itself is scoped to the authorized tenant/resource.

### Security requirements

- Derive company/tenant scope from the authenticated session, never trust a client-provided `companyId`.
- Deny by default.
- Test cross-tenant access with two companies and multiple fleet owners.
- Use separate permissions for viewing payment data and modifying it.
- Apply the same checks to API routes, exports, PDFs, background jobs, WebSocket subscriptions, and file downloads.
- Audit sensitive reads where warranted and all financial/compliance mutations.
- Do not expose private object-storage URLs permanently.
- Use effective-dated fleet membership and assignment records; historical access should follow documented rules.

---

## 9. Live map and location pipeline

### Publicly documented behavior

TruckTA Live Map gets location from the driver's phone via the Driver App, not necessarily from a separate tracking device. The driver must agree and grant OS permissions. The UI groups trucks into Moving, Stopped, Parked, and Attention. A stale location is flagged; the public page describes updates at different intervals depending on movement and says location history is retained for no more than 30 days for the team, with a shorter view for fleet owners. Current location and historical location are separate permissions.

### Suggested implementation

```text
Driver phone GPS
  -> mobile background-location service
  -> local encrypted queue when offline
  -> authenticated location ingestion endpoint
  -> validation/rate limiting
  -> location store
  -> latest-location cache
  -> realtime map update
  -> retention/deletion worker
```

Store coordinates with `device_time`, `received_at`, accuracy, speed, heading, and assignment context. Distinguish device timestamp from server receipt time. Flag implausible jumps and stale devices rather than inventing positions.

For a small system, PostgreSQL/PostGIS is a good starting point. At higher volume, use partitioned location tables or a specialized time-series/geospatial store. Keep a “latest point per truck” table/cache so the map does not scan all historical points on every refresh.

### Retention and privacy

- Collect only after explicit consent and required permissions.
- Explain when sharing starts and what company users can see.
- Stop sharing when the driver signs out, removes permission, or the company assignment/link ends, according to documented product behavior.
- Enforce retention deletion on the server and in backups where feasible.
- Do not send location coordinates to LLM prompts or analytics systems unless there is a clearly justified, disclosed use case.
- Keep current-location and history permissions separate.
- Do not assume background GPS will work identically across iOS/Android; battery optimization and OS restrictions must be handled.

---

## 10. FMCSA Company Check

### Publicly documented sources and behavior

TruckTA says it uses official FMCSA-related public sources, including QCMobile, DOT open data, and FMCSA SMS inspection/violation/crash data, with SAFER and Licensing & Insurance links for confirmation. It checks role-dependent requirements such as USDOT registration, operating flag, authority, insurance filings, bond/trust, BOC-3, out-of-service orders, safety indicators, and MCS-150 filing.

It displays evidence and timestamps, stores a result for a limited freshness window, supports refresh limits, and can recheck saved contacts daily. It explicitly describes the output as informational, not a legal determination.

### Implementation approach

1. **Provider adapters:** isolate each public source behind an adapter.
2. **Normalize records:** map source-specific fields into a stable internal company model.
3. **Cache responses:** cache by source + identifier + role; store fetched time and source version.
4. **Check rules:** execute deterministic, versioned rules that yield Pass, Fail, Review, Unknown, or Not applicable.
5. **Preserve evidence:** keep source links, retrieval times, relevant fields, and the rule that produced the result.
6. **Render report:** generate a human-readable page and private PDF.
7. **Schedule rechecks:** daily jobs for saved active contacts; notify authorized users only when meaningful changes occur.
8. **Require human action:** do not automatically alter a company profile or approve a load without a user reviewing the differences.

Do not scrape aggressively or assume public endpoints are permanent. Read current FMCSA data/API terms and rate limits. When a source is unavailable, report “Unknown / unable to determine” rather than marking the company safe.

---

## 11. Imports and integrations

### Publicly documented import paths

- CSV imports for drivers, equipment, loads, accidents, and some finance data.
- Smart Load Import for rate-confirmation PDFs and, with AI enabled, photos.
- Chrome extension for a user-reviewed single load from supported Central Dispatch/Super Dispatch pages.
- Load Opportunities from read-only Gmail, Outlook, or IMAP inboxes.
- Airtable imports with field mapping and preview.
- Fuel statement imports and truck/card matching.
- Super Dispatch API integration with configurable sync direction.
- RingCentral integration for calls/texts, enabled company by company.
- ELD/telematics tools such as Motive and Samsara are shown among integrations.

The product emphasizes preview and confirmation: rows are validated, duplicates checked, errors listed, and imports do not silently book loads.

### CSV import pipeline

```text
Upload
 -> identify file/destination
 -> map columns
 -> parse rows
 -> validate types and required fields
 -> detect duplicates
 -> show preview + errors
 -> user selects overwrite policy
 -> revalidate against current database
 -> commit valid rows in a transaction/batch
 -> show created/updated/skipped report
 -> allow rejected rows to be downloaded and fixed
```

Use an import-job table with per-row status. Recheck at execution time because the database can change between preview and confirmation. Make each import idempotent where possible.

### Chrome extension

A browser extension can read the current supported page's DOM, extract the fields the user requested, show a preview, and send a structured payload to TruckTA through an authenticated API. Use explicit host permissions and minimal data collection. Do not implement background scraping, session-cookie extraction, or hidden bulk harvesting. Extension tokens should be revocable, scoped, and stored using browser extension storage rather than hardcoded.

### Email opportunities

A secure email integration should use OAuth where supported or a carefully managed IMAP credential flow. Request read-only access. Process relevant alert messages into normalized opportunities; avoid retaining raw email bodies if not needed. Store the listing ID, route, vehicle count, and source reference only as necessary. Do not automatically book a load.

### Super Dispatch sync

Use a durable sync cursor and mapping table between remote IDs and local records. Process webhook events where supported; otherwise poll incrementally. Add retry with exponential backoff, dead-letter handling, per-record sync status, and a manual reconciliation screen. Do not enable outbound sync until the company has previewed and explicitly activated it.

### ELD/telematics

Use provider adapters so each provider has a common interface:

```ts
interface TelematicsProvider {
  getVehicles(): Promise<ProviderVehicle[]>;
  getLatestLocations(): Promise<ProviderLocation[]>;
  getVehicleStatus?(vehicleId: string): Promise<ProviderStatus>;
}
```

Keep source-of-truth semantics clear: a device may be authoritative for engine/ELD data, while the TMS remains authoritative for load assignment and settlement.

---

## 12. AI features: document extraction and operational assistant

TruckTA's public pages describe optional AI features, including Smart Load Import, operational Q&A, dispatch analysis/suggestions, and “AI co-work.” Public pages do not expose the exact model providers, prompts, orchestration framework, or internal architecture.

### A. Rate-confirmation extraction

Recommended pipeline:

```text
Private PDF/photo upload
  -> file validation and malware scan
  -> PDF text extraction
  -> OCR for scanned pages
  -> document classification
  -> structured extraction
  -> schema validation
  -> cross-field checks
  -> user review/edit
  -> save as unassigned load
```

Use deterministic parsing first where possible; call an LLM only when needed. Define a strict schema, for example:

```ts
import { z } from "zod";

const LoadDraft = z.object({
  pickup: z.object({
    company: z.string().optional(),
    address: z.string().optional(),
    city: z.string(),
    state: z.string().length(2),
    date: z.string().optional()
  }),
  delivery: z.object({
    company: z.string().optional(),
    address: z.string().optional(),
    city: z.string(),
    state: z.string().length(2),
    date: z.string().optional()
  }),
  vehicles: z.array(z.object({
    year: z.number().int().optional(),
    make: z.string().optional(),
    model: z.string().optional(),
    vin: z.string().optional()
  })),
  rateCents: z.number().int().nonnegative().optional(),
  paymentTerms: z.string().optional(),
  sourceReferences: z.array(z.string()).default([])
});
```

Then validate business rules: pickup date cannot be nonsensical, VINs should be normalized/validated, vehicle count must match the extracted list, and rate/terms should be flagged when ambiguous. Return confidence per field and preserve source snippets or page references for review. Do not save or dispatch automatically based only on model output.

### B. Operational Q&A

For questions like “Which invoices are overdue?” use a constrained query layer rather than letting a model freely generate arbitrary SQL against production.

Safer architecture:
1. Authenticate user and resolve company scope.
2. Classify the question into an allowlisted intent.
3. Generate a typed query plan, not raw SQL.
4. Validate fields, filters, time range, row limits, and permissions.
5. Execute using parameterized SQL/read-only database access.
6. Return a table with source records and computed totals.
7. Have the model summarize the results, clearly separating facts from suggestions.

For more advanced natural language analytics, use a semantic layer with defined metrics such as outstanding receivables, delivered loads, driver pay, truck utilization, and settlement totals. Never let the LLM decide tenant scope or permissions.

### C. AI dispatch suggestions

A useful first version is a deterministic scoring/ranking system:
- pickup and delivery timing;
- driver/truck/trailer availability;
- trailer capacity and vehicle count;
- route/stop compatibility;
- equipment constraints;
- driver qualification/availability;
- current assignments and estimated deadhead.

The AI can explain why a candidate was recommended. The dispatcher confirms the assignment. If an LLM proposes a plan, validate every proposed assignment against the same domain rules used by the normal API.

### D. Agent execution

For agents that can send messages, change loads, or alter financial records, use explicit tools with narrow schemas, approval gates, idempotency, and audit logs. Read-only operations should be separate from write-capable tools. Require human approval for high-impact actions. Log model/version, input references, tool calls, result, approver, and any override. Do not provide unrestricted database access to an agent.

---

## 13. Suggested stack for a new implementation

This is a practical stack recommendation, **not a claim about TruckTA's actual stack**.

### Lean but production-minded version

| Layer | Recommendation | Why |
|---|---|---|
| Web app | Next.js + React + TypeScript | Fast product iteration, strong ecosystem |
| UI | Tailwind CSS + accessible component library | Consistent dashboard and forms |
| Validation | Zod | Shared runtime schemas across UI/API |
| API | Next.js route handlers initially, or Fastify/NestJS service | Start simple; split when needed |
| Database | PostgreSQL | Relational data, transactions, constraints |
| ORM | Drizzle or Prisma | Typed data access and migrations |
| Realtime | WebSockets/SSE or managed realtime service | Active Board updates |
| Queue | Redis-backed queue (e.g. BullMQ) | Imports, reminders, exports, syncs |
| File storage | S3-compatible object storage | Private documents and generated reports |
| Mobile | React Native + TypeScript or Flutter | iOS/Android driver app |
| Maps | Google Maps Platform plus truck-aware routing provider | Navigation, maps, geocoding |
| Auth | Managed auth or secure session-based auth | Invitation and company membership flows |
| Email | Transactional email provider | Invites, alerts, reports |
| Push | APNs/FCM | Driver notifications |
| Monitoring | Error tracking + logs + metrics | Detect failures and sync issues |
| Hosting | Managed container/app hosting and managed PostgreSQL | Reduce operations burden |
| AI | Provider-agnostic LLM adapter + OCR/document pipeline | Avoid hard coupling to one model |

### Why PostgreSQL is a good default

TruckTA's core entities are highly relational: loads reference companies, stops, vehicles, drivers, documents, invoices, payments, and settlements. ACID transactions are important for assigning loads, recording payments, and freezing settlements. PostgreSQL supports constraints, indexes, JSON where needed, and PostGIS for location data. A document store or vector database is not necessary for the core TMS.

### Deployment shape

Start with a modular monolith:

```text
Web app / API
   |
   +--> PostgreSQL
   +--> Object storage
   +--> Redis queue
   +--> Realtime gateway
   +--> External providers
   |
Background worker(s)
   +--> document processing
   +--> notifications
   +--> integrations/sync
   +--> expiry and FMCSA rechecks
   +--> exports and settlement preparation
```

Separate workers from web request handling for OCR, PDF generation, imports, external API polling, and scheduled checks. Do not start with dozens of microservices unless team size, scaling, or isolation requirements justify them.

---

## 14. Infrastructure and server responsibilities

### Web/API service
- Serves web pages and authenticated API endpoints.
- Verifies sessions and permissions.
- Validates request schemas.
- Runs short database transactions.
- Returns canonical records and validation errors.

### PostgreSQL
- Primary source of truth.
- Enforce foreign keys, uniqueness, checks, and tenant-scoped access patterns.
- Use migrations, backups, point-in-time recovery, and tested restore procedures.
- Index `company_id`, status, assignment dates, load dates, and common filters.

### Object storage
- Stores rate confirmations, BOLs, PODs, inspection photos, driver documents, exports, and audit packets.
- Private buckets only.
- Signed uploads/downloads expire quickly.
- File metadata and authorization remain in the application database.

### Queue/worker system
- Retry external API calls and file processing.
- Send reminders and push notifications.
- Build PDF/CSV exports.
- Run FMCSA rechecks and integration syncs.
- Use dead-letter queues and idempotent handlers.

### Realtime gateway
- Publishes changes to authorized users.
- Each subscription must be scoped by company and permission.
- Reconnect should trigger a catch-up/refetch.
- Never trust a client event as proof that a change was authorized.

### Observability
Track:
- API latency/error rates;
- database connection saturation;
- queue depth and job age;
- failed import rows;
- provider rate-limit errors;
- realtime disconnects;
- document processing failures;
- duplicate idempotency attempts;
- location ingestion lag;
- settlement/finance invariant failures.

Keep audit events separate from debug logs. Avoid logging sensitive document contents, credentials, raw location history, or unnecessary personal data.

---

## 15. Security, privacy, and reliability checklist

### Authentication and authorization
- Company invitation flow with expiry and single-use tokens.
- MFA for privileged users where feasible.
- Secure, HttpOnly, SameSite cookies for web sessions.
- Rate limits on authentication and sensitive lookup endpoints.
- Server-side tenant scoping on every query.
- Separate permissions for financial viewing/editing, settlement approval, payout marking, location history, document review, and FMCSA lookup.
- Authorization tests for every role and every resource type.

### Data protection
- TLS in transit and encrypted storage.
- Secrets manager for API keys and OAuth refresh tokens.
- Private object storage with short-lived signed URLs.
- PII minimization and documented retention/deletion policies.
- Backups encrypted and restore-tested.
- Separate production/staging credentials and data.

### Business integrity
- Idempotency for mobile actions, webhooks, payments, imports, and scheduled jobs.
- Optimistic concurrency for collaborative editing.
- Append-only audit events for sensitive changes.
- Immutable approved/paid settlement snapshots.
- Payment reversals rather than destructive edits.
- Transactional updates for load assignment and trailer capacity checks.

### Privacy and compliance
- Consent-based location sharing with clear UI and revocation behavior.
- Retention limits enforced by jobs and storage policies.
- Explain that FMCSA results are informational and show source/freshness.
- Do not label a carrier “compliant” solely from a score; show the underlying evidence.
- Document AI processing and the data sent to each provider.
- Never expose one fleet owner's data to another fleet owner.

---

## 16. API outline for a comparable product

Example REST endpoints (design proposal):

```text
POST   /api/loads
GET    /api/loads?status=unassigned
GET    /api/loads/:id
PATCH  /api/loads/:id
POST   /api/loads/:id/assign
POST   /api/loads/:id/events/pickup
POST   /api/loads/:id/events/delivery
POST   /api/loads/:id/documents
POST   /api/loads/:id/invoices
POST   /api/loads/:id/payments
GET    /api/dispatch/active-board
GET    /api/drivers/me/loads
POST   /api/driver-events
POST   /api/inspections
POST   /api/ebols/:id/sign
GET    /api/finance/receivables
POST   /api/driver-settlements/preview
POST   /api/driver-settlements
POST   /api/driver-settlements/:id/approve
POST   /api/driver-settlements/:id/mark-paid
GET    /api/owner-portal/overview
GET    /api/owner-portal/settlements
POST   /api/imports
GET    /api/imports/:id/preview
POST   /api/imports/:id/commit
POST   /api/fmcsa/checks
GET    /api/live-map/current
GET    /api/live-map/history
POST   /api/location-points
```

For high-value writes, use command endpoints rather than generic PATCH calls. Each endpoint should:
- authenticate;
- authorize the action and resource;
- validate input;
- verify current state/version;
- commit transaction;
- append audit event;
- publish domain event;
- return canonical server state.

---

## 17. Suggested database constraints and business invariants

Examples to formalize before implementation:

1. A load belongs to exactly one company.
2. Every assignment references a driver, truck, and trailer in the same authorized company, unless the product explicitly supports external equipment.
3. Assignment dates and load stop dates must be coherent.
4. A driver pickup cannot be accepted twice for the same transition.
5. A delivered load cannot silently revert to “picked up.”
6. Trailer capacity warnings use vehicle count and relevant delivery dates.
7. A payment cannot exceed the outstanding balance unless an explicit exception/credit workflow exists.
8. Approved/paid settlements are snapshots; changes require an auditable correction path.
9. A fleet owner can query only currently/appropriately assigned fleet resources and permitted historical records.
10. Location reads require the right permission and fall within retention.
11. Every external sync operation is idempotent and stores provider IDs/cursors.
12. Import preview is revalidated at commit time.
13. AI-extracted fields are drafts until a human approves them.
14. A document replacement preserves the old version in archive/history when policy requires it.
15. Financial amounts use integer minor units or a well-defined decimal type, never JavaScript floating point as the source of truth.

Write automated tests for these invariants; do not rely on UI validation alone.

---

## 18. Phased build plan

### Phase 1 — Core company and load management
- Auth, company membership, roles and permissions.
- Drivers, trucks, trailers, stops, vehicles, loads.
- Basic dispatch board and assignment.
- Load state machine and audit log.
- CSV import/export.
- Basic documents in private object storage.

**Exit criterion:** a dispatcher can create a load, assign it, and track the canonical record through delivery.

### Phase 2 — Driver app and realtime
- Driver invitations and permissions.
- My Loads, pickup/delivery transitions.
- Push notifications.
- Offline command queue and idempotency.
- Uploads, VINs, inspections, eBOL/POD.
- Realtime board updates and conflict handling.

**Exit criterion:** a driver can record a pickup offline, reconnect, sync exactly once, and the dispatcher sees the same state.

### Phase 3 — Finance
- Invoices, terms, partial payments, receivables aging.
- Driver pay rules, deductions, adjustments.
- Draft/approve/paid settlement workflow.
- Owner statements and recurring charges.
- CSV/PDF exports and audit trail.

**Exit criterion:** totals reconcile from source load lines and approved statements do not change silently.

### Phase 4 — Fleet portal, map, compliance
- Fleet-owner-scoped portal.
- Consent-based location capture and live map.
- Document expiry reminders and maintenance.
- FMCSA source adapters and evidence-based report.
- Audit readiness checklist and private ZIP/PDF packet.

**Exit criterion:** cross-tenant tests pass, retention deletion works, and each compliance result shows source/freshness.

### Phase 5 — Integrations and AI
- Rate-confirmation extraction with review screen.
- Supported load-board Chrome extension.
- Email opportunities.
- External TMS/telematics adapters.
- Natural-language read-only reporting.
- Dispatch recommendations with human approval.
- Agent actions only after permissions, audit, and approval controls are mature.

**Exit criterion:** failed integrations retry safely; AI outputs never bypass validation or human approval for consequential actions.

---

## 19. What not to copy blindly

- **Do not infer their stack from the UI.** The public pages do not establish the exact framework, cloud, or database.
- **Do not begin with AI agents.** The core value is consistent operational data, permissions, and reliable workflows.
- **Do not let AI create or book loads autonomously.** Extract into a draft, validate, and require review.
- **Do not use one status field for everything.** Operational and financial states are separate.
- **Do not build accounting on mutable totals.** Store source transactions and freeze approved statements.
- **Do not trust the frontend for tenant security.** Scope every server query.
- **Do not make location tracking invisible.** Consent, permission controls, retention, and auditability are part of the product.
- **Do not import data without preview and error reporting.** Real operational data is messy.
- **Do not use car navigation for truck routing.** Height, weight, axle, and road restrictions matter.
- **Do not overengineer into microservices at the start.** A modular monolith with workers is usually faster to build and easier to debug.

---

## 20. Final assessment

TruckTA's defensible product value is not any single dashboard. It is the connected operational workflow: dispatch assignment, driver execution, vehicle-level evidence, invoice collection, settlements, owner visibility, compliance records, and external data imports all use consistent records and permissions.

If building a similar product, prioritize:
1. a clean relational model and state machines;
2. tenant isolation and resource-scoped permissions;
3. reliable driver sync and idempotency;
4. accurate finance calculations and immutable settlement snapshots;
5. review-first import pipelines;
6. realtime collaboration that handles conflicts honestly;
7. only then, AI extraction, analytics, and dispatch assistance.

That sequence creates a trustworthy TMS. Adding an LLM to an inconsistent load/finance database would only automate the inconsistencies.

---

## Sources

1. TruckTA homepage — https://www.truckta.com/
2. Dispatch / Active Board — https://www.truckta.com/product/dispatch
3. Driver App — https://www.truckta.com/product/driver-app
4. Finance & settlements — https://www.truckta.com/product/finance
5. Live Map — https://www.truckta.com/product/live-map
6. Imports & integrations — https://www.truckta.com/product/imports-integrations
7. FMCSA Company Check — https://www.truckta.com/solutions/fmcsa-company-check
8. Drivers solution — https://www.truckta.com/solutions/drivers
9. Privacy policy — https://www.truckta.com/privacy-policy
10. Driver location privacy — https://www.truckta.com/drive-privacy
11. Google Play app listing — https://play.google.com/store/apps/details?id=com.truckta.mobile

**Method note:** This report uses public product documentation and the page content supplied by the user. Technical components described as “recommended” or “plausible” are implementation guidance, not verified facts about TruckTA's internal systems.
