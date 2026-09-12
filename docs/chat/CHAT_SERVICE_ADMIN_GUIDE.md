# Chat Service — Admin & Moderation Guide

> Audience: Admin panel engineers and trust & safety ops team
> All endpoints require `Authorization: Bearer <adminJWT>` with `admin` role
> Mount path: `/api/chat/v1/admin`

---

## 1. Overview

The chat service has a full administrative moderation system built in. It provides three surfaces:

1. **Phishing domain blocklist** — add/remove domains that are immediately blocked in all messages
2. **Flagged/blocked message oversight** — review messages the risk engine marked as FLAGGED (70–89) or BLOCKED (≥ 90)
3. **Suspicious phrase registry** — manage the dynamic phrase/pattern catalog that drives the risk engine
4. **Emerging pattern mining** — review automatically-mined recurring phrases from moderated messages

---

## 2. Phishing Domain Blocklist

The blocklist is stored in Redis and takes effect immediately — no restart or cache invalidation needed.

### List blocklisted domains
`GET /api/chat/v1/admin/blocklist/domains` → **200**

```jsonc
{ "success": true, "data": { "domains": ["scam-site.com", "fake-mpesa.co"] } }
```

### Add a domain
`POST /api/chat/v1/admin/blocklist/domains` → **200**

```jsonc
{ "domain": "phishing-example.com" }
```

Any message containing a URL whose hostname matches this domain will be immediately **BLOCKED** (score set to 100), regardless of other signals.

### Remove a domain
`DELETE /api/chat/v1/admin/blocklist/domains/:domain` → **200**

---

## 3. Flagged & Blocked Message Oversight

### List moderated messages
`GET /api/chat/v1/admin/moderation/messages?status=FLAGGED&limit=20&cursor=...` → **200**

Query params:
- `status`: `FLAGGED` | `BLOCKED` | `ALL` (default: `ALL`)
- `search`: free-text filter on message content
- `limit`: default 20
- `cursor`: pagination cursor

```jsonc
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg_01J...",
        "conversationId": "conv_01J...",
        "senderId": "usr_01J...",
        "content": "Tuma pesa kwa +255...",
        "moderationStatus": "BLOCKED",
        "spamScore": 95,
        "moderationReason": "This message contains a phone number shared with off-platform payment instructions.",
        "moderationSignals": {
          "score": 95,
          "signals": { "phoneNumber": 95, "suspiciousPhrase": 70 },
          "matchedPatterns": [
            { "phrase": "tuma pesa", "category": "tanzania_mobile_money", "action": "FLAG", "weight": 70, "matchType": "SUBSTRING" }
          ],
          "anomalySignals": [],
          "phoneEvidence": ["+255***45 was shared with off-platform payment intent"],
          "evaluatedAt": "2026-09-06T10:00:00Z"
        },
        "createdAt": "2026-09-06T10:00:00Z"
      }
    ],
    "cursor": "...",
    "hasMore": true
  }
}
```

### Get moderated message detail
`GET /api/chat/v1/admin/moderation/messages/:messageId` → **200**

Returns full message detail including `moderationSignals` with complete breakdown.

### Review a moderated message
`POST /api/chat/v1/admin/moderation/messages/:messageId/review` → **200**

```jsonc
{
  "action": "APPROVE",              // APPROVE | CONFIRM_BLOCK | DELETE
  "notes": "False positive — legitimate seller"
}
```

| Action | Effect |
|---|---|
| `APPROVE` | Sets message `moderationStatus` back to `ACTIVE`, delivers it in the conversation |
| `CONFIRM_BLOCK` | Confirms the block — message remains hidden, recorded for pattern mining |
| `DELETE` | Permanently deletes the message content (soft delete + admin flag) |

All review actions are logged as `AdminModerationAction` records for audit.

---

## 4. Suspicious Phrase Registry

The phrase registry drives the risk engine. It has three sources:
- `SEED` — built-in catalog (240+ English and Swahili phrases, bootstrapped once)
- `ADMIN` — manually created by admin
- `AUTO` — promoted from emerging patterns

### List phrases
`GET /api/chat/v1/admin/moderation/phrases?activeOnly=true&category=tanzania_mobile_money` → **200**

Query params:
- `activeOnly`: `true` | `false` (default: all)
- `category`: filter by category string

```jsonc
{
  "success": true,
  "data": {
    "phrases": [
      {
        "id": "phr_01J...",
        "phrase": "tuma pesa",
        "category": "tanzania_mobile_money",
        "description": "Instruction to send money via mobile money",
        "matchType": "SUBSTRING",
        "action": "FLAG",
        "weight": 70,
        "language": "SW",
        "source": "SEED",
        "isActive": true,
        "createdAt": "2026-01-01T00:00:00Z"
      }
    ]
  }
}
```

### Get a phrase
`GET /api/chat/v1/admin/moderation/phrases/:id` → **200**

