# Requirements Document

## Introduction

This feature introduces a **seller stock verification step** into the order lifecycle on Maysar Express. Before any buyer payment (wallet debit, COD commitment, or mobile-money charge) is processed, the seller must confirm that all ordered items are available. The verification window is 30 minutes from order placement. If the seller confirms within the deadline, the buyer is notified and proceeds to their appropriate checkout path (COD commitment or full payment). If the seller does not confirm within 30 minutes, the order is escalated to an administrator who may approve, cancel, or hold the order pending clarification. All administrative actions are recorded in the order's audit history. Administrators retain full operational control over every order at every stage.

The system is a TypeScript monolith with in-process service calls and a shared PostgreSQL database via Prisma. The order service is the source of truth for order lifecycle. Notifications are delivered via the existing notification service (in-process event bus). Scheduled jobs (e.g., the overdue-detection timer) run as in-process workers. There is no separate verification microservice; all new logic lives inside or adjacent to the order service, consistent with the existing domain-driven layering.

---

## Glossary

- **Order_Service**: The in-process module that owns the order lifecycle, persists orders, and publishes domain events. Source of truth for all order states.
- **Verification_Timer**: An in-process scheduled job (or lightweight polling worker) that detects orders whose `verificationDeadlineAt` has passed without seller confirmation.
- **Notification_Service**: The in-process notification module that sends email, SMS, and push messages to buyers, sellers, and administrators.
- **Admin**: A platform operator with the role `admin`. Has full override authority over the order lifecycle.
- **Seller**: A marketplace participant with the role `seller`. Responsible for confirming stock availability before buyer payment proceeds.
- **Buyer**: A marketplace participant with the role `buyer`. Initiates the order and proceeds to checkout only after seller verification.
- **Order_History**: An append-only log of state changes and administrative actions associated with an order, stored in the `order_VerificationAuditLog` table.
- **Verification_Deadline**: A UTC timestamp exactly 30 minutes after order creation, representing the latest time by which the seller must confirm stock.
- **COD_Order**: An order with `paymentMethod = 'COD'` (Cash on Delivery). After seller verification the buyer confirms delivery commitment rather than prepaying.
- **Non_COD_Order**: An order with `paymentMethod` of `'WALLET'`, `'CARD'`, or `'MOBILE_PAYMENT'`. After seller verification the buyer completes full payment via the existing payment workflow.
- **Admin_Override**: A privileged action taken by an Admin that bypasses automated workflow rules and is recorded in Order_History.

---

## Requirements

---

### Requirement 1: Order Creation in Pending Seller Verification State

**User Story:** As a buyer, I want my order to be created immediately when I submit it, so that I receive confirmation that the system has received my request even before the seller confirms stock.

#### Acceptance Criteria

1. WHEN a buyer submits an order, THE Order_Service SHALL create the order with status `PENDING_SELLER_VERIFICATION` instead of the previous default `pending` status.
2. WHEN the Order_Service creates an order in `PENDING_SELLER_VERIFICATION` status, THE Order_Service SHALL record a `verificationDeadlineAt` timestamp equal to the order creation time plus 30 minutes.
3. WHEN the Order_Service creates an order in `PENDING_SELLER_VERIFICATION` status, THE Order_Service SHALL NOT debit the buyer's wallet, place a COD commitment hold, or initiate any payment flow.
4. WHEN the Order_Service creates an order in `PENDING_SELLER_VERIFICATION` status, THE Order_Service SHALL append an entry to Order_History recording the status transition, the actor (`system`), and the UTC timestamp.
5. THE Order_Service SHALL return the new order's `id`, `status`, `verificationDeadlineAt`, and `trackingNumber` in the order creation response.

---

### Requirement 2: Seller Notification on New Order

**User Story:** As a seller, I want to be immediately notified when a buyer places an order that requires my stock confirmation, so that I can act within the allotted time.

#### Acceptance Criteria

1. WHEN the Order_Service creates an order in `PENDING_SELLER_VERIFICATION` status, THE Notification_Service SHALL send a stock-verification request notification to the seller identified by `sellerId` on the order.
2. WHEN the Notification_Service sends the stock-verification request, THE Notification_Service SHALL include the order `id`, the list of ordered items with quantities, and the `verificationDeadlineAt` timestamp in the notification payload.
3. IF the Notification_Service fails to deliver the seller notification, THEN THE Order_Service SHALL log the delivery failure and SHALL NOT alter the order status or verification deadline.

