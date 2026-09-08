# Maysar Express — Logistics & Escrow Flowcharts

> **Evidence-based** — built from reading actual source files.
> Sources: `services/logistics-service/src/domain/entities/delivery.entity.ts`, `services/logistics-service/src/api/routes/logistics.routes.ts`, `services/logistics-service/src/api/controllers/cod.controller.ts`, `events/CATALOG.md`

> **Scope note (2026-09):** sections 1–5 document the **legacy `Logistics_Delivery`** courier flow and the COD OTP loop, which remain live. Since the optimization-engine rollout the operational unit is the **`Logistics_DeliveryJob`** (`DJB-` ids) bundling `Logistics_Shipment`s; pricing/compensation run through the three-engine model; and **escrow-style settlement now reads the append-only `Logistics_LedgerEntry` ledger** ([`LOGISTICS_IMPLEMENTATION.md`](../logistics/LOGISTICS_IMPLEMENTATION.md) §7–§9). Section 6 documents that settlement lifecycle.

---

## 1. Delivery Status Transitions (Actual — from delivery.entity.ts)

```mermaid
stateDiagram-v2
    [*] --> pending : Delivery created

    pending --> assigned : assignCourier(courierId)\n[validates: status must be 'pending']
    assigned --> picked_up : markAsPickedUp()\n[validates: status must be 'assigned']
    picked_up --> in_transit : (status update)
    in_transit --> out_for_delivery : (status update)
    out_for_delivery --> delivered : (delivery confirmed)
    out_for_delivery --> failed : (delivery failed)

    pending --> cancelled : (order cancelled)
    assigned --> cancelled : (order cancelled)
    picked_up --> failed : (exception)

    delivered --> [*]
    failed --> [*]
    cancelled --> [*]

    note right of assigned
        timestamps.assigned = new Date()
        courierId set
    end note

    note right of picked_up
        timestamps.pickedUp = new Date()
    end note

    note right of delivered
        actualDeliveryTime = new Date()
        timestamps.delivered = new Date()
    end note
```

---

## 2. Logistics API Routes (Actual — from logistics.routes.ts)

```mermaid
graph TB
    subgraph V1Routes["Routes at /api/v1 (logistics.routes.ts)"]
        subgraph Deliveries["/deliveries"]
            D1["POST / — create delivery"]
            D2["GET / — list deliveries\n(filter: status, courierId, page, limit)"]
            D3["GET /:deliveryId — get delivery"]
            D4["PUT /:deliveryId/status — update status\n(assigned/picked_up/in_transit/delivered/cancelled)"]
        end

        subgraph Routes["/routes"]
            R1["POST /optimize — optimize route\n(deliveries[], startLocation, endLocation)"]
            R2["GET /:routeId/alternatives — route alternatives"]
            R3["PUT /:routeId/progress — update progress"]
        end

        subgraph Couriers["/couriers"]
            C1["GET /:courierId — get courier"]
            C2["PUT /:courierId/status — update courier status\n(online/offline/busy/delivering/returning...)"]
        end

        subgraph Tracking["/tracking"]
            T1["GET /:deliveryId/history — tracking history"]
            T2["POST /:deliveryId/location — update location"]
        end

        subgraph Analytics["/analytics"]
            A1["GET /performance — performance stats"]
            A2["GET /couriers/:courierId — courier analytics"]
        end

        subgraph Earnings["/earnings"]
            E1["POST / — record earnings"]
            E2["GET /couriers/:courierId — courier earnings"]
            E3["POST /calculate — calculate commissions"]
        end

        subgraph COD["/cod"]
            COD1["POST /:deliveryId/otp — generate OTP\n(sends to buyer)"]
            COD2["POST /:deliveryId/verify — verify OTP\n(requires: otp, location.lat, location.lng)"]
        end
    end

    style COD fill:#FF9800,color:#fff
    style COD1 fill:#FF9800,color:#fff
    style COD2 fill:#FF9800,color:#fff
```

---

## 3. COD OTP Verification (Actual — from cod.controller.ts)

```mermaid
flowchart TD
    COURIER["Courier at delivery address"] --> GEN_OTP["POST /api/v1/cod/:deliveryId/otp"]
    GEN_OTP --> INIT_UC["InitiateCODDeliveryUseCase\n.execute({ deliveryId })"]
    INIT_UC --> SEND_OTP["OTP generated\nSent to buyer via SMS"]
    SEND_OTP --> COURIER_WAIT["Courier waits for buyer\nto provide OTP + cash"]

    COURIER_WAIT --> VERIFY["POST /api/v1/cod/:deliveryId/verify\n{ otp, location: { lat, lng } }"]

    VERIFY --> VALIDATE{Required\nfields present?}
    VALIDATE -->|"Missing otp or\nlocation.lat/lng"| BAD_REQ["400 Bad Request\n'Missing required verification data\n(otp, lat, lng)'"]

    VALIDATE -->|"All present"| VERIFY_UC["VerifyCODDeliveryUseCase\n.execute({ deliveryId, otp, location })"]

    VERIFY_UC --> OTP_CHECK{OTP\nValid?}
    OTP_CHECK -->|"Valid"| SUCCESS["200 OK\nDelivery closed\nWallet commitment released\nCOD reputation updated\nCODVerified event published"]
    OTP_CHECK -->|"Invalid"| FAIL["Error response\n(404 if not found\n400 otherwise)"]

    style SUCCESS fill:#4CAF50,color:#fff
    style BAD_REQ fill:#F44336,color:#fff
    style FAIL fill:#F44336,color:#fff
```

