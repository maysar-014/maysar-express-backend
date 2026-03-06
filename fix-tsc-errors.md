# TypeScript Error Fixes - Action Plan

## Critical Fixes Applied:

### 1. DTO Classes - Added definite assignment assertions (!)
- ✅ Fixed: enabler-registration.dto.ts
- ✅ Fixed: enabler-order.dto.ts  
- ✅ Fixed: product-listing.dto.ts

### 2. Test Files - Fixed missing constructor arguments
- ✅ Fixed: validate-expertise.use-case.test.ts
- ✅ Fixed: enabler.controller.test.ts
- ✅ Fixed: post.entity.test.ts

### 3. Entity Methods - Added missing properties
- ✅ Fixed: Post entity - added likesCount, commentsCount, sharesCount getters
- ✅ Fixed: FeedEngine - corrected isVisibleToUser method call

## Remaining Errors to Fix:

### High Priority (Breaking Compilation):

1. **Missing Constructor Arguments** (~50 errors)
   - Pattern: `Expected X arguments, but got Y`
   - Files: Various test files and saga files
   - Fix: Add missing mock dependencies to constructors

2. **Missing Properties on Entities** (~100 errors)
   - Pattern: `Property 'X' does not exist on type 'Y'`
   - Files: Entity test files, repository files
   - Fix: Add missing methods/properties or update tests to use correct API

3. **Type Mismatches** (~80 errors)
   - Pattern: `Type 'X' is not assignable to type 'Y'`
   - Files: Repository files (Prisma), policy files
   - Fix: Add proper type conversions or update Prisma schema

4. **Module Not Found** (~60 errors)
   - Pattern: `Cannot find module 'X'`
   - Files: Various service files
   - Fix: Create missing files or update import paths

### Medium Priority:

5. **Implicit Any Types** (~40 errors)
   - Pattern: `Parameter 'X' implicitly has an 'any' type`
   - Fix: Add explicit type annotations

6. **Strict Property Initialization** (~30 errors)
   - Pattern: `Property 'X' has no initializer`
   - Fix: Add `!` assertion or initialize in constructor

7. **Accessor Call Errors** (~20 errors)
   - Pattern: `This expression is not callable because it is a 'get' accessor`
   - Fix: Remove `()` from getter calls

## Quick Fix Commands:

### For all DTO files with uninitialized properties:
```bash
# Add ! to all required properties in DTO files
find services -name "*.dto.ts" -type f
```

### For all test files with missing mocks:
```bash
# Review and add missing mock dependencies
find services -name "*.test.ts" -type f
```

## Recommended Approach:

1. **Phase 1**: Fix all DTO property initialization (DONE)
2. **Phase 2**: Fix all test file constructor arguments (IN PROGRESS)
3. **Phase 3**: Fix entity method calls and missing properties
4. **Phase 4**: Fix Prisma type mismatches
5. **Phase 5**: Create missing module files
6. **Phase 6**: Add explicit types for implicit any
7. **Phase 7**: Fix accessor call syntax

## Temporary tsconfig.json Adjustments:

Consider adding to tsconfig.json temporarily:
```json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": false,
    "strictPropertyInitialization": false,
    "strictNullChecks": false
  }
}
```

Then gradually re-enable strict checks as errors are fixed.
