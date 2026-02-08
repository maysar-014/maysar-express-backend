# Product Matching Guide for Sellers

## What is Product Matching?

When you add a product to the marketplace, our system automatically checks if it already exists in the catalog. This prevents duplicate listings and helps customers find all offers for the same product in one place.

## How It Works

### 1. Automatic Matching

When you create a product, the system:
1. Checks product identifiers (barcode, manufacturer code)
2. Analyzes product details (brand, model, category)
3. Compares with existing products
4. Makes a decision

### 2. Three Possible Outcomes

#### Automatic Match Found
**What happens**: Your product is automatically linked to an existing catalog entry

**Why**: The system found an exact match using:
- Product barcode (GTIN/UPC/EAN)
- Manufacturer part number (MPN)
- ISBN (for books)
- Or identical product fingerprint

**What you do**: Nothing! Your offer is now live under the existing product

**Example**:
```
You're adding: iPhone 15 Pro 256GB
Barcode: 0194253781936
Matched to existing product
Your offer is now visible to customers
```

#### Confirmation Required
**What happens**: The system found a similar product but needs your confirmation

**Why**: The products are very similar but not identical:
- Same brand and category
- Very similar model names
- But no matching identifiers

**What you do**: Review the suggested match and choose:
- **"Yes, same product"** → Your offer links to existing product
- **"No, different product"** → Creates new catalog entry

**Example**:
```
You're adding: iPhone 15 Pro
System found: iPhone 15 Pro Max

Are these the same product?
[ Yes, same product ] [ No, different product ]
```

#### New Product Created
**What happens**: No match found, new catalog entry created

**Why**: This is a genuinely new product not yet in our catalog

**What you do**: Nothing! Your product is now live as a new catalog entry

## Best Practices

### 1. Always Provide Product Identifiers

**Do**:
- Enter barcode/GTIN if available
- Add manufacturer part number (MPN)
- Include ISBN for books

**Why**: Identifiers ensure accurate automatic matching

### 2. Use Consistent Product Information

**Do**:
- Use official brand names (e.g., "Apple" not "apple inc.")
- Include full model names (e.g., "iPhone 15 Pro" not "15 Pro")
- Select the correct category

**Why**: Helps the system find matches even without identifiers

### 3. Respond to Confirmation Requests Promptly

**Do**:
- Review confirmation requests within 24 hours
- Check product details carefully before confirming

**Why**: Expired confirmations create new products automatically

## Understanding Match Confidence

### High Confidence (Auto-Match)
- Identical barcode/GTIN
- Identical manufacturer part number
- Identical product fingerprint

**Result**: Automatic match, no action needed

### Medium Confidence (Needs Confirmation)
- Same brand and category
- Very similar model name (>85% match)
- No matching identifiers

**Result**: You'll be asked to confirm

### Low Confidence (New Product)
- Different brand
- Different category
- Very different model name

**Result**: New product created automatically

## Frequently Asked Questions

### Q: What if I accidentally confirm the wrong product?
**A**: Contact support immediately. We can unlink your offer and create a separate product listing.

### Q: Why wasn't my product matched even though it exists?
**A**: Possible reasons:
- Missing or incorrect barcode
- Different brand name spelling
- Wrong category selected
- Product truly is different (e.g., different storage capacity)

**Solution**: Provide accurate identifiers and product details

### Q: Can I force a new product even if matches exist?
**A**: No, but if you believe the suggested match is incorrect, select "No, different product" in the confirmation screen.

### Q: What happens if I don't respond to a confirmation request?
**A**: After 24 hours, the system will automatically create a new product entry.

### Q: How do I know if my product was matched?
**A**: You'll see a notification after product creation:
- "Matched to existing product [Product Name]"
- "Confirmation required"
- "New product created"

### Q: What is a product fingerprint?
**A**: A unique signature generated from your product's brand, model, and key attributes. Products with identical fingerprints are considered the same.

## Examples

### Example 1: Book with ISBN
```
Your Input:
- Title: "The Great Gatsby"
- ISBN: 978-0-7432-7356-5
- Author: F. Scott Fitzgerald

Result: Automatic match
Reason: ISBN matched existing product
```

### Example 2: Electronics with Barcode
```
Your Input:
- Product: Samsung Galaxy S24 Ultra
- GTIN: 8806095093017
- Brand: Samsung

Result: Automatic match
Reason: GTIN matched existing product
```

### Example 3: Similar Products
```
Your Input:
- Product: Nike Air Max 270 (Size 10, Black)
- No barcode provided
- Brand: Nike

System Found: Nike Air Max 270 (Size 9, White)

Result: Confirmation required
Reason: Same model but different variant

Action: Select "No, different product"
(Different sizes are different products)
```

### Example 4: Generic Product
```
Your Input:
- Product: Wireless Mouse
- No identifiers
- Brand: Generic

Result: New product created
Reason: No specific identifiers, generic description
```

## Tips for Success

1. **Keep product identifiers handy**: Have barcodes, MPN, or ISBN ready when listing
2. **Use official product names**: Copy from manufacturer website
3. **Select precise categories**: "Smartphones" not just "Electronics"
4. **Review confirmations carefully**: Don't rush through confirmation screens
5. **Contact support if unsure**: Better to ask than create duplicates

## Need Help?

- **Documentation**: [Technical Guide](./CATALOG_MATCHING_ENGINE.md)
- **Support**: support@marketplace.com
- **Seller Dashboard**: View your pending confirmations
