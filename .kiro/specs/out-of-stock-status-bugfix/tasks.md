# Implementation Plan

## Out of Stock Status Bugfix

This plan fixes the bug where products always show "out_of_stock" status regardless of actual inventory levels. The fix updates `buildProductDetails` to calculate inventory from variant stock data and removes redundant conditional logic in the `execute` method.

---

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Inventory Status Reflects Actual Stock
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases: products with variants having `inventoryQuantity > 0`
  - Test that `buildProductDetails` returns a `ProductDetails` object with `inventory` property populated from variant stock data
  - Test cases:
    1. Product with variants having `inventoryQuantity > 0` should return `inventory.status = "in_stock"` and `inventory.available > 0`
    2. Product with variants having `inventoryQuantity = 0` should return `inventory.status = "out_of_stock"`
    3. Product with variants having inventory below reorder point should return `inventory.status = "low_stock"`
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.5_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Buggy Inputs Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for inputs where the bug condition does NOT hold
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Test cases:
    1. **Product Not Found Preservation**: Request non-existent product, verify `status: "not_found"`
    2. **Product Without Variants Preservation**: Product with no variants, verify `inventory.status = "out_of_stock"`
    3. **Zero Inventory Preservation**: Product with variants having zero stock, verify `inventory.status = "out_of_stock"`
    4. **Search Filter Preservation**: Search with `inStock` filter continues to work correctly
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Fix for out of stock status bug

  - [x] 3.1 Update buildProductDetails to calculate inventory from variant stock data
    - Read `inventoryQuantity` or `stock` from each variant (populated by `enrichWithStock`)
    - Aggregate total available and reserved quantities across all variants
    - Determine status based on available quantity (`in_stock`, `low_stock`, `out_of_stock`)
    - Handle missing variant data gracefully (empty array defaults to `out_of_stock`)
    - Handle missing `inventoryQuantity` on variants (default to 0)
    - _Bug_Condition: isBugCondition(input) where product has variants with inventoryQuantity > 0 but inventory property is undefined_
    - _Expected_Behavior: inventory property populated with correct available, reserved, total, and status values_
    - _Preservation: Products without variants, zero inventory, and error cases remain unchanged_
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [x] 3.2 Remove redundant conditional logic in execute method
    - Remove the conditional inventory population block that only triggers when `productDetails.inventory.available === 0`
    - The `buildProductDetails` method now handles all inventory population
    - Ensure the execute method relies on buildProductDetails for inventory data
    - _Bug_Condition: The flawed conditional `if (!productDetails.inventory || productDetails.inventory.available === 0)` fails when inventory is undefined_
    - _Expected_Behavior: Inventory always populated from buildProductDetails, no conditional fallback needed_
    - _Preservation: Error handling and product not found cases remain unchanged_
    - _Requirements: 2.1, 2.5_

  - [x] 3.3 Implement low stock detection
    - Add logic to detect when available inventory is below reorder point
    - Return `low_stock` status when `totalAvailable > 0` AND `totalAvailable <= reorderPoint`
    - Read reorder point from product or variant configuration
    - Default reorder point to 0 if not configured
    - _Bug_Condition: Products with positive inventory below reorder point should show `low_stock` status_
    - _Expected_Behavior: inventory.status = "low_stock" when available inventory is below reorder point_
    - _Preservation: Products without reorder point configuration default to `in_stock` when inventory > 0_
    - _Requirements: 2.4_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Inventory Status Reflects Actual Stock
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.5_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Buggy Inputs Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite for catalog-service
  - Verify all unit tests pass
  - Verify all property-based tests pass
  - Verify integration tests pass
  - Ensure no regressions in existing functionality
  - Ask the user if questions arise

---

## Summary

| Phase | Task | Purpose |
|-------|------|---------|
| 1 | Bug Condition Exploration | Surface counterexamples proving the bug exists |
| 2 | Preservation Property Tests | Capture baseline behavior to preserve |
| 3 | Implementation | Apply the fix with understanding |
| 4 | Checkpoint | Verify complete success |
