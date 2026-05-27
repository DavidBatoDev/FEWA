# Workflow PH — MVP Documentation
## AI Agent Deployment Platform for Philippine Businesses

---

## 1. Project Overview

**Workflow PH** is an AI agent deployment platform that lets Philippine businesses deploy voice-powered AI agents built for real business outcomes.

Built on top of Agora's Conversational AI infrastructure, Workflow PH adds the business workflow layer that general-purpose agent builders don't have — pre-built sales logic, lead scoring, commerce checkout, CRM dashboards, and Philippine market context baked in.

The platform ships with two deployable agent types:

- **Sales Agent** — for B2B service businesses that need to qualify leads, score opportunities, recommend offers, and book discovery calls
- **Commerce Agent** — for B2C product businesses that need to guide customers from discovery to checkout through natural conversation

Both agents share the same core infrastructure: Agora voice, OpenAI tool calling, Couchbase database, and FastAPI backend.

---

## 2. The Problem with Existing Tools

**Agora Conversational AI Studio** is a powerful general-purpose voice agent builder for developers. It lets you configure system prompts, connect MCP servers, set up knowledge bases, and deploy agents to telephony. It is infrastructure.

But Philippine SMEs don't need infrastructure. They need outcomes.

A logistics company owner doesn't want to configure a system prompt. They want to know if the lead who just called is worth following up. A local electronics store doesn't want to build a product matching engine. They want customers to stop abandoning carts.

Workflow PH answers a completely different question:

> Agora Studio asks: *"How do I build a voice agent?"*
> Workflow PH asks: *"How do I turn voice conversations into qualified leads and closed orders — for my Philippine business?"*

---

## 3. Product Positioning

### One-Liner

**Workflow PH is an AI agent deployment platform that turns conversations into qualified leads and closed orders — built for Philippine businesses, powered by Agora.**

### Short Pitch

Most Philippine SMEs lose revenue not because they lack customers, but because their conversations don't convert. Leads are not qualified. Inquiries are not tracked. Orders are abandoned before checkout.

Workflow PH deploys AI agents that handle the entire sales or commerce workflow — from the first "Hello" to a booked discovery call or a confirmed order — with live dashboards showing every business outcome in real time.

### Hackathon Pitch Angle

This is not a chatbot. This is not a generic agent builder.

This is a **vertical AI agent platform** — built on Agora's voice infrastructure, extended with business workflow intelligence, and designed specifically for the Philippine market.

> Agora powers the voice. Workflow PH powers the outcome.

---

## 4. Platform Architecture

```
                    Workflow PH Platform
    ┌───────────────────────────────────────────────────┐
    │                                                   │
    │              Shared Core Infrastructure           │
    │   Agora Voice · OpenAI Tools · Couchbase · FastAPI│
    │                                                   │
    │        ┌──────────────┬──────────────┐            │
    │        │  Sales Agent │Commerce Agent│            │
    │        │    (B2B)     │    (B2C)     │            │
    │        │              │              │            │
    │        │extract_lead  │search_product│            │
    │        │score_lead    │match_prefs   │            │
    │        │detect_object │compare_items │            │
    │        │recommend_offer│build_order  │            │
    │        │book_call     │checkout_prep │            │
    │        │gen_followup  │gen_receipt   │            │
    │        └──────────────┴──────────────┘            │
    │                                                   │
    │              Live Business Dashboard              │
    └───────────────────────────────────────────────────┘
```

### Key Principle: Same Base, Different Tools

Both agents use the same conversation loop, the same tool calling framework, and the same database structure. The only difference is which tools are loaded and what the right panel of the UI displays.

Building the Commerce Agent is approximately 40% additional work on top of the Sales Agent — not a full rebuild.

---

## 5. Agent Type 1: Sales Agent (B2B)

### What It Does

The Sales Agent conducts natural voice sales conversations with leads, extracts structured information, scores the opportunity, recommends the right service package, detects objections and buying signals, and books a discovery call — all before the conversation ends.

### The 6 Sales Tools

Every tool fires in real time and triggers a visible update on the right panel of the screen.