---

## 4. Logistics Events (Actual — from events/CATALOG.md)

```mermaid
graph LR
    subgraph LogisticsEvents["Logistics Domain Events"]
        E1["logistics.pickup.assigned.v1\nProducer: logistics-service\nConsumers: courier-console, notification-service"]
        E2["logistics.pickup.completed.v1\nProducer: logistics-service\nConsumers: order-service, notification-service"]
        E3["logistics.delivery.attempted.v1\nProducer: logistics-service\nConsumers: order-service, notification-service"]
        E4["logistics.delivery.completed.v1\nProducer: logistics-service\nConsumers: order-service, commission-service, trust-service"]
    end

    subgraph OrderSagaFlow["Order Fulfillment Saga Commands"]
        CMD1["Delivery.Command.v1\n(published by OrderFulfillmentSaga\nStep 3: Delivery)"]
        CMD2["DeliverySuccess\n(triggers saga step completion)"]
    end

    CMD1 --> E1
    E4 --> CMD2

    style E4 fill:#4CAF50,color:#fff
    style CMD1 fill:#9B59B6,color:#fff
```

---

## 5. Route Optimization Request (Actual — from logistics.routes.ts validators)

```mermaid
flowchart TD
    REQ["POST /api/v1/routes/optimize"] --> VALIDATE["Joi Validation\n(validateJoiRequest)"]

    subgraph Schema["optimizeRouteBodySchema (Joi)"]
        DELIVERIES["deliveries[]\n- id: SYSTEM_ID_PATTERN required\n- address: non-blank string required\n- coordinates: { lat, lng } required"]
        START["startLocation (optional)\n{ lat, lng, address }"]
        END_LOC["endLocation (optional)\n{ lat, lng, address }"]
    end

    VALIDATE --> RouteCtrl["RouteController\n.optimizeRoute()"]
    RouteCtrl --> MAPS["Maps Service\n(Google Maps API)"]
    MAPS --> RESULT["Route alternatives\nwith ETA"]

    style VALIDATE fill:#FF9800,color:#fff
```

---

## 6. Settlement Lifecycle (Actual — ledger-only, Phase 3)

The **`Logistics_LedgerEntry`** table is an append-only accounting ledger. When a `DeliveryJob` completes, `RecordJobCompletionLedgerUseCase` writes the locked-price buyer charge, the carrier payable, Maysar's realized revenue, and (when post-confirmation optimization beat the plan) a `CONSOLIDATION_SAVING` attributed to Maysar. Settlement (`SettleDeliveryJobUseCase`) then reads **only the ledger** — it never re-derives amounts from current config.

```mermaid
sequenceDiagram
    participant Job as DeliveryJob<br/>(DJB-)
    participant UC as Completion Ledger Use Case
    participant Ledger as Logistics_LedgerEntry<br/>(append-only)

    Note over Job,UC: delivery completed
    UC->>UC: buyerPrice = locked FulfillmentCommitment (rule 6)
    UC->>Ledger: BUYER_LOGISTICS_CHARGE +buyerPrice (counterparty: buyer)
    UC->>Ledger: CARRIER_PAYABLE −driverCompensation (counterparty: driver)
    UC->>Ledger: MAYSAR_LOGISTICS_REVENUE +margin (≥ 0, else reject)
    alt actualCost < plannedFulfillmentCost
        UC->>Ledger: CONSOLIDATION_SAVING +saving (counterparty: MAYSAR)
    end

    participant Settle as SettleDeliveryJobUseCase
    Settle->>Ledger: findByDeliveryJobId()  (read-only)
    Settle-->>Settle: apply CostVariancePolicy to ADJUSTMENT entries:
    Note over Settle: CUSTOMER → recover only if covered by policy<br/>MAYSAR → absorbed (reduces Maysar revenue)<br/>SUPPLIER → deducted from supplier settlement
```

Adjustments are recorded immutably as `Logistics_CostAdjustment` and **mirrored as ledger `ADJUSTMENT` entries** (with `responsibleParty`/`adjustmentType` in metadata) by `RecordCostAdjustmentUseCase`, using the pure `resolveAttribution()` rules (`SUPPLIER_NOT_READY`, `CUSTOMER_UNREACHABLE`, `ROUTE_MISCALCULATED`, `DRIVER_DEVIATION`, `EXTERNAL_DELAY`).

Live-verified end-to-end by `scripts/verify-settlement.ts` (VERIFY: PASS).
