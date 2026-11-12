/**
 * HTTP Assertion Helpers
 *
 * Property-based assertion functions for round-trip, idempotency, tombstone,
 * and state machine transition checks.
 */

// ---------------------------------------------------------------------------
// AssertionError
// ---------------------------------------------------------------------------

export class AssertionError extends Error {
  constructor(message, expected, actual) {
    super(message);
    this.name = 'AssertionError';
    this.expected = expected;
    this.actual = actual;
  }
}

// ---------------------------------------------------------------------------
// assertRoundTrip — Property 9
// ---------------------------------------------------------------------------

/**
 * Asserts that all specified fields from createPayload appear in readResponse.
 *
 * Property 9: Create–Read Round-Trip Consistency
 * For any entity created via POST with payload P, a GET by ID must return
 * every documented field equal to the corresponding field in P.
 *
 * @param {object} createPayload - the original POST body
 * @param {object} readResponse  - the response from GET (or res.data)
 * @param {string[]} fields      - field names to compare
 */
export function assertRoundTrip(createPayload, readResponse, fields) {
  const responseData = readResponse?.data ?? readResponse;
  const failures = [];

  for (const field of fields) {
    const expected = createPayload[field];
    if (expected === undefined) continue; // field not in payload — skip

    const actual = responseData?.[field];
    if (actual !== expected) {
      failures.push({ field, expected, actual });
    }
  }

  if (failures.length > 0) {
    const diff = failures
      .map((f) => `  ${f.field}: expected ${JSON.stringify(f.expected)}, got ${JSON.stringify(f.actual)}`)
      .join('\n');
    throw new AssertionError(
      `Round-trip assertion failed for ${failures.length} field(s):\n${diff}`,
      Object.fromEntries(fields.map((f) => [f, createPayload[f]])),
      Object.fromEntries(fields.map((f) => [f, responseData?.[f]])),
    );
  }
}

// ---------------------------------------------------------------------------
// assertIdempotency — Property 10
// ---------------------------------------------------------------------------

/**
 * Asserts that two calls with the same idempotency key produce the same
 * result and do not create a duplicate entity.
 *
 * Property 10: Idempotency Key Deduplication
 * Two calls with the same key and payload must produce identical status code
 * + entity ID, and the DB delta after the second call must be 0.
 *
 * @param {object} firstRes  - { status, data }
 * @param {object} secondRes - { status, data }
 * @param {number} dbDeltaAfterSecond - row count change after second call
 */
export function assertIdempotency(firstRes, secondRes, dbDeltaAfterSecond) {
  const failures = [];

  if (firstRes.status !== secondRes.status) {
    failures.push(
      `Status codes differ: first=${firstRes.status}, second=${secondRes.status}`,
    );
  }

  const firstId  = firstRes.data?.id  ?? firstRes.data?.data?.id;
  const secondId = secondRes.data?.id ?? secondRes.data?.data?.id;
  if (firstId && secondId && firstId !== secondId) {
    failures.push(
      `Entity IDs differ: first=${firstId}, second=${secondId} (duplicate entity may have been created)`,
    );
  }

  if (dbDeltaAfterSecond !== 0) {
    failures.push(
      `DB delta after second call should be 0, got ${dbDeltaAfterSecond} (duplicate row created)`,
    );
  }

  if (failures.length > 0) {
    throw new AssertionError(
      `Idempotency assertion failed:\n  ${failures.join('\n  ')}`,
      { status: firstRes.status, id: firstId, delta: 0 },
      { status: secondRes.status, id: secondId, delta: dbDeltaAfterSecond },
    );
  }
}

// ---------------------------------------------------------------------------
// assertTombstone — Property 11
// ---------------------------------------------------------------------------

/**
 * Asserts that DELETE returned 200/204 and a subsequent GET returned 404.
 *
 * Property 11: Delete–Read Tombstone Consistency
 * For any entity deleted via DELETE (200/204), a GET by the same ID must
 * return 404.
 *
 * @param {object} deleteRes - { status, data }
 * @param {object} getRes    - { status, data } after the delete
 */
export function assertTombstone(deleteRes, getRes) {
  const failures = [];

  if (![200, 204].includes(deleteRes.status)) {
    failures.push(
      `DELETE should return 200 or 204, got ${deleteRes.status}`,
    );
  }

  if (getRes.status !== 404) {
    failures.push(
      `GET after DELETE should return 404, got ${getRes.status}`,
    );
  }

  if (failures.length > 0) {
    throw new AssertionError(
      `Tombstone assertion failed:\n  ${failures.join('\n  ')}`,
      { deleteStatus: [200, 204], getStatus: 404 },
      { deleteStatus: deleteRes.status, getStatus: getRes.status },
    );
  }
}

// ---------------------------------------------------------------------------
// assertStateTransition — Property 12
// ---------------------------------------------------------------------------

/**
 * Asserts valid state machine transitions succeed and invalid ones are
 * correctly rejected.
 *
 * Property 12: State Machine Valid-Transition Enforcement
 * Only documented transitions should succeed (200/201); unlisted transitions
 * must return 409 or 422 with entity status unchanged.
 *
 * @param {object} entity               - current entity (with .status field)
 * @param {string} fromStatus           - expected current status
 * @param {string} toStatus             - target status for valid transition
 * @param {object} transitionRes        - response from valid transition call
 * @param {object|null} invalidTransitionRes - response from an invalid transition
 */
export function assertStateTransition(entity, fromStatus, toStatus, transitionRes, invalidTransitionRes) {
  const failures = [];

  // Valid transition should return 200 or 201
  if (![200, 201].includes(transitionRes.status)) {
    failures.push(
      `Valid transition ${fromStatus} → ${toStatus} should return 200/201, got ${transitionRes.status}`,
    );
  }

  // Invalid transition should be rejected
  if (invalidTransitionRes) {
    if (![409, 422].includes(invalidTransitionRes.status)) {
      failures.push(
        `Invalid transition should return 409 or 422, got ${invalidTransitionRes.status}`,
      );
    }

    // Entity status should remain unchanged after invalid transition
    const statusAfter =
      invalidTransitionRes.data?.status ??
      invalidTransitionRes.data?.data?.status;
    if (statusAfter && statusAfter !== fromStatus) {
      failures.push(
        `Entity status changed after invalid transition: expected ${fromStatus}, got ${statusAfter}`,
      );
    }
  }

  if (failures.length > 0) {
    throw new AssertionError(
      `State transition assertion failed:\n  ${failures.join('\n  ')}`,
      { validStatus: [200, 201], invalidStatus: [409, 422], entityStatus: fromStatus },
      {
        validStatus: transitionRes.status,
        invalidStatus: invalidTransitionRes?.status,
        entityStatus: invalidTransitionRes?.data?.status,
      },
    );
  }
}