#### `extract_lead_info()`
- **Fires when:** name, company, industry, or pain point is mentioned
- **Visual trigger:** Lead profile panel fills in field by field
- **Data extracted:** company, industry, pain point, current solution, timeline, budget readiness, decision maker status, contact details

#### `detect_objection()`
- **Fires when:** hesitation words detected (mahal, need to think, ask partner, not sure yet)
- **Visual trigger:** Red objection badge appears with the objection type labeled
- **Objection types:** Price concern · Needs approval · Already has supplier · No budget · Not urgent · Wants proof

#### `score_lead()`
- **Fires when:** enough profile data has been collected
- **Visual trigger:** Score meter animates to the number, temperature label changes color
- **Scoring rules:**
  - Clear pain point: +20
  - Urgent timeline: +20
  - Decision maker: +20
  - Budget readiness: +20
  - Contact details provided: +10
  - Asked for proposal or demo: +10
- **Temperature:** Hot (80–100) · Warm (50–79) · Cold (below 50)

#### `recommend_offer()`
- **Fires when:** pain point and context are clear enough to match an offer
- **Visual trigger:** Offer card slides into the panel with package name, description, and fit reason
- **Offers:**
  - Lead Capture Starter — no website or form yet
  - Growth Campaign Package — needs more leads
  - Sales Automation Package — losing inquiries due to poor tracking
  - Enterprise Workflow Package — complex sales process, needs integrations

#### `book_discovery_call()`
- **Fires when:** lead is scored Hot or Warm and agent asks for commitment
- **Visual trigger:** Calendar widget appears inside the conversation
- **Outcome:** Call slot booked before the conversation ends

#### `generate_follow_up()`
- **Fires when:** conversation ends
- **Visual trigger:** Email draft appears in a preview panel, personalized with company name, pain point, and recommended offer

### Sales Agent Demo Scenario

```
Lead:   Hi, I run a logistics company and we need more clients.
        → extract_lead_info() fires
        → Panel: Company: Logistics company ✓

Agent:  Gets ko. Are you mainly trying to get more inquiries,
        or do you also lose leads because of poor follow-up?

Lead:   Both. We lose inquiries kasi di namin na-track.
        → extract_lead_info() fires again
        → Panel: Pain point: Lost inquiries, no tracking ✓

Agent:  How soon do you want to fix this?

Lead:   This month. Peak season na.
        → extract_lead_info() fires
        → Panel: Timeline: This month — urgent ✓

Agent:  Are you the one who decides on this?

Lead:   Yes, I'm the owner.
        → score_lead() fires
        → Score meter animates: 90 — HOT 🔴

Agent:  Based on what you shared, I recommend the
        Sales Automation Package — CRM, tracking, follow-ups.
        → recommend_offer() fires
        → Offer card slides in: Sales Automation Package

Lead:   Magkano ba?
        → detect_objection() fires
        → Badge: Objection: Pricing concern

Agent:  Custom pricing depende sa setup — gusto mo mag-book
        ng quick 20-minute call para mapag-usapan natin?
        → book_discovery_call() fires
        → Calendar widget appears

Lead:   Sure, Wednesday 2pm.
        → Slot confirmed ✓

[Call ends]
        → generate_follow_up() fires
        → Personalized email draft appears
```

### Sales Dashboard Output

```
Lead:             ABC Logistics
Industry:         Logistics
Pain Point:       Lost inquiries, no tracking
Timeline:         This month
Decision Maker:   Yes
Objection:        Pricing concern
Recommended:      Sales Automation Package
Lead Score:       90
Temperature:      Hot 🔴
Call Booked:      Wednesday 2pm ✓
Follow-Up:        Generated ✓
```

---

## 6. Agent Type 2: Commerce Agent (B2C)

### What It Does

The Commerce Agent guides customers through a conversational shopping experience — understanding preferences, recommending products, comparing options, building an order form, verifying details, and preparing checkout — all through voice or chat.

### The 6 Commerce Tools

#### `extract_preferences()`
- **Fires when:** budget, use case, brand preference, or priorities are mentioned
- **Visual trigger:** Preferences panel fills in live
- **Data extracted:** category, budget, brand preference, use case, priorities

