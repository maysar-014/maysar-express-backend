# Maysar Containerization Constitution

> **Proprietor**: Maysar Corporation - All rights reserved
> **Authority**: Supreme containerization law binding all Maysar monolithic modules and infrastructure
> **Mission**: Establish enterprise-grade containerization standards that guarantee security, efficiency, and operational excellence
> **Vision**: Seamless portability and unwavering reliability through standardized, battle-hardened container patterns
> **Commitment**: Every image is minimal, every container is secure, every module is resource-aware

---

> [!NOTE]
> In the current monolithic architecture, containerization applies to the entire monolith deployment. Individual modules are not separately containerized, but their boundaries are maintained for future microservices decomposition.

## 1. Core Container Philosophy

### The Three Pillars of Container Excellence

1. **Immutable Isolation**: Containers must be self-contained and environment-agnostic.
2. **Minimal Attack Surface**: Every layer must be justified; every binary must be necessary.
3. **Operational Visibility**: Containers must proactively communicate their health and resource needs.

### The Container Truth Principle (CTP)

> **Images are built once, deployed everywhere**  
> **Production containers never run as root**  
> **Resource limits are not optional â€” they are mandatory**

---

## 2. Image Construction Law

### 2.1 Multi-Stage Exclusivity Rule
All service Dockerfiles **must** utilize multi-stage builds. 
- **Stage 1 (Build)**: Contains build-time dependencies (compilers, git, dev-dependencies).
- **Stage 2 (Runtime)**: Contains only the compiled binary and production-only dependencies.

### 2.2 Base Image Sovereignty
- **Primary Standard**: `node:18-alpine` (or current project-wide version) for Node.js services.
- **Security Standard**: Use specific digests or versions; never use `latest`.
- **Minimalism**: Alpine or Distroless are the only permitted runtime base images.

### 2.3 Layer Optimization Mandate
- Combine `RUN` commands to minimize layer count.
- Order instructions by change frequency (package files first) to maximize cache utility.
- Use `.dockerignore` religiously to prevent build context pollution.

---

## 3. Security & Sovereignty

### 3.1 Non-Root Mandate
> **Running a container process as root is a critical security defect.**

- Every Dockerfile must create a dedicated system user/group.
- Every Dockerfile must explicitly switch to that user using the `USER` instruction before `CMD`.

### 3.2 Signal Handling Law
Containers must respond correctly to `SIGTERM` and `SIGINT`.
- Use `dumb-init` or `tini` as the `ENTRYPOINT` to handle PID 1 responsibilities.
- Never use `npm start` as the primary `CMD` (it masks signals); use `node dist/main.js`.

### 3.3 Dependency Integrity
- Production images must be built with `npm ci --only=production`.
- Use `npm prune --production` in the build stage to ensure zero dev-dependencies leak into runtime.

---

## 4. Operational Excellence

### 4.1 The Health Check Mandate
Every service must implement a proactive `HEALTHCHECK` instruction.
- **Local Validation**: Use `curl` or a lightweight `node` script to probe the service.
- **Path Consistency**: All services must expose a `/health` endpoint.
- **Fail-Fast**: Health checks must accurately reflect the service's ability to process traffic.

### 4.2 Resource Stewardship (The 1:5 Rule)
Every container in production must have defined CPU and Memory limits/requests.
- **Requests**: Minimum resources required for the pod to be scheduled.
- **Limits**: Maximum resources the pod can consume before being throttled or killed.
- **Mandate**: Requests must generally be at least 20% of limits (the 1:5 ratio) to ensure stability while allowing burst.

### 4.3 Logs & State Sovereignty
- **Statelessness**: No container may rely on local file system persistence for core business logic.
- **Log Stream Standard**: All logs must be emitted to `stdout` and `stderr` in JSON format.

---

## 5. Orchestration Standards

### 5.1 Docker Compose (Development)
Docker Compose is the law for local development.
- Must mirror production architecture as closely as possible.
- Must use environment variables for all configurations.
- Must include health-aware dependency chains (`depends_on: { condition: service_healthy }`).

### 5.2 Orchestrator (Production)
Template Engine is the standard for Orchestrator orchestration.
- **HPA**: All services must have Horizontal Pod Autoscalers defined.
- **PDB**: Pod Disruption Budgets must be set to ensure service availability during maintenance.
- **Probes**: `livenessProbe`, `readinessProbe`, and `startupProbe` must be explicitly configured in Template Engine values.

---

## 6. Secret & Configuration Law

### 6.1 The Zero-Secret-in-Image Principle
> **No secret, API key, or credential shall ever be baked into a Docker image.**

- Images must be identical across Dev, Staging, and Production.
- Secrets must be injected via:
    - Environment variables (Dev)
    - Orchestrator Secrets / Vault (Production)

### 6.2 Config Mapping
- Non-sensitive configuration should be managed via Orchestrator `ConfigMaps`.
- Use `.env.example` as the single source of truth for required configuration keys.

---

## 7. Enforcement & Compliance

This constitution is enforced via:
1. **CI Linting**: `hadolint` or similar for Dockerfile best practices.
2. **Vuln Scanning**: Mandatory `trivy` or `snyk` scans on every build.
3. **Architecture Review**: Any new service must be audited for constitutional compliance before being merged.

---

## 8. The Final Law

> **A container that cannot survive a restart or scales with state is not a container â€” it is a liability.**

---

**End of Constitution**
