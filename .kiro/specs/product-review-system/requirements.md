# Requirements Document

## Introduction

This document defines the requirements for the Product Review and Rating System on the Maysar marketplace platform. The feature enables buyers who have completed a purchase to submit star ratings and optional written comments for products. Reviews are publicly visible on product pages, contribute to aggregate rating metrics returned with product data, and can be moderated by platform administrators. The system enforces purchase verification, prevents duplicate reviews, and blocks sellers from reviewing their own products.

---

## Glossary

- **Review_System**: The subsystem responsible for creating, storing, retrieving, and moderating product reviews and ratings.
- **Buyer**: A platform user with role `BUYER` (stored in `User_User`) who has placed at least one order.
- **Seller**: A platform user with role `SELLER` who listed the product being reviewed.
- **Product**: A catalog item identified by a unique `productId` in the `catalog_products` table.
- **Order**: A completed purchase record in `Order_Order` linking a `buyerId` to one or more `Order_OrderItem` entries containing a `productId`.
- **Review**: A record containing a `rating`, an optional `comment`, the `buyerId`, the `productId`, a `displayName`, and a `submittedAt` timestamp.
- **Rating**: An integer value in the inclusive range [1, 5] representing the buyer's satisfaction score.
- **Average_Rating**: The arithmetic mean of all non-hidden ratings for a product, rounded to two decimal places.
- **Review_Count**: The total number of non-hidden reviews for a product.
- **Moderation_Status**: An enumerated state of a review: `VISIBLE`, `FLAGGED`, or `HIDDEN`.
- **Display_Name**: The reviewer's public name, derived from `User_User.firstName` and `User_User.lastName`; falls back to a masked email prefix when both are absent.
- **Admin**: A platform user with role `ADMIN` who has authority to moderate reviews.
- **Pagination**: A mechanism for splitting a list of reviews into fixed-size pages identified by `page` (1-indexed) and `limit` parameters.

---

## Requirements

### Requirement 1: Submit a Product Review

**User Story:** As a buyer, I want to submit a star rating and an optional comment for a product I have purchased, so that I can share my experience with other shoppers.

#### Acceptance Criteria

1. WHEN a buyer submits a review for a product, THE Review_System SHALL accept a `rating` value only when it is an integer in the inclusive range [1, 5].
2. IF a buyer submits a review with a `rating` outside the range [1, 5], THEN THE Review_System SHALL reject the request with an HTTP 422 status and a descriptive validation error.
3. WHEN a buyer submits a review, THE Review_System SHALL accept an optional `comment` field of up to 2000 characters.
4. IF a buyer submits a review with a `comment` exceeding 2000 characters, THEN THE Review_System SHALL reject the request with an HTTP 422 status and a descriptive validation error.
5. WHEN a valid review is submitted, THE Review_System SHALL persist the review with `Moderation_Status` set to `VISIBLE` and record the `submittedAt` timestamp as the current UTC time.
6. WHEN a valid review is submitted, THE Review_System SHALL return the created review resource with HTTP 201.

---

### Requirement 2: Purchase Verification

**User Story:** As a platform operator, I want only buyers who have completed a purchase to leave reviews, so that reviews reflect genuine product experiences.

#### Acceptance Criteria

1. WHEN a buyer attempts to submit a review for a product, THE Review_System SHALL verify that at least one `Order_Order` record exists where `buyerId` matches the authenticated user's id, `status` is `DELIVERED`, and the order contains an `Order_OrderItem` with the target `productId`.
2. IF no qualifying completed order exists for the buyer and product, THEN THE Review_System SHALL reject the request with HTTP 403 and error code `REVIEW_PURCHASE_REQUIRED`.
3. WHILE a buyer's order for a product has a status other than `DELIVERED`, THE Review_System SHALL reject any review submission for that product with HTTP 403 and error code `REVIEW_PURCHASE_REQUIRED`.

---

### Requirement 3: One Review Per Buyer Per Product

**User Story:** As a platform operator, I want each buyer to submit at most one review per product, so that ratings are not inflated by duplicate submissions.

#### Acceptance Criteria

1. WHEN a buyer submits a review for a product, THE Review_System SHALL check whether a review already exists for that `buyerId` and `productId` combination.
2. IF a review already exists for the same `buyerId` and `productId`, THEN THE Review_System SHALL reject the request with HTTP 409 and error code `REVIEW_ALREADY_EXISTS`.
3. THE Review_System SHALL enforce a unique constraint on the (`buyerId`, `productId`) pair at the database level to prevent race-condition duplicates.

---

### Requirement 4: Seller Self-Review Prevention

**User Story:** As a platform operator, I want to prevent sellers from reviewing their own products, so that ratings remain unbiased.

#### Acceptance Criteria

1. WHEN a user attempts to submit a review, THE Review_System SHALL retrieve the `sellerId` of the target product from the `catalog_products` table.
2. IF the authenticated user's id matches the product's `sellerId`, THEN THE Review_System SHALL reject the request with HTTP 403 and error code `REVIEW_SELLER_PROHIBITED`.
3. THE Review_System SHALL apply the seller self-review check before the purchase verification check so that sellers receive a consistent rejection regardless of order history.

---

### Requirement 5: Public Review Listing

**User Story:** As a shopper, I want to read reviews for a product on its product page, so that I can make an informed purchase decision.

#### Acceptance Criteria

