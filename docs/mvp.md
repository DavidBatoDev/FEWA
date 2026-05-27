# Workflow PH AI Sales Agent — MVP Documentation

## 1. Project Overview

**Workflow PH AI Sales Agent** is a real-time conversational AI sales agent platform built for Philippine service businesses. The agent does not only answer questions. It conducts natural sales conversations, qualifies leads, detects buying intent and objections, recommends the right offer, scores the opportunity, and prepares the next-best action for the sales team.

The MVP will be built for the upcoming Agora hackathon, with a strong focus on both **conversation quality** and **sales outcomes**.

---

## 2. MVP Goal

The goal of the MVP is to demonstrate that a business can deploy an AI sales agent that can:

1. Talk to leads naturally through voice.
2. Ask smart sales discovery questions.
3. Extract structured lead information from the conversation.
4. Score the lead as Hot, Warm, or Cold.
5. Recommend the most relevant offer or package.
6. Detect objections and buying signals.
7. Save the lead to a CRM-style database.
8. Generate a follow-up message or sales summary.
9. Show all sales outcomes in a live dashboard.

The product should prove this core idea:

> Conversations should not end as transcripts. They should become qualified sales opportunities.

---

## 3. Product Positioning

### One-Liner

**Workflow PH AI Sales Agent is a real-time voice AI sales agent that turns conversations into qualified leads, recommended offers, CRM records, follow-ups, and next-best actions.**

### Short Pitch

Many businesses lose potential customers because they respond late, ask inconsistent sales questions, forget to follow up, or fail to qualify leads properly. Workflow PH solves this by deploying an AI sales agent that can talk to leads in real time, understand their needs, qualify them, recommend the right offer, and prepare the sales team’s next move.

### Hackathon Pitch Angle

This is not just an AI chatbot. This is a **sales workflow agent** powered by real-time voice conversation.

Agora powers the real-time voice experience. OpenAI powers the sales intelligence. FastAPI turns the conversation into structured sales outcomes. Couchbase stores the CRM-style sales data and conversation documents. Next.js presents the live dashboard.

---

## 4. Target Users

The MVP will focus on Philippine service businesses that rely on inbound inquiries, sales conversations, and follow-ups.

Example target industries:

* Digital marketing agencies
* Web development agencies
* Aesthetic clinics
* Logistics and 3PL companies
* Real estate leasing businesses
* Travel agencies
* B2B service providers
* Consulting firms
* Local SMEs

For the hackathon demo, the recommended target segment is:

> Philippine SMEs that need more leads, better inquiry handling, and a clearer sales follow-up process.

---

## 5. Core Problem

Many SMEs struggle with sales because of gaps in their inquiry and follow-up process.

Common issues:

* Leads are not answered quickly.
* Sales teams ask inconsistent questions.
* Lead details are scattered in chats, calls, or spreadsheets.
* No clear lead scoring system exists.
* Follow-ups are delayed or forgotten.
* Sales reps do not know which leads are worth prioritizing.
* Managers cannot easily see sales outcomes from conversations.

Root problem:

> Sales conversations are happening, but they are not being converted into structured, trackable, and actionable sales workflows.

---

## 6. Proposed Solution

Workflow PH AI Sales Agent solves this by combining a natural voice conversation experience with sales workflow automation.

The AI agent can:

* Start a sales conversation with a lead.
* Ask one question at a time.
* Understand the lead’s business and pain point.
* Identify urgency, budget readiness, and decision-maker status.
* Detect buying signals and objections.
* Recommend the right service package.
* Score the lead.
* Save the lead in the database.
* Generate a sales summary and follow-up.
* Show the lead’s status in a live dashboard.

---

## 7. Locked-In Tech Stack

### Frontend

**Next.js + TypeScript + Tailwind CSS + shadcn/ui**

Purpose:

* Main user interface
* Voice agent screen
* Live lead profile panel
* Sales dashboard
* Lead detail view
* Campaign setup page

Deployment:

* **Vercel Free Tier**

### Backend

**FastAPI + Python**

Purpose:

