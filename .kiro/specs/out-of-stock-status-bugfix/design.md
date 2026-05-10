# Out of Stock Status Bugfix Design

## Overview

Products fetched from the catalog service consistently show "out_of_stock" status regardless of their actual inventory levels. The root cause is a conditional inventory population logic in `GetProductUseCase.execute` that only sets inventory when `productDetails.inventory.available === 0`, combined with `buildProductDetails` not setting inventory at all. The Product Controller then defaults to `out_of_stock` when inventory is undefined, causing all products to appear out of stock.

The fix ensures inventory is always populated from enriched variant stock data after building product details, regardless of whether inventory was previously set.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when `buildProductDetails` returns a `ProductDetails` object without an `inventory` property, and the conditional check in `execute` fails to populate it
- **Property (P)**: The desired behavior - products shall display accurate inventory status based on variant stock levels from `inventory_StockItem`
- **Preservation**: Existing behaviors that must remain unchanged - product not found handling, products without variants, database error handling, search filtering, and product creation
- **GetProductUseCase**: The use case in `services/catalog-service/src/application/use-cases/get-product.use-case.ts` that retrieves and builds product details
- **buildProductDetails**: The private method that constructs `ProductDetails` from a `ProductRecord` but does not populate the `inventory` property
- **enrichWithStock**: The repository method that fetches stock from `inventory_StockItem` and adds `inventoryQuantity` to variants
- **inventoryStatus**: The computed status (`in_stock`, `low_stock`, `out_of_stock`) based on total available inventory

## Bug Details

### Bug Condition

The bug manifests when a product is fetched via `GetProductUseCase.execute()`. The `buildProductDetails` method constructs a `ProductDetails` object but never sets the `inventory` property. The `execute` method has conditional logic that attempts to populate inventory, but only when `productDetails.inventory.available === 0` - a condition that fails when `inventory` is undefined (JavaScript returns `undefined` for property access on undefined).

The Product Controller then applies a default `out_of_stock` status when `productDetails.inventory` is falsy.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type GetProductRequest
  OUTPUT: boolean
  
  product := productRepository.findById(input.productId)
  productDetails := buildProductDetails(product)
  
  RETURN product != null
         AND productDetails.inventory === undefined
         AND product.variants has at least one variant
         AND at least one variant has inventoryQuantity > 0
