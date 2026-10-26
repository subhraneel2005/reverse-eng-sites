# Alvys TMS: Technical Reverse-Engineering Report
**Research date:** 26 October 2026  
**Scope:** Alvys public website, product pages, AI/agent pages, integration/EDI materials, and public engineering job listings.

> **Important boundary:** This is a public-source technical reconstruction, not access to Alvys' private source code, infrastructure, production APIs, or internal architecture. The report labels what Alvys publicly states separately from reasonable engineering inferences. Treat proposed implementation details as a blueprint for building a similar product—not as claims about Alvys' exact internals.

## 1. Executive summary

Alvys is not just a dispatch dashboard. It is a cloud-based transportation management system (TMS) that connects load lifecycle management, dispatch, drivers/assets, document capture, customer visibility, EDI, integrations, accounting/settlement, analytics, and AI workflows in one operational system.

The key architectural idea is a **shared operational data model**. Loads, drivers, carriers, trucks, stops, documents, rates, invoices, EDI messages, and events need to refer to the same canonical records. Integrations and AI become much more useful when they can safely read and update this shared state instead of maintaining disconnected copies.

Public engineering job listings identify a stack including **.NET/C#, Cosmos DB, Cognitive Search, Azure services, TypeScript, Angular/React, Flutter/Dart, Azure Monitor, Application Insights, and CI/CD using Azure DevOps/GitHub Actions**. That is strong evidence about the engineering environment, but it does not prove every component is used by every product service. See [Alvys' public Senior Full Stack Engineer listing](https://job-boards.greenhouse.io/alvys/jobs/5278601008).

Alvys also publicly describes:
- Native EDI embedded in the TMS, including inbound/outbound transaction visibility, acknowledgements, retries, and configurable mappings.
- 120+ integrations and an open/public API.
- A driver app for status updates, GPS, documents, pay-stub visibility, and eChecks.
- Alvys Intelligence for document-to-load creation, natural-language operational questions, risk overlays, and AI agents.
- Alvys Foundry, where agents operate on live TMS context, can be triggered by events/schedules, and use approval gates and audit trails.

