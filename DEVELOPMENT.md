# Development Setup

## Prerequisites

- Python 3.11+
- Node.js 20+
- [ngrok](https://ngrok.com) account + authtoken
- Couchbase Capella account (free tier works)
- OpenAI API key
- Agora account (App ID + Certificate)

---

## 1. Clone & Structure

```
agora-ai-hackathon/
├── server/       # FastAPI backend
├── web/          # Next.js frontend
├── couchbase/    # DB setup scripts
└── ngrok-dev.sh  # ngrok + .env auto-updater
```

---

## 2. Backend Setup

```bash
cd server
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux / Git Bash
source .venv/bin/activate

pip install -r requirements.txt
```

### Configure environment

```bash
cp .env.example .env
```

Fill in `server/.env`:

```env
OPENAI_API_KEY=sk-...

COUCHBASE_CONNECTION_STRING=couchbases://your-cluster.cloud.couchbase.com
COUCHBASE_USERNAME=your_username
COUCHBASE_PASSWORD=your_password
COUCHBASE_BUCKET=workflow_ph
COUCHBASE_SCOPE=sales_agent

AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_certificate

CUSTOM_LLM_API_KEY=any-secret-string   # used to authenticate Agora → /chat/completions

# BACKEND_PUBLIC_URL is set automatically by ngrok-dev.sh — leave blank here
BACKEND_PUBLIC_URL=
```

---

## 3. Couchbase Setup

Run once to create collections, indexes, and seed default offers:

```bash
# From repo root, with server venv activated
python couchbase/setup_collections.py
python couchbase/seed_offers.py
```

Both scripts are idempotent — safe to re-run.

> Make sure your public IP is in the Capella **Allowed IPs** list before running.

---

## 4. Frontend Setup

```bash
cd web
npm install
cp .env.local.example .env.local
```

`web/.env.local` should contain:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_AGORA_APP_ID=your_agora_app_id
```

---

## 5. Running for Development

You need **three terminals**.

### Terminal 1 — ngrok (updates BACKEND_PUBLIC_URL automatically)

```bash
# Every dev session
bash ngrok-dev.sh
```

This will:
- Start ngrok on port 8000
- Write the new public URL into `server/.env` automatically
- Print the tunnel URL and wait (Ctrl+C to stop)

### Terminal 2 — FastAPI backend

```bash
cd server
source .venv/bin/activate    # or .venv\Scripts\activate on Windows
python run.py
```

Server runs at `http://localhost:8000` with hot reload enabled.

### Terminal 3 — Next.js frontend

```bash
cd web
npm run dev
```

Frontend runs at `http://localhost:3000`.

---

## 6. Verify Everything Works

### Backend health check
```bash
curl http://localhost:8000/health
# → {"status":"healthy"}
```

### Test tool calling directly (no Agora needed)
```bash
curl -X POST http://localhost:8000/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-string" \
  -d '{
    "model": "gpt-5-mini",
    "messages": [
      {"role": "system", "content": "You are a sales agent."},
      {"role": "user", "content": "Hi, I run a logistics company and we keep losing leads because we have no tracking system. I need to fix this this month."}
    ],
    "stream": false
  }' \
  "http://localhost:8000/chat/completions?channel=test-channel"
```

Watch for tool calls firing in the server logs.

### Test SSE tool events
```bash
curl -N http://localhost:8000/events/test-channel
# Keep this open — events appear here when tools fire
```

---

## 7. How the Custom LLM Flow Works

```
User speaks
  → Agora CAE (ASR: voice → text)
  → POST /chat/completions?channel={channel}  (our FastAPI)
    → OpenAI gpt-5-mini with 6 tool definitions
    → tool fires → save to Couchbase → SSE event published
    → OpenAI called again with tool result
    → stream final text response back to Agora
  → Agora TTS → user hears response
  → Frontend EventSource(/events/{channel}) → right panel updates live
```

> **Important:** `BACKEND_PUBLIC_URL` must be set (ngrok handles this) for Agora to call our endpoint. Without it, Agora falls back to its built-in OpenAI preset and tools won't fire.

---

## 8. Common Issues

| Problem | Fix |
|---|---|
| ngrok URL not updating | Re-run `./ngrok-dev.sh` — it kills old ngrok and writes the new URL |
| Couchbase connection timeout | Add your IP to Capella Allowed IPs |
| Tools not firing | Check `BACKEND_PUBLIC_URL` in `server/.env` matches the active ngrok URL |
| `gpt-5-mini` model error | Verify your OpenAI account has access to GPT-5 mini |
| Agora voice not connecting | Check `NEXT_PUBLIC_AGORA_APP_ID` in `web/.env.local` |
