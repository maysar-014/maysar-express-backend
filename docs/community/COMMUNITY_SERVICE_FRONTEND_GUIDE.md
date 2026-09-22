# Community Service — Frontend Integration Guide

> Mount path: `/api/community`
> Audience: All authenticated users (buyers, sellers, couriers, suppliers, enablers)

---

## Posts

### Create a Post
`POST /api/community/posts` — requires auth

```jsonc
{
  "authorId": "usr_01J...",
  "content": "Just launched my new product line in Dar es Salaam!",  // min 1, max 10000 chars
  "type": "text",           // text|image|video|link|poll|event|product_announcement|promotion|delivery_update|system_notice|dispute_clarification|question
  "title": "New Launch",    // optional, max 255 chars
  "visibility": "public",   // optional: public|followers|private
  "metadata": {             // optional
    "tags": ["fashion", "launch"],          // max 10 tags, each max 50 chars
    "relatedProductId": "prd_01J..."        // optional
  }
}
```

```jsonc
// Response 201 — post published immediately
{
  "message": "Post published successfully",
  "postId": "pst_01J...",
  "status": "published"
}

// Response 202 — post requires moderation
{
  "message": "Post submitted for moderation",
  "postId": "pst_01J...",
  "status": "pending_moderation",
  "moderationRequired": true
}
```

> ⚠️ The actual response does **not** use a `{ success, data }` wrapper. The fields are `message`, `postId`, and `status` (lowercase string). A `202` is returned when the post type or content triggers moderation — always check the HTTP status code, not just the body.

**Daily post limits by reputation tier:**

| Tier | Posts/day |
|------|-----------|
| NEWCOMER | 3 |
| CONTRIBUTOR | 5 |
| EXPERT | 8 |
| MENTOR | 10 |
| THOUGHT_LEADER | 15 |

When limit is reached → 403 `DAILY_LIMIT_REACHED`.

**Edit window:** 24 hours for regular posts, 1 hour for `question` type. After the window, the edit endpoint returns 409.

**Cooling periods:** 60 min between similar posts, 30 min between posts on the same topic → 429 `COOLING_PERIOD_ACTIVE` with `retryAfter` seconds.

---

### Get Published Posts (Global Feed)
`GET /api/community/posts/published?limit=20&offset=0`

Returns `{ posts: [...], pagination: { limit, offset, count } }` — no `success`/`data` wrapper.

### Get a Post
`GET /api/community/posts/:postId`

Returns `{ post: { ...postFields } }` — no `success`/`data` wrapper. `404` returns `{ error: "NotFoundError", message: "Post not found" }`.

### Search Posts
`GET /api/community/posts/search?q=fashion&type=text&limit=20&offset=0`

Returns `{ query, posts: [...], count }`.

### Get Trending Topics
`GET /api/community/posts/trending?hours=24`

Returns `{ topics: [...], timeWindowHours: 24 }`.

### Get Posts by Author
`GET /api/community/posts/authors/:authorId`

Returns `{ posts: [...], pagination: { limit, offset, count } }`.

### Get Personalised Feed
`GET /api/community/posts/users/:userId/feed?limit=20` — requires auth

Returns `{ userId, includeFollowed, posts: [...], count }`.

> **Response envelope note:** Unlike most other services, the community posts controller does NOT use `{ success: true, data: ... }` wrappers. All posts endpoints return plain objects. Error responses use `{ error: "ErrorType", message: "..." }` (not `{ success: false, error: { code, message } }`).

---

## Discussion Threads

### Create a Discussion
`POST /api/community/discussions` — requires auth

```jsonc
{
  "topic": "Best payment methods for small sellers in Tanzania",  // min 10, max 200 chars
  "content": "I've been using mobile money but the fees are eating into my margins. What do other sellers use?",  // min 50, max 2000 chars
  "category": "payments",
  "expertiseLevel": "BEGINNER",   // BEGINNER|INTERMEDIATE|ADVANCED|EXPERT
  "industry": ["retail", "ecommerce"],  // min 1 item
  "tags": ["payments", "mobile-money"], // min 1 item
  "businessStage": "early",             // optional
  "maxResponsesPerUser": 3              // optional, default 5, max 10
}
```

```jsonc
// Response 201
{
  "success": true,
  "data": {
    "id": "thr_01J...",
    "topic": "Best payment methods for small sellers in Tanzania",
    "status": "OPEN",
    "category": "payments",
    "expertiseLevel": "BEGINNER",
    "responseCount": 0,
    "maxResponsesPerUser": 3,
    "createdAt": "2024-09-01T10:00:00.000Z"
  }
}
```

