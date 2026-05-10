# Maysar Express — Database Relationship Diagrams

> **Evidence-based** — built directly from `prisma/schema.prisma` (3799 lines).
> Only models confirmed present in the schema are shown. No invented tables.

---

## 1. Auth & User Domain (from schema.prisma)

```mermaid
erDiagram
    User {
        string id PK
        string publicCode UK
        string email UK
        string passwordHash
        enum role "BUYER|SELLER|COURIER|SUPPLIER|ENABLER|SYSTEM|ADMIN"
        enum status "PENDING_VERIFICATION|ACTIVE|SUSPENDED|BANNED"
        string phoneNumber
        boolean isEmailVerified
        boolean isPhoneVerified
        boolean twoFactorEnabled
        string twoFactorSecret
        int failedLoginAttempts
        datetime lockoutUntil
        datetime lastLoginAt
        datetime passwordChangedAt
        datetime createdAt
        datetime updatedAt
    }

    Session {
        string id PK
        string userId FK
        string token UK
        string ipAddress
        string userAgent
        datetime expiresAt
        datetime createdAt
    }

    AuditLog {
        string id PK
        string userId FK
        string email
        string action
        string ipAddress
        string userAgent
        boolean success
        string reason
        json metadata
        datetime timestamp
    }

    User_TwoFactorAuth {
        string id PK
        string userId FK_UK
        string method
        string secret
        json backupCodes
        boolean isEnabled
        boolean isVerified
        string deviceName
        datetime lastUsedAt
    }

    Auth_PasswordResetToken {
        string id PK
        string userId FK
        string token UK
        datetime expiresAt
        boolean used
    }

    Auth_EmailVerificationToken {
        string id PK
        string userId FK
        string token UK
        datetime expiresAt
        boolean used
    }

    Auth_RoleRequest {
        string id PK
        string userId FK
        string requestedRole
        string status "PENDING|APPROVED|REJECTED"
        string justification
        datetime reviewedAt
        string reviewedBy
    }

    User ||--o{ Session : "has"
    User ||--o{ AuditLog : "generates"
    User ||--o| User_TwoFactorAuth : "has"
    User ||--o{ Auth_PasswordResetToken : "has"
    User ||--o{ Auth_EmailVerificationToken : "has"
    User ||--o{ Auth_RoleRequest : "has"
```

---

## 2. Catalog Domain (from schema.prisma)

```mermaid
erDiagram
    Category {
        string id PK
        string parentId FK
        string name
        string slug UK
        string description
        string imageUrl
        int displayOrder
        boolean isActive
        json seoMetadata
    }

    Product {
        string id PK
        string sellerId
        string categoryId FK
        string title
        string slug UK
        enum status "draft|active|inactive|archived"
        enum visibility "public|private|hidden"
        string brand
        string model
        string gtin
        string mpn
        string isbn
        string fingerprint
        int fingerprintVersion
        int qualityScore
        boolean enablerEnabled
        decimal enablerCommissionRate
        boolean codAccepted
        string condition "new|used|refurbished"
        string supplierLocationId FK
    }

    ProductVariant {
        string id PK
        string productId FK
        string sku UK
        string name
        decimal price
        decimal compareAtPrice
        decimal costPrice
        enum inventoryPolicy "deny|continue"
        decimal weight
        json dimensions
        json attributes
        json images
        enum status "active|inactive|archived"
    }

    BuyBox {
        string id PK
        string productId UK
        string primarySellerId
        decimal primaryScore
        datetime lastComputedAt
    }

    Catalog_BuyBoxAlternative {
        string id PK
        string buyBoxId FK
        string sellerId
        decimal score
        int rank
    }

    Catalog_ProductReview {
        string id PK
        string productId
        string buyerId
        int rating
        string comment
        enum moderationStatus "VISIBLE|HIDDEN|FLAGGED"
        datetime submittedAt
    }

    Catalog_ReviewModerationLog {
        string id PK
        string reviewId FK
        string adminId
        enum previousStatus
        enum newStatus
        datetime actionAt
    }

    CategoryAttribute {
        string id PK
        string categoryId FK
        string name
        string displayLabel
        enum type
        json options
        boolean isRequired
        int displayOrder
    }

    ProductAttribute {
        string id PK
        string productId FK
        string attributeId FK
        string value
    }

    Category ||--o{ Category : "parent-child"
    Category ||--o{ Product : "contains"
    Category ||--o{ CategoryAttribute : "defines"
    Product ||--o{ ProductVariant : "has"
    Product ||--o| BuyBox : "has"
    Product ||--o{ Catalog_ProductReview : "receives"
    Product ||--o{ ProductAttribute : "has"
    BuyBox ||--o{ Catalog_BuyBoxAlternative : "has"
    Catalog_ProductReview ||--o{ Catalog_ReviewModerationLog : "has"
    CategoryAttribute ||--o{ ProductAttribute : "used in"
```