* AI orchestration
* Sales workflow logic
* OpenAI API calls
* Lead extraction
* Lead scoring
* Offer recommendation
* Objection detection
* Couchbase database operations
* Agora token generation

Deployment options:

* Render Free/Paid Starter
* Railway
* Fly.io
* Google Cloud Run

Recommended for speed:

* **Render** or **Railway** for the hackathon MVP

### Database

**Couchbase Capella / Couchbase Cloud**

Purpose:

* Store campaigns
* Store leads
* Store conversations
* Store offers
* Store follow-ups
* Store sales outcomes
* Store AI memory/context documents
* Optional vector search or knowledge base later

Recommended MVP approach:

* Use Couchbase as the main operational database.
* Store each lead, campaign, conversation, offer, and follow-up as JSON documents.
* Use simple key-value and query patterns first.
* Add vector search/RAG only if time allows.

### AI Layer

**OpenAI API**

Primary recommended model:

* **GPT-4o mini** for affordable and fast MVP usage

Optional model:

* **GPT-5 mini** if available and budget allows

Purpose:

* Conversation intelligence
* Lead profile extraction
* Objection detection
* Offer recommendation
* Follow-up generation
* Sales summary generation

### Voice Layer

**Agora Web SDK**

Purpose:

* Required real-time voice layer
* Voice session/channel
* Real-time audio experience
* Hackathon alignment with Agora

Practical MVP approach:

* Use Agora for the live voice session.
* Use browser speech recognition for speech-to-text if needed.
* Use browser speech synthesis for text-to-speech if needed.
* Upgrade to a more advanced Agora + OpenAI Realtime flow if time allows.

### Hosting

* Frontend: **Vercel**
* Backend: **Render / Railway / Fly.io / Cloud Run**
* Database: **Couchbase Capella / Couchbase Cloud**

---

## 8. System Architecture

```text
Lead / Customer
  ↓
Next.js Web App
  ↓
Agora Voice Session
  ↓
FastAPI Backend
  ↓
OpenAI Agent Logic
  ↓
Sales Tools
  ├── Extract Lead Profile
  ├── Score Lead
  ├── Detect Objections
  ├── Recommend Offer
  ├── Generate Follow-Up
  └── Update CRM
  ↓
Couchbase Database
  ↓
Live Dashboard in Next.js
```

### Simple Explanation

* **Agora** handles the real-time voice experience.
* **Next.js** displays the conversation, live lead profile, and dashboard.
* **FastAPI** processes the AI workflow and business logic.
* **OpenAI** generates intelligent sales responses and structured outputs.
* **Couchbase** stores all lead, campaign, offer, follow-up, and conversation documents.
* **Vercel** hosts the frontend.

---

## 9. MVP User Flow

### Step 1: Sales Manager Creates Campaign

The sales manager creates a campaign with the following settings:

* Campaign name
* Target industry
* Agent persona
* Sales goal
* Language mode
* Qualification rules
* Offer list

Example:

```text
Campaign Name: Philippine SME Sales Campaign
Target Industry: Service Businesses
Agent Persona: Friendly Taglish Sales Consultant
Sales Goal: Qualify leads and book discovery calls
Language Mode: Taglish
```

### Step 2: Lead Enters Voice Conversation

The lead starts a voice conversation with the AI sales agent.

Example lead message:

> Hi, I run a logistics company and we need more clients.

### Step 3: AI Conducts Discovery

The AI asks natural discovery questions, one at a time.

Example:

> Got it. Are you mainly trying to get more inquiries, improve follow-ups, or automate your sales tracking?

### Step 4: AI Qualifies Lead

The AI gathers:

* Business type
* Pain point
* Urgency
* Current solution
* Budget readiness
* Decision-maker status
* Contact details
* Buying intent
* Objections

### Step 5: Dashboard Updates

As the conversation happens, the dashboard updates with:

* Lead profile
* Lead score
* Lead temperature
* Recommended offer
* Detected objections
* Next-best action

### Step 6: AI Recommends Offer

The AI recommends the best package based on the lead’s need.

Example:

> Based on what you shared, I recommend the Sales Automation Package because your main issue is not just getting leads, but making sure every inquiry is tracked and followed up properly.

