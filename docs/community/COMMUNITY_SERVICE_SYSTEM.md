# Maysar Community Service — Implementation Reference (As-Built)

> **Status:** Live and verified — knowledge articles, discussions, posts, feeds, business community guides.
> **Last updated:** September 2026
> **Scope:** `services/community-service`

---

## 1. Guiding Principles

| Principle | Where it lives |
|---|---|
| **Content is role-scoped** | Sellers see seller-specific content; couriers see courier content; buyers see buyer content |
| **Articles are versioned** | Published articles are immutable; edits create new versions |
| **Discussions are threaded** | Replies are nested up to 2 levels; deep nesting is flattened |
| **Feed is personalized** | Feed algorithm weights content by role, category interest, and recency |
| **Moderation is event-driven** | Reported content triggers moderation review; auto-hide at threshold |

---

## 2. Domain Model

### Article Entity (`domain/entities/knowledge-article.entity.ts`)

```
ReviewStatus (ArticleStatus):
  DRAFT → PENDING_REVIEW → IN_REVIEW → APPROVED → PUBLISHED
                                      ↘ REJECTED → (edit) → DRAFT
```

Fields: `id`, `authorId`, `title` (min 10, max 200 chars), `summary` (min 50, max 500 chars), `sections[]` (min 1, each min 100 chars), `category`, `industryTags[]`, `expertiseLevel`, `reviewStatus`, `qualityScore`, `version`, `publishedAt`

Access rules:
- `updateContent()` allowed on `DRAFT` or `REJECTED` only
- `publish()` requires `APPROVED` status — cannot publish from `IN_REVIEW`
- `PUBLISHED` articles visible to all; `DRAFT`/`REJECTED` visible to author only
- `PENDING_REVIEW`/`IN_REVIEW` visible to moderators/admins only

### Discussion Entity (`domain/entities/discussion.entity.ts`)

```
DiscussionStatus: OPEN → ACTIVE → RESOLVED ⇄ CLOSED
                  RESOLVED ← reopen() ← CLOSED
```

Fields: `id`, `authorId`, `topic` (min 10, max 200 chars), `content` (min 50, max 2000 chars), `category`, `expertiseLevel`, `industry[]`, `tags[]`, `status`, `responseCount`, `maxResponsesPerUser`

`canUserRespond()` = status is not `CLOSED` AND (author OR `responseCount < maxResponsesPerUser`)

### Post Entity (`domain/entities/post.entity.ts`)

```
PostStatus: DRAFT → PUBLISHED
```

Fields: `id`, `authorId`, `content` (min 1, max 10000 chars), `type` (text|image|video|link|poll|event|product_announcement|promotion|delivery_update|system_notice|dispute_clarification|question), `visibility` (public|followers|private), `status`, `likesCount`, `commentsCount`, `publishedAt`

Moderation: posts requiring pre-moderation are created in `DRAFT`. Auto-approved posts go directly to `PUBLISHED`.

### Business Challenge Entity (`domain/entities/business-challenge.entity.ts`)

```
ChallengeStatus: OPEN | IN_PROGRESS | SOLVED | ARCHIVED
```

### Contribution Score Value Object

Tracks user's reputation tier: `NEWCOMER | CONTRIBUTOR | EXPERT | MENTOR | THOUGHT_LEADER`

Daily post limits enforced by `ContentModerationPolicy`:

| Tier | Posts/day |
|---|---|
| NEWCOMER | 3 |
| CONTRIBUTOR | 5 |
| EXPERT | 8 |
| MENTOR | 10 |
| THOUGHT_LEADER | 15 |

---

## 3. Application Layer

| Use case | What it does |
|---|---|
| `CreateArticleUseCase` | Creates DRAFT article |
| `PublishArticleUseCase` | Transitions DRAFT → PUBLISHED; indexes in search |
| `GetArticleUseCase` | Fetch article + increment view count |
| `CreateDiscussionUseCase` | Creates discussion thread |
| `ReplyToDiscussionUseCase` | Adds reply to thread |
| `CreatePostUseCase` | Creates feed post |
| `GetFeedUseCase` | Personalized feed for user's role and interests |
| `LikeContentUseCase` | Like article/post/discussion |
| `ReportContentUseCase` | Report for moderation |

