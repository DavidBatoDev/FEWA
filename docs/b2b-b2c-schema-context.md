# B2B and B2C Document Schema Context

This document is the quick schema reference for the current backend implementation.

It covers:
- Bucket/scope/flow routing
- Collection-level document shapes
- Key formats
- Which collections are B2B-first vs B2C-first

## Storage Layout

- Bucket: from `COUCHBASE_BUCKET` (example: `fewa-workflow-ph` or `workflow_ph`)
- Scopes:
  - `b2b` for B2B traffic
  - `b2c` for B2C traffic
  - `sales_agent` remains supported as legacy compatibility scope
- Scope routing source:
  - Header: `x-sales-flow: b2b|b2c`
  - Query: `?flow=b2b|b2c`

## Collections Provisioned Per Scope

- `campaigns`
- `leads`
- `conversations`
- `follow_ups`
- `offers`
- `intake_forms`
- `lead_context_docs`
- `discovery_calls`
- `products`
- `orders`

## Key Patterns

- Lead: `lead::{uuid}`
- Conversation: `convo::{uuid}`
- Follow-up: `followup::{uuid}`
- Campaign: `campaign::{uuid}`
- Offer: `offer::{slug-or-uuid}`
- Intake form: `intake::{uuid}`
- Context doc: `context::{uuid}`
- Discovery call: `discovery_call::{uuid}`
- Product: `product::{uuid-or-sku}`
- Order: `order::{uuid}`

## B2B Core Schemas

### `leads`
Purpose: canonical lead state used by `/agent/*`, `/leads/*`, dashboard, and call-booking flows.

Fields:
- `type`: `"lead"`
- `campaign_id`: `string|null`
- `name`, `email`, `phone`, `company`, `industry`: `string|null`
- `pain_point`, `current_solution`, `timeline`, `budget_readiness`, `decision_maker`: `string|null`
- `buying_intent`: `string|null`
- `intake_form_id`: `string|null`
- `call_status`: `string|null`
- `call_slot`: `string|null`
- `context_status`: `string|null`
- `conversation_summary`: `string|null`
- `objections`: `string[]`
- `buying_signals`: `string[]`
- `lead_score`: `number`
- `lead_temperature`: `"Hot"|"Warm"|"Cold"|null`
- `asked_for_proposal`: `boolean|null`
- `score_breakdown`: `object|null`
- `recommended_offer`: `string|null`
- `next_best_action`: `string|null`
- `status`: `"new"|"in_progress"|"qualified"|"disqualified"`
- `created_at`, `updated_at`: ISO timestamp strings

### `conversations`
Purpose: transcript, extracted outcomes, and tool activity.

Fields:
- `type`: `"conversation"`
- `lead_id`: `string` (lead key)
- `session_context`: `object|null`
- `processed_turn_keys`: `string[]`
- `transcript`: `{ role: "user"|"assistant", message: string, timestamp: string }[]`
- `summary`: `string|null`
- `objections`: `string[]`
- `buying_signals`: `string[]`
- `tool_activity_log`: `object[]`
- `commerce_state`: `object` (optional runtime state for B2C tool flow)
- `created_at`, `updated_at`: ISO timestamp strings

### `follow_ups`
Purpose: generated follow-up drafts linked to a lead.

Fields:
- `type`: `"follow_up"`
- `lead_id`: `string`
- `subject`: `string`
- `body`: `string`
- `status`: usually `"draft"`
- `created_at`: ISO timestamp string

### `campaigns`
Purpose: campaign setup and qualification config.

Fields:
- `type`: `"campaign"`
- `name`, `target_industry`, `agent_persona`, `goal`: `string`
- `language_mode`: `"English"|"Taglish"|"Filipino"`
- `qualification_rules`:
  - `required_fields`: `string[]`
  - `hot_lead_threshold`: `number`
  - `warm_lead_threshold`: `number`
- `created_at`: ISO timestamp string

### `offers`
Purpose: offer recommendation rule source.

Fields:
- `type`: `"offer"`
- `name`: `string`
- `description`: `string`
- `best_for`: `string[]`
- `price_range`: `string`
- `rules`:
  - `match_keywords`: `string[]`
  - `recommended_when`: `string[]`
- `created_at`: ISO timestamp string

### `intake_forms`
Purpose: raw B2B form capture before or during lead creation.

Fields:
- `type`: `"intake_form"`
- `lead_id`: `string`
- `company_name`, `company_description`, `email`: `string`
- `pain_points`: `string[]`
- `contact_name`, `target_clients`, `urgency`, `budget_readiness`, `decision_maker`, `preferred_next_step`: `string|null`
- `uploaded_pdf_id`: `string|null`
- `status`: typically `"submitted"`
- `created_at`, `updated_at`: ISO timestamp strings

### `lead_context_docs`
Purpose: optional business context from uploaded PDF and future sources.

Fields:
- `type`: `"lead_context_doc"`
- `lead_id`: `string`
- `source_type`: currently `"pdf"`
- `source_name`, `source_url`: `string`
- `extraction_status`: `"pending"|"processed"|"failed"`
- `extracted_summary`: `string`
- `data`:
  - `raw_payload`: `object`
  - `extracted_fields`: `object`
- `created_at`, `updated_at`: ISO timestamp strings

### `discovery_calls`
Purpose: booking lifecycle and linkage to lead/conversation.

Fields:
- `type`: `"discovery_call"`
- `lead_id`: `string`
- `conversation_id`: `string|null`
- `slot_start`: ISO timestamp string
- `slot_end`: ISO timestamp string|null
- `timezone`: `string` (example: `Asia/Manila`)
- `status`: `"proposed"|"booked"|"rescheduled"|"cancelled"|"completed"`
- `notes`: `string`
- `created_at`, `updated_at`: ISO timestamp strings

## B2C Commerce Schemas

### `products`
Purpose: B2C catalog for browse/search/compare/order flows.

Fields:
- `type`: `"product"`
- `sku`, `name`, `category`, `brand`: `string`
- `price`: `number`
- `currency`: `string` (default `PHP`)
- `description`: `string`
- `specs`: `object`
- `tags`: `string[]`
- `use_cases`: `string[]`
- `stock`: `number`
- `created_at`, `updated_at`: ISO timestamp strings

### `orders`
Purpose: B2C order lifecycle and history.

Fields:
- `type`: `"order"`
- `customer_name`, `email`, `phone`, `address`: `string`
- `items`: array of:
  - `product_id`: `string`
  - `sku`: `string`
  - `product_name`: `string`
  - `quantity`: `number`
  - `unit_price`: `number`
  - `line_total`: `number`
- `amount`: `number`
- `currency`: `string` (default `PHP`)
- `status`: `"awaiting_payment"|"paid"|"processing"|"shipped"|"completed"|"cancelled"`
- `reference`: `string` (example format: `WPH-2026-ABC123`)
- `notes`: `string`
- `created_at`, `updated_at`: ISO timestamp strings

## Practical Notes

- B2B and B2C scopes are intentionally symmetric in provisioned collections to keep deployment and scripts simple.
- For compatibility, legacy `sales_agent` scope remains available during migration/cutover.
- `GET /leads/{lead_id}` is the canonical lead detail read model (lead + latest conversation + latest follow-up).