1. WHEN a request is made to list reviews for a product, THE Review_System SHALL return only reviews with `Moderation_Status` equal to `VISIBLE`.
2. WHEN returning a review, THE Review_System SHALL include the `rating`, `comment` (if present), `displayName`, `submittedAt`, and the review `id`.
3. THE Review_System SHALL return reviews ordered by `submittedAt` descending by default.
4. WHERE a `sortBy=rating` query parameter is provided, THE Review_System SHALL return reviews ordered by `rating` descending.

---

### Requirement 6: Aggregate Rating on Product Fetch

**User Story:** As a shopper, I want to see the average star rating and total review count on a product listing, so that I can quickly assess product quality.

#### Acceptance Criteria

1. WHEN a product is fetched by id or returned in a search result, THE Review_System SHALL include an `averageRating` field equal to the arithmetic mean of all `VISIBLE` review ratings for that product, rounded to two decimal places.
2. WHEN a product is fetched by id or returned in a search result, THE Review_System SHALL include a `reviewCount` field equal to the total number of `VISIBLE` reviews for that product.
3. WHEN a product has no `VISIBLE` reviews, THE Review_System SHALL return `averageRating` as `null` and `reviewCount` as `0`.
4. WHEN a product is fetched by id, THE Review_System SHALL include a `ratingDistribution` object containing the count of `VISIBLE` reviews for each star value (1 through 5).
5. THE Review_System SHALL ensure that the sum of all values in `ratingDistribution` equals `reviewCount` for every product response.

---

### Requirement 7: Review Moderation

**User Story:** As a platform administrator, I want to flag or hide reviews that violate community guidelines, so that the marketplace maintains content quality.

#### Acceptance Criteria

1. WHEN an admin updates a review's moderation status to `HIDDEN`, THE Review_System SHALL exclude that review from all public listings and aggregate calculations immediately.
2. WHEN an admin updates a review's moderation status to `FLAGGED`, THE Review_System SHALL retain the review in public listings but mark it as flagged for further review.
3. WHEN an admin updates a review's moderation status to `VISIBLE`, THE Review_System SHALL restore the review to public listings and include it in aggregate calculations.
4. IF a non-admin user attempts to change a review's moderation status, THEN THE Review_System SHALL reject the request with HTTP 403 and error code `INSUFFICIENT_PERMISSIONS`.
5. WHEN a moderation action is performed, THE Review_System SHALL record the `adminId`, the previous `Moderation_Status`, the new `Moderation_Status`, and the `actionAt` timestamp in a moderation audit log.

---

### Requirement 8: Reviewer Identity and Timestamp

**User Story:** As a shopper, I want to see the reviewer's display name and the date the review was submitted, so that I can assess the recency and credibility of reviews.

#### Acceptance Criteria

1. WHEN a review is returned, THE Review_System SHALL include a `displayName` derived from the reviewer's `User_User.firstName` and `User_User.lastName` concatenated with a space.
2. IF `User_User.firstName` and `User_User.lastName` are both absent, THEN THE Review_System SHALL use the first segment of the reviewer's email address (before the `@` character) as the `displayName`.
3. WHEN a review is returned, THE Review_System SHALL include a `submittedAt` field formatted as an ISO 8601 UTC timestamp.
4. THE Review_System SHALL never expose the reviewer's email address, user id, or any other personally identifiable information in the public review response.

---

### Requirement 9: Paginated Review Listing

**User Story:** As a shopper, I want to browse reviews across multiple pages, so that I can read more reviews without loading all of them at once.

#### Acceptance Criteria

1. WHEN a request to list reviews includes a `page` parameter (minimum 1) and a `limit` parameter (minimum 1, maximum 50), THE Review_System SHALL return the corresponding page of results.
2. WHEN a request to list reviews omits pagination parameters, THE Review_System SHALL default to `page=1` and `limit=10`.
3. IF a `page` or `limit` value is outside the allowed range, THEN THE Review_System SHALL reject the request with HTTP 422 and a descriptive validation error.
4. WHEN returning a paginated response, THE Review_System SHALL include `totalCount`, `totalPages`, `currentPage`, and `limit` in the response metadata.
5. THE Review_System SHALL ensure that the union of all pages for a given product and sort order contains exactly the same reviews as a single unpaginated query for that product.

---

### Requirement 10: Property-Based Correctness Properties

**User Story:** As a developer, I want the review system to satisfy formal correctness properties, so that edge cases and invariants are continuously verified.

#### Acceptance Criteria

1. FOR ALL sets of submitted ratings for a product, THE Review_System SHALL return an `averageRating` equal to `sum(ratings) / count(ratings)` rounded to two decimal places (average rating invariant).
2. FOR ALL sets of submitted ratings for a product, THE Review_System SHALL return a `ratingDistribution` whose values sum to `reviewCount` (distribution sum invariant).
3. FOR ALL valid `(page, limit)` combinations over a fixed set of reviews, THE Review_System SHALL return non-overlapping pages whose union equals the complete set of visible reviews for that product (pagination completeness property).
4. FOR ALL attempts by the same buyer to submit more than one review for the same product, THE Review_System SHALL persist exactly one review record (idempotence of uniqueness constraint).
5. FOR ALL rating values `r` where `r` is an integer in [1, 5], THE Review_System SHALL accept the submission; FOR ALL rating values outside [1, 5], THE Review_System SHALL reject the submission (rating boundary invariant).
6. FOR ALL products with zero `VISIBLE` reviews, THE Review_System SHALL return `averageRating` as `null` and `reviewCount` as `0` (empty state invariant).
