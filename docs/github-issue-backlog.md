# GitHub Issue Backlog (MVP)

Use this format when creating each GitHub issue:
- Title: `[Tag] Action item`
- Body: Maximum two bullet points
- Assignee: Set a real teammate username before moving to `In Progress`
- Label: `frontend`, `backend`, `ai`, `data`, `qa`, etc.

## Core Workflow (P0)

### 1) [AI] Implement lead scoring and temperature functions in `ai_agent.py`
Body:
- Add `compute_lead_score()` and `compute_lead_temperature()` using MVP scoring rules (+20 pain point/timeline/decision-maker/budget, +10 contact details, +10 proposal intent) with score breakdown output.
- Wire into `/agent/message` and `/leads/{lead_id}/score` so responses are explainable and consistent; reference MVP Section 15.
Assignee: `@<ai-teammate>`
Label: `ai`

### 2) [AI] Implement offer recommendation matcher in `ai_agent.py`
Body:
- Add `recommend_offer_from_profile()` that evaluates all four MVP offers and returns best match plus rationale text for the sales team.
- Use Couchbase `offers` collection as primary rule source with safe fallback defaults; reference MVP Section 16.
Assignee: `@<ai-teammate>`
Label: `ai`

### 3) [AI] Add next-best-action logic from score, intent, and objections
Body:
- Implement deterministic next-step rules (Hot/Warm/Cold) and objection-aware actions (pricing-first, not urgent, needs proof, etc.).
- Persist `next_best_action` on lead updates and return it from `/agent/message` and `/agent/end`; reference MVP Sections 9 and 10.
Assignee: `@<ai-teammate>`
Label: `ai`

### 4) [Backend] Build campaign setup endpoints for Couchbase `campaigns`
Body:
- Add `POST /campaigns`, `GET /campaigns`, and `GET /campaigns/{id}` with validation for language mode and qualification rules.
- Store campaign config in `workflow_ph.sales_agent.campaigns` exactly as MVP structure; reference MVP Sections 11 and 12.
Assignee: `@<backend-teammate>`
Label: `backend`

### 5) [Backend] Create dashboard stats endpoint for live sales outcomes
Body:
- Add `GET /dashboard/stats` returning total/hot/warm/cold leads, latest leads, follow-ups generated, and top objections.
- Back it with indexed Couchbase queries for fast reads during demo; reference MVP Sections 10, 11, and 12.
Assignee: `@<backend-teammate>`
Label: `backend`

### 6) [Backend] Persist conversation summary and buying signals on `POST /agent/end`
Body:
- Generate and save concise conversation summary, objections, and buying signals into `conversations` and linked lead outcome fields.
- Ensure `/leads/{lead_id}` returns complete lead + conversation + follow-up payload for detail view; reference MVP Sections 9 and 11.
Assignee: `@<backend-teammate>`
Label: `backend`

### 7) [Backend] Bridge Agora CAE transcript flow to sales lead workflow
Body:
- Connect live conversation flow so transcript updates also drive lead extraction, scoring, offer recommendation, and objection detection in real time.
- Define one source of truth for lead state between `/agora/convo/*` and `/agent/*` paths to avoid divergence; reference MVP Section 8.
Assignee: `@<backend-teammate>`
Label: `backend`

## Frontend Delivery (P0)

### 8) [Frontend] Build campaign setup page with API integration
Body:
- Replace placeholder `/campaign` page with form fields: campaign name, target industry, persona, sales goal, language mode, qualification rules, and offer list.
- Submit to campaign API and show success/error state with saved config preview; reference MVP Section 11.
Assignee: `@<frontend-teammate>`
Label: `frontend`

### 9) [Frontend] Build leads list page from `GET /leads`
Body:
- Replace placeholder `/leads` page with table/cards showing company, score, temperature, recommended offer, status, and created date.
- Add filters for temperature/status and click-through to `/leads/[id]`; reference MVP Sections 10 and 11.
Assignee: `@<frontend-teammate>`
Label: `frontend`

### 10) [Frontend] Build lead detail page from `GET /leads/{lead_id}`
Body:
- Render lead profile, transcript, score breakdown, objections, buying signals, recommended offer, follow-up, and next-best action.
- Add manual actions for re-score, recommend-offer, and regenerate follow-up to support demo flow; reference MVP Sections 11 and 13.
Assignee: `@<frontend-teammate>`
Label: `frontend`

