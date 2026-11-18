# Maysar Performance Constitution

> **Authority**: Binding performance law for all product, frontend, backend, data, and platform work in Maysar.
> **Mission**: Eliminate growth-hurting latency, keep the platform usable at scale, and make performance a release requirement instead of a best effort.
> **Non-Negotiable Outcome**: A user-facing page or primary in-app navigation must complete within **3 seconds maximum** under defined target conditions.

---

## 1. Performance Is A Product Requirement

Performance is not an optimization pass. It is part of correctness.

If a page takes 30 to 60 seconds to load or navigate, the system is failing the business, regardless of whether the feature is technically functional.

This constitution is binding for:

- frontend pages
- backend APIs
- database access
- caches
- asynchronous jobs that feed user-visible pages
- dashboards, search flows, listings, detail pages, checkout flows, and admin tools

---

## 2. The Hard User Experience Law

### 2.1 Page Load Ceiling

> **Every user-facing page must load in 3 seconds or less.**

This applies to:

- initial page load
- authenticated dashboard entry
- in-app navigation between major pages
- filtered reloads that materially change a page

### 2.2 Navigation Ceiling

> **A page-to-page navigation must complete in 3 seconds or less, and should target 2 seconds or less.**

### 2.3 Constitutional Violation Threshold

Any page or navigation observed above **3 seconds p95** is in violation.

Any page or navigation observed above **5 seconds** is a release blocker.

Any page or navigation observed above **10 seconds** is a production incident.

---

## 3. Measurement Standard

The platform must measure performance using realistic user conditions, not local-dev best case.

### Standard Page Budget Definition

- `p95` full page load or major navigation: `<= 3.0s`
- `p99` full page load or major navigation: `<= 4.0s`
- time to first useful content: `<= 1.5s`
- time to usable interaction: `<= 3.0s`
- subsequent navigations from warm session: `<= 2.0s`

### Required Test Conditions

- authenticated user state when relevant
- realistic dataset sizes
- realistic tenant/account sizes
- staging or production-like infrastructure
- cache-cold and cache-warm measurements

Performance claims from tiny local datasets are not valid evidence.

---

## 4. End-To-End Budget Allocation

The 3-second rule must be budgeted across the entire request chain.

| Layer | p95 Budget |
|-------|------------|
| CDN / edge / transport overhead | 300ms |
| backend API aggregation and application logic | 900ms |
| database and cache access combined | 900ms |
| frontend render, hydration, and state assembly | 900ms |

If a page uses multiple requests, the full waterfall must still remain within the page budget.

---

## 5. API Performance Law

### 5.1 Endpoint Budgets

- p95 read endpoint latency: `<= 300ms`
- p95 write endpoint latency: `<= 600ms`
- p95 dashboard aggregation endpoint latency: `<= 900ms`
- p99 for any user-facing endpoint: `<= 1.5s`

### 5.2 No Waterfall-Driven Pages

No page may depend on long sequential chains of API calls when the data can be aggregated.

If a page needs data from many modules, the system must expose:

- an aggregation endpoint
- a backend-for-frontend endpoint
- or a precomputed read model

### 5.3 Request Count Limits

For a primary page load:

- target critical request count: `<= 6`
- hard maximum before redesign: `10`

If a page requires more than 10 blocking requests, the page architecture is defective.

---

## 6. Database Law

### 6.1 Query Budget

- single query p95: `<= 100ms`
- total DB time for a user-facing request p95: `<= 250ms`

### 6.2 Forbidden Database Patterns

- N+1 queries in request paths
- unbounded scans on user-facing paths
- selecting full rows when projections are enough
- offset pagination on large hot tables without justification
- synchronous reporting queries on transactional tables during page load

### 6.3 Required Database Practices

- indexes for every hot filter and join path
- explicit pagination on list endpoints
- projections/select clauses for read-heavy queries
- query plans reviewed for slow paths
- precomputed aggregates for dashboards and analytics-heavy screens

---

## 7. Cache and Read Model Law