### Create a phrase
`POST /api/chat/v1/admin/moderation/phrases` → **201**

```jsonc
{
  "phrase": "piga pesa kwa namba yangu",
  "category": "off_platform_payment",
  "description": "Instruction to send money to a personal number",
  "matchType": "SUBSTRING",       // SUBSTRING | REGEX
  "action": "BLOCK",              // FLAG | BLOCK
  "weight": 85,                   // 0–100; used for FLAG scoring
  "language": "SW",               // EN | SW | OTHER
  "isActive": true
}
```

**REGEX notes:**
- Pattern is tested with `new RegExp(phrase, 'i')`
- Invalid regex is silently skipped during scoring — the send path is never blocked by a bad pattern
- Test patterns carefully before setting `action: BLOCK`

### Update a phrase
`PUT /api/chat/v1/admin/moderation/phrases/:id` → **200**

All fields are optional. Send only what you want to change.

### Delete a phrase
`DELETE /api/chat/v1/admin/moderation/phrases/:id` → **200**

**Does not delete SEED phrases permanently** — SEED phrases can be deactivated (`isActive: false`) via PUT but not deleted.

### Bootstrap seed catalog
`POST /api/chat/v1/admin/moderation/phrases/seed` → **200**

```jsonc
// Response
{ "success": true, "data": { "inserted": 245, "skipped": 0 } }
```

Idempotent — only inserts missing entries (checked by phrase + category + language). Safe to run multiple times. Called automatically on first startup if the DB is empty.

---

## 5. Emerging Pattern Mining

The `EmergingPatternsJob` runs hourly and automatically mines n-grams from recent flagged/blocked messages. Qualified patterns are saved as `PENDING` and surface here for human review before entering the active registry.

### List emerging patterns
`GET /api/chat/v1/admin/moderation/patterns?status=PENDING` → **200**

Query params:
- `status`: `PENDING` | `PROMOTED` | `DISMISSED` (default: all)

```jsonc
{
  "success": true,
  "data": {
    "patterns": [
      {
        "id": "pat_01J...",
        "pattern": "tuma kwa namba",
        "occurrenceCount": 47,
        "sampleMessages": ["Tuma kwa namba yangu...", "Tuma kwa namba hii..."],
        "status": "PENDING",
        "minedAt": "2026-09-06T03:15:00Z"
      }
    ]
  }
}
```

### Trigger manual mining
`POST /api/chat/v1/admin/moderation/patterns/mine?days=7` → **200**

```jsonc
{ "success": true, "data": { "scanned": 1842 } }
```

`days` param controls the lookback window (default 7). Use when you want to mine immediately rather than wait for the hourly job.

### Promote a pattern to the phrase registry
`POST /api/chat/v1/admin/moderation/patterns/:id/promote` → **200**

```jsonc
{
  "action": "FLAG",           // optional override — defaults to FLAG
  "weight": 75,               // optional override
  "category": "off_platform_payment"  // optional override
}
```

Creates a new phrase registry entry with `source: AUTO`, sets the pattern `status: PROMOTED`.

### Dismiss a pattern
`DELETE /api/chat/v1/admin/moderation/patterns/:id` → **200**

Sets pattern `status: DISMISSED`. Dismissed patterns are not re-mined.

---

## 6. Standard Categories

Use consistent category names for phrases and patterns to keep the registry organized:

| Category | Description |
|---|---|
| `off_platform_payment` | Instructions to pay outside Maysar |
| `advance_fee` | Advance fee / upfront payment scams |
| `tanzania_mobile_money` | Mobile money transfer instructions (Mpesa, Airtel, Tigo, Halo) |
| `phishing` | Links or requests designed to steal credentials |
| `urgency_pressure` | Time pressure / urgency manipulation |
| `off_platform_contact` | Attempts to move conversation off-platform |
| `prize_scam` | Fake prize / lottery / reward scams |
| `investment_scam` | Fake investment / ponzi scheme language |
| `bait_pricing` | Misleading pricing to attract then switch |
| `card_fraud` | Card number / CVV requests |
| `link_shortener` | Disguised links |
| `phone_number` | Phone number sharing (context-dependent risk) |

---

## 7. Audit Trail

All admin actions are recorded:
- `AdminModerationAction` rows are created on every `reviewModeratedMessage` call
- Fields: `adminId`, `messageId`, `action`, `notes`, `createdAt`
- These are append-only and not deletable through the API

Use your DB admin tools to query `community_AdminModerationAction` for compliance audits.

---

## 8. Error Codes

| Code | HTTP | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | No/expired JWT |
| `FORBIDDEN` | 403 | Not an admin role |
| `NOT_FOUND` | 404 | Message/phrase/pattern ID invalid |
| `VALIDATION_ERROR` | 422 | Invalid field values |
| `INTERNAL_SERVER_ERROR` | 500 | Server failure — retry with backoff |
