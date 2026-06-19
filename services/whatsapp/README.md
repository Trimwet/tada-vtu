# WhatsApp Service

**Role:** WhatsApp interface layer — receives messages, calls Core, sends replies.  
**PRINCIPLE:** Interfaces are dumb. This service parses messages and calls Core — it does NOT make financial decisions.

## Current state

The existing `src/lib/stateful-vtu-wrapper.ts` spawns a child process
(`openclaw/stateful-vtu.js`) to handle WhatsApp messages. That is a
subprocess hack and will be replaced by this proper service.

## What this service will do

1. Receive WhatsApp webhook events (via Meta Cloud API or Baileys)
2. Parse the user's intent (buy airtime, check balance, park data)
3. Call the Core service's HTTP API for any financial operation
4. Format the Core's response into a WhatsApp reply
5. Send the reply back to the user

## What this service will NOT do

- Touch the ledger directly
- Call Inlomax directly
- Make routing decisions (Eve inside Core does that)

## Status

🔲 Not started — directory scaffolded, implementation pending.