Caching is mandatory for repeated hot reads.

### Required When Any Of The Following Is True

- the same page is loaded frequently
- the page composes many downstream reads
- the query touches analytics, ranking, feed, dashboard, or summary data
- the page would otherwise exceed 1 second server time

### Allowed Patterns

- Redis read-through caching
- stale-while-revalidate
- materialized read models
- scheduled precomputation
- event-driven denormalized views

### Forbidden Pattern

Using "live correctness" as a blanket excuse to avoid caching when the page is operationally slow.

---

## 8. Frontend Data Loading Law

### 8.1 Blocking Data Must Be Minimal

Only data needed for first meaningful use may block initial render.

Everything else must be:

- deferred
- progressively loaded
- prefetched
- or rendered from cached state

### 8.2 Payload Budget

- first payload target: `<= 250KB compressed`
- blocking JSON payload per page target: `<= 150KB compressed`

### 8.3 Rendering Law

The frontend must avoid:

- rendering very large lists without virtualization
- blocking on secondary panels
- full-page refetches when only one widget changed
- recomputing expensive views on every interaction

---

## 9. Dashboard and Analytics Law

Dashboards are the highest-risk performance surface in the Maysar system.

Therefore:

- dashboards must use dedicated aggregation endpoints
- expensive metrics must be precomputed or cached
- charts must not each trigger their own blocking request chain
- seller, enabler, courier, admin, and support dashboards must load from a bounded number of queries and API calls

Any dashboard with independent widget waterfalls that push the page above 3 seconds is non-compliant.

---

## 10. Forbidden Performance Anti-Patterns

The following are constitutional violations on user-facing paths:

- fan-out page loads across many modules without aggregation
- serial API chains where parallelism is possible
- synchronous third-party calls on blocking page requests
- loading entire datasets and filtering in memory
- doing heavy analytics computation inside page request handlers
- missing pagination on large collections
- returning unused fields on hot endpoints
- retry storms on navigation paths
- background jobs competing with page traffic without isolation

---

## 11. Mandatory Performance Design Rules

Every new page, route, or major feature must define:

- expected p95 load time
- expected critical API calls
- expected cache strategy
- expected database access pattern
- fallback behavior if one dependency is slow

No feature is complete without a stated performance budget.

---

## 12. Observability and Proof

Performance must be observable with evidence.

### Required Signals

- page load p50, p95, p99
- navigation latency p50, p95, p99
- endpoint latency by route
- query latency by operation
- cache hit rate on hot paths
- payload size on major responses
- request count per page

### Required Tooling

- tracing for request waterfalls
- slow query logging
- service-level latency dashboards
- alerts for budget breaches

If a team cannot show the latency breakdown, the system is not under control.

---

## 13. PR and Release Gate Law

Every PR touching user-facing flows must answer:

- What page or navigation budget is affected?
- How many blocking requests does this add or remove?
- What is the cache plan?
- What evidence proves the path stays within budget?

### Release Blockers

- introduces a p95 breach above budget
- increases critical request count without approved reason
- adds unbounded query behavior
- adds new synchronous dependency to a hot path without mitigation

---

## 14. Remediation Law

When a page breaches the constitution:

1. classify it as a defect, not backlog polish
2. identify the blocking chain
3. assign an owner across frontend, backend, and data as needed
4. ship the fastest safe mitigation first
5. follow with structural correction if the mitigation is temporary

Temporary mitigation may include:

- response caching
- disabling secondary widgets from blocking initial render
- deferring low-priority panels
- creating a dedicated aggregation endpoint

---

## 15. Enforcement

This constitution is enforced through:

1. code review
2. performance budgets in design and PR templates
3. load tests for critical flows
4. route-level latency SLOs
5. dashboards and alerts
6. release blocking for repeated breaches

---

## 16. Binding Principle

> **Growth cannot continue on a slow platform. Any user-facing page that cannot load within 3 seconds is a business defect and must be treated as urgent.**

**End of Constitution**