#### `search_products()`
- **Fires when:** preferences are clear enough to match catalog items
- **Visual trigger:** Product cards appear in the right panel with name, price, and key specs
- **Output:** Top 3 matching products with match reason

#### `compare_items()`
- **Fires when:** customer asks "which is better" or expresses doubt between options
- **Visual trigger:** Side-by-side comparison table appears
- **Output:** Pros and cons per product based on stated preferences

#### `build_order()`
- **Fires when:** customer selects a product
- **Visual trigger:** Order form assembles itself field by field
- **Data collected:** customer name, email, phone, delivery address, product, quantity

#### `verify_order()`
- **Fires when:** order form is complete
- **Visual trigger:** Order summary card appears for confirmation
- **Agent behavior:** Reads back order details and asks for confirmation

#### `checkout_prep()`
- **Fires when:** customer confirms order
- **Visual trigger:** Checkout screen with order total, payment options, and reference number
- **Output:** Order record saved, revenue logged in dashboard

### Commerce Agent Demo Scenario

```
Customer: I'm looking for a laptop for programming.
          → extract_preferences() fires
          → Panel: Use case: Programming ✓

Agent:    What's your budget range?

Customer: Around 60,000 pesos.
          → extract_preferences() fires
          → Panel: Budget: ₱60,000 ✓

Agent:    Any brand preference?

Customer: I prefer Lenovo pero open naman.
          → extract_preferences() fires
          → search_products() fires
          → Product cards appear: ThinkPad E14 · ASUS Vivobook · Acer Swift Go

Agent:    Top picks based on your budget: ThinkPad E14,
          ASUS Vivobook, and Acer Swift Go.

Customer: Ano mas maganda, ThinkPad or ASUS?
          → compare_items() fires
          → Side-by-side comparison appears

Agent:    ThinkPad wins on build quality and keyboard —
          ideal for long coding sessions. ASUS has better display.
          For programming, ThinkPad fits better.

Customer: ThinkPad na nga.
          → build_order() fires
          → Order form assembles

Agent:    Can I get your name and delivery address?

Customer: Juan dela Cruz, Quezon City.

Agent:    ThinkPad E14 at ₱58,999 delivered to Juan dela Cruz
          in Quezon City. Tama ba?
          → verify_order() fires
          → Order summary appears

Customer: Yes, correct.
          → checkout_prep() fires
          → Checkout screen: Reference WPH-2026-00142
```

---

## 7. Locked-In Tech Stack

```
Frontend:    Next.js + TypeScript + Tailwind CSS + shadcn/ui
Backend:     FastAPI + Python
Database:    Couchbase Capella (Free Tier)
AI:          OpenAI API — GPT-4o mini
Voice:       Agora Conversational AI (Web SDK)
Hosting FE:  Vercel
Hosting BE:  Render or Railway
```

---

## 8. Application Pages

### Page 1: Agent Selector / Home
- Platform headline
- Two agent type cards: Sales Agent (B2B) · Commerce Agent (B2C)
- Each shows: description, target industry, sample outcomes
- "Deploy Agent" button

### Page 2: Agent Configuration
Sales Agent fields: campaign name, target industry, agent persona, language mode, offers
Commerce Agent fields: store name, product catalog, agent persona, language mode, checkout method

### Page 3: Voice Agent Screen

Left panel:
- Start / End call button
- Voice status
- Live transcript
- AI response display
- **Tool activity log** (each tool fires here with timestamp)

Right panel (Sales):
- Lead profile · Score meter · Temperature badge · Offer card · Objection badges · Calendar widget · Follow-up preview

Right panel (Commerce):
- Preferences panel · Product cards · Comparison view · Order form · Checkout screen

### Page 4: Business Dashboard

Sales widgets: Total leads · Hot/Warm/Cold · Average score · Top objections · Booked calls · Follow-ups generated

Commerce widgets: Total conversations · Orders created · Orders completed · Revenue · Average order value · Conversion rate

### Page 5: Record Detail Page
- Full transcript
- Tool calls fired (timeline view)
- Lead profile or order details
- Score breakdown or order breakdown
- Follow-up email or receipt
- Next-best action

---