---

## 3. Order & Checkout Domain (from schema.prisma)

```mermaid
erDiagram
    Checkout_Cart {
        string id PK
        string userId
        string status "active|abandoned|converted"
        datetime expiresAt "now() + 7 days"
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
        string status "initiated|..."
        decimal subtotal
        decimal shippingCost
        decimal taxAmount
        decimal discountAmount
        decimal totalAmount
        string paymentMethodId
        string paymentStatus
        json metadata
        datetime expiresAt "now() + 1 hour"
    }

    Checkout_Order {
        string id PK
        string checkoutSessionId
        string userId
        string status "pending|..."
        decimal subtotal
        decimal totalAmount
        string paymentStatus "pending|..."
        string trackingNumber
        json metadata
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

    Checkout_Cart ||--o{ Checkout_CartItem : "contains"
    Checkout_Cart ||--o| Checkout_CheckoutSession : "becomes"
    Checkout_CheckoutSession ||--o| Checkout_Order : "creates"
    Checkout_Order ||--o{ Checkout_OrderItem : "has"
```

---

## 4. Inventory Domain (from schema.prisma)

```mermaid
erDiagram
    Inventory_Warehouse {
        string id PK
        string code UK
        string name
        json address
        enum type
        enum status "active|inactive|maintenance"
        json capacity
        json operatingHours
    }

    Inventory_StockItem {
        string id PK
        string productVariantId
        string warehouseId FK
        string sku UK
        int quantityAvailable
        int quantityReserved
        int quantityDamaged
        int quantityOnOrder
        int reorderPoint
        int maxStock
        decimal unitCost
        enum status "active|inactive|discontinued"
        int version "optimistic locking"
    }

    Inventory_Reservation {
        string id PK
        string orderId
        string orderItemId
        string productVariantId
        string warehouseId FK
        int quantityReserved
        enum status "active|fulfilled|released|expired"
        datetime expiresAt
        datetime fulfilledAt
    }

    Inventory_InventoryMovement {
        string id PK
        string productVariantId
        string warehouseId FK
        enum movementType "IN|OUT|ADJUSTMENT|TRANSFER|DAMAGE|RETURN"
        int quantity
        string referenceType
        string referenceId
        string reason
        string performedBy
        decimal unitCost
    }

    Inventory_Warehouse ||--o{ Inventory_StockItem : "stores"
    Inventory_Warehouse ||--o{ Inventory_Reservation : "holds"
    Inventory_Warehouse ||--o{ Inventory_InventoryMovement : "tracks"
    Inventory_StockItem ||--o{ Inventory_Reservation : "reserved by"
    Inventory_StockItem ||--o{ Inventory_InventoryMovement : "moved in"
```

---

## 5. Logistics Domain (from schema.prisma)

