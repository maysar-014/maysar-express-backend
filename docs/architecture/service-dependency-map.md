# Maysar Express — Service Dependency Map

> **Evidence-based** — built from reading actual source files.
> Sources: service `index.ts` files, `shared/events/eventBus.ts`, `events/CATALOG.md`, `events/types.ts`, integration client files.

---

## 1. Actual Event Producer/Consumer Matrix

> Evidence: `events/CATALOG.md` — canonical source of truth for all events.

```mermaid
graph LR
    subgraph Producers["Event Producers"]
        ORDER_SVC["order-service"]
        PAY_SVC["payment-service"]
        INV_SVC["inventory-service"]
        LOG_SVC["logistics-service"]
        AUTH_SVC["auth-service"]
        COM_SVC["commission-service"]
        COMP_SVC["compliance-service"]
    end

    subgraph Events["Domain Events (events/CATALOG.md)"]
        E_OC["order.created.v1"]
        E_OCA["order.cancelled.v1"]
        E_OCO["order.completed.v1"]
        E_PS["payment.succeeded.v1"]
        E_PF["payment.failed.v1"]
        E_PR["payment.refund.completed.v1"]
        E_IR["inventory.reserved.v1"]
        E_IRL["inventory.released.v1"]
        E_ILS["inventory.low.stock.v1"]
        E_LPA["logistics.pickup.assigned.v1"]
        E_LDC["logistics.delivery.completed.v1"]
        E_CC["commission.calculated.v1"]
        E_CP["commission.paid.v1"]
        E_SR["seller.registered.v1"]
        E_SKA["seller.kyc.approved.v1"]
        E_SA["seller.activated.v1"]
    end

    subgraph Consumers["Event Consumers"]
        C_INV["inventory-service"]
        C_PAY["payment-service"]
        C_ORD["order-service"]
        C_LOG["logistics-service"]
        C_COM["commission-service"]
        C_NOT["notification-service"]
        C_ANA["analytics-service"]
        C_CAT["catalog-service"]
        C_COMP["compliance-service"]
    end

    ORDER_SVC --> E_OC & E_OCA & E_OCO
    PAY_SVC --> E_PS & E_PF & E_PR
    INV_SVC --> E_IR & E_IRL & E_ILS
    LOG_SVC --> E_LPA & E_LDC
    COM_SVC --> E_CC & E_CP
    AUTH_SVC --> E_SR
    COMP_SVC --> E_SKA

    E_OC --> C_INV & C_PAY & C_NOT & C_ANA
    E_OCA --> C_INV & C_PAY & C_NOT
    E_OCO --> C_COM & C_ANA
    E_PS --> C_ORD & C_COM & C_ANA
    E_PF --> C_ORD & C_NOT
    E_PR --> C_ORD & C_COM & C_NOT
    E_IR --> C_ORD & C_ANA
    E_IRL --> C_ORD
    E_ILS --> C_NOT
    E_LDC --> C_ORD & C_COM
    E_CC --> C_ANA
    E_SKA --> C_CAT & C_NOT

    style C_NOT fill:#FF9800,color:#fff
    style C_ANA fill:#9C27B0,color:#fff
```

---

## 2. Synchronous Service Client Dependencies

> Evidence: `services/order-service/src/infrastructure/integrations/` — actual HTTP client files.

```mermaid
graph TB
    subgraph OrderServiceClients["order-service HTTP Clients"]
        AUTH_CLIENT["AuthServiceClient\n(auth verification)"]
        USER_CLIENT["UserServiceClient\n(user profile, COD reputation)"]
        LOG_CLIENT["LogisticsServiceClient\n(delivery creation)"]
        WAL_CLIENT["WalletServiceClient\n(COD commitment, wallet debit)"]
    end

    subgraph PaymentServiceClients["payment-service HTTP Clients"]
        PESAPAL_ADAPTER["PesapalAdapter\n(card, mobile money)"]
        WALLET_CLIENT2["WalletServiceClient\n(wallet debit)"]
    end

    subgraph InventoryServiceClients["inventory-service"]
        REDIS_ENGINE["RedisStockEngine\n(Redlock distributed locks)"]
    end

    ORDER_SVC["order-service"] --> AUTH_CLIENT & USER_CLIENT & LOG_CLIENT & WAL_CLIENT
    PAY_SVC["payment-service"] --> PESAPAL_ADAPTER & WALLET_CLIENT2
    INV_SVC["inventory-service"] --> REDIS_ENGINE

    style PESAPAL_ADAPTER fill:#4CAF50,color:#fff
    style REDIS_ENGINE fill:#DC382D,color:#fff
```

---

## 3. Shared Infrastructure Usage (Actual)

