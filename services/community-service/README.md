# Community Service

Community module for the Maysar monolith. It handles knowledge articles, discussions, challenges, posts, and personalized feeds.

## Runtime

- Canonical monolith mount: `/api/community`
- Legacy standalone app entry: `services/community-service/src/main.ts`

## Current Routes

- `GET /api/community/health`
- `GET /api/community/metrics`
- `POST /api/community/knowledge/articles`
- `GET /api/community/knowledge/articles`
- `GET /api/community/knowledge/articles/:articleId`
- `POST /api/community/knowledge/articles/:articleId/reviews`
- `POST /api/community/knowledge/articles/:articleId/publish`
- `GET /api/community/discover`
- `POST /api/community/challenges`
- `GET /api/community/challenges`
- `POST /api/community/challenges/:challengeId/solutions`
- `POST /api/community/expertise/validate`
- `POST /api/community/discussions`
- `GET /api/community/discussions`
- `GET /api/community/discussions/:threadId`
- `POST /api/community/discussions/:threadId/answers`
- `PATCH /api/community/discussions/:threadId/accept/:answerId`
- `PATCH /api/community/discussions/:threadId/close`
- `POST /api/community/posts`
- `GET /api/community/posts/published`
- `GET /api/community/posts/search`
- `GET /api/community/posts/trending`
- `GET /api/community/posts/:postId`
- `GET /api/community/posts/:postId/related`
- `GET /api/community/posts/authors/:authorId`
- `GET /api/community/posts/users/:userId/feed`

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## Testing

```bash
npm run test:community-service
npm run test:community-service:unit
npm run test:community-service:integration
npm run test:community-service:coverage
```

## Docs

- `services/community-service/openapi.yaml`
- `services/community-service/src/api/routes/`
- `services/community-service/src/application/use-cases/`
