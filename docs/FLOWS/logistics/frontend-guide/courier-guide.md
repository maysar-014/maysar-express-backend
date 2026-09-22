# Courier Guide — Logistics Service

> Mirrors: docs/FLOWS/logistics/user-flow/courier-flows.md
> Verification status: Verified (DeliveryJob model; COD legacy error format noted)
> Last updated: September 2026

## Overview

This guide is for frontend developers implementing the logistics UI for couriers. It covers four flows: receiving and responding to a new DeliveryJob dispatch, executing a delivery through milestone events, completing COD OTP verification (the most critical flow), and understanding the full delivery lifecycle state machine. The buyer-side COD experience is in `docs/FLOWS/logistics/frontend-guide/buyer-guide.md`.

---

## Flow 1: DeliveryJob Dispatch

**User Goal:** Receive and respond to a new delivery job notification.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Notification received | Push notification with job summary | "New delivery job available — TZS X for X km" |
| Job detail screen | Full job details: pickup address, delivery address, compensation, distance | Card with Accept / Decline actions |
| Accepting | Loading indicator | Brief spinner while acceptance is registered |
| Accepted | Job confirmed, navigation to pickup begins | Transition to milestone execution screen (Flow 2) |
| Declined | Job dismissed | Return to available state; job returns to pool for next courier |
| Job expired | Job no longer available | "This job is no longer available." — return to home screen |

**Actions the User Can Take:**

**Receive job notification:**
- What the courier sees: Push notification: "New delivery job available — TZS [compensation] for [distance] km"
- What they tap: The notification to open the job detail screen
- No API call at notification receipt — job details are included in the notification payload or loaded on tap

**View job details:**
- Job detail screen shows: pickup location, delivery address, estimated distance, courier compensation (TZS), package summary
- Two primary actions: "Accept" and "Decline"

**Accept job:**
- API call: `PATCH /api/logistics/api/v1/deliveries/:deliveryId/status`
  ```json
  { "status": "assigned" }
  ```
- Auth: Bearer JWT
- Success: Transition to delivery execution screen
- Error: See error code table below

**Decline job:**
- App records the decline; job returns to pool; courier remains available for the next dispatch cycle

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 400 | VALIDATION_ERROR | "Something went wrong. Please try again." | Yes |
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 404 | RESOURCE_NOT_FOUND | "This job is no longer available." | No — return to home |
| 409 | INVALID_STATUS_TRANSITION | "This job status cannot be updated right now." | No — check job state |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |

**Eligibility Gate Display:**

If a courier is not receiving job notifications, show a checklist of eligibility gates in their profile or dashboard. All five gates must pass simultaneously for the courier to receive assignments:

| Gate | Required Value | What to show if failing |
|---|---|---|
| Courier status | Must be `online` | "Go online to receive jobs" |
| Rating | ≥ 4.0 | "Your rating is below 4.0. Improve your rating to receive more jobs." |
| Completion rate | ≥ 95% (0.95) | "Your completion rate is below 95%. Complete more deliveries without cancelling." |
| Distance to pickup | Within 50 km | "You are currently outside the service radius for available jobs." |
| Vehicle capacity | Sufficient for package weight | "Your vehicle capacity may not meet the requirements of current jobs." |

**Assignment Scoring Weights:**

Show couriers how their rank is calculated so they understand what to improve:

| Signal | Weight | What it measures |
|---|---|---|
| Distance to pickup | 25% | Closer couriers rank higher |
| Rating | 20% | Higher ratings rank higher |
| Completion rate | 20% | Higher completion rates rank higher |
| Vehicle match | 15% | Better vehicle fit for the package ranks higher |
| Weather suitability | 10% | Vehicle/equipment suited to current weather |
| Traffic experience | 10% | Experience navigating current traffic conditions |

**What the Courier Should Understand:**
- Jobs are dispatched by the system every 5 minutes based on a scoring algorithm.
- The highest-scoring eligible courier in range receives the notification first.
- If all eligible couriers decline, the job re-enters the pool for the next dispatch cycle.
- Improving rating and completion rate has the highest combined impact on assignment frequency (40% combined weight).

---

## Flow 2: Delivery Execution Milestones

**User Goal:** Execute a delivery from pickup to drop-off by confirming each milestone.

**UI States to Handle:**