> Evidence: service `index.ts` files — which services start OutboxProcessor and SagaRecoveryWorker.

```mermaid
graph TB
    subgraph OutboxUsers["Services with OutboxProcessor.start()"]
        O1["order-service ✅"]
        O2["payment-service ✅"]
        O3["wallet-service ✅"]
        O4["payout-service ✅"]
        O5["catalog-service ✅"]
        O6["inventory-service ✅"]
        O7["community-service ✅"]
        O8["auth-service ✅\n(via OutboxRepository)"]
    end

    subgraph SagaRecoveryUsers["Services with SagaRecoveryWorker.start()"]
        S1["payment-service ✅\n(stuckThreshold: 5min\npollInterval: 60s)"]
        S2["wallet-service ✅\n(stuckThreshold: 5min\npollInterval: 60s)"]
    end

    subgraph RedisUsers["Services using Redis"]
        R1["auth-service\n(sessions, rate limits)"]
        R2["inventory-service\n(Redlock, reservation engine)"]
        R3["order-service\n(EventIdempotency)"]
        R4["payment-service\n(EventIdempotency)"]
        R5["logistics-service\n(rate limiting)"]
        R6["catalog-service\n(search cache)"]
    end

    subgraph SharedLibs["Shared Libraries (shared/)"]
        SL1["shared/events/eventBus.ts\n(EventBus singleton)"]
        SL2["shared/outbox/outboxPattern.ts\n(TransactionalOutbox)"]
        SL3["shared/outbox/outbox.processor.ts\n(OutboxProcessor)"]
        SL4["shared/saga/saga.orchestrator.ts\n(DistributedSagaOrchestrator)"]
        SL5["shared/saga/saga-recovery.worker.ts\n(SagaRecoveryWorker)"]
        SL6["shared/middleware/idempotency.ts\n(EventIdempotency)"]
        SL7["shared/middleware/auth-context.middleware.ts\n(attachAuthContext, requireAuth)"]
        SL8["shared/tracing/openTelemetry.ts\n(correlationMiddleware)"]
    end

    OutboxUsers --> SL2 & SL3
    SagaRecoveryUsers --> SL5
    OutboxUsers & SagaRecoveryUsers --> SL1
    RedisUsers --> SL6

    style SL1 fill:#9B59B6,color:#fff
    style SL2 fill:#E67E22,color:#fff
    style SL4 fill:#16A085,color:#fff
```

---

## 4. Auth Service — Actual Routes Mounted

> Evidence: `services/auth-service/index.ts` — fully merged module.

```mermaid
graph TB
    subgraph AuthModule["auth-service (fully merged module)"]
        subgraph AuthRoutes["/api/auth"]
            AR1["POST /register"]
            AR2["POST /login"]
            AR3["POST /logout"]
            AR4["POST /refresh"]
            AR5["GET /verify"]
            AR6["POST /forgot-password"]
            AR7["POST /reset-password"]
        end

        subgraph TwoFARoutes["/api/2fa"]
            TF1["POST /setup"]
            TF2["POST /verify-setup"]
            TF3["POST /verify-login"]
            TF4["POST /verify-backup"]
            TF5["POST /disable"]
            TF6["POST /regenerate-backup"]
            TF7["GET /status"]
        end

        subgraph SessionRoutes["/api/sessions"]
            SS1["GET / — list sessions"]
            SS2["DELETE /:id — revoke session"]
        end

        subgraph PhoneRoutes["/api/phone (NEW)"]
            PH1["POST /initiate\n(InitiatePhoneVerificationUseCase\n→ FirebaseAdminService)"]
            PH2["POST /verify\n(VerifyPhoneOtpUseCase\n→ FirebaseAdminService)"]
        end

        subgraph OAuthRoutes["/api/oauth"]
            OA1["GET /google — Google OAuth"]
            OA2["GET /google/callback"]
        end

        subgraph OtherRoutes["Other Routes"]
            OR1["/api/switch-role"]
            OR2["/api/otp-verification"]
            OR3["/api/role-request"]
            OR4["/api/admin (admin routes)"]
        end
    end

    style PhoneRoutes fill:#e3f2fd,stroke:#1565c0
    style PH1 fill:#2196F3,color:#fff
    style PH2 fill:#2196F3,color:#fff
```

---

## 5. Catalog Service — Actual Routes Mounted

> Evidence: `services/catalog-service/index.ts` — merged module (includes campaigns + pricing).

