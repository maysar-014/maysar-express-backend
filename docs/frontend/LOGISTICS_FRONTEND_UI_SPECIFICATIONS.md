# Logistics Frontend - UI/UX Specifications

## Design System

### Colors
```
Primary: #2196F3 (Blue)
Success: #4CAF50 (Green)
Warning: #FF9800 (Orange)
Danger: #F44336 (Red)
Background: #F5F5F5 (Light Gray)
Surface: #FFFFFF (White)
Text Primary: #212121 (Dark Gray)
Text Secondary: #757575 (Medium Gray)
```

### Typography
```
Heading 1: 24px Bold
Heading 2: 20px Bold
Heading 3: 18px SemiBold
Body: 16px Regular
Caption: 14px Regular
Small: 12px Regular
```

---

## Screen Specifications

### 1. Login Screen

```
┌─────────────────────────────────────┐
│                                     │
│         [LOGO]                      │
│      Maysar Courier                 │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Phone Number                  │  │
│  │ +255 ___ ___ ___             │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Password                      │  │
│  │ ••••••••                      │  │
│  └───────────────────────────────┘  │
│                                     │
│  [ ] Remember me                    │
│                                     │
│  ┌───────────────────────────────┐  │
│  │        LOGIN                  │  │
│  └───────────────────────────────┘  │
│                                     │
│         Forgot Password?            │
│                                     │
└─────────────────────────────────────┘
```

**Elements**:
- Logo: 80x80px centered
- Input fields: Full width with 16px padding
- Login button: Primary color, full width
- Forgot password: Text link, centered

---

### 2. Dashboard Screen

```
┌─────────────────────────────────────┐
│ ☰  Dashboard          [👤] [🔔]    │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 👋 Good Morning, John       │   │
│  │ Status: ● Active            │   │
│  │ [Go Offline]                │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌──────────┬──────────┬─────────┐ │
│  │ Today    │ This Week│ Month   │ │
│  ├──────────┴──────────┴─────────┤ │
│  │ 📦 Deliveries: 8             │ │
│  │ 💰 Earnings: TZS 45,000      │ │
│  │ ⭐ Rating: 4.8               │ │
│  │ ✓ On-Time: 95%               │ │
│  └──────────────────────────────┘ │
│                                     │
│  Today's Deliveries (5)             │
│  ┌─────────────────────────────┐   │
│  │ 🔴 #DEL-789 | Urgent        │   │
│  │ Pickup: Uhuru St            │   │
│  │ Deliver: Kariakoo           │   │
│  │ COD: TZS 50,000             │   │
│  │ [View Details →]            │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🟡 #DEL-790 | Standard      │   │
│  │ Pickup: Posta               │   │
│  │ Deliver: Mikocheni          │   │
│  │ Prepaid                     │   │
│  │ [View Details →]            │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
│ [🏠] [📦] [🗺️] [💰] [👤]          │
└─────────────────────────────────────┘
```

**Elements**:
- Header: Fixed top with menu, profile, notifications
- Status card: Prominent with toggle button
- Stats cards: Grid layout, 2x2 on mobile
- Delivery cards: Scrollable list with priority indicators
- Bottom navigation: 5 tabs (Home, Deliveries, Routes, Earnings, Profile)

---

### 3. Delivery List Screen