```mermaid
erDiagram
    Logistics_Courier {
        string id PK
        string name
        string phone UK
        string email UK
        enum status "online|offline|busy|delivering|returning"
        string vehicleType
        string vehicleLicensePlate
        float vehicleCapacity
        float currentLatitude
        float currentLongitude
        float onTimeDeliveryRate
        float customerRating
        int completedDeliveries
        float totalEarnings
    }

    Logistics_Delivery {
        string id PK
        string orderId
        string courierId FK
        string status "pending|assigned|picked_up|in_transit|delivered|failed|cancelled"
        string trackingNumber UK
        string pickupStreet
        string pickupCity
        float pickupLatitude
        float pickupLongitude
        string deliveryStreet
        string deliveryCity
        float deliveryLatitude
        float deliveryLongitude
        float packageWeight
        float packageValue
        boolean packageFragile
        boolean isCOD
        decimal codAmount
        boolean codCollected
        boolean codOtpVerified
        float codProofGpsLat
        float codProofGpsLng
        datetime codProofTimestamp
        string buyerId
        string sellerId
        string codCommitmentHoldId
    }

    Logistics_LocationHistory {
        string id PK
        string courierId FK
        float latitude
        float longitude
        float accuracy
        datetime timestamp
    }

    Logistics_Courier ||--o{ Logistics_Delivery : "handles"
    Logistics_Courier ||--o{ Logistics_LocationHistory : "tracks"
```

---

## 6. Commission Domain (from schema.prisma)

```mermaid
erDiagram
    Commission {
        string id PK
        string orderId
        string sellerId
        decimal amount
        decimal rate
        enum type "seller|enabler|courier|referral|task_assignment|task_completion"
        enum status "pending|earned|paid|cancelled"
        datetime paidAt
        string payoutId FK
    }

    CommissionPayout {
        string id PK
        string recipientId
        string recipientType "seller|enabler|courier"
        decimal amount
        enum status "pending|processing|completed|failed"
        datetime scheduledDate
        datetime processedDate
        string reference
    }

    Commission_Referral {
        string id PK
        string referrerId
        string refereeId
        string referralCode UK
        enum status "pending|completed|expired|cancelled"
        decimal rewardAmount
        boolean rewardPaid
        datetime completedAt
        datetime expiresAt
    }

    Commission_Reward {
        string id PK
        string userId
        enum type
        decimal amount
        enum status "earned|redeemed|expired|cancelled"
        datetime expiresAt
        datetime redeemedAt
        string referenceId
    }

    Commission ||--o| CommissionPayout : "settled via"
    Commission_Referral ||--o{ Commission_Reward : "generates"
```

---

## 7. Business Registry & Compliance (from schema.prisma)

```mermaid
erDiagram
    Business {
        string id PK
        string name
        enum businessType
        string registrationNumber UK
        string taxId UK
        enum status "PENDING|ACTIVE|SUSPENDED|REJECTED|REVOKED"
        enum verificationStatus "UNVERIFIED|PENDING|VERIFIED|REJECTED"
        enum complianceStatus "UNDER_REVIEW|COMPLIANT|NON_COMPLIANT|SUSPENDED"
        string ownerId
        string[] industry
        datetime verifiedAt
        string verifiedBy
    }

    BusinessAddress {
        string id PK
        string businessId FK
        enum type "MAIN|BRANCH|WAREHOUSE|REGISTERED"
        string street
        string city
        string region
        string country "default: Tanzania"
        boolean isPrimary
    }

    BusinessDocument {
        string id PK
        string businessId FK
        enum type
        string fileName
        string fileUrl
        enum status "PENDING|APPROVED|REJECTED|EXPIRED"
    }

    Compliance_KYCRecord {
        string id PK
        string userId
        enum verificationStatus "pending|in_review|approved|rejected|expired"
        datetime submittedAt
        datetime verifiedAt
        string verifiedBy
        json documents
        string rejectionReason
        enum riskLevel "low|medium|high|critical"
    }

    Compliance_AMLRecord {
        string id PK
        string userId UK
        string sanctionsStatus "clear|flagged|blocked"
        boolean pepStatus
        float riskScore
        datetime lastCheckAt
        json flags
    }

    Compliance_TRARecord {
        string id PK
        string userId
        string tin UK
        string vrn
        string taxComplianceStatus
    }

    Business ||--o{ BusinessAddress : "has"
    Business ||--o{ BusinessDocument : "submits"
    Business ||--o{ BusinessRegistry_ComplianceRecord : "has"
```
