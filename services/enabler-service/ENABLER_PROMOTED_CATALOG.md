# Enabler promoted catalog and purchase links

The promoted catalog is derived from `Enabler_SellerAuthorization`, which is the
seller's approval record. The legacy `Product.enablerEnabled` flag and
`Enabler_ProductListing` records do not grant promotion permission by themselves.

## Endpoints

- `GET /api/enabler/enablers/{enablerId}/catalog` lists currently approved,
  published, public products for the authenticated enabler.
- `GET /api/enabler/enablers/{enablerId}/catalog/share-link` gets or creates a
  persistent public catalog link.
- `GET /api/enabler/enablers/{enablerId}/products/{productId}/share-link`
  creates a purchase link only when the product is in the enabler's live scope.
- `GET /api/enabler/hub/catalog/{publicCode}` resolves a public catalog. It
  recalculates products on each request, so revoked, suspended, expired, or
  narrowed seller approvals stop exposing products immediately. Each public
  product includes a `purchaseUrl` with the enabler referral code already set.

Product purchase links carry the enabler referral code. Checkout validates the
enabler status and rechecks each cart product against the current seller
authorization before attaching attribution. Multi-seller order placement checks
the scope again, then persists one `Enabler_Attribution` row per eligible
product in the same transaction as its `Order_Order`. Legacy order-wide enabler
fields are written only when every product in that seller order is authorized.
If no cart items remain authorized, the buyer can still check out without
enabler attribution.

## Seller promotion program

Sellers manage one promotion offer for their seller account. The offer records a
product scope, a seller-set percentage of eligible item subtotal, and the target
number of accepted enablers. The seller dashboard reads `requiredEnablerCount`,
`approvedEnablerCount`, `pendingApplicationCount`, and `remainingEnablerSpots`.
Enabler applications are pending seller authorizations; approval consumes one
spot and copies the offer's then-current scope and earning rate onto the approved
authorization. Updating the offer affects future applications and does not alter
accepted terms or existing orders.

Endpoints:

- `GET/PUT /api/enabler/enablers/seller/{sellerId}/promotion-offer`
- `POST /api/enabler/enablers/seller/{sellerId}/promotion-offer/close`
- `GET /api/enabler/enablers/promotion-offers`
- `POST /api/enabler/enablers/promotion-offers/{offerId}/apply`
- `POST /api/enabler/enablers/seller/{sellerId}/promotion-applications/{applicationId}/decision`

Only the seller owner can edit the offer or decide applications. An active
enabler sees public products in open offers and can apply. Seller approval is
required before the products appear in an enabler's catalog or can generate
purchase links. Sellers can revoke an accepted application; revocation removes
the authorization from future catalog, checkout, and attribution checks and
releases that capacity spot.

## Commission and wallet credit

At order placement, checkout revalidates the approved seller authorization and
stores its rate, scope, eligible product subtotal, and commission amount as an
order earning snapshot. The earning row is created atomically with the order.
Order delivery qualifies that earning and credits the enabler's wallet
idempotently. For COD, the enabler commission is deducted from the seller share
before the seller wallet credit; for non-COD delivered orders, the wallet service
credits the enabler from the same earning record. The enabler earnings ledger
includes these order-linked earnings, and `AVAILABLE` earnings represent funds
already credited to the wallet and ready for the normal payout flow.

Apply migrations `20260915000000_add_enabler_capability` and
`20261018020000_enabler_seller_promotion_program` before enabling the promotion
workflow in a deployment.
