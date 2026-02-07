# Community Service - Business Network Modeling

This directory contains software modeling documentation for the **Business-Focused Community Service**, aligned with Maysar's philosophy of purpose-driven business networks.

## Overview

The modeling diagrams document the transformation from generic social features to a structured business network platform focused on:
- **Knowledge Sharing** - Q&A discussions with expert matching
- **Expertise Building** - Multi-signal validation and reputation tiers
- **Collaborative Problem-Solving** - Business challenges and solutions
- **Quality Content** - Peer-reviewed knowledge articles

---

## Use Case Diagrams

### [business-network.mmd](./use-cases/business-network.mmd)
Complete use case model showing all actor interactions:
- **Business Users** - Core platform participants
- **Domain Experts** - Mentors and thought leaders
- **Newcomers** - Users building initial reputation

**Key Use Cases:**
- Knowledge sharing (ask, answer, accept)
- Article submission and peer review
- Challenge proposal and solution submission
- Expertise validation and endorsements
- Personalized content discovery

---

## Sequence Diagrams

### [create-discussion-thread.mmd](./sequence/create-discussion-thread.mmd)
End-to-end flow for creating a business-focused Q&A thread:
1. **Quota Validation** - Check engagement limits based on reputation tier
2. **Quality Assessment** - Multi-signal content evaluation (business value, clarity, actionability)
3. **Duplicate Detection** - Prevent redundant questions
4. **Expert Matching** - Route to relevant domain experts
5. **Event Publishing** - Notify matched experts

**Key Components:**
- `EngagementPolicy` - Quota enforcement logic
- `ContentModerationPolicy` - Quality assessment
- `DiscussionMatchingEngine` - Expert selection algorithm

### [submit-knowledge-article.mmd](./sequence/submit-knowledge-article.mmd)
Article submission workflow with reputation-based routing:
1. **Reputation Check** - Minimum 500 points (Expert tier)
2. **Quota Validation** - Daily article limits
3. **Content Structure Validation** - Section requirements
4. **Peer Review Determination** - Auto-publish for Mentors+, review for Experts
5. **Event Publishing** - Trigger review workflow or publication

**Key Business Rules:**
- Expert tier (500+) required to write articles
- Mentor tier (1000+) can bypass peer review
- Quality thresholds prevent low-value content

### [validate-expertise.mmd](./sequence/validate-expertise.mmd)
Multi-signal expertise verification process:
1. **Training Validation** - Check completed modules in expertise area
2. **Business Credentials** - Verify business ownership/role (for Expert+ tiers)
3. **Contribution Quality** - Analyze answer scores and article quality
4. **Peer Endorsements** - Require recognition from other experts
5. **Badge Awarding** - Grant verified expertise badge
6. **Reputation Recalculation** - Update tier if threshold crossed

**Validation Signals:**
- Training completion (required)
- Business credentials (Expert+ only)
- Peer endorsements (counts and quality)
- Contribution metrics (helpful answers, published articles)

---

## State Machine Diagrams

### [discussion-thread-status.mmd](./state-machines/discussion-thread-status.mmd)
Thread lifecycle states:
- **OPEN** - New thread, awaiting first answer
- **ACTIVE** - Has responses, discussion ongoing
- **RESOLVED** - Author accepted an answer (can still receive new answers)
- **CLOSED** - Locked, archived for reference

**Key Transitions:**
- `OPEN → ACTIVE`: First answer submitted
- `ACTIVE → RESOLVED`: Author accepts answer
- `* → CLOSED`: Thread author or admin closes

### [knowledge-article-status.mmd](./state-machines/knowledge-article-status.mmd)
Article publication workflow states:
- **DRAFT** - Author editing, not visible
- **PENDING_REVIEW** - Submitted for peer review (Experts require this)
- **PUBLISHED** - Publicly visible, can be versioned
- **REJECTED** - Failed peer review, can be revised

**Key Transitions:**
- `DRAFT → PENDING_REVIEW`: Submit for review (Expert tier)
- `DRAFT → PUBLISHED`: Auto-publish (Mentor+ tier)
- `PENDING_REVIEW → PUBLISHED`: Peer review passed (2-3 approvals)
- `PENDING_REVIEW → REJECTED`: Quality issues found

