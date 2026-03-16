# Maysar User Identification and Enabler Attribution System

## 1. Purpose

This document defines the identification and attribution mechanisms used in the Maysar platform.
It establishes how **users are identified publicly** and how **product sales assisted by enablers are tracked and rewarded**.

The system is designed to ensure:

- secure user identification
- scalable platform architecture
- transparent sales attribution
- fair commission distribution for product promotion

Maysar separates **internal identities**, **public user identities**, and **enabler attribution mechanisms** to maintain security and operational clarity.

---

## 2. User Identification System

Every user registered on the Maysar platform is assigned two identifiers:

1. **Internal User ID**
2. **Public User Code**

These identifiers serve different purposes.

---

### 2.1 Internal User ID

The internal user ID is the system’s primary identifier used internally by the backend infrastructure.

Example format:

```
usr_<ULID>
```

Example:

```
usr_01HYZ4A9X6M8Q3C7K2J1P5R0T
```

#### Characteristics

- Globally unique
- Generated automatically by the system
- Used in database relations
- Never visible to regular users
- Never changes after creation

The internal ID is used for all system operations including:

- orders
- payments
- wallet transactions
- platform logs
- data relationships

---

### 2.2 Public User Code

The public user code is a human-friendly identifier used to reference users in platform interactions.

Example format:

```
MYS-XXXXXX
```

Example:

```
MYS-4F7K9A
```

#### Purpose

The public user code allows safe user identification in situations where internal IDs should not be exposed.

It may appear in:

- invoices
- receipts
- support requests
- dispute records
- order documentation

#### Rules

Public user codes must:

- be unique across the platform
- be automatically generated
- remain permanent
- be safe for public sharing

---

## 3. Enabler System

The Maysar platform introduces a specialized role called **Enabler**.

An enabler is a user who promotes or assists in selling products listed on the platform. When a buyer purchases a product through an enabler’s shared link, the system records the assistance and assigns a commission defined by the seller.

Unlike traditional referral systems, **not all users have referral capabilities**.

Only users designated as **enablers** receive an **Enabler Code**.

---

## 4. Enabler Code

### Definition

An Enabler Code is a unique identifier assigned to a user authorized to promote products and earn commission through assisted sales.

Example format:

```
ENB-XXXXXX
```

Example:

```
ENB-8F3K29
```

A shorter variant may also be used:

```
E8F3K29
```

---

### Purpose of Enabler Codes

Enabler codes allow the system to:

- track product promotion
- attribute assisted sales
- assign commissions to promoters
- enable sellers to expand their sales reach

This mechanism enables **distributed product promotion** across the platform.

---

## 5. Product Enabler Feature

Sellers may optionally enable enabler commissions for their products.

Each product can contain the following configuration:

```
enabler_enabled = true
commission_rate = 0.05
```

This means enablers will earn a percentage of the product price when their link leads to a completed purchase.

Example:

```
Product Price: 100,000 TZS
Commission Rate: 5%

Enabler Commission: 5,000 TZS
```

---

## 6. Enabler Product Links

Enablers promote products by sharing special links that contain their enabler code.

Example:

```
https://maysar.com/product/PRD-938420?enb=E8F3K29
```

Where:

```
enb = enabler code
```

When a buyer visits the product through this link, the system records the enabler reference.

---

## 7. Assisted Sale Attribution Process

The platform follows a structured process to record enabler assistance.

### Step 1 — Seller enables enabler support

The seller activates the enabler feature for a product and sets a commission rate.

---

### Step 2 — Enabler shares product link

The enabler distributes the product link containing their enabler code.

---

### Step 3 — Buyer accesses the link

The platform detects the enabler code and stores it temporarily for attribution.

---

### Step 4 — Buyer completes purchase

When an order is created, the system records the assisting enabler.

Example:

```
order.enabler_id = usr_enabler
```

---

### Step 5 — Commission calculation

The system calculates the commission based on the seller’s defined rate.

Example:

```
commission = product_price × commission_rate
```

---

### Step 6 — Commission distribution

The calculated commission is credited to the enabler’s wallet as a platform transaction.

Example transaction type:

```
ENABLER_COMMISSION
```

---

## 8. Security and Integrity Rules

To maintain fairness and prevent abuse, the following rules apply.

### Seller Authorization

Enabler commissions only apply when:

```
product.enabler_enabled = true
```

---

### Self-commission prevention

Users cannot earn commission on their own purchases.

```
if buyer_id == enabler_id → commission rejected
```

---

### Verified Enabler Requirement

Only users approved by the platform may receive enabler codes.

---

### Attribution Consistency

The system should maintain the first valid enabler attribution during the purchase session and prevent manipulation during checkout.

---

## 9. System Structure Summary

Each user in Maysar contains:

```
Internal User ID
Public User Code
```

Example:

```
Internal ID: usr_01HYZ4A9X6M8Q3C7K2J1P5R0T
User Code: MYS-4F7K9A
```

Only enablers contain an additional identifier:

```
Enabler Code
```

Example:

```
Enabler Code: E8F3K29
```

Product links may contain the enabler code:

```
https://maysar.com/product/PRD-938420?enb=E8F3K29
```

---

## 10. Benefits of the System

This architecture enables Maysar to achieve:

- secure user identification
- scalable data architecture
- transparent sales attribution
- decentralized product promotion
- fair commission distribution

It provides the foundation for a marketplace where users can actively participate in promoting products while sellers retain full control over commission policies.