### Step 7: AI Generates Sales Outcome

At the end of the conversation, the system generates:

* Lead summary
* Lead score
* Recommended offer
* Objections
* Buying signals
* Next-best action
* Follow-up email

---

## 10. MVP Features

## Must-Have Features

### 1. Voice Conversation with Agora

The lead should be able to start a voice session powered by Agora.

Minimum implementation:

* Join Agora channel
* Start voice session
* End voice session
* Capture user speech or transcript
* Send transcript to FastAPI
* Return AI response
* Play or display AI response

### 2. AI Sales Agent Conversation

The AI should conduct a helpful sales conversation.

Behavior rules:

* Ask one question at a time.
* Keep responses short and natural.
* Do not sound like a form.
* Do not recommend too early.
* Focus on understanding the user’s business need.
* Move the conversation toward a clear next step.

### 3. Lead Profile Extraction

The system should extract structured information from the conversation.

Example structure:

```json
{
  "name": null,
  "company": "ABC Logistics",
  "industry": "Logistics",
  "pain_point": "Losing inquiries due to poor tracking",
  "current_solution": "Manual tracking through chat and spreadsheet",
  "timeline": "This month",
  "budget_readiness": "Open to proposal",
  "decision_maker": "Yes",
  "buying_intent": "High",
  "objections": ["Wants to see pricing first"]
}
```

### 4. Lead Scoring

The system should score the lead using clear and explainable criteria.

Scoring rules:

```text
Clear pain point: +20
Urgent timeline: +20
Decision maker: +20
Budget readiness: +20
Contact details provided: +10
Asked for proposal/demo/pricing: +10
```

Lead temperature:

```text
80–100 = Hot
50–79 = Warm
Below 50 = Cold
```

### 5. Offer Recommendation

The system should recommend the best offer based on the lead profile.

Sample offers:

#### Lead Capture Starter

For businesses that need a basic landing page, lead form, and simple inquiry tracking.

#### Growth Campaign Package

For businesses that need more leads through campaigns, landing pages, and campaign tracking.

#### Sales Automation Package

For businesses that already receive inquiries but lose leads due to poor follow-up or manual tracking.

#### Enterprise Workflow Package

For businesses that need a custom CRM, dashboard, integrations, and AI-assisted operations.

### 6. Objection Detection

The system should detect objections from the conversation.

Examples:

* Too expensive
* Need to ask partner
* Already has supplier
* No budget yet
* Just browsing
* Not urgent
* Needs proof or case studies
* Wants pricing first

### 7. Follow-Up Generator

The AI should generate a follow-up email or sales note after the conversation.

Example:

```text
Subject: Recommended Sales Workflow Setup for ABC Logistics

Hi [Name],

Thanks for sharing more about your current lead tracking challenges. Based on what you mentioned, the best next step would be the Sales Automation Package, focused on CRM setup, lead tracking, and automated follow-ups.

Recommended next step: book a short discovery call so we can review your current inquiry process and prepare a practical plan.

Best,
Workflow PH Sales Agent
```

### 8. Live Sales Dashboard

The dashboard should show:

* Total leads
* Hot leads
* Warm leads
* Cold leads
* Latest lead
* Lead score
* Recommended offer
* Top objections
* Follow-ups generated

---

## Nice-to-Have Features

### 1. Taglish Mode

The AI can speak in natural Taglish for Philippine SMEs.

Example:

> Gets ko po. So ang main concern ninyo is may inquiries kayo, pero hindi sila nafo-follow up properly, tama?

### 2. Campaign Builder

Allow the user to configure:

* Campaign name
* Target industry
* Agent persona
* Qualification rules
* Offer list
* Language mode

### 3. Human Handoff

If a lead is hot, the system can recommend handoff to a human closer.

Example:

```text
Lead Score: 90
Status: Hot
Recommended Action: Send to senior closer
```

### 4. Sales Call Review

Store and display:

* Transcript
* Summary
* Buying signals
* Objections
* Score breakdown
* Recommended next step

### 5. Script Optimizer

After multiple conversations, the AI can suggest script improvements.

