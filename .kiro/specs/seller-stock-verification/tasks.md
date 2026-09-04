# Implementation Tasks: Seller Stock Verification

## Tasks

- [x] 1. Schema migration — add verification fields and audit log table
- [x] 2. Extend OrderStatus enum with new verification states
- [x] 3. Extend Order entity with verification fields and update status maps
- [x] 4. Create VerificationStateMachine domain value-object
- [x] 5. Create VerificationAuditLog domain entity and repository interface
- [x] 6. Create PrismaVerificationAuditLogRepository infrastructure implementation
- [x] 7. Add verification config (seller_verification_timeout_minutes)
- [x] 8. Modify PlaceOrderUseCase — create in PENDING_SELLER_VERIFICATION, defer all payment
- [x] 9. Create SellerVerifyStockUseCase
- [x] 10. Create SellerDeclineStockUseCase
- [x] 11. Create BuyerConfirmCheckoutUseCase (moves deferred payment here)
- [x] 12. Create MarkOrdersOverdueUseCase
- [x] 13. Create AdminOrderActionsUseCase
- [x] 14. Create AdminQueryUseCase
- [x] 15. Create VerificationTimeoutJob (in-process setInterval)
- [x] 16. Add new API endpoints to order controller
- [x] 17. Register new routes and start timeout job in order-service index
- [x] 18. Enrich GET /orders/:id response with verification fields and nextAction hint
- [x] 19. Subscribe notification service to verification events
- [x] 20. Property-based tests for the four correctness properties