## 9. Couchbase Data Model

**Bucket:** `workflow_ph` | **Scope:** `sales_agent`

**Collections:** `campaigns` · `leads` · `orders` · `products` · `conversations` · `follow_ups`

### Sample: Lead Document
```json
{
  "type": "lead",
  "campaign_id": "campaign::sme-sales",
  "company": "ABC Logistics",
  "industry": "Logistics",
  "pain_point": "Losing inquiries due to poor tracking",
  "timeline": "This month",
  "budget_readiness": "Open to proposal",
  "decision_maker": true,
  "objections": ["Pricing concern"],
  "buying_signals": ["Urgent timeline", "Decision maker", "Clear pain point"],
  "lead_score": 90,
  "lead_temperature": "Hot",
  "recommended_offer": "Sales Automation Package",
  "next_best_action": "Discovery call booked — Wednesday 2pm",
  "status": "call_booked",
  "created_at": "2026-05-27T00:00:00Z"
}
```

### Sample: Order Document
```json
{
  "type": "order",
  "customer_name": "Juan dela Cruz",
  "email": "juan@email.com",
  "address": "Quezon City",
  "product_name": "Lenovo ThinkPad E14",
  "amount": 58999,
  "status": "awaiting_payment",
  "reference": "WPH-2026-00142",
  "created_at": "2026-05-27T00:00:00Z"
}
```

### Sample: Conversation Document
```json
{
  "type": "conversation",
  "agent_type": "sales",
  "record_id": "lead::abc-logistics",
  "transcript": [],
  "tools_fired": [
    { "tool": "extract_lead_info", "timestamp": "00:08", "data": {} },
    { "tool": "score_lead", "timestamp": "00:34", "score": 90 },
    { "tool": "recommend_offer", "timestamp": "00:41", "offer": "Sales Automation Package" },
    { "tool": "detect_objection", "timestamp": "00:53", "type": "price_concern" },
    { "tool": "book_discovery_call", "timestamp": "01:10", "slot": "Wednesday 2pm" },
    { "tool": "generate_follow_up", "timestamp": "01:45" }
  ],
  "summary": "Logistics owner needs lead tracking and follow-up automation. Urgent, decision maker, price concern raised.",
  "created_at": "2026-05-27T00:00:00Z"
}
```

---

## 10. FastAPI Endpoints

### Agent (Shared)
```
POST   /agent/start
POST   /agent/message
POST   /agent/end
```

### Sales Agent
```
GET    /leads
GET    /leads/{id}
PATCH  /leads/{id}
POST   /leads/{id}/score
POST   /leads/{id}/recommend
POST   /leads/{id}/followup
POST   /leads/{id}/book-call
```

### Commerce Agent
```
GET    /products
POST   /products/search
POST   /products/compare
POST   /orders
GET    /orders
GET    /orders/{id}
PATCH  /orders/{id}
```

### Agora
```
POST   /agora/token
```

---

## 11. OpenAI Tool Definitions (Sales Agent)

