# Backend Setup Runbook (FastAPI + Agora + Couchbase)

This backend powers the Workflow PH AI Sales Agent MVP.

## 1) Create and activate venv

From the `server` directory:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

## 2) Install dependencies

```powershell
pip install -r requirements.txt
```

Note: `agora-token-builder` is pinned to `1.0.0` because that is the published PyPI version.

## 3) Configure environment

```powershell
Copy-Item .env.example .env
```

Fill in:
- `OPENAI_API_KEY`
- `COUCHBASE_CONNECTION_STRING`
- `COUCHBASE_USERNAME`
- `COUCHBASE_PASSWORD`
- `COUCHBASE_BUCKET`
- `COUCHBASE_SCOPE`
- `COUCHBASE_SCOPE_B2B`
- `COUCHBASE_SCOPE_B2C`
- `COUCHBASE_PROVISION_SCOPES`
- `COUCHBASE_SEED_SCOPES`
- `AGORA_APP_ID`
- `AGORA_APP_CERTIFICATE`
- `AGORA_CONVO_API_BASE`
- `AGORA_CONVO_DEFAULT_PRESET`
- `AGORA_CONVO_DEFAULT_TTS_VOICE`
- `AGORA_CONVO_DEFAULT_IDLE_TIMEOUT`

Hackathon tip for teammate-safe isolation:
- Use a personal scope value (example: `COUCHBASE_SCOPE=sales_agent_augus`) so your test traffic does not mix with your teammate's data.
- For shared B2B/B2C split, keep `COUCHBASE_SCOPE=sales_agent` for legacy compatibility and route by request flow (`x-sales-flow: b2b` or `x-sales-flow: b2c`).

Where to get Agora keys:
- Open Agora Console -> `Projects` -> your project -> `Configure`.
- Copy `App ID` into `AGORA_APP_ID`.
- Enable/keep App Certificate and copy `App Certificate` into `AGORA_APP_CERTIFICATE`.

## 4) Bootstrap Couchbase schema/data

From repo root:

```powershell
python couchbase/setup_collections.py
python couchbase/seed_offers.py
```

## 5) Run API

From `server`:

```powershell
uvicorn app.main:app --reload --port 8000
```

Health check:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

## 6) Verify Agora token endpoint

Example request:

```powershell
$body = @{
  channel_name = "demo-sales-channel"
  uid = 0
  role = "publisher"
  ttl_seconds = 3600
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri http://localhost:8000/agora/token `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Expected response fields:
- `token`
- `channel_name`
- `uid`
- `role`
- `issued_at`
- `expires_at`

## Agora token contract

`POST /agora/token`

Request JSON:

```json
{
  "channel_name": "demo-sales-channel",
  "uid": 0,
  "role": "publisher",
  "ttl_seconds": 3600
}
```

Validation:
- `channel_name` required, regex: `^[A-Za-z0-9_.-]{1,64}$`
- `uid` must be `>= 0`
- `role` must be `publisher` or `subscriber`
- `ttl_seconds` must be between `60` and `86400`

## Agora Conversational AI endpoints

### Canonical CAE API (docs-shaped)

These are the primary backend contracts aligned to Agora REST operations:

- `POST /agora/cae/join`
- `POST /agora/cae/leave`
- `POST /agora/cae/update`
- `POST /agora/cae/think`
- `POST /agora/cae/speak`
- `POST /agora/cae/interrupt`
- `POST /agora/cae/query` (maps to upstream `GET /agents/{agentId}`)
- `POST /agora/cae/history`
- `POST /agora/cae/status` (status alias for compatibility)

### Scope routing for B2B/B2C

All endpoints now support flow-based Couchbase scope routing via request context:

- `x-sales-flow: b2b` -> writes/reads from scope `b2b`
- `x-sales-flow: b2c` -> writes/reads from scope `b2c`
- missing/unknown flow -> falls back to legacy scope `sales_agent`

You can also pass `?flow=b2b` or `?flow=b2c` in query parameters.

