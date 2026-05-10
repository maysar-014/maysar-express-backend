# Maysar Express — Database Relationship Diagrams

> Each service owns its own isolated PostgreSQL schema. These diagrams show the key entity relationships within each domain.

---

## 1. Core Commerce ERD (Auth + User + Catalog)

```mermaid
erDiagram
    User {
        string id PK
        string publicCode UK
        string email UK
        string passwordHash
        enum role
        enum status
        string phoneNumber
        boolean isEmailVerified
        boolean isPhoneVerified
        boolean twoFactorEnabled
        datetime createdAt
    }

    Session {
        string id PK
        string userId FK
        string token UK
        string ipAddress
        datetime expiresAt
    }

    AuditLog {
        string id PK
        string userId FK
        string action
        string ipAddress
        boolean success
        datetime timestamp
    }

    User_TwoFactorAuth {
        string id PK
        string userId FK
        string method
        string secret
        boolean isEnabled
        datetime lastUsedAt
    }

    Category {
        string id PK
        string parentId FK
        string name
        string slug UK
        boolean isActive
        int displayOrder
    }

    Product {
        string id PK
        string sellerId
        string categoryId FK
        string title
        enum status
        string slug UK
        int qualityScore
        boolean codAccepted
        boolean enablerEnabled
        decimal enablerCommissionRate
    }

    ProductVariant {
        string id PK
        string productId FK
        string sku UK
        decimal price
        decimal compareAtPrice
        enum inventoryPolicy
        enum status
    }

    BuyBox {
        string id PK
        string productId UK
        string primarySellerId
        decimal primaryScore
        datetime lastComputedAt
    }

    Catalog_ProductReview {
        string id PK
        string productId
        string buyerId
        int rating
        string comment
        enum moderationStatus
    }

    User ||--o{ Session : "has"
    User ||--o{ AuditLog : "generates"
    User ||--o| User_TwoFactorAuth : "has"
    Category ||--o{ Category : "parent-child"
    Category ||--o{ Product : "contains"
    Product ||--o{ ProductVariant : "has"
    Product ||--o| BuyBox : "has"
    Product ||--o{ Catalog_ProductReview : "receives"
```

---

## 2. Order & Checkout ERD

```mermaid
erDiagram
    Checkout_Cart {
        string id PK
        string userId
        string status
        datetime expiresAt
    }

    Checkout_CartItem {
        string id PK
        string cartId FK
        string productId
        string variantId
        int quantity
        decimal priceAtTime
    }

    Checkout_CheckoutSession {
        string id PK
        string cartId
        string userId
        string enablerId
        string enablerCode
        string status
        decimal subtotal
        decimal shippingCost
        decimal taxAmount
        decimal discountAmount
        decimal totalAmount
        string paymentStatus
    }

    Checkout_Order {
        string id PK
        string checkoutSessionId
        string userId
        string status
        decimal subtotal
        decimal totalAmount
        string paymentStatus
        string trackingNumber
    }

    Checkout_OrderItem {
        string id PK
        string orderId FK
        string productId
        string variantId
        int quantity
        decimal unitPrice
        decimal totalPrice
    }

    Checkout_InventoryReservation {
        string id PK
        string checkoutId
        string productId
        string variantId
        int quantity
        string status
        datetime expiresAt
    }

    Checkout_Cart ||--o{ Checkout_CartItem : "contains"
    Checkout_Cart ||--o| Checkout_CheckoutSession : "becomes"
    Checkout_CheckoutSession ||--o| Checkout_Order : "creates"
    Checkout_Order ||--o{ Checkout_OrderItem : "has"
    Checkout_CheckoutSession ||--o{ Checkout_InventoryReservation : "holds"
```

---

## 3. Payment & Wallet ERD

```mermaid
erDiagram
    Payment_Payment {
        string id PK
        string orderId
        string userId
        decimal amount
        string currency
        enum status
        enum method
        string gatewayRef
        int version
        datetime createdAt
    }

    Payment_Refund {
        string id PK
        string paymentId FK
        decimal amount
        string reason
        enum status
        datetime processedAt
    }

    Wallet_Wallet {
        string id PK
        string userId UK
        string userType
        decimal balance
        decimal heldBalance
        string currency
        int version
    }

    Wallet_Transaction {
        string id PK
        string walletId FK
        enum type
        decimal amount
        string referenceId
        string referenceType
        string description
        enum status
    }

    Wallet_CODCommitment {
        string id PK
        string walletId FK
        string orderId
        decimal amount
        enum status
        datetime expiresAt
    }

    CommissionPayout {
        string id PK
        string recipientId
        string recipientType
        decimal amount
        enum status
        datetime scheduledDate
        datetime processedDate
    }

    Commission {
        string id PK
        string orderId
        string sellerId
        decimal amount
        decimal rate
        enum type
        enum status
        string payoutId FK
    }

    Payment_Payment ||--o{ Payment_Refund : "has"
    Wallet_Wallet ||--o{ Wallet_Transaction : "records"
    Wallet_Wallet ||--o{ Wallet_CODCommitment : "holds"
    Commission ||--o| CommissionPayout : "settled via"
```

