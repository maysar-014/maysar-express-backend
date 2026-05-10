# Maysar Express — Marketplace Flow Diagrams

> End-to-end flows for the multi-sided marketplace: product discovery, buy-box competition, order lifecycle, and multi-party coordination.

---

## 1. Product Discovery & Buy-Box Flow

```mermaid
flowchart TD
    BUYER["🛒 Buyer Searches"] --> SEARCH["Search Engine\n(MeiliSearch + Catalog)"]
    SEARCH --> RESULTS["Product Results\n(Ranked by relevance)"]
    RESULTS --> PDP["Product Detail Page"]

    PDP --> BUYBOX["Buy-Box Engine\nSelects Winner"]

    subgraph BuyBoxFactors["Buy-Box Scoring Factors"]
        PRICE["💰 Price Score\n(±5% of median)"]
        RATING["⭐ Seller Rating"]
        DELIVERY["🚚 Delivery Speed"]
        STOCK["📦 Stock Availability"]
        RECENCY["🆕 New Seller Boost"]
    end

    BuyBoxFactors --> BUYBOX
    BUYBOX --> WINNER["Buy-Box Winner\n(Primary Seller Shown)"]
    BUYBOX --> ALTS["Alternative Sellers\n(Ranked list)"]

    WINNER --> ADD_CART["Add to Cart\n(Winner's price & terms)"]
    ALTS --> COMPARE["Buyer Compares\nAlternatives"]
    COMPARE --> ADD_CART

    ADD_CART --> CHECKOUT["Checkout Flow"]

    style BUYBOX fill:#FF6B6B,color:#fff
    style WINNER fill:#4CAF50,color:#fff
    style BUYER fill:#2196F3,color:#fff
```

---

## 2. Full Order Lifecycle

```mermaid
stateDiagram-v2
    [*] --> CART_ACTIVE : Buyer adds items

    CART_ACTIVE --> CHECKOUT_INITIATED : Checkout started
    CHECKOUT_INITIATED --> STOCK_RESERVED : Inventory reserved
    STOCK_RESERVED --> ORDER_PENDING : Order created

    ORDER_PENDING --> PAYMENT_PROCESSING : Payment initiated
    PAYMENT_PROCESSING --> PAYMENT_FAILED : Gateway/fraud rejection
    PAYMENT_PROCESSING --> PAYMENT_COMPLETED : Payment success
    PAYMENT_PROCESSING --> COD_SCHEDULED : COD selected

    PAYMENT_FAILED --> STOCK_RELEASED : Compensation saga
    STOCK_RELEASED --> [*] : Order cancelled

    PAYMENT_COMPLETED --> ORDER_CONFIRMED : Order confirmed
    COD_SCHEDULED --> ORDER_CONFIRMED : COD commitment locked

    ORDER_CONFIRMED --> SHIPMENT_CREATED : Logistics assigned
    SHIPMENT_CREATED --> COURIER_ASSIGNED : Courier matched
    COURIER_ASSIGNED --> PICKUP_CONFIRMED : Courier picks up
    PICKUP_CONFIRMED --> IN_TRANSIT : En route
    IN_TRANSIT --> DELIVERED : Delivery confirmed

    DELIVERED --> COD_VERIFICATION : If COD order
    COD_VERIFICATION --> COD_VERIFIED : OTP confirmed
    COD_VERIFIED --> SETTLEMENT : Funds released

    DELIVERED --> SETTLEMENT : If prepaid
    SETTLEMENT --> COMMISSION_PAID : Platform fee deducted
    COMMISSION_PAID --> SELLER_PAID : Seller wallet credited
    SELLER_PAID --> [*] : Order complete

    ORDER_CONFIRMED --> CANCELLATION_REQUESTED : Buyer cancels
    CANCELLATION_REQUESTED --> REFUND_PROCESSING : Within cancel window
    REFUND_PROCESSING --> REFUNDED : Refund complete
    REFUNDED --> [*]
```

---

## 3. Multi-Party Marketplace Coordination

