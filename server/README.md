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
- `AGORA_APP_ID`
- `AGORA_APP_CERTIFICATE`
- `AGORA_CONVO_API_BASE`
- `AGORA_CONVO_DEFAULT_PRESET`
- `AGORA_CONVO_DEFAULT_TTS_VOICE`
- `AGORA_CONVO_DEFAULT_IDLE_TIMEOUT`

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

### Start agent

`POST /agora/convo/start`

Sample request:

```json
{
  "channel_name": "workflow-ph-cae",
  "user_uid": "1002",
  "agent_uid": "1001",
  "tts_voice": "coral"
}
```

Notes:
- This backend starts CAE in RTM transcript mode:
  - `advanced_features.enable_rtm = true`
  - `parameters.data_channel = "rtm"`
- If `AGORA_CONVO_DEFAULT_PIPELINE_ID` is set, that pipeline is used.
- If `AGORA_CONVO_DEFAULT_PIPELINE_ID` is empty, backend falls back to:
  - `AGORA_CONVO_DEFAULT_PRESET=openai_gpt_4o_mini,openai_tts_1`

### Stop agent

`POST /agora/convo/stop`

Sample request:

```json
{
  "agent_id": "A44CR42VE76PA54CK56RD54HW76JR92F",
  "channel_name": "workflow-ph-cae",
  "agent_uid": "1001"
}
```

### Interrupt agent (docs-aligned)

`POST /agora/convo/interrupt`

Sample request:

```json
{
  "agent_id": "A44CR42VE76PA54CK56RD54HW76JR92F",
  "channel_name": "workflow-ph-cae",
  "agent_uid": "1001"
}
```

This calls Agora CAE interrupt endpoint so the agent immediately stops speaking/thinking.

### Retrieve history (short-term memory source)

`POST /agora/convo/history`

Sample request:

```json
{
  "agent_id": "A44CR42VE76PA54CK56RD54HW76JR92F",
  "channel_name": "workflow-ph-cae",
  "agent_uid": "1001"
}
```

### Save short-term memory snapshot

`POST /agora/convo/memory/save`

Sample request:

```json
{
  "agent_id": "A44CR42VE76PA54CK56RD54HW76JR92F",
  "channel_name": "workflow-ph-cae",
  "agent_uid": "1001",
  "user_uid": "1002"
}
```

Behavior:
- Retrieves live CAE history.
- Creates summary.
- Persists latest + snapshot docs to Couchbase `conversations` collection.

### Inject saved memory into running agent

`POST /agora/convo/memory/inject`

Sample request:

```json
{
  "agent_id": "A44CR42VE76PA54CK56RD54HW76JR92F",
  "channel_name": "workflow-ph-cae",
  "agent_uid": "1001",
  "user_uid": "1002"
}
```

Behavior:
- Loads saved memory summary for this channel/user.
- Updates running agent with `properties.llm.system_messages` (Agora update-agent pattern).

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

### Agent connects but no audible voice / choppy playback

Symptom:
- Agent appears to join (`remote joins` increments), but audio drops or sounds chopped.

Fix:
- Test with headset to avoid speaker-to-mic echo interruption loops.
- Disable "Auto half-duplex" first, then retest.
- If network is unstable, retry with a fresh channel name and restart session.
- Confirm only one browser tab is joined as the same `user_uid`.

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
- Agora AI sales/marketing context: https://www.agora.io/en/solutions/ai-sales-marketing-agents/
- Couchbase Cloud connect guide: https://docs.couchbase.com/cloud/get-started/connect.html
- Couchbase command-line tools: https://docs.couchbase.com/cloud/reference/command-line-tools.html