### [business-challenge-status.mmd](./state-machines/business-challenge-status.mmd)
Challenge resolution lifecycle:
- **OPEN** - Challenge proposed, awaiting solutions
- **IN_PROGRESS** - At least one solution submitted
- **SOLVED** - Proposer accepted a solution
- **CLOSED** - Archived, no new solutions

**Key Rewards:**
- Accepted solution: +75 reputation points
- Challenge visible as reference after solving

---

## Architecture Alignment

All diagrams reflect Clean Architecture principles:

- **Domain Layer** - Entities, value objects, policies, engines shown in sequences
- **Application Layer** - Use cases orchestrate domain logic
- **Infrastructure Layer** - Repositories and external clients
- **API Layer** - Controllers handle requests (shown as API participant)

### Key Domain Engines

1. **DiscussionMatchingEngine** - Matches questions to experts based on:
   - Industry tags
   - Expertise areas
   - Past contribution quality
   - Availability for engagement

2. **KnowledgeDiscoveryEngine** - Personalizes content recommendations using:
   - User's business goals
   - Learning objectives
   - Expertise gaps
   - Interaction history

3. **QualityAssessmentEngine** - Evaluates content based on:
   - Business value/relevance
   - Clarity and structure
   - Actionability
   - Evidence quality

4. **ReputationEngine** - Calculates reputation tiers considering:
   - Contribution score
   - Accepted answers
   - Published articles
   - Peer endorsements
   - Training completion

---

## Reputation System

The diagrams reflect the 5-tier reputation system:

| Tier | Points | Daily Threads | Daily Answers | Daily Articles |
|------|--------|---------------|---------------|----------------|
| Newcomer | 0 | 1 | 3 | ❌ |
| Contributor | 100 | 2 | 5 | ❌ |
| Expert | 500 | 3 | 8 | 1 |
| Mentor | 1000 | 5 | 10 | 2 |
| Thought Leader | 2500 | 10 | 15 | 3 |

**Progression:**
- Start as Newcomer - answer questions to build reputation
- Reach Expert (500) - unlock article writing
- Reach Mentor (1000) - bypass peer review, can review others' articles
- Reach Thought Leader (2500) - premium engagement quotas

---

## Event-Driven Architecture

Diagrams show domain events published at key points:

**Discussion Events:**
- `DiscussionThreadCreated` - New question posted
- `ExpertsMatched` - Route to relevant experts
- `AnswerAccepted` - Solution found
- `ThreadClosed` - Archived

**Knowledge Events:**
- `ArticleSubmittedForReview` - Enters peer review queue
- `ArticleReviewed` - Review completed
- `ArticlePublished` - Available to community
- `ArticleVersionUpdated` - Content improved

**Challenge Events:**
- `ChallengeProposed` - New problem posted
- `SolutionSubmitted` - Potential solution added
- `SolutionAccepted` - Challenge solved
- `ChallengeClosed` - Archived

**Expertise Events:**
- `ExpertiseValidated` - Badge awarded
- `ReputationTierUpgraded` - Tier threshold crossed
- `PeerEndorsementReceived` - Expert recognition

---

## Integration Points

Sequence diagrams show external service integrations:

**Training Service:**
- Check completed modules for expertise validation
- Get user progress for content recommendations
- Link articles to training modules

**Business Registry Service:**
- Verify business credentials
- Validate ownership/role for Expert+ tier

**Event Bus (Kafka):**
- Publish domain events for cross-service consumption
- Enable saga orchestration for complex workflows

---

## Quality Gates

The diagrams enforce multiple quality gates:

1. **Engagement Quotas** - Rate limiting based on reputation tier
2. **Content Quality** - Minimum scores for business value
3. **Duplicate Prevention** - Similar content detection
4. **Peer Review** - Expert validation for knowledge articles
5. **Expertise Requirements** - Feature access based on verified skills

---

## Modeling Standards

All diagrams follow Mermaid syntax and are:
- **Version controlled** - Track evolution over time
- **Executable** - Can be rendered in development tools
- **Synchronized** - Match implemented code architecture
- **Documented** - Clear notes explain business rules

---

*Last Updated: 2026-02-07*  
*Modeling Philosophy: Purpose-driven business networks, not casual social platforms*