### 11) [Frontend] Build live sales dashboard page
Body:
- Replace placeholder `/dashboard` page with KPI widgets: total leads, hot/warm/cold, latest lead, follow-ups, and top objections.
- Poll or refresh from dashboard endpoint and align visual states for live demo reliability; reference MVP Sections 10 and 11.
Assignee: `@<frontend-teammate>`
Label: `frontend`

### 12) [Frontend] Add live lead insight panel to `/agent` page
Body:
- Show real-time lead profile fields, lead score, temperature, recommended offer, objections, and next-best action beside transcript.
- Keep panel synced with backend sales outcomes each turn so the demo clearly shows conversation-to-workflow conversion; reference MVP Sections 8 and 9.
Assignee: `@<frontend-teammate>`
Label: `frontend`

## Reliability and QA (P1)

### 13) [Data] Move offer recommendation source of truth to Couchbase offers
Body:
- Fetch and cache offers/rules from `offers` collection in backend service instead of relying on hardcoded list only.
- Add graceful fallback and logs when offers are missing so recommendation still works in demo mode; reference MVP Section 12.
Assignee: `@<backend-teammate>`
Label: `data`

### 14) [QA] Add automated tests for scoring, recommendation, and API contracts
Body:
- Add unit tests for score thresholds (Hot/Warm/Cold), criteria weights, and offer matching edge cases from MVP examples.
- Add integration tests for `/agent/message`, `/leads/{id}`, and `/dashboard/stats` response contracts before hackathon demo freeze.
Assignee: `@<qa-teammate>`
Label: `qa`

## B2B Data Foundation (P0)

### 15) [Backend] Add B2B intake form collection and create endpoint
Body:
- Create `intake_forms` collection (`intake::{id}`) with `company_name`, `company_description`, `email`, `pain_points`, `status`, `created_at`, `updated_at`, plus indexes for `created_at`, `email`, and `status`.
- Add `POST /intake-forms` that saves raw form input and creates/links a lead record for the B2B sales flow.
Assignee: `@<backend-teammate>`
Label: `backend`

### 16) [Backend] Add lead context document store for optional PDF extraction
Body:
- Create `lead_context_docs` collection (`context::{id}`) linked by `lead_id`, with `source_type`, `extraction_status`, raw payload, and extracted summary/fields for teammate PDF integration.
- Add `POST /leads/{lead_id}/context-docs` and `GET /leads/{lead_id}/context-docs` with status lifecycle support (`pending`, `processed`, `failed`).
Assignee: `@<backend-teammate>`
Label: `backend`

### 17) [Backend] Add discovery call booking collection and lead linkage
Body:
- Create `discovery_calls` collection (`discovery_call::{id}`) linked to `lead_id` (and optional `conversation_id`) with slot, timezone, status lifecycle, and booking timestamps.
- Add `POST /leads/{lead_id}/book-call` and `GET /leads/{lead_id}/book-calls`, and mirror latest call summary to lead fields (`call_status`, `call_slot`, `next_best_action`).
Assignee: `@<backend-teammate>`
Label: `backend`

### 18) [Frontend] Build and refine lead intake forms with optional PDF upload
Body:
- Build and refine the frontend lead intake forms to capture name, description, pain point, clients want to find, urgency, budget readiness, decision-maker status, and preferred next step.
- Support optional PDF upload (linking to `POST /leads/{lead_id}/context-docs`) and integrate form submission with `POST /intake-forms` for NoSQL storing with the ultimate goal of booking a discovery call.
Assignee: `@<frontend-teammate>`
Label: `frontend`

### 19) [Backend] Refine intake forms schema and Couchbase lead mapping
Body:
- Expand `POST /intake-forms` and `IntakeFormCreateRequest` schema to support: contact name, company description, pain points, target clients, urgency, budget readiness, decision-maker status, preferred next step, and optional PDF attachment.
- Persist the refined fields to the Couchbase `intake_forms` document and automatically map them to the linked `leads` document fields, making them ready for downstream AI scoring and discovery calls.
Assignee: `@<backend-teammate>`
Label: `backend`

### 20) [Backend] Consolidate Couchbase into fewa-workflow-ph with B2B/B2C scopes
Body:
- Create/verify bucket `fewa-workflow-ph` and add scopes `b2b` and `b2c`, each with required collections/indexes used by the current sales workflow (`leads`, `conversations`, `follow_ups`, `offers`, `campaigns`, `intake_forms`, `lead_context_docs`, `discovery_calls`).
- Add flow-aware backend config/routing so B2B traffic reads/writes to `b2b` and B2C traffic to `b2c`, while keeping existing `sales_agent` path temporarily active for backward compatibility and staged cutover.
Assignee: `@<backend-teammate>`
Label: `backend`