```mermaid
graph TB
    subgraph CatalogModule["catalog-service (merged: catalog + campaigns + pricing)"]
        subgraph ProductRoutes["/api/catalog/products"]
            P1["POST / — create product\n(CreateProductUseCase\nor CreateProductWithMatchingUseCase)"]
            P2["GET / — list products"]
            P3["GET /:id — get product"]
            P4["PUT /:id — update product\n(UpdateProductUseCase)"]
            P5["DELETE /:id — delete product\n(DeleteProductUseCase)"]
            P6["POST /:id/publish\n(PublishProductUseCase)"]
        end

        subgraph SearchRoutes["/api/catalog/search"]
            S1["GET / — search products\n(MeilisearchSearchService)"]
        end

        subgraph ReviewRoutes["/api/catalog/reviews (NEW)"]
            RV1["POST / — submit review\n(SubmitProductReviewUseCase)"]
            RV2["GET /:productId — get reviews\n(GetProductReviewsUseCase)"]
            RV3["PUT /:reviewId/moderate\n(ModerateReviewUseCase)"]
        end

        subgraph BuyBoxRoutes["/api/catalog/buy-box"]
            BB1["POST /compute\n(ComputeBuyBoxUseCase)"]
            BB2["GET /:productId"]
        end

        subgraph MatchingRoutes["/api/catalog/matching"]
            M1["POST / — match product\n(MatchProductUseCase)"]
            M2["POST /confirm\n(ConfirmProductMatchUseCase)"]
        end

        subgraph CampaignRoutes["/api/catalog/campaigns"]
            CA1["Campaign CRUD routes"]
        end

        subgraph PricingRoutes["/api/catalog/pricing"]
            PR1["Pricing calculation routes"]
        end

        subgraph StorefrontRoutes["/api/catalog/storefront"]
            SF1["GET /:sellerId — seller storefront\n(SellerStorefrontController)"]
        end
    end

    style ReviewRoutes fill:#e8f5e9,stroke:#2e7d32
    style RV1 fill:#4CAF50,color:#fff
```

---

## 6. Chat Service — Routes and Dependencies

> Evidence: `services/chat-service/src/api/routes/chat.routes.ts`, `services/chat-service/index.ts`

```mermaid
graph TB
    subgraph ChatModule["chat-service"]
        subgraph ChatRoutes["/api/chat/v1"]
            CR1["POST /conversations — initiate"]
            CR2["GET /conversations — list"]
            CR3["GET /conversations/search — full-text"]
            CR4["GET /conversations/:id — detail"]
            CR5["PUT /conversations/:id/read — mark read"]
            CR6["POST|DELETE /conversations/:id/mute"]
            CR7["POST /conversations/:id/messages — send"]
            CR8["GET /conversations/:id/messages — history"]
            CR9["DELETE /conversations/:id/messages/:msgId"]
            CR10["POST /messages/:msgId/report"]
            CR11["POST /media/upload — image or voice note"]
            CR12["POST|DELETE /users/:userId/block"]
            CR13["GET|POST|DELETE /admin/blocklist/domains"]
        end

        subgraph WsRoute["WebSocket"]
            WS1["/ws?userId=<id>\nor x-user-id header"]
        end
    end

    subgraph ChatDeps["chat-service Dependencies"]
        D1["PostgreSQL\n(chat_* tables via Prisma)"]
        D2["Redis\n(presence, rate limits, pub/sub, blocklist)"]
        D3["MinIO / S3\n(chat-media bucket)"]
        D4["Meilisearch\n(chat_conversations index)"]
        D5["notification-service\n(push → SMS → email fallback)"]
        D6["catalog-service DB\n(product snapshot via shared Prisma)"]
        D7["order-service DB\n(order snapshot via shared Prisma)"]
        D8["EventBus\n(OrderDelivered, OrderCancelled\n→ auto-archive BUYER_COURIER)"]
    end

    ChatModule --> ChatDeps

    style D2 fill:#DC382D,color:#fff
    style D3 fill:#E67E22,color:#fff
    style D4 fill:#16A085,color:#fff
    style D8 fill:#9B59B6,color:#fff
```

### Redis Key Patterns

| Key | Type | TTL | Purpose |
|---|---|---|---|
| `chat:presence:{userId}` | String | 60s | Online/offline presence |
| `chat:ratelimit:conv:{userId}` | Counter | 3600s | 20 conversations/hr limit |
| `chat:ratelimit:msg:{userId}` | Counter | 3600s | 200 messages/hr limit |
| `chat:ratelimit:massmsg:{userId}:{hash}` | Counter | 300s | Mass-messaging detection |
| `chat:conv:{conversationId}` | Pub/Sub | — | Real-time message fan-out |
| `chat:blocklist:domains` | Set | — | Phishing domain blocklist |
| `chat:penaltyscore:{userId}` | String | 3600s | Elevated spam score penalty |
| `chat:freq:{userId}` | Counter | 300s | Message frequency (5-min window) |