**Thread status machine:**
```
OPEN → ACTIVE → RESOLVED ⇄ CLOSED
                RESOLVED ← reopen() ← CLOSED
```

Users **cannot respond** to a `CLOSED` thread. `canUserRespond()` = not CLOSED AND (author OR response count < `maxResponsesPerUser`).

---

### List Discussions
`GET /api/community/discussions?page=1&limit=20`

### Get a Discussion
`GET /api/community/discussions/:threadId`

### Submit an Answer
`POST /api/community/discussions/:threadId/answers` — requires auth

```jsonc
{ "content": "I use Tigo Pesa for most transactions because the fees are lower for small amounts under TZS 10,000." }
// min 50, max 2000 chars
```

```jsonc
// Response 201
{
  "success": true,
  "data": {
    "id": "ans_01J...",
    "threadId": "thr_01J...",
    "authorId": "usr_01J...",
    "content": "I use Tigo Pesa...",
    "createdAt": "2024-09-01T11:00:00.000Z"
  }
}
```

### Accept an Answer
`PATCH /api/community/discussions/:threadId/accept/:answerId` — requires auth (thread author only)

Body must be an empty object `{}`.

### Close a Discussion
`PATCH /api/community/discussions/:threadId/close` — requires auth (author or admin)

Body must be an empty object `{}`.

---

## Knowledge Articles

### Submit an Article
`POST /api/community/knowledge/articles` — requires auth (reputation ≥ 500)

```jsonc
{
  "title": "How to price your products competitively on Maysar",  // min 10, max 200 chars
  "summary": "A practical guide to understanding the buy-box algorithm and setting prices that win more sales without sacrificing margin.",  // min 50, max 500 chars
  "sections": [
    {
      "heading": "Understanding the Buy Box",
      "content": "The buy box is awarded to the seller with the best combination of price, rating, and stock availability...",  // min 100 chars
      "order": 0
    }
  ],  // min 1 section
  "category": "selling",
  "industryTags": ["retail", "ecommerce"],  // min 1
  "expertiseLevel": "INTERMEDIATE"          // BEGINNER|INTERMEDIATE|ADVANCED|EXPERT
}
```

```jsonc
// Response 201
{
  "success": true,
  "data": {
    "id": "art_01J...",
    "title": "How to price your products competitively on Maysar",
    "status": "DRAFT",
    "category": "selling",
    "expertiseLevel": "INTERMEDIATE",
    "createdAt": "2024-09-01T10:00:00.000Z"
  }
}
```

**Article status machine:**
```
DRAFT → PENDING_REVIEW → IN_REVIEW → APPROVED → PUBLISHED
                                    ↘ REJECTED → (edit) → DRAFT
```

- `updateContent()` only on `DRAFT` or `REJECTED`.
- `publish()` requires `APPROVED` — cannot publish from `IN_REVIEW`.
- `PUBLISHED` articles are visible to all. `DRAFT`/`REJECTED` visible to author only.

**Article field constraints:**

| Field | Constraint |
|-------|-----------|
| title | min 10, max 200 chars |
| summary | min 50, max 500 chars |
| section content | min 100 chars each |

### List Articles
`GET /api/community/knowledge/articles?page=1&limit=20`

### Get an Article
`GET /api/community/knowledge/articles/:articleId`

### Submit a Peer Review
`POST /api/community/knowledge/articles/:articleId/reviews` — requires auth (experts only)

### Publish an Article
`POST /api/community/knowledge/articles/:articleId/publish` — requires auth (author or admin)

Body must be an empty object `{}`. Returns 422 if article is not `APPROVED`.

---

## Challenges

### Propose a Challenge
`POST /api/community/challenges` — requires auth

```jsonc
{
  "title": "Reduce delivery time in Mwanza region",  // min 10, max 200 chars
  "description": "Couriers in Mwanza are averaging 3 days for same-city deliveries. We need solutions to bring this under 24 hours.",  // min 100, max 2000 chars
  "category": "logistics",
  "industryTags": ["logistics", "delivery"],
  "constraints": ["Must work without additional infrastructure"],  // optional
  "successCriteria": [
    {
      "description": "Average delivery time under 24 hours",
      "measurable": true,
      "targetValue": "24h"
    }
  ],  // min 1, at least one must have measurable: true
  "deadline": "2024-12-01T00:00:00.000Z"  // optional, must be future date
}
```