Behavior details:
- `leave` accepts successful empty upstream body.
- `update` accepts generic `properties` payload.
- `update` accepts generic `properties` payload (nullable/object per Agora docs).
- `think` requires `text`; supports `on_listening_action`, `on_thinking_action`, `on_speaking_action`, `interruptable`, `metadata`.
- `speak` requires `text`; supports `priority` (`INTERRUPT|APPEND|IGNORE`) and `interruptable`.
- `query` returns agent status (`IDLE|STARTING|RUNNING|STOPPING|STOPPED|FAILED`).

Additional helper endpoint:

- `POST /agora/cae/turns` (maps to upstream `GET /agents/{agentId}/turns`, supports `page_index/page_size`).

### Compatibility wrappers (existing UI-safe)

Existing routes remain active and map to canonical handlers:

- `POST /agora/convo/start` -> `/agora/cae/join`
- `POST /agora/convo/stop` -> `/agora/cae/leave`
- `POST /agora/convo/interrupt` -> `/agora/cae/interrupt`
- `POST /agora/convo/history` -> `/agora/cae/history`
- `POST /agora/convo/query` -> `/agora/cae/turns`
- `POST /agora/convo/speak` -> `/agora/cae/speak`
- `POST /agora/convo/think` -> `/agora/cae/think`
- `POST /agora/convo/update` -> `/agora/cae/update`

### Join payload alignment notes

`/agora/convo/start` and `/agora/cae/join` include these required join properties:

- `channel`
- `token`
- `agent_rtc_uid`
- `remote_rtc_uids`
- `enable_string_uid`
- `idle_timeout`

RTM transcript prerequisites are enabled by default:

- `advanced_features.enable_rtm = true`
- `parameters.data_channel = "rtm"`
- `parameters.enable_metrics = true`
- `parameters.enable_error_message = true`

Interruption and turn detection alignment:

- Uses top-level `interruption` config.
- Uses `turn_detection` for SoS/EoS behavior only.
- Uses `audio_scenario` default `aiserver` (override via `AGORA_CONVO_DEFAULT_AUDIO_SCENARIO`).

Pipeline precedence:

- If `pipeline_id` is provided (request or `AGORA_CONVO_DEFAULT_PIPELINE_ID`), it is used.
- Otherwise backend falls back to `preset` (`AGORA_CONVO_DEFAULT_PRESET`).

### Extension APIs (app-specific)

These are intentionally non-Agora extension endpoints:

- `POST /agora/convo/memory/save`
- `POST /agora/convo/memory/inject`

They persist and inject short-term conversation memory using Couchbase and `update` (`llm.system_messages`).

### Docs Alignment Matrix

- Official CAE REST operations implemented:
  - `join`, `leave`, `update`, `think`, `speak`, `interrupt`, `query`, `history`
- Compatibility alias:
  - `status` (same behavior as `query`)
- Project helper extension:
  - `turns` (conversation turn analytics)
- App-specific extension:
  - `convo/memory/save`, `convo/memory/inject`

## Troubleshooting

### Missing Agora credentials

Symptom:
- `/agora/token` returns 500 with missing credentials detail.

Fix:
- Ensure `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE` are present in `server/.env`.

### No transcript appears

Symptom:
- You can join the channel, but transcript panel is empty.

Fix:
- Confirm backend is running latest code (RTM transcript mode enabled).
- Confirm frontend is using the same `NEXT_PUBLIC_AGORA_APP_ID` as backend `AGORA_APP_ID`.
- Restart both servers after `.env` changes.
- Verify `/agora/convo/start` succeeds and returns `agent_id`, `channel_name`, and `user_token`.
- Keep `AGORA_CONVO_DEFAULT_PIPELINE_ID` blank unless you have a valid pipeline in Agora Console.
- Verify join payload still includes:
  - `advanced_features.enable_rtm=true`
  - `parameters.data_channel="rtm"`
  - `parameters.enable_metrics=true`
  - `parameters.enable_error_message=true`
- Verify frontend subscribes with toolkit flow (`subscribeMessage`) before starting the agent.

### Agent connects but no audible voice / choppy playback

Symptom:
- Agent appears to join (`remote joins` increments), but audio drops or sounds chopped.