```
┌─────────────────────────────────────┐
│ ← Deliveries          [🔍] [⚙️]    │
├─────────────────────────────────────┤
│                                     │
│  [All] [Assigned] [In Transit]     │
│  [Completed] [Cancelled]            │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🔴 #DEL-789                 │   │
│  │ Status: Assigned            │   │
│  │ ─────────────────────────   │   │
│  │ 📍 Pickup                   │   │
│  │    123 Uhuru Street         │   │
│  │    ETA: 10:00 AM            │   │
│  │                             │   │
│  │ 📍 Delivery                 │   │
│  │    456 Kariakoo             │   │
│  │    ETA: 11:00 AM            │   │
│  │                             │   │
│  │ 💵 COD: TZS 50,000          │   │
│  │ 📦 2.5 kg                   │   │
│  │                             │   │
│  │ [Start Pickup]              │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🟢 #DEL-788                 │   │
│  │ Status: In Transit          │   │
│  │ ─────────────────────────   │   │
│  │ 📍 Current Location         │   │
│  │    En route to destination  │   │
│  │                             │   │
│  │ 💵 Prepaid                  │   │
│  │ 📦 1.2 kg                   │   │
│  │                             │   │
│  │ [Mark Arrived]              │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

**Elements**:
- Filter tabs: Horizontal scroll, active state highlighted
- Delivery cards: Full width with status indicator
- Action buttons: Context-aware based on status
- Pull to refresh: Standard gesture

---

### 4. Delivery Detail Screen

```
┌─────────────────────────────────────┐
│ ← Delivery #DEL-789    [⋮]          │
├─────────────────────────────────────┤
│                                     │
│  Status: 🟡 Assigned                │
│  Priority: 🔴 Urgent                │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Customer Information        │   │
│  │ ─────────────────────────   │   │
│  │ Name: Jane Smith            │   │
│  │ Phone: +255 712 345 679     │   │
│  │ [📞 Call] [💬 Message]      │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Pickup Location             │   │
│  │ ─────────────────────────   │   │
│  │ 📍 123 Uhuru Street         │   │
│  │    Dar es Salaam            │   │
│  │ ⏰ 10:00 AM                 │   │
│  │ [🗺️ Navigate]              │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Delivery Location           │   │
│  │ ─────────────────────────   │   │
│  │ 📍 456 Kariakoo             │   │
│  │    Dar es Salaam            │   │
│  │ ⏰ 11:00 AM                 │   │
│  │ [🗺️ Navigate]              │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Package Details             │   │
│  │ ─────────────────────────   │   │
│  │ Weight: 2.5 kg              │   │
│  │ Dimensions: 30x20x10 cm     │   │
│  │ Description: Electronics    │   │
│  │ Special: Handle with care   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Payment                     │   │
│  │ ─────────────────────────   │   │
│  │ Method: Cash on Delivery    │   │
│  │ Amount: TZS 50,000          │   │
│  │ Delivery Fee: TZS 5,000     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌───────────────────────────────┐ │
│  │     START PICKUP              │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

**Elements**:
- Status badge: Top, color-coded
- Info cards: Grouped by category
- Action buttons: Call, message, navigate
- Primary CTA: Bottom, full width

---

### 5. Route Map Screen

```
┌─────────────────────────────────────┐
│ ← Route Map              [⚙️]       │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │         [MAP VIEW]          │   │
│  │                             │   │
│  │  📍1 ──→ 📍2 ──→ 📍3       │   │
│  │                             │   │
│  │  Current: 📍 You are here   │   │
│  │                             │   │
│  │  [🎯 Center on Me]          │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Route Summary               │   │
│  │ ─────────────────────────   │   │
│  │ 📏 Distance: 15.5 km        │   │
│  │ ⏱️ Duration: 45 min         │   │
│  │ 📦 Stops: 4                 │   │
│  │ ✓ Completed: 1/4            │   │
│  └─────────────────────────────┘   │
│                                     │
│  Next Stop (2 of 4)                 │
│  ┌─────────────────────────────┐   │
│  │ 📍 Pickup - #DEL-789        │   │
│  │ 123 Uhuru Street            │   │
│  │ 🚗 3.2 km away (8 min)      │   │
│  │                             │   │
│  │ [Navigate] [Skip]           │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌───────────────────────────────┐ │
│  │     OPTIMIZE ROUTE            │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

**Elements**:
- Map: Full width, interactive
- Route polyline: Blue line connecting stops
- Markers: Numbered, color-coded by type
- Bottom sheet: Draggable, shows route details
- Navigation button: Opens Google Maps/Waze

---

### 6. Delivery Status Update Screen

```
┌─────────────────────────────────────┐
│ ← Update Status                     │
├─────────────────────────────────────┤
│                                     │
│  Delivery #DEL-789                  │
│  Current Status: Assigned           │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Select New Status           │   │
│  │                             │   │
│  │ ○ Picked Up                 │   │
│  │ ○ In Transit                │   │
│  │ ○ Arrived                   │   │
│  │ ○ Delivered                 │   │
│  │ ○ Cancelled                 │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Current Location            │   │
│  │ ─────────────────────────   │   │
│  │ 📍 Lat: -6.7924             │   │
│  │ 📍 Lng: 39.2083             │   │
│  │ [📍 Use Current Location]   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Notes (Optional)            │   │
│  │ ─────────────────────────   │   │
│  │                             │   │
│  │                             │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌───────────────────────────────┐ │
│  │     UPDATE STATUS             │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