```python
sales_tools = [
    {
        "type": "function",
        "function": {
            "name": "extract_lead_info",
            "description": "Extract structured lead information from the conversation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "company": {"type": "string"},
                    "industry": {"type": "string"},
                    "pain_point": {"type": "string"},
                    "timeline": {"type": "string"},
                    "budget_readiness": {"type": "string"},
                    "decision_maker": {"type": "boolean"},
                    "contact_name": {"type": "string"},
                    "contact_email": {"type": "string"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "detect_objection",
            "description": "Detect a sales objection from the lead's message.",
            "parameters": {
                "type": "object",
                "properties": {
                    "objection_type": {
                        "type": "string",
                        "enum": ["price_concern","needs_approval","has_supplier",
                                 "no_budget","not_urgent","wants_proof","just_browsing"]
                    },
                    "raw_quote": {"type": "string"}
                },
                "required": ["objection_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "score_lead",
            "description": "Score the lead based on collected profile data.",
            "parameters": {
                "type": "object",
                "properties": {
                    "score": {"type": "integer", "minimum": 0, "maximum": 100},
                    "temperature": {"type": "string", "enum": ["Hot","Warm","Cold"]},
                    "score_breakdown": {
                        "type": "object",
                        "properties": {
                            "has_pain_point": {"type": "boolean"},
                            "urgent_timeline": {"type": "boolean"},
                            "is_decision_maker": {"type": "boolean"},
                            "budget_ready": {"type": "boolean"},
                            "contact_provided": {"type": "boolean"},
                            "asked_for_proposal": {"type": "boolean"}
                        }
                    }
                },
                "required": ["score", "temperature"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "recommend_offer",
            "description": "Recommend the most relevant service offer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "offer_id": {
                        "type": "string",
                        "enum": ["lead_capture_starter","growth_campaign_package",
                                 "sales_automation_package","enterprise_workflow_package"]
                    },
                    "reason": {"type": "string"}
                },
                "required": ["offer_id", "reason"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "book_discovery_call",
            "description": "Book a discovery call with the lead.",
            "parameters": {
                "type": "object",
                "properties": {
                    "preferred_day": {"type": "string"},
                    "preferred_time": {"type": "string"},
                    "confirmed": {"type": "boolean"}
                },
                "required": ["confirmed"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_follow_up",
            "description": "Generate a personalized follow-up email after the call.",
            "parameters": {
                "type": "object",
                "properties": {
                    "subject": {"type": "string"},
                    "body": {"type": "string"}
                },
                "required": ["subject", "body"]
            }
        }
    }
]
```

---

## 12. System Prompts

### Sales Agent
```
You are Workflow PH Sales Agent — a real-time AI sales qualification agent
for Philippine service businesses.

Your job is to turn conversations into qualified sales opportunities.

Rules:
1. Ask one question at a time.
2. Keep responses short and natural.
3. Do not sound like a form.
4. Understand the customer's business and pain point first.
5. Ask about urgency, budget readiness, and decision-maker status.
6. Detect objections calmly — do not push too hard.
7. Recommend an offer only after enough context is gathered.
8. If the lead is Hot or Warm, ask to book a discovery call before ending.
9. Never overpromise. Never pressure.
10. If unsure, suggest a human consultation.

Language: If the lead speaks Taglish, respond in Taglish naturally.
Style: Consultative, friendly, concise, confident.

When you detect structured data — pain point, objection, score signal —
call the appropriate tool immediately. Do not wait until the end.
```

### Commerce Agent
```
You are Workflow PH Commerce Agent — a real-time AI shopping assistant
for Philippine product businesses.

Your job is to guide customers from product discovery to completed order.

Rules:
1. Ask one question at a time.
2. Understand preferences before recommending anything.
3. Never overwhelm the customer with too many options at once.
4. Recommend only after budget and use case are clear.
5. Explain your recommendation in simple terms.
6. Verify order details before confirming checkout.
7. Never push the customer. Let them decide.

Language: Taglish is welcome if the customer uses it.
Style: Helpful, warm, clear, conversational.

When you have enough data to match products, call search_products immediately.
When the customer selects a product, call build_order immediately.
```

---

## 13. Development Plan

### Phase 1: Sales Agent Core
Goal: Complete sales workflow in text/chat mode

1. Next.js two-panel layout
2. FastAPI project setup
3. Couchbase schema and collections
4. OpenAI tool calling loop
5. All 6 sales tools working
6. Right panel updating live on tool fire
7. Lead saved to Couchbase
8. Sales dashboard showing live data

### Phase 2: Commerce Agent
Goal: Complete commerce workflow in text/chat mode

1. Reuse agent loop — swap tool set
2. Add products collection, seed mock catalog
3. Build 6 commerce tools
4. Update right panel for commerce outcomes
5. Mock checkout screen
6. Order saved to Couchbase
7. Commerce dashboard tab

### Phase 3: Agora Voice
Goal: Both agents work with real voice input

1. Agora Web SDK integrated
2. `/agora/token` endpoint in FastAPI
3. Start / end call controls working
4. Speech input wired to agent message loop
5. AI response displayed and played

### Phase 4: Hackathon Polish
Goal: Demo-ready and pitch-ready

1. Taglish mode toggle
2. Tool activity log strip
3. Demo data pre-loaded
4. Agent selector home page
5. Dashboard with populated sample data
6. Pitch script finalized

