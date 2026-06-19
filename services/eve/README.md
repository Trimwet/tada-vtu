# Eve — AI Nervous System

**Role:** Centralized intelligence layer.  
**PRINCIPLE:** Intelligence is centralized. Eve and the Risk Engine decide everything critical.

## What Eve decides

- Which VTU provider to use for a given request (based on success rate, speed, cost)
- Whether a transaction should be flagged for manual review
- When to trigger smart retries on provider failure
- How to respond to offline users with pre-signed permissions

## What Eve does NOT do

- Execute transactions (Core ledger does that)
- Send messages (WhatsApp service does that)
- Render UI (Next.js does that)

## Architecture

Eve lives inside `services/core/internal/eve/` in v1.
If Eve becomes complex enough (model inference, real-time risk scoring),
it will be promoted to this standalone service directory.

## Status

🔲 Not started — directory scaffolded.  
v1 Eve is a stub inside Core that always routes to Inlomax.