Example:

```text
Insight:
Most unqualified leads objected because pricing was introduced too early.

Suggested Script Change:
Ask about current lead loss before discussing package pricing.
```

---

## 11. Application Pages

### Page 1: Campaign Setup

Purpose:

* Configure the AI sales campaign.

Fields:

* Campaign name
* Target industry
* Agent persona
* Sales goal
* Language mode
* Qualification rules
* Offer list

### Page 2: Voice Agent Screen

Purpose:

* Main conversation demo screen.

Layout:

Left side:

* Start call button
* End call button
* Voice status
* Live transcript
* AI response

Right side:

* Lead profile
* Lead score
* Lead temperature
* Recommended offer
* Detected objections
* Next-best action

### Page 3: Sales Dashboard

Purpose:

* Show overall sales outcomes.

Widgets:

* Total leads
* Hot leads
* Warm leads
* Cold leads
* Follow-ups generated
* Top objections
* Latest qualified leads

### Page 4: Lead Detail Page

Purpose:

* Review one lead after the call.

Sections:

* Lead profile
* Transcript
* AI summary
* Score breakdown
* Objections
* Buying signals
* Recommended offer
* Follow-up email
* Next-best action

---

## 12. Couchbase Data Model

Couchbase will be used as the main database for the MVP. Instead of relational tables, the MVP will store flexible JSON documents inside collections.

Recommended bucket:

```text
workflow_ph
```

Recommended scope:

```text
sales_agent
```

Recommended collections:

```text
campaigns
leads
conversations
offers
follow_ups
```

### campaigns collection

Purpose:

* Stores AI sales campaign setup and configuration.

Sample document key:

```text
campaign::sme-sales-campaign
```

Sample document:

```json
{
  "type": "campaign",
  "name": "Philippine SME Sales Campaign",
  "target_industry": "Service Businesses",
  "agent_persona": "Friendly Taglish Sales Consultant",
  "goal": "Qualify leads and book discovery calls",
  "language_mode": "Taglish",
  "qualification_rules": {
    "required_fields": ["pain_point", "timeline", "decision_maker", "budget_readiness"],
    "hot_lead_threshold": 80,
    "warm_lead_threshold": 50
  },
  "created_at": "2026-05-26T00:00:00Z"
}
```

### leads collection

Purpose:

* Stores the lead profile and sales outcome data.

Sample document key:

```text
lead::{lead_id}
```

Sample document:

```json
{
  "type": "lead",
  "campaign_id": "campaign::sme-sales-campaign",
  "name": null,
  "email": null,
  "phone": null,
  "company": "ABC Logistics",
  "industry": "Logistics",
  "pain_point": "Losing inquiries due to poor tracking",
  "current_solution": "Manual tracking through chat and spreadsheets",
  "timeline": "This month",
  "budget_readiness": "Open to proposal",
  "decision_maker": "Yes",
  "buying_intent": "High",
  "lead_score": 90,
  "lead_temperature": "Hot",
  "recommended_offer": "Sales Automation Package",
  "next_best_action": "Book discovery call",
  "status": "qualified",
  "created_at": "2026-05-26T00:00:00Z",
  "updated_at": "2026-05-26T00:00:00Z"
}
```

### conversations collection

Purpose:

* Stores the transcript and AI-generated conversation analysis.

Sample document key:

```text
conversation::{conversation_id}
```

Sample document:

```json
{
  "type": "conversation",
  "lead_id": "lead::{lead_id}",
  "transcript": [
    {
      "role": "user",
      "message": "Hi, I run a logistics company and we need more clients.",
      "timestamp": "2026-05-26T00:00:00Z"
    },
    {
      "role": "assistant",
      "message": "Got it. Are you mainly trying to get more inquiries, improve follow-ups, or automate your sales tracking?",
      "timestamp": "2026-05-26T00:00:10Z"
    }
  ],
  "summary": "The lead runs a logistics company and needs more clients, but also struggles with tracking and follow-up.",
  "objections": ["Wants to understand pricing first"],
  "buying_signals": ["Urgent timeline", "Decision maker", "Clear pain point"],
  "created_at": "2026-05-26T00:00:00Z",
  "updated_at": "2026-05-26T00:00:00Z"
}
```