| State | What Courier Sees | UI Treatment |
|---|---|---|
| Assigned | Pickup address + navigation | "Navigate to pickup" button |
| En route to pickup | Map navigation active | Navigation UI; "Confirm goods collected" button on arrival |
| Goods collected | Pickup confirmed | "En route to delivery" status label + "Mark departed" button |
| In transit | Navigation to delivery address | Navigation UI with delivery address |
| Arrived at delivery | At delivery address | "Arrived at delivery" + action button (see below) |
| Delivered (non-COD) | Delivery confirmed | "Delivery complete ✓" success state |
| Delivered (COD) | COD OTP flow required | Transition to Flow 3: COD OTP Verification |

**Actions the User Can Take:**

Each milestone triggers a status update via `PATCH /api/logistics/api/v1/deliveries/:deliveryId/status`.

**Confirm pickup (mark goods collected):**
- Request body: `{ "status": "picked_up" }`
- Courier sees: "Picked up" status with confirmation; "En route to delivery" label + "Mark departed" button

**Mark departed from pickup:**
- Request body: `{ "status": "in_transit" }`
- Courier sees: Navigation to delivery address; "Navigating to delivery address" label

**Arrive at delivery address:**
- Request body: `{ "status": "out_for_delivery" }`
- Courier sees: "Arrived at delivery" label
  - If COD order: "Start COD verification" button → transitions to Flow 3
  - If non-COD: "Confirm delivery" button → submit `delivered` status

**Confirm delivery (non-COD):**
- Request body: `{ "status": "delivered" }`
- Courier sees: "Delivery complete ✓" final state

**Courier-Facing Label Mapping:**

| Internal Status | Courier-Facing Label | Primary Action |
|---|---|---|
| `pending` / `assigned` | Navigate to pickup | "Navigate to pickup" button |
| `picked_up` | En route to delivery | "Mark departed" button |
| `in_transit` | Navigating to delivery address | Navigation only |
| `out_for_delivery` | Arrived at delivery | "Start COD verification" (COD) or "Confirm delivery" (non-COD) |
| `delivered` | Delivery complete ✓ | Terminal — no further action |
| `cancelled` | Delivery cancelled | Terminal — return to home |
| `failed` | Delivery failed | Contact support link |

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 400 | VALIDATION_ERROR | "Something went wrong. Please try again." | Yes |
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 404 | RESOURCE_NOT_FOUND | "Delivery not found. Please contact support." | No |
| 409 | INVALID_STATUS_TRANSITION | "This status update is not valid right now. Please check your current step." | No — check current state |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |

**What the Courier Should Understand at Every Stage:**
- Each milestone must be confirmed in order — skipping steps will result in a 409 error.
- For COD orders, delivery cannot be confirmed until the buyer's OTP is verified (Flow 3).
- If delivery fails (buyer not home, damaged package), use the report reason flow; status will move to `failed`.

---

## Flow 3: COD OTP Verification (Courier Side)

**User Goal:** Verify a COD delivery by collecting the OTP from the buyer and confirming it in the app.

> ⚠️ **MOST CRITICAL FLOW** — This flow uses a legacy error response format. Read the error handling section carefully before implementing.

**UI States to Handle:**

| State | What Courier Sees | UI Treatment |
|---|---|---|
| Arrived at delivery (COD) | "Start COD verification" button | Prominent action button on arrival screen |
| OTP request sent | "Sending code to buyer…" | Brief loading state |
| Awaiting buyer OTP | OTP input field + instructions | "Ask the buyer for their code and enter it below" |
| Verifying OTP | "Verifying…" | Loading spinner on verify button |
| Verified | "COD verified ✓ — delivery confirmed" | Success state; delivery transitions to `delivered` |
| Invalid OTP | Error message | "The code doesn't match. Please ask the buyer to check again." |
| Expired OTP | Expiry message + resend | "Code has expired. Tap 'Resend OTP' to send a new code to the buyer." |
| Max attempts exceeded | Hard stop message | "Too many attempts. Please contact support to complete this delivery." |

**Actions the User Can Take:**

**Step 1 — Request OTP generation:**
- What the courier sees: "Start COD verification" button on the `out_for_delivery` screen
- What they tap: "Start COD verification"
- API call: `POST /api/logistics/v1/cod/:deliveryId/otp`
- Auth: Bearer JWT (courier)
- Request body: none
- Success response: `{ "success": true, "message": "OTP sent to buyer" }`
- Effect: OTP is sent to the buyer's registered phone via SMS/push

