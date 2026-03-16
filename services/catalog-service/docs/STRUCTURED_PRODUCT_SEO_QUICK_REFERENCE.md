# Structured Product SEO System - Developer Quick Reference

## Quick Start

### 1. Load Category Attributes

```typescript
// Get attribute schema for a category
const useCase = new LoadCategoryAttributesUseCase(
  categoryAttributeRepository,
  categoryRepository,
);

const schema = await useCase.execute(categoryId);
// Returns: CategoryAttributeSchemaDto with all attributes for the category
```

### 2. Preview Product Description

```typescript
// Generate preview without saving
const useCase = new PreviewGeneratedDescriptionUseCase(repository);

const preview = await useCase.execute({
  categoryId: "cooking-oil-uuid",
  brand: "Azam",
  productName: "Cooking Oil",
  structuredAttributes: {
    volume: "5L",
    oil_type: "Vegetable",
  },
});
// Returns: GeneratedDescriptionDto with SEO content and quality score
```

### 3. Create Structured Product

```typescript
// Create product with structured attributes
const useCase = new CreateProductUseCase(
  productRepository,
  categoryRepository,
  categoryAttributeRepository,
  productAttributeRepository,
  eventPublisher,
  idGenerator,
  dateTimeService,
);

const result = await useCase.execute({
  sellerId: "seller-uuid",
  categoryId: "cooking-oil-uuid",
  brand: "Azam",
  productName: "Cooking Oil",
  minimumOrderQuantity: 10,
  supplierLocation: "Dar es Salaam",
  structuredAttributes: {
    volume: "5L",
    oil_type: "Vegetable",
  },
  mediaUrls: ["https://example.com/image.jpg"],
  price: 15000,
  currency: "TZS",
});
// Returns: { productId, status, message }
```

---

## API Endpoints

### Load Category Attributes

```http
GET /api/v1/categories/:categoryId/attributes

Response:
{
  "success": true,
  "data": {
    "categoryId": "uuid",
    "categoryName": "Cooking Oil",
    "categorySlug": "cooking-oil",
    "attributes": [
      {
        "id": "attr-1",
        "name": "volume",
        "displayLabel": "Volume",
        "type": "SELECT",
        "isRequired": true,
        "options": ["1L", "2L", "5L", "10L"],
        "placeholder": "Select volume"
      }
    ]
  }
}
```

### Preview Generated Description

```http
POST /api/v1/products/preview-description

Request:
{
  "categoryId": "uuid",
  "brand": "Azam",
  "productName": "Cooking Oil",
  "structuredAttributes": {
    "volume": "5L",
    "oil_type": "Vegetable"
  }
}

Response:
{
  "success": true,
  "data": {
    "seoTitle": "Azam Cooking Oil 5L – Premium Edible Oil",
    "shortSeoDescription": "Premium vegetable cooking oil from Azam...",
    "fullDescription": {
      "overview": "...",
      "keyFeatures": ["..."],
      "specifications": {"...": "..."},
      "usage": "...",
      "delivery": "...",
      "supplierInfo": "..."
    },
    "qualityScore": 95,
    "scoreBreakdown": {
      "titleCompleteness": 20,
      "attributesCompleteness": 25,
      "imagesUploaded": 20,
      "descriptionLength": 20,
      "categoryAccuracy": 15
    },
    "slug": "azam-cooking-oil-5l-vegetable"
  }
}
```

### Create Structured Product

```http
POST /api/v1/products

Request:
{
  "sellerId": "uuid",
  "categoryId": "uuid",
  "brand": "Azam",
  "productName": "Cooking Oil",
  "minimumOrderQuantity": 10,
  "supplierLocation": "Dar es Salaam",
  "structuredAttributes": {
    "volume": "5L",
    "oil_type": "Vegetable"
  },
  "mediaUrls": ["https://example.com/image.jpg"],
  "price": 15000,
  "currency": "TZS"
}

Response (Success):
{
  "success": true,
  "data": {
    "productId": "uuid"
  }
}

Response (Quality Score Too Low):
{
  "success": false,
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Quality score 45 is below publish threshold of 60"
  }
}
```

---

## Quality Scoring

### Scoring Signals

| Signal                  | Max Points | How to Maximize                            |
| ----------------------- | ---------- | ------------------------------------------ |
| Title Completeness      | 20         | Include brand, product name, key attribute |
| Attributes Completeness | 25         | Fill all required attributes               |
| Images Uploaded         | 20         | Upload at least 3 images                   |
| Description Length      | 20         | Write 300+ character description           |
| Category Accuracy       | 15         | Select leaf category (no children)         |

### Example Score Calculation

```
Brand present:           +7 points
Product name present:    +7 points
Key attribute present:   +6 points
─────────────────────────────────
Title Completeness:      20/20 ✓

All required attributes: +25 points
─────────────────────────────────
Attributes Completeness: 25/25 ✓

3 images uploaded:       +20 points
─────────────────────────────────
Images Uploaded:         20/20 ✓

Description 250 chars:   +15 points (out of 20)
─────────────────────────────────
Description Length:      15/20

Leaf category:           +15 points
─────────────────────────────────
Category Accuracy:       15/15 ✓

═════════════════════════════════
TOTAL SCORE:             95/100 ✓ PUBLISHABLE
```

---

## Value Objects

### StructuredProductAttributes

```typescript
// Create with validation
const attributes = StructuredProductAttributes.create(
  {
    volume: "5L",
    oil_type: "Vegetable",
    packaging: "Bottle",
  },
  schema, // CategoryAttributeSchema[]
);

// Access values
const volume = attributes.get("volume");
const all = attributes.getAll();
const keyAttr = attributes.getKeyAttribute();
```

### QualityScore

```typescript
// Create from signals
const score = QualityScore.create({
  titleCompleteness: 20,
  attributesCompleteness: 25,
  imagesUploaded: 20,
  descriptionLength: 15,
  categoryAccuracy: 15,
});

// Check publishability
if (score.isPublishable()) {
  // Score >= 60, can publish
}

// Get suggestions
const suggestions = score.getSuggestionsForImprovement();
```

### SeoSlug

```typescript
// Generate from attributes
const slug = SeoSlug.fromAttributes({
  categorySlug: "cooking-oil",
  brand: "Azam",
  productName: "Cooking Oil",
  keyAttribute: "5L",
});

// Result: "cooking-oil-azam-cooking-oil-5l"
const value = slug.getValue();
```

---

## Engines

### DescriptionGeneratorEngine

```typescript
// Generate description
const description = DescriptionGeneratorEngine.generate(
  attributes,           // StructuredProductAttributes
  'cooking-oil',        // categorySlug
  'Cooking Oil',        // productName
  'Azam'                // brand
);

// Result structure
{
  overview: "Azam Cooking Oil is a premium cooking oil...",
  keyFeatures: ["Premium quality", "Vegetable oil", "5L bottle"],
  specifications: {
    "Volume": "5L",
    "Type": "Vegetable",
    "Packaging": "Bottle"
  },
  usage: "Perfect for cooking and frying",
  delivery: "Available from verified suppliers on Maysar marketplace across Tanzania",
  supplierInfo: "Supplier: Azam. Location: Tanzania..."
}
```

### SeoTitleGeneratorEngine

```typescript
// Generate SEO title
const title = SeoTitleGeneratorEngine.generate({
  brand: "Azam",
  productName: "Cooking Oil",
  keyAttribute: "5L",
  categoryKeyword: "Cooking Oil",
});

// Result: "Azam Cooking Oil 5L – Cooking Oil"
// Max 70 characters
```

---

## Policies

### ProductQualityPolicy

```typescript
// Compute quality score
const score = ProductQualityPolicy.computeScore({
  brand: "Azam",
  productName: "Cooking Oil",
  keyAttribute: "5L",
  requiredAttributesFilled: 2,
  totalRequiredAttributes: 2,
  imageCount: 3,
  descriptionLength: 250,
  isLeafCategory: true,
});

// Check if can publish
if (ProductQualityPolicy.canPublish(score)) {
  // Score >= 60
}

// Get threshold
const threshold = ProductQualityPolicy.getPublishThreshold(); // 60
```

### DescriptionValidationPolicy

```typescript
// Validate description
const result = DescriptionValidationPolicy.validate(
  description,
  'Cooking Oil',
  ['cooking-oil', 'oil', 'edible']
);

// Result
{
  isValid: true,
  violatedRules: [],
  suggestions: []
}

// Or with violations
{
  isValid: false,
  violatedRules: [
    "Description must be at least 120 characters",
    "Description must contain the product name"
  ],
  suggestions: [
    "Add 'Cooking Oil' to the description",
    "Expand description to at least 120 characters"
  ]
}
```

---

## Error Handling

### Common Errors

#### Missing Required Attributes

```typescript
try {
  const attributes = StructuredProductAttributes.create(
    { volume: "5L" }, // Missing oil_type
    schema,
  );
} catch (error) {
  // DomainError: "Missing required attributes: Oil Type"
}
```

#### Quality Score Too Low

```typescript
try {
  const result = await createProductUseCase.execute(dto);
  if (result.status === "business_rule_violation") {
    // Quality score 45 is below publish threshold of 60
  }
} catch (error) {
  // DomainError: "Quality score 45 is below publish threshold of 60"
}
```