### offers collection

Purpose:

* Stores available packages and offer-matching rules.

Sample document key:

```text
offer::sales-automation-package
```

Sample document:

```json
{
  "type": "offer",
  "name": "Sales Automation Package",
  "description": "CRM setup, lead tracking, automated follow-ups, and sales dashboard for businesses losing inquiries due to poor follow-up.",
  "best_for": [
    "Businesses already receiving inquiries",
    "Businesses losing leads because of poor tracking",
    "Businesses needing CRM and follow-up automation"
  ],
  "price_range": "Custom pricing",
  "rules": {
    "match_keywords": ["follow-up", "tracking", "lost leads", "CRM", "manual process"],
    "recommended_when": ["clear pain point", "urgent timeline", "poor tracking"]
  },
  "created_at": "2026-05-26T00:00:00Z"
}
```

### follow_ups collection

Purpose:

* Stores generated follow-up messages.

Sample document key:

```text
followup::{followup_id}
```

Sample document:

```json
{
  "type": "follow_up",
  "lead_id": "lead::{lead_id}",
  "subject": "Recommended Sales Workflow Setup for ABC Logistics",
  "body": "Hi [Name], thanks for sharing more about your current lead tracking challenges...",
  "status": "draft",
  "created_at": "2026-05-26T00:00:00Z"
}
```

### MVP Query Needs

The MVP should support these database actions:

```text
Create campaign
Create lead
Update lead profile
Append conversation transcript
Get latest leads
Get leads by temperature
Get one lead with conversation and follow-up
Create follow-up draft
Get available offers
```

### Recommended Indexes

For the MVP, create indexes for common dashboard queries:

```sql
CREATE PRIMARY INDEX ON `workflow_ph`.`sales_agent`.`leads`;

CREATE INDEX idx_leads_temperature
ON `workflow_ph`.`sales_agent`.`leads`(lead_temperature);

CREATE INDEX idx_leads_status
ON `workflow_ph`.`sales_agent`.`leads`(status);

CREATE INDEX idx_leads_created_at
ON `workflow_ph`.`sales_agent`.`leads`(created_at);

CREATE INDEX idx_conversations_lead_id
ON `workflow_ph`.`sales_agent`.`conversations`(lead_id);

CREATE INDEX idx_followups_lead_id
ON `workflow_ph`.`sales_agent`.`follow_ups`(lead_id);
```

---

## 13. FastAPI Endpoints

### Agent Endpoints

```text
POST /agent/start
```

Starts a new conversation and creates an initial lead record.

```text
POST /agent/message
```

Handles one conversation turn. Sends the message to OpenAI, updates lead state, and returns the AI response plus updated sales data.

```text
POST /agent/end
```

Ends the conversation and generates the final summary, score, recommendation, and follow-up.

### Lead Endpoints

```text
GET /leads
```

Returns all leads.

```text
GET /leads/{lead_id}
```

Returns one lead with conversation and follow-up details.

```text
PATCH /leads/{lead_id}
```

Updates lead information.

```text
POST /leads/{lead_id}/score
```

Scores or re-scores a lead.

```text
POST /leads/{lead_id}/recommend-offer
```

Returns the recommended offer for a lead.

```text
POST /leads/{lead_id}/follow-up
```

Generates a follow-up email.

### Agora Endpoint

```text
POST /agora/token
```

Generates an Agora token for the frontend voice session.

Important:

* Agora App Certificate must stay in the backend.
* Never expose private keys in the frontend.

---

## 14. AI Agent Design

### Agent Role

The AI is a real-time sales qualification agent for service businesses.

### Agent Goal

The agent’s goal is to turn a conversation into a qualified sales opportunity.

### Agent Behavior Rules

The agent must:

* Ask one question at a time.
* Keep responses short and conversational.
* Avoid sounding like a form.
* Understand the customer’s business problem.
* Ask about urgency, budget readiness, and decision-maker status.
* Recommend an offer only after enough context is gathered.
* Handle objections calmly.
* Never overpromise.
* Suggest a clear next-best action.
* Keep the conversation moving toward a useful sales outcome.