**Elements**:
- Radio buttons: Single selection
- Location: Auto-filled from GPS
- Notes: Optional text area
- Update button: Validates selection

---

### 7. COD Verification Screen

```
┌─────────────────────────────────────┐
│ ← Complete Delivery                 │
├─────────────────────────────────────┤
│                                     │
│  Delivery #DEL-789                  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Amount to Collect           │   │
│  │ ─────────────────────────   │   │
│  │   TZS 50,000                │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Enter OTP                   │   │
│  │ ─────────────────────────   │   │
│  │  [1] [2] [3] [4] [5] [6]   │   │
│  │                             │   │
│  │ [Generate New OTP]          │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Customer Signature          │   │
│  │ ─────────────────────────   │   │
│  │                             │   │
│  │   [Signature Canvas]        │   │
│  │                             │   │
│  │ [Clear]                     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Recipient Name              │   │
│  │ Jane Smith                  │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌───────────────────────────────┐ │
│  │   COMPLETE DELIVERY           │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

**Elements**:
- Amount display: Large, prominent
- OTP input: 6 boxes, numeric keyboard
- Signature pad: Touch-enabled canvas
- Complete button: Validates all fields

---

### 8. Earnings Screen

```
┌─────────────────────────────────────┐
│ ← Earnings              [📊]        │
├─────────────────────────────────────┤
│                                     │
│  [Today] [This Week] [This Month]   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Total Earnings              │   │
│  │                             │   │
│  │   TZS 45,000                │   │
│  │                             │   │
│  │ 8 deliveries completed      │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌──────────┬──────────────────┐   │
│  │ Delivery │ TZS 40,000       │   │
│  │ Fees     │                  │   │
│  ├──────────┼──────────────────┤   │
│  │ Bonuses  │ TZS 5,000        │   │
│  ├──────────┼──────────────────┤   │
│  │ Tips     │ TZS 0            │   │
│  └──────────┴──────────────────┘   │
│                                     │
│  Recent Deliveries                  │
│  ┌─────────────────────────────┐   │
│  │ #DEL-789 | 11:00 AM         │   │
│  │ Base: TZS 5,000             │   │
│  │ Bonus: TZS 500              │   │
│  │ Total: TZS 5,500            │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ #DEL-788 | 10:30 AM         │   │
│  │ Base: TZS 4,500             │   │
│  │ Bonus: TZS 0                │   │
│  │ Total: TZS 4,500            │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌───────────────────────────────┐ │
│  │   VIEW DETAILED REPORT        │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

**Elements**:
- Period selector: Tabs at top
- Total card: Large, centered
- Breakdown table: Simple 2-column layout
- Delivery list: Scrollable with earnings per delivery
- Report button: Opens detailed analytics

---

### 9. Performance Screen