---

### Requirement 3: Seller Stock Confirmation

**User Story:** As a seller, I want to confirm that all ordered items are available within the verification window, so that the buyer can proceed to payment.

#### Acceptance Criteria

1. WHEN a seller submits a stock confirmation for an order in `PENDING_SELLER_VERIFICATION` status before `verificationDeadlineAt`, THE Order_Service SHALL transition the order status to `SELLER_VERIFIED`.
2. WHEN the Order_Service transitions an order to `SELLER_VERIFIED`, THE Order_Service SHALL append an entry to Order_History recording the status transition, the actor (`seller`), the `sellerId`, and the UTC timestamp.
3. IF a seller attempts to confirm stock on an order whose status is not `PENDING_SELLER_VERIFICATION`, THEN THE Order_Service SHALL return an error indicating the confirmation is not valid for the current order state.
4. IF a seller attempts to confirm stock after `verificationDeadlineAt`, THEN THE Order_Service SHALL return an error indicating the verification window has expired.
5. WHERE a seller decline action is supported, THE Order_Service SHALL transition the order status to `SELLER_DECLINED`, append an Order_History entry, and notify the buyer that the order could not be fulfilled.

---

### Requirement 4: Buyer Notification on Seller Verification

**User Story:** As a buyer, I want to be notified when the seller has confirmed my order, so that I know I can proceed to payment or delivery commitment.

#### Acceptance Criteria

1. WHEN the Order_Service transitions an order to `SELLER_VERIFIED`, THE Notification_Service SHALL send a verified-order notification to the buyer identified by `buyerId` on the order.
2. WHEN the Notification_Service sends the verified-order notification, THE Notification_Service SHALL include the order `id`, the `sellerId`, and the `verificationDeadlineAt` (for buyer context) in the notification payload.
3. WHEN the Order_Service transitions an order to `SELLER_VERIFIED`, THE Order_Service SHALL expose an endpoint or flag indicating that the buyer may now proceed to checkout.

---

### Requirement 5: Buyer Checkout After Verification — COD Path

**User Story:** As a buyer who chose Cash on Delivery, I want to confirm my commitment to receive the order after the seller verifies stock, so that fulfillment and delivery can begin.

#### Acceptance Criteria

1. WHILE an order has status `SELLER_VERIFIED` and `paymentMethod` is `COD`, THE Order_Service SHALL accept a buyer checkout-confirmation request.
2. WHEN a buyer submits a checkout confirmation for a `SELLER_VERIFIED` COD order, THE Order_Service SHALL run the existing COD eligibility checks, place the COD commitment hold on the buyer's wallet, and transition the order to `CONFIRMED`.
3. WHEN the Order_Service transitions a COD order to `CONFIRMED` after buyer checkout confirmation, THE Order_Service SHALL append an entry to Order_History recording the actor (`buyer`), the `buyerId`, and the UTC timestamp.
4. IF a buyer attempts to confirm checkout on an order whose status is not `SELLER_VERIFIED`, THEN THE Order_Service SHALL return an error indicating the action is not permitted in the current order state.

---

### Requirement 6: Buyer Checkout After Verification — Non-COD Path

**User Story:** As a buyer who chose a prepaid payment method, I want to complete full payment after the seller verifies stock, so that my order can proceed to fulfillment.

#### Acceptance Criteria

1. WHILE an order has status `SELLER_VERIFIED` and `paymentMethod` is one of `WALLET`, `CARD`, or `MOBILE_PAYMENT`, THE Order_Service SHALL accept a buyer payment request.
2. WHEN a buyer submits payment for a `SELLER_VERIFIED` non-COD order, THE Order_Service SHALL execute the existing payment workflow (wallet debit, card charge, or mobile-money initiation) and, upon payment success, transition the order to `CONFIRMED`.
3. WHEN the Order_Service transitions a non-COD order to `CONFIRMED` after payment, THE Order_Service SHALL append an entry to Order_History recording the payment method, the actor (`buyer`), the `buyerId`, and the UTC timestamp.
4. IF the payment step fails for a `SELLER_VERIFIED` non-COD order, THEN THE Order_Service SHALL keep the order in `SELLER_VERIFIED` status and return a payment-failure error to the caller without altering Order_History with a confirmed entry.

---

### Requirement 7: Verification Timeout Detection

**User Story:** As a platform operator, I want the system to automatically detect when a seller has not confirmed stock within 30 minutes, so that overdue orders are escalated promptly without manual monitoring.

#### Acceptance Criteria

1. THE Verification_Timer SHALL poll for orders in `PENDING_SELLER_VERIFICATION` status whose `verificationDeadlineAt` has passed.
2. WHEN the Verification_Timer detects an overdue order, THE Order_Service SHALL transition the order status to `VERIFICATION_OVERDUE`.
3. WHEN the Order_Service transitions an order to `VERIFICATION_OVERDUE`, THE Order_Service SHALL append an entry to Order_History recording the actor (`system`), the automated trigger, and the UTC timestamp.
4. WHEN the Order_Service transitions an order to `VERIFICATION_OVERDUE`, THE Order_Service SHALL NOT initiate any payment charge or hold on the buyer's account.
5. THE Verification_Timer SHALL process overdue orders with a polling interval no greater than 5 minutes to ensure escalation occurs within 35 minutes of order placement.

---

### Requirement 8: Administrator Notification on Overdue Verification

**User Story:** As an administrator, I want to be notified immediately when a seller fails to confirm stock on time, so that I can intervene and protect the buyer's experience.

#### Acceptance Criteria

1. WHEN the Order_Service transitions an order to `VERIFICATION_OVERDUE`, THE Notification_Service SHALL send an overdue-verification notification to all users with the `admin` role.
2. WHEN the Notification_Service sends the overdue-verification notification, THE Notification_Service SHALL include the order `id`, `sellerId`, `buyerId`, `verificationDeadlineAt`, and the elapsed overdue duration in the notification payload.
3. IF the Notification_Service fails to deliver the admin notification, THEN THE Order_Service SHALL log the delivery failure and SHALL NOT alter the order status.

---

### Requirement 9: Buyer Blocked from Checkout on Overdue Orders

**User Story:** As a platform operator, I want buyers to be prevented from paying for orders that are in an overdue verification state, so that buyers are not charged for orders that may not be fulfilled.

#### Acceptance Criteria

1. WHILE an order has status `VERIFICATION_OVERDUE`, THE Order_Service SHALL reject any buyer payment or checkout-confirmation request with an error indicating that payment is not available until administrator resolution.
2. WHEN the Order_Service rejects a checkout request due to `VERIFICATION_OVERDUE` status, THE Order_Service SHALL return a structured error response including the order `id` and the current status.

---

### Requirement 10: Administrator Order Management

**User Story:** As an administrator, I want to approve, cancel, or hold overdue orders after reviewing seller availability, so that I can protect buyers while giving sellers a fair chance to fulfil late.

#### Acceptance Criteria

1. WHEN an Admin approves a `VERIFICATION_OVERDUE` order, THE Order_Service SHALL transition the order status to `SELLER_VERIFIED` and allow the buyer to proceed to checkout.
2. WHEN an Admin cancels a `VERIFICATION_OVERDUE` order, THE Order_Service SHALL transition the order status to `CANCELLED`, append an Order_History entry recording the Admin's `adminId`, the reason, and the UTC timestamp.
3. WHEN an Admin places a `VERIFICATION_OVERDUE` order under review, THE Order_Service SHALL transition the order status to `UNDER_ADMIN_REVIEW` and append an Order_History entry.
4. WHEN an Admin approves or cancels an order in `UNDER_ADMIN_REVIEW` status, THE Order_Service SHALL apply the same status transitions and Order_History entries as Acceptance Criteria 1 and 2 above.
5. IF an Admin attempts a status transition that is not valid for the order's current status, THEN THE Order_Service SHALL return an error listing the allowed transitions for that status.
6. WHEN an Admin performs any action on an order, THE Order_Service SHALL append an entry to Order_History recording the `adminId`, the action type, any free-text notes supplied, and the UTC timestamp.