---

## 4. Inventory & Logistics ERD

```mermaid
erDiagram
    Inventory_Warehouse {
        string id PK
        string code UK
        string name
        enum type
        enum status
        json address
    }

    Inventory_StockItem {
        string id PK
        string productVariantId
        string warehouseId FK
        string sku UK
        int quantityAvailable
        int quantityReserved
        int reorderPoint
        int version
        enum status
    }

    Inventory_Reservation {
        string id PK
        string orderId
        string orderItemId
        string productVariantId
        string warehouseId FK
        int quantityReserved
        enum status
        datetime expiresAt
    }

    Inventory_InventoryMovement {
        string id PK
        string productVariantId
        string warehouseId FK
        enum movementType
        int quantity
        string referenceType
        string referenceId
    }

    Logistics_Courier {
        string id PK
        string name
        string phone UK
        string email UK
        enum status
        string vehicleType
        float currentLatitude
        float currentLongitude
        float onTimeDeliveryRate
        float customerRating
        int completedDeliveries
    }

    Logistics_Delivery {
        string id PK
        string orderId
        string courierId FK
        string status
        string trackingNumber UK
        boolean isCOD
        decimal codAmount
        boolean codCollected
        boolean codOtpVerified
        datetime actualDeliveryTime
    }

    Logistics_Earning {
        string id PK
        string courierId FK
        decimal amount
        string deliveryId
        enum status
    }

    Inventory_Warehouse ||--o{ Inventory_StockItem : "stores"
    Inventory_Warehouse ||--o{ Inventory_Reservation : "holds"
    Inventory_Warehouse ||--o{ Inventory_InventoryMovement : "tracks"
    Inventory_StockItem ||--o{ Inventory_Reservation : "reserved by"
    Logistics_Courier ||--o{ Logistics_Delivery : "handles"
    Logistics_Courier ||--o{ Logistics_Earning : "earns"
```

---

## 5. Business Registry & Compliance ERD

```mermaid
erDiagram
    Business {
        string id PK
        string name
        enum businessType
        string registrationNumber UK
        string taxId UK
        enum status
        enum verificationStatus
        enum complianceStatus
        string ownerId
    }

    BusinessAddress {
        string id PK
        string businessId FK
        enum type
        string street
        string city
        string region
        string country
        boolean isPrimary
    }

    BusinessDocument {
        string id PK
        string businessId FK
        enum type
        string fileName
        string fileUrl
        enum status
    }

    BusinessRegistry_ComplianceRecord {
        string id PK
        string businessId FK
        enum type
        enum status
        datetime checkedAt
        datetime expiresAt
    }

    Compliance_KYCRecord {
        string id PK
        string userId
        enum verificationStatus
        datetime submittedAt
        datetime verifiedAt
        enum riskLevel
    }

    Compliance_AMLRecord {
        string id PK
        string userId UK
        string sanctionsStatus
        boolean pepStatus
        float riskScore
        datetime lastCheckAt
    }

    Compliance_TRARecord {
        string id PK
        string userId
        string tin UK
        string taxComplianceStatus
    }

    Business ||--o{ BusinessAddress : "has"
    Business ||--o{ BusinessDocument : "submits"
    Business ||--o{ BusinessRegistry_ComplianceRecord : "has"
```

---

## 6. Commission & Enabler ERD

```mermaid
erDiagram
    Commission {
        string id PK
        string orderId
        string sellerId
        decimal amount
        decimal rate
        enum type
        enum status
        string payoutId
    }

    Commission_Referral {
        string id PK
        string referrerId
        string refereeId
        string referralCode UK
        enum status
        decimal rewardAmount
        boolean rewardPaid
    }

    Commission_Reward {
        string id PK
        string userId
        enum type
        decimal amount
        enum status
        datetime expiresAt
    }

    CommissionPayout {
        string id PK
        string recipientId
        string recipientType
        decimal amount
        enum status
        datetime scheduledDate
    }

    Checkout_CheckoutSession {
        string id PK
        string enablerId
        string enablerCode
        decimal totalAmount
    }

    Commission ||--o| CommissionPayout : "paid via"
    Commission_Referral ||--o{ Commission_Reward : "generates"
    Checkout_CheckoutSession ||--o{ Commission : "triggers"
```