**Step 2 — Enter and submit buyer's OTP:**
- What the courier sees: OTP input field + "Verify COD Payment" button
- The courier verbally receives the OTP from the buyer, then enters it
- API call: `POST /api/logistics/v1/cod/:deliveryId/verify`
  ```json
  { "otp": "XXXXXX" }
  ```
- Auth: Bearer JWT (courier)
- Success response: `{ "success": true, "message": "COD verified successfully" }`
- Effect: wallet hold released; seller credited; delivery status moves to `delivered`

> ⚠️ **CRITICAL — Legacy Error Format:** Both COD endpoints return errors in a **non-standard legacy format**:
> ```json
> { "success": false, "error": "Error message as a plain string" }
> ```
> This is NOT the standard platform error envelope:
> ```json
> { "error": { "code": "ERROR_CODE", "message": "..." } }
> ```
> The frontend **must handle both formats**. Use the following logic:

```javascript
// Handle both error response formats
function getCODErrorMessage(response) {
  // Legacy format: error is a plain string at the top level
  if (typeof response.error === 'string') {
    return response.error; // e.g., "Invalid OTP"
  }
  // Standard format: error is an object with a message field
  if (response.error && typeof response.error === 'object') {
    return response.error.message;
  }
  return 'Something went wrong. Please try again.';
}
```

**COD Error Message Mapping:**

| Error String (legacy format) | User-Facing Message | Action |
|---|---|---|
| `"Invalid OTP"` | "The code doesn't match. Please ask the buyer to check again." | Allow retry |
| `"OTP has expired"` | "Code has expired. Tap 'Resend OTP' to send a new code to the buyer." | Show "Resend OTP" button |
| `"Max OTP attempts exceeded"` | "Too many attempts. Please contact support to complete this delivery." | Disable input; show support contact |

**Resend OTP:**
- When the courier taps "Resend OTP" (after expiry), call `POST /api/logistics/v1/cod/:deliveryId/otp` again
- This generates a new OTP and sends it to the buyer
- Reset the OTP input field after resending

**Error Code Table:**

| HTTP Status | Error Body | User-Facing Message | Retry? |
|---|---|---|---|
| 200 | `{ success: false, error: "Invalid OTP" }` | "The code doesn't match. Please ask the buyer to check again." | Yes — re-enter |
| 200 | `{ success: false, error: "OTP has expired" }` | "Code has expired. Tap 'Resend OTP' to send a new code to the buyer." | Yes — resend OTP |
| 200 | `{ success: false, error: "Max OTP attempts exceeded" }` | "Too many attempts. Please contact support to complete this delivery." | No — contact support |
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 404 | RESOURCE_NOT_FOUND | "Delivery not found. Please contact support." | No |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |

**What the Courier Should Understand at Every Stage:**
- Before starting: the buyer should receive a code on their phone when "Start COD verification" is tapped. Ask them to have it ready.
- Entering the OTP: enter exactly what the buyer says — the code is case-sensitive and time-limited.
- On expiry: the old code is no longer valid. Tap "Resend OTP" to generate a new code for the buyer.
- On max attempts: do not attempt further — contact support to resolve the delivery. The buyer's funds remain held until support resolves the case.

---

## Flow 4: Delivery Lifecycle States

**User Goal:** Understand all valid delivery states and what actions are available at each.

| Internal State | Courier-Facing Label | Terminal? | Available Action |
|---|---|---|---|
| `pending` | Awaiting assignment | No | None — system assigns |
| `assigned` | Navigate to pickup | No | "Navigate to pickup" |
| `picked_up` | En route to delivery | No | "Mark departed" |
| `in_transit` | Navigating to delivery address | No | Navigate (map only) |
| `out_for_delivery` | Arrived at delivery | No | "Start COD verification" or "Confirm delivery" |
| `delivered` | Delivery complete ✓ | **Yes** | None |
| `cancelled` | Delivery cancelled | **Yes** | None |
| `failed` | Delivery failed | No | Contact support |

> `delivered` and `cancelled` are terminal states. No further status updates can be submitted once these states are reached. Attempting an invalid transition returns **409 INVALID_STATUS_TRANSITION** — show "This status update is not valid right now" and do not retry.

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 400 | VALIDATION_ERROR | "Please check your request and try again." | Yes |
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 404 | RESOURCE_NOT_FOUND | "Delivery not found." | No |
| 409 | INVALID_STATUS_TRANSITION | "This status update is not valid right now. Please check your current step." | No |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |
