# Testing And Debugging

This tutorial explains how to verify changes safely.

## Test Layers

The repo uses several test styles:

- unit tests for small pure logic
- integration tests for repositories and service boundaries
- route tests for Express behavior
- contract tests for API compatibility
- smoke tests for basic end-to-end validation

## What To Test First

When changing business logic, test:

1. the pure domain rule
2. the use case
3. the route behavior
4. the contract if the API changed

## Example: KYC Unit Test Targets

- KYC evaluation logic
- KYC policy restrictions
- KYC submission state transitions

## Example: Route Test Targets

- validation failures
- auth failures
- success response shape
- feature gating behavior

## Debugging Approach

When something fails:

1. Read the error message carefully
2. Find the first stack frame inside your code
3. Check whether the failure is schema, validation, auth, or business logic
4. Reproduce with the smallest possible request

## Common Failure Types

- missing column in the database
- Prisma enum mismatch
- wrong route prefix
- missing auth header
- validation rule too strict
- side effect failure after the main update

## Practical Tip

If a feature is partially working, separate the "core success path" from the "nice-to-have side effect."

Example:

- KYC approval should still succeed even if a notification write fails

## Exercise

Pick a recent bug and classify it:

- schema issue
- validation issue
- route issue
- business logic issue
- side effect issue

Then write the smallest test that would have caught it.