END FUNCTION
```

### Examples

- **Example 1**: Product with 3 variants, each having 10 units in stock
  - Expected: `inventory.status = "in_stock"`, `inventory.available = 30`
  - Actual: `inventory.status = "out_of_stock"`, `inventory.available = 0`
  
- **Example 2**: Product with 1 variant having 5 units in stock
  - Expected: `inventory.status = "in_stock"`, `inventory.available = 5`
  - Actual: `inventory.status = "out_of_stock"`, `inventory.available = 0`
  
- **Example 3**: Product with variants but no stock records in `inventory_StockItem`
  - Expected: `inventory.status = "out_of_stock"`, `inventory.available = 0`
  - Actual: `inventory.status = "out_of_stock"`, `inventory.available = 0` (correct behavior)

- **Example 4**: Product with no variants
  - Expected: `inventory.status = "out_of_stock"`, `inventory.available = 0`
  - Actual: `inventory.status = "out_of_stock"`, `inventory.available = 0` (correct behavior)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Product not found must continue to return `status: "not_found"`
- Products without variants must continue to return `inventory.status = "out_of_stock"`
- Database errors during inventory fetch must continue to be handled gracefully with default inventory values
- Product search with `inStock` filter must continue to filter based on actual inventory status
- Product creation with initial inventory must continue to work correctly

**Scope:**
All inputs that do NOT involve the bug condition (products with variants having positive stock but missing inventory property) should be completely unaffected by this fix. This includes:
- Products that do not exist
- Products with no variants
- Products with zero inventory (correct out_of_stock status)
- Search operations with inventory filters
- Product creation operations

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **buildProductDetails Does Not Set Inventory**: The `buildProductDetails` method constructs `ProductDetails` but never populates the `inventory` property. It only sets fields like `id`, `sellerId`, `name`, `price`, etc.

2. **Conditional Inventory Population Logic is Flawed**: The `execute` method has this condition:
   ```typescript
   if (!productDetails.inventory || productDetails.inventory.available === 0) {
   ```
   When `productDetails.inventory` is `undefined`, `productDetails.inventory.available` throws or evaluates incorrectly. The intent was to populate missing inventory, but the check `productDetails.inventory.available === 0` fails when inventory is undefined.

3. **Repository Enrichment Happens Before Build**: The `enrichWithStock` method correctly adds `inventoryQuantity` to variants at the repository level, but `buildProductDetails` doesn't read this data to construct the `inventory` property.

4. **Controller Defaults to Out of Stock**: The Product Controller at line 971-978 defaults to `out_of_stock` when `productDetails.inventory` is falsy:
   ```typescript
   inventory: productDetails.inventory || {
     available: 0,
     reserved: 0,
     total: 0,
     status: 'out_of_stock'
   }
   ```

## Correctness Properties

Property 1: Bug Condition - Inventory Status Reflects Actual Stock

_For any_ product with variants that have positive inventory quantity in the `inventory_StockItem` table, the fixed `GetProductUseCase.execute` SHALL populate the `inventory` property with correct `available`, `reserved`, `total`, and `status` values based on the aggregated variant stock levels.

**Validates: Requirements 2.1, 2.2, 2.5**

Property 2: Preservation - Non-Buggy Inputs Unchanged

_For any_ input where the bug condition does NOT hold (product not found, no variants, zero inventory, database errors), the fixed function SHALL produce the same result as the original function, preserving all existing behaviors for product retrieval, search, creation, and error handling.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

Property 3: Stock Status Calculation - Low Stock Detection

_For any_ product with variants where total available inventory is greater than 0 but below the reorder point, the fixed function SHALL return `inventory.status = "low_stock"` with correct available quantity.

**Validates: Requirements 2.4**

## Fix Implementation

### Changes Required

**File**: `services/catalog-service/src/application/use-cases/get-product.use-case.ts`

**Function**: `buildProductDetails` and `execute`

**Specific Changes**:

1. **Update buildProductDetails to Calculate Inventory**: 
   - After constructing the basic `ProductDetails`, calculate inventory from the raw product's variants
   - Read `inventoryQuantity` or `stock` from each variant (populated by `enrichWithStock`)
   - Aggregate total available and reserved quantities
   - Determine status based on available quantity (`in_stock`, `low_stock`, `out_of_stock`)

2. **Remove Redundant Conditional Logic in execute**:
   - Remove the conditional inventory population block (lines 161-175)
   - The `buildProductDetails` method should handle all inventory population

3. **Implement Low Stock Detection**:
   - Add logic to detect when available inventory is below reorder point
   - Return `low_stock` status when applicable

4. **Handle Missing Variant Data Gracefully**:
   - If variants array is empty or missing, default to `out_of_stock`
   - If `inventoryQuantity` is not present on variants, default to 0

### Implementation Details

```typescript
// In buildProductDetails method, add after constructing details object:

// Calculate inventory from enriched variant stock data
const rawProduct = product as any;
const variants: any[] = Array.isArray(rawProduct.variants) ? rawProduct.variants : [];
const totalAvailable = variants.reduce(
  (sum: number, v: any) => sum + (Number(v.inventoryQuantity ?? v.stock ?? 0)), 
  0
);
const totalReserved = variants.reduce(
  (sum: number, v: any) => sum + (Number(v.quantityReserved ?? 0)), 
  0
);

// Determine stock status
let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'out_of_stock';
if (totalAvailable > 0) {
  // Check for low stock (would need reorder point from product or variant)
  const reorderPoint = rawProduct.reorderPoint ?? 0;
  stockStatus = totalAvailable <= reorderPoint ? 'low_stock' : 'in_stock';
}

details.inventory = {
  available: totalAvailable,
  reserved: totalReserved,
  total: totalAvailable + totalReserved,
  status: stockStatus
};
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm the root cause analysis by showing that `buildProductDetails` does not set `inventory`.

**Test Plan**: Write tests that fetch products with variants having positive inventory and assert the inventory status is correctly set. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Product With In-Stock Variants Test**: Fetch a product with variants having `inventoryQuantity > 0`. Assert `inventory.status === "in_stock"` and `inventory.available > 0` (will fail on unfixed code)
2. **Product With Low Stock Variants Test**: Fetch a product with variants having inventory below reorder point. Assert `inventory.status === "low_stock"` (will fail on unfixed code)
3. **Product With Zero Stock Variants Test**: Fetch a product with variants having `inventoryQuantity = 0`. Assert `inventory.status === "out_of_stock"` (may pass on unfixed code)
4. **Product Without Variants Test**: Fetch a product without variants. Assert `inventory.status === "out_of_stock"` (should pass on unfixed code)

**Expected Counterexamples**:
- `inventory` property is undefined after `buildProductDetails`
- `inventory.status` defaults to `out_of_stock` regardless of actual stock
- Possible causes: `buildProductDetails` not reading variant stock data, conditional logic in `execute` failing

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := GetProductUseCase.execute(input)
  ASSERT result.product.inventory.status IN ['in_stock', 'low_stock']
  ASSERT result.product.inventory.available > 0 OR result.product.inventory.status = 'low_stock'
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT GetProductUseCase_original(input) = GetProductUseCase_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for products not matching the bug condition, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Product Not Found Preservation**: Verify that requesting a non-existent product returns `status: "not_found"` after fix
2. **Product Without Variants Preservation**: Verify that products without variants still show `out_of_stock`
3. **Database Error Handling Preservation**: Verify that database errors are handled gracefully with default inventory
4. **Search Filter Preservation**: Verify that search with `inStock` filter continues to work correctly

### Unit Tests

- Test `buildProductDetails` sets `inventory` from variant stock data
- Test inventory status calculation for `in_stock`, `low_stock`, `out_of_stock`
- Test edge cases: no variants, missing `inventoryQuantity`, negative values
- Test that `execute` method no longer needs conditional inventory population

### Property-Based Tests

- Generate random products with variants having random stock levels, verify inventory reflects aggregated stock
- Generate random variant configurations, verify preservation of existing behaviors
- Test across many scenarios: single variant, multiple variants, zero stock, high stock

### Integration Tests

- Test full product retrieval flow with database-backed inventory
- Test that `enrichWithStock` data flows correctly through `buildProductDetails` to API response
- Test product search with inventory filters
- Test product creation with initial inventory