```
┌─────────────────────────────────────┐
│ ← Performance                       │
├─────────────────────────────────────┤
│                                     │
│  Last 30 Days                       │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Overall Rating              │   │
│  │                             │   │
│  │   ⭐ 4.8 / 5.0              │   │
│  │                             │   │
│  │ Based on 90 deliveries      │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ 📦 Total Deliveries          │  │
│  │    90                        │  │
│  ├──────────────────────────────┤  │
│  │ ✓ Success Rate               │  │
│  │    98.9%                     │  │
│  ├──────────────────────────────┤  │
│  │ ⏰ On-Time Rate              │  │
│  │    95.5%                     │  │
│  ├──────────────────────────────┤  │
│  │ 😊 Customer Satisfaction     │  │
│  │    96.0%                     │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ City Ranking                │   │
│  │                             │   │
│  │ #12 out of 150 couriers     │   │
│  │                             │   │
│  │ Top 8% 🏆                   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ [📈 View Trends]            │   │
│  │ [🎯 Set Goals]              │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

**Elements**:
- Rating display: Large star rating
- Metrics cards: Grid layout with icons
- Ranking badge: Highlighted with trophy icon
- Action buttons: Secondary style

---

### 10. Profile Screen

```
┌─────────────────────────────────────┐
│ ← Profile               [✏️]        │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │        [👤 Photo]           │   │
│  │                             │   │
│  │      John Doe               │   │
│  │   +255 712 345 678          │   │
│  │                             │   │
│  │   ⭐ 4.8 Rating             │   │
│  │   📦 145 Deliveries         │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🏍️ Vehicle Information      │   │
│  │ ─────────────────────────   │   │
│  │ Type: Motorcycle            │   │
│  │ Plate: T 123 ABC            │   │
│  │ [Update Vehicle]            │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ⚙️ Settings                 │   │
│  │ ─────────────────────────   │   │
│  │ › Notifications             │   │
│  │ › Language                  │   │
│  │ › Privacy                   │   │
│  │ › Help & Support            │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 📄 Documents                │   │
│  │ ─────────────────────────   │   │
│  │ › Driver's License          │   │
│  │ › Vehicle Registration      │   │
│  │ › Insurance                 │   │
│  └─────────────────────────────┘   │
│                                     │
│  [🚪 Logout]                        │
│                                     │
└─────────────────────────────────────┘
```

**Elements**:
- Profile header: Photo, name, stats
- Info cards: Grouped sections
- Settings list: Chevron indicates navigation
- Logout button: Danger color, bottom

---

## Interaction Patterns

### Pull to Refresh
- Available on: Dashboard, Delivery List, Earnings
- Visual: Spinner at top
- Behavior: Reload latest data

### Swipe Actions
- Delivery cards: Swipe left for quick actions (Call, Navigate, Cancel)
- Implementation: Reveal action buttons on swipe

### Bottom Sheet
- Used for: Route details, Filters, Quick actions
- Behavior: Draggable, dismissible

### Loading States
```
┌─────────────────────────────────────┐
│                                     │
│         [Spinner]                   │
│     Loading deliveries...           │
│                                     │
└─────────────────────────────────────┘
```

### Empty States
```
┌─────────────────────────────────────┐
│                                     │
│         [📦 Icon]                   │
│                                     │
│    No deliveries assigned           │
│                                     │
│  You'll see new deliveries here     │
│  when they're assigned to you       │
│                                     │
└─────────────────────────────────────┘
```

### Error States
```
┌─────────────────────────────────────┐
│                                     │
│         [⚠️ Icon]                   │
│                                     │
│    Failed to load deliveries        │
│                                     │
│  [Retry]                            │
│                                     │
└─────────────────────────────────────┘
```

---

## Responsive Behavior

### Mobile (< 768px)
- Single column layout
- Bottom navigation
- Full-width cards
- Stacked buttons

### Tablet (768px - 1024px)
- Two column layout for lists
- Side navigation
- Grid layout for cards
- Inline buttons

---

## Accessibility

- **Touch Targets**: Minimum 44x44px
- **Contrast**: WCAG AA compliant
- **Font Scaling**: Support system font sizes
- **Screen Readers**: Proper labels and hints
- **Keyboard Navigation**: Tab order logical

---

## Animations

- **Page Transitions**: Slide (300ms)
- **Button Press**: Scale down (100ms)
- **Loading**: Fade in/out (200ms)
- **Status Change**: Color transition (300ms)

---

## Offline Indicators

```
┌─────────────────────────────────────┐
│ ⚠️ You're offline                   │
│ Changes will sync when online       │
└─────────────────────────────────────┘
```

Position: Top banner, dismissible
Color: Warning (Orange)
Behavior: Auto-hide when online

---

## Summary

The UI should be:
- **Mobile-first**: Optimized for one-handed use
- **Clean**: Minimal clutter, clear hierarchy
- **Fast**: Instant feedback, smooth animations
- **Accessible**: Large touch targets, high contrast
- **Offline-capable**: Clear indicators, queued actions