```jsonc
// Response 201
{
  "success": true,
  "data": {
    "id": "chl_01J...",
    "title": "Reduce delivery time in Mwanza region",
    "category": "logistics",
    "status": "OPEN",
    "solutionCount": 0,
    "createdAt": "2024-09-01T10:00:00.000Z"
  }
}
```

### List Challenges
`GET /api/community/challenges`

### Submit a Solution
`POST /api/community/challenges/:challengeId/solutions` — requires auth

---

## Commercial Content Requirements

To post commercial content (`promotion`, `product_announcement`), the user must meet **all** of:
- Account is `verified`
- Rating ≥ 4.0
- `completedOrders` ≥ 5
- `disputeRate` ≤ 0.1

If any condition is unmet → 403 `COMMERCIAL_CONTENT_NOT_ALLOWED`.

---

## Discover & Expertise

```
GET  /api/community/discover                    — personalised content feed (requires auth)
POST /api/community/expertise/validate          — validate expertise claim (requires auth)
```

### Validate Expertise
```jsonc
{
  "expertiseArea": "supply-chain",
  "targetLevel": "EXPERT"   // BEGINNER|INTERMEDIATE|EXPERT|MENTOR
}
```

---

## Error Codes

| Code | HTTP | Meaning | UI action |
|------|------|---------|-----------|
| `VALIDATION_ERROR` | 400 | Missing/invalid fields | Highlight fields |
| `UNAUTHORIZED` | 401 | No/expired JWT | Re-login |
| `FORBIDDEN` | 403 | Insufficient role or trust level | Show requirement |
| `COMMERCIAL_CONTENT_NOT_ALLOWED` | 403 | Commercial content requirements not met | Show checklist |
| `NOT_FOUND` | 404 | Article/thread/post not found | Show 404 |
| `DAILY_LIMIT_REACHED` | 403 | Daily post quota exhausted | Show reset time |
| `COOLING_PERIOD_ACTIVE` | 429 | Too soon since similar post | Show `retryAfter` countdown |
| `EDIT_WINDOW_EXPIRED` | 409 | Edit window closed | Hide edit button |
| `THREAD_CLOSED` | 422 | Cannot respond to closed thread | Show "Thread closed" |
| `INVALID_STATUS_TRANSITION` | 422 | e.g. publish before APPROVED | Show current status |

---

## Display Notes

- Show the user's remaining daily post count in the compose UI.
- `CLOSED` threads: show a "This thread is closed" banner, hide the reply form.
- Articles in `DRAFT`/`REJECTED`: only visible to the author.
- Articles in `PENDING_REVIEW`/`IN_REVIEW`: visible to moderators/admins.
- Only `PUBLISHED` articles are visible to all users.
- Enforce minimum content lengths client-side with character counters before submission.

---

## Integration Checklist

- [ ] Show remaining daily post count in the compose UI — fetch from user profile, enforce before allowing submission
- [ ] Check user's reputation tier before showing commercial content post types (`promotion`, `product_announcement`) — requires: verified account, rating ≥ 4.0, completedOrders ≥ 5, disputeRate ≤ 0.1
- [ ] `CLOSED` threads: show "This thread is closed" banner, hide the reply form — do not just disable the submit button
- [ ] Article visibility: gate by `reviewStatus` — `DRAFT`/`REJECTED` → author only, `PENDING_REVIEW`/`IN_REVIEW` → moderators only, `PUBLISHED` → all users
- [ ] `publish()` requires `APPROVED` status — disable the Publish button for any other status with a tooltip explaining why
- [ ] Cooling period: after `COOLING_PERIOD_ACTIVE` (429), show `retryAfter` countdown in the compose UI
- [ ] Edit window: hide edit button when the edit window has expired (`EDIT_WINDOW_EXPIRED` 409) — do not attempt silent recovery
- [ ] Character counters: enforce minimum lengths client-side before submission (post min 1, discussion content min 50, article section min 100)
- [ ] Challenges `successCriteria`: at least one criterion must have `measurable: true` — validate client-side


---

## System Maintenance (internal/ops)

These endpoints are for ops/admin use only. They are not called from the frontend.

```
POST /api/community/system/maintenance/cleanup/outbox/report
POST /api/community/system/maintenance/cleanup/outbox
```

**Auth:** `requireRoleOrService(['admin','system'])` **and** `x-service-key` header.

### Outbox cleanup report
`POST /api/community/system/maintenance/cleanup/outbox/report` → **200** — dry-run count of deletable outbox events.

### Outbox cleanup
`POST /api/community/system/maintenance/cleanup/outbox` → **200** — batched deletion. Body: `{ "dryRun": true }` to simulate. `maxRuntimeMs` defaults to 20 seconds.
