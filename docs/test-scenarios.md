# Agent Test Scenarios

Three scenarios covering all 6 tools. Faye follows a strict 5-phase flow — she will always ask for your name first before anything else.

**Agent greeting (always):**
> "Hi! I'm Faye, a business consultant from Workflow PH specializing in logistics and marketing. Before we dive in, may I know your name?"

---

## Scenario 1 — Hot Lead (Demo Scenario)
**Profile:** Logistics company owner, losing customers due to pricing, urgent, is the decision maker  
**Expected tools:** `extract_lead_info` × 4 → `detect_objection` → `score_lead` → `recommend_offer` → `book_discovery_call` → `generate_follow_up`  
**Expected score:** 80–100 — Hot 🔴

---

**Faye asks:** "Before we dive in, may I know your name?"

**You say:**
> My name is Carlo Santos.

*Expected: `extract_lead_info` fires — contact_name: Carlo Santos*

---

**Faye asks:** "What kind of business do you run, Carlo?"

**You say:**
> I own a logistics company called FastCargo. We handle freight and delivery services.

*Expected: `extract_lead_info` fires — company: FastCargo, industry: Logistics*

---

**Faye asks:** "What's the biggest challenge you're facing in FastCargo right now?"

**You say:**
> We keep losing customers. I think our pricing is too high compared to competitors and clients are switching.

*Expected: `extract_lead_info` fires — pain_point: losing customers due to high pricing vs competitors*  
*Expected: `detect_objection` fires — price_concern (the lead's own business has a pricing problem)*

---

**Faye asks:** "How soon are you hoping to solve this?"

**You say:**
> As soon as possible — peak season is coming next month and I need to act fast.

*Expected: `extract_lead_info` fires — timeline: next month, urgent*

---

**Faye asks:** "Are you the one making the final call on this?"

**You say:**
> Yes, I'm the owner. All decisions go through me.

*Expected: `extract_lead_info` fires — decision_maker: yes/owner*

---

**Faye asks:** "Do you have a rough budget in mind?"

**You say:**
> Yes, we have something set aside. We're ready to invest if it solves the problem.

*Expected: `extract_lead_info` fires — budget_readiness: ready*  
*Expected: `score_lead` fires — score 80+, temperature: Hot*  
*Expected: `recommend_offer` fires — Sales Automation Package*

---

**Faye proposes a discovery call.**

**You say:**
> Sure, let's talk. How about Wednesday at 2pm?

*Expected: `book_discovery_call` fires — Wednesday 2pm, confirmed: true*

---

*(End the call / click Stop)*

*Expected: `generate_follow_up` fires — email subject + body for Carlo Santos, FastCargo*

---
---

## Scenario 2 — Warm Lead
**Profile:** Restaurant owner, needs more customers, needs partner approval, no clear timeline  
**Expected tools:** `extract_lead_info` × 3 → `detect_objection` → `score_lead` → `recommend_offer`  
**Expected score:** 40–60 — Warm 🟡

---

**Faye asks:** "Before we dive in, may I know your name?"

**You say:**
> I'm Maria dela Cruz.

*Expected: `extract_lead_info` fires — contact_name: Maria dela Cruz*

---

**Faye asks:** "What kind of business do you run, Maria?"

**You say:**
> I own a small restaurant in Quezon City called Kusina ni Maria. We want to get more customers but we have no idea where to start with online marketing.

*Expected: `extract_lead_info` fires — company: Kusina ni Maria, industry: Food & Beverage, pain_point: need more customers, no online marketing strategy*

---

**Faye asks:** "How long has this been an issue?"

**You say:**
> For about a year. We tried boosting posts on Facebook pero parang hindi epektibo.

*Expected: `extract_lead_info` fires — current_solution: Facebook boosting*

---

**Faye asks:** "How soon are you hoping to address this?"

**You say:**
> Hindi pa kami sure sa exact timeline. Baka within the quarter siguro?

*Expected: `extract_lead_info` fires — timeline: within the quarter (not urgent)*

---

**Faye asks:** "Are you the one making the final call?"

**You say:**
> I need to discuss this with my business partner first before we decide anything.

*Expected: `detect_objection` fires — needs_approval*  
*Expected: `score_lead` fires — score 40–60, temperature: Warm*  
*Expected: `recommend_offer` fires — Growth Campaign Package*

---

*(Agent offers a discovery call — respond yes or no to test both paths)*

---
---

## Scenario 3 — Cold Lead
**Profile:** Employee doing research for boss, no budget allocated, no urgency, not the decision maker  
**Expected tools:** `extract_lead_info` × 2 → `detect_objection` × 2 → `score_lead`  
**Expected score:** below 40 — Cold 🔵

---

**Faye asks:** "Before we dive in, may I know your name?"

**You say:**
> I'm just browsing. My name is Renz.

*Expected: `extract_lead_info` fires — contact_name: Renz*

---

**Faye asks:** "What kind of business do you work with, Renz?"

**You say:**
> I work at a small trading company. We have some issues with follow-ups but it's not really urgent.

*Expected: `extract_lead_info` fires — industry: Trading, pain_point: follow-up issues (low urgency)*

---

**Faye asks:** "How soon are you hoping to solve this?"

**You say:**
> Walang definite timeline. We're just exploring options for now.

*Expected: `extract_lead_info` fires — timeline: exploring / no urgency*

---

**Faye asks:** "Do you have a budget in mind?"

**You say:**
> Hindi ko masiguro kung magkano ang budget. Wala pa kaming allocated for this.

*Expected: `detect_objection` fires — no_budget*

---

**Faye asks:** "Are you the one who makes the final decision?"

**You say:**
> Hindi, I'm just doing research for my boss. She's the one who decides.

*Expected: `detect_objection` fires — needs_approval*  
*Expected: `score_lead` fires — score below 40, temperature: Cold*

---

*(Faye should offer to send a summary email rather than pushing for a call)*

---
---

## Quick Tool Trigger Reference

If you want to test a specific tool in isolation:

| Tool | Say this |
|---|---|
| `extract_lead_info` | Give your name, company, industry, pain point, timeline, budget, or say you're the decision maker — fires on any of these |
| `detect_objection` | "Mahal siguro yan, hindi pa kami ready." / "I need to check with my partner first." / "Wala pa kaming budget." |
| `score_lead` | Fires automatically after pain point + 2 of: timeline, decision-maker, budget — complete Phase 3 |
| `recommend_offer` | Fires immediately after `score_lead` — no separate trigger |
| `book_discovery_call` | "Sure, let's set up a call. How about Friday at 3pm?" |
| `generate_follow_up` | Click Stop/End call button — fires at conversation end |

## Phase Checklist (what Faye must collect before scoring)

| Phase | Info needed | Tool fired |
|-------|-------------|------------|
| 1 — Introduction | Name, company, industry | `extract_lead_info` |
| 2 — Pain Discovery | Pain point, context | `extract_lead_info` + `detect_objection` if applicable |
| 3 — Qualification | Timeline + decision-maker + budget | `extract_lead_info` per answer |
| 4 — Score & Recommend | All Phase 3 done | `score_lead` → `recommend_offer` |
| 5 — Close | Lead agrees to call or asks for email | `book_discovery_call` or collect email → `generate_follow_up` |