```mermaid
sequenceDiagram
    actor Buyer
    actor Seller
    actor Enabler
    actor Courier
    participant Platform as Maysar Platform
    participant Payment as Payment/Wallet
    participant Logistics as Logistics

    Note over Buyer,Logistics: Enabler-Assisted Purchase Flow

    Enabler->>Buyer: Share product link\n(with referral code)
    Buyer->>Platform: Browse & add to cart\n(enabler code tracked)
    Buyer->>Platform: Checkout & pay
    Platform->>Payment: Process payment
    Payment-->>Platform: Payment confirmed

    Platform->>Seller: Order notification
    Seller->>Platform: Confirm & prepare order
    Platform->>Logistics: Create shipment
    Logistics->>Courier: Assign delivery

    Courier->>Platform: Pickup confirmed
    Courier->>Buyer: Deliver order
    Buyer->>Courier: Provide OTP (COD)
    Courier->>Platform: Confirm delivery + OTP

    Platform->>Payment: Release funds
    Payment->>Seller: Credit seller wallet\n(minus 8% commission)
    Payment->>Enabler: Credit enabler wallet\n(15-20% commission)
    Payment->>Courier: Credit delivery earnings

    Platform->>Buyer: Delivery confirmation
    Platform->>Seller: Payout notification
    Platform->>Enabler: Commission notification
```

---

## 4. Catalog & Inventory Sync Flow

```mermaid
flowchart LR
    subgraph Seller["Seller Actions"]
        CREATE["Create Product\n(Title · Variants · Price)"]
        UPLOAD["Upload Images\n(AWS S3)"]
        PUBLISH["Publish Listing"]
    end

    subgraph Catalog["Catalog Service"]
        FINGERPRINT["Generate Product\nFingerprint\n(Dedup check)"]
        MATCH{Duplicate\nProduct?}
        NEW_PRODUCT["Create New Product\n(Unique catalog entry)"]
        LINK_VARIANT["Link as New Variant\n(Existing product)"]
        QUALITY["Quality Score\nCalculation"]
        BUYBOX_UPDATE["Update Buy-Box\nScores"]
        SEARCH_INDEX["Index in\nSearch Engine"]
    end

    subgraph Inventory["Inventory Service"]
        STOCK_ITEM["Create Stock Item\n(SKU · Warehouse)"]
        STOCK_LEVEL["Set Initial\nStock Level"]
        REORDER["Set Reorder\nPoint"]
    end

    CREATE --> FINGERPRINT
    UPLOAD --> CATALOG
    FINGERPRINT --> MATCH
    MATCH -->|No| NEW_PRODUCT
    MATCH -->|Yes| LINK_VARIANT
    NEW_PRODUCT & LINK_VARIANT --> QUALITY
    QUALITY --> BUYBOX_UPDATE
    QUALITY --> SEARCH_INDEX
    PUBLISH --> STOCK_ITEM
    STOCK_ITEM --> STOCK_LEVEL
    STOCK_LEVEL --> REORDER

    style FINGERPRINT fill:#FF9800,color:#fff
    style BUYBOX_UPDATE fill:#FF6B6B,color:#fff
```

---

## 5. Seller Storefront & Discovery

```mermaid
graph TB
    subgraph Discovery["Buyer Discovery Paths"]
        SEARCH["🔍 Search Bar"]
        CATEGORY["📂 Category Browse"]
        ENABLER_LINK["🔗 Enabler Referral Link"]
        FEATURED["⭐ Featured Products"]
    end

    subgraph Storefront["Seller Storefront"]
        PROFILE["Seller Profile\n(Rating · Reviews · Location)"]
        PRODUCTS["Product Listings\n(Buy-box ranked)"]
        CAMPAIGNS["Active Campaigns\n(Discounts · Bundles)"]
        REVIEWS["Customer Reviews\n(Moderated)"]
    end

    subgraph Conversion["Conversion Signals"]
        RATING["⭐ Seller Rating"]
        DELIVERY_TIME["🚚 Avg Delivery Time"]
        STOCK_STATUS["📦 In Stock / Low Stock"]
        COD_BADGE["💵 COD Accepted"]
        VERIFIED_BADGE["✅ Verified Business"]
    end

    Discovery --> Storefront
    Storefront --> Conversion
    Conversion --> ADD_CART["Add to Cart"]

    style ADD_CART fill:#4CAF50,color:#fff
```