### Base System Prompt

```text
You are Workflow PH Sales Agent, a real-time AI sales qualification agent for Philippine service businesses.

Your job is to hold a natural sales conversation while moving the lead toward a clear business outcome.

You must:
1. Understand the customer’s business and main problem.
2. Ask short, natural discovery questions one at a time.
3. Identify pain point, urgency, budget readiness, decision-maker status, and preferred next step.
4. Detect objections and buying signals.
5. Recommend the most relevant service package only after enough context is gathered.
6. Score the lead as Hot, Warm, or Cold.
7. Prepare a concise sales summary for the human sales team.
8. Never pressure the user.
9. Never overpromise.
10. If unsure, suggest a human consultation.

Your style is helpful, consultative, confident, friendly, and concise.

Your main objective is to turn conversations into qualified sales opportunities.
```

---

## 15. Lead Scoring Logic

### Scoring Criteria

```text
Clear pain point: +20
Urgent timeline: +20
Decision maker: +20
Budget readiness: +20
Contact details provided: +10
Asked for proposal, demo, or pricing: +10
```

### Temperature Rules

```text
80–100 = Hot
50–79 = Warm
Below 50 = Cold
```

### Example Score Breakdown

```text
Clear pain point: Yes +20
Urgent timeline: Yes +20
Decision maker: Yes +20
Budget readiness: Partial +10
Contact details: Yes +10
Asked for proposal: Yes +10

Total Score: 90
Lead Temperature: Hot
```

---

## 16. Offer Recommendation Logic

### Offer 1: Lead Capture Starter

Best for:

* Businesses with no website or lead form
* Businesses that need basic inquiry capture
* Businesses that are not ready for full automation yet

### Offer 2: Growth Campaign Package

Best for:

* Businesses that need more leads
* Businesses launching ads or campaigns
* Businesses with clear sales goals but weak marketing execution

### Offer 3: Sales Automation Package

Best for:

* Businesses already receiving inquiries
* Businesses losing leads because of poor tracking
* Businesses needing CRM, follow-ups, and lead scoring

### Offer 4: Enterprise Workflow Package

Best for:

* Businesses with complex sales processes
* Businesses needing custom dashboards
* Businesses needing integrations and AI-assisted workflows

---

## 17. Development Plan

## Phase 1: Core Sales Workflow

Build first:

1. Next.js app layout
2. FastAPI backend setup
3. OpenAI connection
4. Text-based agent conversation
5. Lead profile extraction
6. Lead scoring
7. Offer recommendation
8. Couchbase save/update
9. Dashboard display
10. Follow-up generation

Goal:

> Have a complete sales workflow even before voice is polished.

## Phase 2: Agora Voice Integration

Build next:

1. Add Agora Web SDK to Next.js.
2. Create `/agora/token` endpoint in FastAPI.
3. Join Agora channel from the browser.
4. Add start/end voice call controls.
5. Capture speech or transcript.
6. Send user message to `/agent/message`.
7. Return and play/display AI response.

Goal:

> Make the demo clearly Agora-powered.

## Phase 3: Hackathon Polish

Add last:

1. Taglish mode
2. Objection intelligence
3. Human handoff recommendation
4. Lead detail page
5. Better dashboard visuals
6. Demo data
7. Pitch-ready sample conversation

---

## 18. Environment Variables

### Frontend `.env.local`

```env
NEXT_PUBLIC_API_BASE_URL=https://your-fastapi-backend.com
NEXT_PUBLIC_AGORA_APP_ID=your_agora_app_id
```

### Backend `.env`

```env
OPENAI_API_KEY=your_openai_key

COUCHBASE_CONNECTION_STRING=your_couchbase_connection_string
COUCHBASE_USERNAME=your_couchbase_username
COUCHBASE_PASSWORD=your_couchbase_password
COUCHBASE_BUCKET=workflow_ph
COUCHBASE_SCOPE=sales_agent

AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate
```

Never expose these in the frontend:

* `OPENAI_API_KEY`
* `COUCHBASE_USERNAME`, `COUCHBASE_PASSWORD`, and connection credentials
* `AGORA_APP_CERTIFICATE`

---

## 19. Recommended Python Libraries

Required:

```text
fastapi
uvicorn
openai
pydantic
python-dotenv
couchbase
agora-token-builder
httpx
```

Optional:

```text
langchain
llama-index
pandas
scikit-learn
```

Recommendation:

For the hackathon MVP, use direct OpenAI API calls first. Avoid adding LangChain or LlamaIndex unless RAG becomes necessary.

---

## 20. Demo Script

### Scenario

A logistics business owner is looking for more clients and better lead tracking.

### Lead Starts

> Hi, I run a logistics company and we need more clients.

### AI Agent

> Got it. Are you mainly trying to get more inquiries, improve follow-ups with existing leads, or automate your sales tracking?

### Lead

> More clients, but honestly we also lose inquiries because we do not track them properly.

### AI Agent

> That sounds like both lead generation and sales tracking. How soon do you want to improve this, this month, this quarter, or later?

### Lead

> This month. We are losing leads already.

### AI Agent

> Understood. Are you the one who will decide on this, or will someone else approve the project?

### Lead

> I am the owner, so I decide.

### AI Agent

> Thanks. Based on what you shared, I recommend the Sales Automation Package because your main issue is not only getting leads, but making sure every inquiry is tracked and followed up properly. I’ll mark this as a hot lead because you have a clear problem, urgent timeline, and decision-making authority.

### Dashboard Output

```text
Lead: ABC Logistics
Industry: Logistics
Pain Point: Losing inquiries due to poor tracking
Timeline: This month
Decision Maker: Yes
Recommended Offer: Sales Automation Package
Lead Score: 90
Temperature: Hot
Next Best Action: Book discovery call
Follow-Up: Generated
```

---

## 21. Judging and Differentiation Strategy

The MVP should stand out by showing that it is not only a talking AI.

Differentiators:

* Voice-first sales experience powered by Agora
* Live lead profile updates
* Sales outcome dashboard
* Explainable lead scoring
* Offer recommendation
* Objection detection
* Follow-up generation
* Localized Taglish sales mode

Core message for judges:

> Most AI agents stop at conversation. Workflow PH turns every conversation into a qualified lead, recommended offer, follow-up, and next-best action.

---

## 22. MVP Success Criteria

The MVP is successful if it can demonstrate the following:

1. A lead starts a voice conversation.
2. The AI agent asks natural sales questions.
3. The system extracts lead data.
4. The dashboard updates with lead details.
5. The lead is scored as Hot, Warm, or Cold.
6. The system recommends an offer.
7. The system detects at least one objection or buying signal.
8. The system generates a sales summary.
9. The system generates a follow-up message.

---

## 23. Build Priority Checklist

### Critical

* [ ] Next.js project setup
* [ ] FastAPI project setup
* [ ] Couchbase schema setup
* [ ] OpenAI API connected
* [ ] Agent conversation working
* [ ] Lead extraction working
* [ ] Lead scoring working
* [ ] Offer recommendation working
* [ ] Dashboard working
* [ ] Agora voice session working

### Important

* [ ] Follow-up generator
* [ ] Objection detection
* [ ] Lead detail page
* [ ] Campaign setup page
* [ ] Taglish mode

### Nice to Have

* [ ] Human handoff
* [ ] Script optimizer
* [ ] Call review page
* [ ] Analytics dashboard
* [ ] Calendar booking
* [ ] Email sending

---

## 24. Final Locked MVP Stack

```text
Frontend:
Next.js + TypeScript + Tailwind CSS + shadcn/ui

Backend:
FastAPI + Python

Database:
Couchbase Free Tier

AI:
OpenAI API using GPT-4o mini

Voice:
Agora Web SDK

Frontend Hosting:
Vercel Free Tier

Backend Hosting:
Render / Railway / Fly.io / Google Cloud Run
```

Recommended backend hosting for hackathon speed:

> Render or Railway

Recommended development priority:

> Build the sales workflow first, then connect Agora voice, then polish the demo.
