# Community Service - Business Network Guide

## Introduction

The Community Service transforms traditional social networking into a **business-focused value creation platform**. Every feature is designed to support learning, trust-building, and collaborative business growth.

## Core Principles

### 1. Business Value First
Every interaction must contribute to business growth:
- Knowledge sharing over casual socializing
- Problem-solving over networking
- Expertise building over popularity

### 2. Quality Through Constraints
- **Engagement quotas** - Rate-limited posting encourages thoughtful contributions
- **Reputation tiers** - Advanced features unlock progressively
- **Peer review** - Community-validated knowledge

### 3. Structured Engagement
All content requires business context:
- Industry tags
- Business stage indicators  
- Expertise level markers
- Success criteria for challenges

## Key Features

### Discussion Threads (Q&A)
**Purpose**: Get expert answers to specific business questions.

**Features**:
- Automatic expert matching based on industry and expertise
- Quality-scored answers (business value, actionability, clarity)
- Max 3 responses per user (encourages quality over quantity)
- Accepted answers for resolved questions

**Example Questions**:
> "How do I handle customs for cross-border shipments in East Africa?"
> "What's the best payment gateway for SMEs in Kenya?"
> "How can I optimize inventory for seasonal demand in my industry?"

### Knowledge Articles
**Purpose**: Share comprehensive guides and best practices.

**Features**:
- Peer review required before publication (Mentor+ tier)
- Can be converted to training modules
- Versioned for continuous improvement
- Minimum 500 reputation points required

**Example Articles**:
- "Complete Guide to E-Commerce Logistics in East Africa"
- "Building Supplier Relationships for New Businesses"
- "Cross-Border Payment Solutions Comparison"

### Business Challenges
**Purpose**: Crowdsource solutions to real business problems.

**Features**:
- Collaborative problem-solving
- Clear success criteria for solutions
- Expert matching to relevant challenges
- Accepted solution recognition

**Example Challenges**:
> "How to reduce delivery costs in rural areas by 30%?"
> "Strategy for managing 3x inventory spike during holiday season"
> "Building buyer trust in a new market with no reviews"

### Expertise Validation
**Purpose**: Verify and showcase real expertise.

**Validation Signals**:
1. **Training Completion** - Courses in expertise area
2. **Business Credentials** - Verified business ownership
3. **Peer Endorsements** - Recognition from other experts
4. **Contribution Quality** - Quality scores from content
5. **Portfolio Evidence** - Real-world proof

**Benefits**:
- Higher engagement quotas
- Access to expert-only features
- Priority in discussion matching
- Ability to peer review articles

## Reputation System

### Tiers and Quotas

| Tier | Points | Daily Threads | Daily Answers | Daily Articles | Features |
|------|--------|---------------|---------------|----------------|----------|
| **Newcomer** | 0 | 1 | 3 | ❌ | Basic access |
| **Contributor** | 100 | 2 | 5 | ❌ | Increased quotas |
| **Expert** | 500 | 3 | 8 | 1 | Write articles |
| **Mentor** | 1000 | 5 | 10 | 2 | Peer review |
| **Thought Leader** | 2500 | 10 | 15 | 3 | Premium features |

### Earning Points

| Action | Points |
|--------|--------|
| Accepted answer | +50 |
| High-quality answer | +10 |
| Published article | +100 |
| Peer review | +20 |
| Accepted challenge solution | +75 |
| Peer endorsement | +15 |
| Training module completion | +25 |

## API Overview

### Discussions
```
POST   /api/community/discussions              Create thread
GET    /api/community/discussions              List threads
POST   /api/community/discussions/:id/answers  Answer question
PATCH  /api/community/discussions/:id/accept   Accept answer
```

### Knowledge
```
POST   /api/community/knowledge/articles           Submit article
GET    /api/community/knowledge/articles           List articles
POST   /api/community/knowledge/articles/:id/reviews  Peer review
```

### Challenges
```
POST   /api/community/challenges                Propose challenge
POST   /api/community/challenges/:id/solutions  Submit solution
```

### Discovery
```
GET    /api/community/discover                  Personalized content
POST   /api/community/expertise/validate        Validate expertise
```

## Business Rules

### Content Requirements

**All content must include**:
- ✅ Industry tags (e.g., "logistics", "e-commerce")
- ✅ Business context (stage, category)
- ✅ Minimum length requirements
- ✅ Quality thresholds (business value, clarity)

**Minimum Lengths**:
- Discussion: 50 characters
- Answer: 50 characters
- Article section: 100 characters
- Challenge: 100 characters

### Engagement Quotas

**How It Works**:
1. Daily/weekly limits based on reputation tier
2. Quality bonuses for high-scoring contributions
3. Auto-reset every 24 hours
4. Cooling periods between rapid posts

**Example**: A Contributor (100 pts) can:
- Post 2 discussion threads/day
- Submit 5 answers/day
- Get +1 bonus answer for an accepted answer

## Technical Architecture

### Clean Architecture Layers
```
domain/           Business logic, entities, policies, engines
application/      Use cases, DTOs, mappers
infrastructure/   Repositories, HTTP clients
api/              Controllers, routes, middleware
```

### External Integrations

**Business Registry Service**:
- Verify business credentials
- Link profiles to businesses

**Training Service**:
- Track module completion
- Convert articles to training
- Monitor learning progress

### Database Models (11 total)
- DiscussionThread & ThreadAnswer
- BusinessProfile
- KnowledgeArticle & ArticleReview
- BusinessChallenge & ChallengeSolution
- EngagementQuota
- ContributionHistory
- UserInteraction
- PeerEndorsement
- OutboxEvent

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis (caching)
- Kafka (events)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
cd ../.. && npx prisma generate

# 3. Run migrations
npx prisma migrate dev --name community_service

# 4. Start service
npm run dev
```

### Environment Variables
```env
BUSINESS_REGISTRY_SERVICE_URL=http://localhost:3010
TRAINING_SERVICE_URL=http://localhost:3007
AUTH_SERVICE_URL=http://localhost:3001

ENABLE_PEER_REVIEW=true
ENABLE_EXPERTISE_VALIDATION=true
AUTO_PUBLISH_ARTICLES=false
```

## Development

### Running Tests
```bash
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:e2e          # End-to-end tests
```

### Code Quality
```bash
npm run lint              # ESLint
npm run format            # Prettier
npm run type-check        # TypeScript
```

## Support & Documentation

- **API Documentation**: `/api-docs` (OpenAPI/Swagger)
- **Health Checks**: `/health`, `/ready`, `/live`  
- **Support**: support@maysar.com

---

*Built with ❤️ for business growth*