---

## 4. HTTP Surface

Mounted at `/api/community` (module name `community-service` → strip `-service` → `/api/community`).

### Posts

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/community/posts` | JWT | Create post |
| GET | `/api/community/posts/published` | none | Global feed |
| GET | `/api/community/posts/search` | none | Search posts |
| GET | `/api/community/posts/trending` | none | Trending topics |
| GET | `/api/community/posts/authors/:authorId` | none | Posts by author |
| GET | `/api/community/posts/users/:userId/feed` | JWT | Personalized feed |
| GET | `/api/community/posts/:postId` | none | Get single post |

### Discussions

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/community/discussions` | JWT | Create discussion |
| GET | `/api/community/discussions` | none | List discussions |
| GET | `/api/community/discussions/:threadId` | none | Get discussion |
| POST | `/api/community/discussions/:threadId/answers` | JWT | Submit answer |
| PATCH | `/api/community/discussions/:threadId/accept/:answerId` | JWT | Accept answer (author only) |
| PATCH | `/api/community/discussions/:threadId/close` | JWT | Close discussion |

### Knowledge Articles

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/community/knowledge/articles` | JWT (rep ≥ 500) | Submit article |
| GET | `/api/community/knowledge/articles` | none | List articles |
| GET | `/api/community/knowledge/articles/:articleId` | none | Get article |
| POST | `/api/community/knowledge/articles/:articleId/reviews` | JWT (experts) | Submit peer review |
| POST | `/api/community/knowledge/articles/:articleId/publish` | JWT | Publish article (requires APPROVED status) |

### Challenges

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/community/challenges` | JWT | Propose challenge |
| GET | `/api/community/challenges` | none | List challenges |
| POST | `/api/community/challenges/:challengeId/solutions` | JWT | Submit solution |

### Community & Expertise

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/community/discover` | JWT | Personalized content feed |
| POST | `/api/community/expertise/validate` | JWT | Validate expertise claim |
| GET | `/api/community/feed` | JWT | Personalized feed (alias) |
| GET | `/api/community/health/live` | none | Health check |

---

## 5. Frontend Integration Guide

### Personalized feed

`GET /api/community/feed?limit=20&cursor=...`

```jsonc
{
  "data": {
    "items": [
      {
        "type": "ARTICLE",
        "id": "art_01...",
        "title": "How to optimize your product listings",
        "excerpt": "...",
        "author": { "name": "Maysar Team", "avatar": "..." },
        "publishedAt": "2026-09-01T10:00:00Z",
        "readMinutes": 5,
        "likeCount": 47
      },
      {
        "type": "DISCUSSION",
        "id": "dis_01...",
        "title": "Best practices for COD orders",
        "replyCount": 12,
        "lastActivityAt": "2026-09-01T14:00:00Z"
      }
    ],
    "nextCursor": "..."
  }
}
```

### Content type display

| Type | Display component |
|---|---|
| `ARTICLE` | Card with title, excerpt, read time, author |
| `DISCUSSION` | Thread card with reply count, last activity |
| `POST` | Social post with media, likes, comments |

### Integration checklist

- [ ] Show feed on community/home tab filtered by user's role
- [ ] Implement infinite scroll with cursor pagination
- [ ] Show like count and allow tap-to-like (optimistic update)
- [ ] Deep-link from feed item to full article/discussion
- [ ] Show "New" badge on unread articles since last visit
- [ ] Allow users to follow topics/tags for personalized feed


---

## System Maintenance Routes

Mounted at `/api/community/system/maintenance`. Guards: `requireRoleOrService(['admin','system'])` **and** `x-service-key` header.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/community/system/maintenance/cleanup/outbox/report` | Dry-run count of deletable community outbox events |
| POST | `/api/community/system/maintenance/cleanup/outbox` | Batched deletion of expired outbox events. Body: `{ "dryRun": true }` to simulate |

**Retention defaults:** sent/processed → 7 days, failed → 30 days. Batch size: 1000. Max runtime: 20 s.