#### Invalid Attribute Type

```typescript
try {
  const attributes = StructuredProductAttributes.create(
    { volume: "invalid" }, // Not in SELECT options
    schema,
  );
} catch (error) {
  // DomainError: "Volume must be one of: 1L, 2L, 5L, 10L"
}
```

---

## Testing Examples

### Unit Test: StructuredProductAttributes

```typescript
describe("StructuredProductAttributes", () => {
  it("should validate required attributes", () => {
    expect(() => {
      StructuredProductAttributes.create(
        { volume: "5L" }, // Missing required oil_type
        schema,
      );
    }).toThrow("Missing required attributes");
  });

  it("should validate attribute types", () => {
    expect(() => {
      StructuredProductAttributes.create({ volume: "invalid" }, schema);
    }).toThrow("must be one of");
  });
});
```

### Integration Test: Product Creation

```typescript
describe("CreateProductUseCase", () => {
  it("should create product with quality score >= 60", async () => {
    const result = await useCase.execute({
      sellerId: "seller-uuid",
      categoryId: "cooking-oil-uuid",
      brand: "Azam",
      productName: "Cooking Oil",
      minimumOrderQuantity: 10,
      supplierLocation: "Dar es Salaam",
      structuredAttributes: {
        volume: "5L",
        oil_type: "Vegetable",
      },
      mediaUrls: ["https://example.com/image.jpg"],
      price: 15000,
    });

    expect(result.status).toBe("success");
    expect(result.productId).toBeDefined();
  });

  it("should reject product with quality score < 60", async () => {
    const result = await useCase.execute({
      // ... minimal attributes
    });

    expect(result.status).toBe("business_rule_violation");
    expect(result.message).toContain("Quality score");
  });
});
```

---

## Common Patterns

### Pattern 1: Load Schema → Fill Form → Preview → Submit

```typescript
// Step 1: Load schema
const schema = await loadCategoryAttributesUseCase.execute(categoryId);

// Step 2: User fills form with attributes
const userInput = {
  categoryId,
  brand: "Azam",
  productName: "Cooking Oil",
  structuredAttributes: {
    volume: "5L",
    oil_type: "Vegetable",
  },
};

// Step 3: Preview
const preview = await previewUseCase.execute(userInput);
console.log(`Quality Score: ${preview.qualityScore}`);
console.log(`SEO Title: ${preview.seoTitle}`);

// Step 4: Submit if satisfied
if (preview.qualityScore >= 60) {
  const result = await createProductUseCase.execute({
    ...userInput,
    mediaUrls: ["..."],
    price: 15000,
  });
}
```

### Pattern 2: Batch Product Creation

```typescript
const products = [
  { brand: 'Azam', productName: 'Oil 5L', ... },
  { brand: 'Azam', productName: 'Oil 10L', ... },
  { brand: 'Azam', productName: 'Oil 20L', ... }
];

for (const product of products) {
  try {
    const result = await createProductUseCase.execute(product);
    console.log(`Created: ${result.productId}`);
  } catch (error) {
    console.error(`Failed: ${error.message}`);
  }
}
```

---

## Troubleshooting

### Issue: Quality Score Too Low

**Solution**: Check the score breakdown and improve:

- Add brand, product name, key attribute to title
- Fill all required attributes
- Upload at least 1 image
- Write description with 120+ characters
- Select a leaf category

### Issue: Attribute Validation Failed

**Solution**: Verify:

- All required attributes are provided
- Attribute values match the type (TEXT, NUMBER, SELECT, BOOLEAN)
- SELECT values are in the options list
- TEXT values are ≤ 500 characters

### Issue: Description Validation Failed

**Solution**: Ensure:

- Description is 120-5000 characters
- Product name is mentioned
- Category keyword is included
- Specifications section exists
- No excessive word repetition

---

## Performance Tips

1. **Cache category schemas**: Load once, reuse for multiple products
2. **Batch attribute saves**: Use `saveAll()` instead of individual saves
3. **Async operations**: Use async/await for I/O operations
4. **Lazy loading**: Load related data only when needed
5. **Index optimization**: Ensure database indexes on categoryId, productId

---

## Related Documentation

- **Full Specification**: `STRUCTURED_PRODUCT_SEO_IMPLEMENTATION_SUMMARY.md`
- **Modeling Diagrams**: `docs/modeling/STRUCTURED_PRODUCT_SEO_README.md`
- **Architecture**: `architecture_constitution.md`
- **API Docs**: `api-documentation-constitution.md`
- **Testing**: `testing-constitution.md`

---

**Last Updated**: January 2025
**Version**: 1.0