---

## 14. Demo Strategy

### Primary: Sales Agent (Live on Stage)
Run the logistics scenario live. Shows voice via Agora, 6 tool fires, score meter animating, calendar booking, follow-up generating. This is the wow moment.

### Secondary: Commerce Agent (Pre-loaded State)
Show a pre-loaded completed order or a 90-second recording of the laptop scenario.

**Framing:** *"That was our B2B Sales Agent turning a conversation into a booked call. Here's the same platform deployed for a B2C electronics store — same infrastructure, completely different business outcome."*

### When Judges Ask About Agora Studio
*"Agora Studio is infrastructure for developers — and it's excellent. We built on top of it. Workflow PH adds the business layer: pre-built sales workflows, lead scoring, commerce checkout, and a live dashboard designed for Philippine SMEs. You don't configure an agent. You pick your business type and deploy."*

---

## 15. Tool Activity Log (Key UI Feature)

A strip at the bottom of the voice screen showing each tool as it fires:

```
✓ extract_lead_info      00:08   Company: ABC Logistics
✓ extract_lead_info      00:21   Pain point: Lost inquiries
✓ score_lead             00:34   Score: 90 — Hot
✓ recommend_offer        00:41   Sales Automation Package
✓ detect_objection       00:53   Pricing concern
✓ book_discovery_call    01:10   Wednesday 2pm confirmed
✓ generate_follow_up     01:45   Email draft ready
```

This makes the AI's agentic behavior visible to judges without them needing to read code.

---

## 16. Build Priority Checklist

### Critical
- [ ] Next.js two-panel layout
- [ ] FastAPI project and agent loop
- [ ] Couchbase schema
- [ ] OpenAI tool calling working
- [ ] All 6 sales tools firing
- [ ] Right panel updating live
- [ ] Lead saved to database
- [ ] Sales dashboard
- [ ] Agora voice session
- [ ] Agent selector home page

### Important
- [ ] Commerce agent tools
- [ ] Product catalog and commerce UI
- [ ] Mock checkout flow
- [ ] Commerce dashboard
- [ ] Tool activity log strip
- [ ] Follow-up email generator
- [ ] Record detail page

### Nice to Have
- [ ] Taglish mode toggle
- [ ] Human handoff recommendation
- [ ] Campaign configuration page
- [ ] Calendar booking widget
- [ ] Analytics charts

---

## 17. Environment Variables

### Frontend `.env.local`
```
NEXT_PUBLIC_API_BASE_URL=https://your-fastapi-backend.com
NEXT_PUBLIC_AGORA_APP_ID=your_agora_app_id
```

### Backend `.env`
```
OPENAI_API_KEY=your_openai_key
COUCHBASE_CONNECTION_STRING=your_connection_string
COUCHBASE_USERNAME=your_username
COUCHBASE_PASSWORD=your_password
COUCHBASE_BUCKET=workflow_ph
COUCHBASE_SCOPE=sales_agent
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_certificate
```

Never expose in frontend: `OPENAI_API_KEY` · `COUCHBASE_PASSWORD` · `AGORA_APP_CERTIFICATE`

---

## 18. MVP Success Criteria

**Sales Agent succeeds if:**
1. Lead starts a voice conversation via Agora
2. Tools fire in real time and update the UI panel
3. Lead is scored Hot, Warm, or Cold with visible meter
4. System recommends a service offer
5. System detects at least one objection
6. Agent books a discovery call before conversation ends
7. Follow-up email is generated
8. Lead record appears in dashboard

**Commerce Agent succeeds if:**
1. Agent extracts preferences and product cards appear live
2. Customer selects product and order form assembles
3. Customer confirms and checkout screen appears
4. Order saved and revenue logged in dashboard

---

## 19. Core Message for Judges

> Most AI demos stop at conversation.
>
> Workflow PH turns every conversation into a qualified lead,
> a booked call, a confirmed order, and a real business outcome —
> with every step visible in real time.
>
> We built on Agora's infrastructure.
> We added the business layer Philippine SMEs actually need.
>
> This is not a chatbot. This is a platform.