Sources: [Alvys Intelligence](https://alvys.com/features/alvys-intelligence), [Foundry AI agents](https://alvys.com/features/ai-agents), [Native EDI engineering write-up](https://alvys.com/blog/alvys-native-edi-build-story), [Public API article](https://alvys.com/blog/unlock-new-efficiency-with-the-alvys-public-api), [Driver app](https://alvys.com/features/driver-mobile-app).

---

## 2. What the public evidence tells us

### Product and workflow claims from Alvys
| Capability | Publicly described behavior | Technical implication |
|---|---|---|
| TMS / dispatch | Create and manage loads, plan dispatch, assign drivers/assets, track milestones | Canonical load and dispatch domain; scheduling and state transitions |
| Carrier + broker operations | Switch between carrier and brokerage workflows | Tenant/company model must support multiple business entities and roles |
| Driver app | Load details, pickup/delivery check-ins, GPS updates, document uploads, pay stubs, eChecks | Mobile API, offline/error handling, location/event ingestion, secure document pipeline |
| Documents | Capture BOLs, PODs, rate confirmations and receipts; crop/filter multi-page scans | File storage, image processing, OCR/document extraction, review and association with loads |
| Native EDI | Tender acceptance/rejection, load creation/update, acknowledgements, file status, retries, configurable mappings | EDI translator, durable message queue, partner-specific maps, idempotent processing, operator console |
| Integrations | 120+ integrations; ELD, load boards, visibility, accounting, compliance tools | Connector framework, credential vault, sync jobs, webhook/polling support, normalization |
| Accounting | Invoicing, billing, IFTA, driver/agent/carrier settlement | Financial subdomain, ledger-like records, reconciliation and auditability |
| Analytics | Custom reports and operational questions | Reporting/read models, query layer, permission-aware data access |
| AI Intelligence | Parse documents, create loads, answer questions over loads/revenue/drivers, identify hazards | Extraction pipeline, grounded data retrieval, tool calling, analytics query generation, geospatial/event feeds |
| Foundry agents | Prebuilt workflows, triggers, approvals, thresholds, audit trails, model routing | Workflow engine, typed tools, policy enforcement, durable runs and human-in-the-loop approvals |
| MCP access | Public page says external assistants can access selected TMS capabilities; beta | MCP server with authenticated, scoped tools over internal service/API boundaries |

Sources: Alvys product pages linked above and [features overview](https://alvys.com/features).

### What is not publicly established
The public material does **not** reveal complete source code, exact service boundaries, exact database schemas, cloud topology, internal API routes, model names, prompts, vector database usage, exact message broker, deployment topology, or all third-party vendors. Do not assume a specific implementation (for example, Kubernetes, Kafka, Redis, or a particular LLM provider) unless independently verified.

---

## 3. Likely high-level architecture

A practical architecture for a product with these features looks like this:

```text
Web TMS (dispatch / accounting / analytics)       Driver mobile app
                  |                                      |
                  +--------------- API ------------------+
                                  |
                      AuthN / tenant / permissions
                                  |
       +--------------------------+--------------------------+
       |                          |                          |
  Core TMS domain            Integration platform       AI platform
  - Loads/stops              - EDI engine               - Document extraction
  - Dispatch/assignments     - Partner connectors       - Insights / NL queries
  - Drivers/assets           - Webhooks / polling       - Agent runtime / Foundry
  - Documents                - Mapping/config UI        - Model gateway / policy
  - Billing/settlements      - Retry + dead letters     - MCP server
  - Compliance
       |                          |                          |
       +--------------------------+--------------------------+
                                  |
                       Durable events / jobs
                                  |
        +-------------------------+--------------------------+
        |                         |                          |
  Operational database     Object/file storage        Analytics/search
  (tenant-scoped records)   (BOL/POD/images)           (reports, indexing)
        |                         |                          |
        +-------------------------+--------------------------+
                                  |
                  External systems and data providers
      ELD/GPS | load boards | accounting | compliance | weather/traffic
```

This diagram is a **recommended reconstruction**, not Alvys' verified internal diagram.

### Architecture choices
- Start with a **modular monolith plus background workers** if building a first version with a small team. Keep modules and interfaces explicit.
- Split high-volume or operationally independent components (EDI ingestion, GPS ingestion, document processing, AI execution) into separate deployable services when needed.
- Use a relational database for transactional consistency where possible. Alvys job listings mention Cosmos DB and also relational/NoSQL experience; the precise production split is not public. For a new implementation, PostgreSQL is a strong default for core entities and transactions.
- Store binary files in object storage, not database rows.
- Use a queue for asynchronous work, retries, and backpressure.
- Build all tenant scoping and permissions into server-side data access, not just frontend filters.

---

## 4. Publicly evidenced technology stack

### Alvys-specific evidence
The public Senior Full Stack Engineer listing names:
- **Backend:** .NET/C#, Cosmos DB, Cognitive Search, Azure services.
- **Frontend:** TypeScript, Angular, React, Dart/Flutter.
- **Operations:** Azure, Azure Monitor, Application Insights, CI/CD via Azure DevOps/GitHub Actions.
- **Integrations:** third-party APIs and workflow systems.

Source: [Alvys job listing](https://job-boards.greenhouse.io/alvys/jobs/5278601008).

A separate engineering-manager listing also describes .NET/C#, ASP.NET, TypeScript, React (with some Angular), Flutter/Dart, Cosmos DB, PostgreSQL, Elasticsearch, Snowflake, and Azure. The listings may reflect different teams or parts of the stack; don't collapse them into a claim that every service uses all these technologies. Source: [Bonfire Ventures job board listing](https://jobs.bonfirevc.com/companies/alvys/jobs/72806312-engineering-manager).

### Suggested stack for your own build
| Layer | Sensible starting choice | Why |
|---|---|---|
| Web app | TypeScript + React/Next.js | Mature UI ecosystem; fast iteration |
| API | ASP.NET Core if matching the publicly evidenced stack; otherwise TypeScript/Fastify or NestJS | Typed APIs, validation, authentication, background jobs |
| Core database | PostgreSQL | Transactions, constraints, joins, financial/workflow data |
| Search | PostgreSQL full-text first; dedicated search later | Avoid premature infrastructure |
| Files | Azure Blob Storage or S3-compatible object storage | Durable documents, signed upload/download |
| Queue | Azure Service Bus / managed queue | Retries and durable asynchronous processing |
| Cache | Redis only when needed | Caching, rate limits, short-lived coordination |
| Mobile | Flutter, or React Native | Driver-facing cross-platform app |
| Maps | Mapbox or Google Maps | Route/map UI and geocoding |
| Telemetry | OpenTelemetry + cloud-native monitoring | Traces, metrics, structured logs |
| AI | Provider-agnostic model gateway + typed tools | Model switching, cost controls, observability |
| Deployment | Azure App Service/Container Apps initially; Kubernetes only when justified | Lower operational burden for an early team |

These are recommendations, not assertions about Alvys' exact deployment.

---

## 5. Core data model

Design around the load lifecycle, not around separate screens.

### Core entities
- `Tenant` / `Organization`: customer account and isolation boundary.
- `BusinessUnit`: carrier, brokerage, hybrid division, or private fleet.
- `User`, `Role`, `Permission`, `Membership`.
- `Customer` / `Shipper`.
- `Carrier`, `CarrierContact`, `CarrierComplianceRecord`.
- `Driver`, `Tractor`, `Trailer`, `AssetAvailability`, `MaintenanceEvent`.
- `Load`: customer, business unit, status, references, revenue/cost, assigned resources.
- `Stop`: ordered pickup/delivery stop, address, appointment windows, arrival/departure.
- `LoadAssignment`: driver/tractor/trailer/carrier assignment history.
- `RateConfirmation`, `Quote`, `LaneRate`, `RateHistory`.
- `Document`: object-storage key, type, extracted fields, confidence, review state, related load.
- `LoadEvent`: status changes, GPS pings, messages, document events, external updates.
- `Invoice`, `InvoiceLine`, `Settlement`, `Payment`, `AccessorialCharge`.
- `EDITradingPartner`, `EDIMap`, `EDIMessage`, `EDIAcknowledgement`.
- `IntegrationConnection`, `SyncCursor`, `WebhookDelivery`.
- `AgentDefinition`, `AgentRun`, `AgentStep`, `ApprovalRequest`, `AgentAuditEvent`.
- `Notification`, `CustomerTrackingLink`.

### Relationships
- A load has one or more stops, documents, events, charges, and external references.
- A load may be assigned to a driver, tractor, trailer, and carrier; assignments must be time-aware and auditable.
- Documents can be linked to more than one domain object when appropriate, but the association must be explicit.
- EDI messages should retain the raw payload, normalized representation, processing result, and links to the affected load.
- Every tenant-owned record must carry a tenant or organization scope, with server-side enforcement.

### Important design rule
Do not let the LLM directly mutate database tables. It should request typed actions through domain services that validate permissions, current state, business rules, and approvals.

---

## 6. Load lifecycle and dispatch planning

### Example lifecycle
```text
Draft
  -> Quoted / Tendered
  -> Accepted
  -> Planned
  -> Assigned
  -> Dispatched
  -> At pickup
  -> Picked up / In transit
  -> At delivery
  -> Delivered
  -> Documents complete
  -> Ready to invoice
  -> Invoiced
  -> Settled / Closed
```

The real workflow needs exception states (cancelled, rejected, late, on hold, missing paperwork, disputed charges). Make transitions explicit and validate them server-side.

### Assignment workflow
1. Dispatcher opens a load and selects a planning window.
2. Query available drivers, tractors, trailers and carriers.
3. Exclude assets that are unavailable, under maintenance, non-compliant, or conflicting with another assignment.
4. Rank feasible assignments using deterministic criteria: pickup window, geography/deadhead, hours-of-service constraints if available, equipment type, lane history, cost, customer rules, and driver availability.
5. Show the recommendation with reasons; let the dispatcher confirm.
6. Write the assignment transactionally and publish a `LoadAssigned` event.
7. Notify the driver app and relevant parties; update maps and customer visibility.

Start with transparent rules and scoring. Do not claim to have an optimizer before you have reliable data and constraints.

---

## 7. Native EDI: the most important integration subsystem

Alvys publicly says its EDI engine is embedded in the TMS. Its September 2026 write-up describes configurable partner mappings, a page showing inbound/outbound files and acknowledgement status, automatic retry, manual retrigger, and tenders that can create/update loads. It names transaction sets including 204, 210, 213, 214, 824, 990, and 997. Source: [How Alvys Enhanced EDI](https://alvys.com/blog/alvys-native-edi-build-story).

### What EDI is doing
EDI exchanges standardized business documents between companies. For trucking, examples include:
- **204:** motor carrier load tender.
- **990:** response to a load tender.
- **214:** shipment status message.
- **210:** freight invoice.
- **997:** functional acknowledgement.
- **824:** application advice.
- **213:** shipment status inquiry.

### Recommended pipeline
```text
Partner transport (SFTP / AS2 / API, according to partner agreement)
  -> receive raw bytes
  -> persist immutable raw message
  -> identify partner + transaction type
  -> validate envelope/schema
  -> parse into normalized event
  -> map partner-specific fields
  -> resolve external references to tenant/load
  -> apply idempotent domain command
  -> emit acknowledgement / outbound response
  -> record delivery + partner acknowledgement
  -> retry transient failures; route permanent failures to review
```

Do not assume every partner uses the same transport protocol; negotiate and configure it per trading partner.

### EDI requirements
- Versioned partner-specific maps with validation.
- Raw payload retention and secure access.
- Idempotency keys; duplicate inbound files must not create duplicate loads.
- Correlation IDs and per-message processing state.
- Retry with exponential backoff for transient failures.
- Dead-letter/error queue and manual replay UI.
- Acknowledgement tracking.
- Audit log of mapping changes and operator overrides.
- Test/sandbox environment and partner certification fixtures.
- Alerting on delayed acknowledgements, rejection spikes, and stuck messages.

**Key lesson from Alvys' public write-up:** its EDI managers can change mapping configuration through a UI instead of needing a code deployment for every mapping adjustment. A mapping/configuration editor plus a test-and-publish workflow is a high-leverage feature.

---

## 8. Integration platform for 120+ connections

Do not build 120 independent integrations as 120 unrelated code paths. Build a connector framework.

### Connector interface
Each connector should define:
- `authorize()` / credential refresh.
- `pullChanges(cursor)` for polling integrations.
- `handleWebhook(event)` where supported.
- `normalize(rawRecord)` into internal types.
- `pushUpdate(internalEvent)` for outbound sync.
- `healthCheck()` and `reconcile()`.
- Rate-limit policy, retry policy, idempotency, and error mapping.

### Integration data flow
1. Customer connects a provider and grants the required permissions.
2. Store credentials in a managed secrets vault; never expose secrets to the browser or LLM.
3. Validate connection and persist provider/account metadata.
4. Use webhooks when available; otherwise poll with a durable cursor.
5. Normalize provider payloads into canonical internal events.
6. Apply updates through domain services.
7. Store source IDs and sync cursors to avoid duplicates.
8. Show sync health and actionable errors to operators.

### Likely integration categories
Alvys publicly names or shows integrations across ELD/telematics, load boards, visibility/tracking, accounting, carrier compliance, and other freight tools. Examples mentioned publicly include Samsara, Motive, DAT, Geotab, QuickBooks, TCS, RMIS, and visibility providers. See [Alvys integrations](https://alvys.com/features/integrations) and [hybrid TMS](https://alvys.com/hybrid-tms).

For a first version, implement only two or three high-value connectors. Build a reusable connector contract before expanding.

---

## 9. Driver mobile app, GPS, and customer tracking

### Driver app
The public driver-app page describes load information, pickup/delivery check-ins, document capture, pay-stub visibility, eChecks, compliance data, and GPS/status updates. Source: [Alvys Driver Mobile App](https://alvys.com/features/driver-mobile-app).

### Suggested mobile architecture
- Flutter app with authenticated driver session.
- Server-issued short-lived tokens and device/session revocation.
- Local encrypted cache for assigned loads and required stop details.
- Offline queue for check-ins and document uploads.
- Background location permission only when justified and explicitly explained.
- Uploads through short-lived signed URLs; API records the metadata and association.
- Push notifications for assignment/status changes.
- Server-side deduplication of retried events.

### GPS ingestion
1. Receive location pings from the driver app or a telematics provider.
2. Validate device/provider identity and timestamp.
3. Store the latest location separately from long-term event history.
4. Associate asset/driver to current assignments.
5. Map-match or geofence near pickup/delivery locations if needed.
6. Calculate ETA using a routing/traffic provider, not a language model.
7. Apply rules for late/arrived/departed events.
8. Publish updates to the dispatch UI and authorized customer tracking link.

### Customer tracking link
Use a random, revocable token; expose only the specific load's permitted fields. Add expiration, rate limits, and access logs. Do not expose internal driver or financial information.

---

## 10. Document scanning and AI load creation

Alvys says the driver app can enhance photos into scans, handle multi-page documents, and use AI to read documents for load creation/import. The exact OCR/model vendors are not public. Source: [Alvys Intelligence](https://alvys.com/features/alvys-intelligence).

### Recommended document pipeline
```text
Mobile/web upload
  -> virus/malware scan
  -> object storage
  -> image normalization (rotate, crop, deskew, contrast)
  -> OCR / document-layout extraction
  -> classify document (rate con, BOL, POD, receipt, etc.)
  -> extract typed fields
  -> validate against customer/tenant rules
  -> match to existing load or suggest new load
  -> confidence threshold + human review
  -> create/update through domain API
  -> retain source file + extraction + review audit
```

### Fields to extract
Examples: shipper/consignee, pickup/delivery addresses, dates, reference numbers, commodity, weight, pieces, rate, fuel surcharge, accessorials, signatures, and document type. Use per-field confidence and validation; don't treat OCR output as truth.

### Reliability controls
- Require human review for low-confidence or financially consequential fields.
- Compare extracted fields to existing customer, carrier, lane, and load records.
- Keep source-page coordinates or bounding boxes for evidence.
- Store original file and parsed result version.
- Make processing idempotent and re-runnable.
- Measure field-level precision/recall on a labeled evaluation set.
- Never let document text override system instructions or trigger arbitrary tools; treat documents as untrusted input.

---

## 11. Alvys Intelligence: likely AI architecture

Alvys publicly describes several distinct capabilities. They should not be implemented as one giant prompt.

### A. Document-to-load extraction
Use OCR/document layout extraction, schema-constrained LLM output, deterministic validation, duplicate detection, and a review/commit step. LLMs are useful for messy layouts; domain rules should enforce correctness.

### B. Natural-language operational insights
The user asks questions such as “Which loads are late?” or “What was revenue by lane last month?” A safe design is:
1. Identify user, tenant, roles and data permissions.
2. Classify the question as operational lookup, aggregate analytics, explanation, or unsupported request.
3. Map it to a predefined query/tool or generate a constrained query plan.
4. Execute only against approved views/services.
5. Validate tenant scope, query cost, row limits, and allowed fields.
6. Return a grounded answer plus a data table/chart and time range.
7. Log query intent and data access without leaking sensitive values into logs.

**Avoid unrestricted text-to-SQL against production tables.** Prefer typed tools or a semantic layer that exposes approved metrics, dimensions, filters and joins. If SQL generation is used, parse and validate it, enforce read-only access and tenant scoping, set timeouts, and use a replica/read model.

### C. Alvys Intel / hazard overlays
The site describes weather, traffic, crime, wrecks and emergency-related hazards displayed on an asset map. Likely building blocks are licensed data feeds, geospatial indexing, route corridor matching, event deduplication, severity scoring, freshness windows, and map overlays. The exact providers and algorithms are not publicly specified.

### D. Smart Text AI
The driver app page says relevant text messages can be linked to load history. A reasonable implementation is message ingestion with permission/consent, entity resolution (load references, driver, customer, stop), classification, and attachment to the correct load timeline. Ambiguous matches should go to review; don't silently attach a message to the wrong shipment.

---

## 12. Foundry: designing a safe agent platform

Alvys describes Foundry as an embedded agentic layer with prebuilt freight agents, event/schedule triggers, dollar thresholds, human approval for high-impact actions, model routing, simulated-data test runs, and an audit trail. Some natural-language agent-building capability is described as coming soon on the public page, so availability may differ by feature. Source: [Alvys Foundry](https://alvys.com/features/ai-agents).

### Agent architecture
```text
Trigger (event / schedule / manual)
  -> load agent definition + tenant policy
  -> collect authorized context
  -> model plans a bounded next step
  -> validate proposed tool call against schema/policy
  -> execute read-only tool or request approval
  -> domain service validates and performs write
  -> verify resulting state
  -> persist run, inputs/outputs, tool results and costs
  -> retry / stop / escalate based on policy
```

### Example: detention detection agent
1. Trigger when arrival/departure events cross a configured threshold.
2. Load stop timestamps and the shipper's detention terms.
3. Check exclusions, grace period, timezone, required evidence and billable increments.
4. Calculate candidate detention with deterministic code.
5. Ask an LLM to summarize evidence or draft the claim—not to invent the amount.
6. Create a draft claim and attach evidence.
7. Require approval if policy says so; submit only through an authorized action.
8. Record the rule version, evidence, approver, action and response.

### Example: invoice audit agent
1. Trigger when invoice is drafted.
2. Fetch rate confirmation, load charges, accessorial evidence and invoice lines.
3. Compare values with deterministic rules.
4. Use AI to explain discrepancies or classify ambiguous text.
5. Block or flag mismatches based on severity.
6. Require a human to approve material changes.
7. Log the result and the final override.

### Guardrails
- Tools have strict schemas and least-privilege permissions.
- Read and write tools are separate.
- Human approval is required for high-impact actions (money, customer communication, load cancellation, carrier selection, external commitments).
- Per-agent spend/time/action limits.
- Idempotency keys for writes.
- Simulated-data test runs and regression suites.
- Prompt-injection defense: documents, messages, emails and partner payloads are untrusted data, not instructions.
- Full audit trail with tool call, policy decision, result, retry, approval and override.
- Tenant isolation and provider-specific data retention/zero-training terms.
- Model gateway routes by task, latency, quality and cost; don't hard-code business logic into prompts.

### MCP server
Alvys says MCP access is in beta and can let external AI assistants query loads, invoice status, driver availability and tracking history. A similar implementation should expose narrow, authenticated MCP tools such as:
- `search_loads(filters)`
- `get_load(load_id)`
- `get_invoice_status(invoice_id)`
- `get_driver_availability(window, constraints)`
- `get_tracking_history(load_id, range)`

Each tool must enforce tenant scope, permissions, rate limits, output minimization and audit logging. Start read-only; add writes only with explicit approval workflows.

---

## 13. API design

Use versioned, typed APIs. These are **example routes for your own system**, not Alvys endpoints.

```text
POST   /api/v1/loads
GET    /api/v1/loads?status=&pickup_after=&customer_id=
GET    /api/v1/loads/{loadId}
PATCH  /api/v1/loads/{loadId}
POST   /api/v1/loads/{loadId}/assignments
POST   /api/v1/loads/{loadId}/events
POST   /api/v1/loads/{loadId}/documents/upload-url
POST   /api/v1/loads/{loadId}/documents/complete
GET    /api/v1/assets/map
GET    /api/v1/reports/load-performance
POST   /api/v1/edi/messages/replay
GET    /api/v1/edi/messages/{messageId}
POST   /api/v1/integrations/{provider}/connect
POST   /api/v1/agents/{agentId}/runs
POST   /api/v1/agent-runs/{runId}/approve
GET    /api/v1/agent-runs/{runId}/audit
```

### API essentials
- OpenAPI/Swagger spec and generated clients.
- Schema validation at the boundary.
- Cursor pagination for large lists.
- Idempotency keys for creation/payment/EDI actions.
- Optimistic concurrency or version fields for shared records.
- Correlation IDs for cross-service tracing.
- Consistent error types and retry hints.
- Webhooks signed with HMAC, replay protection, and delivery logs.
- Explicit API versioning and deprecation policy.

---

## 14. Database and storage design

### Suggested starting database
PostgreSQL for core transactional records, with tenant-scoped rows and indexes. A Cosmos DB-style NoSQL model can be appropriate for selected high-scale or flexible event/document workloads, but choose it based on access patterns and consistency requirements—not because it appears in a job listing.

### Example simplified SQL schema
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE loads (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  external_reference TEXT,
  status TEXT NOT NULL,
  customer_id UUID,
  pickup_at TIMESTAMPTZ,
  delivery_at TIMESTAMPTZ,
  revenue_cents BIGINT,
  cost_cents BIGINT,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX loads_tenant_status_idx ON loads (tenant_id, status);
CREATE INDEX loads_tenant_pickup_idx ON loads (tenant_id, pickup_at);

CREATE TABLE load_events (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  load_id UUID NOT NULL REFERENCES loads(id),
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL,
  idempotency_key TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, source, idempotency_key)
);

CREATE TABLE documents (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  load_id UUID REFERENCES loads(id),
  object_key TEXT NOT NULL,
  document_type TEXT,
  extraction JSONB,
  review_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agent_runs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  agent_id UUID NOT NULL,
  status TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  cost_micros BIGINT,
  audit JSONB NOT NULL DEFAULT '{}'
);
```

This is illustrative only; a production schema needs complete foreign keys, tenant-safe constraints, permission design, migrations, retention policies, and financial modelling.

### Storage rules
- Binary documents in object storage with encryption and lifecycle policies.
- Store object keys and metadata in the database.
- Use signed URLs with short expiry.
- Keep raw EDI messages immutable and access-controlled.
- Separate operational data from analytics workloads when scale requires it.
- Backups must be tested by restore drills, not merely configured.

---

## 15. Security, privacy, and compliance

Freight data can reveal driver locations, customer relationships, rates, invoices, routes, and business performance. Security must be a product feature.

Minimum controls:
- Tenant isolation verified by automated tests.
- RBAC/permission checks on every server-side operation.
- MFA for privileged accounts and secure session/token rotation.
- Encryption in transit and at rest; managed secrets vault.
- Signed URLs for documents and short-lived public tracking tokens.
- Audit logs for financial actions, data exports, permission changes, agent actions and overrides.
- Rate limiting, abuse detection, secure upload scanning and file-size/type limits.
- Retention/deletion policies for location, messages, documents and AI traces.
- PII minimization in model prompts and logs.
- Model-provider contractual controls; verify actual terms rather than assuming “no training.”
- Incident response plan, dependency scanning, backups and recovery testing.
- For SOC 2 claims, implement and independently audit the relevant controls; do not treat using a cloud provider as equivalent to SOC 2 compliance.

Alvys' Foundry page publicly claims SOC 2 compliance and protected-data agreements with model providers. This report does not independently audit those claims.

---

## 16. Reliability, observability, and operations

### Background jobs that should be durable
- EDI inbound/outbound processing.
- Integration polling and reconciliation.
- Document OCR/extraction.
- Driver notifications and customer alerts.
- ETA refreshes and geofence checks.
- Invoice/settlement preparation.
- Scheduled agent runs and approval reminders.
- Analytics materialization.

### Observability
Track:
- API latency/error rate.
- Queue depth and oldest message age.
- EDI acceptance/rejection and acknowledgement latency.
- Connector freshness and auth failures.
- Document extraction field accuracy and review rate.
- Agent success, escalation, cost, latency, tool errors and human overrides.
- GPS freshness and missing-location rates.
- Invoice exceptions and failed settlement/export workflows.

Every event/job/agent run should have a correlation ID. Logs should be structured, redact secrets, and avoid dumping raw sensitive documents or complete customer records.

---

## 17. How the public website and demo funnel likely work

The marketing website is distinct from the authenticated TMS product. Its public pages are feature/industry landing pages with repeated demo forms, customer proof, product screenshots, FAQs, and links to developer/support resources.

The demo form shown in the provided page text asks for business type, monthly load volume, company name, then proceeds to contact details. A common implementation is a multi-step form that validates fields, records consent, sends the lead to a CRM/marketing system, and triggers sales follow-up. The exact CRM, analytics vendors, form endpoints, and website framework were not confirmed by the supplied text or public evidence used here.

For your own marketing site:
- Use a static/SSR framework such as Next.js or a CMS where non-engineers can update pages.
- Create a reusable landing-page template for each persona and feature.
- Keep form submission on a server endpoint; validate and rate-limit it.
- Store consent timestamp/source and provide unsubscribe/opt-out handling.
- Use CRM integration and campaign attribution with a documented privacy policy.
- Avoid duplicating the same form and footer code across every page.
- Track meaningful funnel events: form start, step completion, submit, booking, and qualified lead—subject to consent/privacy requirements.

---

## 18. A practical build plan

### Phase 1 — usable TMS core
1. Tenant and role model.
2. Customers, carriers, drivers, tractors and trailers.
3. Loads and stops with explicit status transitions.
4. Dispatch planner and assignment conflict checks.
5. Driver app login, load view, pickup/delivery events.
6. Document upload and load timeline.
7. Basic invoice generation and audit trail.

**Goal:** A dispatcher can create a load, assign a driver, receive updates and documents, and prepare an invoice.

### Phase 2 — integrations and visibility
1. GPS/ELD connector.
2. Customer tracking page.
3. One load-board or accounting connector.
4. Integration health dashboard.
5. Retry queue, idempotency and reconciliation.
6. First EDI transaction pair for one pilot partner, then expand.

**Goal:** Reduce duplicate entry while maintaining clear error handling.

### Phase 3 — document AI and insights
1. OCR plus schema extraction for one document type.
2. Confidence scoring and review UI.
3. Automatic load draft from a rate confirmation.
4. Operational reporting views.
5. Read-only natural-language analytics with strict query constraints.

**Goal:** AI prepares and explains; deterministic services validate and commit.

### Phase 4 — controlled agents
1. Agent definitions, triggers, run history and tool schemas.
2. One read-only agent.
3. One draft-only agent that creates suggestions.
4. Approval queue and policy thresholds.
5. Simulated-data tests and audit viewer.
6. Add writes only after replay/idempotency and rollback strategies are proven.

**Goal:** Demonstrate reliable automation for a single workflow before building a general agent builder.

### Phase 5 — scale and enterprise readiness
- Multiple EDI trading partners and mapping editor.
- More connectors through a stable SDK/contract.
- Tenant-level configuration and custom workflows.
- Analytics read models and warehouse if needed.
- SLOs, on-call, disaster recovery and security review.
- Formal onboarding/migration tooling and customer support workflows.

---

## 19. Team and effort reality

A prototype can demonstrate a load board, uploads, basic dispatch, and one AI extraction flow. A production TMS with EDI, financial correctness, mobile location handling, dozens of integrations, multi-tenant security, and autonomous agents is a much larger effort.

A sensible early team might include:
- 1 product/domain lead who understands freight workflows.
- 2–4 full-stack/backend engineers.
- 1 mobile engineer (or a cross-platform engineer).
- 1 integration/EDI specialist as soon as real EDI is in scope.
- 1 QA/automation engineer.
- Shared design, security, and infrastructure support.

These are planning suggestions, not an estimate of Alvys' team. The hardest parts are usually domain edge cases, partner certification, data quality, integration maintenance, migration, and safe financial/operational automation—not the dashboard UI.

---

## 20. Reverse-engineering workflow you can repeat on future sites

For a deeper live inspection, use this sequence:
1. Open every product/feature route and record the user-visible behavior.
2. Inspect page source and loaded scripts to identify public frameworks and analytics, but treat detection tools as hints.
3. Use browser DevTools Network on public pages to inspect requests, response types, and public form behavior. Do not bypass authentication or access controls.
4. Inspect public job descriptions for stack clues.
5. Search official docs, developer portals, changelogs, engineering blogs, app-store descriptions, and integration directories.
6. Diagram user journeys and state transitions.
7. Separate direct evidence, likely inference, and unknowns in the final report.
8. Never infer internal database tables, private endpoints, secrets, or exact model prompts from marketing copy alone.

---

## 21. Sources

Primary/public sources used:
1. [Alvys homepage and product overview](https://alvys.com/)
2. [Alvys features](https://alvys.com/features)
3. [Alvys Intelligence](https://alvys.com/features/alvys-intelligence)
4. [Alvys Foundry AI agents](https://alvys.com/features/ai-agents)
5. [Alvys Driver Mobile App](https://alvys.com/features/driver-mobile-app)
6. [Alvys native EDI engineering write-up, 28 September 2026](https://alvys.com/blog/alvys-native-edi-build-story)
7. [Alvys public API article](https://alvys.com/blog/unlock-new-efficiency-with-the-alvys-public-api)
8. [Alvys integrations](https://alvys.com/features/integrations)
9. [Alvys hybrid TMS](https://alvys.com/hybrid-tms)
10. [Alvys Senior Full Stack Engineer listing](https://job-boards.greenhouse.io/alvys/jobs/5278601008)
11. [Alvys Engineering Manager listing](https://jobs.bonfirevc.com/companies/alvys/jobs/72806312-engineering-manager)

## Final takeaway

The core lesson is **data and workflow integration first, AI second**. A useful Alvys-like product needs a reliable load lifecycle, clean tenant-scoped data, robust EDI/connectors, mobile events and document handling. AI can then read documents, answer questions, identify exceptions, and run bounded workflows—but every consequential write should pass through deterministic business rules, permissions, idempotency, and appropriate human approval.