---

### Requirement 11: Administrator Override Authority

**User Story:** As an administrator, I want to override any order status at any lifecycle stage, so that I can resolve exceptional situations that fall outside the automated workflow.

#### Acceptance Criteria

1. THE Order_Service SHALL expose an admin-only override endpoint that accepts a target `status`, a mandatory `reason` string, and an optional `notes` field.
2. WHEN an Admin submits a valid status override, THE Order_Service SHALL update the order status and append an Order_History entry of type `ADMIN_OVERRIDE` including the previous status, the new status, the `adminId`, the `reason`, and the UTC timestamp.
3. IF an Admin submits an override with an empty or missing `reason`, THEN THE Order_Service SHALL reject the request with a validation error.

---

### Requirement 12: Administrator Monitoring Dashboard Data

**User Story:** As an administrator, I want API endpoints that surface all verification-related order data, so that I can build or use a dashboard showing pending verifications, overdue orders, and order timelines.

#### Acceptance Criteria

1. THE Order_Service SHALL expose an admin-only endpoint returning all orders currently in `PENDING_SELLER_VERIFICATION` status, including `verificationDeadlineAt` and time remaining.
2. THE Order_Service SHALL expose an admin-only endpoint returning all orders currently in `VERIFICATION_OVERDUE` status, including the duration overdue.
3. THE Order_Service SHALL expose an admin-only endpoint returning the full Order_History for a specified order `id`.
4. WHEN an Admin queries order history for a given order, THE Order_Service SHALL return entries sorted by timestamp in ascending order, including actor type, actor id, action, previous status, new status, and notes.

---

### Requirement 13: Order History Integrity

**User Story:** As a platform operator, I want every status transition and administrative action to be permanently recorded, so that I can audit the full lifecycle of any order.

#### Acceptance Criteria

1. THE Order_Service SHALL append to Order_History on every status transition, including transitions triggered by the buyer, the seller, the system (Verification_Timer), and admins.
2. THE Order_Service SHALL store Order_History entries as immutable records; existing entries SHALL NOT be updated or deleted.
3. FOR ALL valid sequences of order transitions, the Order_History record count SHALL be non-decreasing (round-trip property: appending always increases or maintains count, never decreases).
4. WHEN a new Order_History entry is written within the same database transaction as an order status update, THE Order_Service SHALL ensure both writes succeed atomically or both are rolled back.

---

### Requirement 14: Verification Time Limit Configuration

**User Story:** As a platform operator, I want the verification window duration to be configurable via system settings, so that operational policy changes do not require code deployments.

#### Acceptance Criteria

1. WHERE system settings include a `seller_verification_timeout_minutes` parameter, THE Order_Service SHALL use that value as the verification window duration.
2. WHEN the `seller_verification_timeout_minutes` setting is absent or invalid, THE Order_Service SHALL default to 30 minutes.
3. THE Order_Service SHALL read the timeout configuration at order creation time so that orders already in flight are not affected by subsequent configuration changes.

---

### Requirement 15: Buyer Real-Time Status Visibility

**User Story:** As a buyer, I want to query my order status at any time and see an accurate, up-to-date state, so that I know what action I need to take next.

#### Acceptance Criteria

1. WHEN a buyer queries an order by `id`, THE Order_Service SHALL return the current `status`, the `verificationDeadlineAt`, and a `nextAction` hint indicating what the buyer should do next (e.g., `AWAIT_VERIFICATION`, `PROCEED_TO_CHECKOUT`, `CONTACT_SUPPORT`).
2. WHEN the order status is `PENDING_SELLER_VERIFICATION`, THE Order_Service SHALL include the `verificationDeadlineAt` and the remaining seconds until the deadline in the response.
3. WHEN the order status is `SELLER_VERIFIED`, THE Order_Service SHALL include a `checkoutAvailable: true` flag and the applicable checkout path (`COD_COMMITMENT` or `FULL_PAYMENT`) in the response.
4. WHEN the order status is `VERIFICATION_OVERDUE` or `UNDER_ADMIN_REVIEW`, THE Order_Service SHALL include a `checkoutAvailable: false` flag and a human-readable message explaining that the order is under review.