Fix:
- Test with headset to avoid speaker-to-mic echo interruption loops.
- Disable "Auto half-duplex" first, then retest.
- If network is unstable, retry with a fresh channel name and restart session.
- Confirm only one browser tab is joined as the same `user_uid`.
- Confirm `audio_scenario` is `aiserver` (default in this backend).
- If logs show rapid publish/unpublish loops for agent UID, treat this as interrupt churn:
  - Reduce local echo path (headset).
  - Ensure no duplicated client/session joins in multiple tabs.
  - Keep interruption defaults and avoid overly aggressive custom VAD thresholds.

### RTM presence noise (`-13001 Presence service not connected`)

Symptom:
- Browser console prints presence service warnings while transcript still works.

Fix:
- This app does not rely on RTM presence for transcripts.
- Keep transcript subscription with `withPresence=false` and rely on message callbacks.
- Treat presence warnings as non-fatal unless transcript callbacks stop entirely.

## Conversational AI Quickstart (Project Setup)

1. In Agora Console, create/open a Conversational AI project.
2. Copy `App ID` and `App Certificate` to `server/.env`.
3. Optional: set `AGORA_CONVO_DEFAULT_PIPELINE_ID` to an existing pipeline ID from Agora CAE.
4. Keep `AGORA_CONVO_API_BASE=https://api.agora.io`.
5. Start backend: `uvicorn app.main:app --reload --port 8000`.
6. Start frontend in `web`: `npm run dev`.
7. Open `/agent`, click `Start CAE Session`, and speak.
8. Verify:
   - status becomes live,
   - agent joins as remote user,
   - transcript updates under `Transcript`.

### Token expiration mismatch

Symptom:
- Client cannot join, or join fails due to expired token.

Fix:
- Confirm `ttl_seconds` is in valid range and client/server clocks are synced.
- Regenerate token right before join.

### Capella connection / network allowlist

Symptom:
- Timeout when running setup scripts or API DB operations.

Fix:
- Verify cluster connection string uses `couchbases://`.
- Add your current public IP to Capella Allowed IPs.
- Confirm DB user has required bucket/scope permissions.

### Missing scope or collections

Symptom:
- Query or collection operation fails for `sales_agent` scope or collection names.

Fix:
- Re-run:

```powershell
python couchbase/setup_collections.py
```

The setup script is idempotent and safe to rerun.

## References

- Agora token server workflow: https://docs.agora.io/en/video-calling/token-authentication/deploy-token-server
- Agora auth workflow: https://docs.agora.io/en/video-calling/token-authentication/authentication-workflow
- Agora DynamicKey examples: https://github.com/AgoraIO/Tools/tree/master/DynamicKey/AgoraDynamicKey
- CAE join: https://docs.agora.io/en/conversational-ai/rest-api/agent/join
- CAE leave: https://docs.agora.io/en/conversational-ai/rest-api/agent/leave
- CAE update: https://docs.agora.io/en/conversational-ai/rest-api/agent/update
- CAE think: https://docs.agora.io/en/conversational-ai/rest-api/agent/think
- CAE speak: https://docs.agora.io/en/conversational-ai/rest-api/agent/speak
- CAE interrupt: https://docs.agora.io/en/conversational-ai/rest-api/agent/interrupt
- CAE query status: https://docs.agora.io/en/conversational-ai/rest-api/agent/query
- CAE query turns: https://docs.agora.io/en/conversational-ai/rest-api/agent/turns
- CAE history: https://docs.agora.io/en/conversational-ai/rest-api/agent/history
- CAE REST auth: https://docs.agora.io/en/conversational-ai/rest-api/restful-authentication
- CAE transcripts: https://docs.agora.io/en/conversational-ai/develop/transcripts
- CAE toolkit events: https://docs.agora.io/en/conversational-ai/develop/event-notifications
- CAE audio best practices: https://docs.agora.io/en/conversational-ai/best-practices/audio-setup
- CAE latency best practices: https://docs.agora.io/en/conversational-ai/best-practices/optimize-latency
- Agora AI sales/marketing context: https://www.agora.io/en/solutions/ai-sales-marketing-agents/
- Couchbase Cloud connect guide: https://docs.couchbase.com/cloud/get-started/connect.html
- Couchbase command-line tools: https://docs.couchbase.com/cloud/reference/command-line-tools.html
